import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contacts } from "@/server/db/schema";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
      .select({
        id: contacts.id,
        email: contacts.email,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        role: contacts.role,
        geography: contacts.geography,
        projectTraining: contacts.projectTraining,
        status: contacts.status,
      })
      .from(contacts)
      .orderBy(sql`${contacts.createdAt} DESC`);

    return NextResponse.json({ contacts: list });
  } catch {
    return NextResponse.json({ contacts: [] });
  }
}
