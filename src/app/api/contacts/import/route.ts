import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contacts, contactImports } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";

const importSchema = z.object({
  contacts: z.array(
    z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      company: z.string().optional(),
      role: z.string().optional(),
      geography: z.string().optional(),
      projectTraining: z.string().optional(),
    })
  ),
  source: z.enum(["csv", "excel", "pdf", "exa_api", "manual"]),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = importSchema.parse(body);

    const [importRecord] = await db
      .insert(contactImports)
      .values({
        source: data.source,
        status: "processing",
        totalRows: data.contacts.length,
        createdBy: userId,
      })
      .returning();

    let imported = 0;
    let failed = 0;

    for (const contact of data.contacts) {
      try {
        await db
          .insert(contacts)
          .values({
            email: contact.email.toLowerCase().trim(),
            firstName: contact.firstName || null,
            lastName: contact.lastName || null,
            company: contact.company || null,
            role: contact.role || null,
            geography: contact.geography || null,
            projectTraining: contact.projectTraining || null,
            status: "active",
            importId: importRecord.id,
          })
          .onConflictDoNothing();
        imported++;
      } catch {
        failed++;
      }
    }

    await db
      .update(contactImports)
      .set({
        status: "completed",
        importedRows: imported,
        failedRows: failed,
        updatedAt: new Date(),
      })
      .where(eq(contactImports.id, importRecord.id));

    return NextResponse.json({
      imported,
      failed,
      importId: importRecord.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
