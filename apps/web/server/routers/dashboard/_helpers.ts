import { logger } from "@/lib/logger";

// ─── Helpers ──────────────────────────────────────────────────────────────

export function pctChange(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / Math.abs(prev)) * 100;
}

export const filingTypeLabels: Record<string, string> = {
  vat: "VAT Return Due",
  paye: "PAYE Return Due",
  withholding: "Withholding Tax Due",
  corporate_tax: "Corporate Tax Due",
  social_security: "SSNIT Due",
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Fills the trailing N-month window (index 0 = N months back, last = current)
// from a single GROUP BY-month query — the replacement for the old
// per-month-query sparkline loops (7 round-trips × 3 series = 21 queries).
export function fillMonthlyWindow(
  rows: Array<{ month: string | null; total: string | null }>,
  monthsBack: number,
  now: Date,
): number[] {
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    if (r.month) byMonth.set(r.month, parseFloat(r.total ?? "0"));
  }
  const out: number[] = [];
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push(byMonth.get(key) ?? 0);
  }
  return out;
}

// ─── Safe query helper ────────────────────────────────────────────────────
// Wraps a DB query in try/catch so a single failing table doesn't crash the
// entire dashboard endpoint. Returns the fallback on error.

export async function safeQuery<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.warn({ err, query: label }, `Dashboard query failed: ${label}`);
    return fallback;
  }
}
