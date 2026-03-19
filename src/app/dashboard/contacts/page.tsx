import { db } from "@/lib/db";
import { contacts } from "@/server/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Plus, Pencil } from "lucide-react";
import { DeleteContactButton } from "@/components/dashboard/delete-contact-button";

export default async function ContactsPage() {
  let contactList: (typeof contacts.$inferSelect)[] = [];
  try {
    contactList = await db
      .select()
      .from(contacts)
      .orderBy(sql`${contacts.createdAt} DESC`)
      .limit(100);
  } catch {
    // Tables may not exist yet
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your newsletter recipients. Add, edit, or remove contacts.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/contacts/import">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" /> Import
            </Button>
          </Link>
          <Link href="/dashboard/contacts/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Contact
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contacts ({contactList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {contactList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No contacts yet.</p>
              <div className="mt-4 flex gap-2">
                <Link href="/dashboard/contacts/new">
                  <Button>Add Contact</Button>
                </Link>
                <Link href="/dashboard/contacts/import">
                  <Button variant="outline">Import Contacts</Button>
                </Link>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Geography</TableHead>
                  <TableHead>Project/Training</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contactList.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      {contact.email}
                    </TableCell>
                    <TableCell>
                      {[contact.firstName, contact.lastName]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </TableCell>
                    <TableCell>{contact.role || "—"}</TableCell>
                    <TableCell>{contact.geography || "—"}</TableCell>
                    <TableCell>{contact.projectTraining || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          contact.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {contact.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/contacts/${contact.id}/edit`}
                        >
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <DeleteContactButton
                          contactId={contact.id}
                          email={contact.email}
                        />
                      </div>
                    </TableCell>
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
