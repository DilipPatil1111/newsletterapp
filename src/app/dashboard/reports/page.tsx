import { db } from "@/lib/db";
import {
  sendJobs,
  sendRecipients,
  campaigns,
  contacts,
} from "@/server/db/schema";
import { eq, count, sql, sum } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Send, CheckCircle, XCircle, Users } from "lucide-react";

export default async function ReportsPage() {
  let totalSent = 0;
  let totalFailed = 0;
  let totalRecipients = 0;
  let totalContacts = 0;
  let jobHistory: {
    id: string;
    campaignName: string;
    status: string;
    totalRecipients: number | null;
    sentCount: number | null;
    failedCount: number | null;
    createdAt: Date;
  }[] = [];

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

    const rows = await db
      .select({
        id: sendJobs.id,
        campaignName: campaigns.name,
        status: sendJobs.status,
        totalRecipients: sendJobs.totalRecipients,
        sentCount: sendJobs.sentCount,
        failedCount: sendJobs.failedCount,
        createdAt: sendJobs.createdAt,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          Newsletter delivery analytics and send history.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Recipients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecipients}</div>
            <p className="text-xs text-muted-foreground">
              from {totalContacts} contacts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Emails Sent
            </CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFailed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Delivery Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate}%</div>
            <Progress value={deliveryRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send History</CardTitle>
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
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobHistory.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      {job.campaignName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          job.status === "completed"
                            ? "default"
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
                      {format(
                        new Date(job.createdAt),
                        "MMM d, yyyy HH:mm"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
