// ─── Ledger Engine v2 — shadow dual-write (KILLPLAN §4.5 step 2) ────────────
//
// Cut-over strategy: the OLD posting path keeps writing the legacy tables;
// every commit ALSO mirrors into journal_events via postToLedger. A nightly
// parity verifier (parity.ts) proves old books == event books. When parity
// holds for a module, that module's posting flips onto the engine and the
// legacy write becomes the shadow — never the other way around.
//
// Shadow failures are ISOLATED: they can never fail the real posting. A
// failed shadow simply means the parity verifier will report a missing event
// — which is exactly the signal we want.

import type { LedgerEventLine } from "@xenboox/db/schema/ledger";
import type { Database } from "@xenboox/db";
import { postToLedger } from "./posting";

export function isShadowEnabled(): boolean {
  return process.env.LEDGER_SHADOW === "true";
}

/**
 * Major-unit money (legacy decimal strings, 2dp) → integer minor units.
 * Banker-free rounding: half-up at the 3rd decimal — the legacy layer only
 * ever produces 2dp strings, so this is exact for them.
 */
export function majorToMinor(value: string | number): number {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Map a legacy PostJournalLine-style line to an engine line. */
export function toLedgerLines(
  lines: Array<{
    accountId: string;
    debit: string | number;
    credit: string | number;
    description?: string;
  }>,
): LedgerEventLine[] {
  return lines.map((l) => ({
    accountId: l.accountId,
    accountCode: "",
    debitMinor: majorToMinor(l.debit),
    creditMinor: majorToMinor(l.credit),
    description: l.description,
  }));
}

export interface ShadowMirrorParams {
  entityId: string;
  /** user id, or "system" for automated postings */
  actorId: string;
  actorType?: "user" | "agent" | "system";
  source: string;
  /** The legacy JE reference — the idempotency key binds old and new. */
  reference: string;
  effectiveDate: string;
  currency: string;
  lines: Array<{
    accountId: string;
    debit: string | number;
    credit: string | number;
    description?: string;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Mirror one legacy posting into the v2 journal. Throws ONLY on programming
 * errors the caller should see in dev; callers wrap in try/catch — a shadow
 * failure must never break the real posting.
 */
export async function shadowMirror(
  db: Database,
  params: ShadowMirrorParams,
): Promise<{ eventId: string; seq: number; duplicate: boolean }> {
  return postToLedger(db, {
    entityId: params.entityId,
    actorType: params.actorType ?? "user",
    actorId: params.actorId,
    source: params.source,
    effectiveDate: params.effectiveDate,
    currency: params.currency,
    idempotencyKey: params.reference,
    lines: toLedgerLines(params.lines),
    metadata: { shadow: true, ...(params.metadata ?? {}) },
  });
}
