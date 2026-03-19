"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Loader2, RefreshCw } from "lucide-react";
import type { ContentBlock } from "@/lib/email-renderer";

interface EmailPreviewProps {
  subject: string;
  previewText?: string;
  rawContent?: string;
  blocks?: ContentBlock[];
  ctaText?: string;
  ctaUrl?: string;
  recipientName?: string;
  showStats?: boolean;
  className?: string;
}

export function EmailPreview({
  subject,
  previewText,
  rawContent,
  blocks,
  ctaText,
  ctaUrl,
  recipientName = "Preview User",
  showStats = true,
  className = "",
}: EmailPreviewProps) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          previewText,
          rawContent,
          blocks,
          ctaText,
          ctaUrl,
          recipientName,
          showStats,
        }),
      });
      if (res.ok) {
        const text = await res.text();
        setHtml(text);
      }
    } catch {
      setHtml("<p style='padding:20px;color:#ef4444;'>Failed to load preview</p>");
    } finally {
      setLoading(false);
    }
  }, [subject, previewText, rawContent, blocks, ctaText, ctaUrl, recipientName, showStats]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchPreview, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchPreview]);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant={viewport === "desktop" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewport("desktop")}
          >
            <Monitor className="mr-1 h-3.5 w-3.5" />
            Desktop
          </Button>
          <Button
            variant={viewport === "mobile" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewport("mobile")}
          >
            <Smartphone className="mr-1 h-3.5 w-3.5" />
            Mobile
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button variant="ghost" size="sm" onClick={fetchPreview}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-muted/30 p-4">
        <div
          className="mx-auto transition-all duration-300"
          style={{ maxWidth: viewport === "desktop" ? "620px" : "375px" }}
        >
          <iframe
            ref={iframeRef}
            title="Email Preview"
            className="h-[600px] w-full rounded-lg border bg-white shadow-sm"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
