import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contacts, campaigns, sendJobs, sendRecipients } from "@/server/db/schema";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";
import { Resend } from "resend";

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

    if (resendKey) {
      const resend = new Resend(resendKey);

      for (const contact of selectedContacts) {
        const recipientName = contact.firstName || contact.email.split("@")[0];

        const personalizedContent = data.htmlContent.replace(
          /\{\{firstName\}\}/g,
          recipientName
        );

        const personalizedSubject = `${recipientName}, ${data.subjectLine.charAt(0).toLowerCase()}${data.subjectLine.slice(1)}`;

        const htmlBody = buildEmailHtml({
          recipientName,
          subject: data.subjectLine,
          content: personalizedContent,
          ctaText: data.ctaText,
          ctaUrl: data.ctaUrl,
          recipientEmail: contact.email,
          appUrl,
        });

        const plainText = buildPlainText({
          recipientName,
          content: personalizedContent,
          ctaText: data.ctaText,
          ctaUrl: data.ctaUrl,
          recipientEmail: contact.email,
          appUrl,
        });

        const unsubUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(contact.email)}`;

        try {
          const result = await resend.emails.send({
            from: `Intellee College <${fromEmail}>`,
            replyTo: "admissions@intellee.com",
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
            console.log(`Sent to ${contact.email} (${recipientName}), id: ${result.data?.id}`);
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

function linkifyLine(line: string, accent: string): string {
  const urlRegex = /(https?:\/\/[^\s)<>"]+)/g;
  const match = line.match(urlRegex);
  if (!match) return line;

  let result = line;
  for (const url of match) {
    const cleanUrl = url.replace(/[.,;:!?)]+$/, "");
    result = result.replace(
      url,
      `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color:${accent};text-decoration:underline;word-break:break-all;">${cleanUrl}</a>`
    );
  }
  return result;
}

function buildPlainText(opts: {
  recipientName: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  recipientEmail: string;
  appUrl: string;
}): string {
  const lines = [
    `INTELLEE COLLEGE`,
    ``,
    opts.content,
    ``,
    opts.ctaText && opts.ctaUrl ? `${opts.ctaText}: ${opts.ctaUrl}` : "",
    ``,
    `---`,
    `Intellee College | intellee.com`,
    `admissions@intellee.com | +91 98765 43210`,
    `Tech Park, Bangalore, India`,
    ``,
    `Unsubscribe: ${opts.appUrl}/unsubscribe?email=${encodeURIComponent(opts.recipientEmail)}`,
  ];
  return lines.filter((l) => l !== undefined).join("\n");
}

