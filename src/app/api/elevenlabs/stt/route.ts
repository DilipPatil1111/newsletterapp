import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ELEVEN_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";

/** Default Scribe model; override via form field `model_id` if needed. */
const DEFAULT_MODEL_ID = "scribe_v2";

function extractTextFromSttResponse(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const o = data as Record<string, unknown>;

  if (typeof o.text === "string") {
    return o.text.trim();
  }

  const transcripts = o.transcripts;
  if (Array.isArray(transcripts)) {
    const parts = transcripts
      .map((t) => {
        if (t && typeof t === "object" && typeof (t as { text?: string }).text === "string") {
          return (t as { text: string }).text.trim();
        }
        return "";
      })
      .filter(Boolean);
    return parts.join(" ").trim();
  }

  return "";
}

/**
 * Server-side proxy to ElevenLabs Speech-to-Text (Scribe).
 * POST multipart/form-data: `file` (required), optional `language_code`, `model_id`.
 * Returns JSON: { text: string }
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
    const incoming = await req.formData();
    const file = incoming.get("file");

    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json(
        { error: "Missing or empty `file` field (multipart/form-data)" },
        { status: 400 }
      );
    }

    const modelRaw = incoming.get("model_id");
    const modelId =
      typeof modelRaw === "string" && modelRaw.trim().length > 0
        ? modelRaw.trim()
        : DEFAULT_MODEL_ID;

    const langRaw = incoming.get("language_code");
    const languageCode =
      typeof langRaw === "string" && langRaw.trim().length > 0 ? langRaw.trim() : undefined;

    const filename =
      file instanceof File && file.name?.length
        ? file.name
        : "recording.webm";

    const upstreamForm = new FormData();
    upstreamForm.append("model_id", modelId);
    upstreamForm.append("file", file, filename);
    if (languageCode) {
      upstreamForm.append("language_code", languageCode);
    }
    /* Fewer filler tags for command-style speech */
    upstreamForm.append("tag_audio_events", "false");

    const upstream = await fetch(ELEVEN_STT_URL, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        Accept: "application/json",
      },
      body: upstreamForm,
    });

    const rawText = await upstream.text();
    if (!upstream.ok) {
      console.error("ElevenLabs STT error:", upstream.status, rawText);
      return NextResponse.json(
        { error: "ElevenLabs speech-to-text failed", status: upstream.status },
        { status: 502 }
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(rawText) as unknown;
    } catch {
      return NextResponse.json({ error: "Invalid STT response" }, { status: 502 });
    }

    const text = extractTextFromSttResponse(data);
    return NextResponse.json({ text: text || "" });
  } catch (error) {
    console.error("ElevenLabs STT route error:", error);
    return NextResponse.json({ error: "STT failed" }, { status: 500 });
  }
}
