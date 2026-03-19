import { db } from "@/lib/db";
import { contacts, suppressionList } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();

    await db
      .update(contacts)
      .set({ status: "unsubscribed", updatedAt: new Date() })
      .where(eq(contacts.email, normalized));

    await db
      .insert(suppressionList)
      .values({ email: normalized, reason: "unsubscribed" })
      .onConflictDoNothing();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
