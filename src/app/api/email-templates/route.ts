import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { emailTemplates } from "@/server/db/schema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const [template] = await db
      .insert(emailTemplates)
      .values({
        name: body.name,
        description: body.description,
        category: body.category || "general",
        thumbnailUrl: body.thumbnailUrl,
        templateData: body.templateData,
        isDefault: body.isDefault || false,
        createdBy: userId,
      })
      .returning();

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Create email template error:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
