import { Section, Text, Button } from "@react-email/components";
import * as React from "react";

interface CtaButtonProps {
  text: string;
  url: string;
  accentColor?: string;
  preText?: string;
}

export function CtaButton({
  text,
  url,
  accentColor = "#4338CA",
  preText = "Ready to take the next step in your career?",
}: CtaButtonProps) {
  return (
    <Section
      style={{
        margin: "24px 0",
        padding: "24px",
        backgroundColor: "#F5F3FF",
        borderRadius: "10px",
        textAlign: "center" as const,
      }}
    >
      {preText && (
        <Text style={{ margin: "0 0 14px", color: "#374151", fontSize: "15px" }}>
          {preText}
        </Text>
      )}
      <Button
        href={url}
        style={{
          backgroundColor: accentColor,
          color: "#ffffff",
          padding: "13px 32px",
          borderRadius: "6px",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "14px",
          display: "inline-block",
        }}
      >
        {text}
      </Button>
    </Section>
  );
}
