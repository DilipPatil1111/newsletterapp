import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import Exa from "exa-js";

const searchSchema = z.object({
  query: z.string().min(1),
  role: z.string().optional(),
  geography: z.string().optional(),
});

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Exa API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const data = searchSchema.parse(body);

    let searchQuery = data.query;
    if (data.role) searchQuery += ` ${data.role}`;
    if (data.geography) searchQuery += ` ${data.geography}`;
    searchQuery += " email contact";

    const exa = new Exa(apiKey);

    const results = await exa.searchAndContents(searchQuery, {
      type: "auto",
      numResults: 20,
      highlights: {
        maxCharacters: 4000,
      },
    });

    const contacts: {
      email: string;
      firstName?: string;
      role?: string;
      geography?: string;
      projectTraining?: string;
    }[] = [];

    const seenEmails = new Set<string>();

    for (const result of results.results) {
      const textParts = [
        result.title,
        result.url,
        ...(result.highlights || []),
      ].filter(Boolean);
      const text = textParts.join(" ");
      const foundEmails = text.match(EMAIL_REGEX) || [];

      for (const email of foundEmails) {
        const normalized = email.toLowerCase();
        if (
          !seenEmails.has(normalized) &&
          !normalized.endsWith("@example.com") &&
          !normalized.endsWith("@sentry.io")
        ) {
          seenEmails.add(normalized);
          contacts.push({
            email: normalized,
            role: data.role || undefined,
            geography: data.geography || undefined,
            projectTraining: data.query,
          });
        }
      }
    }

    return NextResponse.json({
      contacts,
      total: contacts.length,
      sourcesSearched: results.results.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Exa search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
