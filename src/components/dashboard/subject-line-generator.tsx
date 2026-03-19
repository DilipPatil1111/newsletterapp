"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check } from "lucide-react";

interface SubjectLineOption {
  text: string;
  approach: string;
  predictedScore: number;
}

interface SubjectLineGeneratorProps {
  currentSubject: string;
  emailContent: string;
  onSelect: (subject: string) => void;
}

export function SubjectLineGenerator({
  currentSubject,
  emailContent,
  onSelect,
}: SubjectLineGeneratorProps) {
  const [suggestions, setSuggestions] = useState<SubjectLineOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  async function generate() {
    setLoading(true);
    setSuggestions([]);
    setSelectedIndex(null);
    try {
      const res = await fetch("/api/ai/subject-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: emailContent,
          currentSubject,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSuggestions(data.subjectLines || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(index: number) {
    setSelectedIndex(index);
    onSelect(suggestions[index].text);
  }

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={generate}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
        ) : (
          <><Sparkles className="h-3.5 w-3.5" /> Suggest Subject Lines</>
        )}
      </Button>

      {suggestions.length > 0 && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">Click to use:</p>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`flex w-full items-start gap-2 rounded-md border p-2.5 text-left text-sm transition-colors hover:bg-muted/50 ${
                selectedIndex === i ? "border-primary bg-primary/5" : ""
              }`}
            >
              <div className="flex-1">
                <p className="font-medium">{s.text}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {s.approach}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Score: {s.predictedScore}/10
                  </span>
                </div>
              </div>
              {selectedIndex === i && (
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
