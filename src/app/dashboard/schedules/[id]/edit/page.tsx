"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type CampaignOption = { id: string; name: string; status: string };

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function EditSchedulePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [selectedDays, setSelectedDays] = useState<number[]>([5]);
  const [timeOfDay, setTimeOfDay] = useState("15:00");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/schedules/${id}`).then((r) => r.json()),
      fetch("/api/campaigns/list").then((r) => r.json()),
    ]).then(([scheduleRes, campaignsRes]) => {
      if (scheduleRes.schedule) {
        const s = scheduleRes.schedule;
        setCampaignId(s.campaignId);
        setFrequency(s.frequency || "weekly");
        setSelectedDays((s.daysOfWeek as number[]) || [5]);
        setTimeOfDay(s.timeOfDay || "15:00");
        setTimezone(s.timezone || "Asia/Kolkata");
        setIsActive(s.isActive ?? true);
      }
      setCampaigns(campaignsRes.campaigns || []);
    }).catch(() => toast.error("Failed to load schedule"))
    .finally(() => setLoading(false));
  }, [id]);

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignId) {
      toast.error("Select a campaign");
      return;
    }
    if (frequency !== "once" && selectedDays.length === 0) {
      toast.error("Select at least one day");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          frequency,
          daysOfWeek: frequency === "once" ? [] : selectedDays,
          timeOfDay,
          timezone,
          isActive,
        }),
      });
      if (!res.ok) throw new Error("Failed to update schedule");
      toast.success("Schedule updated");
      router.push("/dashboard/schedules");
      router.refresh();
    } catch {
      toast.error("Failed to update schedule");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Schedule</h1>
        <p className="text-muted-foreground">
          Update the recurring send schedule.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign</CardTitle>
            <CardDescription>
              Only approved campaigns can be scheduled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="Select campaign..." />
              </SelectTrigger>
              <SelectContent>
                {campaigns
                  .filter((c) => c.status === "approved")
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">One-time</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {frequency !== "once" && (
              <div className="space-y-2">
                <Label>Days of the Week</Label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {DAYS.map((day) => (
                    <label
                      key={day.value}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedDays.includes(day.value)}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <span>{day.label.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timeOfDay">Time of Day</Label>
                <Input
                  id="timeOfDay"
                  type="time"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={isActive}
                onCheckedChange={(c) => setIsActive(!!c)}
              />
              <span>Active</span>
            </label>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
