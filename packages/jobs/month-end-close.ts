import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db, notifyEntityUsers } from "@xenboox/db";
import {
  journalEntries,
  fiscalPeriods,
  journalEntryLines,
  fixedAssets,
  depreciationSchedule,
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

    // Notify entity users the books are closed (deduped per period so a
    // retried run never double-notifies).
    await notifyEntityUsers(db, {
      entityId,
      type: "month_end_close",
      priority: "high",
      title: `Books closed for ${year}-${String(month).padStart(2, "0")}`,
      body: "The month-end close completed and the period is now closed. Run reports to see final figures.",
      data: { periodId: period.id },
      dedupeDataField: "periodId",
    }).catch((err: unknown) => {
      logger.error("Failed to send close notification", {
        entityId,
        periodId: period.id,
        err: err instanceof Error ? err.message : String(err),
      });
    });

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
  const schedules = await db
    .select({
      assetId: depreciationSchedule.fixedAssetId,
      assetName: fixedAssets.name,
      amount: depreciationSchedule.depreciationAmount,
      journalEntryId: depreciationSchedule.journalEntryId,
      expenseAccountId: fixedAssets.glAccountId,
      accumulatedAccountId: fixedAssets.accumulatedDepreciationAccountId,
    })
    .from(depreciationSchedule)
    .innerJoin(
      fixedAssets,
      eq(depreciationSchedule.fixedAssetId, fixedAssets.id),
    )
    .where(
      and(
        eq(depreciationSchedule.entityId, entityId),
        eq(depreciationSchedule.periodId, periodId),
        eq(fixedAssets.entityId, entityId),
      ),
    );

  for (const schedule of schedules) {
    if (schedule.journalEntryId) continue;
    if (!schedule.expenseAccountId || !schedule.accumulatedAccountId) {
      throw new Error(
        `Depreciation accounts are not configured for ${schedule.assetName}`,
      );
    }
    const amount = Number(schedule.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Invalid depreciation amount for ${schedule.assetName}`);
    }
    const reference = `depreciation:${entityId}:${periodId}:${schedule.assetId}`;
    const existing = await db.query.journalEntries.findFirst({
      where: and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.reference, reference),
      ),
      columns: { id: true },
    });
    if (existing) {
      await db
        .update(depreciationSchedule)
        .set({ journalEntryId: existing.id })
        .where(
          and(
            eq(depreciationSchedule.entityId, entityId),
            eq(depreciationSchedule.fixedAssetId, schedule.assetId),
            eq(depreciationSchedule.periodId, periodId),
          ),
        );
      continue;
    }

    await db.transaction(async (tx) => {
      const [last] = await tx
        .select({ entryNumber: journalEntries.entryNumber })
        .from(journalEntries)
        .where(eq(journalEntries.entityId, entityId))
        .orderBy(desc(journalEntries.entryNumber))
        .limit(1);
      const [entry] = await tx
        .insert(journalEntries)
        .values({
          entityId,
          entryNumber: (last?.entryNumber ?? 0) + 1,
          description: `Depreciation - ${schedule.assetName}`,
          reference,
          date: new Date().toISOString().slice(0, 10),
          periodId,
          status: "posted",
          postedBy: "system",
          postedAt: new Date(),
          source: "depreciation",
        })
        .returning({ id: journalEntries.id });
      if (!entry)
        throw new Error(
          `Depreciation entry creation failed for ${schedule.assetName}`,
        );
      await tx.insert(journalEntryLines).values([
        {
          journalEntryId: entry.id,
          accountId: schedule.expenseAccountId,
          debit: amount.toFixed(2),
          credit: "0",
          description: `Depreciation expense - ${schedule.assetName}`,
        },
        {
          journalEntryId: entry.id,
          accountId: schedule.accumulatedAccountId,
          debit: "0",
          credit: amount.toFixed(2),
          description: `Accumulated depreciation - ${schedule.assetName}`,
        },
      ]);
      await tx
        .update(depreciationSchedule)
        .set({ journalEntryId: entry.id, calculatedBy: "month-end-close" })
        .where(
          and(
            eq(depreciationSchedule.entityId, entityId),
            eq(depreciationSchedule.fixedAssetId, schedule.assetId),
            eq(depreciationSchedule.periodId, periodId),
          ),
        );
    });
  }
}
