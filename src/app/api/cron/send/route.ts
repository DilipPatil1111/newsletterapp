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
import { eq, and, lte, ilike, SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";

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

      const recipientEmails = await getSegmentContacts(campaign.segmentId);

      const [job] = await db
        .insert(sendJobs)
        .values({
          campaignId: campaign.id,
          scheduleId: schedule.id,
          status: "processing",
          totalRecipients: recipientEmails.length,
          startedAt: new Date(),
        })
        .returning();

      const resend = new Resend(process.env.RESEND_API_KEY);
      const content = campaign.content as Record<string, string> | null;
      let sentCount = 0;
      let failedCount = 0;

      for (const contact of recipientEmails) {
        try {
          const result = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
            to: [contact.email],
            subject: campaign.subjectLine || "Intellee Newsletter",
            html: buildEmailHtml(campaign.subjectLine || "", content),
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

function buildEmailHtml(
  subject: string,
  content: Record<string, string> | null
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
      <div style="background: white; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
        <h1 style="color: #111827; font-size: 24px; margin-bottom: 16px;">${subject}</h1>
        ${content?.intro ? `<p style="color: #374151; font-size: 16px; line-height: 1.6;">${content.intro}</p>` : ""}
        ${content?.highlights ? `<div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;"><p style="color: #374151; font-size: 14px; line-height: 1.6;">${content.highlights}</p></div>` : ""}
        ${content?.ctaUrl ? `<a href="${content.ctaUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px;">${content.ctaText || "Learn More"}</a>` : ""}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">
          Intellee College Newsletter<br />
          <a href="${appUrl}/unsubscribe" style="color: #9ca3af;">Unsubscribe</a>
        </p>
      </div>
    </body>
    </html>
  `;
}
