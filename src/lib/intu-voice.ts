import { playElevenLabsTts, stopElevenLabsPlayback } from "@/lib/play-elevenlabs-tts";

/** Stop ElevenLabs audio + browser TTS (e.g. before listening or on Intu Off). */
export function stopIntuVoice(): void {
  if (typeof window === "undefined") return;
  stopElevenLabsPlayback();
  window.speechSynthesis?.cancel();
}

/**
 * Speak with ElevenLabs (server proxy) when available, else browser speechSynthesis.
 */
export async function speakIntu(text: string, onEnd?: () => void): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    onEnd?.();
    return;
  }

  if (typeof window === "undefined") {
    onEnd?.();
    return;
  }

  const ok = await playElevenLabsTts(trimmed, onEnd);
  if (ok) return;

  if (!window.speechSynthesis) {
    onEnd?.();
    return;
  }
  if (window.speechSynthesis) {
    stopElevenLabsPlayback();
    window.speechSynthesis.cancel();
  }
  const u = new SpeechSynthesisUtterance(trimmed);
  u.rate = 0.92;
  u.pitch = 1;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

/**
 * Transcribe recorded audio via server ElevenLabs STT proxy.
 */
export async function transcribeAudioBlob(
  blob: Blob,
  opts?: { filename?: string; languageCode?: string }
): Promise<string> {
  const form = new FormData();
  form.append(
    "file",
    blob,
    opts?.filename ?? (blob.type.includes("webm") ? "clip.webm" : "clip.wav")
  );
  if (opts?.languageCode) {
    form.append("language_code", opts.languageCode);
  }

  const res = await fetch("/api/elevenlabs/stt", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === "string" ? err.error : "Speech-to-text request failed"
    );
  }

  const data = (await res.json()) as { text?: string };
  return typeof data.text === "string" ? data.text.trim() : "";
}
