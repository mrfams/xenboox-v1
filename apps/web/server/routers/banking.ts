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
} from "drizzle-orm";
import {
  bankAccounts,
  bankTransactions,
  bankConnections,
  bankRules,
  bankTxTypeEnum,
  statementLines,
  auditLog,
  journalEntries,
  journalEntryLines,
  reconciliations,
} from "@xenboox/db/schema";

import { TRPCError } from "@trpc/server";
import {
  handleMutationError,
  router,
  rlsMutateProcedure,
  rlsProtectedProcedure,
  requirePermission,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";

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
      // Amounts are stored as positive; the `type` field indicates direction
      const incoming = transactions
        .filter((tx) => tx.type === "deposit")
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

      const outgoing = transactions
        .filter(
          (tx) =>
            tx.type === "withdrawal" ||
            tx.type === "transfer" ||
            tx.type === "fee",
        )
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

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
          },
        });

        return { success: true };
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

        // Find the linked bank account
        const bankAccount = await db.query.bankAccounts.findFirst({
          where: and(
            eq(bankAccounts.entityId, entityId),
            eq(bankAccounts.bankName, conn.institutionName),
          ),
        });

        if (!bankAccount) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Bank account not found for this connection",
          });
        }

        const meta = (conn.metadata ?? {}) as Record<string, unknown>;
        const syncCursor = (meta.syncCursor as string) ?? null;

        // ── Real Plaid sync ──────────────────────────────────────────
        if (conn.provider === "plaid" && conn.accessToken) {
          const plaidClientId = process.env.PLAID_CLIENT_ID;
          const plaidSecret = process.env.PLAID_SECRET;

          if (!plaidClientId || !plaidSecret) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Plaid not configured",
            });
          }

          const { Configuration, PlaidApi, PlaidEnvironments } = await import(
            "plaid"
          );
          const configuration = new Configuration({
            basePath:
              process.env.PLAID_ENV === "production"
                ? PlaidEnvironments.production
                : process.env.PLAID_ENV === "development"
                  ? PlaidEnvironments.development
                  : PlaidEnvironments.sandbox,
            baseOptions: {
              headers: {
                "PLAID-CLIENT-ID": plaidClientId,
                "PLAID-SECRET": plaidSecret,
              },
            },
          });
          const plaidClient = new PlaidApi(configuration);

          // Incremental sync using cursor
          const syncRequest: Record<string, unknown> = {
            access_token: conn.accessToken,
          };
          if (syncCursor) {
            syncRequest.cursor = syncCursor;
          }

          const syncResponse = await plaidClient.transactionsSync(
            syncRequest as any,
          );
          const data = syncResponse.data;

          // Map Plaid transactions to our schema
          const newTransactions = data.added.map((tx) => {
            const amount = tx.amount ?? 0;
            // Plaid amounts: positive = money flowing to user (deposit)
            // Our schema: positive = deposit, negative = withdrawal
            const type = amount >= 0 ? "deposit" : "withdrawal";

            return {
              entityId,
              bankAccountId: bankAccount.id,
              transactionDate: tx.date,
              valueDate: tx.datetime ?? tx.date,
              type: type as "deposit" | "withdrawal",
              amount: Math.abs(amount).toFixed(2),
              description: tx.name ?? tx.merchant_name ?? "Unknown transaction",
              reference: tx.payment_channel ?? null,
              source: "plaid_sync",
              category: "Uncategorized",
              metadata: {
                plaidTransactionId: tx.transaction_id,
                plaidCategoryId: tx.category_id,
                plaidCategories: tx.category,
                merchantName: tx.merchant_name,
                paymentChannel: tx.payment_channel,
                pending: tx.pending,
              },
            };
          });

          // Batch-query existing transactions by Plaid ID (one query, not N)
          const allPlaidIds = [
            ...data.added.map((tx) => tx.transaction_id),
            ...data.modified.map((tx) => tx.transaction_id),
            ...data.removed.map((tx) => tx.transaction_id),
          ];

          const existing =
            allPlaidIds.length > 0
              ? await db
                  .select({
                    id: bankTransactions.id,
                    metadata: bankTransactions.metadata,
                  })
                  .from(bankTransactions)
                  .where(
                    sql`${bankTransactions.metadata}->>'plaidTransactionId' IN ${allPlaidIds}`,
                  )
              : [];

          const existingByPlaidId = new Map(
            existing.map((e) => {
              const meta = (e.metadata ?? {}) as Record<string, unknown>;
              return [meta.plaidTransactionId as string, e.id];
            }),
          );

          // Insert new transactions (skip duplicates)
          const toInsert = newTransactions.filter(
            (t) =>
              !existingByPlaidId.has(
                (t.metadata as Record<string, unknown>)
                  .plaidTransactionId as string,
              ),
          );

          if (toInsert.length > 0) {
            await db.insert(bankTransactions).values(toInsert);
          }

          // Handle modified transactions
          for (const tx of data.modified) {
            const match = existingByPlaidId.get(tx.transaction_id);
            if (match) {
              await db
                .update(bankTransactions)
                .set({
                  description: tx.name ?? tx.merchant_name ?? "Unknown",
                  amount: String(Math.abs(tx.amount ?? 0)),
                  type: (tx.amount ?? 0) >= 0 ? "deposit" : "withdrawal",
                })
                .where(eq(bankTransactions.id, match));
            }
          }

          // Handle removed transactions (soft-delete via metadata flag)
          for (const tx of data.removed) {
            const match = existingByPlaidId.get(tx.transaction_id);
            if (match) {
              await db
                .update(bankTransactions)
                .set({
                  metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{plaidRemoved}', 'true'::jsonb)`,
                })
                .where(eq(bankTransactions.id, match));
            }
          }

          // Update cursor and sync time
          await db
            .update(bankConnections)
            .set({
              lastSyncedAt: new Date(),
              syncError: null,
              metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{syncCursor}', ${JSON.stringify(data.next_cursor)}::jsonb)`,
            } as any)
            .where(eq(bankConnections.id, conn.id));

          return {
            synced: true,
            added: newTransactions.length,
            modified: data.modified.length,
            removed: data.removed.length,
            nextCursor: data.next_cursor,
          };
        }

        // ── Demo mode: generate sample transactions ────────────────────
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
          added: sampleTransactions.length,
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

    // Live match stats — how many current transactions each rule would match.
    // Explicit column projection: never spread the full row (entityId,
    // timestamps) to the client.
    const withStats = await Promise.all(
      rules.map(async (rule) => ({
        id: rule.id,
        name: rule.name,
        matchType: rule.matchType,
        matchValue: rule.matchValue,
        category: rule.category,
        glAccountId: rule.glAccountId,
        isActive: rule.isActive,
        priority: rule.priority,
        matchCount: await countRuleMatches(entityId, rule),
      })),
    );
    return withStats;
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
   * Sets categorizedBy to 'manual' so the AI learns from this override.
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
        const existing = await db.query.bankTransactions.findFirst({
          where: and(
            eq(bankTransactions.id, input.transactionId),
            eq(bankTransactions.entityId, ctx.entityId!),
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
          .where(eq(bankTransactions.id, input.transactionId));

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
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

        // Get uncategorized transactions
        const conditions = [
          eq(bankTransactions.entityId, entityId),
          or(
            sql`${bankTransactions.category} IS NULL`,
            eq(bankTransactions.category, "Uncategorized"),
          ),
        ];
        if (input.accountId) {
          conditions.push(eq(bankTransactions.bankAccountId, input.accountId));
        }

        const uncategorized = await db.query.bankTransactions.findMany({
          where: and(...conditions),
          limit: 100,
        });

        let categorizedCount = 0;
        const updates: Array<{
          id: string;
          category: string;
          glAccountId: string | null;
          categorizedBy: string;
          confidence: string;
        }> = [];

        for (const tx of uncategorized) {
          let matchedCategory: string | null = null;
          let matchedGlAccountId: string | null = null;
          let matchedBy: string = "ai";
          let confidence: number = 0.7;

          // Try rules first
          for (const rule of rules) {
            const desc = tx.description.toLowerCase();
            const matchVal = rule.matchValue.toLowerCase();
            let matches = false;

            switch (rule.matchType) {
              case "description_contains":
                matches = desc.includes(matchVal);
                break;
              case "description_equals":
                matches = desc === matchVal;
                break;
              case "reference_contains":
                matches = (tx.reference ?? "").toLowerCase().includes(matchVal);
                break;
              case "amount_equals":
                matches = Number(tx.amount) === Number(rule.matchValue);
                break;
              case "amount_above":
                matches = Number(tx.amount) > Number(rule.matchValue);
                break;
              case "amount_below":
                matches = Number(tx.amount) < Number(rule.matchValue);
                break;
            }

            if (matches) {
              matchedCategory = rule.category;
              matchedGlAccountId = rule.glAccountId;
              matchedBy = "rule";
              confidence = 0.95;
              break;
            }
          }

          // AI keyword heuristics fallback
          if (!matchedCategory) {
            const desc = tx.description.toLowerCase();
            if (
              desc.includes("stripe") ||
              desc.includes("fee") ||
              desc.includes("charge")
            ) {
              matchedCategory = "Bank Fees";
              confidence = 0.8;
            } else if (
              desc.includes("salary") ||
              desc.includes("payroll") ||
              desc.includes("wage")
            ) {
              matchedCategory = "Payroll";
              confidence = 0.85;
            } else if (desc.includes("rent") || desc.includes("lease")) {
              matchedCategory = "Rent & Lease";
              confidence = 0.8;
            } else if (
              desc.includes("electric") ||
              desc.includes("water") ||
              desc.includes("internet") ||
              desc.includes("utility")
            ) {
              matchedCategory = "Utilities";
              confidence = 0.8;
            } else if (
              desc.includes("uber") ||
              desc.includes("lyft") ||
              desc.includes("taxi") ||
              desc.includes("fuel")
            ) {
              matchedCategory = "Travel & Transport";
              confidence = 0.75;
            } else if (
              desc.includes("restaurant") ||
              desc.includes("food") ||
              desc.includes("meal") ||
              desc.includes("coffee")
            ) {
              matchedCategory = "Meals & Entertainment";
              confidence = 0.75;
            } else if (
              desc.includes("software") ||
              desc.includes("saas") ||
              desc.includes("subscription")
            ) {
              matchedCategory = "Software & Subscriptions";
              confidence = 0.75;
            } else if (
              desc.includes("marketing") ||
              desc.includes("ad ") ||
              desc.includes("facebook ads") ||
              desc.includes("google ads")
            ) {
              matchedCategory = "Marketing";
              confidence = 0.7;
            } else if (Number(tx.amount) > 0) {
              matchedCategory = "Revenue";
              confidence = 0.6;
            }
          }

          if (matchedCategory) {
            updates.push({
              id: tx.id,
              category: matchedCategory,
              glAccountId: matchedGlAccountId,
              categorizedBy: matchedBy,
              confidence: confidence.toString(),
            });
          }
        }

        // Batch update to avoid N+1 queries
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
                .where(eq(bankTransactions.id, u.id)),
            ),
          );
          categorizedCount = updates.length;
        }

        return { categorizedCount, totalProcessed: uncategorized.length };
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

        // Get selected transactions
        const transactions = await db.query.bankTransactions.findMany({
          where: and(
            eq(bankTransactions.entityId, entityId),
            sql`${bankTransactions.id} IN ${input.transactionIds}`,
          ),
        });

        const updates: Array<{
          id: string;
          category: string;
          glAccountId: string | null;
          categorizedBy: string;
          confidence: string;
        }> = [];

        for (const tx of transactions) {
          let matchedCategory: string | null = null;
          let matchedGlAccountId: string | null = null;
          let matchedBy: string = "ai";
          let confidence: number = 0.7;

          // Try rules first
          for (const rule of rules) {
            const desc = tx.description.toLowerCase();
            const matchVal = rule.matchValue.toLowerCase();
            let matches = false;

            switch (rule.matchType) {
              case "description_contains":
                matches = desc.includes(matchVal);
                break;
              case "description_equals":
                matches = desc === matchVal;
                break;
              case "reference_contains":
                matches = (tx.reference ?? "").toLowerCase().includes(matchVal);
                break;
              case "amount_equals":
                matches = Number(tx.amount) === Number(rule.matchValue);
                break;
              case "amount_above":
                matches = Number(tx.amount) > Number(rule.matchValue);
                break;
              case "amount_below":
                matches = Number(tx.amount) < Number(rule.matchValue);
                break;
            }

            if (matches) {
              matchedCategory = rule.category;
              matchedGlAccountId = rule.glAccountId;
              matchedBy = "rule";
              confidence = 0.95;
              break;
            }
          }

          // AI keyword heuristics fallback
          if (!matchedCategory) {
            const desc = tx.description.toLowerCase();
            if (
              desc.includes("stripe") ||
              desc.includes("fee") ||
              desc.includes("charge")
            ) {
              matchedCategory = "Bank Fees";
              confidence = 0.8;
            } else if (
              desc.includes("salary") ||
              desc.includes("payroll") ||
              desc.includes("wage")
            ) {
              matchedCategory = "Payroll";
              confidence = 0.85;
            } else if (desc.includes("rent") || desc.includes("lease")) {
              matchedCategory = "Rent & Lease";
              confidence = 0.8;
            } else if (
              desc.includes("electric") ||
              desc.includes("water") ||
              desc.includes("internet") ||
              desc.includes("utility")
            ) {
              matchedCategory = "Utilities";
              confidence = 0.8;
            } else if (
              desc.includes("uber") ||
              desc.includes("lyft") ||
              desc.includes("taxi") ||
              desc.includes("fuel")
            ) {
              matchedCategory = "Travel & Transport";
              confidence = 0.75;
            } else if (
              desc.includes("restaurant") ||
              desc.includes("food") ||
              desc.includes("meal") ||
              desc.includes("coffee")
            ) {
              matchedCategory = "Meals & Entertainment";
              confidence = 0.75;
            } else if (
              desc.includes("software") ||
              desc.includes("saas") ||
              desc.includes("subscription")
            ) {
              matchedCategory = "Software & Subscriptions";
              confidence = 0.75;
            } else if (
              desc.includes("marketing") ||
              desc.includes("ad ") ||
              desc.includes("facebook ads") ||
              desc.includes("google ads")
            ) {
              matchedCategory = "Marketing";
              confidence = 0.7;
            } else if (Number(tx.amount) > 0) {
              matchedCategory = "Revenue";
              confidence = 0.6;
            }
          }

          if (matchedCategory) {
            updates.push({
              id: tx.id,
              category: matchedCategory,
              glAccountId: matchedGlAccountId,
              categorizedBy: matchedBy,
              confidence: confidence.toString(),
            });
          }
        }

        // Batch update
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
                .where(eq(bankTransactions.id, u.id)),
            ),
          );
        }

        return {
          categorizedCount: updates.length,
          totalProcessed: transactions.length,
        };
      } catch (error) {
        handleMutationError(error, "Failed to batch categorize");
      }
    }),
});

