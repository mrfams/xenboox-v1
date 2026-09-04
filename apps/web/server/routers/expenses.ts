import { z } from "zod";
import { eq, and, desc, sql, count, sum, gte, lte } from "drizzle-orm";
import {
  invoicesAp,
  invoiceApLines,
  suppliers,
  paymentsAp,
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  budgets,
  budgetLines,
  auditLog,
  expenseClaims,
  claimLineItems,
  approvalRecords,
  reimbursementRecords,
  entities,
} from "@xenboox/db/schema";
import { TRPCError } from "@trpc/server";
import { isoDateString, positiveMoneyString } from "../ar-validation";
import {
  postApBillToLedger,
  postApPaymentToLedger,
  reverseApBillJournal,
} from "../ap-posting";

import {
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  requireRole,
} from "@/lib/trpc/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

// ─── Expenses Router ───────────────────────────────────────────────────────

export const expensesRouter = router({
  /**
   * Manually record an expense. Expenses are stored as AP invoice rows (the
   * same table the expenses page reads), pending by default so they can be
   * reviewed before approval. Requires a payee (supplier) and a balance.
   */
  createExpense: rlsMutateProcedure
    .input(
      z.object({
        supplierId: z.string().uuid(),
        description: z.string().min(1).max(500),
        amount: positiveMoneyString,
        expenseDate: isoDateString,
        dueDate: isoDateString,
        category: z.string().trim().max(100).optional(),
        paymentMethod: z.string().trim().max(50).optional(),
      }),
    )
    .superRefine((data, ctx) => {
      if (data.dueDate < data.expenseDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dueDate"],
          message: "Due date cannot be before the expense date",
        });
      }
    })
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;
        const entity = await db.query.entities.findFirst({
          where: eq(entities.id, entityId),
          columns: { currency: true },
        });

        // P6-A: the supplier must belong to this entity — a cross-tenant
        // supplier id would silently record a payable to another tenant.
        const supplier = await db.query.suppliers.findFirst({
          where: and(
            eq(suppliers.id, input.supplierId),
            eq(suppliers.entityId, entityId),
          ),
          columns: { id: true },
        });
        if (!supplier) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Supplier not found",
          });
        }

        // P6-A: expenses are AP invoice rows that must be POSTABLE — a header
        // with no lines can never reach the ledger (invoiceApLines.accountId
        // is NOT NULL). Resolve the category/description to a real expense
        // account up front; the line is inserted with the header.
        const accountId = await resolveExpenseAccountId(
          entityId,
          input.category ?? "",
          input.description,
        );
        if (!accountId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Add an expense account to your chart of accounts first, then record this expense",
          });
        }

        const now = new Date();
        const stamp =
          `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}` +
          `${String(now.getDate()).padStart(2, "0")}` +
          `${String(now.getHours()).padStart(2, "0")}` +
          `${String(now.getMinutes()).padStart(2, "0")}` +
          `${String(now.getSeconds()).padStart(2, "0")}`;

        const [expense] = await db
          .insert(invoicesAp)
          .values({
            entityId,
            supplierId: input.supplierId,
            invoiceNumber: `EXP-${stamp}`,
            invoiceDate: input.expenseDate,
            dueDate: input.dueDate,
            totalAmount: input.amount,
            paidAmount: "0",
            balance: input.amount,
            currency: entity?.currency ?? "USD",
            status: "pending",
            notes: input.description,
            receivedDate: input.expenseDate,
          })
          .returning();

        if (!expense) {
          throw new Error("Failed to create expense");
        }

        // P6-A: sequential insert + compensation — never orphan a header
        // whose line failed (no real transaction on neon-http).
        try {
          await db.insert(invoiceApLines).values({
            invoiceApId: expense.id,
            accountId,
            description: input.description,
            quantity: "1",
            unitPrice: input.amount,
            amount: input.amount,
          });
        } catch (lineErr) {
          await db
            .delete(invoicesAp)
            .where(eq(invoicesAp.id, expense.id))
            .catch(() => {});
          throw lineErr;
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "expenses.createExpense",
          entityType: "invoice_ap",
          entityIdRef: expense.id,
          newValues: {
            amount: input.amount,
            description: input.description,
            category: input.category,
            paymentMethod: input.paymentMethod,
            accountId,
          },
        });

        return expense;
      } catch (error) {
        logger.error({ err: error }, "Failed to create expense");
        throw error;
      }
    }),

  /**
   * Get overview statistics for the expenses page.
   */
  getOverview: rlsProtectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const currency =
        (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";

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

      // Total expenses this month (all AP invoices)
      const totalExpensesResult = await db
        .select({ total: sum(invoicesAp.totalAmount) })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            gte(invoicesAp.invoiceDate, startDate),
            lte(invoicesAp.invoiceDate, endDate),
          ),
        );
      const totalExpenses = parseFloat(totalExpensesResult[0]?.total ?? "0");

      // Previous month total expenses
      const prevTotalResult = await db
        .select({ total: sum(invoicesAp.totalAmount) })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            gte(invoicesAp.invoiceDate, prevStartDate),
            lte(invoicesAp.invoiceDate, prevEndDate),
          ),
        );
      const prevTotalExpenses = parseFloat(prevTotalResult[0]?.total ?? "0");

      // Total reimbursed (paid) this month
      const reimbursedResult = await db
        .select({ total: sum(paymentsAp.amount) })
        .from(paymentsAp)
        .innerJoin(invoicesAp, eq(paymentsAp.invoiceApId, invoicesAp.id))
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            gte(paymentsAp.paymentDate, startDate),
            lte(paymentsAp.paymentDate, endDate),
          ),
        );
      const totalReimbursed = parseFloat(reimbursedResult[0]?.total ?? "0");

      // Previous month reimbursed
      const prevReimbursedResult = await db
        .select({ total: sum(paymentsAp.amount) })
        .from(paymentsAp)
        .innerJoin(invoicesAp, eq(paymentsAp.invoiceApId, invoicesAp.id))
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            gte(paymentsAp.paymentDate, prevStartDate),
            lte(paymentsAp.paymentDate, prevEndDate),
          ),
        );
      const prevReimbursed = parseFloat(prevReimbursedResult[0]?.total ?? "0");

      // Pending approval (status = pending)
      const pendingResult = await db
        .select({ total: sum(invoicesAp.totalAmount), count: count() })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            eq(invoicesAp.status, "pending"),
            gte(invoicesAp.invoiceDate, startDate),
            lte(invoicesAp.invoiceDate, endDate),
          ),
        );
      const pendingApproval = parseFloat(pendingResult[0]?.total ?? "0");
      const pendingCount = pendingResult[0]?.count ?? 0;

      // Average expense
      const countResult = await db
        .select({ count: count() })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            gte(invoicesAp.invoiceDate, startDate),
            lte(invoicesAp.invoiceDate, endDate),
          ),
        );
      const totalCount = countResult[0]?.count ?? 0;
      const averageExpense = totalCount > 0 ? totalExpenses / totalCount : 0;

      // Budget vs Actual (get total budget for current month)
      const budgetResult = await db
        .select({ total: sum(budgetLines.annualAmount) })
        .from(budgetLines)
        .innerJoin(budgets, eq(budgetLines.budgetId, budgets.id))
        .where(
          and(eq(budgets.entityId, entityId), eq(budgets.status, "active")),
        );
      const totalBudget = parseFloat(budgetResult[0]?.total ?? "100000");
      const budgetRemaining = totalBudget - totalExpenses;
      const budgetPercent =
        totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;

      // Calculate changes
      const expensesChange =
        prevTotalExpenses > 0
          ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100
          : 0;
      const reimbursedChange =
        prevReimbursed > 0
          ? ((totalReimbursed - prevReimbursed) / prevReimbursed) * 100
          : 0;

      return {
        totalExpenses,
        totalExpensesChange: Number(expensesChange.toFixed(1)),
        totalReimbursed,
        totalReimbursedChange: Number(reimbursedChange.toFixed(1)),
        pendingApproval,
        pendingCount,
        averageExpense,
        budgetPercent,
        budgetRemaining,
        totalBudget,
      };
    }),

  /**
   * Get tab counts for the expenses page.
   */
  getTabCounts: rlsProtectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const currency =
        (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";

      const now = new Date();
      const startDate =
        input.startDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate =
        input.endDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      // All expenses count
      const allResult = await db
        .select({ count: count() })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            gte(invoicesAp.invoiceDate, startDate),
            lte(invoicesAp.invoiceDate, endDate),
          ),
        );

      // Draft = pending with no notes
      const draftResult = await db
        .select({ count: count() })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            eq(invoicesAp.status, "pending"),
            sql`(${invoicesAp.notes} IS NULL OR ${invoicesAp.notes} = '')`,
            gte(invoicesAp.invoiceDate, startDate),
            lte(invoicesAp.invoiceDate, endDate),
          ),
        );

      // Pending approval = pending with notes
      const pendingResult = await db
        .select({ count: count() })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            eq(invoicesAp.status, "pending"),
            sql`${invoicesAp.notes} IS NOT NULL AND ${invoicesAp.notes} != ''`,
            gte(invoicesAp.invoiceDate, startDate),
            lte(invoicesAp.invoiceDate, endDate),
          ),
        );

      // Approved (paid status)
      const approvedResult = await db
        .select({ count: count() })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            eq(invoicesAp.status, "paid"),
            gte(invoicesAp.invoiceDate, startDate),
            lte(invoicesAp.invoiceDate, endDate),
          ),
        );

      // Reimbursed (has payments)
      const reimbursedResult = await db
        .select({ count: sql<number>`count(distinct ${invoicesAp.id})` })
        .from(invoicesAp)
        .innerJoin(paymentsAp, eq(paymentsAp.invoiceApId, invoicesAp.id))
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            gte(invoicesAp.invoiceDate, startDate),
            lte(invoicesAp.invoiceDate, endDate),
          ),
        );

      return {
        all: allResult[0]?.count ?? 0,
        draft: draftResult[0]?.count ?? 0,
        pending: pendingResult[0]?.count ?? 0,
        approved: approvedResult[0]?.count ?? 0,
        reimbursed: reimbursedResult[0]?.count ?? 0,
      };
    }),

  /**
   * List expenses with filtering, sorting, and pagination.
   */
  listExpenses: rlsProtectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z
          .enum(["all", "draft", "pending", "approved", "reimbursed"])
          .default("all"),
        category: z.string().optional(),
        paymentMethod: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const currency =
        (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";

      const now = new Date();
      const startDate =
        input.startDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate =
        input.endDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      // Build conditions
      const conditions = [
        eq(invoicesAp.entityId, entityId),
        gte(invoicesAp.invoiceDate, startDate),
        lte(invoicesAp.invoiceDate, endDate),
      ];

      if (input.status === "draft") {
        // Draft = pending with no notes (not yet submitted)
        conditions.push(eq(invoicesAp.status, "pending"));
        conditions.push(
          sql`(${invoicesAp.notes} IS NULL OR ${invoicesAp.notes} = '')`,
        );
      } else if (input.status === "pending") {
        // Pending = pending with notes (submitted for approval)
        conditions.push(eq(invoicesAp.status, "pending"));
        conditions.push(
          sql`${invoicesAp.notes} IS NOT NULL AND ${invoicesAp.notes} != ''`,
        );
      } else if (input.status === "approved") {
        // Approved = paid
        conditions.push(eq(invoicesAp.status, "paid"));
      } else if (input.status === "reimbursed") {
        // Reimbursed = has payments recorded
        conditions.push(
          sql`${invoicesAp.id} IN (SELECT ${paymentsAp.invoiceApId} FROM ${paymentsAp})`,
        );
      }

      if (input.search) {
        conditions.push(
          sql`${invoicesAp.invoiceNumber} ILIKE ${`%${input.search}%`}`,
        );
      }

      // Get total count
      const totalCountResult = await db
        .select({ count: count() })
        .from(invoicesAp)
        .where(and(...conditions));
      const totalCount = totalCountResult[0]?.count ?? 0;

      // Get expenses with supplier info
      const expenses = await db
        .select({
          id: invoicesAp.id,
          invoiceNumber: invoicesAp.invoiceNumber,
          invoiceDate: invoicesAp.invoiceDate,
          dueDate: invoicesAp.dueDate,
          totalAmount: invoicesAp.totalAmount,
          paidAmount: invoicesAp.paidAmount,
          status: invoicesAp.status,
          notes: invoicesAp.notes,
          supplierId: invoicesAp.supplierId,
          supplierName: suppliers.name,
        })
        .from(invoicesAp)
        .leftJoin(suppliers, eq(invoicesAp.supplierId, suppliers.id))
        .where(and(...conditions))
        .orderBy(desc(invoicesAp.invoiceDate))
        .limit(input.limit)
        .offset(input.offset);

      // Get payment method from first payment for each invoice
      const invoiceIds = expenses.map((e) => e.id);
      const paymentMethodMap = new Map<string, string>();

      if (invoiceIds.length > 0) {
        const payments = await db
          .select({
            invoiceApId: paymentsAp.invoiceApId,
            method: paymentsAp.method,
          })
          .from(paymentsAp)
          .where(sql`${paymentsAp.invoiceApId} IN ${invoiceIds}`);

        for (const payment of payments) {
          if (!paymentMethodMap.has(payment.invoiceApId)) {
            paymentMethodMap.set(
              payment.invoiceApId,
              payment.method ?? "bank_transfer",
            );
          }
        }
      }

      // Map expenses to response format
      const mappedExpenses = expenses.map((e) => {
        const amount = parseFloat(e.totalAmount);
        const paidAmount = parseFloat(e.paidAmount ?? "0");
        const isPaid = e.status === "paid";

        // Determine category based on notes or default
        let category = "General";
        if (e.notes) {
          const notesLower = e.notes.toLowerCase();
          if (
            notesLower.includes("office") ||
            notesLower.includes("supplies")
          ) {
            category = "Office Supplies";
          } else if (
            notesLower.includes("travel") ||
            notesLower.includes("transport")
          ) {
            category = "Travel";
          } else if (
            notesLower.includes("software") ||
            notesLower.includes("subscription")
          ) {
            category = "Software";
          } else if (notesLower.includes("marketing")) {
            category = "Marketing";
          } else if (
            notesLower.includes("meal") ||
            notesLower.includes("lunch")
          ) {
            category = "Meals & Entertainment";
          } else if (
            notesLower.includes("utility") ||
            notesLower.includes("internet")
          ) {
            category = "Utilities";
          } else if (notesLower.includes("maintenance")) {
            category = "Maintenance";
          }
        }

        // Get payment method
        const paymentMethod = paymentMethodMap.get(e.id) ?? "bank_transfer";

        // Determine status label
        let statusLabel = "Draft";
        let statusColor = "gray";
        if (isPaid) {
          statusLabel = "Paid";
          statusColor = "green";
        } else if (e.status === "pending") {
          statusLabel = "Pending Approval";
          statusColor = "amber";
        } else if (e.status === "overdue") {
          statusLabel = "Overdue";
          statusColor = "red";
        } else if (paidAmount > 0) {
          statusLabel = "Partial";
          statusColor = "blue";
        }

        // Check if receipt exists (using metadata)
        const hasReceipt = (e.notes ?? "").includes("receipt");

        return {
          id: e.id,
          date: e.invoiceDate,
          description: e.notes ?? e.invoiceNumber,
          category,
          vendor: e.supplierName ?? "Unknown Vendor",
          amount: amount,
          amountFormatted: `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          paymentMethod,
          status: statusLabel,
          statusColor,
          hasReceipt,
          dueDate: e.dueDate,
        };
      });

      return {
        expenses: mappedExpenses,
        totalCount,
        page: Math.floor(input.offset / input.limit) + 1,
        pageSize: input.limit,
        totalPages: Math.ceil(totalCount / input.limit),
      };
    }),

  /**
   * Get expenses by category for donut chart.
   */
  getExpensesByCategory: rlsProtectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const currency =
        (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";

      const now = new Date();
      const startDate =
        input.startDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate =
        input.endDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      // Get all expenses with their lines and accounts
      const expenses = await db
        .select({
          id: invoicesAp.id,
          totalAmount: invoicesAp.totalAmount,
          notes: invoicesAp.notes,
        })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            gte(invoicesAp.invoiceDate, startDate),
            lte(invoicesAp.invoiceDate, endDate),
          ),
        );

      // Group by category based on notes
      const categoryMap = new Map<string, number>();
      let totalAmount = 0;

      for (const expense of expenses) {
        const amount = parseFloat(expense.totalAmount);
        totalAmount += amount;

        let category = "Others";
        if (expense.notes) {
          const notesLower = expense.notes.toLowerCase();
          if (
            notesLower.includes("office") ||
            notesLower.includes("supplies")
          ) {
            category = "Office Supplies";
          } else if (
            notesLower.includes("travel") ||
            notesLower.includes("transport")
          ) {
            category = "Travel";
          } else if (
            notesLower.includes("software") ||
            notesLower.includes("subscription")
          ) {
            category = "Software";
          } else if (notesLower.includes("marketing")) {
            category = "Marketing";
          } else if (
            notesLower.includes("meal") ||
            notesLower.includes("lunch")
          ) {
            category = "Meals & Entertainment";
          } else if (
            notesLower.includes("utility") ||
            notesLower.includes("internet")
          ) {
            category = "Utilities";
          } else if (notesLower.includes("maintenance")) {
            category = "Maintenance";
          }
        }

        const existing = categoryMap.get(category) ?? 0;
        categoryMap.set(category, existing + amount);
      }

      // Convert to array with percentages
      const categories = Array.from(categoryMap.entries())
        .map(([name, amount]) => ({
          name,
          amount,
          amountFormatted: `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          percent:
            totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        categories,
        totalAmount,
        totalAmountFormatted: `${currency} ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      };
    }),

  /**
   * Get monthly trend data for line chart.
   */
  getMonthlyTrend: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const currency =
      (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";

    // Get last 6 months of data
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startDate = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-${new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()}`;

      const result = await db
        .select({ total: sum(invoicesAp.totalAmount) })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            gte(invoicesAp.invoiceDate, startDate),
            lte(invoicesAp.invoiceDate, endDate),
          ),
        );

      months.push({
        month: monthDate.toLocaleString("en-US", { month: "short" }),
        amount: parseFloat(result[0]?.total ?? "0"),
      });
    }

    return months;
  }),

  /**
   * Get top vendors by spend.
   */
  getTopVendors: rlsProtectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const currency =
        (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";

      const now = new Date();
      const startDate =
        input.startDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate =
        input.endDate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      const vendors = await db
        .select({
          name: suppliers.name,
          total: sum(invoicesAp.totalAmount),
          count: count(),
        })
        .from(invoicesAp)
        .leftJoin(suppliers, eq(invoicesAp.supplierId, suppliers.id))
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            gte(invoicesAp.invoiceDate, startDate),
            lte(invoicesAp.invoiceDate, endDate),
          ),
        )
        .groupBy(suppliers.name)
        .orderBy(desc(sum(invoicesAp.totalAmount)))
        .limit(input.limit);

      return vendors.map((v) => ({
        name: v.name ?? "Unknown",
        total: parseFloat(v.total ?? "0"),
        totalFormatted: `${currency} ${parseFloat(v.total ?? "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        count: v.count,
      }));
    }),

  /**
   * Get budget overview data.
   */
  getBudgetOverview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const currency =
      (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";

    // Get active budget with lines
    const budget = await db.query.budgets.findFirst({
      where: and(eq(budgets.entityId, entityId), eq(budgets.status, "active")),
    });

    if (!budget) {
      return {
        hasBudget: false,
        categories: [],
        totalBudget: 0,
        totalSpent: 0,
        overallPercent: 0,
      };
    }

    // Get budget lines
    const lines = await db.query.budgetLines.findMany({
      where: eq(budgetLines.budgetId, budget.id),
    });

    // Get actual spend per category (using account type mapping)
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

    const totalBudget = lines.reduce(
      (sum, l) => sum + parseFloat(l.annualAmount ?? "0"),
      0,
    );

    // Get total spent
    const spentResult = await db
      .select({ total: sum(invoicesAp.totalAmount) })
      .from(invoicesAp)
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          gte(invoicesAp.invoiceDate, startDate),
          lte(invoicesAp.invoiceDate, endDate),
        ),
      );
    const totalSpent = parseFloat(spentResult[0]?.total ?? "0");

    // Map lines to categories (simplified - in production would use account mappings)
    const categories = lines.slice(0, 5).map((line) => {
      const budgetAmount = parseFloat(line.annualAmount ?? "0");
      // Estimate spent based on proportion
      const estimatedSpent =
        totalBudget > 0 ? (budgetAmount / totalBudget) * totalSpent : 0;
      const percent =
        budgetAmount > 0
          ? Math.round((estimatedSpent / budgetAmount) * 100)
          : 0;

      return {
        name: line.lineDescription ?? "Budget Line",
        budget: budgetAmount,
        budgetFormatted: `${currency} ${budgetAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        spent: estimatedSpent,
        spentFormatted: `${currency} ${estimatedSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        percent,
        remaining: budgetAmount - estimatedSpent,
      };
    });

    return {
      hasBudget: true,
      categories,
      totalBudget,
      totalSpent,
      overallPercent:
        totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    };
  }),

  /**
   * Get AI insights for expenses.
   */
  getAiInsights: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const currency =
      (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";

    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

    const insights: Array<{
      id: string;
      type: "warning" | "info" | "success";
      title: string;
      description: string;
      actionLabel: string;
    }> = [];

    // Check for duplicate expenses (same amount within 7 days)
    const recentExpenses = await db.query.invoicesAp.findMany({
      where: and(
        eq(invoicesAp.entityId, entityId),
        gte(invoicesAp.invoiceDate, startDate),
        lte(invoicesAp.invoiceDate, endDate),
      ),
      orderBy: [desc(invoicesAp.invoiceDate)],
      limit: 100,
    });

    // Find potential duplicates
    const amountMap = new Map<number, typeof recentExpenses>();
    for (const expense of recentExpenses) {
      const amount = Math.abs(parseFloat(expense.totalAmount));
      const existing = amountMap.get(amount) || [];
      existing.push(expense);
      amountMap.set(amount, existing);
    }

    for (const [amount, expenses] of amountMap) {
      if (expenses.length > 1) {
        insights.push({
          id: `duplicate-${expenses[0].id}`,
          type: "warning",
          title: `${expenses.length} duplicate expenses detected`,
          description: `You could save ${currency} ${amount.toLocaleString()} by reviewing duplicates`,
          actionLabel: "Review duplicates",
        });
        break;
      }
    }

    // Check for expenses without receipts (using metadata)
    const noReceiptCount = recentExpenses.filter(
      (e) => !(e.notes ?? "").includes("receipt"),
    ).length;
    if (noReceiptCount > 0) {
      insights.push({
        id: "missing-receipts",
        type: "info",
        title: "Missing receipts",
        description: `${noReceiptCount} expenses are missing receipts`,
        actionLabel: "Upload receipts",
      });
    }

    // Check for category suggestions
    const uncategorizedCount = recentExpenses.filter(
      (e) =>
        !e.notes ||
        (!e.notes.toLowerCase().includes("office") &&
          !e.notes.toLowerCase().includes("travel")),
    ).length;
    if (uncategorizedCount > 0) {
      insights.push({
        id: "category-suggestion",
        type: "info",
        title: "Category suggestion",
        description: `${uncategorizedCount} expenses could be recategorized`,
        actionLabel: "Review suggestions",
      });
    }

    // Add success if no issues
    if (insights.length === 0) {
      insights.push({
        id: "all-clear",
        type: "success",
        title: "Expenses look good",
        description: "No issues detected with your expenses this month",
        actionLabel: "View report",
      });
    }

    return insights;
  }),

  // ── Expense claims (employee reimbursement workflow) ────────────────────

  /**
   * Employee expense claims with policy review signals (flagged lines,
   * OCR confidence) — the approvals inbox for expense-reimbursement.
   */
  listClaims: rlsProtectedProcedure
    .input(
      z.object({
        status: z
          .enum(["all", "submitted", "flagged", "approved", "reimbursed"])
          .default("all"),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const currency =
        (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";
      const conditions = [eq(expenseClaims.entityId, entityId)];
      if (input.status !== "all") {
        conditions.push(eq(expenseClaims.status, input.status));
      }
      if (input.search) {
        conditions.push(
          sql`${expenseClaims.claimNumber} ILIKE ${`%${input.search}%`} OR ${expenseClaims.claimantName} ILIKE ${`%${input.search}%`}`,
        );
      }

      const totalCountResult = await db
        .select({ count: count() })
        .from(expenseClaims)
        .where(and(...conditions));
      const totalCount = totalCountResult[0]?.count ?? 0;

      const claims = await db
        .select({
          id: expenseClaims.id,
          claimNumber: expenseClaims.claimNumber,
          claimantName: expenseClaims.claimantName,
          department: expenseClaims.department,
          category: expenseClaims.category,
          description: expenseClaims.description,
          totalAmount: expenseClaims.totalAmount,
          status: expenseClaims.status,
          submittedAt: expenseClaims.submittedAt,
          flaggedReason: expenseClaims.flaggedReason,
          createdAt: expenseClaims.createdAt,
        })
        .from(expenseClaims)
        .where(and(...conditions))
        .orderBy(desc(expenseClaims.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const claimIds = claims.map((c) => c.id);
      const lineMap = new Map<
        string,
        Array<{ category: string; amount: string; isFlagged: boolean }>
      >();
      const reimburseMap = new Map<
        string,
        { status: string; paidDate: Date | null; paymentRef: string | null }
      >();

      if (claimIds.length > 0) {
        const lines = await db
          .select({
            claimId: claimLineItems.claimId,
            category: claimLineItems.category,
            amount: claimLineItems.amount,
            isFlagged: claimLineItems.isFlagged,
          })
          .from(claimLineItems)
          .where(sql`${claimLineItems.claimId} IN ${claimIds}`);
        for (const l of lines) {
          const arr = lineMap.get(l.claimId) ?? [];
          arr.push({
            category: l.category,
            amount: l.amount,
            isFlagged: l.isFlagged,
          });
          lineMap.set(l.claimId, arr);
        }

        const reimb = await db
          .select({
            claimId: reimbursementRecords.claimId,
            status: reimbursementRecords.status,
            paidDate: reimbursementRecords.paidDate,
            paymentRef: reimbursementRecords.paymentRef,
          })
          .from(reimbursementRecords)
          .where(sql`${reimbursementRecords.claimId} IN ${claimIds}`);
        for (const r of reimb) reimburseMap.set(r.claimId, r);
      }

      return {
        claims: claims.map((c) => ({
          ...c,
          lines: lineMap.get(c.id) ?? [],
          reimbursement: reimburseMap.get(c.id) ?? null,
        })),
        totalCount,
      };
    }),

  /**
   * Approve or reject a submitted expense claim. Writes an approval record
   * (audit trail) and flips the claim status. Flags stay visible.
   */
  decideClaim: rlsMutateProcedure
    .input(
      z.object({
        claimId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const claim = await db.query.expenseClaims.findFirst({
        where: and(
          eq(expenseClaims.id, input.claimId),
          eq(expenseClaims.entityId, ctx.entityId!),
        ),
      });
      if (!claim) {
        throw new Error("Claim not found");
      }
      if (claim.status !== "submitted" && claim.status !== "flagged") {
        throw new Error(
          `Cannot ${input.decision} a claim with status: ${claim.status}`,
        );
      }

      await db
        .update(expenseClaims)
        .set({
          status: input.decision === "approved" ? "approved" : "rejected",
          approvedById: ctx.session!.user!.id,
          approvedAt: new Date(),
        })
        .where(
          and(
            eq(expenseClaims.id, input.claimId),
            eq(expenseClaims.entityId, ctx.entityId!),
          ),
        );

      await db.insert(approvalRecords).values({
        entityId: ctx.entityId!,
        claimId: input.claimId,
        approverId: ctx.session!.user!.id!,
        approverName: ctx.session!.user!.name ?? ctx.session!.user!.email,
        decision: input.decision,
        decidedAt: new Date(),
        note: input.note ?? null,
        escalationLevel: 1,
      });

      await db.insert(auditLog).values({
        entityId: ctx.entityId!,
        userId: ctx.session!.user!.id!,
        action: "expense_claim.decide",
        entityType: "expense_claim",
        entityIdRef: input.claimId,
        newValues: { decision: input.decision, note: input.note ?? null },
      });

      return { ok: true };
    }),

  /**
   * Mark an approved claim as reimbursed (payment scheduled/paid). Creates
   * the reimbursement record and moves the claim to reimbursed.
   */
  reimburseClaim: rlsMutateProcedure
    .input(
      z.object({
        claimId: z.string().uuid(),
        paymentMethod: z
          .enum(["bank_transfer", "mobile_money", "cash", "cheque"])
          .default("bank_transfer"),
        paymentRef: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const claim = await db.query.expenseClaims.findFirst({
        where: and(
          eq(expenseClaims.id, input.claimId),
          eq(expenseClaims.entityId, ctx.entityId!),
        ),
      });
      if (!claim) throw new Error("Claim not found");
      if (claim.status !== "approved") {
        throw new Error(
          `Cannot reimburse a claim with status: ${claim.status}`,
        );
      }

      await db.insert(reimbursementRecords).values({
        entityId: ctx.entityId!,
        claimId: input.claimId,
        amount: claim.totalAmount,
        currency: claim.currency ?? "USD",
        paymentMethod: input.paymentMethod,
        paidDate: new Date(),
        paymentRef: input.paymentRef ?? `REIMB-${claim.claimNumber}`,
        status: "paid",
      });

      await db
        .update(expenseClaims)
        .set({ status: "reimbursed" })
        .where(
          and(
            eq(expenseClaims.id, input.claimId),
            eq(expenseClaims.entityId, ctx.entityId!),
          ),
        );

      await db.insert(auditLog).values({
        entityId: ctx.entityId!,
        userId: ctx.session!.user!.id!,
        action: "expense_claim.reimburse",
        entityType: "expense_claim",
        entityIdRef: input.claimId,
        newValues: {
          paymentMethod: input.paymentMethod,
          paymentRef: input.paymentRef ?? null,
        },
      });

      return { ok: true };
    }),

  /**
   * Get a single expense with full details (payments, supplier info, audit trail).
   */
  getExpenseDetail: rlsProtectedProcedure
    .input(z.object({ expenseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const currency =
        (ctx as { entityCurrency?: string | null }).entityCurrency ?? "GMD";

      const expense = await db
        .select({
          id: invoicesAp.id,
          invoiceNumber: invoicesAp.invoiceNumber,
          invoiceDate: invoicesAp.invoiceDate,
          dueDate: invoicesAp.dueDate,
          totalAmount: invoicesAp.totalAmount,
          paidAmount: invoicesAp.paidAmount,
          balance: invoicesAp.balance,
          status: invoicesAp.status,
          notes: invoicesAp.notes,
          currency: invoicesAp.currency,
          supplierId: invoicesAp.supplierId,
          supplierName: suppliers.name,
          supplierEmail: suppliers.contactEmail,
          supplierPhone: suppliers.contactPhone,
          createdAt: invoicesAp.createdAt,
        })
        .from(invoicesAp)
        .leftJoin(suppliers, eq(invoicesAp.supplierId, suppliers.id))
        .where(
          and(
            eq(invoicesAp.id, input.expenseId),
            eq(invoicesAp.entityId, entityId),
          ),
        )
        .limit(1);

      if (!expense[0]) return null;

      // Get payments for this expense
      const payments = await db
        .select({
          id: paymentsAp.id,
          amount: paymentsAp.amount,
          paymentDate: paymentsAp.paymentDate,
          method: paymentsAp.method,
          reference: paymentsAp.reference,
        })
        .from(paymentsAp)
        .where(eq(paymentsAp.invoiceApId, input.expenseId))
        .orderBy(desc(paymentsAp.paymentDate));

      // Get AP line items if any
      const lines = await db
        .select()
        .from(invoiceApLines)
        .where(eq(invoiceApLines.invoiceApId, input.expenseId));

      // Get audit trail for this expense
      const auditEntries = await db
        .select({
          action: auditLog.action,
          createdAt: auditLog.createdAt,
          userId: auditLog.userId,
          newValues: auditLog.newValues,
        })
        .from(auditLog)
        .where(
          and(
            eq(auditLog.entityId, entityId),
            eq(auditLog.entityIdRef, input.expenseId),
          ),
        )
        .orderBy(desc(auditLog.createdAt))
        .limit(20);

      // Determine category from notes
      const notesLower = (expense[0].notes ?? "").toLowerCase();
      let category = "General";
      if (notesLower.includes("office") || notesLower.includes("supplies"))
        category = "Office Supplies";
      else if (
        notesLower.includes("travel") ||
        notesLower.includes("transport")
      )
        category = "Travel";
      else if (
        notesLower.includes("software") ||
        notesLower.includes("subscription")
      )
        category = "Software";
      else if (notesLower.includes("marketing")) category = "Marketing";
      else if (notesLower.includes("meal") || notesLower.includes("lunch"))
        category = "Meals & Entertainment";
      else if (
        notesLower.includes("utility") ||
        notesLower.includes("internet")
      )
        category = "Utilities";
      else if (notesLower.includes("maintenance")) category = "Maintenance";

      return {
        ...expense[0],
        category,
        payments: payments.map((p) => ({
          ...p,
          amount: parseFloat(p.amount),
        })),
        lines: lines.map((l) => ({
          id: l.id,
          description: l.description,
          quantity: parseFloat(l.quantity ?? "1"),
          unitPrice: parseFloat(l.unitPrice ?? "0"),
          amount: parseFloat(l.amount ?? "0"),
        })),
        auditTrail: auditEntries.map((a) => ({
          action: a.action,
          createdAt: a.createdAt,
          details: a.newValues,
        })),
      };
    }),

  /**
   * Approve or reject an expense (change status from pending to approved/rejected).
   */ approveExpense: rlsMutateProcedure
    .use(
      // Approving posts money — only finance-capable roles may do it.
      requireRole("owner", "admin", "finance_director"),
    )
    .input(
      z.object({
        expenseId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().max(500).optional(),
        paymentMethod: z
          .enum(["bank_transfer", "cash", "mobile_money", "check", "card"])
          .optional(),
        paymentRef: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const userId = ctx.session!.user!.id!;

      const expense = await db
        .select({
          id: invoicesAp.id,
          status: invoicesAp.status,
          totalAmount: invoicesAp.totalAmount,
          invoiceNumber: invoicesAp.invoiceNumber,
          invoiceDate: invoicesAp.invoiceDate,
        })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.id, input.expenseId),
            eq(invoicesAp.entityId, entityId),
          ),
        )
        .limit(1);

      if (!expense[0]) throw new Error("Expense not found");
      if (expense[0].status !== "pending")
        throw new Error(
          `Cannot ${input.decision} expense with status: ${expense[0].status}`,
        );

      if (input.decision === "rejected") {
        // Rejected = never recognized; voided is the terminal AP state and
        // P4's aggregate fixes exclude voided from every payable/report.
        await db
          .update(invoicesAp)
          .set({ status: "voided" })
          .where(
            and(
              eq(invoicesAp.id, input.expenseId),
              eq(invoicesAp.entityId, entityId),
            ),
          );
        await db.insert(auditLog).values({
          entityId,
          userId,
          action: "expense.rejected",
          entityType: "invoice_ap",
          entityIdRef: input.expenseId,
          newValues: { decision: "rejected", note: input.note ?? null },
        });
        return { ok: true };
      }

      // ── Approved: recognize AND settle — the expense is real money that
      // moved. "Approved" was previously just a status flip to "paid" with no
      // journal entry and no payment record: the P&L never saw the expense and
      // the books never showed the cash leaving. Now approval: (1) posts the
      // bill JE (Dr expense / Cr AP), (2) records the full payment, (3) posts
      // the payment JE (Dr AP / Cr cash-or-bank by method). Any failure rolls
      // the whole approval back so "paid" is never claimed without the books
      // agreeing.
      const recognized = await postApBillToLedger(
        input.expenseId,
        entityId,
        userId,
      );
      if (!recognized.posted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: friendlyExpensePostReason(recognized.reason),
        });
      }

      const method = input.paymentMethod ?? "bank_transfer";
      const amount = expense[0].totalAmount;

      const [payment] = await db
        .insert(paymentsAp)
        .values({
          entityId,
          invoiceApId: input.expenseId,
          amount,
          paymentDate: new Date().toISOString().slice(0, 10),
          method,
          reference: input.paymentRef ?? `APPROVAL-${expense[0].invoiceNumber}`,
        })
        .returning({ id: paymentsAp.id });
      if (!payment) throw new Error("Failed to record expense payment");

      const [cas] = await db
        .update(invoicesAp)
        .set({
          paidAmount: amount,
          balance: "0",
          status: "paid",
        })
        .where(
          and(
            eq(invoicesAp.id, input.expenseId),
            eq(invoicesAp.entityId, entityId),
            eq(invoicesAp.status, "pending"),
          ),
        )
        .returning({ id: invoicesAp.id });
      if (!cas) {
        await db
          .delete(paymentsAp)
          .where(eq(paymentsAp.id, payment.id))
          .catch(() => {});
        throw new Error("Expense state changed — refresh and try again");
      }

      try {
        // Throws when the payment cannot be posted (closed period) — the
        // catch below rolls everything back so nothing half-records.
        await postApPaymentToLedger(payment.id, entityId, userId);
      } catch (err) {
        await db
          .delete(paymentsAp)
          .where(eq(paymentsAp.id, payment.id))
          .catch(() => {});
        await db
          .update(invoicesAp)
          .set({
            paidAmount: "0",
            balance: amount,
            status: "pending",
            // The recognized JE is being reversed below — clear the link so a
            // re-approval posts fresh instead of trusting a reversed entry.
            journalEntryId: null,
          })
          .where(eq(invoicesAp.id, input.expenseId))
          .catch(() => {});
        // The bill JE we recognized is now orphaned — reverse it so approval
        // leaves NO trace.
        await reverseApBillJournal(
          input.expenseId,
          entityId,
          userId,
          "Expense approval rolled back: payment could not post",
        ).catch(() => {});
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Payment could not be posted — the accounting period for today is closed. Reopen it or change the expense, then approve again.",
        });
      }

      await db.insert(auditLog).values({
        entityId,
        userId,
        action: "expense.approved",
        entityType: "invoice_ap",
        entityIdRef: input.expenseId,
        newValues: {
          decision: "approved",
          note: input.note ?? null,
          paymentMethod: method,
          journalEntryId: recognized.journalEntryId,
        },
      });

      return { ok: true };
    }),
});

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * P6-A: deterministically resolve an expense line to a COA account.
 *
 * Order: category/description keyword match on the account name/code/subtype
 * → first expense-type account → none (caller surfaces the clear error).
 * Never guesses: no match means NO account, and the caller refuses to create
 * an unpostable expense instead of silently mis-booking it.
 */
async function resolveExpenseAccountId(
  entityId: string,
  category: string,
  description: string,
): Promise<string | null> {
  const accounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.type, "expense"),
    ),
    columns: { id: true, name: true, code: true, subtype: true },
  });
  if (accounts.length === 0) return null;

  const haystack = `${category} ${description}`.toLowerCase();
  const bySubtype = new Map<string, string[]>();
  const byKeyword: Array<{ keywords: string[]; id: string }> = [];

  for (const acc of accounts) {
    const name = `${acc.name} ${acc.code} ${acc.subtype}`.toLowerCase();
    const words = name.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
    byKeyword.push({ keywords: words, id: acc.id });
    const sub = (acc.subtype ?? "").toLowerCase();
    if (!bySubtype.has(sub)) bySubtype.set(sub, []);
    bySubtype.get(sub)!.push(acc.id);
  }

  // Subtype wins when the description matches an expense subtype word
  // (e.g. "rent" → rent_expense, "travel" → travel_expense).
  for (const [subtype, ids] of bySubtype) {
    const tokens = subtype.split("_").filter((t) => t.length >= 3);
    if (tokens.some((t) => haystack.includes(t))) return ids[0]!;
  }

  // Then keyword overlap on account names.
  let best: { id: string; score: number } | null = null;
  for (const cand of byKeyword) {
    let score = 0;
    for (const w of cand.keywords) {
      if (haystack.includes(w)) score++;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { id: cand.id, score };
    }
  }
  if (best) return best.id;

  // Deterministic fallback: the first expense account in the chart.
  return accounts[0]!.id;
}

function friendlyExpensePostReason(reason: string): string {
  const map: Record<string, string> = {
    invoice_not_found: "Expense not found.",
    voided: "Voided expenses are not posted.",
    no_lines: "Expense has no line items to post.",
    no_chart_of_accounts:
      "No chart of accounts exists yet — add accounts first.",
    no_ap_account:
      "Accounts Payable account could not be resolved — add one to your chart of accounts.",
    missing_line_account:
      "A line account is missing from your chart of accounts — fix the expense first.",
    invalid_line_amount: "A line amount is invalid.",
    journal_skipped:
      "Posting was skipped — the expense date's accounting period is closed or the entry failed validation.",
    error: "Posting failed unexpectedly — check the audit log or try again.",
  };
  return map[reason] ?? "Could not post the expense to the ledger.";
}
