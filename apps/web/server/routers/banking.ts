import { z } from "zod";
import {
  eq,
  and,
  or,
  asc,
  desc,
  sql,
  count,
  sum,
  gte,
  lte,
  inArray,
  notInArray,
} from "drizzle-orm";
import {
  bankAccounts,
  bankTransactions,
  bankConnections,
  bankRules,
  bankTxTypeEnum,
  statementLines,
  auditLog,
  aiCorrections,
  journalEntries,
  journalEntryLines,
  reconciliations,
  chartOfAccounts,
  fiscalPeriods,
} from "@xenboox/db/schema";

import { TRPCError } from "@trpc/server";
import {
  decryptConnectionToken,
  isMoneyIn,
  signedBankAmount,
  categorizeByDescription,
  matchBankRules,
  buildBankJournalLines,
  resolveBankGlAccount,
  resolveCategoryGlAccount,
} from "@xenboox/db";
import { validateJournalEntry, trustGuardToError } from "@xenboox/agents";
import {
  handleMutationError,
  router,
  rlsMutateProcedure,
  rlsProtectedProcedure,
  requirePermission,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { removePlaidItem } from "@/lib/plaid-api";
import { tenantJobOptions, triggerClient } from "@/lib/trigger";

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
      const currency = account.currency ?? "USD";
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

    // Get accounts with transaction counts — two grouped queries instead of
    // 2×N round-trips (N accounts × count + last-tx).
    const accountIds = accounts.map((a) => a.id);

    const txCounts = accountIds.length
      ? await db
          .select({
            bankAccountId: bankTransactions.bankAccountId,
            count: count(),
          })
          .from(bankTransactions)
          .where(inArray(bankTransactions.bankAccountId, accountIds))
          .groupBy(bankTransactions.bankAccountId)
      : [];
    const countByAccount = new Map(
      txCounts.map((r) => [r.bankAccountId, Number(r.count)]),
    );

    // Last transaction date per account via DISTINCT ON (one query).
    const lastTxRows = accountIds.length
      ? await db
          .selectDistinctOn([bankTransactions.bankAccountId], {
            bankAccountId: bankTransactions.bankAccountId,
            transactionDate: bankTransactions.transactionDate,
          })
          .from(bankTransactions)
          .where(inArray(bankTransactions.bankAccountId, accountIds))
          .orderBy(
            desc(bankTransactions.bankAccountId),
            desc(bankTransactions.transactionDate),
          )
      : [];
    const lastTxByAccount = new Map(
      lastTxRows.map((r) => [r.bankAccountId, r.transactionDate]),
    );

    const accountsWithStats = accounts.map((account) => ({
      ...account,
      transactionCount: countByAccount.get(account.id) ?? 0,
      lastTransactionDate: lastTxByAccount.get(account.id) ?? null,
      maskedNumber: `**** **** **** ${account.accountNumber.slice(-4)}`,
    }));

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

      // Stored amounts are positive magnitudes; the type carries direction
      // (deposit/interest = money in, everything else = money out).
      const signed = (tx: (typeof transactions)[number]) =>
        signedBankAmount(tx.type, tx.amount);

      // Incoming / outgoing split (always positive magnitudes).
      const incoming = transactions
        .filter((tx) => isMoneyIn(tx.type))
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      const outgoing = transactions
        .filter((tx) => !isMoneyIn(tx.type))
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

      // Current balance is the authoritative anchor. When accounts were
      // created by demo/sync with a zero balance, fall back to openingBalance
      // so the series does not silently start at zero.
      const accounts = await db.query.bankAccounts.findMany({
        where: eq(bankAccounts.entityId, entityId),
        columns: { currentBalance: true, openingBalance: true },
      });
      const currentBalance = accounts.reduce(
        (sum, acc) => sum + parseFloat(acc.currentBalance ?? "0"),
        0,
      );
      const anchoredBalance =
        currentBalance !== 0
          ? currentBalance
          : accounts.reduce(
              (sum, acc) => sum + parseFloat(acc.openingBalance ?? "0"),
              0,
            );

      // Daily balances: end-of-day balance per date. Start from the balance
      // just before the period (anchor − net change over the whole period),
      // then walk forward applying each day's signed net change.
      const totalNet = transactions.reduce((sum, tx) => sum + signed(tx), 0);
      const netByDate = new Map<string, number>();
      for (const tx of transactions) {
        const date = tx.transactionDate;
        netByDate.set(date, (netByDate.get(date) ?? 0) + signed(tx));
      }
      const dailyBalances: Record<string, number> = {};
      let runningBalance = anchoredBalance - totalNet;
      for (const date of [...netByDate.keys()].sort()) {
        runningBalance += netByDate.get(date) ?? 0;
        dailyBalances[date] = runningBalance;
      }

      return {
        dailyBalances,
        currentBalance: anchoredBalance,
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

      // Get transaction summary. Stored amounts are positive magnitudes with
      // direction in `type` (deposit/interest = in; rest = out) — never infer
      // direction from the amount sign.
      const txSummary = await db
        .select({
          count: count(),
          totalDeposits: sum(
            sql`CASE WHEN ${bankTransactions.type} IN ('deposit', 'interest') THEN ${bankTransactions.amount} ELSE 0 END`,
          ),
          totalWithdrawals: sum(
            sql`CASE WHEN ${bankTransactions.type} IN ('deposit', 'interest') THEN 0 ELSE ${bankTransactions.amount} END`,
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
          amount: signedBankAmount(tx.type, tx.amount),
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

    // Get account names for each transaction — one IN query instead of N
    // per-transaction lookups.
    const accountIds = [
      ...new Set(
        recentTransactions
          .map((tx) => tx.bankAccountId)
          .filter((id): id is string => !!id),
      ),
    ];
    const accountsById = accountIds.length
      ? await db
          .select({
            id: bankAccounts.id,
            name: bankAccounts.name,
            bankName: bankAccounts.bankName,
          })
          .from(bankAccounts)
          .where(inArray(bankAccounts.id, accountIds))
      : [];
    const accountMap = new Map(accountsById.map((a) => [a.id, a]));

    const activities = recentTransactions.map((tx) => {
      const account = accountMap.get(tx.bankAccountId) ?? null;
      return {
        id: tx.id,
        bankName: account?.bankName ?? "Unknown Bank",
        accountName: account?.name ?? "Unknown Account",
        action:
          tx.type === "deposit" ? "Transactions synced" : "Statement imported",
        date: new Date(tx.createdAt),
      };
    });

    return activities;
  }),

  // ── Transactions tab ──
  /**
   * Paginated bank transactions for the Banking → Transactions panel.
   * Entity-scoped, optional account/status/type/search filters.
   */
  listTransactions: rlsProtectedProcedure
    .input(
      z.object({
        accountId: z.string().uuid().optional(),
        status: z.enum(["all", "reconciled", "unreconciled"]).default("all"),
        type: z.enum(bankTxTypeEnum.enumValues).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const conditions = [eq(bankTransactions.entityId, entityId)];

      if (input.accountId) {
        conditions.push(eq(bankTransactions.bankAccountId, input.accountId));
      }
      if (input.status === "reconciled") {
        conditions.push(eq(bankTransactions.isReconciled, true));
      } else if (input.status === "unreconciled") {
        conditions.push(eq(bankTransactions.isReconciled, false));
      }
      if (input.type) {
        conditions.push(eq(bankTransactions.type, input.type));
      }
      if (input.search) {
        conditions.push(
          sql`${bankTransactions.description} ILIKE ${`%${input.search}%`}`,
        );
      }

      const totalCountResult = await db
        .select({ count: count() })
        .from(bankTransactions)
        .where(and(...conditions));
      const totalCount = totalCountResult[0]?.count ?? 0;

      const rows = await db.query.bankTransactions.findMany({
        where: and(...conditions),
        orderBy: [desc(bankTransactions.transactionDate)],
        limit: input.limit,
        offset: input.offset,
        with: {
          bankAccount: {
            columns: { name: true, bankName: true, currency: true },
          },
        },
      });

      return {
        transactions: rows.map((tx) => ({
          id: tx.id,
          date: tx.transactionDate,
          description: tx.description,
          reference: tx.reference,
          type: tx.type,
          amount: parseFloat(tx.amount),
          balance: tx.balance ? parseFloat(tx.balance) : null,
          isReconciled: tx.isReconciled,
          category: tx.category,
          glAccountId: tx.glAccountId,
          categorizedBy: tx.categorizedBy,
          categorizationConfidence: tx.categorizationConfidence
            ? parseFloat(tx.categorizationConfidence)
            : null,
          journalEntryId: tx.journalEntryId,
          accountName: tx.bankAccount?.name ?? "Unknown Account",
          bankName: tx.bankAccount?.bankName ?? "",
          currency: tx.bankAccount?.currency ?? "USD",
        })),
        totalCount,
        totalPages: Math.ceil(totalCount / input.limit),
      };
    }),

  // ── Connections tab ──
  /**
   * Bank connections with sync status (tokens never exposed).
   */
  listConnections: rlsProtectedProcedure.query(async ({ ctx }) => {
    const rows = await db.query.bankConnections.findMany({
      where: eq(bankConnections.entityId, ctx.entityId!),
      orderBy: [desc(bankConnections.createdAt)],
    });

    return rows.map((conn) => ({
      id: conn.id,
      provider: conn.provider,
      institutionName: conn.institutionName,
      accountName: conn.accountName,
      accountNumber: conn.accountNumber
        ? `**** ${conn.accountNumber.slice(-4)}`
        : null,
      accountType: conn.accountType,
      currency: conn.currency,
      status: conn.status,
      lastSyncedAt: conn.lastSyncedAt,
      syncError: conn.syncError,
      createdAt: conn.createdAt,
    }));
  }),

  /**
   * Delete a bank connection and optionally its associated bank account.
   * Transactions are preserved for audit trail but the connection is removed.
   */
  deleteConnection: rlsMutateProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;

        const conn = await db.query.bankConnections.findFirst({
          where: and(
            eq(bankConnections.id, input.connectionId),
            eq(bankConnections.entityId, entityId),
          ),
        });

        if (!conn) {
          throw new Error("Connection not found");
        }

        // Revoke the provider item FIRST (best-effort) so the live credential
        // dies server-side and Plaid stops billing for the orphaned item.
        // If revocation fails we still delete locally but surface the error.
        let revokeError: string | null = null;
        if (conn.provider === "plaid") {
          const token = decryptConnectionToken(conn.accessToken);
          if (token) {
            try {
              await removePlaidItem(token);
            } catch (e) {
              revokeError = e instanceof Error ? e.message : "Revoke failed";
            }
          }
        }

        // Delete the connection
        await db
          .delete(bankConnections)
          .where(eq(bankConnections.id, input.connectionId));

        // Optionally deactivate the linked bank account (don't delete transactions)
        const linkedAccount = await db.query.bankAccounts.findFirst({
          where: and(
            eq(bankAccounts.entityId, entityId),
            eq(bankAccounts.bankName, conn.institutionName),
          ),
        });

        if (linkedAccount) {
          await db
            .update(bankAccounts)
            .set({ isActive: false })
            .where(eq(bankAccounts.id, linkedAccount.id));
        }

        await db.insert(auditLog).values({
          entityId,
          userId: ctx.session!.user!.id!,
          action: "banking.deleteConnection",
          entityType: "bank_connection",
          entityIdRef: input.connectionId,
          oldValues: {
            institutionName: conn.institutionName,
            provider: conn.provider,
            revokeError,
          },
        });

        return { success: true, revokeError };
      } catch (error) {
        handleMutationError(error, "Failed to delete connection");
      }
    }),

  /**
   * Sync transactions from Plaid (or generate demo data).
   * Calls Plaid transactionsSync for incremental updates, or generates
   * sample transactions in demo mode.
   */
  syncTransactions: rlsMutateProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;

        // Load the connection
        const conn = await db.query.bankConnections.findFirst({
          where: and(
            eq(bankConnections.id, input.connectionId),
            eq(bankConnections.entityId, entityId),
          ),
        });

        if (!conn) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Connection not found",
          });
        }

        // M1 — no more than one sync per connection every 30s (the job has
        // its own idempotency key so even parallel clicks collapse).
        if (
          conn.lastSyncedAt &&
          Date.now() - new Date(conn.lastSyncedAt).getTime() < 30_000
        ) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Sync already in progress — try again shortly",
          });
        }

        // ── Real provider sync: dispatch to the shared job ────────────
        // The job owns cursor state (metadata.plaidCursor), dedup, retries and
        // DLQ. This router previously re-implemented the whole Plaid sync
        // inline (writing a DIFFERENT cursor key, syncCursor), so manual sync
        // and the cron reset each other's cursors and full re-syncs happened.
        // One implementation, one cursor, one retry policy.
        if (
          (conn.provider === "plaid" || conn.provider === "mono") &&
          conn.accessToken
        ) {
          const taskId =
            conn.provider === "plaid"
              ? "plaid-sync-transactions"
              : "mono-sync-transactions";

          await triggerClient.tasks.trigger(
            taskId,
            {
              connectionId: conn.id,
              entityId,
              ...(conn.provider === "mono"
                ? { providerConnectionId: conn.providerConnectionId }
                : {}),
            },
            tenantJobOptions(entityId, `manual-sync:${conn.id}`),
          );

          return { synced: true, triggered: true };
        }

        // ── Demo connections (provider=manual, no live feed): generate ──
        // sample transactions so the banking surface is explorable. A Mono or
        // Stitch connection missing its token is a real error, not a demo.
        if (conn.provider === "mono" || conn.provider === "stitch") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Connection is missing its access token — reconnect it",
          });
        }

        // Find (or create) the linked bank account for the demo account.
        let bankAccount = await db.query.bankAccounts.findFirst({
          where: and(
            eq(bankAccounts.entityId, entityId),
            eq(bankAccounts.bankName, conn.institutionName),
          ),
        });

        if (!bankAccount) {
          [bankAccount] = await db
            .insert(bankAccounts)
            .values({
              entityId,
              name: conn.accountName ?? conn.institutionName,
              bankName: conn.institutionName,
              accountNumber: conn.accountNumber ?? "00000000",
              currency: conn.currency ?? "USD",
              isActive: true,
            })
            .returning();
        }

        const sampleTransactions = generateDemoTransactions(
          entityId,
          bankAccount.id,
        );

        // Only insert if no transactions exist for this account yet
        const existingCount = await db
          .select({ count: count() })
          .from(bankTransactions)
          .where(eq(bankTransactions.bankAccountId, bankAccount.id));

        if ((existingCount[0]?.count ?? 0) === 0) {
          await db.insert(bankTransactions).values(sampleTransactions);
        }

        // Update sync time
        await db
          .update(bankConnections)
          .set({ lastSyncedAt: new Date(), syncError: null })
          .where(eq(bankConnections.id, conn.id));

        return {
          synced: true,
          added: existingCount[0]?.count === 0 ? sampleTransactions.length : 0,
          modified: 0,
          removed: 0,
          nextCursor: null,
        };
      } catch (error) {
        // Record the sync error
        const errorMessage =
          error instanceof Error ? error.message : "Sync failed";
        await db
          .update(bankConnections)
          .set({ syncError: errorMessage })
          .where(eq(bankConnections.id, input.connectionId));

        handleMutationError(error, "Failed to sync transactions");
      }
    }),

  // ── Statements tab ──
  /**
   * Imported statement lines (normalized from any provider), newest first.
   */
  listStatementLines: rlsProtectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const conditions = [eq(statementLines.entityId, entityId)];

      const totalCountResult = await db
        .select({ count: count() })
        .from(statementLines)
        .where(and(...conditions));
      const totalCount = totalCountResult[0]?.count ?? 0;

      const rows = await db.query.statementLines.findMany({
        where: and(...conditions),
        orderBy: [desc(statementLines.date)],
        limit: input.limit,
        offset: input.offset,
        with: {
          bankAccount: {
            columns: { name: true, bankName: true },
          },
        },
      });

      return {
        lines: rows.map((l) => ({
          id: l.id,
          providerName: l.providerName,
          date: l.date,
          description: l.description,
          reference: l.reference,
          amount: parseFloat(l.amount),
          currency: l.currency,
          status: l.status,
          matchTier: l.matchTier,
          accountName: l.bankAccount?.name ?? null,
        })),
        totalCount,
      };
    }),

  // ── Account management (Settings tab) ──
  updateAccount: rlsMutateProcedure
    .use(requirePermission("bank_reconciliation", "edit"))
    .input(
      z.object({
        accountId: z.string().uuid(),
        isActive: z.boolean().optional(),
        name: z.string().min(1).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [updated] = await db
          .update(bankAccounts)
          .set({
            isActive: input.isActive,
            name: input.name,
            notes: input.notes,
          })
          .where(
            and(
              eq(bankAccounts.id, input.accountId),
              eq(bankAccounts.entityId, ctx.entityId!),
            ),
          )
          .returning();

        if (updated) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "banking.updateAccount",
            entityType: "bank_account",
            entityIdRef: updated.id,
            newValues: { isActive: input.isActive, name: input.name },
          });
        }
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update bank account");
      }
    }),

  // ── Rules tab ──
  listRules: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const rules = await db.query.bankRules.findMany({
      where: eq(bankRules.entityId, entityId),
      orderBy: [asc(bankRules.priority), asc(bankRules.createdAt)],
    });

    // Live match stats — batch ALL rules in one query instead of N+1.
    // Build a single CASE/WHEN query that counts matches per rule.
    const matchCountResults =
      rules.length > 0
        ? await db
            .select({
              matchCount: count(),
              ruleIndex: sql`(
              CASE
                ${rules
                  .map((rule, i) => {
                    switch (rule.matchType) {
                      case "description_contains":
                        return sql`WHEN ${bankTransactions.description} ILIKE ${"%" + rule.matchValue + "%"} THEN ${i}`;
                      case "description_equals":
                        return sql`WHEN ${bankTransactions.description} = ${rule.matchValue} THEN ${i}`;
                      case "reference_contains":
                        return sql`WHEN ${bankTransactions.reference} ILIKE ${"%" + rule.matchValue + "%"} THEN ${i}`;
                      case "amount_equals":
                        return sql`WHEN ${bankTransactions.amount} = ${rule.matchValue} THEN ${i}`;
                      case "amount_above":
                        return sql`WHEN ${bankTransactions.amount} > ${rule.matchValue} THEN ${i}`;
                      case "amount_below":
                        return sql`WHEN ${bankTransactions.amount} < ${rule.matchValue} THEN ${i}`;
                      default:
                        return sql`WHEN false THEN ${i}`;
                    }
                  })
                  .join("\n              ")}
              END
            )`,
            })
            .from(bankTransactions)
            .where(eq(bankTransactions.entityId, entityId))
            .groupBy(sql`ruleIndex`)
        : [];

    const matchCountByIndex = new Map(
      matchCountResults.map((r) => [Number(r.ruleIndex), Number(r.matchCount)]),
    );

    return rules.map((rule, i) => ({
      id: rule.id,
      name: rule.name,
      matchType: rule.matchType,
      matchValue: rule.matchValue,
      category: rule.category,
      glAccountId: rule.glAccountId,
      isActive: rule.isActive,
      priority: rule.priority,
      matchCount: matchCountByIndex.get(i) ?? 0,
    }));
  }),

  createRule: rlsMutateProcedure
    .use(requirePermission("bank_reconciliation", "create"))
    .input(
      z.object({
        name: z.string().min(1),
        matchType: z.enum([
          "description_contains",
          "description_equals",
          "reference_contains",
          "amount_equals",
          "amount_above",
          "amount_below",
        ]),
        matchValue: z.string().min(1),
        category: z.string().min(1).default("Uncategorized"),
        glAccountId: z.string().uuid().optional(),
        isActive: z.boolean().default(true),
        priority: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [rule] = await db
          .insert(bankRules)
          .values({ ...input, entityId: ctx.entityId! })
          .returning();

        if (rule) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "banking.createRule",
            entityType: "bank_rule",
            entityIdRef: rule.id,
            newValues: {
              name: rule.name,
              matchType: rule.matchType,
              category: rule.category,
              priority: rule.priority,
            },
          });
        }
        return rule;
      } catch (error) {
        handleMutationError(error, "Failed to create bank rule");
      }
    }),

  updateRule: rlsMutateProcedure
    .use(requirePermission("bank_reconciliation", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        matchType: z
          .enum([
            "description_contains",
            "description_equals",
            "reference_contains",
            "amount_equals",
            "amount_above",
            "amount_below",
          ])
          .optional(),
        matchValue: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
        priority: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(bankRules)
          .set(data)
          .where(
            and(eq(bankRules.id, id), eq(bankRules.entityId, ctx.entityId!)),
          )
          .returning();

        if (updated) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "banking.updateRule",
            entityType: "bank_rule",
            entityIdRef: updated.id,
            newValues: data,
          });
        }
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update bank rule");
      }
    }),

  deleteRule: rlsMutateProcedure
    .use(requirePermission("bank_reconciliation", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.bankRules.findFirst({
          where: and(
            eq(bankRules.id, input.id),
            eq(bankRules.entityId, ctx.entityId!),
          ),
        });
        if (!existing) {
          throw new Error("Bank rule not found");
        }

        await db.delete(bankRules).where(eq(bankRules.id, input.id));

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "banking.deleteRule",
          entityType: "bank_rule",
          entityIdRef: input.id,
          oldValues: { name: existing.name },
        });
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete bank rule");
      }
    }),

  /**
   * Update a transaction's category (inline override).
   * Sets categorizedBy to 'manual' AND records an aiCorrections learning entry
   * so the system actually learns from the override (pattern keyed on the
   * transaction's normalized description) — previously the comment promised
   * learning but nothing consumed the override.
   */
  updateTransactionCategory: rlsMutateProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        category: z.string().min(1),
        glAccountId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;
        const userId = ctx.session?.user?.id ?? null;

        const existing = await db.query.bankTransactions.findFirst({
          where: and(
            eq(bankTransactions.id, input.transactionId),
            eq(bankTransactions.entityId, entityId),
          ),
        });
        if (!existing) {
          throw new Error("Transaction not found");
        }

        await db
          .update(bankTransactions)
          .set({
            category: input.category,
            glAccountId: input.glAccountId ?? existing.glAccountId,
            categorizedBy: "manual",
            categorizationConfidence: "1.0",
          })
          .where(
            and(
              eq(bankTransactions.id, input.transactionId),
              eq(bankTransactions.entityId, entityId),
            ),
          );

        await db.insert(auditLog).values({
          entityId,
          userId,
          action: "banking.updateCategory",
          entityType: "bank_transaction",
          entityIdRef: input.transactionId,
          oldValues: {
            category: existing.category,
            categorizedBy: existing.categorizedBy,
          },
          newValues: {
            category: input.category,
            categorizedBy: "manual",
          },
        });

        // Learning loop: record the correction when the user changed an
        // AI/rule decision (or an Uncategorized row) to something else.
        const wasAuto =
          existing.categorizedBy === "ai" || existing.categorizedBy === "rule";
        const changedCategory =
          (existing.category ?? "Uncategorized") !== input.category;
        if (wasAuto || changedCategory) {
          const descKey = (existing.description ?? "")
            .toLowerCase()
            .trim()
            .slice(0, 200);
          const patternKey = descKey ? `desc:${descKey}` : null;

          // Upsert by pattern so the same description corrected repeatedly
          // increments timesSeen instead of spawning duplicate rows (mirrors
          // the ai-corrections router's dedup semantics).
          const prior = patternKey
            ? await db.query.aiCorrections.findFirst({
                where: and(
                  eq(aiCorrections.entityId, entityId),
                  eq(aiCorrections.patternKey, patternKey),
                  eq(aiCorrections.correctionType, "categorization"),
                ),
              })
            : null;

          if (prior) {
            await db
              .update(aiCorrections)
              .set({
                timesSeen: prior.timesSeen + 1,
                correctedDecision: {
                  category: input.category,
                  glAccountId: input.glAccountId ?? null,
                },
                correctedBy: userId ?? undefined,
              })
              .where(eq(aiCorrections.id, prior.id));
          } else {
            await db.insert(aiCorrections).values({
              entityId,
              agentName: "banking-agent",
              taskType: "categorize_bank_transaction",
              originalDecision: {
                category: existing.category ?? "Uncategorized",
                glAccountId: existing.glAccountId,
              },
              originalConfidence: existing.categorizationConfidence
                ? existing.categorizationConfidence
                : null,
              correctedDecision: {
                category: input.category,
                glAccountId: input.glAccountId ?? null,
              },
              correctionType: "categorization",
              referenceEntityType: "bank_transaction",
              referenceEntityId: input.transactionId,
              correctedBy: userId ?? undefined,
              patternKey,
              timesSeen: 1,
              learned: false,
            });
          }
        }

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to update category");
      }
    }),

  /**
   * Auto-categorize all uncategorized transactions using rules + AI heuristics.
   * Returns count of newly categorized transactions.
   */
  autoCategorize: rlsMutateProcedure
    .input(z.object({ accountId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;

        // Get active rules sorted by priority
        const rules = await db.query.bankRules.findMany({
          where: and(
            eq(bankRules.entityId, entityId),
            eq(bankRules.isActive, true),
          ),
          orderBy: [asc(bankRules.priority)],
        });

        // Build the uncategorized-transaction selector once (entity-scoped).
        const uncategorizedConditions = [
          eq(bankTransactions.entityId, entityId),
          or(
            sql`${bankTransactions.category} IS NULL`,
            eq(bankTransactions.category, "Uncategorized"),
          ),
        ];
        if (input.accountId) {
          uncategorizedConditions.push(
            eq(bankTransactions.bankAccountId, input.accountId),
          );
        }

        const ruleInputs = rules.map((r) => ({
          matchType: r.matchType,
          matchValue: r.matchValue,
          category: r.category,
          glAccountId: r.glAccountId,
        }));

        // Confidence gate: only matches at/above 0.7 auto-apply. Below that
        // the transaction stays uncategorized and counts toward needsReview.
        const MIN_AUTO_CONFIDENCE = 0.7;
        const PAGE_SIZE = 500;
        const MAX_PER_RUN = 5_000;

        let categorizedCount = 0;
        let needsReviewCount = 0;
        let totalProcessed = 0;
        // Rows we cannot auto-classify (no rule/heuristic match) stay
        // uncategorized — track them so we never re-fetch the same rows in a
        // tight loop and can stop once only unclassifiable rows remain.
        const skippedIds: string[] = [];

        // Loop over pages until no uncategorized transactions remain (or a
        // run cap is hit) — previously this silently stopped at 100.
        while (totalProcessed < MAX_PER_RUN) {
          const pageConditions = skippedIds.length
            ? and(
                ...uncategorizedConditions,
                notInArray(bankTransactions.id, skippedIds),
              )
            : and(...uncategorizedConditions);

          const uncategorized = await db.query.bankTransactions.findMany({
            where: pageConditions,
            columns: {
              id: true,
              description: true,
              reference: true,
              amount: true,
              type: true,
              metadata: true,
            },
            limit: PAGE_SIZE,
          });
          if (uncategorized.length === 0) break;

          totalProcessed += uncategorized.length;

          const updates: Array<{
            id: string;
            category: string;
            glAccountId: string | null;
            categorizedBy: string;
            confidence: string;
          }> = [];

          for (const tx of uncategorized) {
            const match = categorizeTransaction(
              {
                description: tx.description,
                reference: tx.reference,
                amount: tx.amount,
                type: tx.type,
                metadata: tx.metadata ?? undefined,
              },
              ruleInputs,
            );
            if (!match) {
              needsReviewCount++;
              skippedIds.push(tx.id);
              continue;
            }
            if (match.confidence < MIN_AUTO_CONFIDENCE) {
              needsReviewCount++;
              skippedIds.push(tx.id);
              continue;
            }
            updates.push({
              id: tx.id,
              category: match.category,
              glAccountId: match.glAccountId,
              categorizedBy: match.categorizedBy,
              confidence: match.confidence.toString(),
            });
          }

          // Apply this page's matches. Each update is entity-scoped; page
          // size is bounded so this stays cheap.
          if (updates.length > 0) {
            await Promise.all(
              updates.map((u) =>
                db
                  .update(bankTransactions)
                  .set({
                    category: u.category,
                    glAccountId: u.glAccountId ?? undefined,
                    categorizedBy: u.categorizedBy,
                    categorizationConfidence: u.confidence,
                  })
                  .where(
                    and(
                      eq(bankTransactions.id, u.id),
                      eq(bankTransactions.entityId, entityId),
                    ),
                  ),
              ),
            );
            categorizedCount += updates.length;
          }
        }

        return {
          categorizedCount,
          needsReviewCount,
          totalProcessed,
        };
      } catch (error) {
        handleMutationError(error, "Failed to auto-categorize");
      }
    }),

  /**
   * Batch categorize selected transactions using rules + AI heuristics.
   */
  batchCategorize: rlsMutateProcedure
    .input(z.object({ transactionIds: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;

        // Get active rules
        const rules = await db.query.bankRules.findMany({
          where: and(
            eq(bankRules.entityId, entityId),
            eq(bankRules.isActive, true),
          ),
          orderBy: [asc(bankRules.priority)],
        });

        // Get selected transactions (entity-scoped, batch IN)
        const transactions = await db.query.bankTransactions.findMany({
          where: and(
            eq(bankTransactions.entityId, entityId),
            inArray(bankTransactions.id, input.transactionIds),
          ),
        });

        const ruleInputs = rules.map((r) => ({
          matchType: r.matchType,
          matchValue: r.matchValue,
          category: r.category,
          glAccountId: r.glAccountId,
        }));

        // Confidence gate: batch categorize is an explicit user action, but we
        // still refuse to stamp low-confidence guesses as fact.
        const MIN_AUTO_CONFIDENCE = 0.7;

        const updates: Array<{
          id: string;
          category: string;
          glAccountId: string | null;
          categorizedBy: string;
          confidence: string;
          previous: {
            category: string | null;
            glAccountId: string | null;
            categorizedBy: string | null;
            confidence: string | null;
          };
        }> = [];
        let needsReviewCount = 0;

        for (const tx of transactions) {
          const match = categorizeTransaction(
            {
              description: tx.description,
              reference: tx.reference,
              amount: tx.amount,
              type: tx.type,
              metadata: tx.metadata ?? undefined,
            },
            ruleInputs,
          );
          if (!match) {
            needsReviewCount++;
            continue;
          }
          if (match.confidence < MIN_AUTO_CONFIDENCE) {
            needsReviewCount++;
            continue;
          }
          updates.push({
            id: tx.id,
            category: match.category,
            glAccountId: match.glAccountId,
            categorizedBy: match.categorizedBy,
            confidence: match.confidence.toString(),
            previous: {
              category: tx.category ?? null,
              glAccountId: tx.glAccountId ?? null,
              categorizedBy: tx.categorizedBy ?? null,
              confidence: tx.categorizationConfidence ?? null,
            },
          });
        }

        // Batch update (entity-scoped per row)
        if (updates.length > 0) {
          await Promise.all(
            updates.map((u) =>
              db
                .update(bankTransactions)
                .set({
                  category: u.category,
                  glAccountId: u.glAccountId ?? undefined,
                  categorizedBy: u.categorizedBy,
                  categorizationConfidence: u.confidence,
                })
                .where(
                  and(
                    eq(bankTransactions.id, u.id),
                    eq(bankTransactions.entityId, entityId),
                  ),
                ),
            ),
          );
        }

        return {
          categorizedCount: updates.length,
          needsReviewCount,
          totalProcessed: transactions.length,
          previousState: updates.map((u) => ({
            id: u.id,
            ...u.previous,
          })),
        };
      } catch (error) {
        handleMutationError(error, "Failed to batch categorize");
      }
    }),

  /**
   * Revert a batch categorization back to its captured previous state.
   * Powers the banking-view Undo action — restores the real prior category,
   * GL account, categorizer and confidence, not a fake toast.
   */
  revertCategorization: rlsMutateProcedure
    .input(
      z.object({
        restorations: z.array(
          z.object({
            id: z.string().uuid(),
            category: z.string().nullable(),
            glAccountId: z.string().uuid().nullable(),
            categorizedBy: z.string().nullable(),
            confidence: z.string().nullable(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;
        if (input.restorations.length === 0) {
          return { restoredCount: 0 };
        }

        await Promise.all(
          input.restorations.map((r) =>
            db
              .update(bankTransactions)
              .set({
                category: r.category ?? "Uncategorized",
                glAccountId: r.glAccountId ?? undefined,
                categorizedBy: r.categorizedBy ?? undefined,
                categorizationConfidence: r.confidence ?? undefined,
              })
              .where(
                and(
                  eq(bankTransactions.id, r.id),
                  eq(bankTransactions.entityId, entityId),
                ),
              ),
          ),
        );

        return { restoredCount: input.restorations.length };
      } catch (error) {
        handleMutationError(error, "Failed to revert categorization");
      }
    }),

  /**
   * Post categorized bank transactions to the general ledger.
   *
   * The missing link in the pipeline: without this, money imported from the
   * bank never reaches the P&L / trial balance (which read posted journal
   * entries only). For each transaction:
   *   - skip already-posted (journalEntryId set), uncategorized, or
   *     unresolvable-GL-account rows (surfaced as skipped with a reason)
   *   - build balanced double-entry lines (bank asset account ↔ category
   *     account) via the shared bank-ledger module
   *   - run TrustGuard validateJournalEntry + open-period check
   *   - insert the JE (status posted, reference `bank-tx-{id}` so a duplicate
   *     can never be created even racing) + lines, link the bank tx back
   */
  postToLedger: rlsMutateProcedure
    .input(z.object({ transactionIds: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;
        if (input.transactionIds.length === 0) {
          return { postedCount: 0, skipped: [] };
        }

        // Fetch the target transactions (entity-scoped).
        const txs = await db.query.bankTransactions.findMany({
          where: and(
            eq(bankTransactions.entityId, entityId),
            inArray(bankTransactions.id, input.transactionIds),
          ),
        });
        if (txs.length === 0) return { postedCount: 0, skipped: [] };

        // Resolve COA once for the whole entity (bank side + category side).
        const coaRows = (await db.query.chartOfAccounts.findMany({
          where: eq(chartOfAccounts.entityId, entityId),
          columns: {
            id: true,
            code: true,
            name: true,
            type: true,
            subtype: true,
          },
        })) as Array<{
          id: string;
          code: string;
          name: string;
          type: string;
          subtype: string;
        }>;

        // Bank account → GL asset account (create deterministically if missing).
        const bankAccountsRows = await db.query.bankAccounts.findMany({
          where: eq(bankAccounts.entityId, entityId),
        });
        const bankGlByAccountId = new Map<string, string>();
        for (const ba of bankAccountsRows) {
          const resolved = resolveBankGlAccount(coaRows, {
            bankAccountName: ba.name,
            bankName: ba.bankName,
            key: ba.accountNumber,
          });
          if (resolved.account) {
            bankGlByAccountId.set(ba.id, resolved.account.id);
          } else if (resolved.toCreate) {
            // Create the asset row now (stable code from the helper).
            const [created] = await db
              .insert(chartOfAccounts)
              .values({
                entityId,
                code: resolved.toCreate.code,
                name: resolved.toCreate.name,
                type: "asset",
                subtype: "bank_account",
              })
              .returning({ id: chartOfAccounts.id });
            if (created) {
              bankGlByAccountId.set(ba.id, created.id);
              await db
                .update(bankAccounts)
                .set({ glAccountId: created.id })
                .where(
                  and(
                    eq(bankAccounts.id, ba.id),
                    eq(bankAccounts.entityId, entityId),
                  ),
                );
            }
          }
        }

        const results: Array<{
          transactionId: string;
          status: "posted" | "skipped";
          reason?: string;
          journalEntryId?: string;
        }> = [];
        let postedCount = 0;

        for (const tx of txs) {
          // Guards (M3 idempotency + correctness):
          if (tx.journalEntryId) {
            results.push({
              transactionId: tx.id,
              status: "skipped",
              reason: "already_posted",
            });
            continue;
          }
          if (!tx.category || tx.category === "Uncategorized") {
            results.push({
              transactionId: tx.id,
              status: "skipped",
              reason: "uncategorized",
            });
            continue;
          }

          const bankGl = bankGlByAccountId.get(tx.bankAccountId);
          if (!bankGl) {
            results.push({
              transactionId: tx.id,
              status: "skipped",
              reason: "no_bank_gl_account",
            });
            continue;
          }

          const categoryGl = resolveCategoryGlAccount(coaRows, {
            category: tx.category,
            ruleGlAccountId: tx.glAccountId,
          });
          if (!categoryGl) {
            results.push({
              transactionId: tx.id,
              status: "skipped",
              reason: "no_category_gl_account",
            });
            continue;
          }

          // Resolve the fiscal period from the transaction date (must be open).
          const year = Number(tx.transactionDate.slice(0, 4));
          const month = Number(tx.transactionDate.slice(5, 7));
          const period = await db.query.fiscalPeriods.findFirst({
            where: and(
              eq(fiscalPeriods.entityId, entityId),
              eq(fiscalPeriods.year, year),
              eq(fiscalPeriods.month, month),
            ),
          });
          if (!period) {
            results.push({
              transactionId: tx.id,
              status: "skipped",
              reason: "no_fiscal_period",
            });
            continue;
          }
          if (period.status !== "open") {
            results.push({
              transactionId: tx.id,
              status: "skipped",
              reason: "period_not_open",
            });
            continue;
          }

          // Build + TrustGuard-validate the balanced entry.
          const lines = buildBankJournalLines(
            {
              amount: tx.amount,
              type: tx.type,
              description: tx.description,
            },
            bankGl,
            categoryGl,
          );
          const trustResult = await validateJournalEntry({
            entityId,
            periodId: period.id,
            date: tx.transactionDate,
            lines: lines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
            })),
            description: tx.description,
          });
          if (!trustResult.passed) {
            results.push({
              transactionId: tx.id,
              status: "skipped",
              reason: `validation:${trustGuardToError(trustResult) ?? "failed"}`,
            });
            continue;
          }

          // Insert JE + lines in a transaction (reference guard = idempotent).
          const reference = `bank-tx-${tx.id}`;
          const jeResult = await db.transaction(async (tdb) => {
            // Idempotency: a concurrent/retried run may have already posted
            // this exact bank tx — reuse that JE instead of creating a second.
            const existing = await tdb.query.journalEntries.findFirst({
              where: and(
                eq(journalEntries.entityId, entityId),
                eq(journalEntries.reference, reference),
              ),
              columns: { id: true },
            });
            if (existing) return existing.id;

            // entryNumber: unique per entity — compute under the transaction.
            const [last] = await tdb
              .select({ n: journalEntries.entryNumber })
              .from(journalEntries)
              .where(eq(journalEntries.entityId, entityId))
              .orderBy(desc(journalEntries.entryNumber))
              .limit(1);

            const [entry] = await tdb
              .insert(journalEntries)
              .values({
                entityId,
                entryNumber: (last?.n ?? 0) + 1,
                description: tx.description,
                reference,
                date: tx.transactionDate,
                periodId: period.id,
                status: "posted",
                postedBy: ctx.session?.user?.id ?? "system",
                postedAt: new Date(),
                source: "bank_feed",
                confidence: tx.categorizationConfidence ?? "0.95",
              })
              .onConflictDoNothing({ target: journalEntries.reference })
              .returning({ id: journalEntries.id });

            if (!entry) {
              // Lost the race — another run posted this reference first.
              const winner = await tdb.query.journalEntries.findFirst({
                where: and(
                  eq(journalEntries.entityId, entityId),
                  eq(journalEntries.reference, reference),
                ),
                columns: { id: true },
              });
              return winner?.id ?? null;
            }

            await tdb.insert(journalEntryLines).values(
              lines.map((l) => ({
                journalEntryId: entry.id,
                accountId: l.accountId,
                debit: l.debit,
                credit: l.credit,
                description: l.description,
              })),
            );
            return entry.id;
          });

          if (!jeResult) {
            results.push({
              transactionId: tx.id,
              status: "skipped",
              reason: "journal_creation_failed",
            });
            continue;
          }

          // Link the bank tx to the JE + audit.
          await db
            .update(bankTransactions)
            .set({ journalEntryId: jeResult })
            .where(
              and(
                eq(bankTransactions.id, tx.id),
                eq(bankTransactions.entityId, entityId),
              ),
            );
          await db.insert(auditLog).values({
            entityId,
            userId: ctx.session?.user?.id ?? null,
            action: "banking.postToLedger",
            entityType: "bank_transaction",
            entityIdRef: tx.id,
            newValues: {
              journalEntryId: jeResult,
              amount: tx.amount,
              category: tx.category,
            },
          });

          postedCount++;
          results.push({
            transactionId: tx.id,
            status: "posted",
            journalEntryId: jeResult,
          });
        }

        return { postedCount, skipped: results };
      } catch (error) {
        handleMutationError(error, "Failed to post to ledger");
      }
    }),
});

