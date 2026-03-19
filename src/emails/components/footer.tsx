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
  primaryColor?: string;
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
  primaryColor = "#4338CA",
}: FooterProps) {
  return (
    <>
      <Hr style={{ borderColor: "#E5E7EB", margin: 0 }} />
      <Section style={{ padding: "24px 40px", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
          <tbody>
            <tr>
              <td style={{ verticalAlign: "top" }}>
                <Text style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: "#1E1B4B" }}>
                  {companyName}
                </Text>
                <Text style={{ margin: "0 0 2px", fontSize: "12px", color: "#6B7280" }}>{address}</Text>
                <Text style={{ margin: "0", fontSize: "12px", color: "#6B7280" }}>{phone}</Text>
              </td>
              <td style={{ verticalAlign: "top", textAlign: "right" as const }}>
                <Text style={{ margin: "0 0 2px", fontSize: "12px" }}>
                  <Link href={websiteUrl} style={{ color: primaryColor, textDecoration: "none" }}>
                    {websiteUrl.replace(/^https?:\/\//, "")}
                  </Link>
                </Text>
                <Text style={{ margin: "0 0 2px", fontSize: "12px" }}>
                  <Link href={`mailto:${contactEmail}`} style={{ color: primaryColor, textDecoration: "none" }}>
                    {contactEmail}
                  </Link>
                </Text>
                <Text style={{ margin: "0", fontSize: "12px" }}>
                  {socialLinks.map((link, i) => (
                    <React.Fragment key={link.label}>
                      {i > 0 && " \u00B7 "}
                      <Link href={link.url} style={{ color: "#6B7280", textDecoration: "none" }}>
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
          backgroundColor: "#F9FAFB",
          padding: "16px 40px",
          textAlign: "center" as const,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <Text style={{ margin: "0", color: "#9CA3AF", fontSize: "11px", lineHeight: "1.6" }}>
          You are receiving this because you expressed interest in Intellee programs.
          <br />
          <Link href={unsubscribeUrl} style={{ color: primaryColor, textDecoration: "underline" }}>
            Unsubscribe
          </Link>
          {" \u00B7 \u00A9 "}
          {new Date().getFullYear()} {companyName}
        </Text>
      </Section>
    </>
  );
}
