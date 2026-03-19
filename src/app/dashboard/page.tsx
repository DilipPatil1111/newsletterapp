import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Send, Calendar, Sparkles, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function getDashboardStats() {
  try {
    const { db } = await import("@/lib/db");
    const { contacts, campaigns, sendJobs } = await import(
      "@/server/db/schema"
    );
    const { count, sql } = await import("drizzle-orm");

    const [contactCount] = await db
      .select({ value: count() })
      .from(contacts);
    const [campaignCount] = await db
      .select({ value: count() })
      .from(campaigns);
    const [jobCount] = await db.select({ value: count() }).from(sendJobs);

    const recentCampaigns = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        createdAt: campaigns.createdAt,
      })
      .from(campaigns)
      .orderBy(sql`${campaigns.createdAt} DESC`)
      .limit(5);

    return {
      stats: {
        contacts: contactCount?.value ?? 0,
        campaigns: campaignCount?.value ?? 0,
        sendJobs: jobCount?.value ?? 0,
      },
      recentCampaigns,
    };
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return {
      stats: { contacts: 0, campaigns: 0, sendJobs: 0 },
      recentCampaigns: [] as {
        id: string;
        name: string;
        status: string;
        createdAt: Date;
      }[],
    };
  }
}

export default async function DashboardPage() {
  await auth();

  const { stats, recentCampaigns } = await getDashboardStats();

  const statCards = [
    {
      label: "Total Contacts",
      value: stats.contacts,
      icon: Users,
      href: "/dashboard/contacts",
    },
    {
      label: "Newsletters Sent",
      value: stats.campaigns,
      icon: Send,
      href: "/dashboard/campaigns",
    },
    {
      label: "Send Jobs",
      value: stats.sendJobs,
      icon: Calendar,
      href: "/dashboard/reports",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to the Intellee Newsletter platform.
          </p>
        </div>
        <Link href="/dashboard/newsletters/create">
          <Button size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Create Newsletter
          </Button>
        </Link>
      </div>

      {/* Hero Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">AI-Powered Newsletter Creation</h2>
            <p className="text-muted-foreground">
              Enter any course name and our AI will research the latest trends, salary data,
              career opportunities, and generate a complete newsletter — ready to review and send.
            </p>
          </div>
          <Link href="/dashboard/newsletters/create">
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" /> Get Started
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.label}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Newsletters</CardTitle>
            <Link href="/dashboard/campaigns">
              <Button size="sm" variant="outline">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No newsletters sent yet. Create your first one to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/campaigns/${c.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <span className="font-medium">{c.name}</span>
                    <Badge variant="secondary">{c.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/dashboard/newsletters/create">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Sparkles className="h-4 w-4" />
                Create AI Newsletter
              </Button>
            </Link>
            <Link href="/dashboard/contacts/new">
              <Button variant="outline" className="w-full justify-start gap-2">
                <PlusCircle className="h-4 w-4" />
                Add Contact
              </Button>
            </Link>
            <Link href="/dashboard/contacts/import">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Import Contacts
              </Button>
            </Link>
            <Link href="/dashboard/contacts">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Manage Contacts
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
