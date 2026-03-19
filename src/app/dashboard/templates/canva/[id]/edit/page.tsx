"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function EditCanvaTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [canvaDesignUrl, setCanvaDesignUrl] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [projectTraining, setProjectTraining] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [geography, setGeography] = useState("");
  const [campaignType, setCampaignType] = useState("");
  const [htmlContent, setHtmlContent] = useState("");

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.template) {
          const t = data.template;
          setName(t.name);
          setDescription(t.description || "");
          setCanvaDesignUrl(t.canvaDesignUrl || "");
          setHeroImageUrl(t.heroImageUrl || "");
          setThumbnailUrl(t.thumbnailUrl || "");
          setProjectTraining(t.projectTraining || "");
          setTargetRole(t.targetRole || "");
          setGeography(t.geography || "");
          setCampaignType(t.campaignType || "");
          setHtmlContent(t.htmlContent || "");
        }
      })
      .catch(() => toast.error("Failed to load template"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          canvaDesignUrl: canvaDesignUrl || undefined,
          heroImageUrl: heroImageUrl || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          projectTraining: projectTraining || undefined,
          targetRole: targetRole || undefined,
          geography: geography || undefined,
          campaignType: campaignType || undefined,
          htmlContent: htmlContent || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Template updated");
      router.push("/dashboard/templates");
      router.refresh();
    } catch {
      toast.error("Failed to update template");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Canva Template</h1>
        <p className="text-muted-foreground">
          Update the Canva template details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Template Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Canva Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="canvaDesignUrl">Canva Design URL</Label>
              <Input
                id="canvaDesignUrl"
                type="url"
                value={canvaDesignUrl}
                onChange={(e) => setCanvaDesignUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroImageUrl">Hero Image URL</Label>
              <Input
                id="heroImageUrl"
                type="url"
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
              <Input
                id="thumbnailUrl"
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="projectTraining">Project / Training</Label>
                <Input
                  id="projectTraining"
                  value={projectTraining}
                  onChange={(e) => setProjectTraining(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetRole">Target Role</Label>
                <Input
                  id="targetRole"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="geography">Geography</Label>
                <Input
                  id="geography"
                  value={geography}
                  onChange={(e) => setGeography(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaignType">Campaign Type</Label>
                <Input
                  id="campaignType"
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>HTML Content (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
