import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contacts, campaigns, sendJobs, sendRecipients, brandSettings } from "@/server/db/schema";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { renderEmail, renderEmailPlainText, parseContentToBlocks } from "@/lib/email-renderer";
import { mapBrandForEmail } from "@/lib/brand-email";
import { clientSafeDbError } from "@/lib/db-errors";

function sanitizeEmailDisplayName(name: string): string {
  const s = name.replace(/[\r\n<>"]/g, "").trim().slice(0, 78);
  return s || "Newsletter";
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

const sendSchema = z.object({
  courseName: z.string().min(1),
  subjectLine: z.string().min(1),
  previewText: z.string().optional(),
  htmlContent: z.string().min(1),
  ctaText: z.string().optional(),
  ctaUrl: z.string().optional(),
  contactIds: z.array(z.string()).min(1),
  /** Optional CC (e.g. Intu assistant — copy signed-in user). Resend supports multiple. */
  ccEmails: z.array(z.string().email()).optional(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = sendSchema.parse(body);

    const selectedContacts = await db
      .select({
        id: contacts.id,
        email: contacts.email,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
      })
      .from(contacts)
      .where(inArray(contacts.id, data.contactIds));

    if (selectedContacts.length === 0) {
      return NextResponse.json({ error: "No valid contacts found" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (!resendKey) {
      return NextResponse.json(
        {
          error:
            "Email is not configured. Set RESEND_API_KEY (and optionally RESEND_FROM_EMAIL) in your environment.",
        },
        { status: 503 }
      );
    }

    const [campaign] = await db
      .insert(campaigns)
      .values({
        name: `${data.courseName} Newsletter`,
        subjectLine: data.subjectLine,
        previewText: data.previewText || null,
        content: {
          intro: data.htmlContent,
          ctaText: data.ctaText || "",
          ctaUrl: data.ctaUrl || "",
        },
        status: "sent",
        createdBy: userId,
      })
      .returning();

    const [job] = await db
      .insert(sendJobs)
      .values({
        campaignId: campaign.id,
        status: "processing",
        totalRecipients: selectedContacts.length,
      })
      .returning();

    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://intellee.com";
    let sentCount = 0;
    let failCount = 0;

    const blocks = parseContentToBlocks(data.htmlContent, data.ctaText, data.ctaUrl);

    const [brand] = await db.select().from(brandSettings).limit(1);
    const brandOpts = mapBrandForEmail(brand ?? undefined);

    const resend = new Resend(resendKey);

    const ccList =
      data.ccEmails?.filter((e) => isValidEmail(e.trim())).map((e) => e.trim()) ?? [];

    for (const contact of selectedContacts) {
      const recipientName = contact.firstName || contact.email.split("@")[0];

      const personalizedSubject = `${recipientName}, ${data.subjectLine.charAt(0).toLowerCase()}${data.subjectLine.slice(1)}`;

      const personalizedBlocks = blocks.map((block) => {
        if (block.text) {
          return { ...block, text: block.text.replace(/\{\{firstName\}\}/g, recipientName) };
        }
        if (block.body) {
          return { ...block, body: block.body.replace(/\{\{firstName\}\}/g, recipientName) };
        }
        return block;
      });

      const renderOpts = {
        subject: data.subjectLine,
        previewText: data.previewText,
        recipientName,
        recipientEmail: contact.email,
        blocks: personalizedBlocks,
        showStats: true,
        appUrl,
        brand: brandOpts,
      };

      const unsubUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(contact.email)}`;

      try {
        const htmlBody = await renderEmail(renderOpts);
        const plainText = await renderEmailPlainText(renderOpts);

        const companyName = sanitizeEmailDisplayName(
          brandOpts?.companyName || "Intellee College"
        );
        const replyCandidate =
          brandOpts?.contactEmail?.trim() || "admissions@intellee.com";
        const replyTo = isValidEmail(replyCandidate) ? replyCandidate : undefined;

        const ccForThis = ccList.filter(
          (cc) => cc.toLowerCase() !== contact.email.toLowerCase()
        );

        const result = await resend.emails.send({
          from: `${companyName} <${fromEmail}>`,
          ...(replyTo ? { replyTo } : {}),
          to: contact.email,
          ...(ccForThis.length > 0 ? { cc: ccForThis } : {}),
          subject: personalizedSubject,
          html: htmlBody,
          text: plainText,
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            "X-Entity-Ref-ID": `intellee-${campaign.id}-${contact.id}`,
          },
        });

        if (result.error) {
          console.error(`Resend error for ${contact.email}:`, result.error);
          await db.insert(sendRecipients).values({
            sendJobId: job.id,
            contactId: contact.id,
            email: contact.email,
            status: "failed",
            errorMessage: result.error.message,
          });
          failCount++;
        } else {
          await db.insert(sendRecipients).values({
            sendJobId: job.id,
            contactId: contact.id,
            email: contact.email,
            status: "delivered",
            providerMessageId: result.data?.id,
            sentAt: new Date(),
          });
          sentCount++;
        }
      } catch (err) {
        console.error(`Send/render error for ${contact.email}:`, err);
        await db.insert(sendRecipients).values({
          sendJobId: job.id,
          contactId: contact.id,
          email: contact.email,
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        });
        failCount++;
      }
    }

    await db
      .update(sendJobs)
      .set({
        status: failCount === selectedContacts.length ? "failed" : "completed",
        sentCount,
        failedCount: failCount,
        completedAt: new Date(),
      })
      .where(inArray(sendJobs.id, [job.id]));

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      jobId: job.id,
      sent: sentCount,
      failed: failCount,
      total: selectedContacts.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Newsletter send error:", error);
    const message = clientSafeDbError(
      error,
      "Failed to send newsletter. Try again or check server logs."
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
