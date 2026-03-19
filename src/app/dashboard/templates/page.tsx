import { db } from "@/lib/db";
import { canvaTemplates } from "@/server/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Palette, ExternalLink } from "lucide-react";

export default async function TemplatesPage() {
  let templateList: (typeof canvaTemplates.$inferSelect)[] = [];
  try {
    templateList = await db
      .select()
      .from(canvaTemplates)
      .orderBy(sql`${canvaTemplates.createdAt} DESC`);
  } catch {
    // Tables may not exist yet
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Canva Templates</h1>
          <p className="text-muted-foreground">
            Manage newsletter design templates linked to Canva.
          </p>
        </div>
        <Link href="/dashboard/templates/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Template
          </Button>
        </Link>
      </div>

      {templateList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Palette className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No templates added yet.
            </p>
            <Link href="/dashboard/templates/new" className="mt-4">
              <Button>Add Your First Template</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templateList.map((template) => (
            <Card
              key={template.id}
              className="overflow-hidden transition-shadow hover:shadow-md"
            >
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
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {!template.isActive && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {template.projectTraining && (
                    <Badge variant="outline">{template.projectTraining}</Badge>
                  )}
                  {template.targetRole && (
                    <Badge variant="outline">{template.targetRole}</Badge>
                  )}
                  {template.geography && (
                    <Badge variant="outline">{template.geography}</Badge>
                  )}
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
      )}
    </div>
  );
}
