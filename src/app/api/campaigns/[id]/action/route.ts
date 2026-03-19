import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  campaigns,
  contacts,
  segments,
  sendJobs,
  sendRecipients,
  suppressionList,
} from "@/server/db/schema";
import { eq, and, ilike, notInArray, SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { renderEmail, campaignContentToBlocks } from "@/lib/email-renderer";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignId } = await params;
  const { action } = await req.json();

  try {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (action === "submit") {
      if (
        campaign.status !== "draft" &&
        campaign.status !== "changes_requested"
      ) {
        return NextResponse.json(
          { error: "Campaign cannot be submitted in current state" },
          { status: 400 }
        );
      }
      await db
        .update(campaigns)
        .set({ status: "pending_review", updatedAt: new Date() })
        .where(eq(campaigns.id, campaignId));
      return NextResponse.json({ success: true });
    }

    if (action === "send_test") {
      if (campaign.status !== "approved") {
        return NextResponse.json(
          { error: "Campaign must be approved first" },
          { status: 400 }
        );
      }

      const resend = new Resend(process.env.RESEND_API_KEY);
      const content = campaign.content as Record<string, string> | null;
      const blocks = campaignContentToBlocks(content);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const html = await renderEmail({
        subject: campaign.subjectLine || "Newsletter",
        blocks,
        appUrl,
      });

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: ["delivered@resend.dev"],
        subject: `[TEST] ${campaign.subjectLine || "Newsletter"}`,
        html,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "send_now") {
      if (campaign.status !== "approved") {
        return NextResponse.json(
          { error: "Campaign must be approved" },
          { status: 400 }
        );
      }

      await db
        .update(campaigns)
        .set({ status: "sending", updatedAt: new Date() })
        .where(eq(campaigns.id, campaignId));

      const recipientContacts = await getSegmentContacts(campaign.segmentId);
      const content = campaign.content as Record<string, string> | null;
      const blocks = campaignContentToBlocks(content);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const [job] = await db
        .insert(sendJobs)
        .values({
          campaignId,
          status: "processing",
          totalRecipients: recipientContacts.length,
          startedAt: new Date(),
        })
        .returning();

      const resend = new Resend(process.env.RESEND_API_KEY);
      let sentCount = 0;
      let failedCount = 0;

      for (const contact of recipientContacts) {
        try {
          const html = await renderEmail({
            subject: campaign.subjectLine || "Intellee Newsletter",
            recipientEmail: contact.email,
            blocks,
            appUrl,
          });

          const result = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
            to: [contact.email],
            subject: campaign.subjectLine || "Intellee Newsletter",
            html,
          });

          await db.insert(sendRecipients).values({
            sendJobId: job.id,
            contactId: contact.id,
            email: contact.email,
            status: "sent",
            providerMessageId: result.data?.id || null,
            sentAt: new Date(),
          });
          sentCount++;
        } catch {
          await db.insert(sendRecipients).values({
            sendJobId: job.id,
            contactId: contact.id,
            email: contact.email,
            status: "failed",
          });
          failedCount++;
        }
      }

      await db
        .update(sendJobs)
        .set({
          status: "completed",
          sentCount,
          failedCount,
          completedAt: new Date(),
        })
        .where(eq(sendJobs.id, job.id));

      await db
        .update(campaigns)
        .set({ status: "sent", updatedAt: new Date() })
        .where(eq(campaigns.id, campaignId));

      return NextResponse.json({ success: true, sentCount, failedCount });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Campaign action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getSegmentContacts(segmentId: string | null) {
  if (!segmentId) {
    return db
      .select({ id: contacts.id, email: contacts.email })
      .from(contacts)
      .where(eq(contacts.status, "active"));
  }

  const [segment] = await db
    .select()
    .from(segments)
    .where(eq(segments.id, segmentId))
    .limit(1);

  if (!segment) {
    return db
      .select({ id: contacts.id, email: contacts.email })
      .from(contacts)
      .where(eq(contacts.status, "active"));
  }

  const filters = segment.filters as Record<string, string>;
  const conditions: SQL[] = [eq(contacts.status, "active")];

  if (filters.projectTraining) {
    conditions.push(ilike(contacts.projectTraining, `%${filters.projectTraining}%`));
  }
  if (filters.role) {
    conditions.push(ilike(contacts.role, `%${filters.role}%`));
  }
  if (filters.geography) {
    conditions.push(ilike(contacts.geography, `%${filters.geography}%`));
  }

  let suppressed: string[] = [];
  try {
    const suppressedRows = await db
      .select({ email: suppressionList.email })
      .from(suppressionList);
    suppressed = suppressedRows.map((r) => r.email);
  } catch {
    // suppression list may not exist yet
  }

  if (suppressed.length > 0) {
    conditions.push(notInArray(contacts.email, suppressed));
  }

  return db
    .select({ id: contacts.id, email: contacts.email })
    .from(contacts)
    .where(and(...conditions));
}
