import { db } from "@/lib/db";
import { schedules, campaigns } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Calendar } from "lucide-react";
import { SchedulesTable } from "@/components/dashboard/schedules-table";

export default async function SchedulesPage() {
  let scheduleList: {
    id: string;
    campaignName: string;
    frequency: string;
    daysOfWeek: unknown;
    timeOfDay: string;
    timezone: string;
    nextRunAt: Date | null;
    isActive: boolean;
  }[] = [];

  try {
    const rows = await db
      .select({
        id: schedules.id,
        campaignName: campaigns.name,
        frequency: schedules.frequency,
        daysOfWeek: schedules.daysOfWeek,
        timeOfDay: schedules.timeOfDay,
        timezone: schedules.timezone,
        nextRunAt: schedules.nextRunAt,
        isActive: schedules.isActive,
      })
      .from(schedules)
      .leftJoin(campaigns, eq(schedules.campaignId, campaigns.id))
      .orderBy(sql`${schedules.createdAt} DESC`);

    scheduleList = rows.map((r) => ({
      ...r,
      campaignName: r.campaignName || "Unknown",
    }));
  } catch {
    // Tables may not exist yet
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedules</h1>
          <p className="text-muted-foreground">
            Manage recurring newsletter send schedules.
          </p>
        </div>
        <Link href="/dashboard/schedules/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Schedule
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          {scheduleList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No schedules set up yet.
              </p>
              <Link href="/dashboard/schedules/new" className="mt-4">
                <Button>Create Schedule</Button>
              </Link>
            </div>
          ) : (
            <SchedulesTable
              schedules={scheduleList.map((s) => ({
                id: s.id,
                campaignName: s.campaignName,
                frequency: s.frequency,
                daysOfWeek: (s.daysOfWeek as number[]) || [],
                timeOfDay: s.timeOfDay,
                timezone: s.timezone,
                nextRunAt: s.nextRunAt,
                isActive: s.isActive,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
