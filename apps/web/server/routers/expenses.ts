import { z } from "zod";
import { eq, and, desc, sql, count, sum, gte, lte } from "drizzle-orm";
import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
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
} from "@xenboox/db/schema";

// ─── Expenses Router ───────────────────────────────────────────────────────

export const expensesRouter = router({
  /**
   * Manually record an expense. Expenses are stored as AP invoice rows (the
   * same table the expenses page reads), pending by default so they can be
   * reviewed before approval. Requires a payee (supplier) and a balance.
   */
  createExpense: rlsProtectedProcedure
    .input(
      z.object({
        supplierId: z.string().uuid(),
        description: z.string().min(1).max(500),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        category: z.string().optional(),
        paymentMethod: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
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
            entityId: ctx.entityId!,
            supplierId: input.supplierId,
            invoiceNumber: `EXP-${stamp}`,
            invoiceDate: input.expenseDate,
            dueDate: input.dueDate,
            totalAmount: input.amount,
            paidAmount: "0",
            balance: input.amount,
            currency: "GMD",
            status: "pending",
            notes: input.description,
            receivedDate: input.expenseDate,
          })
          .returning();

        if (!expense) {
          throw new Error("Failed to create expense");
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
          amountFormatted: `GMD ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
          amountFormatted: `GMD ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          percent:
            totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        categories,
        totalAmount,
        totalAmountFormatted: `GMD ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      };
    }),

  /**
   * Get monthly trend data for line chart.
   */
  getMonthlyTrend: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

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
        totalFormatted: `GMD ${parseFloat(v.total ?? "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        count: v.count,
      }));
    }),

  /**
   * Get budget overview data.
   */
  getBudgetOverview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

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
        budgetFormatted: `GMD ${budgetAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        spent: estimatedSpent,
        spentFormatted: `GMD ${estimatedSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
          description: `You could save GMD ${amount.toLocaleString()} by reviewing duplicates`,
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
});
