import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { schedules, campaigns } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

const updateScheduleSchema = z.object({
  campaignId: z.string().uuid().optional(),
  frequency: z.enum(["once", "weekly", "biweekly", "monthly"]).optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const [schedule] = await db
      .select({
        id: schedules.id,
        campaignId: schedules.campaignId,
        frequency: schedules.frequency,
        daysOfWeek: schedules.daysOfWeek,
        timeOfDay: schedules.timeOfDay,
        timezone: schedules.timezone,
        nextRunAt: schedules.nextRunAt,
        isActive: schedules.isActive,
        campaignName: campaigns.name,
      })
      .from(schedules)
      .leftJoin(campaigns, eq(schedules.campaignId, campaigns.id))
      .where(eq(schedules.id, id))
      .limit(1);

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({ schedule });
  } catch {
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const data = updateScheduleSchema.parse(body);

    const [existing] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const frequency = data.frequency ?? existing.frequency;
    const daysOfWeek = (data.daysOfWeek ?? existing.daysOfWeek ?? []) as number[];
    const timeOfDay = data.timeOfDay ?? existing.timeOfDay;
    const timezone = data.timezone ?? existing.timezone;

    const nextRunAt = frequency !== "once" && daysOfWeek.length > 0
      ? computeNextRun(frequency, daysOfWeek, timeOfDay, timezone)
      : null;

    const [updated] = await db
      .update(schedules)
      .set({
        ...(data.campaignId && { campaignId: data.campaignId }),
        ...(data.frequency && { frequency: data.frequency }),
        ...(data.daysOfWeek && { daysOfWeek: data.daysOfWeek }),
        ...(data.timeOfDay && { timeOfDay: data.timeOfDay }),
        ...(data.timezone && { timezone: data.timezone }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        nextRunAt,
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, id))
      .returning();

    return NextResponse.json({ schedule: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Schedule update error:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const [existing] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    await db.delete(schedules).where(eq(schedules.id, id));

    await db
      .update(campaigns)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(campaigns.id, existing.campaignId));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 }
    );
  }
}
