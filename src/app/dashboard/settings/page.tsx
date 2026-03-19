import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const integrations = [
    {
      name: "Clerk Authentication",
      description: "User authentication and role management",
      configured: !!process.env.CLERK_SECRET_KEY,
    },
    {
      name: "Neon Database",
      description: "PostgreSQL database for all app data",
      configured: !!process.env.DATABASE_URL,
    },
    {
      name: "Resend Email",
      description: "Transactional email delivery",
      configured: !!process.env.RESEND_API_KEY,
    },
    {
      name: "Exa API",
      description: "Web-based contact discovery",
      configured: !!process.env.EXA_API_KEY,
    },
    {
      name: "Cron Secret",
      description: "Scheduled send job authorization",
      configured: !!process.env.CRON_SECRET,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Integration status and configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Status of external service connections. Set environment variables to
            configure each integration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <h3 className="font-medium">{integration.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                </div>
                {integration.configured ? (
                  <Badge className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Not Configured
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Sending</CardTitle>
          <CardDescription>
            To enable automated sending, add a Vercel Cron job that calls:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <code className="block rounded-lg bg-muted p-4 text-sm">
            GET /api/cron/send
            <br />
            Authorization: Bearer {"<CRON_SECRET>"}
          </code>
          <p className="mt-3 text-sm text-muted-foreground">
            Configure this in your <code>vercel.json</code> to run every 5
            minutes for near-realtime schedule processing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
