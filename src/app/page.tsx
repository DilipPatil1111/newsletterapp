import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mail, BarChart3, Users, Calendar } from "lucide-react";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6" />
            <span className="text-xl font-bold">Intellee Newsletter</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Send targeted newsletters to{" "}
            <span className="text-primary/70">Intellee customers</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Import contacts, segment your audience, design with Canva templates,
            and schedule automated newsletter delivery — all from one dashboard.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg">Start Sending Newsletters</Button>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-24 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Users,
              title: "Import Contacts",
              desc: "Upload Excel, CSV, PDF files or pull emails from Exa API",
            },
            {
              icon: BarChart3,
              title: "Segment Audiences",
              desc: "Filter by project, role, geography for targeted sends",
            },
            {
              icon: Mail,
              title: "Canva Templates",
              desc: "Choose from branded Canva designs for each campaign",
            },
            {
              icon: Calendar,
              title: "Schedule & Send",
              desc: "Set recurring schedules like every Friday at 3 PM",
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-lg border p-6">
              <feature.icon className="mb-3 h-8 w-8 text-primary/70" />
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Intellee College Newsletter Platform
      </footer>
    </div>
  );
}