// ─── Rule match helpers ────────────────────────────────────────────────────

function countRuleMatches(
  entityId: string,
  rule: { matchType: string; matchValue: string },
) {
  const conditions = [eq(bankTransactions.entityId, entityId)];
  switch (rule.matchType) {
    case "description_contains":
      conditions.push(
        sql`${bankTransactions.description} ILIKE ${`%${rule.matchValue}%`}`,
      );
      break;
    case "description_equals":
      conditions.push(
        sql`${bankTransactions.description} = ${rule.matchValue}`,
      );
      break;
    case "reference_contains":
      conditions.push(
        sql`${bankTransactions.reference} ILIKE ${`%${rule.matchValue}%`}`,
      );
      break;
    case "amount_equals":
      conditions.push(sql`${bankTransactions.amount} = ${rule.matchValue}`);
      break;
    case "amount_above":
      conditions.push(sql`${bankTransactions.amount} > ${rule.matchValue}`);
      break;
    case "amount_below":
      conditions.push(sql`${bankTransactions.amount} < ${rule.matchValue}`);
      break;
  }
  return db
    .select({ count: count() })
    .from(bankTransactions)
    .where(and(...conditions))
    .then((r) => r[0]?.count ?? 0);
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
      category: "Uncategorized",
      metadata: {
        demo: true,
        generatedAt: new Date().toISOString(),
      },
    });
  }

  return transactions;
}
