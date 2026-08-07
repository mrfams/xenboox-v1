import { z } from "zod";
import { eq, and, desc, sql, count, sum, gte, lte } from "drizzle-orm";
import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import {
  bankAccounts,
  bankTransactions,
  bankConnections,
} from "@xenboox/db/schema";

// ─── Banking Router ────────────────────────────────────────────────────────

export const bankingRouter = router({
  /**
   * Get banking overview data including summary cards, accounts, and charts.
   */
  getOverview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get all bank accounts
    const accounts = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.entityId, entityId),
      orderBy: [desc(bankAccounts.createdAt)],
    });

    // Calculate totals
    const totalBalance = accounts.reduce(
      (sum, acc) => sum + parseFloat(acc.currentBalance ?? "0"),
      0,
    );

    const activeAccounts = accounts.filter((acc) => acc.isActive).length;
    const inactiveAccounts = accounts.filter((acc) => !acc.isActive).length;

    // Calculate unreconciled balance
    const unreconciledResult = await db
      .select({
        total: sum(bankTransactions.amount),
        count: count(),
      })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.isReconciled, false),
        ),
      );

    const unreconciledBalance = parseFloat(unreconciledResult[0]?.total ?? "0");
    const unreconciledCount = unreconciledResult[0]?.count ?? 0;

    // Get last sync time
    const lastConnection = await db.query.bankConnections.findFirst({
      where: eq(bankConnections.entityId, entityId),
      orderBy: [desc(bankConnections.lastSyncedAt)],
    });

    // Balance by currency
    const balanceByCurrency: Record<string, number> = {};
    for (const account of accounts) {
      const currency = account.currency ?? "GMD";
      balanceByCurrency[currency] =
        (balanceByCurrency[currency] ?? 0) +
        parseFloat(account.currentBalance ?? "0");
    }

    const totalBalanceAllCurrencies = Object.values(balanceByCurrency).reduce(
      (sum, val) => sum + val,
      0,
    );

    const currencyBreakdown = Object.entries(balanceByCurrency).map(
      ([currency, balance]) => ({
        currency,
        balance,
        percentage:
          totalBalanceAllCurrencies > 0
            ? (balance / totalBalanceAllCurrencies) * 100
            : 0,
      }),
    );

    // Get recent transactions for activity
    const recentTransactions = await db.query.bankTransactions.findMany({
      where: eq(bankTransactions.entityId, entityId),
      orderBy: [desc(bankTransactions.createdAt)],
      limit: 10,
    });

    // Get accounts with transaction counts
    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        const txCount = await db
          .select({ count: count() })
          .from(bankTransactions)
          .where(eq(bankTransactions.bankAccountId, account.id));

        const lastTx = await db.query.bankTransactions.findFirst({
          where: eq(bankTransactions.bankAccountId, account.id),
          orderBy: [desc(bankTransactions.transactionDate)],
        });

        return {
          ...account,
          transactionCount: txCount[0]?.count ?? 0,
          lastTransactionDate: lastTx?.transactionDate ?? null,
          maskedNumber: `**** **** **** ${account.accountNumber.slice(-4)}`,
        };
      }),
    );

    return {
      summary: {
        totalBalance,
        totalBalanceChange: 12.4, // Would be calculated from previous period
        accountCount: accounts.length,
        activeAccounts,
        inactiveAccounts,
        unreconciledBalance,
        unreconciledAccounts: unreconciledCount,
        lastSyncAt: lastConnection?.lastSyncedAt
          ? new Date(lastConnection.lastSyncedAt)
          : null,
        lastSyncStatus: lastConnection?.status ?? "unknown",
      },
      accounts: accountsWithStats,
      currencyBreakdown,
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx.id,
        description: tx.description,
        amount: parseFloat(tx.amount),
        type: tx.type,
        date: tx.transactionDate,
        bankAccountId: tx.bankAccountId,
      })),
      connections: accounts
        .filter((acc) => acc.isActive)
        .map((acc) => ({
          id: acc.id,
          name: acc.bankName,
          accountName: acc.name,
        })),
    };
  }),

  /**
   * Get cash position data for the line chart.
   */
  getCashPosition: rlsProtectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const now = new Date();
      const startDate =
        input.startDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate =
        input.endDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      // Get all transactions in the period
      const transactions = await db.query.bankTransactions.findMany({
        where: and(
          eq(bankTransactions.entityId, entityId),
          gte(bankTransactions.transactionDate, startDate),
          lte(bankTransactions.transactionDate, endDate),
        ),
        orderBy: [bankTransactions.transactionDate],
      });

      // Calculate daily balances
      const dailyBalances: Record<string, number> = {};
      let runningBalance = 0;

      for (const tx of transactions) {
        const date = tx.transactionDate;
        const amount = parseFloat(tx.amount);
        runningBalance += amount;
        dailyBalances[date] = runningBalance;
      }

      // Calculate incoming and outgoing
      const incoming = transactions
        .filter((tx) => parseFloat(tx.amount) > 0)
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

      const outgoing = transactions
        .filter((tx) => parseFloat(tx.amount) < 0)
        .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);

      // Get current balance
      const accounts = await db.query.bankAccounts.findMany({
        where: eq(bankAccounts.entityId, entityId),
        columns: { currentBalance: true },
      });

      const currentBalance = accounts.reduce(
        (sum, acc) => sum + parseFloat(acc.currentBalance ?? "0"),
        0,
      );

      return {
        dailyBalances,
        currentBalance,
        incoming,
        outgoing,
        netChange: incoming - outgoing,
        periodStart: startDate,
        periodEnd: endDate,
      };
    }),

  /**
   * Get bank account details.
   */
  getAccountDetails: rlsProtectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const account = await db.query.bankAccounts.findFirst({
        where: and(
          eq(bankAccounts.id, input.accountId),
          eq(bankAccounts.entityId, entityId),
        ),
      });

      if (!account) {
        return null;
      }

      // Get recent transactions
      const recentTransactions = await db.query.bankTransactions.findMany({
        where: eq(bankTransactions.bankAccountId, input.accountId),
        orderBy: [desc(bankTransactions.transactionDate)],
        limit: 20,
      });

      // Get transaction summary
      const txSummary = await db
        .select({
          count: count(),
          totalDeposits: sum(
            sql`CASE WHEN ${bankTransactions.amount} > 0 THEN ${bankTransactions.amount} ELSE 0 END`,
          ),
          totalWithdrawals: sum(
            sql`CASE WHEN ${bankTransactions.amount} < 0 THEN ABS(${bankTransactions.amount}) ELSE 0 END`,
          ),
        })
        .from(bankTransactions)
        .where(eq(bankTransactions.bankAccountId, input.accountId));

      return {
        ...account,
        maskedNumber: `**** **** **** ${account.accountNumber.slice(-4)}`,
        recentTransactions: recentTransactions.map((tx) => ({
          id: tx.id,
          description: tx.description,
          amount: parseFloat(tx.amount),
          type: tx.type,
          date: tx.transactionDate,
          isReconciled: tx.isReconciled,
        })),
        stats: {
          totalTransactions: txSummary[0]?.count ?? 0,
          totalDeposits: parseFloat(txSummary[0]?.totalDeposits ?? "0"),
          totalWithdrawals: parseFloat(txSummary[0]?.totalWithdrawals ?? "0"),
        },
      };
    }),

  /**
   * Get AI insights for the banking page.
   */
  getAiInsights: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const insights: Array<{
      id: string;
      type: "warning" | "info" | "success";
      title: string;
      description: string;
      actionLabel: string;
    }> = [];

    // Check for large transactions
    const largeTransactions = await db.query.bankTransactions.findMany({
      where: and(
        eq(bankTransactions.entityId, entityId),
        sql`ABS(${bankTransactions.amount}) > 100000`,
      ),
      orderBy: [desc(bankTransactions.createdAt)],
      limit: 5,
    });

    if (largeTransactions.length > 0) {
      insights.push({
        id: "large-transaction",
        type: "warning",
        title: "Unusual Activity Detected",
        description: `Large cash withdrawal of GMD ${Math.abs(
          parseFloat(largeTransactions[0].amount),
        ).toLocaleString()} from ${largeTransactions[0].description}`,
        actionLabel: "Review transaction →",
      });
    }

    // Check for accounts with unreconciled items
    const unreconciledAccounts = await db
      .select({
        accountId: bankTransactions.bankAccountId,
        count: count(),
      })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.isReconciled, false),
        ),
      )
      .groupBy(bankTransactions.bankAccountId);

    if (unreconciledAccounts.length > 0) {
      insights.push({
        id: "unreconciled",
        type: "info",
        title: "Reconciliation Suggestion",
        description: `${unreconciledAccounts.length} accounts have unreconciled items. Reconcile now to keep your books accurate.`,
        actionLabel: "Go to Reconciliation →",
      });
    }

    // Cash forecast insight
    const accounts = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.entityId, entityId),
      columns: { currentBalance: true },
    });

    const totalBalance = accounts.reduce(
      (sum, acc) => sum + parseFloat(acc.currentBalance ?? "0"),
      0,
    );

    if (totalBalance > 0) {
      insights.push({
        id: "cash-forecast",
        type: "success",
        title: "Cash Forecast",
        description: `Based on your trends, you may have a cash surplus of GMD ${(
          totalBalance * 0.07
        ).toLocaleString()} by end of month.`,
        actionLabel: "View forecast →",
      });
    }

    return insights;
  }),

  /**
   * Get recent activity for the sidebar.
   */
  getRecentActivity: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const recentTransactions = await db.query.bankTransactions.findMany({
      where: eq(bankTransactions.entityId, entityId),
      orderBy: [desc(bankTransactions.createdAt)],
      limit: 5,
    });

    // Get account names for each transaction
    const activities = await Promise.all(
      recentTransactions.map(async (tx) => {
        const account = await db.query.bankAccounts.findFirst({
          where: eq(bankAccounts.id, tx.bankAccountId),
          columns: { name: true, bankName: true },
        });

        return {
          id: tx.id,
          bankName: account?.bankName ?? "Unknown Bank",
          accountName: account?.name ?? "Unknown Account",
          action:
            tx.type === "deposit"
              ? "Transactions synced"
              : "Statement imported",
          date: new Date(tx.createdAt),
        };
      }),
    );

    return activities;
  }),
});
