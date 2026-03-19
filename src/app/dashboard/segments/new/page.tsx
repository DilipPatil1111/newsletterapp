"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";

export default function NewSegmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectTraining, setProjectTraining] = useState("");
  const [role, setRole] = useState("");
  const [geography, setGeography] = useState("");
  const [status, setStatus] = useState("active");

  const filters = {
    ...(projectTraining && { projectTraining }),
    ...(role && { role }),
    ...(geography && { geography }),
    ...(status && { status }),
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (Object.keys(filters).length === 0) {
        setEstimatedSize(null);
        return;
      }
      setEstimating(true);
      try {
        const res = await fetch("/api/segments/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        });
        if (res.ok) {
          const data = await res.json();
          setEstimatedSize(data.count);
        }
      } catch {
        // ignore
      } finally {
        setEstimating(false);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectTraining, role, geography, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Segment name is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          filters,
          estimatedSize: estimatedSize ?? 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to create segment");
      toast.success("Segment created");
      router.push("/dashboard/segments");
      router.refresh();
    } catch {
      toast.error("Failed to create segment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Segment</h1>
        <p className="text-muted-foreground">
          Define audience filters for targeted newsletters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Segment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Segment Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Indian HR Managers for Data Science"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe who this segment targets..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="projectTraining">Project / Training</Label>
                <Input
                  id="projectTraining"
                  value={projectTraining}
                  onChange={(e) => setProjectTraining(e.target.value)}
                  placeholder="e.g. Data Science"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Target Role</Label>
                <Input
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. HR Manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="geography">Geography</Label>
                <Input
                  id="geography"
                  value={geography}
                  onChange={(e) => setGeography(e.target.value)}
                  placeholder="e.g. India"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Contact Status</Label>
                <Input
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="active"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium">Estimated audience: </span>
                {estimating ? (
                  <Loader2 className="inline h-4 w-4 animate-spin" />
                ) : estimatedSize !== null ? (
                  <Badge variant="secondary">{estimatedSize} contacts</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Add filters to estimate
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Segment"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
