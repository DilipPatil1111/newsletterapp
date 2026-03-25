/**
 * Parse natural-language commands for Intu (voice or text).
 * Handles speech variants: "into" / "in to" for "Intu".
 */

export type IntuParseResult =
  | { kind: "activate" }
  | { kind: "deactivate" }
  | {
      kind: "create_and_send";
      topic: string;
      businessSlug: string;
      allContacts: boolean;
      ccUser: boolean;
    }
  | { kind: "unknown"; text: string };

const BUSINESS_HINTS: { pattern: RegExp; slug: string }[] = [
  { pattern: /\bintellee\s*(?:college)?\b/i, slug: "intellee_college" },
  { pattern: /\bnorth\s+emerald\b|\bemerald\s+realty\b/i, slug: "north_emerald_realty" },
];

/** Normalize voice mis-hearings: into, in to, in two */
export function normalizeIntuSpeech(s: string): string {
  return s
    .replace(/\binto\b/gi, "intu")
    .replace(/\bin\s+to\b/gi, "intu")
    .replace(/\bin\s+two\b/gi, "intu");
}

/** Extra cleanup for ElevenLabs / STT output (spacing, “news letter”, etc.). */
export function normalizeSttForIntu(s: string): string {
  let t = s.replace(/\s+/g, " ").trim();
  t = t.replace(/\bnews\s+letter\b/gi, "newsletter");
  return normalizeIntuSpeech(t);
}

/**
 * True when the user ended the voice command (Scribe often says “Over, now” or “Over. Now”).
 */
export function detectVoiceTerminator(text: string): boolean {
  const n = normalizeSttForIntu(text);
  return /\b(?:over\s*[,;.]?\s*now|over\s+and\s+out|ova\s+now|over\s+know)\b/i.test(n);
}

export function parseIntuCommand(raw: string): IntuParseResult {
  const text = normalizeSttForIntu(raw).trim();
  const lower = text.toLowerCase();

  // 1) Wake / sleep — "Intu On" alone activates; skip if same phrase also creates a newsletter
  if (/\bintu\s*off\b/.test(lower)) {
    return { kind: "deactivate" };
  }
  if (/\bintu\s*on\b/.test(lower) && !/\bnewsletter\b/.test(lower)) {
    return { kind: "activate" };
  }

  const allContacts =
    /\ball\s+contacts\b/.test(lower) ||
    /\bevery\s*contact\b/.test(lower) ||
    /\bsend\s+to\s+all\b/.test(lower) ||
    /\bto\s+everyone\b/.test(lower) ||
    /\ball\s+of\s+(?:them|my\s+contacts)\b/.test(lower) ||
    /\bsend\s+(?:it\s+)?to\s+all\b/.test(lower);

  const ccUser =
    /\bcc\b/.test(lower) ||
    /\bcarbon\s+copy\b/.test(lower) ||
    /\bkeep\s+me\s+(?:in\s+)?cc\b/.test(lower) ||
    /\bcopy\s+me\b/.test(lower);

  let businessSlug = "intellee_college";
  for (const { pattern, slug } of BUSINESS_HINTS) {
    if (pattern.test(text)) {
      businessSlug = slug;
      break;
    }
  }

  let topic = extractTopic(text, lower);
  if (!topic) topic = extractTopicFallback(lower);
  topic = topic.replace(/\s+/g, " ").trim();

  const wantsNewsletter =
    /\bnewsletter\b/.test(lower) ||
    /\bcreate\b.*\bnewsletter\b/.test(lower) ||
    /\bmake\b.*\bnewsletter\b/.test(lower) ||
    /\bsend\b.*\bnewsletter\b/.test(lower) ||
    /\bintu\s*,?\s*create\b/.test(lower);

  if (topic.length >= 2 && wantsNewsletter) {
    return {
      kind: "create_and_send",
      topic,
      businessSlug,
      allContacts:
        allContacts ||
        /\ball\b/.test(lower) ||
        /\bsend\b/.test(lower) ||
        /\bautomatically\b/.test(lower),
      ccUser,
    };
  }

  return { kind: "unknown", text: raw };
}

function extractTopic(text: string, lower: string): string {
  const patterns: RegExp[] = [
    // "Intu, create a newsletter on X ..." or "Intu create a newsletter on X"
    /\bintu\s*,?\s*create\s+(?:a\s+)?newsletter\s+on\s+(.+?)(?=\s+for\s+|\s+from\s+|\s+and\s+send|\s+from\s+intellee|\s+from\s+north|\s+automatically|\s+send\s|$)/i,
    /\bintu\s+create\s+(?:a\s+)?newsletter\s+on\s+(.+?)(?=\s+for\s+|\s+from\s+|\s+and\s+send|\s+from\s+intellee|\s+automatically|\s+send\s|$)/i,
    /newsletter\s+(?:on|about|for)\s+(.+?)(?=\s+from\s+|\s+and\s+send|\s+from\s+intellee|\s+from\s+north|\s+automatically|\s*$)/i,
    /(?:create|make)\s+(?:a\s+)?newsletter\s+(?:on|about|for)\s+(.+?)(?=\s+from\s+|\s+and\s+send|\s+from\s+intellee|\s+automatically|\s*$)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return cleanTopicFragment(m[1]);
  }
  return "";
}

function extractTopicFallback(lower: string): string {
  const m = lower.match(
    /(?:on|about|for)\s+the\s+topic\s+([a-z0-9\s,&'\-]{2,90}?)(?=\s+from\s+|\s+for\s+|\s+and\s+send|\s+intellee|\s+automatically|\s*$)/i
  );
  if (m?.[1]) return cleanTopicFragment(m[1]);
  const m2 = lower.match(
    /(?:on|about|for)\s+([a-z0-9\s,&'\-]{3,90}?)(?=\s+from\s+|\s+for\s+|\s+and\s+send|\s+intellee|\s+automatically|\s*$)/i
  );
  if (m2?.[1]) return cleanTopicFragment(m2[1]);
  return "";
}

function cleanTopicFragment(s: string): string {
  return s
    .replace(/\s+from\s+.*$/i, "")
    .replace(/\s+for\s+the\s+business.*$/i, "")
    .replace(/\s+and\s+send.*$/i, "")
    .replace(/\s+automatically.*$/i, "")
    .replace(/\s+business\s*$/i, "")
    .replace(/^the\s+/i, "")
    .trim();
}

/** End-of-command phrase; strip everything from this phrase (voice). */
export function stripVoiceTerminator(raw: string): string {
  let s = normalizeSttForIntu(raw);
  const patterns = [
    /\s*\bover\s*[,;.]?\s*now\b[\s\S]*$/i,
    /\s*\bover\s+and\s+out\b[\s\S]*$/i,
    /\s*\bova\s+now\b[\s\S]*$/i,
    /\s*\bover\s+know\b[\s\S]*$/i,
  ];
  for (const re of patterns) {
    s = s.replace(re, "");
  }
  return s.trim();
}

/** Remove leading wake word so parser sees the newsletter command only. */
export function stripLeadingIntuOn(raw: string): string {
  return normalizeSttForIntu(raw).replace(/^\s*intu\s*on\s*,?\s*/i, "").trim();
}
