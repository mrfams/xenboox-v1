// ─── Ledger Engine v2 — posting service (KILLPLAN §4.2) ─────────────────────
//
// The ONE write path for the v2 journal. Every caller (web posting core,
// agents, jobs, close pipeline) posts through postToLedger:
//   1. deterministic validation (integer minor units, balanced, positive),
//   2. open-period resolution for the effective date,
//   3. idempotency via (entity_id, idempotency_key) — retries return the
//      original result,
//   4. hash-chained append + CQRS balance projection in ONE transaction.
//
// No caller writes journal_events or ledger_account_balances directly.

import { and, eq, sql } from "drizzle-orm";
import {
  journalEvents,
  ledgerAccountBalances,
  type LedgerEventLine,
} from "@xenboox/db/schema/ledger";
import { fiscalPeriods } from "@xenboox/db/schema/accounting";
import { GENESIS_HASH, computeEventHash } from "./hash";

export type LedgerDb = Parameters<
  Parameters<import("@xenboox/db").Database["transaction"]>[0]
>[0];

export class LedgerValidationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "UNBALANCED"
      | "NON_INTEGER_AMOUNT"
      | "NON_POSITIVE_AMOUNT"
      | "EMPTY_LINES"
      | "PERIOD_NOT_OPEN"
      | "PERIOD_MISSING",
  ) {
    super(message);
    this.name = "LedgerValidationError";
  }
}

export interface PostToLedgerParams {
  entityId: string;
  /** "user" | "agent" | "system" */
  actorType: "user" | "agent" | "system";
  actorId: string;
  source: string;
  /** Accounting date YYYY-MM-DD — the open-period gate uses this. */
  effectiveDate: string;
  currency: string;
  /** Business-level dedupe key — caller-derived (e.g. "ar-inv-<id>"). */
  idempotencyKey: string;
  lines: LedgerEventLine[];
  eventType?: "posting" | "reversal";
  reversesEventId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface PostToLedgerResult {
  eventId: string;
  seq: number;
  /** true when the idempotency key already committed — the ORIGINAL result. */
  duplicate: boolean;
}

function assertInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new LedgerValidationError(
      `${label} must be an integer number of minor units, got ${value}`,
      "NON_INTEGER_AMOUNT",
    );
  }
  if (value < 0) {
    throw new LedgerValidationError(
      `${label} must be ≥ 0 (use the opposite side for direction), got ${value}`,
      "NON_POSITIVE_AMOUNT",
    );
  }
}

