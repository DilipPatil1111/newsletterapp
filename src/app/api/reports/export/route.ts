import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendJobs, campaigns } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { format } from "date-fns";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db
      .select({
        id: sendJobs.id,
        campaignName: campaigns.name,
        status: sendJobs.status,
        totalRecipients: sendJobs.totalRecipients,
        sentCount: sendJobs.sentCount,
        failedCount: sendJobs.failedCount,
        createdAt: sendJobs.createdAt,
        completedAt: sendJobs.completedAt,
      })
      .from(sendJobs)
      .leftJoin(campaigns, eq(sendJobs.campaignId, campaigns.id))
      .orderBy(sql`${sendJobs.createdAt} DESC`)
      .limit(500);

    const headers = [
      "Campaign",
      "Status",
      "Total Recipients",
      "Sent",
      "Failed",
      "Delivery Rate %",
      "Created",
      "Completed",
    ];

    const csvRows = [
      headers.join(","),
      ...rows.map((r) => {
        const rate =
          r.totalRecipients && r.totalRecipients > 0
            ? Math.round(((r.sentCount || 0) / r.totalRecipients) * 100)
            : 0;
        return [
          `"${(r.campaignName || "Unknown").replace(/"/g, '""')}"`,
          r.status,
          r.totalRecipients ?? "",
          r.sentCount ?? "",
          r.failedCount ?? "",
          rate,
          r.createdAt ? format(new Date(r.createdAt), "yyyy-MM-dd HH:mm") : "",
          r.completedAt ? format(new Date(r.completedAt), "yyyy-MM-dd HH:mm") : "",
        ].join(",");
      }),
    ];

    const csv = csvRows.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="reports-export-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      },
    });
  } catch (error) {
    console.error("Reports export error:", error);
    return NextResponse.json(
      { error: "Failed to export reports" },
      { status: 500 }
    );
  }
}
