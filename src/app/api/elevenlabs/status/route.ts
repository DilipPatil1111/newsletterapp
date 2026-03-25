import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Whether ElevenLabs features are available (same server key for TTS + STT).
 * Does not expose the key.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  return NextResponse.json({
    tts: apiKey,
    stt: apiKey,
  });
}
