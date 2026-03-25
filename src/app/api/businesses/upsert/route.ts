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

const upsertSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9_]+$/),
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

/** Create or update a business row by slug (used to override built-in defaults). */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = upsertSchema.parse(body);

    const fieldLabel1 =
      data.fieldLabel1?.trim() || DEFAULT_TOPIC_FIELD_LABEL;
    const fieldLabel2 =
      data.fieldLabel2?.trim() || DEFAULT_ORG_FIELD_LABEL;
    const generatePromptContext =
      data.generatePromptContext?.trim() || DEFAULT_BUSINESS_PROMPT_CONTEXT;

    const [existing] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.slug, data.slug))
      .limit(1);

    if (existing) {
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
        .where(eq(businesses.id, existing.id))
        .returning();
      return NextResponse.json({ business: updated, created: false });
    }

    const [created] = await db
      .insert(businesses)
      .values({
        slug: data.slug,
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
        createdBy: userId,
      })
      .returning();

    return NextResponse.json({ business: created, created: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Upsert business error:", error);
    return NextResponse.json(
      { error: clientSafeDbError(error, "Failed to save business") },
      { status: 500 }
    );
  }
}
