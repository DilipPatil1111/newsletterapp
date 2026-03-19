import { db } from "@/lib/db";
import { campaigns } from "@/server/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Send } from "lucide-react";
import { CampaignsTable } from "@/components/dashboard/campaigns-table";

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
            <CampaignsTable
              campaigns={campaignList.map((c) => ({
                id: c.id,
                name: c.name,
                subjectLine: c.subjectLine,
                status: c.status,
                createdAt: c.createdAt,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
