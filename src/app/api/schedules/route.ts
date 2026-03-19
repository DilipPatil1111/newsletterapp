import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { schedules, campaigns } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

const createScheduleSchema = z.object({
  campaignId: z.string().uuid(),
  frequency: z.enum(["once", "weekly", "biweekly", "monthly"]),
  daysOfWeek: z.array(z.number().min(0).max(6)),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
});

function computeNextRun(
  frequency: string,
  daysOfWeek: number[],
  timeOfDay: string,
  timezone: string
): Date {
  const now = new Date();
  const [hours, minutes] = timeOfDay.split(":").map(Number);

  if (frequency === "once") {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }

  const sortedDays = [...daysOfWeek].sort();
  const currentDay = now.getDay();

  for (const day of sortedDays) {
    if (day > currentDay || (day === currentDay && hours * 60 + minutes > now.getHours() * 60 + now.getMinutes())) {
      const daysUntil = day - currentDay;
      const next = new Date(now);
      next.setDate(now.getDate() + daysUntil);
      next.setHours(hours, minutes, 0, 0);
      return next;
    }
  }

  const daysUntilNext = 7 - currentDay + sortedDays[0];
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilNext);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createScheduleSchema.parse(body);

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, data.campaignId))
      .limit(1);

    if (!campaign || campaign.status !== "approved") {
      return NextResponse.json(
        { error: "Campaign must be approved before scheduling" },
        { status: 400 }
      );
    }

    const nextRunAt = computeNextRun(
      data.frequency,
      data.daysOfWeek,
      data.timeOfDay,
      data.timezone
    );

    const [schedule] = await db
      .insert(schedules)
      .values({
        campaignId: data.campaignId,
        frequency: data.frequency,
        daysOfWeek: data.daysOfWeek,
        timeOfDay: data.timeOfDay,
        timezone: data.timezone,
        nextRunAt,
        createdBy: userId,
      })
      .returning();

    await db
      .update(campaigns)
      .set({ status: "scheduled", updatedAt: new Date() })
      .where(eq(campaigns.id, data.campaignId));

    return NextResponse.json({ schedule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Schedule create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
