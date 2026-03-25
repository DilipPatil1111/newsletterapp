import { Section, Text, Link, Hr } from "@react-email/components";
import * as React from "react";

interface SocialLink {
  label: string;
  url: string;
}

interface FooterProps {
  companyName?: string;
  address?: string;
  phone?: string;
  websiteUrl?: string;
  contactEmail?: string;
  socialLinks?: SocialLink[];
  unsubscribeUrl: string;
  /** Links, email, unsubscribe accent */
  linkColor?: string;
  /** Main legal line under social links */
  footerText?: string;
  textMutedColor?: string;
  /** Company name in main footer row */
  headingColor?: string;
  /** Outer newsletter background (legal strip) */
  pageBackground?: string;
  /** Content card background (optional, for hr contrast) */
  cardBackground?: string;
}

export function Footer({
  companyName = "Intellee College",
  address = "Tech Park, Bangalore, India",
  phone = "+91 98765 43210",
  websiteUrl = "https://intellee.com",
  contactEmail = "admissions@intellee.com",
  socialLinks = [
    { label: "LinkedIn", url: "https://linkedin.com/company/intellee" },
    { label: "Twitter", url: "https://twitter.com/intellee" },
    { label: "Instagram", url: "https://instagram.com/intellee" },
  ],
  unsubscribeUrl,
  linkColor = "#4338CA",
  footerText = "You are receiving this because you expressed interest in our programs.",
  textMutedColor = "#6B7280",
  headingColor = "#1E1B4B",
  pageBackground = "#F3F4F6",
  cardBackground = "#ffffff",
}: FooterProps) {
  const hrColor = mixHex(cardBackground, textMutedColor, 0.35);

  return (
    <>
      <Hr style={{ borderColor: hrColor, margin: 0 }} />
      <Section
        style={{
          padding: "24px 40px",
          fontFamily: "Arial, Helvetica, sans-serif",
          backgroundColor: cardBackground,
        }}
      >
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
          <tbody>
            <tr>
              <td style={{ verticalAlign: "top" }}>
                <Text
                  style={{
                    margin: "0 0 4px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: headingColor,
                  }}
                >
                  {companyName}
                </Text>
                <Text style={{ margin: "0 0 2px", fontSize: "12px", color: textMutedColor }}>{address}</Text>
                <Text style={{ margin: "0", fontSize: "12px", color: textMutedColor }}>{phone}</Text>
              </td>
              <td style={{ verticalAlign: "top", textAlign: "right" as const }}>
                <Text style={{ margin: "0 0 2px", fontSize: "12px" }}>
                  <Link href={websiteUrl} style={{ color: linkColor, textDecoration: "none" }}>
                    {websiteUrl.replace(/^https?:\/\//, "")}
                  </Link>
                </Text>
                <Text style={{ margin: "0 0 2px", fontSize: "12px" }}>
                  <Link href={`mailto:${contactEmail}`} style={{ color: linkColor, textDecoration: "none" }}>
                    {contactEmail}
                  </Link>
                </Text>
                <Text style={{ margin: "0", fontSize: "12px" }}>
                  {socialLinks.map((link, i) => (
                    <React.Fragment key={link.label}>
                      {i > 0 && " \u00B7 "}
                      <Link href={link.url} style={{ color: textMutedColor, textDecoration: "none" }}>
                        {link.label}
                      </Link>
                    </React.Fragment>
                  ))}
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>
      <Section
        style={{
          backgroundColor: pageBackground,
          padding: "16px 40px",
          textAlign: "center" as const,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <Text
          style={{
            margin: "0",
            color: textMutedColor,
            fontSize: "11px",
            lineHeight: "1.6",
          }}
        >
          {footerText}
          <br />
          <Link href={unsubscribeUrl} style={{ color: linkColor, textDecoration: "underline" }}>
            Unsubscribe
          </Link>
          {" \u00B7 \u00A9 "}
          {new Date().getFullYear()} {companyName}
        </Text>
      </Section>
    </>
  );
}

function mixHex(a: string, b: string, t: number): string {
  const pa = /^#?([0-9a-f]{6})$/i.exec(a.trim());
  const pb = /^#?([0-9a-f]{6})$/i.exec(b.trim());
  if (!pa || !pb) return "#E5E7EB";
  const av = parseInt(pa[1], 16);
  const bv = parseInt(pb[1], 16);
  const ar = (av >> 16) & 255;
  const ag = (av >> 8) & 255;
  const ab = av & 255;
  const br = (bv >> 16) & 255;
  const bg = (bv >> 8) & 255;
  const bb = bv & 255;
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[m(ar, br), m(ag, bg), m(ab, bb)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}
