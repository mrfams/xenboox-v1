// ─── Ledger Engine v2 — chain verification + projection rebuild (§4.1/4.3) ──

import { asc, eq } from "drizzle-orm";
import {
  journalEvents,
  ledgerAccountBalances,
} from "@xenboox/db/schema/ledger";
import { GENESIS_HASH, computeEventHash } from "./hash";
import type { LedgerEventLine } from "@xenboox/db/schema/ledger";
import type { Database } from "@xenboox/db";

export interface ChainVerification {
  valid: boolean;
  eventsScanned: number;
  /** seq of the first event whose stored hash ≠ recomputed hash */
  brokenAtSeq: number | null;
}

/**
 * Full-chain verification for one entity: recompute every eventHash from the
 * stored columns and compare, including the prev→seq linkage. A single
 * ordered scan proves the books have not been tampered with.
 */
export async function verifyChain(
  db: Database,
  entityId: string,
): Promise<ChainVerification> {
  const events = await db.query.journalEvents.findMany({
    where: eq(journalEvents.entityId, entityId),
    orderBy: [asc(journalEvents.seq)],
  });

  let expectedPrev = GENESIS_HASH;
  for (const [i, event] of events.entries()) {
    // chain linkage: seq must be contiguous and prev hash must match
    if (event.seq !== i + 1 || event.prevEventHash !== expectedPrev) {
      return {
        valid: false,
        eventsScanned: i,
        brokenAtSeq: event.seq,
      };
    }

    const recomputed = computeEventHash({
      entityId: event.entityId,
      seq: event.seq,
      eventType: event.eventType,
      effectiveDate: event.effectiveDate,
      periodId: event.periodId,
      reversesEventId: event.reversesEventId,
      reason: event.reason,
      source: event.source,
      actorType: event.actorType,
      actorId: event.actorId,
      idempotencyKey: event.idempotencyKey,
      currency: event.currency,
      lines: event.lines as LedgerEventLine[],
      prevEventHash: event.prevEventHash,
    });

    if (recomputed !== event.eventHash) {
      return { valid: false, eventsScanned: i + 1, brokenAtSeq: event.seq };
    }

    expectedPrev = event.eventHash;
  }

  return { valid: true, eventsScanned: events.length, brokenAtSeq: null };
}

/**
 * Rebuild the CQRS balance projection from the events — the self-healing
 * proof that events are the source of truth and balances are derived.
 */
export async function rebuildBalances(
  db: Database,
  entityId: string,
): Promise<{ accounts: number; events: number }> {
  const events = await db.query.journalEvents.findMany({
    where: eq(journalEvents.entityId, entityId),
    orderBy: [asc(journalEvents.seq)],
  });

  const deltas = new Map<
    string,
    {
      accountId: string;
      periodId: string;
      currency: string;
      debit: number;
      credit: number;
    }
  >();

  for (const event of events) {
    const periodId = event.periodId;
    if (!periodId) continue;
    for (const line of event.lines as LedgerEventLine[]) {
      const key = `${line.accountId}:${periodId}:${event.currency}`;
      const current = deltas.get(key) ?? {
        accountId: line.accountId,
        periodId,
        currency: event.currency,
        debit: 0,
        credit: 0,
      };
      current.debit += line.debitMinor;
      current.credit += line.creditMinor;
      deltas.set(key, current);
    }
  }

  return db.transaction(async (tx) => {
    await tx
      .delete(ledgerAccountBalances)
      .where(eq(ledgerAccountBalances.entityId, entityId));
    const rows = [...deltas.values()].map((d) => ({
      entityId,
      accountId: d.accountId,
      periodId: d.periodId,
      currency: d.currency,
      debitMinor: d.debit,
      creditMinor: d.credit,
    }));
    if (rows.length > 0) {
      await tx.insert(ledgerAccountBalances).values(rows);
    }
    return { accounts: rows.length, events: events.length };
  });
}
