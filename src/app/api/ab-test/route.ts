import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { abVariants, campaigns } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  campaignId: z.string().uuid(),
  variants: z
    .array(
      z.object({
        variantLabel: z.string().max(10),
        subjectLine: z.string().optional(),
        content: z.record(z.string(), z.string()).optional(),
        percentage: z.number().min(1).max(100),
      })
    )
    .min(2)
    .max(5),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const totalPercentage = data.variants.reduce((sum, v) => sum + v.percentage, 0);
    if (totalPercentage !== 100) {
      return NextResponse.json(
        { error: "Variant percentages must sum to 100" },
        { status: 400 }
      );
    }

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, data.campaignId))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const created = [];
    for (const variant of data.variants) {
      const [row] = await db
        .insert(abVariants)
        .values({
          campaignId: data.campaignId,
          variantLabel: variant.variantLabel,
          subjectLine: variant.subjectLine || campaign.subjectLine,
          content: variant.content || campaign.content,
          percentage: variant.percentage,
        })
        .returning();
      created.push(row);
    }

    return NextResponse.json({ variants: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("A/B test creation error:", error);
    return NextResponse.json(
      { error: "Failed to create A/B test" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  try {
    const variants = await db
      .select()
      .from(abVariants)
      .where(eq(abVariants.campaignId, campaignId));

    return NextResponse.json({ variants });
  } catch {
    return NextResponse.json({ variants: [] });
  }
}
