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
