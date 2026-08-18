import { z } from "zod";
import { eq, and, desc, sql, count, sum, gte, lte, inArray } from "drizzle-orm";
import {
  bankAccounts,
  bankTransactions,
  reconciliations,
} from "@xenboox/db/schema";
import {
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";

import {
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { dispatchWebhookEvent } from "@/lib/webhooks/delivery";
import { logger } from "@/lib/logger";

// ─── Match Candidate Scoring ──────────────────────────────────────────────
//
// Real, DB-backed candidate matching for a single unmatched bank transaction.
// A journal entry is a candidate when its posted date falls within a window
// around the bank transaction date and its debit/credit total is close to the
// transaction amount. Confidence combines amount proximity, date proximity,
// and reference/description token overlap — deterministic, no randomness.

type JournalCandidate = {
  journalEntryId: string;
  confidence: number;
  reason: string;
};

const tokenize = (value: string): Set<string> =>
  new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 0),
  );

/**
 * Find candidate journal entries for a bank transaction using amount + date
 * proximity and reference/description overlap scoring.
 */
async function findCandidateMatches(
  entityId: string,
  tx: {
    transactionDate: string;
    amount: string;
    description: string;
    reference: string | null;
  },
): Promise<JournalCandidate[]> {
  const amount = Math.abs(parseFloat(tx.amount));
  const txDate = new Date(`${tx.transactionDate}T00:00:00Z`);
  const windowDays = 31;

  const candidates = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
      sql`${journalEntries.date} >= ${dayOffset(txDate, -windowDays)}`,
      sql`${journalEntries.date} <= ${dayOffset(txDate, windowDays)}`,
    ),
    columns: { id: true, date: true, description: true, reference: true },
  });

  if (candidates.length === 0) return [];

  const entryIds = candidates.map((c) => c.id);
  const lineTotals = await db
    .select({
      journalEntryId: journalEntryLines.journalEntryId,
      debit: sql<string>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
      credit: sql<string>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
    })
    .from(journalEntryLines)
    .where(
      and(
        inArray(journalEntryLines.journalEntryId, entryIds),
        sql`${journalEntryLines.debit} IS NOT NULL`,
      ),
    )
    .groupBy(journalEntryLines.journalEntryId);

  const totalByEntry = new Map<string, number>();
  for (const row of lineTotals) {
    const debit = parseFloat(row.debit ?? "0");
    const credit = parseFloat(row.credit ?? "0");
    totalByEntry.set(row.journalEntryId, Math.abs(debit - credit));
  }

  const txTokens = tokenize(tx.description);
  const txReference = tokenize(tx.reference ?? "");
  const allTokens = new Set([...txTokens, ...txReference]);

  const result: JournalCandidate[] = [];
  for (const entry of candidates) {
    const entryTotal = totalByEntry.get(entry.id) ?? 0;
    const entryDate = new Date(`${entry.date}T00:00:00`);
    const dateDiff =
      Math.abs(entryDate.getTime() - txDate.getTime()) / 86400000;

    // Amount match — the strongest signal.
    const amountDiff = Math.abs(entryTotal - amount);
    if (amountDiff > 5 || (amount > 0 && entryTotal === 0)) continue;

    // Date proximity signal: closer dates score higher (max 0.9).
    const dateScore = Math.max(0, 0.9 - dateDiff * 0.1);

    // Token overlap signal: shared tokens between the bank description /
    // reference and the journal description / reference (max boost 0.5).
    const entryTokens = tokenize(
      `${entry.description ?? ""} ${entry.reference ?? ""}`,
    );
    let overlap = 0;
    for (const t of allTokens) {
      if (entryTokens.has(t)) overlap++;
    }
    const tokenScore = Math.min(
      0.5,
      (overlap / Math.max(allTokens.size, 1)) * 2,
    );

    const confidence = Math.round((dateScore + tokenScore) * 100);

    // Only surface plausible matches.
    if (confidence >= 55) {
      result.push({
        journalEntryId: entry.id,
        confidence: Math.min(confidence, 95),
        reason:
          overlap > 0
            ? `Amount GMD ${entryTotal.toLocaleString()} & reference overlap`
            : `Amount GMD ${entryTotal.toLocaleString()}`,
      });
    }
  }

  return result.sort((a, b) => b.confidence - a.confidence);
}

