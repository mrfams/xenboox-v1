// ─── Estimates & Quotes — Pure Business Logic ─────────────────────────────
//
// Framework-free helpers shared by the tRPC router and unit tests.
// All functions are deterministic and side-effect free.

export type EstimateLineInput = {
  description: string;
  quantity: number;
  unitPrice: string;
};

export const ESTIMATE_LIFECYCLE: ReadonlyArray<
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired"
  | "converted"
  | "voided"
> = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
  "converted",
  "voided",
];

/** Statuses that are terminal — no further transitions allowed. */
export const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  "converted",
  "voided",
]);

/** Statuses an estimate may still be converted to an invoice from. */
export const CONVERTIBLE_STATUSES: ReadonlySet<string> = new Set([
  "draft",
  "sent",
  "viewed",
  "accepted",
]);

export const US_1099_THRESHOLD = 600;

/**
 * Compute the total of a set of estimate lines.
 * Each line amount = quantity × unit price (rounded to 2 decimals).
 */
export function computeEstimateTotal(lines: EstimateLineInput[]): number {
  let total = 0;
  for (const line of lines) {
    const price = Number.parseFloat(line.unitPrice);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Invalid unit price: ${line.unitPrice}`);
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new Error(`Invalid quantity: ${line.quantity}`);
    }
    total += line.quantity * price;
  }
  return Math.round(total * 100) / 100;
}

/** Validate that a status transition is allowed. Returns reason or null. */
export function validateStatusTransition(
  current: string,
  next: string,
): string | null {
  if (current === next) return null;
  if (TERMINAL_STATUSES.has(current)) {
    return `Cannot change status of a ${current} estimate`;
  }
  if (
    !ESTIMATE_LIFECYCLE.includes(next as (typeof ESTIMATE_LIFECYCLE)[number])
  ) {
    return `Unknown status: ${next}`;
  }
  return null;
}

/** Validate that an estimate can be converted to an invoice. */
export function validateConvertible(
  status: string,
  hasConvertedInvoice: boolean,
): string | null {
  if (hasConvertedInvoice || status === "converted") {
    return "Estimate is already converted";
  }
  if (!CONVERTIBLE_STATUSES.has(status)) {
    return `Cannot convert a ${status} estimate`;
  }
  return null;
}

/** Days until expiry (positive = future, negative = past, null = no expiry). */
export function daysUntil(
  expiryDate: string | null,
  now = new Date(),
): number | null {
  if (!expiryDate) return null;
  const due = new Date(expiryDate);
  return Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── AI Draft Request Parser ──────────────────────────────────────────────
//
// Deterministic fallback used when the LLM is unavailable (no API key,
// offline, or model failure). Parses natural-language estimate requests
// like "5 days consulting at $500/day for Acme Corp" into a structured draft.
// The LLM path (in the router) supersedes this when it succeeds.

export type AiDraftLine = {
  description: string;
  quantity: number;
  unitPrice: string;
};

export type AiEstimateDraft = {
  customerMatch: string | null; // matched customer name (null = ask user)
  customerId: string | null; // populated by the router after lookup
  lines: AiDraftLine[];
  terms: string | null;
  expiryDays: number | null;
  currency: string;
  confidence: number;
  source: "llm" | "deterministic";
};

const LINE_SPLIT_RE = /[,;\n]+|\band\b(?=\s*\d+)/gi;
const LINE_ITEM_RE =
  /(?:^|\s)(\d+(?:\.\d+)?)\s+(.+?)\s+(?:at|@|for|\u2013|\u2014|times|x)\s*\$?([\d,]+(?:\.\d{1,2})?)\s*(?:\/|per)\s*(?:day|hour|week|month|unit|item|each|pc|piece)?/i;
const PRICE_ONLY_RE =
  /(?:^|\s)(\d+(?:\.\d+)?)\s+(.+?)\s+\$?([\d,]+(?:\.\d{1,2})?)\s*(?:each|per unit|per item|\/unit)?/i;
const NET_TERMS_RE = /net\s*(\d+)/i;
const EXPIRY_DAYS_RE = /(?:valid|expires?|good)(?:\s+for)?\s+(\d+)\s+days?/i;
const CURRENCY_RE = /\b(GMD|USD|EUR|GBP|NGN|KES|XOF|XAF)\b/i;

/**
 * Extract the likely customer name by scoring known customers against the
 * prompt (substring + word-boundary matches). Returns the best match or null.
 */
export function matchCustomer(
  prompt: string,
  customerNames: string[],
): string | null {
  const lower = prompt.toLowerCase();
  let best: string | null = null;
  let bestScore = 0;

  for (const name of customerNames) {
    const n = name.toLowerCase();
    if (!n) continue;
    if (lower.includes(n)) {
      // Prefer longer, more distinctive matches (avoid "The" etc.)
      const score =
        n.length +
        (new RegExp(
          `\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "i",
        ).test(lower)
          ? 50
          : 0);
      if (score > bestScore) {
        bestScore = score;
        best = name;
      }
    }
  }
  return best;
}

