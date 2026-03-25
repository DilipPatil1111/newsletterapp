import { auth } from "@clerk/nextjs/server";
import { deleteCampaignCascade } from "@/lib/delete-campaign";
import { z } from "zod";
import { NextResponse } from "next/server";

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ids } = bodySchema.parse(body);

    let deleted = 0;
    const notFound: string[] = [];

    for (const id of ids) {
      const ok = await deleteCampaignCascade(id);
      if (ok) deleted++;
      else notFound.push(id);
    }

    return NextResponse.json({
      success: true,
      deleted,
      notFound: notFound.length ? notFound : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Bulk delete campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to delete campaigns" },
      { status: 500 }
    );
  }
}
