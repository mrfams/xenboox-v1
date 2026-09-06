// ─── Ledger Engine v2 — parity verification (KILLPLAN §4.5 step 2) ──────────
//
// Proves old books == event books during the cut-over window. For every
// posted legacy JE, the mirrored event must exist (idempotency key =
// legacy reference) and carry the same total in minor units and the same
// period. Mismatches are enumerated, never averaged away.

import { and, eq, desc, sql } from "drizzle-orm";
import {
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";
import { journalEvents } from "@xenboox/db/schema/ledger";
import type { Database } from "@xenboox/db";

export interface ParityMismatch {
  reference: string;
  kind: "missing_event" | "total_mismatch" | "period_mismatch";
  legacyTotalMinor: number;
  eventTotalMinor: number | null;
}

export interface ParityReport {
  entityId: string;
  checked: number;
  matched: number;
  mismatches: ParityMismatch[];
}

export interface LegacyEntryTotals {
  reference: string;
  totalMinor: number;
  periodId: string | null;
}

/**
 * Pure comparison — unit-testable without a DB.
 */
export function compareEntry(
  legacy: LegacyEntryTotals,
  event: { totalMinor: number; periodId: string | null } | null,
): ParityMismatch | null {
  if (!event) {
    return {
      reference: legacy.reference,
      kind: "missing_event",
      legacyTotalMinor: legacy.totalMinor,
      eventTotalMinor: null,
    };
  }
  if (event.totalMinor !== legacy.totalMinor) {
    return {
      reference: legacy.reference,
      kind: "total_mismatch",
      legacyTotalMinor: legacy.totalMinor,
      eventTotalMinor: event.totalMinor,
    };
  }
  if (legacy.periodId && event.periodId !== legacy.periodId) {
    return {
      reference: legacy.reference,
      kind: "period_mismatch",
      legacyTotalMinor: legacy.totalMinor,
      eventTotalMinor: event.totalMinor,
    };
  }
  return null;
}

/**
 * Verify parity for one entity over its most recent posted legacy entries.
 */
export async function verifyParity(
  db: Database,
  entityId: string,
  opts?: { limit?: number },
): Promise<ParityReport> {
  const limit = opts?.limit ?? 500;

  const entries = await db
    .select({
      id: journalEntries.id,
      reference: journalEntries.reference,
      periodId: journalEntries.periodId,
    })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
        sql`${journalEntries.reference} IS NOT NULL`,
      ),
    )
    .orderBy(desc(journalEntries.createdAt))
    .limit(limit);

  const mismatches: ParityMismatch[] = [];
  let matched = 0;

  for (const entry of entries) {
    if (!entry.reference) continue;

    // Legacy total (major-unit strings → minor)
    const [totals] = await db
      .select({
        totalDebit: sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
      })
      .from(journalEntryLines)
      .innerJoin(
        journalEntries,
        eq(journalEntryLines.journalEntryId, journalEntries.id),
      )
      .where(eq(journalEntryLines.journalEntryId, entry.id));

    const legacyTotalMinor = Math.round(
      Number.parseFloat(totals?.totalDebit ?? "0") * 100,
    );

    // Mirrored event: idempotencyKey == legacy reference; total from lines
    const [event] = await db
      .select({
        periodId: journalEvents.periodId,
        totalMinor: sql<string>`COALESCE(SUM((line->>'debitMinor')::bigint), 0)`,
      })
      .from(journalEvents)
      .where(
        and(
          eq(journalEvents.entityId, entityId),
          eq(journalEvents.idempotencyKey, entry.reference),
        ),
      )
      .groupBy(journalEvents.periodId, journalEvents.idempotencyKey)
      .limit(1);

    // legacy "total" for parity = debits (credits equal by construction)
    const eventTotals = event
      ? {
          totalMinor: Number(event.totalMinor) / 2, // debit+credit summed = 2× debit side
          periodId: event.periodId,
        }
      : null;

    const mismatch = compareEntry(
      {
        reference: entry.reference,
        totalMinor: legacyTotalMinor,
        periodId: entry.periodId,
      },
      eventTotals,
    );
    if (mismatch) mismatches.push(mismatch);
    else matched += 1;
  }

  return {
    entityId,
    checked: entries.length,
    matched,
    mismatches,
  };
}
