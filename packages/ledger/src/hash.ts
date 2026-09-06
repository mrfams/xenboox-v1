// ─── Ledger Engine v2 — hash chain (KILLPLAN §4.1) ──────────────────────────
//
// The eventHash is SHA-256 over a canonical JSON serialization of the
// event's stored fields + the previous event's hash. Any tampering with a
// stored row (amount, date, lines, deletion of a middle event) breaks every
// subsequent hash — verifiable with a single ordered scan (verifyChain).

import { createHash } from "crypto";
import type { LedgerEventLine } from "@xenboox/db/schema";

export const GENESIS_HASH = "0".repeat(64);

export interface LedgerEventHashInput {
  entityId: string;
  seq: number;
  eventType: string;
  effectiveDate: string;
  periodId: string | null;
  reversesEventId: string | null;
  reason: string | null;
  source: string;
  actorType: string;
  actorId: string;
  idempotencyKey: string;
  currency: string;
  lines: LedgerEventLine[];
  prevEventHash: string;
}

/**
 * Canonical JSON: keys sorted recursively, no whitespace. MUST remain stable
 * forever — changing it invalidates every stored hash. If the shape ever
 * needs extending, add NEW fields to the END of the canonical object and bump
 * LEDGER_HASH_VERSION; verifiers pin the version they understand.
 */
export const LEDGER_HASH_VERSION = 1;

export function canonicalizeEvent(input: LedgerEventHashInput): string {
  const ordered = {
    // version first — the serialization is versioned, not the fields
    v: LEDGER_HASH_VERSION,
    actorId: input.actorId,
    actorType: input.actorType,
    currency: input.currency,
    effectiveDate: input.effectiveDate,
    entityId: input.entityId,
    eventType: input.eventType,
    idempotencyKey: input.idempotencyKey,
    lines: sortLines([...input.lines].map(sortLineKeys)),
    periodId: input.periodId,
    prevEventHash: input.prevEventHash,
    reason: input.reason,
    reversesEventId: input.reversesEventId,
    seq: input.seq,
    source: input.source,
  };
  return stableStringify(ordered);
}

export function computeEventHash(input: LedgerEventHashInput): string {
  return createHash("sha256").update(canonicalizeEvent(input)).digest("hex");
}

// ── stable stringify (sorted keys, recursive, no whitespace) ────────────────

function sortLineKeys(line: LedgerEventLine): LedgerEventLine {
  const base = {
    accountId: line.accountId,
    accountCode: line.accountCode,
    creditMinor: line.creditMinor,
    debitMinor: line.debitMinor,
    description: line.description,
  };
  // FX stamps participate in the hash only when present — a base-currency
  // line and the same line without stamps hash identically.
  if (line.currency !== undefined) {
    return {
      ...base,
      baseAmountMinor: line.baseAmountMinor,
      baseCurrency: line.baseCurrency,
      currency: line.currency,
      exchangeRate: line.exchangeRate,
    };
  }
  return base;
}

function sortLines(lines: LedgerEventLine[]): LedgerEventLine[] {
  // Lines are serialized in POSTED ORDER (order is accounting-significant for
  // human readability) but each line's keys are sorted. The seq+prevHash make
  // the overall chain order authoritative regardless.
  return lines;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue(obj[key]);
        return acc;
      }, {});
  }
  return value;
}
