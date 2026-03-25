"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  parseIntuCommand,
  stripLeadingIntuOn,
  stripVoiceTerminator,
  normalizeSttForIntu,
  detectVoiceTerminator,
} from "@/lib/intu-parser";
import { toast } from "sonner";
import { Loader2, Mic, MicOff, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { speakIntu, stopIntuVoice, transcribeAudioBlob } from "@/lib/intu-voice";

const BOSS_LINE = "Yes Boss, what can I do for you?";
const SUCCESS_LINE = "Newsletter sent successfully";

/** ElevenLabs: send audio this often so “Over Now” is detected sooner (ms). */
const ELEVENLABS_TIMESLICE_MS = 2500;

type RecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function IntuAssistant() {
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastText, setLastText] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [speechOk, setSpeechOk] = useState(false);
  const [manual, setManual] = useState("");
  const [micReady, setMicReady] = useState(false);
  /** Server has ELEVENLABS_API_KEY — use Scribe STT + optional ElevenLabs TTS. */
  const [elevenLabsStt, setElevenLabsStt] = useState(false);

  const activeRef = useRef(false);
  const keepListeningRef = useRef(false);
  const recognitionRef = useRef<InstanceType<RecognitionCtor> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startListeningPipelineRef = useRef<(() => Promise<void>) | null>(null);
  /** Accumulates speech while Intu is active until you say “Over Now”. */
  const voiceBufferRef = useRef("");
  /** Bump when ending a command or starting a new recorder — drops stale ElevenLabs chunk jobs. */
  const voiceSessionRef = useRef(0);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/elevenlabs/status");
        if (!r.ok) return;
        const d = (await r.json()) as { stt?: boolean };
        if (!cancelled && d.stt) setElevenLabsStt(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSpeechOk(Boolean(getRecognitionCtor()) || elevenLabsStt);
  }, [elevenLabsStt]);

  const stopRecognitionInstance = useCallback(() => {
    try {
      recognitionRef.current?.abort();
    } catch {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
    }
    recognitionRef.current = null;
  }, []);

  const stopMediaCapture = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      /* noop */
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, []);

  const runAutomate = useCallback(
    async (topic: string, businessSlug: string, ccUser: boolean): Promise<boolean> => {
      setBusy(true);
      try {
        const res = await fetch("/api/intu/automate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            businessSlug,
            ccUser,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Automation failed");
        }
        toast.success(
          `Sent “${topic}” to ${data.sent ?? 0} contact(s)${data.ccApplied ? " (you’re CC’d)" : ""}.`
        );
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Intu could not finish");
        return false;
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const processText = useCallback(
    async (raw: string, opts?: { skipActiveGate?: boolean }) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      setLastText(trimmed);

      const parsed = parseIntuCommand(trimmed);

      if (parsed.kind === "activate") {
        stopRecognitionInstance();
        stopMediaCapture();
        setListening(false);
        voiceBufferRef.current = "";
        activeRef.current = true;
        setActive(true);
        keepListeningRef.current = true;
        /* Stop mic before TTS so “Yes Boss” isn’t transcribed. */
        void speakIntu(BOSS_LINE, () => {
          startListeningPipelineRef.current?.();
        });
        toast.success("Intu is listening — say your command, then “Over Now”.");
        return;
      }
      if (parsed.kind === "deactivate") {
        voiceBufferRef.current = "";
        activeRef.current = false;
        setActive(false);
        keepListeningRef.current = false;
        stopRecognitionInstance();
        stopMediaCapture();
        setListening(false);
        stopIntuVoice();
        toast.message("Intu is off");
        return;
      }

      /* Text box / manual: full command in one go (no “Over Now” required). */
      if (parsed.kind === "create_and_send") {
        if (!opts?.skipActiveGate) {
          toast.info(
            'Voice: say your newsletter request, then end with “Over Now”. Or use the text box below.'
          );
          return;
        }
        if (parsed.topic.length < 2) {
          toast.error("Include the topic, e.g. newsletter on Project Management from Intellee College.");
          return;
        }
        keepListeningRef.current = false;
        stopRecognitionInstance();
        stopMediaCapture();
        setListening(false);
        stopIntuVoice();
        const ok = await runAutomate(parsed.topic, parsed.businessSlug, parsed.ccUser);
        if (ok) {
          void speakIntu(SUCCESS_LINE);
        }
        return;
      }

      toast.info(
        'Voice: “Intu On” → your command → “Over Now”. Text box: paste the full command and Run.'
      );
    },
    [runAutomate, stopRecognitionInstance, stopMediaCapture]
  );

  const processBufferedVoiceCommand = useCallback(
    async (raw: string) => {
      stopMediaCapture();
      stopRecognitionInstance();
      setListening(false);

      const cmd = stripLeadingIntuOn(stripVoiceTerminator(raw)).trim();
      if (!cmd || cmd.length < 4) {
        toast.error('Say your newsletter request before “Over Now”.');
        return;
      }

      const parsed = parseIntuCommand(cmd);

      if (parsed.kind === "deactivate") {
        await processText(cmd, undefined);
        return;
      }

      if (parsed.kind === "activate") {
        toast.info("Already on. Describe the newsletter, then say Over Now.");
        return;
      }

      if (parsed.kind !== "create_and_send") {
        toast.error(
          'Include “newsletter” and your topic (e.g. from Intellee College), then say “Over Now”.'
        );
        return;
      }

      if (parsed.topic.length < 2) {
        toast.error("I couldn’t find the topic. Try: newsletter on [your topic] from Intellee College.");
        return;
      }

      keepListeningRef.current = false;
      stopIntuVoice();

      const ok = await runAutomate(parsed.topic, parsed.businessSlug, parsed.ccUser);

      if (ok && activeRef.current) {
        void speakIntu(SUCCESS_LINE, () => {
          keepListeningRef.current = true;
          startListeningPipelineRef.current?.();
        });
      } else if (activeRef.current) {
        keepListeningRef.current = true;
        startListeningPipelineRef.current?.();
      }
    },
    [runAutomate, stopRecognitionInstance, processText, stopMediaCapture]
  );

  const handleVoiceSegment = useCallback(
    (segment: string) => {
      const seg = segment.trim();
      if (!seg) return;

      const merged = normalizeSttForIntu(seg);

      if (!activeRef.current) {
        const quick = parseIntuCommand(merged);
        if (quick.kind === "activate" || quick.kind === "deactivate") {
          void processText(merged, undefined);
          return;
        }
        toast.info('Tap “Intu On” or say “Intu On” first.');
        return;
      }

      const next = voiceBufferRef.current
        ? `${voiceBufferRef.current} ${merged}`
        : merged;
      voiceBufferRef.current = next;
      setLiveTranscript(next);

      const low = next.toLowerCase();

      if (/\bintu\s*off\b/.test(low)) {
        voiceBufferRef.current = "";
        setLiveTranscript("");
        void processText(next, undefined);
        return;
      }

      if (detectVoiceTerminator(next)) {
        /* Invalidate pending ElevenLabs transcription jobs before stopping the mic. */
        voiceSessionRef.current += 1;
        keepListeningRef.current = false;
        const toParse = stripVoiceTerminator(next);
        setLastText(toParse);
        voiceBufferRef.current = "";
        setLiveTranscript("");
        stopMediaCapture();
        setListening(false);
        void processBufferedVoiceCommand(toParse);
      }
    },
    [processText, processBufferedVoiceCommand, stopMediaCapture]
  );

  /**
   * ElevenLabs Scribe: record ~5s chunks, transcribe on server, feed same buffer as Web Speech.
   */
  const startElevenLabsListening = useCallback(async () => {
    try {
      stopMediaCapture();
      voiceSessionRef.current += 1;
      const session = voiceSessionRef.current;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicReady(true);
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      let chain = Promise.resolve();

      recorder.ondataavailable = (e) => {
        if (e.data.size < 400) return;
        chain = chain.then(async () => {
          if (session !== voiceSessionRef.current) return;
          try {
            const text = await transcribeAudioBlob(e.data, {
              filename: e.data.type.includes("webm") ? "chunk.webm" : "chunk.wav",
              languageCode: "en",
            });
            if (session !== voiceSessionRef.current) return;
            if (text) {
              handleVoiceSegment(text);
            }
          } catch (err) {
            console.warn("Intu ElevenLabs STT:", err);
          }
        });
      };

      recorder.onerror = (ev) => {
        console.warn("MediaRecorder error:", ev);
      };

      recorder.onstop = () => {
        setListening(false);
        mediaRecorderRef.current = null;
        stream.getTracks().forEach((t) => t.stop());
        if (mediaStreamRef.current === stream) {
          mediaStreamRef.current = null;
        }
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        if (keepListeningRef.current && activeRef.current) {
          restartTimerRef.current = setTimeout(() => {
            startListeningPipelineRef.current?.();
          }, 200);
        }
      };

      keepListeningRef.current = true;
      stopRecognitionInstance();
      recorder.start(ELEVENLABS_TIMESLICE_MS);
      setListening(true);
    } catch {
      toast.error("Microphone permission is required for voice. Allow access in your browser settings.");
    }
  }, [handleVoiceSegment, stopRecognitionInstance, stopMediaCapture]);

  /** Request mic + Web Speech API, or ElevenLabs STT when configured. */
  const startListeningPipeline = useCallback(async () => {
    if (elevenLabsStt) {
      await startElevenLabsListening();
      return;
    }

    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      toast.error("Voice recognition isn’t available in this browser.");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicReady(true);
    } catch {
      toast.error("Microphone permission is required for voice. Allow access in your browser settings.");
      return;
    }

    keepListeningRef.current = true;
    stopRecognitionInstance();

    const r = new Ctor();
    recognitionRef.current = r;
    r.continuous = true;
    /** Final-only segments reduce split words (“Intu” / “on”) across separate events. */
    r.interimResults = false;
    r.lang = "en-US";

    r.onresult = (ev) => {
      const e = ev as unknown as { resultIndex: number; results: SpeechRecognitionResultList };
      let line = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        line += e.results[i][0].transcript;
      }
      const t = line.trim();
      if (t) {
        void handleVoiceSegment(t);
      }
    };

    r.onerror = (ev) => {
      const err = ev as unknown as { error?: string };
      if (err.error === "not-allowed") {
        toast.error("Microphone blocked. Allow the mic for this site.");
      } else if (err.error === "no-speech") {
        /* ignore */
      } else if (err.error !== "aborted") {
        console.warn("Intu speech error:", err.error);
      }
    };

    r.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (keepListeningRef.current && activeRef.current) {
        restartTimerRef.current = setTimeout(() => {
          startListeningPipelineRef.current?.();
        }, 200);
      }
    };

    try {
      r.start();
      setListening(true);
    } catch (e) {
      console.warn("Intu start failed:", e);
      setListening(false);
      if (keepListeningRef.current && activeRef.current) {
        restartTimerRef.current = setTimeout(() => {
          startListeningPipelineRef.current?.();
        }, 400);
      }
    }
  }, [elevenLabsStt, startElevenLabsListening, handleVoiceSegment, stopRecognitionInstance]);

  startListeningPipelineRef.current = startListeningPipeline;

  useEffect(() => {
    return () => {
      keepListeningRef.current = false;
      stopMediaCapture();
      stopRecognitionInstance();
      stopIntuVoice();
    };
  }, [stopRecognitionInstance, stopMediaCapture]);

  function stopListening() {
    keepListeningRef.current = false;
    voiceSessionRef.current += 1;
    stopMediaCapture();
    stopRecognitionInstance();
    setListening(false);
    setLiveTranscript("");
    voiceBufferRef.current = "";
  }

  async function onIntuOnClick() {
    stopRecognitionInstance();
    setListening(false);
    voiceBufferRef.current = "";
    activeRef.current = true;
    setActive(true);
    keepListeningRef.current = true;
    void speakIntu(BOSS_LINE, () => {
      startListeningPipelineRef.current?.();
    });
    toast.success("Intu is on");
  }

  async function onVoiceToggle() {
    if (listening) {
      stopListening();
      return;
    }
    if (!getRecognitionCtor() && !elevenLabsStt) {
      toast.error("Voice isn’t supported in this browser.");
      return;
    }
    activeRef.current = true;
    setActive(true);
    keepListeningRef.current = true;
    await startListeningPipeline();
  }

  async function runManual() {
    await processText(manual, { skipActiveGate: true });
    setManual("");
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[100] flex max-w-[min(100vw-2rem,22rem)] flex-col items-end gap-2",
        "pointer-events-none [&>*]:pointer-events-auto"
      )}
    >
      {!open && (
        <Button
          type="button"
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setOpen(true)}
          aria-label="Open Intu assistant"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/intu-assistant.svg" alt="" width={40} height={40} className="rounded-full" />
        </Button>
      )}

      {open && (
        <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
          <div className="flex items-start gap-2 bg-gradient-to-br from-indigo-600/10 via-violet-600/10 to-background p-3">
            <div className="relative h-16 w-16 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/intu-assistant.svg"
                alt="Intu assistant"
                width={64}
                height={64}
                className="drop-shadow-md"
              />
              {active && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center justify-between gap-1">
                <p className="font-semibold leading-tight text-foreground">Intu</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setOpen(false)}
                  aria-label="Minimize Intu"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Say <strong>“Intu On”</strong> (I’ll say “Yes Boss…”), then describe the newsletter and end
                with <strong>“Over Now”</strong> to send. Or use the text box (no “Over Now” needed).
                {elevenLabsStt ? (
                  <>
                    {" "}
                    Voice uses <strong>ElevenLabs Scribe</strong> when your server has{" "}
                    <code className="rounded bg-muted px-1">ELEVENLABS_API_KEY</code>.
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t bg-card p-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className="gap-1"
                disabled={busy}
                onClick={() => void onIntuOnClick()}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Intu On
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  activeRef.current = false;
                  setActive(false);
                  keepListeningRef.current = false;
                  stopListening();
                  stopIntuVoice();
                  toast.message("Intu is off");
                }}
              >
                Intu Off
              </Button>
              <Button
                type="button"
                size="sm"
                variant={listening ? "secondary" : "outline"}
                className="gap-1"
                disabled={busy || !speechOk}
                onClick={() => void onVoiceToggle()}
              >
                {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {listening ? "Stop mic" : "Voice"}
              </Button>
            </div>

            {!speechOk && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Speech recognition isn’t available (try Chrome) and ElevenLabs isn’t configured. Use the text
                box below.
              </p>
            )}
            {speechOk && !micReady && (
              <p className="text-[11px] text-muted-foreground">
                First voice session will ask for microphone access — tap <strong>Allow</strong>.
              </p>
            )}

            {(listening || liveTranscript) && (
              <p className="text-[11px] text-primary line-clamp-4" aria-live="polite">
                {listening ? "Listening… end with “Over Now”. " : ""}
                {liveTranscript}
              </p>
            )}

            <textarea
              className="min-h-[72px] w-full resize-none rounded-md border bg-background px-2 py-1.5 text-xs"
              placeholder='Text (no Over Now): Intu, create a newsletter on Project Management from Intellee College, send to all contacts'
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              disabled={busy}
            />
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={busy || !manual.trim()}
              onClick={() => void runManual()}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Working…
                </>
              ) : (
                "Run command"
              )}
            </Button>

            {lastText && (
              <p className="text-[10px] text-muted-foreground line-clamp-3" title={lastText}>
                Last command: {lastText}
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
