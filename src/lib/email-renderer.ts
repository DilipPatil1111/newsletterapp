import { render } from "@react-email/render";
import {
  NewsletterTemplate,
  type ContentBlock,
  type NewsletterBrandProps,
} from "@/emails/newsletter-template";
import type { Stat } from "@/emails/components/stats-bar";
import type { SectionStyle } from "@/emails/components/section-block";
import * as React from "react";

export type { ContentBlock };
export type BrandSettings = NewsletterBrandProps;

export interface RenderEmailOptions {
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

export async function renderEmail(options: RenderEmailOptions): Promise<string> {
  const element = React.createElement(NewsletterTemplate, {
    subject: options.subject,
    previewText: options.previewText,
    recipientName: options.recipientName,
    recipientEmail: options.recipientEmail,
    blocks: options.blocks,
    showStats: options.showStats,
    stats: options.stats,
    appUrl: options.appUrl,
    brand: options.brand,
  });
  return render(element);
}

export async function renderEmailPlainText(options: RenderEmailOptions): Promise<string> {
  const element = React.createElement(NewsletterTemplate, {
    subject: options.subject,
    previewText: options.previewText,
    recipientName: options.recipientName,
    recipientEmail: options.recipientEmail,
    blocks: options.blocks,
    showStats: options.showStats,
    stats: options.stats,
    appUrl: options.appUrl,
    brand: options.brand,
  });
  return render(element, { plainText: true });
}

const SECTION_KEY_MAP: Record<string, { style: SectionStyle }> = {
  "WHAT'S HAPPENING": { style: "info" },
  SALARY: { style: "success" },
  "WHY THE DEMAND": { style: "warning" },
  "WHAT YOU GET": { style: "purple" },
  "LEARN MORE": { style: "default" },
  "MARKET TRENDS": { style: "info" },
  "NEW OPPORTUNITIES": { style: "success" },
  "KEY FEATURES": { style: "purple" },
  "TOP TIPS": { style: "warning" },
  "TOP STORIES": { style: "info" },
  "UPCOMING EVENTS": { style: "purple" },
  "BY THE NUMBERS": { style: "success" },
  "EVENT DETAILS": { style: "info" },
};

export function parseContentToBlocks(rawContent: string, ctaText?: string, ctaUrl?: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const sections = rawContent.split("\n\n");

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const upperTrimmed = trimmed.toUpperCase();
    const matchedKey = Object.keys(SECTION_KEY_MAP).find((key) =>
      upperTrimmed.startsWith(key)
    );

    if (matchedKey) {
      const meta = SECTION_KEY_MAP[matchedKey];
      const lines = trimmed.split("\n");
      const heading = lines[0];
      const body = lines
        .slice(1)
        .filter((l) => l.trim())
        .join("\n");

      blocks.push({
        type: "section",
        title: heading,
        body,
        style: meta.style,
      });
    } else {
      blocks.push({ type: "paragraph", text: trimmed });
    }
  }

  if (ctaText && ctaUrl) {
    blocks.push({ type: "cta", text: ctaText, url: ctaUrl });
  }

  return blocks;
}

export function blocksToRawContent(
  blocks: ContentBlock[]
): { rawContent: string; ctaText: string; ctaUrl: string } {
  const parts: string[] = [];
  let ctaText = "";
  let ctaUrl = "";

  for (const b of blocks) {
    if (b.type === "heading") parts.push(b.text || "");
    if (b.type === "paragraph") parts.push(b.text || "");
    if (b.type === "section") parts.push(`${b.title || ""}\n${b.body || ""}`);
    if (b.type === "divider") parts.push("---");
    if (b.type === "cta") {
      ctaText = b.text || "Learn More";
      ctaUrl = b.url || "#";
    }
  }

  return {
    rawContent: parts.join("\n\n"),
    ctaText,
    ctaUrl,
  };
}

export function replacePlaceholdersInBlocks(
  blocks: ContentBlock[],
  replacements: { courseName?: string; firstName?: string }
): ContentBlock[] {
  return blocks.map((b) => {
    if (b.text) {
      let t = b.text;
      if (replacements.courseName) t = t.replace(/\{\{courseName\}\}/g, replacements.courseName);
      if (replacements.firstName) t = t.replace(/\{\{firstName\}\}/g, replacements.firstName);
      return { ...b, text: t };
    }
    if (b.title) {
      let title = b.title;
      if (replacements.courseName) title = title.replace(/\{\{courseName\}\}/g, replacements.courseName);
      return { ...b, title };
    }
    if (b.body) {
      let body = b.body;
      if (replacements.courseName) body = body.replace(/\{\{courseName\}\}/g, replacements.courseName);
      if (replacements.firstName) body = body.replace(/\{\{firstName\}\}/g, replacements.firstName);
      return { ...b, body };
    }
    return b;
  });
}

export function campaignContentToBlocks(content: Record<string, string> | null): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  if (content?.intro) {
    blocks.push({ type: "paragraph", text: content.intro });
  }

  if (content?.highlights) {
    blocks.push({
      type: "section",
      title: "Highlights",
      body: content.highlights,
      style: "info",
    });
  }

  if (content?.ctaUrl) {
    blocks.push({
      type: "cta",
      text: content.ctaText || "Learn More",
      url: content.ctaUrl,
    });
  }

  return blocks;
}
