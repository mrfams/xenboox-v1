import { z } from "zod";
import { eq, and, desc, sql, lte } from "drizzle-orm";
import {
  recurringSchedules,
  recurringRuns,
  salesInvoices,
  salesInvoiceLines,
  invoicesAp,
  invoiceApLines,
  customers,
  suppliers,
} from "@xenboox/db/schema";

import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─── Helpers ─────────────────────────────────────────────────────────────

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Calculate the next run date based on frequency and interval.
 */
function calculateNextRunDate(
  lastRunDate: string,
  frequency: string,
  intervalValue: number,
  dayOfMonth?: number | null,
): string {
  const date = new Date(lastRunDate);

  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7 * intervalValue);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14 * intervalValue);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + intervalValue);
      if (dayOfMonth && dayOfMonth > 0) {
        date.setDate(Math.min(dayOfMonth, 28)); // Cap at 28 to avoid month-end issues
      }
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3 * intervalValue);
      if (dayOfMonth && dayOfMonth > 0) {
        date.setDate(Math.min(dayOfMonth, 28));
      }
      break;
    case "annually":
      date.setFullYear(date.getFullYear() + intervalValue);
      if (dayOfMonth && dayOfMonth > 0) {
        date.setDate(Math.min(dayOfMonth, 28));
      }
      break;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Calculate due date based on payment terms.
 */
