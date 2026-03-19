import { db } from "@/lib/db";
import { campaigns } from "@/server/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Send } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  pending_review: "outline",
  approved: "default",
  scheduled: "default",
  sending: "default",
  sent: "default",
  changes_requested: "destructive",
  cancelled: "destructive",
};

export default async function CampaignsPage() {
  let campaignList: (typeof campaigns.$inferSelect)[] = [];
  try {
    campaignList = await db
      .select()
      .from(campaigns)
      .orderBy(sql`${campaigns.createdAt} DESC`);
  } catch {
    // Tables may not exist yet
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Create and manage newsletter campaigns.
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          {campaignList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Send className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No campaigns yet. Create your first one.
              </p>
              <Link href="/dashboard/campaigns/new" className="mt-4">
                <Button>Create Campaign</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignList.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="hover:underline"
                      >
                        {campaign.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {campaign.subjectLine || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[campaign.status] ?? "secondary"}>
                        {campaign.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(campaign.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/campaigns/${campaign.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
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
