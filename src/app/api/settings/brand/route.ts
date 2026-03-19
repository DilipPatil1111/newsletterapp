import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { brandSettings } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [settings] = await db.select().from(brandSettings).limit(1);

    if (!settings) {
      return NextResponse.json({ settings: getDefaults(userId) });
    }

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ settings: getDefaults(userId) });
  }
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const [existing] = await db.select().from(brandSettings).limit(1);

    if (existing) {
      const [updated] = await db
        .update(brandSettings)
        .set({
          companyName: body.companyName,
          logoUrl: body.logoUrl,
          businessSlug: body.businessSlug,
          brandLibraryUrls: body.brandLibraryUrls ?? existing.brandLibraryUrls,
          primaryColor: body.primaryColor,
          accentColor: body.accentColor,
          fontFamily: body.fontFamily,
          address: body.address,
          phone: body.phone,
          websiteUrl: body.websiteUrl,
          contactEmail: body.contactEmail,
          socialLinks: body.socialLinks,
          footerText: body.footerText,
          brandGuidelines: body.brandGuidelines,
          updatedAt: new Date(),
        })
        .where(eq(brandSettings.id, existing.id))
        .returning();
      return NextResponse.json({ settings: updated });
    }

    const [created] = await db
      .insert(brandSettings)
      .values({
        companyName: body.companyName || "Intellee College",
        logoUrl: body.logoUrl,
        businessSlug: body.businessSlug || "intellee_college",
        brandLibraryUrls: body.brandLibraryUrls ?? [],
        primaryColor: body.primaryColor || "#1E1B4B",
        accentColor: body.accentColor || "#4338CA",
        fontFamily: body.fontFamily,
        address: body.address,
        phone: body.phone,
        websiteUrl: body.websiteUrl,
        contactEmail: body.contactEmail,
        socialLinks: body.socialLinks,
        footerText: body.footerText,
        brandGuidelines: body.brandGuidelines,
        createdBy: userId,
      })
      .returning();

    return NextResponse.json({ settings: created });
  } catch (error) {
    console.error("Brand settings update error:", error);
    return NextResponse.json(
      { error: "Failed to update brand settings" },
      { status: 500 }
    );
  }
}

function getDefaults(userId: string) {
  return {
    id: null,
    companyName: "Intellee College",
    logoUrl: null,
    businessSlug: "intellee_college",
    brandLibraryUrls: [] as string[],
    primaryColor: "#1E1B4B",
    accentColor: "#4338CA",
    fontFamily: "Georgia, 'Times New Roman', Times, serif",
    address: "Tech Park, Bangalore, India",
    phone: "+91 98765 43210",
    websiteUrl: "https://intellee.com",
    contactEmail: "admissions@intellee.com",
    socialLinks: [
      { label: "LinkedIn", url: "https://linkedin.com/company/intellee" },
      { label: "Twitter", url: "https://twitter.com/intellee" },
      { label: "Instagram", url: "https://instagram.com/intellee" },
    ],
    footerText: "You are receiving this because you expressed interest in Intellee programs.",
    brandGuidelines: null,
    createdBy: userId,
  };
}