function calculateDueDate(invoiceDate: string, paymentTerms: string): string {
  const date = new Date(invoiceDate);
  switch (paymentTerms) {
    case "net15":
      date.setDate(date.getDate() + 15);
      break;
    case "net30":
      date.setDate(date.getDate() + 30);
      break;
    case "net45":
      date.setDate(date.getDate() + 45);
      break;
    case "net60":
      date.setDate(date.getDate() + 60);
      break;
    case "due_on_receipt":
      // Same as invoice date
      break;
    default:
      date.setDate(date.getDate() + 30);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// ─── Router ──────────────────────────────────────────────────────────────

export const recurringRouter = router({
  /**
   * List all recurring schedules for the entity.
   */
  list: rlsProtectedProcedure
    .input(
      z.object({
        direction: z.enum(["ar", "ap", "all"]).default("all"),
        status: z
          .enum(["all", "active", "paused", "completed", "cancelled"])
          .default("all"),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const conditions = [eq(recurringSchedules.entityId, entityId)];

      if (input.direction !== "all") {
        conditions.push(eq(recurringSchedules.direction, input.direction));
      }
      if (input.status !== "all") {
        conditions.push(eq(recurringSchedules.status, input.status));
      }

      const schedules = await db.query.recurringSchedules.findMany({
        where: and(...conditions),
        orderBy: [desc(recurringSchedules.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      // Batch-enrich with party names (single query each, not N+1)
      const customerIds = [
        ...new Set(
          schedules
            .filter((s) => s.direction === "ar" && s.customerId)
            .map((s) => s.customerId!),
        ),
      ];
      const supplierIds = [
        ...new Set(
          schedules
            .filter((s) => s.direction === "ap" && s.supplierId)
            .map((s) => s.supplierId!),
        ),
      ];

      const [customerRows, supplierRows] = await Promise.all([
        customerIds.length > 0
          ? db.query.customers.findMany({
              where: sql`${customers.id} IN ${customerIds}`,
              columns: { id: true, name: true },
            })
          : [],
        supplierIds.length > 0
          ? db.query.suppliers.findMany({
              where: sql`${suppliers.id} IN ${supplierIds}`,
              columns: { id: true, name: true },
            })
          : [],
      ]);

      const customerMap = new Map(customerRows.map((c) => [c.id, c.name]));
      const supplierMap = new Map(supplierRows.map((s) => [s.id, s.name]));

      return schedules.map((s) => ({
        ...s,
        partyName:
          s.direction === "ar"
            ? s.customerId
              ? (customerMap.get(s.customerId) ?? "")
              : ""
            : s.supplierId
              ? (supplierMap.get(s.supplierId) ?? "")
              : "",
      }));
    }),

  /**
   * Get a single recurring schedule with its run history.
   */
  get: rlsProtectedProcedure
    .input(z.object({ scheduleId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const schedule = await db.query.recurringSchedules.findFirst({
        where: and(
          eq(recurringSchedules.id, input.scheduleId),
          eq(recurringSchedules.entityId, entityId),
        ),
      });

      if (!schedule) return null;

      const runs = await db.query.recurringRuns.findMany({
        where: eq(recurringRuns.scheduleId, schedule.id),
        orderBy: [desc(recurringRuns.generatedAt)],
        limit: 20,
      });

      let partyName = "";
      if (schedule.direction === "ar" && schedule.customerId) {
        const c = await db.query.customers.findFirst({
          where: eq(customers.id, schedule.customerId),
          columns: { name: true },
        });
        partyName = c?.name ?? "";
      } else if (schedule.direction === "ap" && schedule.supplierId) {
        const sup = await db.query.suppliers.findFirst({
          where: eq(suppliers.id, schedule.supplierId),
          columns: { name: true },
        });
        partyName = sup?.name ?? "";
      }

      return { ...schedule, partyName, runs };
    }),

  /**
   * Create a new recurring schedule.
   */
  create: rlsProtectedProcedure
    .input(
      z.object({
        direction: z.enum(["ar", "ap"]),
        customerId: z.string().uuid().optional(),
        supplierId: z.string().uuid().optional(),
        templateName: z.string().min(1),
        templateDescription: z.string().optional(),
        templateLines: z.array(
          z.object({
            description: z.string().min(1),
            quantity: z.number().min(0.01),
            unitPrice: z.number().min(0),
            accountId: z.string().uuid().optional(),
          }),
        ),
        frequency: z.enum([
          "weekly",
          "biweekly",
          "monthly",
          "quarterly",
          "annually",
        ]),
        intervalValue: z.number().min(1).default(1),
        dayOfMonth: z.number().min(1).max(28).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
        startDate: z.string(),
        endDate: z.string().optional(),
        currency: z.string().default("USD"),
        taxRate: z.number().optional(),
        discountPercent: z.number().optional(),
        paymentTerms: z.string().default("net30"),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      if (input.direction === "ar" && !input.customerId) {
        throw new Error("Customer is required for recurring sales invoices");
      }
      if (input.direction === "ap" && !input.supplierId) {
        throw new Error("Supplier is required for recurring purchase invoices");
      }

      // Calculate next run date
      const nextRunDate = calculateNextRunDate(
        input.startDate,
        input.frequency,
        input.intervalValue,
        input.dayOfMonth,
      );

      // Calculate estimated total
      const lineTotal = input.templateLines.reduce(
        (sum, l) => sum + l.quantity * l.unitPrice,
        0,
      );
      const taxAmount = input.taxRate ? lineTotal * (input.taxRate / 100) : 0;
      const discountAmount = input.discountPercent
        ? lineTotal * (input.discountPercent / 100)
        : 0;
      const totalAmount = lineTotal + taxAmount - discountAmount;

      const [schedule] = await db
        .insert(recurringSchedules)
        .values({
          entityId,
          direction: input.direction,
          customerId: input.customerId,
          supplierId: input.supplierId,
          templateName: input.templateName,
          templateDescription: input.templateDescription,
          templateLines: input.templateLines,
          frequency: input.frequency,
          intervalValue: input.intervalValue,
          dayOfMonth: input.dayOfMonth,
          dayOfWeek: input.dayOfWeek,
          startDate: input.startDate,
          endDate: input.endDate,
          nextRunDate,
          currency: input.currency,
          taxRate: input.taxRate ? String(input.taxRate) : null,
          discountPercent: input.discountPercent
            ? String(input.discountPercent)
            : null,
          paymentTerms: input.paymentTerms,
          notes: input.notes,
          totalAmount: String(totalAmount),
        })
        .returning();

      return schedule;
    }),

  /**
   * Update a recurring schedule.
   */
  update: rlsProtectedProcedure
    .input(
      z.object({
        scheduleId: z.string().uuid(),
        templateName: z.string().min(1).optional(),
        templateDescription: z.string().optional(),
        templateLines: z
          .array(
            z.object({
              description: z.string().min(1),
              quantity: z.number().min(0.01),
              unitPrice: z.number().min(0),
              accountId: z.string().uuid().optional(),
            }),
          )
          .optional(),
        frequency: z
          .enum(["weekly", "biweekly", "monthly", "quarterly", "annually"])
          .optional(),
        intervalValue: z.number().min(1).optional(),
        dayOfMonth: z.number().min(1).max(28).optional(),
        endDate: z.string().optional(),
        taxRate: z.number().optional(),
        discountPercent: z.number().optional(),
        paymentTerms: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const { scheduleId, ...data } = input;

      const [updated] = await db
        .update(recurringSchedules)
        .set(data)
        .where(
          and(
            eq(recurringSchedules.id, scheduleId),
            eq(recurringSchedules.entityId, entityId),
          ),
        )
        .returning();

      return updated;
    }),

  /**
   * Pause a recurring schedule.
   */
  pause: rlsProtectedProcedure
    .input(z.object({ scheduleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const [updated] = await db
        .update(recurringSchedules)
        .set({ status: "paused" })
        .where(
          and(
            eq(recurringSchedules.id, input.scheduleId),
            eq(recurringSchedules.entityId, entityId),
          ),
        )
        .returning();
      return updated;
    }),

  /**
   * Resume a paused recurring schedule.
   */
  resume: rlsProtectedProcedure
    .input(z.object({ scheduleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const schedule = await db.query.recurringSchedules.findFirst({
        where: and(
          eq(recurringSchedules.id, input.scheduleId),
          eq(recurringSchedules.entityId, entityId),
        ),
      });

      if (!schedule || schedule.status !== "paused") {
        throw new Error("Schedule not found or not paused");
      }

      // Recalculate next run date from today
      const nextRunDate = calculateNextRunDate(
        todayStr(),
        schedule.frequency,
        schedule.intervalValue,
        schedule.dayOfMonth,
      );

      const [updated] = await db
        .update(recurringSchedules)
        .set({ status: "active", nextRunDate })
        .where(
          and(
            eq(recurringSchedules.id, input.scheduleId),
            eq(recurringSchedules.entityId, entityId),
          ),
        )
        .returning();

      return updated;
    }),

  /**
   * Cancel a recurring schedule.
   */
  cancel: rlsProtectedProcedure
    .input(z.object({ scheduleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const [updated] = await db
        .update(recurringSchedules)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(recurringSchedules.id, input.scheduleId),
            eq(recurringSchedules.entityId, entityId),
          ),
        )
        .returning();
      return updated;
    }),

  /**
   * Manually trigger a run of a recurring schedule (generate the next invoice/bill).
   */
  triggerRun: rlsProtectedProcedure
    .input(z.object({ scheduleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const schedule = await db.query.recurringSchedules.findFirst({
        where: and(
          eq(recurringSchedules.id, input.scheduleId),
          eq(recurringSchedules.entityId, entityId),
        ),
      });

      if (!schedule) throw new Error("Schedule not found");
      if (schedule.status === "cancelled" || schedule.status === "completed") {
        throw new Error("Schedule is not active");
      }

      // Check end date
      if (schedule.endDate && todayStr() > schedule.endDate) {
        await db
          .update(recurringSchedules)
          .set({ status: "completed" })
          .where(eq(recurringSchedules.id, schedule.id));
        throw new Error("Schedule has passed its end date");
      }

      const invoiceDate = todayStr();
      const dueDate = calculateDueDate(
        invoiceDate,
        schedule.paymentTerms ?? "net30",
      );

      // Calculate total
      const lines =
        (schedule.templateLines as Array<{
          description: string;
          quantity: number;
          unitPrice: number;
          accountId?: string;
        }>) ?? [];

      const subtotal = lines.reduce(
        (sum, l) => sum + l.quantity * l.unitPrice,
        0,
      );
      const taxAmount = schedule.taxRate
        ? subtotal * (parseFloat(schedule.taxRate) / 100)
        : 0;
      const discountAmount = schedule.discountPercent
        ? subtotal * (parseFloat(schedule.discountPercent) / 100)
        : 0;
      const totalAmount = subtotal + taxAmount - discountAmount;

      // Validation before any write: a run must either generate a real
      // document or fail loudly. A schedule missing its counterparty, an
      // unknown direction, or a template with no postable lines must never
      // silently "generate" nothing while advancing the schedule.
      if (schedule.direction !== "ar" && schedule.direction !== "ap") {
        throw new Error(`Unknown schedule direction: ${schedule.direction}`);
      }
      if (schedule.direction === "ar" && !schedule.customerId) {
        throw new Error("Schedule has no customer configured");
      }
      if (schedule.direction === "ap" && !schedule.supplierId) {
        throw new Error("Schedule has no supplier configured");
      }
      const postableLines = lines.filter((l) => l.accountId);
      if (postableLines.length === 0) {
        throw new Error(
          "Template has no lines with an account — nothing to generate",
        );
      }
      if (!Number.isFinite(totalAmount)) {
        throw new Error("Computed invoice total is not a finite number");
      }

      // Generate invoice number
      const prefix = schedule.direction === "ar" ? "SI" : "PI";
      const runCount = schedule.totalGenerated + 1;
      const invoiceNumber = `${prefix}-${new Date().getFullYear()}-${String(runCount).padStart(4, "0")}`;

      const nextRunDate = calculateNextRunDate(
        invoiceDate,
        schedule.frequency,
        schedule.intervalValue,
        schedule.dayOfMonth,
      );

      let generatedInvoiceId: string;

      try {
        // Atomic generation: document + lines + run log + schedule advance
        // commit together or not at all. A partial invoice (header without
        // line items) must never be observable after a mid-loop failure, and
        // a retried or concurrent run that loses the invoice-number race
        // (unique (entityId, invoiceNumber) index) fails honestly.
        generatedInvoiceId = await db.transaction(async (tx) => {
          if (schedule.direction === "ar") {
            const [invoice] = await tx
              .insert(salesInvoices)
              .values({
                entityId,
                customerId: schedule.customerId!,
                invoiceNumber,
                invoiceDate,
                dueDate,
                totalAmount: String(totalAmount),
                balance: String(totalAmount),
                currency: schedule.currency,
                notes: schedule.notes,
                status: "pending",
              })
              .returning({ id: salesInvoices.id });

            await tx.insert(salesInvoiceLines).values(
              postableLines.map((line) => ({
                salesInvoiceId: invoice.id,
                accountId: line.accountId!,
                description: line.description,
                quantity: String(line.quantity),
                unitPrice: String(line.unitPrice),
                amount: String(line.quantity * line.unitPrice),
              })),
            );

            await tx.insert(recurringRuns).values({
              scheduleId: schedule.id,
              entityId,
              generatedInvoiceId: invoice.id,
              invoiceNumber,
              amount: String(totalAmount),
              status: "generated",
            });

            await tx
              .update(recurringSchedules)
              .set({
                lastRunDate: invoiceDate,
                nextRunDate,
                totalGenerated: runCount,
              })
              .where(eq(recurringSchedules.id, schedule.id));

            return invoice.id;
          } else {
            const [invoice] = await tx
              .insert(invoicesAp)
              .values({
                entityId,
                supplierId: schedule.supplierId!,
                invoiceNumber,
                invoiceDate,
                dueDate,
                totalAmount: String(totalAmount),
                balance: String(totalAmount),
                currency: schedule.currency,
                notes: schedule.notes,
                status: "pending",
              })
              .returning({ id: invoicesAp.id });

            await tx.insert(invoiceApLines).values(
              postableLines.map((line) => ({
                invoiceApId: invoice.id,
                accountId: line.accountId!,
                description: line.description,
                quantity: String(line.quantity),
                unitPrice: String(line.unitPrice),
                amount: String(line.quantity * line.unitPrice),
              })),
            );

            await tx.insert(recurringRuns).values({
              scheduleId: schedule.id,
              entityId,
              generatedInvoiceId: invoice.id,
              invoiceNumber,
              amount: String(totalAmount),
              status: "generated",
            });

            await tx
              .update(recurringSchedules)
              .set({
                lastRunDate: invoiceDate,
                nextRunDate,
                totalGenerated: runCount,
              })
              .where(eq(recurringSchedules.id, schedule.id));

            return invoice.id;
          }
        });

        return {
          success: true,
          invoiceNumber,
          generatedInvoiceId,
          amount: totalAmount,
        };
      } catch (error) {
        // Best-effort failure record outside the transaction: the failed
        // generation itself leaves no partial state behind.
        try {
          await db.insert(recurringRuns).values({
            scheduleId: schedule.id,
            entityId,
            invoiceNumber,
            amount: String(totalAmount),
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
          });
        } catch (logErr) {
          logger.error(
            { scheduleId: schedule.id, logErr },
            "Failed to record recurring run failure",
          );
        }

        logger.error(
          { scheduleId: schedule.id, error },
          "Failed to generate recurring invoice",
        );
        throw error;
      }
    }),

  /**
   * Dashboard summary: counts and upcoming runs.
   */
  getSummary: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const schedules = await db.query.recurringSchedules.findMany({
      where: eq(recurringSchedules.entityId, entityId),
    });

    const active = schedules.filter((s) => s.status === "active").length;
    const paused = schedules.filter((s) => s.status === "paused").length;
    const completed = schedules.filter((s) => s.status === "completed").length;

    // Upcoming runs (next 7 days)
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekStr = `${weekFromNow.getFullYear()}-${String(weekFromNow.getMonth() + 1).padStart(2, "0")}-${String(weekFromNow.getDate()).padStart(2, "0")}`;

    const upcoming = schedules
      .filter(
        (s) =>
          s.status === "active" &&
          s.nextRunDate <= weekStr &&
          s.nextRunDate >= todayStr(),
      )
      .sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate));

    // Recent runs
    const recentRuns = await db.query.recurringRuns.findMany({
      where: eq(recurringRuns.entityId, entityId),
      orderBy: [desc(recurringRuns.generatedAt)],
      limit: 5,
    });

    return {
      active,
      paused,
      completed,
      total: schedules.length,
      upcoming,
      recentRuns,
    };
  }),
});
