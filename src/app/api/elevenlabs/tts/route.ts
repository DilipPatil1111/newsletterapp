import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  text: z.string().min(1).max(2500),
  /** Optional override; defaults to ELEVENLABS_VOICE_ID */
  voiceId: z.string().min(5).max(64).optional(),
  /** See ElevenLabs docs for model IDs */
  modelId: z.string().optional(),
});

/**
 * Server-side proxy to ElevenLabs TTS — keeps your API key off the client.
 * POST JSON: { text, voiceId?, modelId? } → audio/mpeg stream
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured" },
      { status: 503 }
    );
  }

  try {
    const json = await req.json();
    const data = bodySchema.parse(json);

    const voiceId =
      data.voiceId || process.env.ELEVENLABS_VOICE_ID?.trim() || "21m00Tcm4TlvDq8ikWAM";
    const modelId = data.modelId || "eleven_turbo_v2_5";

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: data.text,
          model_id: modelId,
        }),
      }
    );

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("ElevenLabs TTS error:", upstream.status, errText);
      return NextResponse.json(
        { error: "ElevenLabs request failed", status: upstream.status },
        { status: 502 }
      );
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("ElevenLabs TTS route error:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
