import { db } from "@/lib/db";
import {
  campaigns,
  canvaTemplates,
  segments,
  campaignApprovals,
  sendJobs,
} from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { CampaignActions } from "@/components/dashboard/campaign-actions";
import { Pencil } from "lucide-react";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let campaign;
  try {
    const results = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);
    campaign = results[0];
  } catch {
    notFound();
  }

  if (!campaign) notFound();

  let template = null;
  let segment = null;
  let approvals: (typeof campaignApprovals.$inferSelect)[] = [];
  let jobs: (typeof sendJobs.$inferSelect)[] = [];

  try {
    if (campaign.templateId) {
      const t = await db
        .select()
        .from(canvaTemplates)
        .where(eq(canvaTemplates.id, campaign.templateId))
        .limit(1);
      template = t[0] || null;
    }
    if (campaign.segmentId) {
      const s = await db
        .select()
        .from(segments)
        .where(eq(segments.id, campaign.segmentId))
        .limit(1);
      segment = s[0] || null;
    }
    approvals = await db
      .select()
      .from(campaignApprovals)
      .where(eq(campaignApprovals.campaignId, id))
      .orderBy(sql`${campaignApprovals.createdAt} DESC`);
    jobs = await db
      .select()
      .from(sendJobs)
      .where(eq(sendJobs.campaignId, id))
      .orderBy(sql`${sendJobs.createdAt} DESC`);
  } catch {
    // Tables may not exist
  }

  const content = campaign.content as Record<string, string> | null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant={
                campaign.status === "approved" || campaign.status === "sent"
                  ? "default"
                  : campaign.status === "changes_requested" ||
                      campaign.status === "cancelled"
                    ? "destructive"
                    : "secondary"
              }
            >
              {campaign.status.replace(/_/g, " ")}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Created {format(new Date(campaign.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["draft", "changes_requested"].includes(campaign.status) && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/campaigns/${campaign.id}/edit`} className="gap-1.5">
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          <CampaignActions
            campaignId={campaign.id}
            status={campaign.status}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Subject Line
              </span>
              <p className="font-medium">{campaign.subjectLine || "—"}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Preview Text
              </span>
              <p>{campaign.previewText || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Targeting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Segment
              </span>
              <p>{segment?.name || "No segment selected"}</p>
              {segment && (
                <Badge variant="secondary" className="mt-1">
                  ~{segment.estimatedSize} contacts
                </Badge>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Template
              </span>
              <p>{template?.name || "No template selected"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {content && (
        <Card>
          <CardHeader>
            <CardTitle>Newsletter Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.intro && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Introduction
                </span>
                <p className="whitespace-pre-wrap">{content.intro}</p>
              </div>
            )}
            {content.highlights && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Highlights
                </span>
                <p className="whitespace-pre-wrap">{content.highlights}</p>
              </div>
            )}
            {content.ctaText && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  CTA
                </span>
                <p>
                  {content.ctaText}
                  {content.ctaUrl && (
                    <span className="text-muted-foreground">
                      {" "}
                      → {content.ctaUrl}
                    </span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {template?.heroImageUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mx-auto max-w-lg rounded-lg border bg-white p-6 text-black">
              <img
                src={template.heroImageUrl}
                alt="Hero"
                className="mb-4 w-full rounded"
              />
              <h2 className="text-xl font-bold">
                {campaign.subjectLine}
              </h2>
              {content?.intro && (
                <p className="mt-2 text-gray-700">{content.intro}</p>
              )}
              {content?.highlights && (
                <p className="mt-2 text-gray-700">{content.highlights}</p>
              )}
              {content?.ctaUrl && (
                <a
                  href={content.ctaUrl}
                  className="mt-4 inline-block rounded bg-blue-600 px-6 py-2 text-white"
                >
                  {content.ctaText || "Learn More"}
                </a>
              )}
              <Separator className="my-4" />
              <p className="text-xs text-gray-400">
                You received this email from Intellee College. To unsubscribe,
                click here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Approval History</CardTitle>
        </CardHeader>
        <CardContent>
          {approvals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No approval actions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {approvals.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div>
                    <Badge
                      variant={
                        a.action === "approved"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {a.action.replace(/_/g, " ")}
                    </Badge>
                    {a.comments && (
                      <p className="mt-1 text-sm">{a.comments}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(a.createdAt), "MMM d, yyyy HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Send History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jobs.map((j) => (
                <div
                  key={j.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{j.status}</Badge>
                    <span className="text-sm">
                      {j.sentCount}/{j.totalRecipients} sent
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(j.createdAt), "MMM d, yyyy HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
