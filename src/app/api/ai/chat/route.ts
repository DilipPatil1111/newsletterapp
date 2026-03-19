import { auth } from "@clerk/nextjs/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const SYSTEM_PROMPT = `You are an expert email marketing assistant for a newsletter platform. You help users create, edit, and improve their email newsletter content.

Your capabilities:
1. REWRITE content to improve clarity, engagement, or tone
2. SUGGEST improvements to subject lines, CTAs, and body copy
3. CHECK brand compliance against provided brand guidelines
4. GENERATE new content sections based on descriptions
5. TRANSLATE content to other languages
6. SHORTEN or EXPAND content as needed

When modifying content, return the FULL modified text (not just the changes).

Rules:
- Keep email best practices in mind (concise, scannable, mobile-friendly)
- Maintain professional but approachable tone unless instructed otherwise
- Avoid spam trigger words
- Keep paragraphs short (2-3 sentences max)
- Use clear CTAs
- If brand guidelines are provided, ensure all suggestions comply

When the user asks you to modify their newsletter content, respond with the modified content first, then a brief explanation of what you changed and why.`;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, emailContent, brandGuidelines } = await req.json();

  const contextMessage = [
    emailContent ? `Current email content:\n---\n${emailContent}\n---` : "",
    brandGuidelines ? `Brand guidelines:\n---\n${brandGuidelines}\n---` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = contextMessage
    ? `${SYSTEM_PROMPT}\n\n${contextMessage}`
    : SYSTEM_PROMPT;

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages,
  });

  return result.toUIMessageStreamResponse();
}
