import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canvaTemplates } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
      .select({
        id: canvaTemplates.id,
        name: canvaTemplates.name,
        projectTraining: canvaTemplates.projectTraining,
        targetRole: canvaTemplates.targetRole,
      })
      .from(canvaTemplates)
      .where(eq(canvaTemplates.isActive, true))
      .orderBy(sql`${canvaTemplates.name} ASC`);
    return NextResponse.json({ templates: list });
  } catch {
    return NextResponse.json({ templates: [] });
  }
}
