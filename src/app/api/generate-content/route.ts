import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import Exa from "exa-js";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { resolveBusinessBySlug } from "@/lib/businesses-service";

const generateSchema = z.object({
  courseName: z.string().min(1),
  collegeContext: z.string().optional(),
  businessSlug: z.string().optional(),
});

type ExaResult = {
  title?: string | null;
  url?: string | null;
  highlights?: string[] | null;
  text?: string | null;
};

type SourceLink = { title: string; url: string };

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exaKey = process.env.EXA_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  try {
    const body = await req.json();
    const { courseName, collegeContext, businessSlug } = generateSchema.parse(body);
    const college = collegeContext || "Intellee College";
    const business = businessSlug
      ? await resolveBusinessBySlug(businessSlug)
      : undefined;
    const promptContext = business?.generatePromptContext ?? "education, courses, career training, placement";

    let trendData: ExaResult[] = [];
    let salaryData: ExaResult[] = [];
    let demandData: ExaResult[] = [];
    const sourceLinks: SourceLink[] = [];

    if (exaKey) {
      const exa = new Exa(exaKey);

      const [trendsRes, salaryRes, demandRes] = await Promise.allSettled([
        exa.searchAndContents(
          `${courseName} ${promptContext} trends importance future scope 2025 2026`,
          { type: "auto", numResults: 5, highlights: { maxCharacters: 2000 } }
        ),
        exa.searchAndContents(
          `${courseName} ${promptContext} average salary compensation career growth`,
          { type: "auto", numResults: 5, highlights: { maxCharacters: 2000 } }
        ),
        exa.searchAndContents(
          `${courseName} ${promptContext} job demand hiring opportunities`,
          { type: "auto", numResults: 5, highlights: { maxCharacters: 2000 } }
        ),
      ]);

      if (trendsRes.status === "fulfilled") {
        trendData = trendsRes.value.results;
        collectSources(trendData, sourceLinks);
      }
      if (salaryRes.status === "fulfilled") {
        salaryData = salaryRes.value.results;
        collectSources(salaryData, sourceLinks);
      }
      if (demandRes.status === "fulfilled") {
        demandData = demandRes.value.results;
        collectSources(demandData, sourceLinks);
      }
    }

    const uniqueSources = deduplicateSources(sourceLinks).slice(0, 3);

    // If OpenAI is available, use LLM to generate polished content from research
    if (openaiKey) {
      return await generateWithLLM({
        courseName,
        college,
        promptContext,
        trendData,
        salaryData,
        demandData,
        uniqueSources,
      });
    }

    // Fallback: assemble content from snippets (original behavior)
    return generateFromSnippets({
      courseName,
      college,
      promptContext,
      trendData,
      salaryData,
      demandData,
      uniqueSources,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Content generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}

async function generateWithLLM(opts: {
  courseName: string;
  college: string;
  promptContext?: string;
  trendData: ExaResult[];
  salaryData: ExaResult[];
  demandData: ExaResult[];
  uniqueSources: SourceLink[];
}) {
  const researchSummary = [
    "TRENDS RESEARCH:",
    ...opts.trendData.flatMap((r) => r.highlights || []).slice(0, 5),
    "",
    "SALARY RESEARCH:",
    ...opts.salaryData.flatMap((r) => r.highlights || []).slice(0, 5),
    "",
    "DEMAND RESEARCH:",
    ...opts.demandData.flatMap((r) => r.highlights || []).slice(0, 5),
  ].join("\n");

  const prompt = `You are writing a newsletter for ${opts.college} about "${opts.courseName}". ${opts.promptContext ? `Context: ${opts.promptContext}.` : ""}

Based on the following research data, create a compelling newsletter email.

${researchSummary}

Generate the newsletter in this exact format:

SUBJECT: [A compelling subject line under 60 chars]
PREVIEW: [A preview text under 100 chars]
CTA_TEXT: [CTA button text]
CTA_URL: https://intellee.com/courses

---CONTENT---
Dear {{firstName}},

[Opening paragraph about why this course matters now - 2-3 sentences]

WHAT'S HAPPENING IN ${opts.courseName.toUpperCase()}
[2-3 bullet-style insights from the trends research]

SALARY & CAREER OUTLOOK
[2-3 specific data points about salary and growth]

WHY THE DEMAND IS REAL
[2-3 points about job demand and hiring trends]

WHAT YOU GET AT ${opts.college.toUpperCase()}
[Brief description of program benefits - certification, placement, flexible learning]

${opts.uniqueSources.length > 0 ? `LEARN MORE\n${opts.uniqueSources.map((s) => `${s.title}: ${s.url}`).join("\n")}` : ""}

Rules:
- Be specific with numbers and data from the research
- Professional but approachable tone
- Keep paragraphs short (2-3 sentences)
- Use {{firstName}} for personalization
- Each section body should be plain text, not markdown`;

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
  });

  const subjectMatch = text.match(/SUBJECT:\s*(.+)/);
  const previewMatch = text.match(/PREVIEW:\s*(.+)/);
  const ctaTextMatch = text.match(/CTA_TEXT:\s*(.+)/);
  const contentMatch = text.split("---CONTENT---");
  const fullContent = contentMatch.length > 1
    ? contentMatch[1].trim()
    : text;

  return NextResponse.json({
    subjectLine: subjectMatch?.[1]?.trim() || `Your next career move: ${opts.courseName}`,
    previewText: previewMatch?.[1]?.trim() || `Discover why ${opts.courseName} professionals are in high demand.`,
    fullContent,
    ctaText: ctaTextMatch?.[1]?.trim() || `Explore ${opts.courseName} at ${opts.college}`,
    ctaUrl: "https://intellee.com/courses",
    courseName: opts.courseName,
    sourceLinks: opts.uniqueSources,
    generatedAt: new Date().toISOString(),
    sourceData: {
      trendsFound: opts.trendData.length,
      salaryFound: opts.salaryData.length,
      demandFound: opts.demandData.length,
      sourcesCollected: opts.uniqueSources.length,
    },
  });
}

