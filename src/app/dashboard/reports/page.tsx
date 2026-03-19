import { db } from "@/lib/db";
import {
  sendJobs,
  sendRecipients,
  campaigns,
  contacts,
} from "@/server/db/schema";
import { eq, count, sql, sum } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Send, CheckCircle, XCircle, Users, BarChart3, TrendingUp, AlertTriangle } from "lucide-react";
import { ReportsExportButton } from "@/components/dashboard/reports-export-button";

export default async function ReportsPage() {
  let totalSent = 0;
  let totalFailed = 0;
  let totalRecipients = 0;
  let totalContacts = 0;
  let totalBounced = 0;
  let totalDelivered = 0;
  let campaignCount = 0;
  let jobHistory: {
    id: string;
    campaignName: string;
    status: string;
    totalRecipients: number | null;
    sentCount: number | null;
    failedCount: number | null;
    createdAt: Date;
    completedAt: Date | null;
  }[] = [];

  let statusBreakdown: { status: string; count: number }[] = [];

  try {
    const [sentResult] = await db
      .select({ value: sum(sendJobs.sentCount) })
      .from(sendJobs);
    totalSent = Number(sentResult?.value) || 0;

    const [failedResult] = await db
      .select({ value: sum(sendJobs.failedCount) })
      .from(sendJobs);
    totalFailed = Number(failedResult?.value) || 0;

    const [recipientResult] = await db
      .select({ value: sum(sendJobs.totalRecipients) })
      .from(sendJobs);
    totalRecipients = Number(recipientResult?.value) || 0;

    const [contactResult] = await db
      .select({ value: count() })
      .from(contacts);
    totalContacts = contactResult?.value ?? 0;

    const [campaignCountResult] = await db
      .select({ value: count() })
      .from(campaigns);
    campaignCount = campaignCountResult?.value ?? 0;

    try {
      const recipientStatuses = await db
        .select({
          status: sendRecipients.status,
          count: count(),
        })
        .from(sendRecipients)
        .groupBy(sendRecipients.status);

      statusBreakdown = recipientStatuses.map((r) => ({
        status: r.status,
        count: r.count,
      }));

      totalBounced = statusBreakdown.find((s) => s.status === "bounced")?.count || 0;
      totalDelivered = statusBreakdown.find((s) => s.status === "delivered")?.count || 0;
    } catch {
      // table may not exist
    }

    const rows = await db
      .select({
        id: sendJobs.id,
        campaignName: campaigns.name,
        status: sendJobs.status,
        totalRecipients: sendJobs.totalRecipients,
        sentCount: sendJobs.sentCount,
        failedCount: sendJobs.failedCount,
        createdAt: sendJobs.createdAt,
        completedAt: sendJobs.completedAt,
      })
      .from(sendJobs)
      .leftJoin(campaigns, eq(sendJobs.campaignId, campaigns.id))
      .orderBy(sql`${sendJobs.createdAt} DESC`)
      .limit(20);

    jobHistory = rows.map((r) => ({
      ...r,
      campaignName: r.campaignName || "Unknown",
    }));
  } catch {
    // Tables may not exist yet
  }

  const deliveryRate =
    totalRecipients > 0
      ? Math.round((totalSent / totalRecipients) * 100)
      : 0;
  const bounceRate =
    totalSent > 0 ? Math.round((totalBounced / totalSent) * 100) : 0;
  const failureRate =
    totalRecipients > 0 ? Math.round((totalFailed / totalRecipients) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Newsletter delivery analytics, campaign metrics, and send history.
          </p>
        </div>
        <ReportsExportButton />
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecipients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              from {totalContacts.toLocaleString()} contacts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              across {campaignCount} campaigns
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate}%</div>
            <Progress value={deliveryRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFailed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {failureRate}% failure rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bounced</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBounced.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {bounceRate}% bounce rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recipient Status Breakdown */}
      {statusBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recipient Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {statusBreakdown.map((s) => (
                <div key={s.status} className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{s.count.toLocaleString()}</p>
                  <Badge
                    variant={
                      s.status === "delivered" || s.status === "sent"
                        ? "default"
                        : s.status === "failed" || s.status === "bounced"
                          ? "destructive"
                          : "secondary"
                    }
                    className="mt-1"
                  >
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Send History
          </CardTitle>
          <CardDescription>
            Recent send jobs with delivery metrics per campaign.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobHistory.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No sends yet. Approve and send a campaign to see delivery data.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobHistory.map((job) => {
                  const jobRate =
                    job.totalRecipients && job.totalRecipients > 0
                      ? Math.round(((job.sentCount || 0) / job.totalRecipients) * 100)
                      : 0;
                  return (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {job.campaignName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            job.status === "completed"
                              ? "default"
                              : job.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{job.totalRecipients}</TableCell>
                      <TableCell>{job.sentCount}</TableCell>
                      <TableCell>{job.failedCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={jobRate} className="w-16" />
                          <span className="text-xs text-muted-foreground">{jobRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-nowrap">
                        {format(new Date(job.createdAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
