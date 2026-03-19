import { db } from "@/lib/db";
import { segments } from "@/server/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users } from "lucide-react";
import { SegmentsGrid } from "@/components/dashboard/segments-grid";

export default async function SegmentsPage() {
  let segmentList: (typeof segments.$inferSelect)[] = [];
  try {
    segmentList = await db
      .select()
      .from(segments)
      .orderBy(sql`${segments.createdAt} DESC`);
  } catch {
    // Tables may not exist yet
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Segments</h1>
          <p className="text-muted-foreground">
            Create reusable audience filters for targeted campaigns.
          </p>
        </div>
        <Link href="/dashboard/segments/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Segment
          </Button>
        </Link>
      </div>

      {segmentList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No segments created yet.</p>
            <Link href="/dashboard/segments/new" className="mt-4">
              <Button>Create Your First Segment</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <SegmentsGrid
          segments={segmentList.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            filters: (s.filters || {}) as Record<string, string>,
            estimatedSize: s.estimatedSize ?? 0,
          }))}
        />
      )}
    </div>
  );
}
