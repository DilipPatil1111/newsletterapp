import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function normalizeHeader(h: string): string {
  const lower = h.toLowerCase().trim().replace(/[\s_-]+/g, "");
  if (lower.includes("email") || lower.includes("mail")) return "email";
  if (lower.includes("firstname") || lower === "first") return "firstName";
  if (lower.includes("lastname") || lower === "last") return "lastName";
  if (lower.includes("company") || lower.includes("org")) return "company";
  if (lower.includes("role") || lower.includes("title") || lower.includes("designation"))
    return "role";
  if (lower.includes("geo") || lower.includes("location") || lower.includes("city") || lower.includes("country"))
    return "geography";
  if (lower.includes("project") || lower.includes("training") || lower.includes("course"))
    return "projectTraining";
  return lower;
}

function parseCSVOrExcel(buffer: Buffer, fileName: string) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
  });

  if (rawRows.length === 0) return [];

  const headerMap: Record<string, string> = {};
  const originalHeaders = Object.keys(rawRows[0]);
  for (const h of originalHeaders) {
    headerMap[h] = normalizeHeader(h);
  }

  const contacts = rawRows
    .map((row) => {
      const mapped: Record<string, string> = {};
      for (const [orig, norm] of Object.entries(headerMap)) {
        if (row[orig]) mapped[norm] = String(row[orig]).trim();
      }
      return mapped;
    })
    .filter((row) => row.email && EMAIL_REGEX.test(row.email))
    .map((row) => ({
      email: row.email.toLowerCase(),
      firstName: row.firstName || undefined,
      lastName: row.lastName || undefined,
      company: row.company || undefined,
      role: row.role || undefined,
      geography: row.geography || undefined,
      projectTraining: row.projectTraining || undefined,
    }));

  const unique = new Map<string, (typeof contacts)[0]>();
  for (const c of contacts) {
    if (!unique.has(c.email)) unique.set(c.email, c);
  }
  return Array.from(unique.values());
}

async function parsePDF(buffer: Buffer) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(buffer);
  const text = data.text;

  const emails = text.match(EMAIL_REGEX) || [];
  const unique = [...new Set(emails.map((e: string) => e.toLowerCase()))];

  return unique.map((email: string) => ({ email }));
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();

    let contacts;
    if (fileName.endsWith(".pdf")) {
      contacts = await parsePDF(buffer);
    } else {
      contacts = parseCSVOrExcel(buffer, fileName);
    }

    return NextResponse.json({ contacts, total: contacts.length });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse file" },
      { status: 500 }
    );
  }
}
