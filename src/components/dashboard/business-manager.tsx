"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import type { BusinessConfig } from "@/lib/businesses";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FormState = {
  slug: string;
  name: string;
};

const emptyForm: FormState = {
  slug: "",
  name: "",
};

export function BusinessManager({ onChanged }: { onChanged?: () => void }) {
  const [list, setList] = useState<BusinessConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<BusinessConfig | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/businesses");
      const data = await res.json();
      setList(data.businesses || []);
    } catch {
      toast.error("Failed to load businesses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(b: BusinessConfig) {
    setEditing(b);
    setForm({
      slug: b.slug,
      name: b.name,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Business name is required");
      return;
    }
    if (!editing && !form.slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    const payload: Record<string, string> = {
      name: form.name.trim(),
    };
    if (!editing) {
      payload.slug = form.slug.trim();
    }

    setSaving(true);
    try {
      if (editing && UUID_RE.test(editing.id)) {
        const res = await fetch(`/api/businesses/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const errJson = !res.ok ? await res.json().catch(() => ({})) : {};
        if (!res.ok) {
          throw new Error(
            typeof errJson.error === "string" ? errJson.error : "Update failed"
          );
        }
        toast.success("Business updated");
      } else if (editing) {
        const res = await fetch("/api/businesses/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: editing.slug,
            name: payload.name,
          }),
        });
        const errJson = !res.ok ? await res.json().catch(() => ({})) : {};
        if (!res.ok) {
          throw new Error(
            typeof errJson.error === "string" ? errJson.error : "Save failed"
          );
        }
        toast.success("Override saved");
      } else {
        const res = await fetch("/api/businesses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: payload.slug!,
            name: payload.name,
          }),
        });
        const errJson = !res.ok ? await res.json().catch(() => ({})) : {};
        if (!res.ok) {
          throw new Error(
            typeof errJson.error === "string" ? errJson.error : "Failed"
          );
        }
        toast.success("Business created");
      }

      setDialogOpen(false);
      await load();
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(b: BusinessConfig) {
    if (!UUID_RE.test(b.id)) {
      toast.error(
        "Built-in businesses cannot be deleted. Remove a saved override in the database from Settings → DB, or edit and save an override first."
      );
      return;
    }
    if (!confirm(`Delete "${b.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/businesses/${b.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Business deleted");
      await load();
      onChanged?.();
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Add a business with a <strong>name</strong> and <strong>slug</strong>. Topic name,
          organization, and AI context are set when you create a newsletter.
        </p>
        <Button type="button" size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Add business
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((b) => (
              <TableRow key={b.slug}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell className="font-mono text-xs">{b.slug}</TableCell>
                <TableCell>
                  {UUID_RE.test(b.id) ? (
                    <Badge variant="secondary">Custom / override</Badge>
                  ) : (
                    <Badge variant="outline">Built-in</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(b)}
                    disabled={!UUID_RE.test(b.id)}
                    title={
                      UUID_RE.test(b.id)
                        ? "Delete"
                        : "Delete DB row only (built-ins use Upsert to override)"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit business" : "New business"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {!editing && (
              <div className="space-y-2">
                <Label>Slug (unique, lowercase)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                    }))
                  }
                  placeholder="my_company"
                />
              </div>
            )}
            {editing && (
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} disabled className="font-mono" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Business / organization name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Editing a built-in business saves an override in the database. Deleting that row
              restores the default.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
