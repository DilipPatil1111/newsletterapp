"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export function CampaignsTable({ campaigns: rows }: { campaigns: Campaign[] }) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => rows.map((c) => c.id), [rows]);
  const selectedCount = selected.size;
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const canEdit = (status: string) =>
    ["draft", "changes_requested"].includes(status);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(allIds));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  function toggleSelectAll() {
    if (allSelected) deselectAll();
    else selectAll();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete");
    }
    toast.success("Campaign deleted");
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    router.refresh();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    const res = await fetch("/api/campaigns/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete");
    }
    const data = await res.json();
    toast.success(`Deleted ${data.deleted} campaign(s)`);
    deselectAll();
    router.refresh();
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={selectAll}>
          Select all
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={deselectAll}
          disabled={selectedCount === 0}
        >
          Deselect all
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={selectedCount === 0}
          onClick={() => setBulkDeleteOpen(true)}
          className="gap-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete selected
          {selectedCount > 0 ? ` (${selectedCount})` : ""}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={
                  allSelected
                    ? true
                    : someSelected
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={() => toggleSelectAll()}
                aria-label="Select all campaigns"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell>
                <Checkbox
                  checked={selected.has(campaign.id)}
                  onCheckedChange={() => toggleOne(campaign.id)}
                  aria-label={`Select ${campaign.name}`}
                />
              </TableCell>
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
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteId(campaign.id)}
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
          title="Delete campaign?"
          description="This will remove the campaign and its related send history. This cannot be undone."
          onConfirm={() => handleDelete(deleteId)}
        />
      )}

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedCount} campaign(s)?`}
        description="Selected campaigns and their related data will be permanently removed. This cannot be undone."
        onConfirm={handleBulkDelete}
      />
    </>
  );
}
