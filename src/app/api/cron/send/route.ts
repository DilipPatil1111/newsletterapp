import { db } from "@/lib/db";
import {
  schedules,
  campaigns,
  contacts,
  segments,
  sendJobs,
  sendRecipients,
  suppressionList,
} from "@/server/db/schema";
import { eq, and, lte, ilike, notInArray, SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { renderEmail, campaignContentToBlocks } from "@/lib/email-renderer";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    const dueSchedules = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.isActive, true),
          lte(schedules.nextRunAt, now)
        )
      );

    const results = [];

    for (const schedule of dueSchedules) {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, schedule.campaignId))
        .limit(1);

      if (
        !campaign ||
        (campaign.status !== "approved" && campaign.status !== "scheduled")
      ) {
        continue;
      }

      const recipientContacts = await getSegmentContacts(campaign.segmentId);
      const content = campaign.content as Record<string, string> | null;
      const blocks = campaignContentToBlocks(content);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const [job] = await db
        .insert(sendJobs)
        .values({
          campaignId: campaign.id,
          scheduleId: schedule.id,
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

      const nextRun = computeNextRun(
        schedule.frequency,
        schedule.daysOfWeek as number[],
        schedule.timeOfDay,
        schedule.timezone
      );

      if (schedule.frequency === "once") {
        await db
          .update(schedules)
          .set({ isActive: false, lastRunAt: now, updatedAt: now })
          .where(eq(schedules.id, schedule.id));
      } else {
        await db
          .update(schedules)
          .set({ lastRunAt: now, nextRunAt: nextRun, updatedAt: now })
          .where(eq(schedules.id, schedule.id));
      }

      results.push({
        scheduleId: schedule.id,
        campaignId: campaign.id,
        sentCount,
        failedCount,
      });
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Cron send error:", error);
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

function computeNextRun(
  frequency: string,
  daysOfWeek: number[],
  timeOfDay: string,
  _timezone: string
): Date {
  const now = new Date();
  const [hours, minutes] = timeOfDay.split(":").map(Number);

  if (frequency === "once") return now;

  const multiplier = frequency === "biweekly" ? 14 : 7;
  const sortedDays = [...daysOfWeek].sort();
  const currentDay = now.getDay();

  for (const day of sortedDays) {
    const daysUntil = (day - currentDay + 7) % 7 || 7;
    const next = new Date(now);
    next.setDate(now.getDate() + daysUntil);
    next.setHours(hours, minutes, 0, 0);
    if (next > now) return next;
  }

  const next = new Date(now);
  next.setDate(now.getDate() + multiplier);
  next.setHours(hours, minutes, 0, 0);
  return next;
}
