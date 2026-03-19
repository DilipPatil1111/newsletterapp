import { auth } from "@clerk/nextjs/server";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content, currentSubject, brandGuidelines } = await req.json();

    const prompt = [
      `Generate 5 email subject line variations for a newsletter.`,
      currentSubject ? `Current subject line: "${currentSubject}"` : "",
      content ? `Newsletter content summary: ${content.substring(0, 500)}` : "",
      brandGuidelines ? `Brand guidelines: ${brandGuidelines}` : "",
      `Requirements:
- Each subject line should be under 60 characters
- Use different approaches: curiosity, urgency, benefit-driven, personalized, question-based
- Avoid spam trigger words
- Include one with {{firstName}} personalization
- Rate each on a scale of 1-10 for predicted open rate`,
    ]
      .filter(Boolean)
      .join("\n");

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      prompt,
      schema: z.object({
        subjectLines: z.array(
          z.object({
            text: z.string(),
            approach: z.string(),
            predictedScore: z.number().min(1).max(10),
          })
        ),
      }),
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("Subject line generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate subject lines" },
      { status: 500 }
    );
  }
}
