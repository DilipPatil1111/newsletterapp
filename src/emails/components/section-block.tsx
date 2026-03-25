import { Section, Text } from "@react-email/components";
import * as React from "react";

export type SectionStyle = "info" | "success" | "warning" | "purple" | "default";

interface SectionBlockProps {
  title: string;
  body: string;
  sectionStyle?: SectionStyle;
  bodyTextColor?: string;
  linkColor?: string;
  /** Content card background from brand — sections sit on this instead of hardcoded tints */
  cardBackground?: string;
}

const styleMap: Record<SectionStyle, { icon: string }> = {
  info: { icon: "\u{1F4CA}" },
  success: { icon: "\u{1F4BC}" },
  warning: { icon: "\u{1F4C8}" },
  purple: { icon: "\u{2705}" },
  default: { icon: "\u{1F517}" },
};

export function SectionBlock({
  title,
  body,
  sectionStyle = "default",
  bodyTextColor = "#374151",
  linkColor = "#4338CA",
  cardBackground = "#ffffff",
}: SectionBlockProps) {
  const meta = styleMap[sectionStyle];
  const lines = body.split("\n").filter((l) => l.trim());

  return (
    <Section
      style={{
        margin: "16px 0",
        padding: "20px 24px",
        backgroundColor: tintTowardLink(cardBackground, linkColor, 0.08),
        borderLeft: `4px solid ${linkColor}`,
        borderRadius: "8px",
      }}
    >
      <Text
        style={{
          margin: "0 0 12px",
          fontSize: "15px",
          fontWeight: 600,
          color: linkColor,
          letterSpacing: "0.3px",
        }}
      >
        {meta.icon} {title}
      </Text>
      {lines.map((line, i) => (
        <Text
          key={i}
          style={{
            margin: "8px 0",
            color: bodyTextColor,
            fontSize: "14px",
            lineHeight: "1.75",
          }}
        >
          {line.trim()}
        </Text>
      ))}
    </Section>
  );
}

/** Light tint of link color over card background (email-safe linear mix). */
function tintTowardLink(cardHex: string, linkHex: string, amount: number): string {
  const a = parseHex(cardHex);
  const b = parseHex(linkHex);
  if (!a || !b) return cardHex;
  const t = Math.min(1, Math.max(0, amount));
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
