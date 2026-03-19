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

type Campaign = {
  id: string;
  name: string;
  subjectLine: string | null;
  status: string;
  createdAt: Date;
};

export function CampaignsTable({ campaigns }: { campaigns: Campaign[] }) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canEdit = (status: string) =>
    ["draft", "changes_requested"].includes(status);
  const canDelete = (status: string) =>
    ["draft", "cancelled", "changes_requested"].includes(status);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete");
    }
    toast.success("Campaign deleted");
    router.refresh();
  }

  return (
    <>
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
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/dashboard/campaigns/${campaign.id}`}
                  className="hover:underline"
                >
                  {campaign.name}
                </Link>
              </TableCell>
              <TableCell>{campaign.subjectLine || "—"}</TableCell>
              <TableCell>
                <Badge variant={statusColors[campaign.status] ?? "secondary"}>
                  {campaign.status.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell>
                {format(new Date(campaign.createdAt), "MMM d, yyyy")}
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
                      <Link href={`/dashboard/campaigns/${campaign.id}`}>
                        View
                      </Link>
                    </DropdownMenuItem>
                    {canEdit(campaign.status) && (
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {canDelete(campaign.status) && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(campaign.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
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
          title="Delete campaign?"
          description="This action cannot be undone."
          onConfirm={() => handleDelete(deleteId)}
        />
      )}
    </>
  );
}
