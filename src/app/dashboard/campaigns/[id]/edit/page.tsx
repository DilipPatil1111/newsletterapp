"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

type SegmentOption = { id: string; name: string };

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [segments, setSegments] = useState<SegmentOption[]>([]);
  const [name, setName] = useState("");
  const [subjectLine, setSubjectLine] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [intro, setIntro] = useState("");
  const [highlights, setHighlights] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/campaigns/${id}`).then((r) => r.json()),
      fetch("/api/segments/list").then((r) => r.json()),
    ]).then(([campaignRes, segmentsRes]) => {
      if (campaignRes.campaign) {
        const c = campaignRes.campaign;
        setName(c.name);
        setSubjectLine(c.subjectLine || "");
        setPreviewText(c.previewText || "");
        setSegmentId(c.segmentId || "");
        const content = (c.content || {}) as Record<string, string>;
        setIntro(content.intro || "");
        setHighlights(content.highlights || "");
        setCtaText(content.ctaText || "");
        setCtaUrl(content.ctaUrl || "");
      }
      setSegments(segmentsRes.segments || []);
    }).catch(() => toast.error("Failed to load campaign"))
    .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !subjectLine.trim()) {
      toast.error("Name and subject line are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subjectLine,
          previewText,
          segmentId: segmentId || null,
          content: { intro, highlights, ctaText, ctaUrl },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      toast.success("Campaign updated");
      router.push(`/dashboard/campaigns/${id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update campaign");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/campaigns/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Campaign</h1>
          <p className="text-muted-foreground">Update campaign details and content.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subjectLine">Subject Line *</Label>
              <Input
                id="subjectLine"
                value={subjectLine}
                onChange={(e) => setSubjectLine(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previewText">Preview Text</Label>
              <Input
                id="previewText"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Segment</Label>
              <Select value={segmentId} onValueChange={setSegmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select segment (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {segments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="intro">Introduction</Label>
              <Textarea
                id="intro"
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="highlights">Highlights</Label>
              <Textarea
                id="highlights"
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ctaText">CTA Text</Label>
                <Input
                  id="ctaText"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaUrl">CTA URL</Label>
                <Input
                  id="ctaUrl"
                  type="url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/campaigns/${id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