// ─── Shared categorization logic ──────────────────────────────────────────
// Thin wrappers over packages/db/lib/bank-categorizer — the single source of
// truth shared with the sync jobs and statement/CSV parsers.

interface CategoryMatch {
  category: string;
  glAccountId: string | null;
  categorizedBy: string;
  confidence: number;
}

/**
 * Categorize one transaction: user rules first (highest authority), then the
 * shared direction-aware categorizer (provider category signal → keyword
 * heuristics). Returns null when nothing matches with confidence >= MIN.
 */
function categorizeTransaction(
  tx: {
    description: string;
    reference: string | null;
    amount: string;
    type: string;
    metadata?: Record<string, unknown> | null;
  },
  rules: Array<{
    matchType: string;
    matchValue: string;
    category: string;
    glAccountId: string | null;
  }>,
): CategoryMatch | null {
  // 1. User rules (highest authority — they encode explicit intent).
  const ruleMatch = matchBankRules(
    {
      description: tx.description,
      reference: tx.reference,
      amount: tx.amount,
      type: tx.type,
    },
    rules,
  );
  if (ruleMatch) {
    return {
      category: ruleMatch.category,
      glAccountId: ruleMatch.glAccountId ?? null,
      categorizedBy: "rule",
      confidence: ruleMatch.confidence,
    };
  }

  // 2. Provider category signal (Plaid/Mono ship a category per tx) + shared
  // direction-aware heuristics. Plaid category arrays look like
  // ["FOOD_AND_DRINK", ...] — map the primary (first) entry.
  const metadata = tx.metadata;
  let providerCategory: string | null = null;
  if (metadata) {
    const plaid = metadata.plaidCategory;
    if (Array.isArray(plaid) && plaid.length > 0) {
      providerCategory = String(plaid[0]);
    } else if (typeof plaid === "string") {
      providerCategory = plaid;
    } else {
      const mono = metadata.monoCategory;
      if (typeof mono === "string") providerCategory = mono;
    }
  }

  const heuristic = categorizeByDescription({
    description: tx.description,
    reference: tx.reference,
    amount: tx.amount,
    type: tx.type,
    providerCategory,
  });
  if (heuristic) {
    return {
      category: heuristic.category,
      glAccountId: null,
      categorizedBy: "ai",
      confidence: heuristic.confidence,
    };
  }

  return null;
}

