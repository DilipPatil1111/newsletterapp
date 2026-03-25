let currentElevenLabsAudio: HTMLAudioElement | null = null;

/** Stop any in-progress ElevenLabs playback from this module (e.g. before mic opens). */
export function stopElevenLabsPlayback(): void {
  if (currentElevenLabsAudio) {
    try {
      currentElevenLabsAudio.pause();
      currentElevenLabsAudio.src = "";
    } catch {
      /* noop */
    }
    currentElevenLabsAudio = null;
  }
}

/**
 * Play text via your server ElevenLabs proxy (API key never exposed).
 * Falls back to no-op if fetch fails (caller can use speechSynthesis instead).
 */
export async function playElevenLabsTts(
  text: string,
  onEnd?: () => void
): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed || typeof window === "undefined") {
    onEnd?.();
    return false;
  }

  try {
    const res = await fetch("/api/elevenlabs/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    });
    if (!res.ok) {
      return false;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentElevenLabsAudio = audio;
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (currentElevenLabsAudio === audio) currentElevenLabsAudio = null;
        onEnd?.();
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (currentElevenLabsAudio === audio) currentElevenLabsAudio = null;
        reject(new Error("Audio playback failed"));
      };
      void audio.play().catch((e) => {
        if (currentElevenLabsAudio === audio) currentElevenLabsAudio = null;
        reject(e);
      });
    });
    return true;
  } catch {
    return false;
  }
}
