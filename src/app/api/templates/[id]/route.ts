import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canvaTemplates } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  canvaDesignUrl: z.string().url().optional().or(z.literal("")),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  projectTraining: z.string().optional(),
  targetRole: z.string().optional(),
  geography: z.string().optional(),
  campaignType: z.string().optional(),
  htmlContent: z.string().optional(),
  isActive: z.boolean().optional(),
});

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
    const [template] = await db
      .select()
      .from(canvaTemplates)
      .where(eq(canvaTemplates.id, id))
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch {
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
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
    const data = updateTemplateSchema.parse(body);

    const [existing] = await db
      .select()
      .from(canvaTemplates)
      .where(eq(canvaTemplates.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(canvaTemplates)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.canvaDesignUrl !== undefined && { canvaDesignUrl: data.canvaDesignUrl || null }),
        ...(data.heroImageUrl !== undefined && { heroImageUrl: data.heroImageUrl || null }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl || null }),
        ...(data.projectTraining !== undefined && { projectTraining: data.projectTraining || null }),
        ...(data.targetRole !== undefined && { targetRole: data.targetRole || null }),
        ...(data.geography !== undefined && { geography: data.geography || null }),
        ...(data.campaignType !== undefined && { campaignType: data.campaignType || null }),
        ...(data.htmlContent !== undefined && { htmlContent: data.htmlContent || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(canvaTemplates.id, id))
      .returning();

    return NextResponse.json({ template: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Template update error:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
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
      .from(canvaTemplates)
      .where(eq(canvaTemplates.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await db.delete(canvaTemplates).where(eq(canvaTemplates.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
