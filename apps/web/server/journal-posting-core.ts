// ─── Shared posted-journal creation core (AR + AP posting) ─────────────────
//
// Both ar-posting and ap-posting post operational documents (invoices/bills,
// payments) into the general ledger. They share the same rules:
//   - TrustGuard validates every entry before insert (validateJournalEntry)
//   - the JE reference is the idempotency key — the unique (entityId,
//     reference) index makes double-posting impossible
//   - the entry only posts into an OPEN fiscal period for its date
//   - canonical COA rows (AR/AP/cash/bank) resolve deterministically and are
//     created when missing
//   - money stays integer-cents end to end; entries always balance

import { eq, and, desc } from "drizzle-orm";
import {
  journalEntries,
  journalEntryLines,
  fiscalPeriods,
  chartOfAccounts,
} from "@xenboox/db/schema";
import { validateJournalEntry, trustGuardToError } from "@xenboox/agents";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function findOpenPeriod(entityId: string, date: string) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  if (!year || !month) return null;
  const period = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      eq(fiscalPeriods.year, year),
      eq(fiscalPeriods.month, month),
    ),
  });
  if (period?.status !== "open") return null;
  return period;
}

export interface PostJournalLine {
  accountId: string;
  debit: string;
  credit: string;
  description?: string;
  /** Multi-currency stamp: the currency this line is denominated in. Lines
   * posted in the entity base currency set this explicitly so FX revaluation
   * runs (which exclude base-currency lines) never re-value them. */
  currency?: string;
  baseCurrency?: string;
  baseAmount?: string;
  exchangeRate?: string;
}

/**
 * Insert a posted JE + lines for this entity, guarded by the reference
 * idempotency key and TrustGuard. Returns the JE id, or null when skipped
 * (closed period / TrustGuard rejection).
 *
 * Batch 3 / N26 — `linkInsideTx` runs INSIDE the posting transaction. Source
 * document linking + audit belong in the same commit as the posted entry: if
 * they fail, the transaction rolls back and no posted JE ever exists — the
 * old post-then-cleanup pattern (delete the posted entry on link failure,
 * with swallowed delete errors) is gone.
 */
export async function createPostedJournal(opts: {
  entityId: string;
  userId: string;
  date: string;
  description: string;
  reference: string;
  source: string;
  lines: PostJournalLine[];
  /** Internal label for logs (e.g. "[ar-posting]", "[ap-posting]"). */
  logPrefix: string;
  linkInsideTx?: (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    journalEntryId: string,
  ) => Promise<void>;
}): Promise<string | null> {
  const {
    entityId,
    userId,
    date,
    description,
    reference,
    source,
    lines,
    logPrefix,
    linkInsideTx,
  } = opts;

  // Idempotency: a retried run may already have posted this reference.
  const existing = await db.query.journalEntries.findFirst({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.reference, reference),
    ),
    columns: { id: true },
  });
  if (existing) return existing.id;

  const period = await findOpenPeriod(entityId, date);
  if (!period) return null;

  const trustResult = await validateJournalEntry({
    entityId,
    periodId: period.id,
    date,
    lines: lines.map((l) => ({
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
    })),
    description,
  });
  if (!trustResult.passed) {
    logger.warn(
      { entityId, reference, reason: trustGuardToError(trustResult) },
      `${logPrefix} TrustGuard rejected journal entry`,
    );
    return null;
  }

  // Header and lines must commit together. A posted header without lines is
  // an invalid ledger state and must never be observable after a failure.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const entry = await db.transaction(async (tx) => {
        const [last] = await tx
          .select({ n: journalEntries.entryNumber })
          .from(journalEntries)
          .where(eq(journalEntries.entityId, entityId))
          .orderBy(desc(journalEntries.entryNumber))
          .limit(1);

        const [created] = await tx
          .insert(journalEntries)
          .values({
            entityId,
            entryNumber: (last?.n ?? 0) + 1,
            description,
            reference,
            date,
            periodId: period.id,
            status: "posted",
            postedBy: userId,
            postedAt: new Date(),
            source,
            metadata: { autoPost: true },
          })
          .returning({ id: journalEntries.id });
        if (!created) throw new Error("Journal entry creation failed");

        await tx.insert(journalEntryLines).values(
          lines.map((l) => ({
            journalEntryId: created.id,
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            description: l.description ?? description,
            currency: l.currency,
            baseCurrency: l.baseCurrency,
            baseAmount: l.baseAmount,
            exchangeRate: l.exchangeRate,
          })),
        );

        if (linkInsideTx) {
          await linkInsideTx(tx, created.id);
        }

        return created;
      });
      return entry.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryableConflict =
        /je_entity_entry_number|je_entity_reference|duplicate key value/.test(
          msg,
        );
      if (!isRetryableConflict || attempt === 2) throw err;

      // Another writer may have won either the reference or entry number. If
      // it was this reference, return its durable result; otherwise retry with
      // a fresh entry number inside a new transaction.
      const winner = await db.query.journalEntries.findFirst({
        where: and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.reference, reference),
        ),
        columns: { id: true },
      });
      if (winner) return winner.id;
    }
  }

  return null;
}


/** Deterministically ensure an operational COA row exists; returns its id. */
export async function ensureAccount(
  entityId: string,
  row: {
    code: string;
    name: string;
    type: "asset" | "liability" | "revenue" | "expense";
    subtype: string;
  },
): Promise<string> {
  const existing = await db.query.chartOfAccounts.findFirst({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.code, row.code),
    ),
    columns: { id: true },
  });
  if (existing) return existing.id;

  // Unique (entityId, code) — a concurrent creator may win; that is fine.
  const [created] = await db
    .insert(chartOfAccounts)
    .values({
      entityId,
      code: row.code,
      name: row.name,
      type: row.type,
      subtype: row.subtype as typeof chartOfAccounts.$inferInsert.subtype,
      description: `Auto-created for journal posting (${row.name})`,
    })
    .onConflictDoNothing({
      target: [chartOfAccounts.entityId, chartOfAccounts.code],
    })
    .returning({ id: chartOfAccounts.id });
  if (created) return created.id;

  const winner = await db.query.chartOfAccounts.findFirst({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.code, row.code),
    ),
    columns: { id: true },
  });
  return winner?.id ?? "";
}
