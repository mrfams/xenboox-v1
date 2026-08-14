import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db } from "@xenboox/db";
import {
  journalEntries,
  fiscalPeriods,
  journalEntryLines,
  chartOfAccounts,
} from "@xenboox/db/schema";
import { eq, and, sql } from "drizzle-orm";

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

    // 2. Validate all journal entries are posted
    const draftEntries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.periodId, period.id),
          eq(journalEntries.status, "draft"),
        ),
      );

    if (draftEntries.length > 0) {
      throw new Error(
        `${draftEntries.length} draft entries must be posted before close`,
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

  for (const asset of fixedAssets) {
    if (asset.name.includes("Accumulated")) continue;

    const jeId = crypto.randomUUID();
    const today = new Date().toISOString().split("T")[0]!;

    await db.insert(journalEntries).values({
      entityId,
      entryNumber: 9000 + Math.floor(Math.random() * 1000),
      description: `Depreciation - ${asset.name}`,
      date: today,
      periodId,
      status: "posted",
      postedBy: "system",
      postedAt: new Date(),
      source: "depreciation",
    });

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

    if (accumAccount && expenseAccount) {
      const depreciationAmount = "8333";

      await db.insert(journalEntryLines).values({
        journalEntryId: jeId,
        accountId: expenseAccount.id,
        debit: depreciationAmount,
        credit: "0",
        description: `Depreciation expense - ${asset.name}`,
      });
      await db.insert(journalEntryLines).values({
        journalEntryId: jeId,
        accountId: accumAccount.id,
        debit: "0",
        credit: depreciationAmount,
        description: `Accumulated depreciation - ${asset.name}`,
      });
    }
  }
}
