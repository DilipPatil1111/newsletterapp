import { db } from "@/lib/db";
import { businesses } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { DEFAULT_BUSINESSES, type BusinessConfig } from "@/lib/businesses";

export function rowToConfig(row: typeof businesses.$inferSelect): BusinessConfig {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    fieldLabel1: row.fieldLabel1,
    fieldLabel2: row.fieldLabel2,
    placeholder1: row.placeholder1 ?? "",
    placeholder2: row.placeholder2 ?? "",
    defaultAddress: row.defaultAddress ?? "",
    defaultPhone: row.defaultPhone ?? "",
    defaultWebsiteUrl: row.defaultWebsiteUrl ?? "",
    defaultContactEmail: row.defaultContactEmail ?? "",
    generatePromptContext: row.generatePromptContext,
  };
}

export async function getAllBusinessesMerged(): Promise<BusinessConfig[]> {
  let rows: (typeof businesses.$inferSelect)[] = [];
  try {
    rows = await db.select().from(businesses).orderBy(asc(businesses.name));
  } catch {
    return [...DEFAULT_BUSINESSES];
  }
  const defaultSlugs = new Set(DEFAULT_BUSINESSES.map((b) => b.slug));
  const merged: BusinessConfig[] = DEFAULT_BUSINESSES.map((d) => {
    const override = rows.find((r) => r.slug === d.slug);
    return override ? rowToConfig(override) : d;
  });
  const extras = rows
    .filter((r) => !defaultSlugs.has(r.slug))
    .map(rowToConfig);
  return [...merged, ...extras];
}

export async function resolveBusinessBySlug(
  slug: string
): Promise<BusinessConfig | undefined> {
  try {
    const [row] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.slug, slug))
      .limit(1);
    if (row) return rowToConfig(row);
  } catch {
    // table missing
  }
  return DEFAULT_BUSINESSES.find((b) => b.slug === slug);
}
