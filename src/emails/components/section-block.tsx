import { Section, Text } from "@react-email/components";
import * as React from "react";

export type SectionStyle = "info" | "success" | "warning" | "purple" | "default";

interface SectionBlockProps {
  title: string;
  body: string;
  sectionStyle?: SectionStyle;
}

const styleMap: Record<
  SectionStyle,
  { icon: string; accent: string; bg: string; border: string }
> = {
  info: { icon: "\u{1F4CA}", accent: "#4338CA", bg: "#EEF2FF", border: "#A5B4FC" },
  success: { icon: "\u{1F4BC}", accent: "#047857", bg: "#ECFDF5", border: "#6EE7B7" },
  warning: { icon: "\u{1F4C8}", accent: "#B45309", bg: "#FFFBEB", border: "#FCD34D" },
  purple: { icon: "\u{2705}", accent: "#6D28D9", bg: "#F5F3FF", border: "#C4B5FD" },
  default: { icon: "\u{1F517}", accent: "#4338CA", bg: "#EFF6FF", border: "#93C5FD" },
};

export function SectionBlock({
  title,
  body,
  sectionStyle = "default",
}: SectionBlockProps) {
  const meta = styleMap[sectionStyle];
  const lines = body.split("\n").filter((l) => l.trim());

  return (
    <Section
      style={{
        margin: "16px 0",
        padding: "20px 24px",
        backgroundColor: meta.bg,
        borderLeft: `4px solid ${meta.border}`,
        borderRadius: "8px",
      }}
    >
      <Text
        style={{
          margin: "0 0 12px",
          fontSize: "15px",
          fontWeight: 600,
          color: meta.accent,
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
            color: "#374151",
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
