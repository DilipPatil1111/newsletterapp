"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, Eye, MessageSquareText, PanelRightOpen, PanelRightClose } from "lucide-react";
import { BlockEditor } from "@/components/dashboard/block-editor";
import { EmailPreview } from "@/components/dashboard/email-preview";
import { AiChatSidebar } from "@/components/dashboard/ai-chat-sidebar";
import { SubjectLineGenerator } from "@/components/dashboard/subject-line-generator";
import type { ContentBlock } from "@/lib/email-renderer";
import { starterTemplates } from "@/lib/starter-templates";

type SegmentOption = { id: string; name: string; estimatedSize: number };
type TemplateOption = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  templateData: { blocks: ContentBlock[] } | null;
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showAiChat, setShowAiChat] = useState(false);

  const [segments, setSegments] = useState<SegmentOption[]>([]);
  const [emailTemplateOptions, setEmailTemplateOptions] = useState<TemplateOption[]>([]);

  const [name, setName] = useState("");
  const [subjectLine, setSubjectLine] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { type: "heading", text: "Newsletter Title" },
    { type: "paragraph", text: "Enter your newsletter content here..." },
    { type: "cta", text: "Learn More", url: "https://intellee.com" },
  ]);

  useEffect(() => {
    fetch("/api/segments/list")
      .then((r) => r.json())
      .then((d) => setSegments(d.segments || []))
      .catch(() => {});
    fetch("/api/email-templates/list")
      .then((r) => r.json())
      .then((d) => setEmailTemplateOptions(d.templates || []))
      .catch(() => {});
  }, []);

  function loadTemplate(templateId: string) {
    const template = emailTemplateOptions.find((t) => t.id === templateId);
    if (template?.templateData?.blocks) {
      setBlocks(template.templateData.blocks);
      toast.success(`Loaded template: ${template.name}`);
    }
  }

  function loadStarterTemplate(index: number) {
    const template = starterTemplates[index];
    if (template) {
      setBlocks(template.blocks);
      toast.success(`Loaded starter: ${template.name}`);
    }
  }

  function blocksToPlainText(): string {
    return blocks
      .map((b) => {
        if (b.type === "heading") return b.text;
        if (b.type === "paragraph") return b.text;
        if (b.type === "section") return `${b.title}\n${b.body}`;
        if (b.type === "cta") return `${b.text}: ${b.url}`;
        if (b.type === "divider") return "---";
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  async function handleCreate() {
    if (!name.trim() || !subjectLine.trim()) {
      toast.error("Name and subject line are required");
      return;
    }
    setLoading(true);
    try {
      const contentData: Record<string, string> = {};
      const introBlock = blocks.find((b) => b.type === "paragraph");
      const ctaBlock = blocks.find((b) => b.type === "cta");
      const highlightBlock = blocks.find((b) => b.type === "section");

      contentData.intro = introBlock?.text || "";
      contentData.highlights = highlightBlock?.body || "";
      contentData.ctaText = ctaBlock?.text || "Learn More";
      contentData.ctaUrl = ctaBlock?.url || "";

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subjectLine,
          previewText,
          segmentId: segmentId || null,
          content: contentData,
        }),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      const data = await res.json();
      toast.success("Campaign created");
      router.push(`/dashboard/campaigns/${data.campaign.id}`);
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Campaign</h1>
        <p className="text-muted-foreground">
          Build your newsletter campaign with the visual editor, AI assistant, and live preview.
        </p>
      </div>

      {/* Step 0: Campaign Details + Template Selection */}
      {step === 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. March Data Science Newsletter"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Audience Segment</Label>
                  <Select value={segmentId} onValueChange={setSegmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All contacts" />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} (~{s.estimatedSize})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subjectLine">Email Subject Line *</Label>
                <Input
                  id="subjectLine"
                  value={subjectLine}
                  onChange={(e) => setSubjectLine(e.target.value)}
                  placeholder="e.g. Your Weekly Intellee Update"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previewText">Preview Text</Label>
                <Input
                  id="previewText"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Short preview shown in inbox..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Start From Template</CardTitle>
              <CardDescription>
                Choose a template to get started quickly, or skip to build from scratch.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {starterTemplates.map((t, i) => (
                  <button
                    key={t.name}
                    onClick={() => loadStarterTemplate(i)}
                    className="rounded-lg border p-4 text-left hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  </button>
                ))}
              </div>
              {emailTemplateOptions.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Saved Templates:</p>
                  <div className="flex flex-wrap gap-2">
                    {emailTemplateOptions.map((t) => (
                      <Badge
                        key={t.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => loadTemplate(t.id)}
                      >
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={() => setStep(1)} disabled={!name.trim() || !subjectLine.trim()} className="gap-2">
              Edit Content <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 1: Block Editor + Preview + AI */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Edit Newsletter Content
            </h2>
            <div className="flex gap-1">
              <Button
                variant={showAiChat ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowAiChat(!showAiChat)}
                className="gap-1"
              >
                <MessageSquareText className="h-4 w-4" />
                AI Assistant
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-1"
              >
                {showPreview ? (
                  <><PanelRightClose className="h-4 w-4" /> Hide Preview</>
                ) : (
                  <><PanelRightOpen className="h-4 w-4" /> Show Preview</>
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-4">
            <div className={`flex-1 grid gap-4 ${showPreview ? "lg:grid-cols-2" : "grid-cols-1"}`}>
              {/* Block Editor */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Content Blocks</CardTitle>
                  <CardDescription>Add, edit, and reorder your newsletter content.</CardDescription>
                  <div className="pt-2">
                    <SubjectLineGenerator
                      currentSubject={subjectLine}
                      emailContent={blocksToPlainText()}
                      onSelect={(s) => setSubjectLine(s)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <BlockEditor blocks={blocks} onChange={setBlocks} />
                </CardContent>
              </Card>

              {/* Preview */}
              {showPreview && (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-0 pt-0 px-0">
                    <EmailPreview
                      subject={subjectLine}
                      previewText={previewText}
                      blocks={blocks}
                      showStats={false}
                      className="h-full"
                    />
                  </CardHeader>
                </Card>
              )}
            </div>

            {/* AI Chat */}
            {showAiChat && (
              <div className="w-[360px] shrink-0 rounded-lg border h-[700px]">
                <AiChatSidebar
                  emailContent={blocksToPlainText()}
                  onApplyContent={() => {}}
                  isOpen={showAiChat}
                  onClose={() => setShowAiChat(false)}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={handleCreate} disabled={loading} className="gap-2">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                "Create Campaign"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
