import { db } from "@/lib/db";
import { schedules, campaigns } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
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
import { Plus, Calendar } from "lucide-react";
import { format } from "date-fns";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleList.map((schedule) => {
                  const days = (schedule.daysOfWeek as number[]) || [];
                  return (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {schedule.campaignName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {schedule.frequency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {days.map((d) => dayNames[d]).join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        {schedule.timeOfDay} {schedule.timezone}
                      </TableCell>
                      <TableCell>
                        {schedule.nextRunAt
                          ? format(
                              new Date(schedule.nextRunAt),
                              "MMM d, yyyy HH:mm"
                            )
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            schedule.isActive ? "default" : "secondary"
                          }
                        >
                          {schedule.isActive ? "Active" : "Paused"}
                        </Badge>
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
