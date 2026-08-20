import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";
import { salesInvoices, customers } from "@xenboox/db/schema";

import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import {
  runThreeWayMatching,
  confirmThreeWayMatch,
} from "@/lib/three-way-matching";
import {
  generateARAgingReport,
  calculateCollectionPriorities,
  getDunningSummary,
  generateDunningLetter,
  writeOffBadDebt,
} from "@/lib/dunning";

// ─── Router ──────────────────────────────────────────────────────────────

export const matchingRouter = router({
  // ── Three-Way Matching ─────────────────────────────────────────────────

  /**
   * Run three-way matching for the entity.
   */
  runThreeWayMatch: rlsProtectedProcedure.query(async ({ ctx }) => {
    return runThreeWayMatching(ctx.entityId!);
  }),

  /**
   * Confirm a three-way match: link bill to PO.
   */
  confirmMatch: rlsProtectedProcedure
    .input(
      z.object({
        billId: z.string().uuid(),
        poId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return confirmThreeWayMatch(ctx.entityId!, input.billId, input.poId);
    }),

  // ── Dunning & Collections ──────────────────────────────────────────────

  /**
   * Get AR aging report.
   */
  getAgingReport: rlsProtectedProcedure.query(async ({ ctx }) => {
    return generateARAgingReport(ctx.entityId!);
  }),

  /**
   * Get collection priorities.
   */
  getCollectionPriorities: rlsProtectedProcedure.query(async ({ ctx }) => {
    return calculateCollectionPriorities(ctx.entityId!);
  }),

  /**
   * Get dunning summary dashboard data.
   */
  getDunningSummary: rlsProtectedProcedure.query(async ({ ctx }) => {
    return getDunningSummary(ctx.entityId!);
  }),

  /**
   * Generate a dunning letter for a specific customer.
   */
  generateDunningLetter: rlsProtectedProcedure
    .input(
      z.object({
        customerId: z.string().uuid(),
        level: z.enum(["friendly", "firm", "final", "legal"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const customer = await db.query.customers.findFirst({
        where: and(
          eq(customers.id, input.customerId),
          eq(customers.entityId, entityId),
        ),
      });

      if (!customer) throw new Error("Customer not found");

      // Get unpaid invoices for this customer
      const invoices = await db.query.salesInvoices.findMany({
        where: and(
          eq(salesInvoices.customerId, input.customerId),
          eq(salesInvoices.entityId, entityId),
          sql`${salesInvoices.status} IN ('pending', 'partial', 'overdue')`,
        ),
      });

      const today = new Date();
      const agingInvoices = invoices.map((inv) => {
        const dueDate = new Date(inv.dueDate);
        const daysOverdue = Math.max(
          0,
          Math.floor(
            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerId: inv.customerId,
          customerName: customer.name,
          totalAmount: parseFloat(inv.totalAmount),
          balance: parseFloat(inv.balance),
          dueDate: inv.dueDate,
          daysOverdue,
          agingBucket: "",
          lastPaymentDate: null,
          paymentHistory: [],
        };
      });

      return generateDunningLetter(customer.name, agingInvoices, input.level);
    }),

  /**
   * Write off an invoice as bad debt.
   */
  writeOffBadDebt: rlsProtectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return writeOffBadDebt(
        ctx.entityId!,
        input.invoiceId,
        ctx.session!.user!.id!,
      );
    }),
});
