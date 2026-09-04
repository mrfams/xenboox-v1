import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db } from "@xenboox/db";
import {
  journalEntries,
  fiscalPeriods,
  journalEntryLines,
  chartOfAccounts,
} from "@xenboox/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const processMonthEndClose = task({
  id: "process-month-end-close",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },
  queue: {
    concurrencyLimit: 1,
  },

  onFailure: dlqOnFailure<{
    entityId: string;
    month: number;
    year: number;
    userId: string;
  }>({
    task: "process-month-end-close",
    type: "review",
    severity: "critical",
    title: (p) => `Month-end close failed: ${p.month}/${p.year}`,
    entityIdFrom: (p) => p.entityId,
  }),

  run: async (payload: {
    entityId: string;
    month: number;
    year: number;
    userId: string;
  }) => {
    const { entityId, month, year, userId } = payload;

    logger.info("Starting month-end close", { entityId, month, year });

    // 1. Find the fiscal period
    const periods = await db
      .select()
      .from(fiscalPeriods)
      .where(
        and(
          eq(fiscalPeriods.entityId, entityId),
          eq(fiscalPeriods.year, year),
          eq(fiscalPeriods.month, month),
        ),
      );
    const period = periods[0];

    if (!period) {
      throw new Error(`Fiscal period not found for ${year}-${month}`);
    }

    if (period.status === "closed") {
      logger.warn("Period already closed", { periodId: period.id });
      return {
        success: true,
        message: "Period already closed",
        periodId: period.id,
      };
    }

    // 2. Validate all journal entries are posted (drafts AND pending_review —
    // both become unpostable once the period closes)
    const draftEntries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.periodId, period.id),
          sql`${journalEntries.status} IN ('draft', 'pending_review')`,
        ),
      );

    if (draftEntries.length > 0) {
      throw new Error(
        `${draftEntries.length} draft/pending journal entries must be posted before close`,
      );
    }

    // 3. Validate trial balance (debits = credits)
    const balanceRows = await db
      .select({
        totalDebit: sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
      })
      .from(journalEntryLines)
      .innerJoin(
        journalEntries,
        eq(journalEntryLines.journalEntryId, journalEntries.id),
      )
      .where(
        and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.periodId, period.id),
          eq(journalEntries.status, "posted"),
        ),
      );

    const balanceRow = balanceRows[0]!;
    const totalDebit = parseFloat(balanceRow.totalDebit);
    const totalCredit = parseFloat(balanceRow.totalCredit);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Trial balance out of balance: debits ${totalDebit} != credits ${totalCredit}`,
      );
    }

    // 4. Run depreciation for fixed assets
    logger.info("Running depreciation calculation");
    await runDepreciation(entityId, period.id);

    // 5. Close the period
    await db
      .update(fiscalPeriods)
      .set({
        status: "closed",
        closedAt: new Date(),
        closedBy: userId,
      })
      .where(eq(fiscalPeriods.id, period.id));

    logger.info("Period closed successfully", { periodId: period.id });

    return {
      success: true,
      periodId: period.id,
      totalDebit,
      totalCredit,
      balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  },
});

async function runDepreciation(entityId: string, periodId: string) {
  // 1. Query all fixed assets for this entity (already entity-scoped)
  const fixedAssets = await db
    .select()
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.entityId, entityId),
        eq(chartOfAccounts.type, "asset"),
        eq(chartOfAccounts.subtype, "fixed_asset"),
      ),
    );

  if (fixedAssets.length === 0) return;

  // 2. Pre-fetch accumulated depreciation and expense accounts (avoid N+1)
  const accumAccounts = await db
    .select()
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.entityId, entityId),
        eq(chartOfAccounts.code, "1510"),
      ),
    );
  const accumAccount = accumAccounts[0];

  const expenseAccounts = await db
    .select()
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.entityId, entityId),
        eq(chartOfAccounts.code, "6040"),
      ),
    );
  const expenseAccount = expenseAccounts[0];

  if (!accumAccount || !expenseAccount) {
    logger.warn("Missing depreciation accounts, skipping", {
      entityId,
      hasAccum: !!accumAccount,
      hasExpense: !!expenseAccount,
    });
    return;
  }

  // 3. Existing entry numbers — the next number is MAX + 1 (a fresh max per
  // loop pass). Ordering DESC is critical: ASC returns the MINIMUM entry
  // number, which would collide with an existing row on the very first insert.
  let nextEntryNumber: number;
  const readMax = async () => {
    const [last] = await db
      .select({ entryNumber: journalEntries.entryNumber })
      .from(journalEntries)
      .where(eq(journalEntries.entityId, entityId))
      .orderBy(desc(journalEntries.entryNumber))
      .limit(1);
    return (last?.entryNumber ?? 0) + 1;
  };
  nextEntryNumber = await readMax();

  for (const asset of fixedAssets) {
    if (asset.name.includes("Accumulated")) continue;

    const today = new Date().toISOString().split("T")[0]!;

    // Calculate depreciation from asset metadata (cost, useful life, method)
    const assetMeta = (asset.metadata ?? {}) as Record<string, unknown>;
    const cost = Number(assetMeta.cost ?? asset.openingBalance ?? 0);
    const usefulLifeMonths = Number(assetMeta.usefulLifeMonths ?? 60);
    const monthlyDepreciation =
      cost > 0 && usefulLifeMonths > 0 ? cost / usefulLifeMonths : 0;

    if (monthlyDepreciation <= 0) continue;

    // Header and lines must share ONE journal entry id. Insert the header
    // first and use its returned id — lines pointing at a random UUID that was
    // never inserted violate the FK and fail the whole close.
    const [header] = await db
      .insert(journalEntries)
      .values({
        entityId,
        entryNumber: nextEntryNumber,
        description: `Depreciation - ${asset.name}`,
        date: today,
        periodId,
        status: "posted",
        postedBy: "system",
        postedAt: new Date(),
        source: "depreciation",
      })
      .returning({ id: journalEntries.id });
    if (!header) {
      throw new Error(`Depreciation header insert failed for ${asset.name}`);
    }
    // Re-read the max each pass — entryNumber is unique per entity and other
    // writers may have posted between passes.
    nextEntryNumber = await readMax();

    const amount = monthlyDepreciation.toFixed(2);

    await db.insert(journalEntryLines).values({
      journalEntryId: header.id,
      accountId: expenseAccount.id,
      debit: amount,
      credit: "0",
      description: `Depreciation expense - ${asset.name}`,
    });
    await db.insert(journalEntryLines).values({
      journalEntryId: header.id,
      accountId: accumAccount.id,
      debit: "0",
      credit: amount,
      description: `Accumulated depreciation - ${asset.name}`,
    });
  }
}
