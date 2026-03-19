import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { campaigns } from "@/server/db/schema";
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
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
      })
      .from(campaigns)
      .orderBy(sql`${campaigns.createdAt} DESC`);
    return NextResponse.json({ campaigns: list });
  } catch {
    return NextResponse.json({ campaigns: [] });
  }
}
