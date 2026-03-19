import { Section, Text, Link } from "@react-email/components";
import * as React from "react";

interface EmailSignatureProps {
  companyName?: string;
  address?: string;
  phone?: string;
  websiteUrl?: string;
  primaryColor?: string;
}

export function EmailSignature({
  companyName = "Intellee College",
  address = "Tech Park, Bangalore, India",
  phone = "+91 98765 43210",
  websiteUrl = "https://intellee.com",
  primaryColor = "#4338CA",
}: EmailSignatureProps) {
  const displayUrl = websiteUrl.replace(/^https?:\/\//, "");

  return (
    <Section style={{ padding: "24px 40px 0", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <Text
        style={{
          margin: "0 0 8px",
          fontSize: "14px",
          fontWeight: 600,
          color: "#1E1B4B",
        }}
      >
        Team {companyName}
      </Text>
      <Text style={{ margin: "0 0 2px", fontSize: "13px", color: "#374151" }}>
        {companyName}
      </Text>
      {address && (
        <Text style={{ margin: "0 0 2px", fontSize: "12px", color: "#6B7280" }}>
          {address}
        </Text>
      )}
      {phone && (
        <Text style={{ margin: "0 0 2px", fontSize: "12px", color: "#6B7280" }}>
          {phone}
        </Text>
      )}
      {websiteUrl && (
        <Text style={{ margin: "0", fontSize: "12px" }}>
          <Link href={websiteUrl} style={{ color: primaryColor, textDecoration: "none" }}>
            Website: {displayUrl}
          </Link>
        </Text>
      )}
    </Section>
  );
}
