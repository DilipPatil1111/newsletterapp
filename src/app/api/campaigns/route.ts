import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { campaigns, campaignVersions } from "@/server/db/schema";
import { z } from "zod";
import { NextResponse } from "next/server";

const createCampaignSchema = z.object({
  name: z.string().min(1),
  subjectLine: z.string().min(1),
  previewText: z.string().optional(),
  segmentId: z.string().uuid().nullable().optional(),
  templateId: z.string().uuid().nullable().optional(),
  content: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createCampaignSchema.parse(body);

    const [campaign] = await db
      .insert(campaigns)
      .values({
        name: data.name,
        subjectLine: data.subjectLine,
        previewText: data.previewText || null,
        segmentId: data.segmentId || null,
        templateId: data.templateId || null,
        content: data.content || null,
        status: "draft",
        createdBy: userId,
      })
      .returning();

    await db.insert(campaignVersions).values({
      campaignId: campaign.id,
      version: 1,
      subjectLine: campaign.subjectLine,
      previewText: campaign.previewText,
      content: data.content || {},
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Campaign create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
