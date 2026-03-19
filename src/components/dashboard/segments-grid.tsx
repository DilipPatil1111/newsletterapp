"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/dashboard/delete-confirm-dialog";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Segment = {
  id: string;
  name: string;
  description: string | null;
  filters: Record<string, string>;
  estimatedSize: number;
};

export function SegmentsGrid({ segments }: { segments: Segment[] }) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/segments/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    toast.success("Segment deleted");
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {segments.map((segment) => {
          const filters = segment.filters || {};
          return (
            <Card
              key={segment.id}
              className="transition-shadow hover:shadow-md relative group"
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/segments/${segment.id}`}>
                        View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/segments/${segment.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteId(segment.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Link href={`/dashboard/segments/${segment.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg pr-8">{segment.name}</CardTitle>
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
              </Link>
            </Card>
          );
        })}
      </div>

      {deleteId && (
        <DeleteConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title="Delete segment?"
          description="This action cannot be undone."
          onConfirm={() => handleDelete(deleteId)}
        />
      )}
    </>
  );
}
