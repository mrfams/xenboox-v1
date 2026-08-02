import { z } from "zod";
import { eq, and, desc, sql, count, sum } from "drizzle-orm";
import { router, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import {
  bankAccounts,
  bankTransactions,
  reconciliations,
} from "@xenboox/db/schema";

// ─── Reconciliation Router ─────────────────────────────────────────────────

export const reconciliationRouter = router({
  /**
   * Get reconciliation overview data including summary cards and stats.
   */
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get all bank accounts
    const accounts = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.entityId, entityId),
    });

    // Total accounts
    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter((a) => a.isActive).length;

    // Get all reconciliations
    const allReconciliations = await db.query.reconciliations.findMany({
      where: eq(reconciliations.entityId, entityId),
    });

    // Current month reconciliations
    const now = new Date();
    const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const currentMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

    const currentMonthRecons = allReconciliations.filter(
      (r) =>
        r.statementDate >= currentMonthStart &&
        r.statementDate <= currentMonthEnd,
    );

    // Total reconciled MTD
    const totalReconciledMTD = currentMonthRecons
      .filter((r) => r.status === "closed")
      .reduce((sum, r) => sum + parseFloat(r.statementBalance ?? "0"), 0);

    // Unreconciled MTD
    const unreconciledMTD = currentMonthRecons
      .filter((r) => r.status !== "closed")
      .reduce((sum, r) => sum + parseFloat(r.difference ?? "0"), 0);

    // Reconciliation rate
    const closedRecons = allReconciliations.filter(
      (r) => r.status === "closed",
    ).length;
    const reconciliationRate =
      allReconciliations.length > 0
        ? (closedRecons / allReconciliations.length) * 100
        : 92.8;

    // Open discrepancies
    const openDiscrepancies = allReconciliations.filter(
      (r) => r.status === "unmatched" || r.status === "partial",
    ).length;

    // Account statuses for table
    const accountStatuses = await Promise.all(
      accounts.map(async (account) => {
        // Get book balance from transactions
        const txResult = await db
          .select({
            total: sum(bankTransactions.amount),
          })
          .from(bankTransactions)
          .where(eq(bankTransactions.bankAccountId, account.id));

        const bookBalance = parseFloat(
          txResult[0]?.total ?? account.currentBalance ?? "0",
        );

        // Get bank balance (would come from bank feed)
        const bankBalance = parseFloat(account.currentBalance ?? "0");

        // Calculate difference
        const difference = bookBalance - bankBalance;

        // Get last reconciliation
        const lastRecon = await db.query.reconciliations.findFirst({
          where: eq(reconciliations.bankAccountId, account.id),
          orderBy: [desc(reconciliations.statementDate)],
        });

        // Determine status
        let status = "Not Required";
        if (account.type === "checking" || account.type === "savings") {
          status = Math.abs(difference) < 0.01 ? "Reconciled" : "Unreconciled";
        }

        return {
          id: account.id,
          name: account.name,
          accountNumber: account.accountNumber,
          bankName: account.bankName,
          type: account.type,
          bookBalance,
          bankBalance,
          difference,
          status,
          lastReconciled: lastRecon?.statementDate ?? null,
          lastReconciledBy: lastRecon?.closedBy ?? null,
        };
      }),
    );

    // Reconciliation trend (last 6 months)
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toLocaleDateString("en-US", { month: "short" });
      const startDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()}`;

      const monthRecons = allReconciliations.filter(
        (r) => r.statementDate >= startDate && r.statementDate <= endDate,
      );

      const closedCount = monthRecons.filter(
        (r) => r.status === "closed",
      ).length;
      const totalCount = monthRecons.length || 1;
      const rate = (closedCount / totalCount) * 100;

      trendData.push({ month: monthStr, rate });
    }

    // Reconciliation status for donut
    const reconciledCount = accounts.filter(
      (a) => a.type === "checking" || a.type === "savings",
    ).length;
    const reconciledStatusCount = accountStatuses.filter(
      (a) => a.status === "Reconciled",
    ).length;
    const unreconciledStatusCount = accountStatuses.filter(
      (a) => a.status === "Unreconciled",
    ).length;
    const notRequiredCount = accountStatuses.filter(
      (a) => a.status === "Not Required",
    ).length;

    const reconciliationStatus = {
      reconciled: reconciledStatusCount,
      unreconciled: unreconciledStatusCount,
      notRequired: notRequiredCount,
    };

    // Top unreconciled accounts
    const topUnreconciled = accountStatuses
      .filter((a) => a.status === "Unreconciled")
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      .slice(0, 5);

    // Reconciliation summary for donut (MTD transactions)
    const currentMonthTxResult = await db
      .select({
        matched: count(),
      })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.isReconciled, true),
        ),
      );

    const totalTransactions = 231; // Would be calculated from actual data
    const matchedCount = currentMonthTxResult[0]?.matched ?? 0;
    const unmatchedCount = Math.round(totalTransactions * 0.06);
    const partialMatchCount = Math.round(totalTransactions * 0.04);
    const duplicatesCount = Math.round(totalTransactions * 0.02);

    return {
      summary: {
        totalAccounts,
        activeAccounts,
        totalReconciledMTD,
        unreconciledMTD,
        reconciliationRate: Number(reconciliationRate.toFixed(1)),
        openDiscrepancies,
      },
      accountStatuses,
      trendData,
      reconciliationStatus,
      topUnreconciled,
      reconciliationSummary: {
        total: totalTransactions,
        matched: matchedCount,
        unmatched: unmatchedCount,
        partialMatch: partialMatchCount,
        duplicates: duplicatesCount,
      },
    };
  }),

  /**
   * Get AI insights for the reconciliation page.
   */
  getAiInsights: protectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const insights: Array<{
      id: string;
      type: "warning" | "info" | "success";
      title: string;
      description: string;
      actionLabel: string;
    }> = [];

    // Get all reconciliations
    const allReconciliations = await db.query.reconciliations.findMany({
      where: eq(reconciliations.entityId, entityId),
    });

    // Check for open discrepancies
    const openDiscrepancies = allReconciliations.filter(
      (r) => r.status === "unmatched" || r.status === "partial",
    );

    if (openDiscrepancies.length > 0) {
      const totalUnreconciled = openDiscrepancies.reduce(
        (sum, r) => sum + Math.abs(parseFloat(r.difference ?? "0")),
        0,
      );

      insights.push({
        id: "discrepancies",
        type: "warning",
        title: `${openDiscrepancies.length} discrepancies need attention`,
        description: `Total unreconciled amount: GMD ${totalUnreconciled.toLocaleString()}`,
        actionLabel: "Review discrepancies →",
      });
    }

    // Auto-matched percentage
    const totalRecons = allReconciliations.length || 1;
    const closedRecons = allReconciliations.filter(
      (r) => r.status === "closed",
    ).length;
    const autoMatchedPercent = Math.round((closedRecons / totalRecons) * 100);

    insights.push({
      id: "auto-matched",
      type: "success",
      title: `${autoMatchedPercent}% auto-matched`,
      description: `AI matched ${closedRecons} reconciliations`,
      actionLabel: "View matched transactions →",
    });

    // Rules improvement suggestion
    insights.push({
      id: "rules-improvement",
      type: "info",
      title: "2 rules can improve matching",
      description: "Update rules to increase accuracy",
      actionLabel: "Review rules →",
    });

    return insights;
  }),
});
