import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { brandSettings } from "@/server/db/schema";
import { renderEmail, parseContentToBlocks, type ContentBlock } from "@/lib/email-renderer";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      subject = "Newsletter Preview",
      previewText,
      rawContent,
      blocks,
      ctaText,
      ctaUrl,
      recipientName = "Preview User",
      showStats = true,
    } = body;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let contentBlocks: ContentBlock[];

    if (blocks && Array.isArray(blocks)) {
      contentBlocks = blocks;
    } else if (rawContent) {
      contentBlocks = parseContentToBlocks(rawContent, ctaText, ctaUrl);
    } else {
      contentBlocks = [{ type: "paragraph", text: "No content provided." }];
    }

    const [brand] = await db.select().from(brandSettings).limit(1);
    const brandOpts = brand
      ? {
          companyName: brand.companyName,
          primaryColor: brand.primaryColor,
          accentColor: brand.accentColor,
          logoUrl: brand.logoUrl ?? undefined,
          address: brand.address ?? undefined,
          phone: brand.phone ?? undefined,
          websiteUrl: brand.websiteUrl ?? undefined,
          contactEmail: brand.contactEmail ?? undefined,
          socialLinks: (brand.socialLinks as { label: string; url: string }[] | null) ?? undefined,
        }
      : undefined;

    const html = await renderEmail({
      subject,
      previewText,
      recipientName,
      blocks: contentBlocks,
      showStats,
      appUrl,
      brand: brandOpts,
    });

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Email preview error:", error);
    return NextResponse.json(
      { error: "Failed to render preview" },
      { status: 500 }
    );
  }
}
