import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Preview,
} from "@react-email/components";
import * as React from "react";
import { Header } from "./components/header";
import { StatsBar, type Stat } from "./components/stats-bar";
import { SectionBlock, type SectionStyle } from "./components/section-block";
import { CtaButton } from "./components/cta-button";
import { EmailSignature } from "./components/email-signature";
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

export interface NewsletterTemplateProps {
  subject: string;
  previewText?: string;
  recipientName?: string;
  recipientEmail?: string;
  blocks: ContentBlock[];
  showStats?: boolean;
  stats?: Stat[];
  appUrl?: string;
  brand?: {
    companyName?: string;
    primaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    websiteUrl?: string;
    contactEmail?: string;
    socialLinks?: { label: string; url: string }[];
    footerText?: string;
  };
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

  return (
    <Html lang="en">
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={bodyStyle}>
        <Container style={wrapperStyle}>
          <Container style={containerStyle}>
            <Header
              companyName={brand.companyName}
              subject={subject}
              primaryColor={brand.primaryColor}
              logoUrl={brand.logoUrl}
            />

            {showStats && <StatsBar stats={stats} />}

            <Section style={{ padding: "28px 40px" }}>
              {recipientName && (
                <Text style={greetingStyle}>Hi {recipientName},</Text>
              )}

              {blocks.map((block, i) => renderBlock(block, i, brand.accentColor))}
            </Section>

            <EmailSignature
              companyName={brand.companyName}
              address={brand.address}
              phone={brand.phone}
              websiteUrl={brand.websiteUrl}
              primaryColor={brand.accentColor || brand.primaryColor}
            />

            <Footer
              companyName={brand.companyName}
              address={brand.address}
              websiteUrl={brand.websiteUrl}
              contactEmail={brand.contactEmail}
              socialLinks={brand.socialLinks}
              unsubscribeUrl={unsubscribeUrl}
              primaryColor={brand.accentColor || brand.primaryColor}
            />
          </Container>
        </Container>
      </Body>
    </Html>
  );
}

function renderBlock(block: ContentBlock, index: number, accentColor?: string) {
  switch (block.type) {
    case "heading":
      return (
        <Text key={index} style={headingStyle}>
          {block.text}
        </Text>
      );
    case "paragraph":
      return (
        <Text key={index} style={paragraphStyle}>
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
        />
      );
    case "cta":
      return (
        <CtaButton
          key={index}
          text={block.text || "Learn More"}
          url={block.url || "#"}
          accentColor={accentColor}
        />
      );
    case "divider":
      return (
        <hr
          key={index}
          style={{
            border: "none",
            borderTop: "1px solid #E5E7EB",
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
  backgroundColor: "#F3F4F6",
  fontFamily: "Georgia, 'Times New Roman', Times, serif",
  WebkitFontSmoothing: "antialiased",
};

const wrapperStyle: React.CSSProperties = {
  padding: "32px 16px",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "580px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  overflow: "hidden",
};

const greetingStyle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: "16px",
  color: "#374151",
  lineHeight: "1.6",
};

const headingStyle: React.CSSProperties = {
  margin: "16px 0 8px",
  fontSize: "20px",
  fontWeight: 600,
  color: "#111827",
  lineHeight: "1.4",
};

const paragraphStyle: React.CSSProperties = {
  margin: "6px 0",
  color: "#374151",
  fontSize: "15px",
  lineHeight: "1.75",
};

export default NewsletterTemplate;
