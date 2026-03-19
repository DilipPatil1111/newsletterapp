import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { emailTemplates } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

const updateEmailTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(["announcement", "course_highlight", "monthly_digest", "event_invitation", "general"]).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean().optional(),
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
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id))
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
    const data = updateEmailTemplateSchema.parse(body);

    const [existing] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(emailTemplates)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category && { category: data.category }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
        ...(data.templateData && { templateData: data.templateData }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id))
      .returning();

    return NextResponse.json({ template: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Email template update error:", error);
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
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
