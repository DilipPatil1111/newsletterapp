import { db } from "@/lib/db";
import { segments } from "@/server/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users } from "lucide-react";

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {segmentList.map((segment) => {
            const filters = segment.filters as Record<string, string>;
            return (
              <Link
                key={segment.id}
                href={`/dashboard/segments/${segment.id}`}
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">{segment.name}</CardTitle>
                    {segment.description && (
                      <p className="text-sm text-muted-foreground">
                        {segment.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(filters).map(([key, val]) =>
                        val ? (
                          <Badge key={key} variant="secondary">
                            {key}: {val}
                          </Badge>
                        ) : null
                      )}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      ~{segment.estimatedSize} contacts
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
