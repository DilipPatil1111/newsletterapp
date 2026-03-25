import { Html, Head, Body, Section, Text, Preview } from "@react-email/components";
import * as React from "react";
import { Header } from "./components/header";
import { StatsBar, type Stat } from "./components/stats-bar";
import { SectionBlock, type SectionStyle } from "./components/section-block";
import { CtaButton } from "./components/cta-button";
import { Footer } from "./components/footer";

export interface ContentBlock {
  type: "heading" | "paragraph" | "section" | "image" | "cta" | "divider";
  text?: string;
  title?: string;
  body?: string;
  style?: SectionStyle;
  src?: string;
  alt?: string;
  url?: string;
}

export interface NewsletterBrandProps {
  companyName?: string;
  headerBackgroundColor?: string;
  newsletterPageBackground?: string;
  newsletterCardBackground?: string;
  newsletterTextColor?: string;
  newsletterLinkColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  websiteUrl?: string;
  contactEmail?: string;
  socialLinks?: { label: string; url: string }[];
  footerText?: string;
}

export interface NewsletterTemplateProps {
  subject: string;
  previewText?: string;
  recipientName?: string;
  recipientEmail?: string;
  blocks: ContentBlock[];
  showStats?: boolean;
  stats?: Stat[];
  appUrl?: string;
  brand?: NewsletterBrandProps;
}

export function NewsletterTemplate({
  subject,
  previewText,
  recipientName,
  recipientEmail,
  blocks,
  showStats = false,
  stats,
  appUrl = "https://intellee.com",
  brand = {},
}: NewsletterTemplateProps) {
  const unsubscribeUrl = recipientEmail
    ? `${appUrl}/unsubscribe?email=${encodeURIComponent(recipientEmail)}`
    : `${appUrl}/unsubscribe`;

  const pageBg = brand.newsletterPageBackground ?? "#F3F4F6";
  const cardBg = brand.newsletterCardBackground ?? "#ffffff";
  const textColor = brand.newsletterTextColor ?? "#374151";
  const linkColor = brand.newsletterLinkColor ?? "#4338CA";
  const headerBg = brand.headerBackgroundColor ?? "#1E1B4B";
  const font = brand.fontFamily ?? "Georgia, 'Times New Roman', Times, serif";

  return (
    <Html lang="en">
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      {/*
        Table-based outer shell: many clients (Gmail, Outlook) ignore background on <body>
        or nested divs; bgcolor + full-width table is the reliable pattern.
      */}
      <Body style={{ ...bodyStyle, backgroundColor: pageBg, fontFamily: font }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ backgroundColor: pageBg, margin: 0, borderCollapse: "collapse" }}
          bgcolor={pageBg}
        >
          <tbody>
            <tr>
              <td align="center" style={{ backgroundColor: pageBg, padding: "32px 16px" }}>
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{
                    maxWidth: "580px",
                    margin: "0 auto",
                    backgroundColor: cardBg,
                    borderRadius: "8px",
                    overflow: "hidden",
                    borderCollapse: "collapse",
                  }}
                  bgcolor={cardBg}
                >
                  <tbody>
                    <tr>
                      <td style={{ backgroundColor: cardBg }}>
                        <Header
                          companyName={brand.companyName}
                          subject={subject}
                          headerBackgroundColor={headerBg}
                          logoUrl={brand.logoUrl}
                        />

                        {showStats && (
                          <StatsBar
                            stats={stats}
                            borderColor={blendWithWhite(textColor, 0.9)}
                            backgroundColor={cardBg}
                            valueColor={linkColor}
                            labelColor={blendWithWhite(textColor, 0.55)}
                          />
                        )}

                        <Section style={{ padding: "28px 40px", backgroundColor: cardBg }}>
                          {recipientName && (
                            <Text style={{ ...greetingStyle, color: textColor }}>
                              Hi {recipientName},
                            </Text>
                          )}

                          {blocks.map((block, i) =>
                            renderBlock(block, i, {
                              linkColor,
                              textColor,
                              cardBackground: cardBg,
                            })
                          )}
                        </Section>

                        <Footer
                          companyName={brand.companyName}
                          address={brand.address}
                          phone={brand.phone}
                          websiteUrl={brand.websiteUrl}
                          contactEmail={brand.contactEmail}
                          socialLinks={brand.socialLinks}
                          unsubscribeUrl={unsubscribeUrl}
                          linkColor={linkColor}
                          footerText={brand.footerText}
                          textMutedColor={blendWithWhite(textColor, 0.55)}
                          headingColor={textColor}
                          pageBackground={pageBg}
                          cardBackground={cardBg}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

/** Mute a hex color toward light gray for secondary text (simple mix for email clients). */
function blendWithWhite(hex: string, whiteAmount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#6B7280";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const t = Math.min(1, Math.max(0, whiteAmount));
  const R = Math.round(r + (255 - r) * t);
  const G = Math.round(g + (255 - g) * t);
  const B = Math.round(b + (255 - b) * t);
  return `#${[R, G, B].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function renderBlock(
  block: ContentBlock,
  index: number,
  colors: {
    linkColor: string;
    textColor: string;
    cardBackground: string;
  }
) {
  const { linkColor, textColor, cardBackground } = colors;
  switch (block.type) {
    case "heading":
      return (
        <Text key={index} style={{ ...headingStyle, color: textColor }}>
          {block.text}
        </Text>
      );
    case "paragraph":
      return (
        <Text key={index} style={{ ...paragraphStyle, color: textColor }}>
          {block.text}
        </Text>
      );
    case "section":
      return (
        <SectionBlock
          key={index}
          title={block.title || ""}
          body={block.body || ""}
          sectionStyle={block.style || "default"}
          bodyTextColor={textColor}
          linkColor={linkColor}
          cardBackground={cardBackground}
        />
      );
    case "cta":
      return (
        <CtaButton
          key={index}
          text={block.text || "Learn More"}
          url={block.url || "#"}
          accentColor={linkColor}
          preText="Ready to take the next step in your career?"
          cardBackground={cardBackground}
          textColor={textColor}
        />
      );
    case "divider":
      return (
        <hr
          key={index}
          style={{
            border: "none",
            borderTop: `1px solid ${blendWithWhite(textColor, 0.82)}`,
            margin: "24px 0",
          }}
        />
      );
    case "image":
      return (
        <img
          key={index}
          src={block.src}
          alt={block.alt || ""}
          style={{
            width: "100%",
            borderRadius: "8px",
            margin: "16px 0",
          }}
        />
      );
    default:
      return null;
  }
}

const bodyStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  WebkitFontSmoothing: "antialiased",
};

const greetingStyle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: "16px",
  lineHeight: "1.6",
};

const headingStyle: React.CSSProperties = {
  margin: "16px 0 8px",
  fontSize: "20px",
  fontWeight: 600,
  lineHeight: "1.4",
};

const paragraphStyle: React.CSSProperties = {
  margin: "6px 0",
  fontSize: "15px",
  lineHeight: "1.75",
};

export default NewsletterTemplate;
