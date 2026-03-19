"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Globe, Upload, Loader2 } from "lucide-react";

type ParsedContact = {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  role?: string;
  geography?: string;
  projectTraining?: string;
  selected: boolean;
};

export default function ImportContactsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("csv");
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exaQuery, setExaQuery] = useState("");
  const [exaRole, setExaRole] = useState("");
  const [exaGeography, setExaGeography] = useState("");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/contacts/parse", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to parse file");
      const data = await res.json();
      setParsedContacts(
        data.contacts.map((c: Omit<ParsedContact, "selected">) => ({
          ...c,
          selected: true,
        }))
      );
      toast.success(`Parsed ${data.contacts.length} contacts from file`);
    } catch {
      toast.error("Failed to parse file. Check format and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExaSearch() {
    if (!exaQuery.trim()) {
      toast.error("Enter a search query");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contacts/exa-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: exaQuery,
          role: exaRole,
          geography: exaGeography,
        }),
      });
      if (!res.ok) throw new Error("Exa search failed");
      const data = await res.json();
      setParsedContacts(
        data.contacts.map((c: Omit<ParsedContact, "selected">) => ({
          ...c,
          selected: true,
        }))
      );
      toast.success(`Found ${data.contacts.length} contacts from Exa`);
    } catch {
      toast.error("Exa search failed. Check your API key and try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleContact(idx: number) {
    setParsedContacts((prev) =>
      prev.map((c, i) =>
        i === idx ? { ...c, selected: !c.selected } : c
      )
    );
  }

  function toggleAll() {
    const allSelected = parsedContacts.every((c) => c.selected);
    setParsedContacts((prev) =>
      prev.map((c) => ({ ...c, selected: !allSelected }))
    );
  }

  async function handleImport() {
    const selected = parsedContacts.filter((c) => c.selected);
    if (selected.length === 0) {
      toast.error("Select at least one contact to import");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: selected,
          source: activeTab === "exa" ? "exa_api" : activeTab === "pdf" ? "pdf" : "csv",
        }),
      });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();
      toast.success(`Imported ${data.imported} contacts successfully`);
      router.push("/dashboard/contacts");
      router.refresh();
    } catch {
      toast.error("Failed to import contacts");
    } finally {
      setImporting(false);
    }
  }

  const selectedCount = parsedContacts.filter((c) => c.selected).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Contacts</h1>
        <p className="text-muted-foreground">
          Upload files or search via Exa API to import contacts.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="csv" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Excel / CSV
          </TabsTrigger>
          <TabsTrigger value="pdf" className="gap-2">
            <FileText className="h-4 w-4" /> PDF
          </TabsTrigger>
          <TabsTrigger value="exa" className="gap-2">
            <Globe className="h-4 w-4" /> Exa API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv">
          <Card>
            <CardHeader>
              <CardTitle>Upload Excel or CSV File</CardTitle>
              <CardDescription>
                Upload a .csv or .xlsx file with email addresses. The system
                will automatically map columns like email, first name, last name,
                role, geography, and project/training.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csvFile">Choose File</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                </div>
                {loading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Parsing file...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdf">
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF File</CardTitle>
              <CardDescription>
                Upload a text-based PDF. The system will extract email addresses
                and any associated metadata it can find.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pdfFile">Choose PDF</Label>
                  <Input
                    id="pdfFile"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                </div>
                {loading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Extracting emails from PDF...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exa">
          <Card>
            <CardHeader>
              <CardTitle>Search via Exa API</CardTitle>
              <CardDescription>
                Search the web for contact information using Exa AI. Enter
                your project/training query and optional filters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="exaQuery">
                    Search Query (Project/Training)
                  </Label>
                  <Input
                    id="exaQuery"
                    value={exaQuery}
                    onChange={(e) => setExaQuery(e.target.value)}
                    placeholder="e.g. Data Science Training professionals India"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="exaRole">Target Role</Label>
                    <Input
                      id="exaRole"
                      value={exaRole}
                      onChange={(e) => setExaRole(e.target.value)}
                      placeholder="e.g. HR Manager, CTO"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exaGeo">Geography</Label>
                    <Input
                      id="exaGeo"
                      value={exaGeography}
                      onChange={(e) => setExaGeography(e.target.value)}
                      placeholder="e.g. India, Mumbai"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleExaSearch}
                  disabled={loading}
                  className="gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  Search Exa
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {parsedContacts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Preview ({parsedContacts.length} found)</CardTitle>
              <CardDescription>
                Review and select contacts to import. {selectedCount} selected.
              </CardDescription>
            </div>
            <Button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="gap-2"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import {selectedCount} Contacts
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={parsedContacts.every((c) => c.selected)}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Geography</TableHead>
                  <TableHead>Project/Training</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedContacts.map((contact, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Checkbox
                        checked={contact.selected}
                        onCheckedChange={() => toggleContact(idx)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {contact.email}
                    </TableCell>
                    <TableCell>{contact.firstName || "—"}</TableCell>
                    <TableCell>{contact.lastName || "—"}</TableCell>
                    <TableCell>{contact.role || "—"}</TableCell>
                    <TableCell>{contact.geography || "—"}</TableCell>
                    <TableCell>{contact.projectTraining || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