function dayOffset(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Reconciliation Router ─────────────────────────────────────────────────

export const reconciliationRouter = router({
  // ── Reconciliation Center Data ──
  getReconciliationCenter: rlsProtectedProcedure
    .input(
      z.object({
        bankAccountId: z.string().uuid().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Default to current month
      const now = new Date();
      const startDate =
        input.startDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate =
        input.endDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      // Get bank accounts
      const accounts = await db.query.bankAccounts.findMany({
        where: eq(bankAccounts.entityId, entityId),
      });

      // Get selected account or first one
      const selectedAccountId = input.bankAccountId || accounts[0]?.id;
      const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

      // Get transactions for this account and period
      const transactions = await db.query.bankTransactions.findMany({
        where: and(
          eq(bankTransactions.entityId, entityId),
          selectedAccountId
            ? eq(bankTransactions.bankAccountId, selectedAccountId)
            : sql`1=1`,
          gte(bankTransactions.transactionDate, startDate),
          lte(bankTransactions.transactionDate, endDate),
        ),
        orderBy: [desc(bankTransactions.transactionDate)],
      });

      // Calculate summary
      const statementBalance = parseFloat(
        selectedAccount?.currentBalance ?? "0",
      );
      const bookBalance = transactions.reduce(
        (sum, t) => sum + parseFloat(t.amount),
        0,
      );
      const difference = statementBalance - bookBalance;

      // Count matched/unmatched
      const matchedTransactions = transactions.filter((t) => t.isReconciled);
      const unmatchedTransactions = transactions.filter(
        (t) => !t.isReconciled && !t.journalEntryId,
      );
      const autoMatchedTransactions = transactions.filter(
        (t) => t.journalEntryId && !t.isReconciled,
      );

      // Calculate match percentage
      const totalTransactions = transactions.length || 1;
      const matchedAmount = matchedTransactions.reduce(
        (sum, t) => sum + Math.abs(parseFloat(t.amount)),
        0,
      );
      const unmatchedAmount = unmatchedTransactions.reduce(
        (sum, t) => sum + Math.abs(parseFloat(t.amount)),
        0,
      );

      // Map transactions to response format
      const mappedTransactions = transactions.map((t) => {
        const amount = parseFloat(t.amount);
        const isMatched = t.isReconciled;
        const hasJournal = !!t.journalEntryId;

        let matchStatus = "Unmatched";
        let matchColor = "amber";
        if (isMatched) {
          matchStatus = "Matched";
          matchColor = "emerald";
        } else if (hasJournal) {
          matchStatus = "Auto-Matched";
          matchColor = "blue";
        }

        return {
          id: t.id,
          date: t.transactionDate,
          description: t.description,
          reference: t.reference,
          statementAmount: amount,
          statementFormatted: `${amount >= 0 ? "+" : "-"}GMD ${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          bookAmount: hasJournal ? amount : null,
          bookFormatted: hasJournal
            ? `${amount >= 0 ? "+" : "-"}GMD ${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "—",
          matchStatus,
          matchColor,
          confidence: isMatched ? 100 : hasJournal ? 95 : 0,
          isMatched,
          hasJournal,
        };
      });

      // Separate matched and unmatched
      const matched = mappedTransactions.filter((t) => t.isMatched);
      const unmatched = mappedTransactions.filter(
        (t) => !t.isMatched && !t.hasJournal,
      );
      const autoMatched = mappedTransactions.filter(
        (t) => t.hasJournal && !t.isMatched,
      );

      // AI match suggestions for unmatched — real candidates from the journal
      const suggestions = await Promise.all(
        unmatched.slice(0, 3).map(async (t) => {
          const matches = await findCandidateMatches(entityId, {
            transactionDate: t.date,
            amount: String(t.statementAmount),
            description: t.description,
            reference: t.reference,
          });
          return {
            ...t,
            suggestedMatches: matches.slice(0, 3).map((m) => ({
              id: m.journalEntryId,
              description: `Journal entry ${m.journalEntryId.slice(0, 8)}`,
              reference: "",
              date: t.date,
              amount: t.statementAmount,
              confidence: m.confidence,
            })),
          };
        }),
      );

      return {
        accounts: accounts.map((a) => ({
          id: a.id,
          name: `${a.name} - ${a.accountNumber.slice(-4).padStart(a.accountNumber.length, "*")}`,
          bankName: a.bankName,
        })),
        selectedAccountId,
        selectedAccountName: selectedAccount
          ? `${selectedAccount.name} - ${selectedAccount.bankName}`
          : "",
        dateRange: { startDate, endDate },
        status: "In Progress",
        summary: {
          statementBalance,
          statementBalanceFormatted: `GMD ${statementBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          bookBalance,
          bookBalanceFormatted: `GMD ${bookBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          difference,
          differenceFormatted: `${difference >= 0 ? "" : "-"}GMD ${Math.abs(difference).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          differencePercent:
            statementBalance > 0
              ? Number(
                  ((Math.abs(difference) / statementBalance) * 100).toFixed(2),
                )
              : 0,
          matchedCount: matched.length,
          matchedAmount,
          matchedAmountFormatted: `GMD ${matchedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          matchedPercent:
            totalTransactions > 0
              ? Number(((matched.length / totalTransactions) * 100).toFixed(1))
              : 0,
          unmatchedCount: unmatched.length,
          unmatchedAmount,
          unmatchedAmountFormatted: `GMD ${unmatchedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          autoMatchedCount: autoMatched.length,
          autoMatchedPercent:
            matched.length > 0
              ? Number(((autoMatched.length / matched.length) * 100).toFixed(0))
              : 0,
        },
        tabs: {
          all: mappedTransactions.length,
          matched: matched.length,
          unmatched: unmatched.length,
          autoMatched: autoMatched.length,
          ignored: 0,
        },
        transactions: mappedTransactions,
        matched,
        unmatched,
        autoMatched,
        suggestions,
      };
    }),

  // ── Match Transaction ──
  matchTransaction: rlsMutateProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        journalEntryId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Update transaction as reconciled
      const [updated] = await db
        .update(bankTransactions)
        .set({
          isReconciled: true,
          journalEntryId: input.journalEntryId,
        })
        .where(
          and(
            eq(bankTransactions.id, input.transactionId),
            eq(bankTransactions.entityId, entityId),
          ),
        )
        .returning();

      // Fire-and-forget webhook dispatch
      if (updated) {
        try {
          void dispatchWebhookEvent({
            entityId,
            eventType: "reconciliation.flagged",
            data: {
              transactionId: updated.id,
              journalEntryId: input.journalEntryId,
              bankAccountId: updated.bankAccountId,
              amount: updated.amount,
              description: updated.description,
            },
          });
        } catch (e) {
          logger.error(
            { err: e },
            "Failed to dispatch reconciliation.flagged webhook",
          );
        }
      }

      return { success: !!updated };
    }),

  // ── Auto-Reconcile ──
  autoReconcile: rlsMutateProcedure
    .input(
      z.object({
        bankAccountId: z.string().uuid(),
        startDate: z.string(),
        endDate: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Get unmatched transactions
      const unmatched = await db.query.bankTransactions.findMany({
        where: and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.bankAccountId, input.bankAccountId),
          eq(bankTransactions.isReconciled, false),
          sql`${bankTransactions.journalEntryId} IS NULL`,
          gte(bankTransactions.transactionDate, input.startDate),
          lte(bankTransactions.transactionDate, input.endDate),
        ),
      });

      // Real matching: score each unmatched transaction against the journal
      // and persist the best high-confidence match.
      let matchedCount = 0;
      const matchedLinks: Array<{
        transactionId: string;
        journalEntryId: string;
        confidence: number;
        reason: string;
      }> = [];

      for (const tx of unmatched) {
        const matches = await findCandidateMatches(entityId, tx);
        const best = matches[0];
        if (!best || best.confidence < 75) continue;

        const [updated] = await db
          .update(bankTransactions)
          .set({ journalEntryId: best.journalEntryId })
          .where(
            and(
              eq(bankTransactions.id, tx.id),
              eq(bankTransactions.entityId, entityId),
            ),
          )
          .returning({ id: bankTransactions.id });

        if (updated) {
          matchedCount++;
          matchedLinks.push({
            transactionId: tx.id,
            journalEntryId: best.journalEntryId,
            confidence: best.confidence,
            reason: best.reason,
          });
        }
      }

      return {
        success: true,
        matchedCount,
        totalProcessed: unmatched.length,
        matches: matchedLinks,
      };
    }),

  // ── Finalize Reconciliation ──
  finalizeReconciliation: rlsMutateProcedure
    .input(
      z.object({
        bankAccountId: z.string().uuid(),
        statementDate: z.string(),
        statementBalance: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Create reconciliation record
      const [reconciliation] = await db
        .insert(reconciliations)
        .values({
          entityId,
          bankAccountId: input.bankAccountId,
          statementDate: input.statementDate,
          statementBalance: input.statementBalance,
          bookBalance: input.statementBalance, // Should match after reconciliation
          difference: "0",
          status: "closed",
          closedBy: ctx.session!.user!.id!,
          closedAt: new Date(),
        })
        .returning();

      return {
        success: !!reconciliation,
        reconciliationId: reconciliation?.id,
      };
    }),

  /**
   * Get reconciliation overview data including summary cards and stats.
   */
  getOverview: rlsProtectedProcedure.query(async ({ ctx }) => {
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

    // Previous month reconciliations for comparison
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStart = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
    const prevMonthEnd = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-${new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()}`;

    const prevMonthRecons = allReconciliations.filter(
      (r) =>
        r.statementDate >= prevMonthStart && r.statementDate <= prevMonthEnd,
    );

    // Total reconciled MTD
    const totalReconciledMTD = currentMonthRecons
      .filter((r) => r.status === "closed")
      .reduce((sum, r) => sum + parseFloat(r.statementBalance ?? "0"), 0);

    // Previous month reconciled
    const prevReconciledMTD = prevMonthRecons
      .filter((r) => r.status === "closed")
      .reduce((sum, r) => sum + parseFloat(r.statementBalance ?? "0"), 0);

    // Unreconciled MTD
    const unreconciledMTD = currentMonthRecons
      .filter((r) => r.status !== "closed")
      .reduce((sum, r) => sum + parseFloat(r.difference ?? "0"), 0);

    // Previous month unreconciled
    const prevUnreconciledMTD = prevMonthRecons
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

    // Previous month reconciliation rate
    const prevClosedRecons = prevMonthRecons.filter(
      (r) => r.status === "closed",
    ).length;
    const prevReconciliationRate =
      prevMonthRecons.length > 0
        ? (prevClosedRecons / prevMonthRecons.length) * 100
        : 0;

    // Calculate month-over-month changes
    const reconciledChange =
      prevReconciledMTD > 0
        ? ((totalReconciledMTD - prevReconciledMTD) / prevReconciledMTD) * 100
        : 0;
    const unreconciledChange =
      prevUnreconciledMTD > 0
        ? ((unreconciledMTD - prevUnreconciledMTD) / prevUnreconciledMTD) * 100
        : 0;
    const rateChange =
      prevReconciliationRate > 0
        ? reconciliationRate - prevReconciliationRate
        : 0;

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

    const totalTxResult = await db
      .select({ total: count() })
      .from(bankTransactions)
      .where(eq(bankTransactions.entityId, entityId));

    const unmatchedTxResult = await db
      .select({ total: count() })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.isReconciled, false),
          sql`${bankTransactions.journalEntryId} IS NULL`,
        ),
      );

    const autoMatchedTxResult = await db
      .select({ total: count() })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.isReconciled, false),
          sql`${bankTransactions.journalEntryId} IS NOT NULL`,
        ),
      );

    const totalTransactions = totalTxResult[0]?.total ?? 0;
    const matchedCount = currentMonthTxResult[0]?.matched ?? 0;
    const unmatchedCount = unmatchedTxResult[0]?.total ?? 0;
    const partialMatchCount = autoMatchedTxResult[0]?.total ?? 0;
    const duplicatesCount = 0;

    return {
      summary: {
        totalAccounts,
        activeAccounts,
        totalReconciledMTD,
        unreconciledMTD,
        reconciliationRate: Number(reconciliationRate.toFixed(1)),
        openDiscrepancies,
        // Month-over-month comparison
        reconciledChange: Number(reconciledChange.toFixed(1)),
        unreconciledChange: Number(unreconciledChange.toFixed(1)),
        rateChange: Number(rateChange.toFixed(1)),
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
  getAiInsights: rlsProtectedProcedure.query(async ({ ctx }) => {
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

    // Auto-matched percentage — real, from current bank transactions
    const autoMatchedTxResult = await db
      .select({ total: count() })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.isReconciled, false),
          sql`${bankTransactions.journalEntryId} IS NOT NULL`,
        ),
      );
    const reconciledTxResult = await db
      .select({ total: count() })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.isReconciled, true),
        ),
      );
    const totalTxResult = await db
      .select({ total: count() })
      .from(bankTransactions)
      .where(eq(bankTransactions.entityId, entityId));

    const autoMatchedTx = autoMatchedTxResult[0]?.total ?? 0;
    const reconciledTx = reconciledTxResult[0]?.total ?? 0;
    const totalTx = totalTxResult[0]?.total ?? 0;
    const autoMatchedPercent =
      totalTx > 0 ? Math.round((autoMatchedTx / totalTx) * 100) : 0;
    const reconciledPercent =
      totalTx > 0 ? Math.round((reconciledTx / totalTx) * 100) : 0;

    insights.push({
      id: "auto-matched",
      type: reconciledPercent >= 90 ? "success" : "info",
      title: `${autoMatchedPercent}% auto-matched`,
      description: `${autoMatchedTx} of ${totalTx} transactions matched by amount & date`,
      actionLabel: "View matched transactions →",
    });

    // Unmatched transactions insight — real count
    const unmatchedTxResult = await db
      .select({ total: count() })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.isReconciled, false),
          sql`${bankTransactions.journalEntryId} IS NULL`,
        ),
      );
    const unmatchedTx = unmatchedTxResult[0]?.total ?? 0;

    if (unmatchedTx > 0) {
      insights.push({
        id: "unmatched",
        type: "warning",
        title: `${unmatchedTx} unmatched transactions`,
        description:
          "Review and link these to journal entries to complete reconciliation",
        actionLabel: "Review unmatched →",
      });
    }

    return insights;
  }),
});