function buildEmailHtml(opts: {
  recipientName: string;
  subject: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  recipientEmail: string;
  appUrl: string;
}) {
  const sections = opts.content.split("\n\n");
  let bodyHtml = "";

  const sectionMeta: Record<string, { icon: string; accent: string; bg: string; border: string }> = {
    "WHAT'S HAPPENING": { icon: "&#x1F4CA;", accent: "#4338CA", bg: "#EEF2FF", border: "#A5B4FC" },
    "SALARY":           { icon: "&#x1F4BC;", accent: "#047857", bg: "#ECFDF5", border: "#6EE7B7" },
    "WHY THE DEMAND":   { icon: "&#x1F4C8;", accent: "#B45309", bg: "#FFFBEB", border: "#FCD34D" },
    "WHAT YOU GET":     { icon: "&#x2705;",  accent: "#6D28D9", bg: "#F5F3FF", border: "#C4B5FD" },
    "LEARN MORE":       { icon: "&#x1F517;", accent: "#4338CA", bg: "#EFF6FF", border: "#93C5FD" },
  };

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const upperTrimmed = trimmed.toUpperCase();
    const matchedKey = Object.keys(sectionMeta).find((key) =>
      upperTrimmed.startsWith(key)
    );

    if (matchedKey) {
      const meta = sectionMeta[matchedKey];
      const lines = trimmed.split("\n");
      const heading = lines[0];
      const body = lines.slice(1).filter((l) => l.trim());

      const bodyContent = body
        .map((line) => {
          const l = line.trim();
          const linked = linkifyLine(l, meta.accent);
          return `<p style="margin:8px 0;color:#374151;font-size:14px;line-height:1.75;">${linked}</p>`;
        })
        .join("");

      bodyHtml += `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
          <tr><td style="padding:20px 24px;background:${meta.bg};border-left:4px solid ${meta.border};border-radius:8px;">
            <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${meta.accent};letter-spacing:0.3px;">${meta.icon} ${heading}</p>
            ${bodyContent}
          </td></tr>
        </table>`;
    } else {
      const paraHtml = trimmed
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const linked = linkifyLine(l, "#4338CA");
          return `<p style="margin:6px 0;color:#374151;font-size:15px;line-height:1.75;">${linked}</p>`;
        })
        .join("");
      bodyHtml += `<div style="margin:12px 0;">${paraHtml}</div>`;
    }
  }

  const ctaBlock =
    opts.ctaText && opts.ctaUrl
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
           <tr><td align="center" style="padding:24px;background:#F5F3FF;border-radius:10px;">
             <p style="margin:0 0 14px;color:#374151;font-size:15px;">Ready to take the next step in your career?</p>
             <a href="${opts.ctaUrl}" target="_blank" rel="noopener noreferrer" style="background:#4338CA;color:#ffffff;padding:13px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">${opts.ctaText}</a>
           </td></tr>
         </table>`
      : "";

  const unsubUrl = `${opts.appUrl}/unsubscribe?email=${encodeURIComponent(opts.recipientEmail)}`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${opts.subject}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Georgia,'Times New Roman',Times,serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;">
    <tr><td align="center" style="padding:32px 16px;">

      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#1E1B4B;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#C7D2FE;letter-spacing:3px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Intellee College</p>
            <p style="margin:0;font-size:20px;color:#ffffff;line-height:1.4;font-weight:normal;">${opts.subject}</p>
          </td>
        </tr>

        <!-- Infographic Stats -->
        <tr>
          <td style="padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #E5E7EB;">
              <tr>
                <td width="33%" style="text-align:center;padding:18px 8px;border-right:1px solid #E5E7EB;">
                  <p style="margin:0;font-size:28px;font-weight:bold;color:#4338CA;font-family:Arial,Helvetica,sans-serif;">40%</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,Helvetica,sans-serif;">Avg Salary Hike</p>
                </td>
                <td width="34%" style="text-align:center;padding:18px 8px;border-right:1px solid #E5E7EB;">
                  <p style="margin:0;font-size:28px;font-weight:bold;color:#047857;font-family:Arial,Helvetica,sans-serif;">92%</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,Helvetica,sans-serif;">Placement Rate</p>
                </td>
                <td width="33%" style="text-align:center;padding:18px 8px;">
                  <p style="margin:0;font-size:28px;font-weight:bold;color:#B45309;font-family:Arial,Helvetica,sans-serif;">100+</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,Helvetica,sans-serif;">Hiring Partners</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 40px;">
            ${bodyHtml}
            ${ctaBlock}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #E5E7EB;padding:24px 40px;font-family:Arial,Helvetica,sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:top;">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1E1B4B;">Intellee College</p>
                  <p style="margin:0 0 2px;font-size:12px;color:#6B7280;">Tech Park, Bangalore, India</p>
                  <p style="margin:0;font-size:12px;color:#6B7280;">+91 98765 43210</p>
                </td>
                <td style="vertical-align:top;text-align:right;">
                  <p style="margin:0 0 2px;font-size:12px;"><a href="https://intellee.com" target="_blank" rel="noopener noreferrer" style="color:#4338CA;text-decoration:none;">intellee.com</a></p>
                  <p style="margin:0 0 2px;font-size:12px;"><a href="mailto:admissions@intellee.com" style="color:#4338CA;text-decoration:none;">admissions@intellee.com</a></p>
                  <p style="margin:0;font-size:12px;">
                    <a href="https://linkedin.com/company/intellee" target="_blank" rel="noopener noreferrer" style="color:#6B7280;text-decoration:none;">LinkedIn</a> &middot;
                    <a href="https://twitter.com/intellee" target="_blank" rel="noopener noreferrer" style="color:#6B7280;text-decoration:none;">Twitter</a> &middot;
                    <a href="https://instagram.com/intellee" target="_blank" rel="noopener noreferrer" style="color:#6B7280;text-decoration:none;">Instagram</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Legal -->
        <tr>
          <td style="background:#F9FAFB;padding:16px 40px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0;color:#9CA3AF;font-size:11px;line-height:1.6;">
              You are receiving this because you expressed interest in Intellee programs.<br/>
              <a href="${unsubUrl}" target="_blank" rel="noopener noreferrer" style="color:#4338CA;text-decoration:underline;">Unsubscribe</a> &middot;
              &copy; ${new Date().getFullYear()} Intellee College
            </p>
          </td>
        </tr>

      </table>

    </td></tr>
  </table>

</body>
</html>`;
}
