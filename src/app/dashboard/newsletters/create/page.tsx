"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DEFAULT_BUSINESSES, type BusinessConfig } from "@/lib/businesses";
import { starterTemplates } from "@/lib/starter-templates";
import { blocksToRawContent, replacePlaceholdersInBlocks } from "@/lib/email-renderer";
import { EmailPreview } from "@/components/dashboard/email-preview";
import { AiChatSidebar } from "@/components/dashboard/ai-chat-sidebar";
import { SubjectLineGenerator } from "@/components/dashboard/subject-line-generator";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Send,
  Eye,
  Users,
  BookOpen,
  PanelRightOpen,
  PanelRightClose,
  MessageSquareText,
} from "lucide-react";

type Contact = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  geography: string | null;
  projectTraining: string | null;
  status: string;
};

type GeneratedContent = {
  subjectLine: string;
  previewText: string;
  fullContent: string;
  ctaText: string;
  ctaUrl: string;
  courseName: string;
  sourceData: {
    trendsFound: number;
    salaryFound: number;
    demandFound: number;
    sourcesCollected: number;
  };
};

const STEPS = [
  { label: "Topic", icon: BookOpen },
  { label: "AI Content", icon: Sparkles },
  { label: "Review & Edit", icon: Eye },
  { label: "Select Contacts", icon: Users },
  { label: "Send", icon: Send },
];