function generateFromSnippets(opts: {
  courseName: string;
  college: string;
  promptContext?: string;
  trendData: ExaResult[];
  salaryData: ExaResult[];
  demandData: ExaResult[];
  uniqueSources: SourceLink[];
}) {
  const trendInsights = extractBestInsight(opts.trendData);
  const salaryInsight = extractBestInsight(opts.salaryData);
  const demandInsight = extractBestInsight(opts.demandData);

  const subjectLine = `Your next career move: ${opts.courseName} — ${opts.college}`;
  const previewText = `See why ${opts.courseName} professionals are in high demand right now.`;

  const trendText = trendInsights ||
    `${opts.courseName} is transforming how industries operate. Organizations across technology, finance, and healthcare are rapidly adopting these skills, making it one of the fastest-growing career fields today.`;

  const salaryText = salaryInsight ||
    `Professionals skilled in ${opts.courseName} earn competitive salaries — with entry-level roles starting strong and experienced practitioners commanding premium compensation. The trend is consistently upward.`;

  const demandText = demandInsight ||
    `Job postings requiring ${opts.courseName} skills have surged year-over-year. Top employers from Fortune 500 companies to fast-growing startups are actively hiring.`;

  const fullContent = [
    `Dear {{firstName}},`,
    ``,
    `${opts.courseName} is one of the most in-demand skills in today's job market — and ${opts.college} can help you master it.`,
    ``,
    `WHAT'S HAPPENING IN ${opts.courseName.toUpperCase()}`,
    trendText,
    ``,
    `SALARY & CAREER OUTLOOK`,
    salaryText,
    ``,
    `WHY THE DEMAND IS REAL`,
    demandText,
    ``,
    `WHAT YOU GET AT ${opts.college.toUpperCase()}`,
    `Industry-expert instructors with hands-on project experience. Flexible online and in-person learning options. Recognized certification and dedicated placement support with 100+ hiring partners.`,
    ``,
    opts.uniqueSources.length > 0
      ? `LEARN MORE\n${opts.uniqueSources.map((s) => `${s.title}: ${s.url}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n");

  return NextResponse.json({
    subjectLine,
    previewText,
    fullContent,
    ctaText: `Explore ${opts.courseName} at ${opts.college}`,
    ctaUrl: "https://intellee.com/courses",
    courseName: opts.courseName,
    sourceLinks: opts.uniqueSources,
    generatedAt: new Date().toISOString(),
    sourceData: {
      trendsFound: opts.trendData.length,
      salaryFound: opts.salaryData.length,
      demandFound: opts.demandData.length,
      sourcesCollected: opts.uniqueSources.length,
    },
  });
}

function collectSources(results: ExaResult[], sources: SourceLink[]) {
  for (const r of results) {
    if (r.url && r.title) {
      sources.push({ title: r.title.slice(0, 80), url: r.url });
    }
  }
}

function deduplicateSources(sources: SourceLink[]): SourceLink[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const domain = s.url.replace(/https?:\/\//, "").split("/")[0];
    if (seen.has(domain)) return false;
    seen.add(domain);
    return true;
  });
}

function extractBestInsight(results: ExaResult[]): string | null {
  const all = results
    .flatMap((r) => r.highlights || [])
    .map((h) => h.replace(/\s+/g, " ").trim())
    .filter((h) => h.length > 60 && h.length < 400)
    .filter((h) => {
      const lower = h.toLowerCase();
      return (
        !lower.includes("cookie") &&
        !lower.includes("subscribe") &&
        !lower.includes("privacy policy") &&
        !lower.includes("sign up") &&
        !lower.includes("click here") &&
        !lower.includes("terms of")
      );
    });

  if (all.length === 0) return null;

  const best = all.sort((a, b) => b.length - a.length)[0];
  return best.length > 350 ? best.slice(0, 347) + "..." : best;
}
