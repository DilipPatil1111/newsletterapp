import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { businesses } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_TOPIC_FIELD_LABEL,
  DEFAULT_ORG_FIELD_LABEL,
  DEFAULT_BUSINESS_PROMPT_CONTEXT,
} from "@/lib/business-defaults";
import { clientSafeDbError } from "@/lib/db-errors";

const updateSchema = z.object({
  name: z.string().min(1).max(300),
  fieldLabel1: z.string().max(120).optional(),
  fieldLabel2: z.string().max(120).optional(),
  placeholder1: z.string().optional(),
  placeholder2: z.string().optional(),
  defaultAddress: z.string().optional(),
  defaultPhone: z.string().optional(),
  defaultWebsiteUrl: z.string().optional(),
  defaultContactEmail: z.string().email().optional().or(z.literal("")),
  generatePromptContext: z.string().max(4000).optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    return NextResponse.json(
      { error: "Use POST /api/businesses/upsert to create or override a built-in business by slug" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const fieldLabel1 =
      data.fieldLabel1?.trim() || DEFAULT_TOPIC_FIELD_LABEL;
    const fieldLabel2 =
      data.fieldLabel2?.trim() || DEFAULT_ORG_FIELD_LABEL;
    const generatePromptContext =
      data.generatePromptContext?.trim() || DEFAULT_BUSINESS_PROMPT_CONTEXT;

    const [existing] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(businesses)
      .set({
        name: data.name,
        fieldLabel1,
        fieldLabel2,
        placeholder1: data.placeholder1 || null,
        placeholder2: data.placeholder2 || null,
        defaultAddress: data.defaultAddress || null,
        defaultPhone: data.defaultPhone || null,
        defaultWebsiteUrl: data.defaultWebsiteUrl || null,
        defaultContactEmail: data.defaultContactEmail || null,
        generatePromptContext,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, id))
      .returning();

    return NextResponse.json({ business: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Update business error:", error);
    return NextResponse.json(
      { error: clientSafeDbError(error, "Failed to update business") },
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
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    return NextResponse.json(
      { error: "Built-in businesses cannot be deleted. Remove a saved override from the database only." },
      { status: 400 }
    );
  }

  try {
    const [deleted] = await db
      .delete(businesses)
      .where(eq(businesses.id, id))
      .returning();
    if (!deleted) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete business error:", error);
    return NextResponse.json(
      { error: clientSafeDbError(error, "Failed to delete business") },
      { status: 500 }
    );
  }
}
