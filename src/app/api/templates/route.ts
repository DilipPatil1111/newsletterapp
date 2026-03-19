import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { canvaTemplates } from "@/server/db/schema";
import { z } from "zod";
import { NextResponse } from "next/server";

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  canvaDesignUrl: z.string().url().optional().or(z.literal("")),
  heroImageUrl: z.string().url().optional().or(z.literal("")),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  projectTraining: z.string().optional(),
  targetRole: z.string().optional(),
  geography: z.string().optional(),
  campaignType: z.string().optional(),
  htmlContent: z.string().optional(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createTemplateSchema.parse(body);

    const [template] = await db
      .insert(canvaTemplates)
      .values({
        name: data.name,
        description: data.description || null,
        canvaDesignUrl: data.canvaDesignUrl || null,
        heroImageUrl: data.heroImageUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
        projectTraining: data.projectTraining || null,
        targetRole: data.targetRole || null,
        geography: data.geography || null,
        campaignType: data.campaignType || null,
        htmlContent: data.htmlContent || null,
        createdBy: userId,
      })
      .returning();

    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
