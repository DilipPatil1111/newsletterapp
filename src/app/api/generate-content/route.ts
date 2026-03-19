import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import Exa from "exa-js";

const generateSchema = z.object({
  courseName: z.string().min(1),
  collegeContext: z.string().optional(),
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

  const apiKey = process.env.EXA_API_KEY;

  try {
    const body = await req.json();
    const { courseName, collegeContext } = generateSchema.parse(body);
    const college = collegeContext || "Intellee College";

    let trendData: ExaResult[] = [];
    let salaryData: ExaResult[] = [];
    let demandData: ExaResult[] = [];
    const sourceLinks: SourceLink[] = [];

    if (apiKey) {
      const exa = new Exa(apiKey);

      const [trendsRes, salaryRes, demandRes] = await Promise.allSettled([
        exa.searchAndContents(
          `${courseName} industry trends importance future scope 2025 2026`,
          { type: "auto", numResults: 5, highlights: { maxCharacters: 2000 } }
        ),
        exa.searchAndContents(
          `${courseName} average salary compensation career growth`,
          { type: "auto", numResults: 5, highlights: { maxCharacters: 2000 } }
        ),
        exa.searchAndContents(
          `${courseName} job demand hiring career opportunities`,
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

    const trendInsights = extractBestInsight(trendData);
    const salaryInsight = extractBestInsight(salaryData);
    const demandInsight = extractBestInsight(demandData);

    const subjectLine = `Your next career move: ${courseName} — ${college}`;
    const previewText = `See why ${courseName} professionals are in high demand right now.`;

    const trendText = trendInsights ||
      `${courseName} is transforming how industries operate. Organizations across technology, finance, and healthcare are rapidly adopting these skills, making it one of the fastest-growing career fields today.`;

    const salaryText = salaryInsight ||
      `Professionals skilled in ${courseName} earn competitive salaries — with entry-level roles starting at $60,000+ and experienced practitioners commanding $120,000+. The compensation trend is consistently upward.`;

    const demandText = demandInsight ||
      `Job postings requiring ${courseName} skills have surged year-over-year. Top employers from Fortune 500 companies to fast-growing startups are actively hiring, with many graduates receiving offers within weeks of certification.`;

    const uniqueSources = deduplicateSources(sourceLinks).slice(0, 2);

    const fullContent = [
      `Dear {{firstName}},`,
      ``,
      `${courseName} is one of the most in-demand skills in today's job market — and ${college} can help you master it.`,
      ``,
      `WHAT'S HAPPENING IN ${courseName.toUpperCase()}`,
      `${trendText}`,
      ``,
      `SALARY & CAREER OUTLOOK`,
      `${salaryText}`,
      ``,
      `WHY THE DEMAND IS REAL`,
      `${demandText}`,
      ``,
      `WHAT YOU GET AT ${college.toUpperCase()}`,
      `Industry-expert instructors with hands-on project experience. Flexible online and in-person learning options. Recognized certification and dedicated placement support with 100+ hiring partners.`,
      ``,
      uniqueSources.length > 0
        ? `LEARN MORE\n${uniqueSources.map((s) => `${s.title}: ${s.url}`).join("\n")}`
        : "",
    ].filter(Boolean).join("\n");

    return NextResponse.json({
      subjectLine,
      previewText,
      fullContent,
      ctaText: `Explore ${courseName} at ${college}`,
      ctaUrl: "https://intellee.com/courses",
      courseName,
      sourceLinks: uniqueSources,
      generatedAt: new Date().toISOString(),
      sourceData: {
        trendsFound: trendData.length,
        salaryFound: salaryData.length,
        demandFound: demandData.length,
        sourcesCollected: uniqueSources.length,
      },
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
