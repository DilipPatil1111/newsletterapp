import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contacts, campaigns, sendJobs, sendRecipients, brandSettings } from "@/server/db/schema";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { renderEmail, renderEmailPlainText, parseContentToBlocks } from "@/lib/email-renderer";

const sendSchema = z.object({
  courseName: z.string().min(1),
  subjectLine: z.string().min(1),
  previewText: z.string().optional(),
  htmlContent: z.string().min(1),
  ctaText: z.string().optional(),
  ctaUrl: z.string().optional(),
  contactIds: z.array(z.string()).min(1),
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

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://intellee.com";
    let sentCount = 0;
    let failCount = 0;

    const blocks = parseContentToBlocks(data.htmlContent, data.ctaText, data.ctaUrl);

    const [brand] = await db.select().from(brandSettings).limit(1);
    const brandOpts = brand
      ? {
          companyName: brand.companyName,
          primaryColor: brand.primaryColor,
          accentColor: brand.accentColor,
          logoUrl: brand.logoUrl ?? undefined,
          address: brand.address ?? undefined,
          phone: brand.phone ?? undefined,
          websiteUrl: brand.websiteUrl ?? undefined,
          contactEmail: brand.contactEmail ?? undefined,
          socialLinks: (brand.socialLinks as { label: string; url: string }[] | null) ?? undefined,
        }
      : undefined;

    if (resendKey) {
      const resend = new Resend(resendKey);

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

        const htmlBody = await renderEmail(renderOpts);
        const plainText = await renderEmailPlainText(renderOpts);

        const unsubUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(contact.email)}`;

        try {
          const companyName = brandOpts?.companyName || "Intellee College";
          const replyTo = brandOpts?.contactEmail || "admissions@intellee.com";
          const result = await resend.emails.send({
            from: `${companyName} <${fromEmail}>`,
            replyTo,
            to: contact.email,
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
          console.error(`Exception sending to ${contact.email}:`, err);
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
    } else {
      for (const contact of selectedContacts) {
        await db.insert(sendRecipients).values({
          sendJobId: job.id,
          contactId: contact.id,
          email: contact.email,
          status: "pending",
        });
      }
      sentCount = selectedContacts.length;
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
    return NextResponse.json(
      { error: "Failed to send newsletter" },
      { status: 500 }
    );
  }
}
