import { db } from "@/lib/db";
import { segments, contacts } from "@/server/db/schema";
import { eq, and, ilike, count, SQL } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SegmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let segment;
  try {
    const results = await db
      .select()
      .from(segments)
      .where(eq(segments.id, id))
      .limit(1);
    segment = results[0];
  } catch {
    notFound();
  }

  if (!segment) notFound();

  const filters = segment.filters as Record<string, string>;
  let matchingContacts: (typeof contacts.$inferSelect)[] = [];

  try {
    const conditions: SQL[] = [];
    if (filters.projectTraining) {
      conditions.push(ilike(contacts.projectTraining, `%${filters.projectTraining}%`));
    }
    if (filters.role) {
      conditions.push(ilike(contacts.role, `%${filters.role}%`));
    }
    if (filters.geography) {
      conditions.push(ilike(contacts.geography, `%${filters.geography}%`));
    }
    if (filters.status) {
      conditions.push(
        eq(contacts.status, filters.status as "active" | "unsubscribed" | "bounced" | "pending_review")
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    matchingContacts = await db.select().from(contacts).where(where).limit(100);
  } catch {
    // DB may not be configured
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{segment.name}</h1>
        {segment.description && (
          <p className="text-muted-foreground">{segment.description}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, val]) =>
            val ? (
              <Badge key={key} variant="secondary" className="text-sm">
                {key}: {val}
              </Badge>
            ) : null
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Matching Contacts ({matchingContacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matchingContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No contacts match these filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Geography</TableHead>
                  <TableHead>Project/Training</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchingContacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.email}</TableCell>
                    <TableCell>
                      {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>{c.role || "—"}</TableCell>
                    <TableCell>{c.geography || "—"}</TableCell>
                    <TableCell>{c.projectTraining || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
