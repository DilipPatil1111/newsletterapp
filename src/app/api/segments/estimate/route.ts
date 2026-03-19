import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contacts } from "@/server/db/schema";
import { and, ilike, eq, count, SQL } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { filters } = body as { filters: Record<string, string> };

    const conditions: SQL[] = [];
    if (filters.projectTraining) {
      conditions.push(ilike(contacts.projectTraining, `%${filters.projectTraining}%`));
    }
    if (filters.role) {
      conditions.push(ilike(contacts.role, `%${filters.role}%`));
    }
    if (filters.geography) {
      conditions.push(ilike(contacts.geography, `%${filters.geography}%`));
    }
    if (filters.status) {
      conditions.push(
        eq(contacts.status, filters.status as "active" | "unsubscribed" | "bounced" | "pending_review")
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [result] = await db.select({ value: count() }).from(contacts).where(where);

    return NextResponse.json({ count: result?.value ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
