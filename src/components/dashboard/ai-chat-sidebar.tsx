"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  X,
  Copy,
  Check,
  Loader2,
  Wand2,
  MessageSquare,
  Zap,
} from "lucide-react";

interface AiChatSidebarProps {
  emailContent: string;
  onApplyContent: (newContent: string) => void;
  onApplySubject?: (newSubject: string) => void;
  brandGuidelines?: string;
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_ACTIONS = [
  { label: "Make it shorter", icon: Zap, prompt: "Make the newsletter content shorter and more concise. Remove filler words and keep only the essential information." },
  { label: "More professional", icon: Wand2, prompt: "Rewrite the newsletter in a more professional and formal tone while keeping the key messages." },
  { label: "Add urgency", icon: Zap, prompt: "Add a sense of urgency to the newsletter. Make the reader feel they should act now." },
  { label: "Fix grammar", icon: Check, prompt: "Fix any grammar, spelling, or punctuation errors in the newsletter content." },
  { label: "Suggest subject lines", icon: MessageSquare, prompt: "Suggest 5 compelling subject lines for this newsletter. For each, explain the approach (curiosity, benefit, urgency, etc.)." },
  { label: "Brand check", icon: Check, prompt: "Review the newsletter content against the brand guidelines. Point out any areas that don't align and suggest fixes." },
];

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function AiChatSidebar({
  emailContent,
  onApplyContent,
  brandGuidelines,
  isOpen,
  onClose,
}: AiChatSidebarProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      body: {
        emailContent,
        brandGuidelines,
      },
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    sendMessage({ text });
  }

  function handleQuickAction(prompt: string) {
    setInput("");
    sendMessage({ text: prompt });
  }

  function handleApply(content: string) {
    onApplyContent(content);
  }

  async function handleCopy(text: string, index: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  if (!isOpen) return null;

  return (
    <div className="flex h-full w-full flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Assistant</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="border-b p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Quick Actions</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <Badge
                key={action.label}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 transition-colors text-xs py-1"
                onClick={() => handleQuickAction(action.prompt)}
              >
                <action.icon className="mr-1 h-3 w-3" />
                {action.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Ask me to help improve your newsletter.
            </p>
            <p className="text-xs text-muted-foreground">
              I can rewrite content, suggest improvements, check brand compliance, and more.
            </p>
          </div>
        )}

        {messages.map((msg: UIMessage, i: number) => {
          const text = getMessageText(msg);
          if (!text) return null;
          return (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="whitespace-pre-wrap">{text}</div>
                {msg.role === "assistant" && (
                  <div className="mt-2 flex gap-1 border-t border-border/50 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => handleApply(text)}
                    >
                      Apply to editor
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => handleCopy(text, i)}
                    >
                      {copiedIndex === i ? (
                        <><Check className="mr-1 h-3 w-3" /> Copied</>
                      ) : (
                        <><Copy className="mr-1 h-3 w-3" /> Copy</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-muted px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI to improve your newsletter..."
            rows={2}
            className="min-h-[60px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={isLoading || !input.trim()}
            className="h-[60px] w-10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
