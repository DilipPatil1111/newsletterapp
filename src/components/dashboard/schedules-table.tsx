"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Schedule = {
  id: string;
  campaignName: string;
  frequency: string;
  daysOfWeek: number[];
  timeOfDay: string;
  timezone: string;
  nextRunAt: Date | null;
  isActive: boolean;
};

export function SchedulesTable({ schedules }: { schedules: Schedule[] }) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    toast.success("Schedule deleted");
    router.refresh();
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Next Run</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell className="font-medium">{schedule.campaignName}</TableCell>
              <TableCell>
                <Badge variant="secondary">{schedule.frequency}</Badge>
              </TableCell>
              <TableCell>
                {(schedule.daysOfWeek || [])
                  .map((d) => dayNames[d])
                  .filter(Boolean)
                  .join(", ") || "—"}
              </TableCell>
              <TableCell>
                {schedule.timeOfDay} {schedule.timezone}
              </TableCell>
              <TableCell>
                {schedule.nextRunAt
                  ? format(new Date(schedule.nextRunAt), "MMM d, yyyy HH:mm")
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={schedule.isActive ? "default" : "secondary"}>
                  {schedule.isActive ? "Active" : "Paused"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/schedules/${schedule.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteId(schedule.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {deleteId && (
        <DeleteConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title="Delete schedule?"
          description="This will remove the schedule. The campaign will be set back to approved."
          onConfirm={() => handleDelete(deleteId)}
        />
      )}
    </>
  );
}