export default function CreateNewsletterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showAiChat, setShowAiChat] = useState(false);

  const [businessSlug, setBusinessSlug] = useState("intellee_college");
  const [businessesList, setBusinessesList] = useState<BusinessConfig[]>([]);
  const [topicName, setTopicName] = useState("");
  const [contextName, setContextName] = useState("Intellee College");
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number | null>(null);

  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [editableSubject, setEditableSubject] = useState("");
  const [editablePreview, setEditablePreview] = useState("");
  const [editableContent, setEditableContent] = useState("");
  const [editableCtaText, setEditableCtaText] = useState("");
  const [editableCtaUrl, setEditableCtaUrl] = useState("");

  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    fetch("/api/businesses")
      .then((r) => r.json())
      .then((d) => setBusinessesList(d.businesses || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 3) {
      loadContacts();
    }
  }, [step]);

  async function loadContacts() {
    setLoadingContacts(true);
    try {
      const res = await fetch("/api/contacts/list");
      const data = await res.json();
      setAllContacts(data.contacts || []);
      const ids = new Set<string>((data.contacts || []).map((c: Contact) => c.id));
      setSelectedContactIds(ids);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoadingContacts(false);
    }
  }

  const business =
    businessesList.find((b) => b.slug === businessSlug) ??
    businessesList[0] ??
    DEFAULT_BUSINESSES[0];

  useEffect(() => {
    setContextName(business.name);
  }, [businessSlug, business.name]);

  async function handleGenerate() {
    if (!topicName.trim()) {
      toast.error(`Please enter a ${business.fieldLabel1.toLowerCase()}`);
      return;
    }
    if (useTemplate && selectedTemplateIndex !== null) {
      const template = starterTemplates[selectedTemplateIndex];
      const blocks = replacePlaceholdersInBlocks(template.blocks, { courseName: topicName });
      const { rawContent, ctaText, ctaUrl } = blocksToRawContent(blocks);
      setContent({
        subjectLine: `${topicName} — ${template.name}`,
        previewText: template.description,
        fullContent: rawContent,
        ctaText,
        ctaUrl: ctaUrl || "https://intellee.com",
        courseName: topicName,
        sourceData: { trendsFound: 0, salaryFound: 0, demandFound: 0, sourcesCollected: 0 },
      });
      setEditableSubject(`${topicName} — ${template.name}`);
      setEditablePreview(template.description);
      setEditableContent(rawContent);
      setEditableCtaText(ctaText);
      setEditableCtaUrl(ctaUrl || "https://intellee.com");
      setStep(1);
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName: topicName,
          collegeContext: contextName,
          businessSlug,
        }),
      });
      if (!res.ok) throw new Error();
      const data: GeneratedContent = await res.json();
      setContent(data);
      setEditableSubject(data.subjectLine);
      setEditablePreview(data.previewText);
      setEditableContent(data.fullContent);
      setEditableCtaText(data.ctaText);
      setEditableCtaUrl(data.ctaUrl);
      setStep(1);
    } catch {
      toast.error("Failed to generate content. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function toggleContact(id: string) {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedContactIds(new Set(allContacts.map((c) => c.id)));
  }

  function deselectAll() {
    setSelectedContactIds(new Set());
  }

  async function handleSaveAsDraft() {
    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${topicName} Newsletter`,
          subjectLine: editableSubject,
          previewText: editablePreview,
          content: {
            intro: editableContent,
            highlights: "",
            ctaText: editableCtaText,
            ctaUrl: editableCtaUrl,
          },
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success("Campaign saved as draft!");
      router.push(`/dashboard/campaigns/${data.campaign.id}`);
    } catch {
      toast.error("Failed to save campaign");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (selectedContactIds.size === 0) {
      toast.error("Select at least one contact to send to");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/newsletters/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName: topicName,
          subjectLine: editableSubject,
          previewText: editablePreview,
          htmlContent: editableContent,
          ctaText: editableCtaText,
          ctaUrl: editableCtaUrl,
          contactIds: Array.from(selectedContactIds),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          typeof err.error === "string"
            ? err.error
            : "Failed to send newsletter";
        throw new Error(msg);
      }
      const data = await res.json();
      const sent = typeof data.sent === "number" ? data.sent : 0;
      const failed = typeof data.failed === "number" ? data.failed : 0;
      if (sent === 0 && failed > 0) {
        toast.error(
          `No emails were delivered (${failed} failed). Check Resend domain, RESEND_FROM_EMAIL, and server logs.`
        );
        return;
      }
      if (sent > 0 && failed > 0) {
        toast.warning(`Sent to ${sent} recipient(s); ${failed} failed.`);
      } else {
        toast.success(`Newsletter sent to ${sent} recipient(s)!`);
      }
      router.push("/dashboard/campaigns");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send newsletter");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Newsletter</h1>
        <p className="text-muted-foreground">
          Enter a course name and AI will generate a complete newsletter for you.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <s.icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-4 ${i < step ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Topic */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Topic
            </CardTitle>
            <CardDescription>
              Select your business and enter the topic. Our AI will research the latest trends
              and generate a professional newsletter automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business">Business</Label>
              <Select value={businessSlug} onValueChange={setBusinessSlug}>
                <SelectTrigger id="business">
                  <SelectValue placeholder="Select business" />
                </SelectTrigger>
                <SelectContent>
                  {(businessesList.length ? businessesList : DEFAULT_BUSINESSES).map((b) => (
                    <SelectItem key={b.slug} value={b.slug}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topicName">{business.fieldLabel1} *</Label>
              <Input
                id="topicName"
                placeholder={business.placeholder1}
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contextName">{business.fieldLabel2}</Label>
              <Input
                id="contextName"
                placeholder={business.placeholder2}
                value={contextName}
                onChange={(e) => setContextName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="useTemplate"
                checked={useTemplate}
                onCheckedChange={(c) => setUseTemplate(!!c)}
              />
              <Label htmlFor="useTemplate" className="cursor-pointer">
                Start from a sample template instead of AI
              </Label>
            </div>

            {useTemplate && (
              <div className="space-y-2">
                <Label>Choose a template</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {starterTemplates.map((t, i) => (
                    <Card
                      key={i}
                      className={`cursor-pointer transition-colors ${
                        selectedTemplateIndex === i ? "ring-2 ring-primary" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedTemplateIndex(i)}
                    >
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">{t.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-2">{t.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={generating || !topicName.trim() || (useTemplate && selectedTemplateIndex === null)}
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Researching & Generating...
                </>
              ) : useTemplate ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Use Template
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Newsletter with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Content Preview (AI or Template) */}
      {step === 1 && content && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {useTemplate ? <CheckCircle2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                {useTemplate ? "Template Content" : "AI-Generated Content"}
              </CardTitle>
              <CardDescription>
                {useTemplate ? (
                  <>Content from your selected template for <strong>{topicName}</strong>.</>
                ) : (
                  <>Content generated for <strong>{topicName}</strong> using{" "}
                  {content.sourceData.trendsFound + content.sourceData.salaryFound + content.sourceData.demandFound} research
                  sources and {content.sourceData.sourcesCollected} reference links.</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-4">
                <p className="mb-1 text-sm font-medium text-muted-foreground">Subject Line:</p>
                <p className="font-semibold">{content.subjectLine}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-4 whitespace-pre-wrap text-sm leading-relaxed">
                {content.fullContent}
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(2)} className="gap-2">
              Review & Edit <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Edit Content with Live Preview + AI Chat */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Review & Edit Newsletter
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
            {/* Main editor + preview area */}
            <div className={`flex-1 grid gap-4 ${showPreview ? "lg:grid-cols-2" : "grid-cols-1"}`}>
              {/* Editor Panel */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Edit Content</CardTitle>
                  <CardDescription>
                    Make any changes you want before sending. All fields are editable.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="editSubject">Email Subject Line</Label>
                    <Input
                      id="editSubject"
                      value={editableSubject}
                      onChange={(e) => setEditableSubject(e.target.value)}
                    />
                    <SubjectLineGenerator
                      currentSubject={editableSubject}
                      emailContent={editableContent}
                      onSelect={(s) => setEditableSubject(s)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPreview">Preview Text</Label>
                    <Input
                      id="editPreview"
                      value={editablePreview}
                      onChange={(e) => setEditablePreview(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editContent">Newsletter Content</Label>
                    <Textarea
                      id="editContent"
                      value={editableContent}
                      onChange={(e) => setEditableContent(e.target.value)}
                      rows={14}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="editCta">CTA Button Text</Label>
                      <Input
                        id="editCta"
                        value={editableCtaText}
                        onChange={(e) => setEditableCtaText(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editCtaUrl">CTA URL</Label>
                      <Input
                        id="editCtaUrl"
                        value={editableCtaUrl}
                        onChange={(e) => setEditableCtaUrl(e.target.value)}
                        type="url"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live Preview Panel */}
              {showPreview && (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-0 pt-0 px-0">
                    <EmailPreview
                      subject={editableSubject}
                      previewText={editablePreview}
                      rawContent={editableContent}
                      ctaText={editableCtaText}
                      ctaUrl={editableCtaUrl}
                      showStats={true}
                      className="h-full"
                    />
                  </CardHeader>
                </Card>
              )}
            </div>

            {/* AI Chat Sidebar */}
            {showAiChat && (
              <div className="w-[360px] shrink-0 rounded-lg border h-[700px]">
                <AiChatSidebar
                  emailContent={editableContent}
                  onApplyContent={(newContent) => setEditableContent(newContent)}
                  onApplySubject={(newSubject) => setEditableSubject(newSubject)}
                  isOpen={showAiChat}
                  onClose={() => setShowAiChat(false)}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="secondary" onClick={handleSaveAsDraft} disabled={saving}>
              {saving ? "Saving..." : "Save as Draft"}
            </Button>
            <Button onClick={() => setStep(3)} className="gap-2">
              Select Contacts <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Select Contacts */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Recipients
              </CardTitle>
              <CardDescription>
                Choose which contacts should receive this newsletter.{" "}
                <strong>{selectedContactIds.size}</strong> of {allContacts.length} selected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingContacts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : allContacts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No contacts found. Add contacts first before sending.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard/contacts/new")}
                  >
                    Add Contacts
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      Deselect All
                    </Button>
                  </div>
                  <div className="max-h-80 overflow-y-auto rounded-md border divide-y">
                    {allContacts.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedContactIds.has(c.id)}
                          onCheckedChange={() => toggleContact(c.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {[c.firstName, c.lastName].filter(Boolean).join(" ")}
                            {c.role ? ` · ${c.role}` : ""}
                            {c.geography ? ` · ${c.geography}` : ""}
                          </p>
                        </div>
                        <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs">
                          {c.status}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              onClick={() => setStep(4)}
              disabled={selectedContactIds.size === 0}
              className="gap-2"
            >
              Confirm & Preview <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Final Confirm & Send with Full Preview */}
      {step === 4 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Ready to Send
              </CardTitle>
              <CardDescription>
                Review the summary and email preview, then hit Send to deliver your newsletter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="summary">
                <TabsList className="mb-4">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="preview">Email Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-md border p-4">
                      <p className="text-sm text-muted-foreground">{business.fieldLabel1}</p>
                      <p className="font-semibold">{topicName}</p>
                    </div>
                    <div className="rounded-md border p-4">
                      <p className="text-sm text-muted-foreground">Recipients</p>
                      <p className="font-semibold">{selectedContactIds.size} contacts</p>
                    </div>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="text-sm text-muted-foreground">Subject Line</p>
                    <p className="font-semibold">{editableSubject}</p>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-4 max-h-60 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
                    {editableContent}
                  </div>
                  {editableCtaText && (
                    <div className="text-center">
                      <Button asChild className="pointer-events-none">
                        <span>{editableCtaText}</span>
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="preview">
                  <EmailPreview
                    subject={editableSubject}
                    previewText={editablePreview}
                    rawContent={editableContent}
                    ctaText={editableCtaText}
                    ctaUrl={editableCtaUrl}
                    showStats={true}
                    className="rounded-lg border"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="secondary" onClick={handleSaveAsDraft} disabled={saving}>
              {saving ? "Saving..." : "Save as Draft Only"}
            </Button>
            <Button onClick={handleSend} disabled={sending} className="gap-2">
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Approve & Send Newsletter
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
