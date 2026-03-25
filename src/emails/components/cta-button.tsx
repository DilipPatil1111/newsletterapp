import { Section, Text, Button } from "@react-email/components";
import * as React from "react";

interface CtaButtonProps {
  text: string;
  url: string;
  accentColor?: string;
  preText?: string;
  /** Match newsletter content card */
  cardBackground?: string;
  textColor?: string;
}

export function CtaButton({
  text,
  url,
  accentColor = "#4338CA",
  preText = "Ready to take the next step in your career?",
  cardBackground = "#ffffff",
  textColor = "#374151",
}: CtaButtonProps) {
  const ctaBg = tintCtaArea(cardBackground, accentColor);

  return (
    <Section
      style={{
        margin: "24px 0",
        padding: "24px",
        backgroundColor: ctaBg,
        borderRadius: "10px",
        textAlign: "center" as const,
      }}
    >
      {preText && (
        <Text style={{ margin: "0 0 14px", color: textColor, fontSize: "15px" }}>
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

function tintCtaArea(cardHex: string, accentHex: string): string {
  const c = /^#?([0-9a-f]{6})$/i.exec(cardHex.trim());
  const a = /^#?([0-9a-f]{6})$/i.exec(accentHex.trim());
  if (!c || !a) return "#F5F3FF";
  const cv = parseInt(c[1], 16);
  const av = parseInt(a[1], 16);
  const cr = (cv >> 16) & 255;
  const cg = (cv >> 8) & 255;
  const cb = cv & 255;
  const ar = (av >> 16) & 255;
  const ag = (av >> 8) & 255;
  const ab = av & 255;
  const t = 0.12;
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[mix(cr, ar), mix(cg, ag), mix(cb, ab)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}
