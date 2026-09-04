import { z } from "zod";

// ─── Money ──────────────────────────────────────────────────────────────────
// Money crosses the API boundary as strings (schema numeric(15,2) columns are
// returned as text). Every boundary must reject signs, exponents, commas and
// junk BEFORE parseFloat is ever called — parseFloat("abc") → NaN, parseFloat
// ("-50") passes a > 0 guard, etc. Regex keeps us at ≤ 2dp and inside the
// numeric(15,2) integer range (13 whole digits).

export const MONEY_RE = /^\d{1,13}(\.\d{1,2})?$/;

export function isValidMoney(value: string): boolean {
  return MONEY_RE.test(value);
}

/** Whole-amount cents for a validated money string ("125.5" → 12550). */
export function moneyToCents(value: string): number {
  const [whole = "0", frac = ""] = value.split(".");
  const cents =
    parseInt(whole, 10) * 100 + parseInt((frac + "00").slice(0, 2), 10);
  if (!Number.isSafeInteger(cents)) return NaN;
  return cents;
}

/** numeric(15,2) ceiling in cents: 9999999999999.99 → 999999999999999. */
export const MAX_CENTS = 999_999_999_999_999;

export const moneyString = z
  .string()
  .regex(MONEY_RE, "Enter a valid amount, e.g. 125.50");

export const positiveMoneyString = moneyString.refine(
  (v) => moneyToCents(v) > 0,
  "Amount must be greater than zero",
);

// ─── Dates ──────────────────────────────────────────────────────────────────
// Invoice/AR dates are stored as ISO text (YYYY-MM-DD). Accept only real
// calendar days — "2026-13-99" or "abc" would otherwise flow into aging and
// reminder math as NaN.

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y as number, (m as number) - 1, d as number));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === (m as number) - 1 &&
    dt.getUTCDate() === d
  );
}

export const isoDateString = z
  .string()
  .refine(isValidIsoDate, "Enter a valid date (YYYY-MM-DD)");

// ─── Shared zod schema parts ────────────────────────────────────────────────

/** Optional money field that tolerates "" (forms send empty strings). */
export const optionalMoneyString = z
  .string()
  .refine(
    (v) => v === "" || isValidMoney(v),
    "Enter a valid amount, e.g. 125.50",
  );
