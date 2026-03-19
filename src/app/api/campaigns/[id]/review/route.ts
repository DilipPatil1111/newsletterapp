import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { campaigns, campaignApprovals } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

const reviewSchema = z.object({
  action: z.enum(["approved", "changes_requested", "rejected"]),
  comments: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignId } = await params;

  try {
    const body = await req.json();
    const data = reviewSchema.parse(body);

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.status !== "pending_review") {
      return NextResponse.json(
        { error: "Campaign is not pending review" },
        { status: 400 }
      );
    }

    await db.insert(campaignApprovals).values({
      campaignId,
      reviewerUserId: userId,
      action: data.action,
      comments: data.comments || null,
    });

    const newStatus =
      data.action === "approved"
        ? "approved"
        : data.action === "changes_requested"
          ? "changes_requested"
          : "cancelled";

    await db
      .update(campaigns)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Review error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