// ─── Extended Banking Router ──────────────────────────────────────────────
// Add reconciliation procedures to the existing banking router.

export const reconciliationRouter = router({
  /**
   * Get reconciliation data: unreconciled bank transactions and journal entries.
   * Returns both sides for matching, plus AI-suggested matches.
   */
  getReconciliationData: rlsProtectedProcedure
    .input(
      z.object({
        bankAccountId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Get unreconciled bank transactions
      const bankTxWhere = input.bankAccountId
        ? and(
            eq(bankTransactions.entityId, entityId),
            eq(bankTransactions.isReconciled, false),
            eq(bankTransactions.bankAccountId, input.bankAccountId),
          )
        : and(
            eq(bankTransactions.entityId, entityId),
            eq(bankTransactions.isReconciled, false),
          );

      const unreconciledBankTx = await db
        .select({
          id: bankTransactions.id,
          transactionDate: bankTransactions.transactionDate,
          amount: bankTransactions.amount,
          description: bankTransactions.description,
          reference: bankTransactions.reference,
          type: bankTransactions.type,
          bankAccountId: bankTransactions.bankAccountId,
          balance: bankTransactions.balance,
        })
        .from(bankTransactions)
        .where(bankTxWhere)
        .orderBy(desc(bankTransactions.transactionDate));

      // Get unreconciled journal entries (posted but not linked to bank tx)
      const unreconciledJE = await db
        .select({
          id: journalEntries.id,
          entryNumber: journalEntries.entryNumber,
          date: journalEntries.date,
          description: journalEntries.description,
          status: journalEntries.status,
        })
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.entityId, entityId),
            eq(journalEntries.status, "posted"),
            sql`${journalEntries.id} NOT IN (
              SELECT journal_entry_id FROM bank_transactions 
              WHERE journal_entry_id IS NOT NULL AND entity_id = ${entityId}
            )`,
          ),
        )
        .orderBy(desc(journalEntries.date));

      // Get totals
      const bankTotal = unreconciledBankTx.reduce(
        (sum, tx) => sum + Math.abs(parseFloat(tx.amount ?? "0")),
        0,
      );
      const jeTotal = unreconciledJE.length; // Count of entries

      // Get bank accounts for filter
      const accounts = await db.query.bankAccounts.findMany({
        where: eq(bankAccounts.entityId, entityId),
        columns: { id: true, name: true, currentBalance: true },
      });

      // Get recent reconciliations
      const recentReconciliations = await db
        .select({
          id: reconciliations.id,
          statementDate: reconciliations.statementDate,
          statementBalance: reconciliations.statementBalance,
          bookBalance: reconciliations.bookBalance,
          difference: reconciliations.difference,
          status: reconciliations.status,
          closedAt: reconciliations.closedAt,
        })
        .from(reconciliations)
        .where(eq(reconciliations.entityId, entityId))
        .orderBy(desc(reconciliations.statementDate))
        .limit(5);

      return {
        unreconciledBankTransactions: unreconciledBankTx,
        unreconciledJournalEntries: unreconciledJE,
        bankTotal,
        journalEntryCount: jeTotal,
        accounts,
        recentReconciliations,
        currency: ctx.entityCurrency ?? "USD",
      };
    }),

  /**
   * AI-powered matching: suggests matches between bank transactions and journal entries.
   */
  getAiMatches: rlsProtectedProcedure
    .input(
      z.object({
        bankAccountId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Get unreconciled bank transactions
      const bankTxWhere = input.bankAccountId
        ? and(
            eq(bankTransactions.entityId, entityId),
            eq(bankTransactions.isReconciled, false),
            eq(bankTransactions.bankAccountId, input.bankAccountId),
          )
        : and(
            eq(bankTransactions.entityId, entityId),
            eq(bankTransactions.isReconciled, false),
          );

      const bankTx = await db
        .select({
          id: bankTransactions.id,
          transactionDate: bankTransactions.transactionDate,
          amount: bankTransactions.amount,
          description: bankTransactions.description,
          reference: bankTransactions.reference,
        })
        .from(bankTransactions)
        .where(bankTxWhere)
        .orderBy(desc(bankTransactions.transactionDate))
        .limit(50);

      // Get unreconciled journal entries
      const journalEntriesList = await db
        .select({
          id: journalEntries.id,
          entryNumber: journalEntries.entryNumber,
          date: journalEntries.date,
          description: journalEntries.description,
        })
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.entityId, entityId),
            eq(journalEntries.status, "posted"),
            sql`${journalEntries.id} NOT IN (
              SELECT journal_entry_id FROM bank_transactions 
              WHERE journal_entry_id IS NOT NULL AND entity_id = ${entityId}
            )`,
          ),
        )
        .orderBy(desc(journalEntries.date))
        .limit(50);

      // Batch-query all JE line totals in ONE query (not N+1)
      const jeIds = journalEntriesList.map((je) => je.id);
      const allLines =
        jeIds.length > 0
          ? await db
              .select({
                journalEntryId: journalEntryLines.journalEntryId,
                debit: journalEntryLines.debit,
                credit: journalEntryLines.credit,
              })
              .from(journalEntryLines)
              .where(sql`${journalEntryLines.journalEntryId} IN ${jeIds}`)
          : [];

      // Compute JE totals from batch result
      const jeTotals = new Map<string, number>();
      for (const line of allLines) {
        const current = jeTotals.get(line.journalEntryId) ?? 0;
        jeTotals.set(
          line.journalEntryId,
          current +
            Math.abs(
              parseFloat(line.debit ?? "0") - parseFloat(line.credit ?? "0"),
            ),
        );
      }

      // Rule-based matching (amount + date proximity)
      const matches: Array<{
        bankTransactionId: string;
        journalEntryId: string;
        confidence: number;
        reason: string;
      }> = [];

      for (const tx of bankTx) {
        const txAmount = Math.abs(parseFloat(tx.amount ?? "0"));
        const txDate = new Date(tx.transactionDate);

        for (const je of journalEntriesList) {
          const jeTotal = jeTotals.get(je.id) ?? 0;

          // Exact amount match
          if (Math.abs(txAmount - jeTotal) < 0.01) {
            const jeDate = je.date ? new Date(je.date) : null;
            const daysDiff = jeDate
              ? Math.abs(
                  (txDate.getTime() - jeDate.getTime()) / (1000 * 60 * 60 * 24),
                )
              : 999;

            if (daysDiff <= 7) {
              matches.push({
                bankTransactionId: tx.id,
                journalEntryId: je.id,
                confidence: daysDiff <= 1 ? 0.95 : daysDiff <= 3 ? 0.85 : 0.75,
                reason: `Exact amount match (${ctx.entityCurrency ?? "USD"} ${txAmount.toLocaleString()})${daysDiff <= 1 ? ", same day" : `, ${Math.round(daysDiff)} days apart`}`,
              });
              break; // One match per bank tx
            }
          }
        }
      }

      return {
        matches,
        totalBankTransactions: bankTx.length,
        totalJournalEntries: journalEntriesList.length,
        matchedCount: matches.length,
        unmatchedCount: bankTx.length - matches.length,
      };
    }),

  /**
   * Mark a bank transaction as reconciled and link to journal entry.
   * Bidirectional: also links the JE back to the bank transaction.
   */
  reconcileTransaction: rlsMutateProcedure
    .input(
      z.object({
        bankTransactionId: z.string(),
        journalEntryId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Update bank transaction
      await db
        .update(bankTransactions)
        .set({
          isReconciled: true,
          journalEntryId: input.journalEntryId,
        })
        .where(
          and(
            eq(bankTransactions.id, input.bankTransactionId),
            eq(bankTransactions.entityId, entityId),
          ),
        );

      // Bidirectional: link JE back to bank transaction
      if (input.journalEntryId) {
        await db
          .update(journalEntries)
          .set({
            bankTransactionId: input.journalEntryId
              ? input.bankTransactionId
              : null,
          } as any)
          .where(
            and(
              eq(journalEntries.id, input.journalEntryId),
              eq(journalEntries.entityId, entityId),
            ),
          );
      }

      // Log to audit trail
      await db.insert(auditLog).values({
        entityId,
        entityType: "bank_transaction",
        entityIdRef: input.bankTransactionId,
        action: "reconciled",
        userId: ctx.userId ?? null,
        newValues: {
          journalEntryId: input.journalEntryId,
        },
      });

      return { success: true };
    }),

  /**
   * Unreconcile a bank transaction — removes the reconciliation link.
   */
  unreconcileTransaction: rlsMutateProcedure
    .input(z.object({ bankTransactionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Get the current journal entry link before clearing
      const tx = await db.query.bankTransactions.findFirst({
        where: and(
          eq(bankTransactions.id, input.bankTransactionId),
          eq(bankTransactions.entityId, entityId),
        ),
        columns: { journalEntryId: true },
      });

      // Clear the bank transaction link
      await db
        .update(bankTransactions)
        .set({
          isReconciled: false,
          journalEntryId: null,
        })
        .where(
          and(
            eq(bankTransactions.id, input.bankTransactionId),
            eq(bankTransactions.entityId, entityId),
          ),
        );

      // Bidirectional: also clear the JE link back
      if (tx?.journalEntryId) {
        await db
          .update(journalEntries)
          .set({
            bankTransactionId: null,
          } as any)
          .where(
            and(
              eq(journalEntries.id, tx.journalEntryId),
              eq(journalEntries.entityId, entityId),
            ),
          );
      }

      // Log to audit trail
      await db.insert(auditLog).values({
        entityId,
        entityType: "bank_transaction",
        entityIdRef: input.bankTransactionId,
        action: "unreconciled",
        userId: ctx.userId ?? null,
        oldValues: { journalEntryId: tx?.journalEntryId },
      });

      return { success: true };
    }),
});

