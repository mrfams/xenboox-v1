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
}

/**
 * Insert a posted JE + lines for this entity, guarded by the reference
 * idempotency key and TrustGuard. Returns the JE id, or null when skipped
 * (closed period / TrustGuard rejection).
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

  // entryNumber: unique per entity. Every pipeline computes max+1, so
  // concurrent postings (bank syncs, approvals, reimbursements) collide on
  // the (entityId, entryNumber) index — retry with a freshly-read max instead
  // of letting a legit posting abort on a raw constraint error.
  let entry: { id: string } | null = null;
  for (let attempt = 0; attempt < 3 && !entry; attempt++) {
    const [last] = await db
      .select({ n: journalEntries.entryNumber })
      .from(journalEntries)
      .where(eq(journalEntries.entityId, entityId))
      .orderBy(desc(journalEntries.entryNumber))
      .limit(1);
    try {
      const [created] = await db
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
      entry = created ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isCollision = /je_entity_entry_number|duplicate key value/.test(
        msg,
      );
      if (!isCollision || attempt === 2) throw err;
      // A concurrent posting took the number — re-read the max and retry.
    }
  }
  if (!entry) return null;

  try {
    await db.insert(journalEntryLines).values(
      lines.map((l) => ({
        journalEntryId: entry.id,
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        description: l.description ?? description,
      })),
    );
  } catch (err) {
    await db
      .delete(journalEntries)
      .where(eq(journalEntries.id, entry.id))
      .catch(() => {});
    throw err;
  }
  return entry.id;
}

/**
 * Best-effort removal of a just-created JE + its lines. Used when the
 * post-insert link/audit step fails — never leave an orphan entry that
 * records money without a source document link.
 */
export async function cleanupJournal(journalEntryId: string): Promise<void> {
  await db
    .delete(journalEntryLines)
    .where(eq(journalEntryLines.journalEntryId, journalEntryId))
    .catch(() => {});
  await db
    .delete(journalEntries)
    .where(eq(journalEntries.id, journalEntryId))
    .catch(() => {});
}

/** Deterministically ensure an operational COA row exists; returns its id. */
export async function ensureAccount(
  entityId: string,
  row: {
    code: string;
    name: string;
    type: "asset" | "liability";
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
