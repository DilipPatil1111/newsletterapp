import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { campaigns, campaignVersions } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  subjectLine: z.string().min(1).optional(),
  previewText: z.string().optional(),
  segmentId: z.string().uuid().nullable().optional(),
  templateId: z.string().uuid().nullable().optional(),
  content: z.record(z.string(), z.string()).optional(),
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
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch {
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
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
    const data = updateCampaignSchema.parse(body);

    const [existing] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (!["draft", "changes_requested"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Only draft or changes_requested campaigns can be edited" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(campaigns)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.subjectLine !== undefined && { subjectLine: data.subjectLine }),
        ...(data.previewText !== undefined && { previewText: data.previewText }),
        ...(data.segmentId !== undefined && { segmentId: data.segmentId }),
        ...(data.templateId !== undefined && { templateId: data.templateId }),
        ...(data.content && { content: data.content }),
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();

    if (data.content || data.subjectLine || data.previewText) {
      const [latestVersion] = await db
        .select()
        .from(campaignVersions)
        .where(eq(campaignVersions.campaignId, id))
        .orderBy(desc(campaignVersions.version))
        .limit(1);

      const nextVersion = (latestVersion?.version ?? 0) + 1;
      await db.insert(campaignVersions).values({
        campaignId: id,
        version: nextVersion,
        subjectLine: data.subjectLine ?? updated?.subjectLine ?? existing.subjectLine,
        previewText: data.previewText ?? updated?.previewText ?? existing.previewText,
        content: data.content ?? (updated?.content as object) ?? existing.content ?? {},
      });
    }

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Campaign update error:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
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
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (!["draft", "cancelled", "changes_requested"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Only draft, cancelled, or changes_requested campaigns can be deleted" },
        { status: 400 }
      );
    }

    await db.delete(campaigns).where(eq(campaigns.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
