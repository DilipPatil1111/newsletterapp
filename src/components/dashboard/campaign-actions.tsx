"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Send,
  Clock,
  Loader2,
  MessageSquare,
} from "lucide-react";

interface CampaignActionsProps {
  campaignId: string;
  status: string;
}

export function CampaignActions({ campaignId, status }: CampaignActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<
    "approved" | "changes_requested" | "rejected"
  >("approved");

  async function handleAction(action: string) {
    setLoading(action);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(
        action === "submit"
          ? "Campaign submitted for review"
          : action === "send_test"
            ? "Test email sent"
            : action === "send_now"
              ? "Campaign is sending"
              : "Action completed"
      );
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleReview() {
    setLoading("review");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: reviewAction,
          comments: reviewComments,
        }),
      });
      if (!res.ok) throw new Error("Review failed");
      toast.success(
        reviewAction === "approved"
          ? "Campaign approved"
          : "Changes requested"
      );
      setShowReviewDialog(false);
      router.refresh();
    } catch {
      toast.error("Review failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "draft" || status === "changes_requested") && (
        <Button
          variant="outline"
          onClick={() => handleAction("submit")}
          disabled={loading !== null}
          className="gap-2"
        >
          {loading === "submit" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          Submit for Review
        </Button>
      )}

      {status === "pending_review" && (
        <>
          <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setReviewAction("approved")}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Review & Approve
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Review Campaign</DialogTitle>
                <DialogDescription>
                  Approve the campaign for sending or request changes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-2">
                  <Button
                    variant={
                      reviewAction === "approved" ? "default" : "outline"
                    }
                    onClick={() => setReviewAction("approved")}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    variant={
                      reviewAction === "changes_requested"
                        ? "destructive"
                        : "outline"
                    }
                    onClick={() => setReviewAction("changes_requested")}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" /> Request Changes
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comments">Comments</Label>
                  <Textarea
                    id="comments"
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="Add review comments..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleReview}
                  disabled={loading !== null}
                  variant={
                    reviewAction === "approved" ? "default" : "destructive"
                  }
                >
                  {loading === "review" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {reviewAction === "approved"
                    ? "Approve Campaign"
                    : "Request Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {status === "approved" && (
        <>
          <Button
            variant="outline"
            onClick={() => handleAction("send_test")}
            disabled={loading !== null}
            className="gap-2"
          >
            {loading === "send_test" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Test
          </Button>
          <Button
            onClick={() => handleAction("send_now")}
            disabled={loading !== null}
            className="gap-2"
          >
            {loading === "send_now" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Now
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              router.push(`/dashboard/schedules/new?campaignId=${campaignId}`)
            }
            className="gap-2"
          >
            <Clock className="h-4 w-4" />
            Schedule
          </Button>
        </>
      )}
    </div>
  );
}
