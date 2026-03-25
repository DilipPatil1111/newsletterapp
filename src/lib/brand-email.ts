import type { BrandSettings } from "@/server/db/schema";

/** Maps DB row to props consumed by react-email newsletter template */
export function mapBrandForEmail(brand: BrandSettings | null | undefined) {
  if (!brand) return undefined;

  const headerBg = brand.headerBackgroundColor || brand.primaryColor;
  const linkColor = brand.newsletterLinkColor || brand.accentColor;

  return {
    companyName: brand.companyName,
    headerBackgroundColor: headerBg,
    newsletterPageBackground: brand.newsletterPageBackground || "#F3F4F6",
    newsletterCardBackground: brand.newsletterCardBackground || "#ffffff",
    newsletterTextColor: brand.newsletterTextColor || "#374151",
    newsletterLinkColor: linkColor,
    fontFamily: brand.fontFamily ?? undefined,
    logoUrl: brand.logoUrl ?? undefined,
    address: brand.address ?? undefined,
    phone: brand.phone ?? undefined,
    websiteUrl: brand.websiteUrl ?? undefined,
    contactEmail: brand.contactEmail ?? undefined,
    socialLinks: (brand.socialLinks as { label: string; url: string }[] | null) ?? undefined,
    footerText: brand.footerText ?? undefined,
  };
}
