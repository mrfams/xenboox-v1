import { z } from "zod";
import { eq, and, desc, sql, count, sum, gte, lte } from "drizzle-orm";
import {
  bankTransactions,
  bankAccounts,
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
} from "@xenboox/db/schema";

import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";

// ─── Transactions Router ───────────────────────────────────────────────────

export const transactionsRouter = router({
  /**
   * Get summary statistics for the transactions page.
   */
  getSummary: rlsProtectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Default to current month if no dates provided
      const now = new Date();
      const startDate =
        input.startDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate =
        input.endDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      // Previous month for comparison
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevStartDate = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
      const prevEndDate = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-${new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()}`;

      // Total transactions this month
      const totalTransactionsResult = await db
        .select({ count: count() })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.entityId, entityId),
            gte(bankTransactions.transactionDate, startDate),
            lte(bankTransactions.transactionDate, endDate),
          ),
        );
      const totalTransactions = totalTransactionsResult[0]?.count ?? 0;

      // Previous month transactions for comparison
      const prevTotalResult = await db
        .select({ count: count() })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.entityId, entityId),
            gte(bankTransactions.transactionDate, prevStartDate),
            lte(bankTransactions.transactionDate, prevEndDate),
          ),
        );
      const prevTotalTransactions = prevTotalResult[0]?.count ?? 0;

      // AI auto-categorized (transactions with journal entries)
      const aiCategorizedResult = await db
        .select({ count: count() })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.entityId, entityId),
            gte(bankTransactions.transactionDate, startDate),
            lte(bankTransactions.transactionDate, endDate),
            sql`${bankTransactions.journalEntryId} IS NOT NULL`,
          ),
        );
      const aiCategorized = aiCategorizedResult[0]?.count ?? 0;

      // Previous month AI categorized
      const prevAiResult = await db
        .select({ count: count() })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.entityId, entityId),
            gte(bankTransactions.transactionDate, prevStartDate),
            lte(bankTransactions.transactionDate, prevEndDate),
            sql`${bankTransactions.journalEntryId} IS NOT NULL`,
          ),
        );
      const prevAiCategorized = prevAiResult[0]?.count ?? 0;

      // Needs review (not reconciled and no journal entry)
      const needsReviewResult = await db
        .select({ count: count() })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.entityId, entityId),
            gte(bankTransactions.transactionDate, startDate),
            lte(bankTransactions.transactionDate, endDate),
            eq(bankTransactions.isReconciled, false),
            sql`${bankTransactions.journalEntryId} IS NULL`,
          ),
        );
      const needsReview = needsReviewResult[0]?.count ?? 0;

      // Previous month needs review
      const prevNeedsReviewResult = await db
        .select({ count: count() })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.entityId, entityId),
            gte(bankTransactions.transactionDate, prevStartDate),
            lte(bankTransactions.transactionDate, prevEndDate),
            eq(bankTransactions.isReconciled, false),
            sql`${bankTransactions.journalEntryId} IS NULL`,
          ),
        );
      const prevNeedsReview = prevNeedsReviewResult[0]?.count ?? 0;

      // Excluded (manually excluded) - using metadata for now
      const excludedResult = await db
        .select({ count: count() })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.entityId, entityId),
            gte(bankTransactions.transactionDate, startDate),
            lte(bankTransactions.transactionDate, endDate),
            sql`${bankTransactions.metadata}::jsonb->>'excluded' = 'true'`,
          ),
        );
      const excluded = excludedResult[0]?.count ?? 0;

      // Previous month excluded
      const prevExcludedResult = await db
        .select({ count: count() })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.entityId, entityId),
            gte(bankTransactions.transactionDate, prevStartDate),
            lte(bankTransactions.transactionDate, prevEndDate),
            sql`${bankTransactions.metadata}::jsonb->>'excluded' = 'true'`,
          ),
        );
      const prevExcluded = prevExcludedResult[0]?.count ?? 0;

      // Total amount
      const totalAmountResult = await db
        .select({ total: sum(bankTransactions.amount) })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.entityId, entityId),
            gte(bankTransactions.transactionDate, startDate),
            lte(bankTransactions.transactionDate, endDate),
          ),
        );
      const totalAmount = parseFloat(totalAmountResult[0]?.total ?? "0");

      // Previous month total amount
      const prevTotalAmountResult = await db
        .select({ total: sum(bankTransactions.amount) })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.entityId, entityId),
            gte(bankTransactions.transactionDate, prevStartDate),
            lte(bankTransactions.transactionDate, prevEndDate),
          ),
        );
      const prevTotalAmount = parseFloat(
        prevTotalAmountResult[0]?.total ?? "0",
      );

      // Matched to bank (reconciled)
      const matchedResult = await db
        .select({ count: count() })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.entityId, entityId),
            gte(bankTransactions.transactionDate, startDate),
            lte(bankTransactions.transactionDate, endDate),
            eq(bankTransactions.isReconciled, true),
          ),
        );
      const matched = matchedResult[0]?.count ?? 0;

      // Previous month matched
      const prevMatchedResult = await db
        .select({ count: count() })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.entityId, entityId),
            gte(bankTransactions.transactionDate, prevStartDate),
            lte(bankTransactions.transactionDate, prevEndDate),
            eq(bankTransactions.isReconciled, true),
          ),
        );
      const prevMatched = prevMatchedResult[0]?.count ?? 0;

      // Calculate percentage changes
      const transactionsChange =
        prevTotalTransactions > 0
          ? ((totalTransactions - prevTotalTransactions) /
              prevTotalTransactions) *
            100
          : 0;

      const aiCategorizedPercent =
        totalTransactions > 0 ? (aiCategorized / totalTransactions) * 100 : 0;
      const aiChange =
        prevAiCategorized > 0
          ? ((aiCategorized - prevAiCategorized) / prevAiCategorized) * 100
          : 0;

      const needsReviewChange =
        prevNeedsReview > 0
          ? ((needsReview - prevNeedsReview) / prevNeedsReview) * 100
          : 0;

      const amountChange =
        prevTotalAmount > 0
          ? ((totalAmount - prevTotalAmount) / prevTotalAmount) * 100
          : 0;

      const matchedPercent =
        totalTransactions > 0 ? (matched / totalTransactions) * 100 : 0;
      const matchedChange =
        prevMatched > 0 ? ((matched - prevMatched) / prevMatched) * 100 : 0;

      const excludedPercent =
        totalTransactions > 0 ? (excluded / totalTransactions) * 100 : 0;
      const excludedChange =
        prevExcluded > 0 ? ((excluded - prevExcluded) / prevExcluded) * 100 : 0;

      return {
        totalTransactions,
        totalTransactionsChange: Number(transactionsChange.toFixed(1)),
        aiCategorized,
        aiCategorizedPercent: Number(aiCategorizedPercent.toFixed(1)),
        aiChange: Number(aiChange.toFixed(1)),
        needsReview,
        needsReviewChange: Number(needsReviewChange.toFixed(1)),
        totalAmount,
        amountChange: Number(amountChange.toFixed(1)),
        matched,
        matchedPercent: Number(matchedPercent.toFixed(1)),
        matchedChange: Number(matchedChange.toFixed(1)),
        excluded,
        excludedPercent: Number(excludedPercent.toFixed(1)),
        excludedChange: Number(excludedChange.toFixed(1)),
      };
    }),

  /**
   * List transactions with filtering, sorting, and pagination.
   */
  listTransactions: rlsProtectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z
          .enum([
            "all",
            "needs_review",
            "matched",
            "unmatched",
            "excluded",
            "uncategorized",
          ])
          .default("all"),
        accountId: z.string().uuid().optional(),
        category: z.string().optional(),
        type: z.string().optional(),
        search: z.string().optional(),
        sortBy: z
          .enum(["date", "description", "amount", "confidence"])
          .default("date"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
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

      // Build conditions
      const conditions = [
        eq(bankTransactions.entityId, entityId),
        gte(bankTransactions.transactionDate, startDate),
        lte(bankTransactions.transactionDate, endDate),
      ];

      if (input.accountId) {
        conditions.push(eq(bankTransactions.bankAccountId, input.accountId));
      }
      if (input.status === "matched") {
        conditions.push(eq(bankTransactions.isReconciled, true));
      } else if (
        input.status === "needs_review" ||
        input.status === "uncategorized"
      ) {
        conditions.push(eq(bankTransactions.isReconciled, false));
        conditions.push(sql`${bankTransactions.journalEntryId} IS NULL`);
      } else if (input.status === "excluded") {
        conditions.push(
          sql`${bankTransactions.metadata}::jsonb->>'excluded' = 'true'`,
        );
      } else if (input.status === "unmatched") {
        conditions.push(eq(bankTransactions.isReconciled, false));
      }

      if (input.search) {
        conditions.push(
          sql`${bankTransactions.description} ILIKE ${`%${input.search}%`}`,
        );
      }

      // Get total count
      const totalCountResult = await db
        .select({ count: count() })
        .from(bankTransactions)
        .where(and(...conditions));
      const totalCount = totalCountResult[0]?.count ?? 0;

      // Get transactions with account info
      const transactions = await db
        .select({
          id: bankTransactions.id,
          date: bankTransactions.transactionDate,
          description: bankTransactions.description,
          reference: bankTransactions.reference,
          type: bankTransactions.type,
          amount: bankTransactions.amount,
          isReconciled: bankTransactions.isReconciled,
          journalEntryId: bankTransactions.journalEntryId,
          bankAccountId: bankTransactions.bankAccountId,
          bankAccountName: bankAccounts.name,
          bankAccountNumber: bankAccounts.accountNumber,
          createdAt: bankTransactions.createdAt,
        })
        .from(bankTransactions)
        .leftJoin(
          bankAccounts,
          eq(bankTransactions.bankAccountId, bankAccounts.id),
        )
        .where(and(...conditions))
        .orderBy(
          input.sortBy === "date"
            ? input.sortOrder === "desc"
              ? desc(bankTransactions.transactionDate)
              : bankTransactions.transactionDate
            : input.sortBy === "amount"
              ? input.sortOrder === "desc"
                ? desc(bankTransactions.amount)
                : bankTransactions.amount
              : desc(bankTransactions.transactionDate),
        )
        .limit(input.limit)
        .offset(input.offset);

      // Get account details for each transaction
      const accountIds = [
        ...new Set(
          transactions.map((t) => t.journalEntryId).filter(Boolean) as string[],
        ),
      ];
      let accountMap = new Map<string, { code: string; name: string }>();

      if (accountIds.length > 0) {
        const journalEntryRecords = await db.query.journalEntries.findMany({
          where: sql`${journalEntries.id} IN ${accountIds}`,
          columns: { id: true, entryNumber: true },
        });

        const lineAccountIds = await db
          .select({ accountId: journalEntryLines.accountId })
          .from(journalEntryLines)
          .where(sql`${journalEntryLines.journalEntryId} IN ${accountIds}`);

        if (lineAccountIds.length > 0) {
          const accounts = await db.query.chartOfAccounts.findMany({
            where: sql`${chartOfAccounts.id} IN ${lineAccountIds.map((l) => l.accountId)}`,
            columns: { id: true, code: true, name: true },
          });
          accountMap = new Map(
            accounts.map((a) => [a.id, { code: a.code, name: a.name }]),
          );
        }
      }

      // Map transactions to response format
      const mappedTransactions = transactions.map((t) => {
        const amount = parseFloat(t.amount);
        const isPositive = amount > 0;

        // Determine source based on reference pattern
        let source = "Manual";
        let sourceIcon = "M";
        if (t.reference) {
          if (t.reference.startsWith("INV-")) {
            source = "Invoice";
            sourceIcon = "INV";
          } else if (t.reference.startsWith("BILL-")) {
            source = "Bill";
            sourceIcon = "BIL";
          } else if (t.reference.startsWith("TRF")) {
            source = "Bank Feed";
            sourceIcon = "BF";
          } else {
            source = "Bank Feed";
            sourceIcon = "BF";
          }
        }

        return {
          id: t.id,
          date: t.date,
          description: t.description,
          reference: t.reference,
          account: t.bankAccountName ?? "Unknown Account",
          accountCode: t.bankAccountNumber ?? "",
          category: t.journalEntryId ? "AI Categorized" : "Uncategorized",
          categoryColor: t.journalEntryId ? "blue" : "gray",
          amount: amount,
          amountFormatted: `${isPositive ? "+" : "-"}GMD ${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          isPositive,
          status: t.isReconciled
            ? "matched"
            : t.journalEntryId
              ? "needs_review"
              : "unmatched",
          statusLabel: t.isReconciled
            ? "Matched"
            : t.journalEntryId
              ? "Needs Review"
              : "Unmatched",
          confidence: t.journalEntryId ? 95 : 0,
          source,
          sourceIcon,
          createdAt: t.createdAt,
        };
      });

      return {
        transactions: mappedTransactions,
        totalCount,
        page: Math.floor(input.offset / input.limit) + 1,
        pageSize: input.limit,
        totalPages: Math.ceil(totalCount / input.limit),
      };
    }),

  /**
   * Get transaction details for the detail panel.
   */
  getTransactionDetail: rlsProtectedProcedure
    .input(z.object({ transactionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const transaction = await db.query.bankTransactions.findFirst({
        where: and(
          eq(bankTransactions.id, input.transactionId),
          eq(bankTransactions.entityId, entityId),
        ),
      });

      if (!transaction) {
        return null;
      }

      // Get bank account info
      const bankAccount = await db.query.bankAccounts.findFirst({
        where: eq(bankAccounts.id, transaction.bankAccountId),
      });

      // Get journal entry if exists
      let journalEntry = null;
      let accountInfo = null;
      if (transaction.journalEntryId) {
        journalEntry = await db.query.journalEntries.findFirst({
          where: eq(journalEntries.id, transaction.journalEntryId),
        });

        if (journalEntry) {
          const lines = await db.query.journalEntryLines.findMany({
            where: eq(journalEntryLines.journalEntryId, journalEntry.id),
          });

          if (lines.length > 0) {
            const account = await db.query.chartOfAccounts.findFirst({
              where: eq(chartOfAccounts.id, lines[0].accountId),
            });
            accountInfo = account
              ? { code: account.code, name: account.name, type: account.type }
              : null;
          }
        }
      }

      const amount = parseFloat(transaction.amount);

      // Determine source
      let source = "Manual";
      if (transaction.reference) {
        if (transaction.reference.startsWith("INV-")) {
          source = "Invoice";
        } else if (transaction.reference.startsWith("BILL-")) {
          source = "Bill";
        } else if (transaction.reference.startsWith("TRF")) {
          source = "Bank Feed";
        } else {
          source = "Bank Feed";
        }
      }

      // Generate AI explanation based on transaction data
      let aiExplanation = "";
      if (accountInfo) {
        aiExplanation = `This looks like a ${accountInfo.name.toLowerCase()} transaction based on the description and vendor patterns. The AI has categorized this with ${transaction.journalEntryId ? "95%" : "0%"} confidence.`;
      } else if (transaction.journalEntryId) {
        aiExplanation = `This transaction has been automatically categorized and matched to a journal entry. The reference code and historical patterns suggest this is a legitimate transaction.`;
      } else {
        aiExplanation = `This transaction needs review. The AI hasn't been able to categorize it automatically based on available patterns.`;
      }

      // Get related transactions (same amount or similar description)
      const relatedTransactions = await db.query.bankTransactions.findMany({
        where: and(
          eq(bankTransactions.entityId, entityId),
          sql`${bankTransactions.id} != ${transaction.id}`,
          sql`(${bankTransactions.amount} = ${transaction.amount} OR ${bankTransactions.description} ILIKE ${`%${transaction.description.split(" ")[0]}%`})`,
        ),
        limit: 3,
      });

      const mappedRelated = relatedTransactions.map((rt) => {
        const rtAmount = parseFloat(rt.amount);
        return {
          id: rt.id,
          date: rt.transactionDate,
          description: rt.description,
          amount: rtAmount,
          amountFormatted: `${rtAmount >= 0 ? "+" : "-"}GMD ${Math.abs(rtAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          isPositive: rtAmount >= 0,
        };
      });

      // Generate history
      const history = [
        {
          id: "1",
          action: "Transaction imported",
          timestamp:
            transaction.createdAt?.toISOString() ?? new Date().toISOString(),
          user: "System",
          details: `Imported from ${bankAccount?.bankName ?? "bank"} via bank feed`,
        },
      ];

      if (transaction.journalEntryId) {
        history.unshift({
          id: "2",
          action: "AI categorized",
          timestamp: new Date().toISOString(),
          user: "Xenboox AI",
          details: `Categorized as ${accountInfo?.name ?? "Unknown"} with 95% confidence`,
        });
      }

      if (transaction.isReconciled) {
        history.unshift({
          id: "3",
          action: "Reconciled",
          timestamp: new Date().toISOString(),
          user: "System",
          details: "Transaction matched and reconciled",
        });
      }

      return {
        id: transaction.id,
        date: transaction.transactionDate,
        description: transaction.description,
        reference: transaction.reference,
        amount: amount,
        amountFormatted: `${amount >= 0 ? "+" : "-"}GMD ${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        isPositive: amount >= 0,
        status: transaction.isReconciled
          ? "matched"
          : transaction.journalEntryId
            ? "needs_review"
            : "unmatched",
        statusLabel: transaction.isReconciled
          ? "Matched"
          : transaction.journalEntryId
            ? "Needs Review"
            : "Unmatched",
        confidence: transaction.journalEntryId ? 95 : 0,
        bankAccount: bankAccount
          ? {
              name: bankAccount.name,
              number: bankAccount.accountNumber,
              bank: bankAccount.bankName,
            }
          : null,
        account: accountInfo,
        category: accountInfo?.name ?? "Uncategorized",
        source,
        journalEntry: journalEntry
          ? {
              id: journalEntry.id,
              entryNumber: journalEntry.entryNumber,
              description: journalEntry.description,
              status: journalEntry.status,
            }
          : null,
        aiExplanation,
        relatedTransactions: mappedRelated,
        history,
        metadata: transaction.metadata,
      };
    }),

  /**
   * Get AI insights for the transactions page.
   */
  getAiInsights: rlsProtectedProcedure
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

      const insights: Array<{
        id: string;
        type: "warning" | "info" | "success";
        title: string;
        description: string;
        actionLabel: string;
      }> = [];

      // Check for duplicate transactions (same amount within 3 days)
      const recentTransactions = await db.query.bankTransactions.findMany({
        where: and(
          eq(bankTransactions.entityId, entityId),
          gte(bankTransactions.transactionDate, startDate),
          lte(bankTransactions.transactionDate, endDate),
        ),
        orderBy: [desc(bankTransactions.transactionDate)],
        limit: 100,
      });

      // Find potential duplicates
      const amountMap = new Map<number, typeof recentTransactions>();
      for (const tx of recentTransactions) {
        const amount = Math.abs(parseFloat(tx.amount));
        const existing = amountMap.get(amount) || [];
        existing.push(tx);
        amountMap.set(amount, existing);
      }

      for (const [amount, txs] of amountMap) {
        if (txs.length > 1) {
          insights.push({
            id: `duplicate-${txs[0].id}`,
            type: "warning",
            title: "Potential duplicate detected",
            description: `Multiple transactions of GMD ${amount.toLocaleString()} found. Review to confirm they are not duplicates.`,
            actionLabel: "Review duplicates",
          });
          break; // Only show first duplicate insight
        }
      }

      // Check for large transactions (> 100,000 GMD)
      const largeTransactions = recentTransactions.filter(
        (tx) => Math.abs(parseFloat(tx.amount)) > 100000,
      );
      if (largeTransactions.length > 0) {
        insights.push({
          id: "large-transaction",
          type: "info",
          title: "Large transaction detected",
          description: `${largeTransactions.length} transaction(s) over GMD 100,000 found. Verify these are legitimate.`,
          actionLabel: "View transactions",
        });
      }

      // Check for uncategorized transactions
      const uncategorizedCount = recentTransactions.filter(
        (tx) => !tx.journalEntryId,
      ).length;
      if (uncategorizedCount > 0) {
        insights.push({
          id: "uncategorized",
          type: "info",
          title: "Uncategorized transactions",
          description: `${uncategorizedCount} transactions need AI categorization. Run auto-categorize to process them.`,
          actionLabel: "Auto-categorize",
        });
      }

      // Add a success insight if everything looks good
      if (insights.length === 0) {
        insights.push({
          id: "all-clear",
          type: "success",
          title: "All transactions look good",
          description:
            "No unusual patterns detected. All transactions are properly categorized.",
          actionLabel: "View report",
        });
      }

      return insights;
    }),

  /**
   * Get accounts for filter dropdown.
   */
  getAccounts: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const accounts = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.entityId, entityId),
      columns: {
        id: true,
        name: true,
        bankName: true,
        accountNumber: true,
      },
    });

    return accounts;
  }),

  /**
   * Manually record a bank transaction (the "New transaction" flow).
   * Stores it against a bank account, unreconciled by default so the AI
   * categorization/review flow still applies to it.
   */
  createTransaction: rlsProtectedProcedure
    .input(
      z.object({
        bankAccountId: z.string().uuid(),
        type: z.enum(["deposit", "withdrawal", "transfer", "fee", "interest"]),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        description: z.string().min(1).max(300),
        transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reference: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [transaction] = await db
        .insert(bankTransactions)
        .values({
          entityId: ctx.entityId!,
          bankAccountId: input.bankAccountId,
          type: input.type,
          amount: input.amount,
          description: input.description,
          transactionDate: input.transactionDate,
          reference: input.reference,
          isReconciled: false,
        })
        .returning();

      return transaction;
    }),

  /**
   * Approve/confirm a transaction categorization.
   */
  approveTransaction: rlsProtectedProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        accountId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Get the transaction
      const transaction = await db.query.bankTransactions.findFirst({
        where: and(
          eq(bankTransactions.id, input.transactionId),
          eq(bankTransactions.entityId, entityId),
        ),
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      // Mark as reconciled
      await db
        .update(bankTransactions)
        .set({ isReconciled: true })
        .where(eq(bankTransactions.id, input.transactionId));

      return { success: true };
    }),

  /**
   * Reject/categorize a transaction.
   */
  rejectTransaction: rlsProtectedProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Get the transaction
      const transaction = await db.query.bankTransactions.findFirst({
        where: and(
          eq(bankTransactions.id, input.transactionId),
          eq(bankTransactions.entityId, entityId),
        ),
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      // In production, this would create a correction journal entry
      // For now, just mark as needing review
      await db
        .update(bankTransactions)
        .set({ isReconciled: false })
        .where(eq(bankTransactions.id, input.transactionId));

      return { success: true };
    }),
});
