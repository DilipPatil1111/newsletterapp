import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { segments } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

const updateSegmentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  filters: z.record(z.string(), z.string()).optional(),
  estimatedSize: z.number().optional(),
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
    const [segment] = await db
      .select()
      .from(segments)
      .where(eq(segments.id, id))
      .limit(1);

    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    return NextResponse.json({ segment });
  } catch {
    return NextResponse.json({ error: "Failed to fetch segment" }, { status: 500 });
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
    const data = updateSegmentSchema.parse(body);

    const [existing] = await db
      .select()
      .from(segments)
      .where(eq(segments.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(segments)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.filters && { filters: data.filters }),
        ...(data.estimatedSize !== undefined && { estimatedSize: data.estimatedSize }),
        updatedAt: new Date(),
      })
      .where(eq(segments.id, id))
      .returning();

    return NextResponse.json({ segment: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update segment" },
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
      .from(segments)
      .where(eq(segments.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    await db.delete(segments).where(eq(segments.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete segment" },
      { status: 500 }
    );
  }
}
