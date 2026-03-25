/**
 * Map low-level DB/driver errors to a safe, actionable message for API clients.
 * Avoids leaking raw SQL (e.g. Neon "Failed query: select ...") in toasts.
 */
export function clientSafeDbError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (
    /Failed query:/i.test(raw) ||
    /relation ["']?[\w.]+["']? does not exist/i.test(raw) ||
    /column .+ does not exist/i.test(raw) ||
    /42703/.test(raw)
  ) {
    return "Database schema is out of date. Run: npm run db:migrate — or: npm run db:push";
  }

  if (process.env.NODE_ENV === "development") {
    return raw.length > 600 ? `${raw.slice(0, 600)}…` : raw;
  }

  return fallback;
}
