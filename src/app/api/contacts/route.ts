import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contacts } from "@/server/db/schema";
import { z } from "zod";
import { NextResponse } from "next/server";

const createContactSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  geography: z.string().optional(),
  projectTraining: z.string().optional(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createContactSchema.parse(body);

    const [contact] = await db
      .insert(contacts)
      .values({
        email: data.email.toLowerCase().trim(),
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        company: data.company || null,
        role: data.role || null,
        geography: data.geography || null,
        projectTraining: data.projectTraining || null,
        status: "active",
      })
      .onConflictDoNothing()
      .returning();

    return NextResponse.json({ contact });
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
