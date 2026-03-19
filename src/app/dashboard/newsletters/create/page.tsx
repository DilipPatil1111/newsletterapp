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
import { toast } from "sonner";
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
  { label: "Course Info", icon: BookOpen },
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

  // Step 1: Course info
  const [courseName, setCourseName] = useState("");
  const [collegeContext, setCollegeContext] = useState("Intellee College");

  // Step 2+3: Generated + editable content
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [editableSubject, setEditableSubject] = useState("");
  const [editablePreview, setEditablePreview] = useState("");
  const [editableContent, setEditableContent] = useState("");
  const [editableCtaText, setEditableCtaText] = useState("");
  const [editableCtaUrl, setEditableCtaUrl] = useState("");

  // Step 4: Contact selection
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);

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

  async function handleGenerate() {
    if (!courseName.trim()) {
      toast.error("Please enter a course name");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseName, collegeContext }),
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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
          name: `${courseName} Newsletter`,
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
          courseName,
          subjectLine: editableSubject,
          previewText: editablePreview,
          htmlContent: editableContent,
          ctaText: editableCtaText,
          ctaUrl: editableCtaUrl,
          contactIds: Array.from(selectedContactIds),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send");
      }
      const data = await res.json();
      toast.success(`Newsletter sent to ${data.sent} recipients!`);
      router.push("/dashboard/campaigns");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send newsletter");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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

      {/* Step 1: Course Info */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Information
            </CardTitle>
            <CardDescription>
              Enter the course name. Our AI will research the latest trends,
              salary data, employment statistics, and demand for this course,
              then generate a professional newsletter automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courseName">Course Name *</Label>
              <Input
                id="courseName"
                placeholder="e.g. Business Analyst AI, Data Science, Cloud Computing..."
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="college">College Name</Label>
              <Input
                id="college"
                value={collegeContext}
                onChange={(e) => setCollegeContext(e.target.value)}
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating || !courseName.trim()}
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Researching & Generating...
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

      {/* Step 2: AI Generated Content Preview */}
      {step === 1 && content && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI-Generated Content
              </CardTitle>
              <CardDescription>
                Content generated for <strong>{content.courseName}</strong> using{" "}
                {content.sourceData.trendsFound + content.sourceData.salaryFound + content.sourceData.demandFound} research
                sources and {content.sourceData.sourcesCollected} reference links.
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

      {/* Step 3: Edit Content */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Review & Edit Newsletter
              </CardTitle>
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
                  rows={18}
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

      {/* Step 5: Final Confirm & Send */}
      {step === 4 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Ready to Send
              </CardTitle>
              <CardDescription>
                Review the summary below and hit Send to deliver your newsletter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">Course</p>
                  <p className="font-semibold">{courseName}</p>
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
