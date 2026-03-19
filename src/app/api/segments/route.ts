import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { segments } from "@/server/db/schema";
import { z } from "zod";
import { NextResponse } from "next/server";

const createSegmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  filters: z.record(z.string(), z.string()),
  estimatedSize: z.number().default(0),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createSegmentSchema.parse(body);

    const [segment] = await db
      .insert(segments)
      .values({
        name: data.name,
        description: data.description || null,
        filters: data.filters,
        estimatedSize: data.estimatedSize,
        createdBy: userId,
      })
      .returning();

    return NextResponse.json({ segment });
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