// ─── Demo Transaction Generator ────────────────────────────────────────────

/**
 * Generate realistic demo transactions for first-time users.
 * Creates a mix of deposits, withdrawals, and transfers over the last 30 days.
 */
function generateDemoTransactions(
  entityId: string,
  bankAccountId: string,
): Array<{
  entityId: string;
  bankAccountId: string;
  transactionDate: string;
  type: "deposit" | "withdrawal" | "transfer" | "fee";
  amount: string;
  description: string;
  reference: string | null;
  source: string;
  category: string;
  metadata: Record<string, unknown>;
}> {
  const now = new Date();
  const transactions: Array<{
    entityId: string;
    bankAccountId: string;
    transactionDate: string;
    type: "deposit" | "withdrawal" | "transfer" | "fee";
    amount: string;
    description: string;
    reference: string | null;
    source: string;
    category: string;
    metadata: Record<string, unknown>;
  }> = [];

  const templates = [
    {
      desc: "SALARY PAYMENT",
      type: "deposit" as const,
      min: 3000,
      max: 8000,
      category: "Revenue",
    },
    {
      desc: "CLIENT PAYMENT - ACME CORP",
      type: "deposit" as const,
      min: 1000,
      max: 15000,
      category: "Revenue",
    },
    {
      desc: "OFFICE RENT",
      type: "withdrawal" as const,
      min: 800,
      max: 2000,
      category: "Rent & Lease",
    },
    {
      desc: "ELECTRIC COMPANY",
      type: "withdrawal" as const,
      min: 50,
      max: 300,
      category: "Utilities",
    },
    {
      desc: "SAFARICOM MOBILE MONEY",
      type: "withdrawal" as const,
      min: 100,
      max: 500,
      category: "Mobile Money",
    },
    {
      desc: "STARK INDUSTRIES - SOFTWARE",
      type: "withdrawal" as const,
      min: 50,
      max: 200,
      category: "Software & Subscriptions",
    },
    {
      desc: "UBER TRIP",
      type: "withdrawal" as const,
      min: 5,
      max: 50,
      category: "Travel & Transport",
    },
    {
      desc: "RESTAURANT PAYMENT",
      type: "withdrawal" as const,
      min: 20,
      max: 100,
      category: "Meals & Entertainment",
    },
    {
      desc: "BANK FEE",
      type: "fee" as const,
      min: 5,
      max: 25,
      category: "Bank Fees",
    },
    {
      desc: "TRANSFER TO SAVINGS",
      type: "transfer" as const,
      min: 200,
      max: 2000,
      category: "Transfer",
    },
    {
      desc: "CLIENT PAYMENT - BETA LLC",
      type: "deposit" as const,
      min: 2000,
      max: 20000,
      category: "Revenue",
    },
    {
      desc: "GOOGLE ADS",
      type: "withdrawal" as const,
      min: 100,
      max: 1000,
      category: "Marketing",
    },
    {
      desc: "SALARY PAYROLL",
      type: "withdrawal" as const,
      min: 2000,
      max: 6000,
      category: "Payroll",
    },
    {
      desc: "INSURANCE PREMIUM",
      type: "withdrawal" as const,
      min: 100,
      max: 500,
      category: "Insurance",
    },
    {
      desc: "CLIENT PAYMENT - GAMTEL",
      type: "deposit" as const,
      min: 500,
      max: 5000,
      category: "Revenue",
    },
  ];

  // Generate 15-20 transactions over the last 30 days
  const count = 15 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().slice(0, 10);

    const amount = template.min + Math.random() * (template.max - template.min);

    transactions.push({
      entityId,
      bankAccountId,
      transactionDate: dateStr,
      type: template.type,
      amount: amount.toFixed(2),
      description: template.desc,
      reference: `DEMO-${Date.now()}-${i}`,
      source: "demo_sync",
      category: template.category,
      metadata: {
        demo: true,
        generatedAt: new Date().toISOString(),
      },
    });
  }

  return transactions;
}
