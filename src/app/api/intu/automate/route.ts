import { auth, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { contacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveBusinessBySlug } from "@/lib/businesses-service";

export const maxDuration = 120;

const automateSchema = z.object({
  topic: z.string().min(1).max(300),
  businessSlug: z.string().optional().default("intellee_college"),
  ccUser: z.boolean().optional().default(false),
});

/**
 * Intu: generate newsletter content (same pipeline as Create Newsletter) then send to active contacts.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = automateSchema.parse(body);

    const rows = await db
      .select({ id: contacts.id, email: contacts.email })
      .from(contacts)
      .where(eq(contacts.status, "active"));

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No active contacts. Add contacts before sending." },
        { status: 400 }
      );
    }

    const business = await resolveBusinessBySlug(data.businessSlug);
    const collegeContext = business?.name ?? "Intellee College";

    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";
    const origin = `${proto}://${host}`;
    const cookie = h.get("cookie") ?? "";

    const genRes = await fetch(`${origin}/api/generate-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({
        courseName: data.topic,
        collegeContext,
        businessSlug: data.businessSlug,
      }),
    });

    const genJson = await genRes.json().catch(() => ({}));
    if (!genRes.ok) {
      return NextResponse.json(
        {
          error:
            typeof genJson.error === "string"
              ? genJson.error
              : "Content generation failed",
        },
        { status: genRes.status >= 400 ? genRes.status : 500 }
      );
    }

    let ccEmails: string[] | undefined;
    if (data.ccUser) {
      const user = await currentUser();
      const email =
        user?.primaryEmailAddress?.emailAddress ??
        user?.emailAddresses?.[0]?.emailAddress;
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ccEmails = [email];
      }
    }

    const sendRes = await fetch(`${origin}/api/newsletters/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({
        courseName: data.topic,
        subjectLine: genJson.subjectLine,
        previewText: genJson.previewText,
        htmlContent: genJson.fullContent,
        ctaText: genJson.ctaText,
        ctaUrl: genJson.ctaUrl,
        contactIds: rows.map((r) => r.id),
        ccEmails,
      }),
    });

    const sendJson = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok) {
      return NextResponse.json(
        {
          error:
            typeof sendJson.error === "string" ? sendJson.error : "Send failed",
        },
        { status: sendRes.status >= 400 ? sendRes.status : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      topic: data.topic,
      businessSlug: data.businessSlug,
      sent: sendJson.sent ?? 0,
      failed: sendJson.failed ?? 0,
      total: sendJson.total ?? rows.length,
      campaignId: sendJson.campaignId,
      ccApplied: Boolean(ccEmails?.length),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Intu automate error:", error);
    return NextResponse.json(
      { error: "Intu could not complete automation" },
      { status: 500 }
    );
  }
}
