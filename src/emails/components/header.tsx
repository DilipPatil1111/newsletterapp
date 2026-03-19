import { Section, Text, Img } from "@react-email/components";
import * as React from "react";

interface HeaderProps {
  companyName?: string;
  subject: string;
  primaryColor?: string;
  logoUrl?: string;
}

export function Header({
  companyName = "Intellee College",
  subject,
  primaryColor = "#1E1B4B",
  logoUrl,
}: HeaderProps) {
  return (
    <Section style={{ ...headerStyle, backgroundColor: primaryColor }}>
      {logoUrl ? (
        <Img
          src={logoUrl}
          alt={companyName}
          width={120}
          style={{ margin: "0 auto 12px", display: "block" }}
        />
      ) : (
        <Text style={companyLabel}>{companyName.toUpperCase()}</Text>
      )}
      <Text style={subjectText}>{subject}</Text>
    </Section>
  );
}

const headerStyle: React.CSSProperties = {
  padding: "32px 40px",
  textAlign: "center" as const,
};

const companyLabel: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: "12px",
  color: "#C7D2FE",
  letterSpacing: "3px",
  textTransform: "uppercase" as const,
  fontFamily: "Arial, Helvetica, sans-serif",
};

const subjectText: React.CSSProperties = {
  margin: "0",
  fontSize: "20px",
  color: "#ffffff",
  lineHeight: "1.4",
  fontWeight: "normal",
};