/**
 * Parse a natural-language estimate request into a structured draft.
 * Returns a best-effort draft; missing fields degrade gracefully so the
 * UI can prompt the user for anything unknown.
 */
export function parseEstimateRequest(
  prompt: string,
  customerNames: string[],
  currency = "GMD",
): AiEstimateDraft {
  const trimmed = prompt.trim();

  // Terms + expiry
  const netMatch = trimmed.match(NET_TERMS_RE);
  const terms = netMatch ? `net${netMatch[1]}` : null;
  const expiryMatch = trimmed.match(EXPIRY_DAYS_RE);
  const expiryDays = expiryMatch ? Number(expiryMatch[1]) : null;

  // Currency: explicit code wins; otherwise a $ symbol implies USD
  const currencyMatch = trimmed.match(CURRENCY_RE);
  const detectedCurrency =
    currencyMatch?.[1]?.toUpperCase() ??
    (trimmed.includes("$") ? "USD" : currency);

  // Split into candidate line fragments
  const fragments = trimmed
    .split(LINE_SPLIT_RE)
    .map((f) => f.trim())
    .filter(Boolean);
  const lines: AiDraftLine[] = [];

  for (const frag of fragments) {
    const item = frag.match(LINE_ITEM_RE) ?? frag.match(PRICE_ONLY_RE);
    if (item) {
      const quantity = Number(item[1]);
      const description = item[2]
        .replace(/(?:^|\s)(?:for|to|quote|estimate|draft|create|new)\s*/i, "")
        .replace(/\s*(?:at|@|\u2013|\u2014|times|x)\s*$/i, "")
        .trim();
      const unitPrice = item[3].replace(/,/g, "");
      if (description && quantity > 0 && Number(unitPrice) >= 0) {
        lines.push({ description, quantity, unitPrice });
      }
    }
  }

  // Fallback: if nothing structured parsed, offer the whole prompt as one line
  if (lines.length === 0) {
    lines.push({ description: trimmed, quantity: 1, unitPrice: "0" });
  }

  return {
    customerMatch: matchCustomer(trimmed, customerNames),
    customerId: null,
    lines,
    terms,
    expiryDays,
    currency: detectedCurrency,
    confidence: 0.72,
    source: "deterministic",
  };
}

export type WithholdingRecordLike = {
  payeeId: string;
  payeeName: string | null;
  amount: string;
  taxWithheld: string;
};

export type Contractor1099Summary = {
  payeeId: string;
  payeeName: string;
  totalPayments: number;
  totalWithheld: number;
  count: number;
  thresholdMet: boolean;
};

/**
 * Aggregate withholding records into a per-contractor 1099 summary.
 * thresholdMet = total payments ≥ US_1099_THRESHOLD ($600).
 */
export function aggregate1099(
  records: WithholdingRecordLike[],
  threshold = US_1099_THRESHOLD,
): Contractor1099Summary[] {
  const byPayee = new Map<string, Contractor1099Summary>();

  for (const r of records) {
    const existing = byPayee.get(r.payeeId) ?? {
      payeeId: r.payeeId,
      payeeName: r.payeeName ?? "Unknown contractor",
      totalPayments: 0,
      totalWithheld: 0,
      count: 0,
      thresholdMet: false,
    };
    existing.totalPayments += Number.parseFloat(r.amount) || 0;
    existing.totalWithheld += Number.parseFloat(r.taxWithheld) || 0;
    existing.count += 1;
    existing.thresholdMet = existing.totalPayments >= threshold;
    byPayee.set(r.payeeId, existing);
  }

  return Array.from(byPayee.values()).sort(
    (a, b) => b.totalPayments - a.totalPayments,
  );
}
