import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { emailTemplates } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.isActive, true))
      .orderBy(sql`${emailTemplates.createdAt} DESC`);

    return NextResponse.json({ templates });
  } catch {
    return NextResponse.json({ templates: [] });
  }
}
