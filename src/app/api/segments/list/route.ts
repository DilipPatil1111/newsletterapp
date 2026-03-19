import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { segments } from "@/server/db/schema";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
      .select({
        id: segments.id,
        name: segments.name,
        estimatedSize: segments.estimatedSize,
      })
      .from(segments)
      .orderBy(sql`${segments.name} ASC`);
    return NextResponse.json({ segments: list });
  } catch {
    return NextResponse.json({ segments: [] });
  }
}