export async function postToLedger(
  db: import("@xenboox/db").Database,
  params: PostToLedgerParams,
): Promise<PostToLedgerResult> {
  const lines = params.lines;

  // ── 1. Deterministic validation (throws before ANY write) ────────────────
  if (!lines || lines.length < 2) {
    throw new LedgerValidationError(
      "A posting needs at least two lines",
      "EMPTY_LINES",
    );
  }
  let totalDebit = 0;
  let totalCredit = 0;
  for (const [i, line] of lines.entries()) {
    assertInteger(line.debitMinor, `line ${i + 1} debitMinor`);
    assertInteger(line.creditMinor, `line ${i + 1} creditMinor`);
    if (line.debitMinor > 0 && line.creditMinor > 0) {
      throw new LedgerValidationError(
        `line ${i + 1} has both debit and credit — one side only`,
        "NON_POSITIVE_AMOUNT",
      );
    }
    totalDebit += line.debitMinor;
    totalCredit += line.creditMinor;
  }
  if (totalDebit !== totalCredit) {
    throw new LedgerValidationError(
      `Entry does not balance: debits ${totalDebit} vs credits ${totalCredit} minor units (difference ${Math.abs(totalDebit - totalCredit)})`,
      "UNBALANCED",
    );
  }

  return db.transaction(async (tx) => {
    // ── 2. Idempotency — a committed key returns the ORIGINAL result ──────
    const [existing] = await tx
      .select({ id: journalEvents.id, seq: journalEvents.seq })
      .from(journalEvents)
      .where(
        and(
          eq(journalEvents.entityId, params.entityId),
          eq(journalEvents.idempotencyKey, params.idempotencyKey),
        ),
      )
      .limit(1);
    if (existing) {
      return { eventId: existing.id, seq: existing.seq, duplicate: true };
    }

    // ── 3. Open-period gate for the effective date ────────────────────────
    const [year, month] = params.effectiveDate.split("-").map(Number);
    const [period] = await tx
      .select({ id: fiscalPeriods.id, status: fiscalPeriods.status })
      .from(fiscalPeriods)
      .where(
        and(
          eq(fiscalPeriods.entityId, params.entityId),
          eq(fiscalPeriods.year, year),
          eq(fiscalPeriods.month, month),
        ),
      )
      .limit(1);

    if (!period) {
      throw new LedgerValidationError(
        `No fiscal period exists for ${params.effectiveDate.slice(0, 7)} — open it first`,
        "PERIOD_MISSING",
      );
    }
    if (period.status !== "open") {
      throw new LedgerValidationError(
        `Fiscal period ${params.effectiveDate.slice(0, 7)} is ${period.status} — posting refused`,
        "PERIOD_NOT_OPEN",
      );
    }

    // ── 4. Sequence + hash chain (inside the tx — single writer per entity) ─
    const [prev] = await tx
      .select({ seq: journalEvents.seq, hash: journalEvents.eventHash })
      .from(journalEvents)
      .where(eq(journalEvents.entityId, params.entityId))
      .orderBy(sql`seq DESC`)
      .limit(1);

    const seq = (prev?.seq ?? 0) + 1;
    const prevEventHash = prev?.hash ?? GENESIS_HASH;
    const eventType = params.eventType ?? "posting";

    const eventHash = computeEventHash({
      entityId: params.entityId,
      seq,
      eventType,
      effectiveDate: params.effectiveDate,
      periodId: period.id,
      reversesEventId: params.reversesEventId ?? null,
      reason: params.reason ?? null,
      source: params.source,
      actorType: params.actorType,
      actorId: params.actorId,
      idempotencyKey: params.idempotencyKey,
      currency: params.currency,
      lines,
      prevEventHash,
    });

    // ── 5. Append + project — one commit ──────────────────────────────────
    const [created] = await tx
      .insert(journalEvents)
      .values({
        entityId: params.entityId,
        seq,
        effectiveDate: params.effectiveDate,
        periodId: period.id,
        eventType,
        reversesEventId: params.reversesEventId ?? null,
        reason: params.reason ?? null,
        source: params.source,
        actorType: params.actorType,
        actorId: params.actorId,
        idempotencyKey: params.idempotencyKey,
        currency: params.currency,
        lines,
        prevEventHash,
        eventHash,
        metadata: params.metadata ?? null,
      })
      .returning();

    if (!created) {
      throw new Error("Ledger event insert failed");
    }

    const eventId = created.id;

    for (const line of lines) {
      await tx
        .insert(ledgerAccountBalances)
        .values({
          entityId: params.entityId,
          accountId: line.accountId,
          periodId: period.id,
          currency: params.currency,
          debitMinor: line.debitMinor,
          creditMinor: line.creditMinor,
        })
        .onConflictDoUpdate({
          target: [
            ledgerAccountBalances.entityId,
            ledgerAccountBalances.accountId,
            ledgerAccountBalances.periodId,
            ledgerAccountBalances.currency,
          ],
          set: {
            debitMinor: sql`${ledgerAccountBalances.debitMinor} + ${line.debitMinor}`,
            creditMinor: sql`${ledgerAccountBalances.creditMinor} + ${line.creditMinor}`,
          },
        });
    }

    return { eventId, seq, duplicate: false };
  });
}
