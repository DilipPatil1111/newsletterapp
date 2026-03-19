"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Palette, FileText, Mail, Loader2, ExternalLink, Sparkles, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";
import { starterTemplates } from "@/lib/starter-templates";

interface EmailTemplateItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnailUrl: string | null;
  isDefault: boolean;
  createdAt: string;
}

interface CanvaTemplateItem {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  canvaDesignUrl: string | null;
  projectTraining: string | null;
  targetRole: string | null;
  geography: string | null;
  isActive: boolean;
}

const categoryLabels: Record<string, string> = {
  announcement: "Announcement",
  course_highlight: "Course Highlight",
  monthly_digest: "Monthly Digest",
  event_invitation: "Event Invitation",
  general: "General",
};

const categoryColors: Record<string, string> = {
  announcement: "bg-blue-100 text-blue-800",
  course_highlight: "bg-purple-100 text-purple-800",
  monthly_digest: "bg-green-100 text-green-800",
  event_invitation: "bg-amber-100 text-amber-800",
  general: "bg-gray-100 text-gray-800",
};

export default function TemplatesPage() {
  const [emailTemplatesList, setEmailTemplatesList] = useState<EmailTemplateItem[]>([]);
  const [canvaTemplatesList, setCanvaTemplatesList] = useState<CanvaTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [deleteEmailId, setDeleteEmailId] = useState<string | null>(null);
  const [deleteCanvaId, setDeleteCanvaId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchEmailTemplates(), fetchCanvaTemplates()]).finally(() =>
      setLoading(false)
    );
  }, []);

  async function fetchEmailTemplates() {
    try {
      const res = await fetch("/api/email-templates/list");
      const data = await res.json();
      setEmailTemplatesList(data.templates || []);
    } catch {
      // tables may not exist yet
    }
  }

  async function fetchCanvaTemplates() {
    try {
      const res = await fetch("/api/templates/list");
      const data = await res.json();
      setCanvaTemplatesList(data.templates || []);
    } catch {
      // tables may not exist yet
    }
  }

  async function handleDeleteEmail(id: string) {
    const res = await fetch(`/api/email-templates/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    toast.success("Email template deleted");
    setEmailTemplatesList((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleDeleteCanva(id: string) {
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    toast.success("Canva template deleted");
    setCanvaTemplatesList((prev) => prev.filter((t) => t.id !== id));
  }

  async function seedStarterTemplates() {
    setSeeding(true);
    try {
      for (const template of starterTemplates) {
        await fetch("/api/email-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: template.name,
            description: template.description,
            category: template.category,
            templateData: { blocks: template.blocks },
            isDefault: true,
          }),
        });
      }
      toast.success("Starter templates created!");
      await fetchEmailTemplates();
    } catch {
      toast.error("Failed to seed templates");
    } finally {
      setSeeding(false);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground">
            Manage email templates and Canva designs for your newsletters.
          </p>
        </div>
        <div className="flex gap-2">
          {emailTemplatesList.length === 0 && (
            <Button variant="outline" onClick={seedStarterTemplates} disabled={seeding} className="gap-2">
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Add Starter Templates
            </Button>
          )}
          <Link href="/dashboard/templates/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Template
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="canva" className="gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            Canva Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-4">
          {emailTemplatesList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No email templates yet.</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add starter templates to get started quickly, or create your own.
                </p>
                <Button onClick={seedStarterTemplates} disabled={seeding} className="gap-2">
                  {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Add Starter Templates
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {emailTemplatesList.map((template) => (
                <Card key={template.id} className="overflow-hidden transition-shadow hover:shadow-md relative group">
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/templates/email/${template.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteEmailId(template.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="aspect-[16/9] bg-gradient-to-br from-primary/5 to-primary/20 flex items-center justify-center">
                    <Mail className="h-12 w-12 text-primary/30" />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2 pr-8">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[template.category] || categoryColors.general}`}>
                        {categoryLabels[template.category] || template.category}
                      </span>
                    </div>
                    {template.description && (
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {template.isDefault && (
                        <Badge variant="secondary" className="text-xs">Starter</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(template.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {deleteEmailId && (
              <DeleteConfirmDialog
                open={!!deleteEmailId}
                onOpenChange={(open) => !open && setDeleteEmailId(null)}
                title="Delete email template?"
                description="This action cannot be undone."
                onConfirm={() => handleDeleteEmail(deleteEmailId)}
              />
            )}
            </>
          )}
        </TabsContent>

        <TabsContent value="canva" className="mt-4">
          {canvaTemplatesList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Palette className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No Canva templates added yet.</p>
                <Link href="/dashboard/templates/new" className="mt-4">
                  <Button>Add Your First Template</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {canvaTemplatesList.map((template) => (
                <Card key={template.id} className="overflow-hidden transition-shadow hover:shadow-md relative group">
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/templates/canva/${template.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteCanvaId(template.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {template.thumbnailUrl && (
                    <div className="aspect-video bg-muted">
                      <img
                        src={template.thumbnailUrl}
                        alt={template.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between pr-8">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {!template.isActive && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {template.projectTraining && <Badge variant="outline">{template.projectTraining}</Badge>}
                      {template.targetRole && <Badge variant="outline">{template.targetRole}</Badge>}
                      {template.geography && <Badge variant="outline">{template.geography}</Badge>}
                    </div>
                    {template.canvaDesignUrl && (
                      <a
                        href={template.canvaDesignUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Open in Canva <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            {deleteCanvaId && (
              <DeleteConfirmDialog
                open={!!deleteCanvaId}
                onOpenChange={(open) => !open && setDeleteCanvaId(null)}
                title="Delete Canva template?"
                description="This action cannot be undone."
                onConfirm={() => handleDeleteCanva(deleteCanvaId)}
              />
            )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
