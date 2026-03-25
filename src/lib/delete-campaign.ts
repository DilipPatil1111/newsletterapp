import { db } from "@/lib/db";
import {
  abVariants,
  campaignApprovals,
  campaigns,
  campaignVersions,
  schedules,
  sendJobs,
  sendRecipients,
} from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Deletes a campaign and all related rows (send jobs, schedules, versions, etc.).
 */
export async function deleteCampaignCascade(campaignId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!existing) return false;

  const jobs = await db
    .select({ id: sendJobs.id })
    .from(sendJobs)
    .where(eq(sendJobs.campaignId, campaignId));
  const jobIds = jobs.map((j) => j.id);

  if (jobIds.length > 0) {
    await db
      .delete(sendRecipients)
      .where(inArray(sendRecipients.sendJobId, jobIds));
  }

  await db.delete(sendJobs).where(eq(sendJobs.campaignId, campaignId));
  await db.delete(schedules).where(eq(schedules.campaignId, campaignId));
  await db.delete(campaignApprovals).where(eq(campaignApprovals.campaignId, campaignId));
  await db.delete(campaignVersions).where(eq(campaignVersions.campaignId, campaignId));

  await db.delete(abVariants).where(eq(abVariants.campaignId, campaignId));

  await db.delete(campaigns).where(eq(campaigns.id, campaignId));
  return true;
}
