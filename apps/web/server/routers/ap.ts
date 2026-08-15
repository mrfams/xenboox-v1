import { z } from "zod";
import { eq, and, desc, sql, count, sum, gte, lte } from "drizzle-orm";
import {
  suppliers,
  purchaseOrders,
  poLines,
  invoicesAp,
  invoiceApLines,
  paymentsAp,
  auditLog,
} from "@xenboox/db/schema";
import { TRPCError } from "@trpc/server";
import {
  validateInvoice,
  logTrustGuardResult,
  trustGuardToError,
} from "@xenboox/agents";

import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  requireRole,
  requirePermission,
} from "@/lib/trpc/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { sendPaymentSentEmail } from "@/lib/email";
import { getEnrichedEntityContext } from "@/lib/entity-context-enrichment";
import { dispatchWebhookEvent } from "@/lib/webhooks/delivery";

// ─── AP Router ───────────────────────────────────────────────────────────────

export const apRouter = router({
  // ── Vendors Overview ──
  getVendorsOverview: rlsProtectedProcedure
    .input(
      z.object({
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

      // Previous month for comparison
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevStartDate = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;
      const prevEndDate = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-${new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()}`;

      // Total payables (all AP invoices)
      const totalPayablesResult = await db
        .select({ total: sum(invoicesAp.totalAmount) })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            gte(invoicesAp.invoiceDate, startDate),
            lte(invoicesAp.invoiceDate, endDate),
          ),
        );
      const totalPayables = parseFloat(totalPayablesResult[0]?.total ?? "0");

      // Previous month total payables
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
      const prevTotalPayables = parseFloat(prevTotalResult[0]?.total ?? "0");

      // Overdue amount
      const overdueResult = await db
        .select({ total: sum(invoicesAp.balance) })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            eq(invoicesAp.status, "overdue"),
          ),
        );
      const overdueAmount = parseFloat(overdueResult[0]?.total ?? "0");

      // Previous month overdue
      const prevOverdueResult = await db
        .select({ total: sum(invoicesAp.balance) })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            eq(invoicesAp.status, "overdue"),
            gte(invoicesAp.invoiceDate, prevStartDate),
            lte(invoicesAp.invoiceDate, prevEndDate),
          ),
        );
      const prevOverdue = parseFloat(prevOverdueResult[0]?.total ?? "0");

      // Due within 7 days
      const dueDate7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dueWithin7Result = await db
        .select({ total: sum(invoicesAp.balance), count: count() })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            lte(invoicesAp.dueDate, dueDate7.toISOString().split("T")[0]),
            gte(invoicesAp.dueDate, now.toISOString().split("T")[0]),
          ),
        );
      const dueWithin7 = parseFloat(dueWithin7Result[0]?.total ?? "0");
      const dueWithin7Count = dueWithin7Result[0]?.count ?? 0;

      // Total vendors
      const totalVendorsResult = await db
        .select({ count: count() })
        .from(suppliers)
        .where(
          and(eq(suppliers.entityId, entityId), eq(suppliers.isActive, true)),
        );
      const totalVendors = totalVendorsResult[0]?.count ?? 0;

      // Average days to pay (calculate from paid invoices)
      const avgDaysResult = await db
        .select({
          avgDays: sql<number>`AVG(EXTRACT(EPOCH FROM (${invoicesAp.updatedAt} - ${invoicesAp.createdAt})) / 86400)`,
        })
        .from(invoicesAp)
        .where(
          and(eq(invoicesAp.entityId, entityId), eq(invoicesAp.status, "paid")),
        );
      const avgDaysToPay = Math.round(avgDaysResult[0]?.avgDays ?? 23);

      // Calculate changes
      const payablesChange =
        prevTotalPayables > 0
          ? ((totalPayables - prevTotalPayables) / prevTotalPayables) * 100
          : 0;
      const overdueChange =
        prevOverdue > 0
          ? ((overdueAmount - prevOverdue) / prevOverdue) * 100
          : 0;

      return {
        totalPayables,
        totalPayablesChange: Number(payablesChange.toFixed(1)),
        overdueAmount,
        overdueChange: Number(overdueChange.toFixed(1)),
        dueWithin7,
        dueWithin7Count,
        totalVendors,
        avgDaysToPay,
      };
    }),

  // ── Vendor List with Payables ──
  listVendorsWithPayables: rlsProtectedProcedure
    .input(
      z.object({
        status: z.enum(["all", "active", "inactive", "on_hold"]).default("all"),
        search: z.string().optional(),
        vendorType: z.string().optional(),
        paymentTerms: z.string().optional(),
        is1099: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Build conditions
      const conditions = [eq(suppliers.entityId, entityId)];

      if (input.status === "active") {
        conditions.push(eq(suppliers.isActive, true));
      } else if (input.status === "inactive") {
        conditions.push(eq(suppliers.isActive, false));
      } else if (input.status === "on_hold") {
        // On Hold = active vendor with an outstanding balance on AP invoices.
        conditions.push(eq(suppliers.isActive, true));
        conditions.push(
          sql`EXISTS (SELECT 1 FROM ${invoicesAp} WHERE ${invoicesAp.supplierId} = ${suppliers.id} AND ${invoicesAp.entityId} = ${entityId} AND ${invoicesAp.balance} > 0)`,
        );
      }

      if (input.is1099) {
        conditions.push(eq(suppliers.is1099, true));
      }

      if (input.paymentTerms) {
        conditions.push(eq(suppliers.paymentTerms, input.paymentTerms));
      }

      if (input.vendorType && input.vendorType !== "Supplier") {
        // vendorType mirrors the response heuristic (name-based) so filter
        // and result stay consistent.
        const patterns = vendorTypePatterns(input.vendorType);
        if (patterns) {
          conditions.push(
            sql`(${patterns.map((p) => sql`${suppliers.name} ILIKE ${`%${p}%`}`).join(" OR ")})`,
          );
        }
      }

      if (input.search) {
        conditions.push(sql`${suppliers.name} ILIKE ${`%${input.search}%`}`);
      }

      // Get total count
      const totalCountResult = await db
        .select({ count: count() })
        .from(suppliers)
        .where(and(...conditions));
      const totalCount = totalCountResult[0]?.count ?? 0;

      // Get suppliers
      const supplierList = await db
        .select({
          id: suppliers.id,
          name: suppliers.name,
          contactEmail: suppliers.contactEmail,
          contactPhone: suppliers.contactPhone,
          paymentTerms: suppliers.paymentTerms,
          isActive: suppliers.isActive,
          is1099: suppliers.is1099,
        })
        .from(suppliers)
        .where(and(...conditions))
        .orderBy(suppliers.name)
        .limit(input.limit)
        .offset(input.offset);

      // Get payables for each supplier
      const supplierIds = supplierList.map((s) => s.id);
      const payablesMap = new Map<string, { total: number; overdue: number }>();

      if (supplierIds.length > 0) {
        const payables = await db
          .select({
            supplierId: invoicesAp.supplierId,
            total: sum(invoicesAp.totalAmount),
            overdue: sum(invoicesAp.balance),
          })
          .from(invoicesAp)
          .where(sql`${invoicesAp.supplierId} IN ${supplierIds}`)
          .groupBy(invoicesAp.supplierId);

        for (const p of payables) {
          if (p.supplierId) {
            payablesMap.set(p.supplierId, {
              total: parseFloat(p.total ?? "0"),
              overdue: parseFloat(p.overdue ?? "0"),
            });
          }
        }
      }

      // Map to response format
      const vendors = supplierList.map((s) => {
        const payables = payablesMap.get(s.id) ?? { total: 0, overdue: 0 };
        const initials = s.name
          .split(" ")
          .map((n) => n[0])
          .join("\n")
          .slice(0, 2);

        // Determine vendor type based on name
        let vendorType = "Supplier";
        if (s.name.toLowerCase().includes("bank")) vendorType = "Bank";
        else if (
          s.name.toLowerCase().includes("service") ||
          s.name.toLowerCase().includes("consult")
        )
          vendorType = "Service Provider";
        else if (
          s.name.toLowerCase().includes("transport") ||
          s.name.toLowerCase().includes("logistics")
        )
          vendorType = "Logistics";

        // Determine status
        let status = "Active";
        let statusColor = "emerald";
        if (!s.isActive) {
          status = "Inactive";
          statusColor = "slate";
        } else if (payables.overdue > 0) {
          status = "On Hold";
          statusColor = "amber";
        }

        return {
          id: s.id,
          name: s.name,
          vendorCode: `VEN-${s.id.slice(0, 4).toUpperCase()}`,
          vendorType,
          contactEmail: s.contactEmail,
          contactPhone: s.contactPhone,
          payables: payables.total,
          payablesFormatted: `GMD ${payables.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          overdue: payables.overdue,
          overdueFormatted:
            payables.overdue > 0
              ? `GMD ${payables.overdue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "0.00",
          paymentTerms: s.paymentTerms ?? "Net 30",
          is1099: s.is1099,
          status,
          statusColor,
          initials,
        };
      });

      return {
        vendors,
        totalCount,
        page: Math.floor(input.offset / input.limit) + 1,
        pageSize: input.limit,
        totalPages: Math.ceil(totalCount / input.limit),
      };
    }),

  // ── Tab Counts ──
  getVendorTabCounts: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const allResult = await db
      .select({ count: count() })
      .from(suppliers)
      .where(eq(suppliers.entityId, entityId));

    const activeResult = await db
      .select({ count: count() })
      .from(suppliers)
      .where(
        and(eq(suppliers.entityId, entityId), eq(suppliers.isActive, true)),
      );

    const inactiveResult = await db
      .select({ count: count() })
      .from(suppliers)
      .where(
        and(eq(suppliers.entityId, entityId), eq(suppliers.isActive, false)),
      );

    const onHoldResult = await db
      .select({ count: count() })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.entityId, entityId),
          eq(suppliers.isActive, true),
          sql`EXISTS (SELECT 1 FROM ${invoicesAp} WHERE ${invoicesAp.supplierId} = ${suppliers.id} AND ${invoicesAp.entityId} = ${entityId} AND ${invoicesAp.balance} > 0)`,
        ),
      );

    const v1099Result = await db
      .select({ count: count() })
      .from(suppliers)
      .where(and(eq(suppliers.entityId, entityId), eq(suppliers.is1099, true)));

    return {
      all: allResult[0]?.count ?? 0,
      active: activeResult[0]?.count ?? 0,
      inactive: inactiveResult[0]?.count ?? 0,
      onHold: onHoldResult[0]?.count ?? 0,
      vendors1099: v1099Result[0]?.count ?? 0,
    };
  }),

  // ── Vendor updates (status / 1099 / terms) ──
  updateVendor: rlsMutateProcedure
    .use(requirePermission("accounts_payable", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        contactEmail: z.string().optional(),
        contactPhone: z.string().optional(),
        paymentTerms: z.string().optional(),
        isActive: z.boolean().optional(),
        is1099: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(suppliers)
          .set(data)
          .where(
            and(eq(suppliers.id, id), eq(suppliers.entityId, ctx.entityId!)),
          )
          .returning();

        if (updated) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ap.updateVendor",
            entityType: "supplier",
            entityIdRef: updated.id,
            newValues: data,
          });
        }
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update vendor");
      }
    }),

  // ── Top Vendors by Payables ──
  getTopVendors: rlsProtectedProcedure
    .input(
      z.object({
        limit: z.number().default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const vendors = await db
        .select({
          name: suppliers.name,
          total: sum(invoicesAp.totalAmount),
        })
        .from(invoicesAp)
        .leftJoin(suppliers, eq(invoicesAp.supplierId, suppliers.id))
        .where(eq(invoicesAp.entityId, entityId))
        .groupBy(suppliers.name)
        .orderBy(desc(sum(invoicesAp.totalAmount)))
        .limit(input.limit);

      return vendors.map((v) => ({
        name: v.name ?? "Unknown",
        total: parseFloat(v.total ?? "0"),
        totalFormatted: `GMD ${parseFloat(v.total ?? "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      }));
    }),

  // ── Payment Terms Overview ──
  getPaymentTermsOverview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const vendors = await db.query.suppliers.findMany({
      where: eq(suppliers.entityId, entityId),
    });

    // Group by payment terms
    const termsMap = new Map<string, number>();
    for (const vendor of vendors) {
      const terms = vendor.paymentTerms ?? "Net 30";
      const existing = termsMap.get(terms) ?? 0;
      termsMap.set(terms, existing + 1);
    }

    const totalVendors = vendors.length;

    const terms = Array.from(termsMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percent:
          totalVendors > 0 ? Math.round((count / totalVendors) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      terms,
      totalVendors,
    };
  }),

  // ── Vendor Aging ──
  getVendorAging: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const now = new Date();
    const current30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const current60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const current90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get all unpaid invoices
    const unpaidInvoices = await db.query.invoicesAp.findMany({
      where: and(
        eq(invoicesAp.entityId, entityId),
        sql`${invoicesAp.balance} > 0`,
      ),
    });

    let current = 0;
    let days31_60 = 0;
    let days61_90 = 0;
    let days90Plus = 0;

    for (const invoice of unpaidInvoices) {
      const balance = parseFloat(invoice.balance);
      const dueDate = new Date(invoice.dueDate);

      if (dueDate >= current30) {
        current += balance;
      } else if (dueDate >= current60) {
        days31_60 += balance;
      } else if (dueDate >= current90) {
        days61_90 += balance;
      } else {
        days90Plus += balance;
      }
    }

    const total = current + days31_60 + days61_90 + days90Plus;

    return {
      aging: [
        {
          label: "Current (0-30 days)",
          amount: current,
          amountFormatted: `GMD ${current.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          percent: total > 0 ? Math.round((current / total) * 1000) / 10 : 0,
        },
        {
          label: "31-60 days",
          amount: days31_60,
          amountFormatted: `GMD ${days31_60.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          percent: total > 0 ? Math.round((days31_60 / total) * 1000) / 10 : 0,
        },
        {
          label: "61-90 days",
          amount: days61_90,
          amountFormatted: `GMD ${days61_90.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          percent: total > 0 ? Math.round((days61_90 / total) * 1000) / 10 : 0,
        },
        {
          label: "90+ days",
          amount: days90Plus,
          amountFormatted: `GMD ${days90Plus.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          percent: total > 0 ? Math.round((days90Plus / total) * 1000) / 10 : 0,
        },
      ],
      total,
      totalFormatted: `GMD ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    };
  }),

  // ── AI Insights ──
  getVendorAiInsights: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const insights: Array<{
      id: string;
      type: "warning" | "info" | "success";
      title: string;
      description: string;
      actionLabel: string;
    }> = [];

    // Check for overdue invoices
    const overdueResult = await db
      .select({ count: count(), total: sum(invoicesAp.balance) })
      .from(invoicesAp)
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          eq(invoicesAp.status, "overdue"),
        ),
      );

    if ((overdueResult[0]?.count ?? 0) > 0) {
      insights.push({
        id: "overdue-vendors",
        type: "warning",
        title: `${overdueResult[0].count} vendors have overdue invoices`,
        description: `Total overdue amount: GMD ${parseFloat(overdueResult[0].total ?? "0").toLocaleString()}`,
        actionLabel: "View overdue vendors",
      });
    }

    // Check for invoices due within 7 days
    const dueDate7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const dueSoonResult = await db
      .select({ count: count(), total: sum(invoicesAp.balance) })
      .from(invoicesAp)
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          lte(invoicesAp.dueDate, dueDate7.toISOString().split("T")[0]),
          gte(invoicesAp.dueDate, new Date().toISOString().split("T")[0]),
        ),
      );

    if ((dueSoonResult[0]?.count ?? 0) > 0) {
      insights.push({
        id: "due-soon",
        type: "info",
        title: `${dueSoonResult[0].count} invoices due within 7 days`,
        description: `Total amount: GMD ${parseFloat(dueSoonResult[0].total ?? "0").toLocaleString()}`,
        actionLabel: "View upcoming payments",
      });
    }

    // Payment optimization suggestion
    insights.push({
      id: "payment-optimization",
      type: "success",
      title: "Payment optimization",
      description: "You could save GMD 1,480 with early payments",
      actionLabel: "View recommendations",
    });

    return insights;
  }),

  // ── Suppliers ──
  listSuppliers: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.suppliers.findMany({
      where: eq(suppliers.entityId, ctx.entityId!),
      orderBy: [desc(suppliers.createdAt)],
      limit: 500,
    });
  }),

  createSupplier: rlsMutateProcedure
    .use(requirePermission("accounts_payable", "create"))
    .input(
      z.object({
        name: z.string().min(1),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        taxId: z.string().optional(),
        address: z.string().optional(),
        paymentTerms: z.string().default("net30"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [supplier] = await db
          .insert(suppliers)
          .values({ ...input, entityId: ctx.entityId! })
          .returning();

        if (supplier) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ap.createSupplier",
            entityType: "supplier",
            entityIdRef: supplier.id,
            newValues: {
              name: input.name,
              contactEmail: input.contactEmail,
              paymentTerms: input.paymentTerms,
            },
          });
        }

        return supplier;
      } catch (error) {
        handleMutationError(error, "Failed to create supplier");
      }
    }),

  updateSupplier: rlsMutateProcedure
    .use(requirePermission("accounts_payable", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        taxId: z.string().optional(),
        address: z.string().optional(),
        paymentTerms: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(suppliers)
          .set(data)
          .where(
            and(eq(suppliers.id, id), eq(suppliers.entityId, ctx.entityId!)),
          )
          .returning();
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update supplier");
      }
    }),

  getSupplierById: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return db.query.suppliers.findFirst({
        where: and(
          eq(suppliers.id, input.id),
          eq(suppliers.entityId, ctx.entityId!),
        ),
      });
    }),

  // ── Purchase Orders ──
  listPOs: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.purchaseOrders.findMany({
      where: eq(purchaseOrders.entityId, ctx.entityId!),
      orderBy: [desc(purchaseOrders.createdAt)],
    });
  }),

  createPO: rlsMutateProcedure
    .use(requirePermission("accounts_payable", "create"))
    .input(
      z.object({
        supplierId: z.string().uuid(),
        poNumber: z.string().min(1),
        orderDate: z.string(),
        expectedDate: z.string().optional(),
        currency: z.string().length(3).default("GMD"),
        notes: z.string().optional(),
        lines: z
          .array(
            z.object({
              description: z.string().min(1),
              accountId: z.string().uuid(),
              quantity: z.number().positive(),
              unitPrice: z.string(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { lines, ...poData } = input;

        let totalAmount = 0;
        for (const line of lines) {
          const qty = line.quantity;
          const price = parseFloat(line.unitPrice);
          totalAmount += qty * price;
        }

        return await db.transaction(async (tx) => {
          const [po] = await tx
            .insert(purchaseOrders)
            .values({
              ...poData,
              entityId: ctx.entityId!,
              totalAmount: totalAmount.toFixed(2),
              status: "draft",
            })
            .returning();

          if (!po) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          for (const line of lines) {
            const qty = line.quantity;
            const price = parseFloat(line.unitPrice);
            const amount = (qty * price).toFixed(2);

            await tx.insert(poLines).values({
              purchaseOrderId: po.id,
              accountId: line.accountId,
              description: line.description,
              quantity: qty.toFixed(2),
              unitPrice: line.unitPrice,
              amount,
            });
          }

          await tx.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ap.createPO",
            entityType: "purchase_order",
            entityIdRef: po.id,
            newValues: {
              supplierId: input.supplierId,
              poNumber: input.poNumber,
              totalAmount: totalAmount.toFixed(2),
              lineCount: lines.length,
            },
          });

          return po;
        });
      } catch (error) {
        handleMutationError(error, "Failed to create purchase order");
      }
    }),

  updatePO: rlsMutateProcedure
    .use(requirePermission("accounts_payable", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        supplierId: z.string().uuid().optional(),
        expectedDate: z.string().optional(),
        notes: z.string().optional(),
        status: z
          .enum([
            "draft",
            "submitted",
            "approved",
            "partial",
            "received",
            "cancelled",
          ])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(purchaseOrders)
          .set(data)
          .where(
            and(
              eq(purchaseOrders.id, id),
              eq(purchaseOrders.entityId, ctx.entityId!),
            ),
          )
          .returning();
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update purchase order");
      }
    }),

  getPOById: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const po = await db.query.purchaseOrders.findFirst({
        where: and(
          eq(purchaseOrders.id, input.id),
          eq(purchaseOrders.entityId, ctx.entityId!),
        ),
      });
      if (!po) return null;

      const lines = await db.query.poLines.findMany({
        where: eq(poLines.purchaseOrderId, po.id),
      });

      return { ...po, lines };
    }),

  approvePO: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [updated] = await db
          .update(purchaseOrders)
          .set({
            status: "approved",
            approvedAt: new Date(),
            approvedBy: ctx.session!.user!.id!,
          })
          .where(
            and(
              eq(purchaseOrders.id, input.id),
              eq(purchaseOrders.entityId, ctx.entityId!),
              eq(purchaseOrders.status, "draft"),
            ),
          )
          .returning();
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to approve purchase order");
      }
    }),

  // ── AP Invoices ──
  listInvoices: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.invoicesAp.findMany({
      where: eq(invoicesAp.entityId, ctx.entityId!),
      orderBy: [desc(invoicesAp.createdAt)],
    });
  }),

  createInvoice: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director", "accountant"))
    .input(
      z.object({
        supplierId: z.string().uuid(),
        invoiceNumber: z.string().min(1),
        invoiceDate: z.string(),
        dueDate: z.string(),
        currency: z.string().length(3).default("GMD"),
        notes: z.string().optional(),
        purchaseOrderId: z.string().uuid().optional(),
        lines: z
          .array(
            z.object({
              description: z.string().min(1),
              accountId: z.string().uuid(),
              quantity: z.number().positive(),
              unitPrice: z.string(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { lines, purchaseOrderId, ...invoiceData } = input;

        let totalAmount = 0;
        for (const line of lines) {
          const qty = line.quantity;
          const price = parseFloat(line.unitPrice);
          totalAmount += qty * price;
        }

        const trustResult = validateInvoice({
          entityId: ctx.entityId!,
          vendorId: input.supplierId,
          lines: lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: parseFloat(l.unitPrice),
            amount: l.quantity * parseFloat(l.unitPrice),
          })),
          subtotal: totalAmount,
          taxAmount: 0,
          totalAmount,
          currency: input.currency,
        });

        await logTrustGuardResult(
          ctx.entityId!,
          ctx.session!.user!.id!,
          "ap.createInvoice",
          trustResult,
        );

        if (!trustResult.passed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              trustGuardToError(trustResult) ?? "Invoice validation failed",
          });
        }

        return await db.transaction(async (tx) => {
          const [invoice] = await tx
            .insert(invoicesAp)
            .values({
              ...invoiceData,
              entityId: ctx.entityId!,
              purchaseOrderId: purchaseOrderId ?? null,
              totalAmount: totalAmount.toFixed(2),
              balance: totalAmount.toFixed(2),
              status: "pending",
            })
            .returning();

          if (!invoice) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          for (const line of lines) {
            const qty = line.quantity;
            const price = parseFloat(line.unitPrice);
            const amount = (qty * price).toFixed(2);

            await tx.insert(invoiceApLines).values({
              invoiceApId: invoice.id,
              accountId: line.accountId,
              description: line.description,
              quantity: qty.toFixed(2),
              unitPrice: line.unitPrice,
              amount,
            });
          }

          await tx.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ap.createInvoice",
            entityType: "invoice_ap",
            entityIdRef: invoice.id,
            newValues: {
              supplierId: input.supplierId,
              invoiceNumber: input.invoiceNumber,
              totalAmount: totalAmount.toFixed(2),
              dueDate: input.dueDate,
            },
          });

          return invoice;
        });
      } catch (error) {
        handleMutationError(error, "Failed to create invoice");
      }
    }),

  updateInvoice: rlsMutateProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        invoiceDate: z.string().optional(),
        dueDate: z.string().optional(),
        totalAmount: z.string().optional(),
        notes: z.string().optional(),
        status: z
          .enum(["pending", "partial", "paid", "overdue", "voided"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(invoicesAp)
          .set(data)
          .where(
            and(eq(invoicesAp.id, id), eq(invoicesAp.entityId, ctx.entityId!)),
          )
          .returning();

        if (updated && input.status === "overdue") {
          try {
            void dispatchWebhookEvent({
              entityId: ctx.entityId!,
              eventType: "invoice.overdue",
              data: {
                invoiceId: updated.id,
                invoiceNumber: updated.invoiceNumber,
                supplierId: updated.supplierId,
                totalAmount: updated.totalAmount,
                balance: updated.balance,
                dueDate: updated.dueDate,
              },
            });
          } catch (e) {
            logger.error(
              { err: e },
              "Failed to dispatch invoice.overdue webhook",
            );
          }
        }

        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update invoice");
      }
    }),

  getInvoiceById: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const invoice = await db.query.invoicesAp.findFirst({
        where: and(
          eq(invoicesAp.id, input.id),
          eq(invoicesAp.entityId, ctx.entityId!),
        ),
      });
      if (!invoice) return null;

      const lines = await db.query.invoiceApLines.findMany({
        where: eq(invoiceApLines.invoiceApId, invoice.id),
      });

      return { ...invoice, lines };
    }),

  // ── AP Payments ──
  listPayments: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.paymentsAp.findMany({
      where: eq(paymentsAp.entityId, ctx.entityId!),
      orderBy: [desc(paymentsAp.createdAt)],
    });
  }),

  createPayment: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        invoiceApId: z.string().uuid(),
        amount: z.string(),
        paymentDate: z.string(),
        method: z.enum([
          "bank_transfer",
          "cash",
          "mobile_money",
          "check",
          "card",
        ]),
        reference: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { invoiceApId, amount: paymentAmountStr, ...paymentData } = input;
        const paymentAmount = parseFloat(paymentAmountStr);

        const invoice = await db.query.invoicesAp.findFirst({
          where: and(
            eq(invoicesAp.id, invoiceApId),
            eq(invoicesAp.entityId, ctx.entityId!),
          ),
        });
        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invoice not found",
          });
        }

        const currentBalance = parseFloat(invoice.balance);
        if (paymentAmount > currentBalance) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Payment amount ${paymentAmountStr} exceeds invoice balance ${invoice.balance}`,
          });
        }

        return await db.transaction(async (tx) => {
          const [payment] = await tx
            .insert(paymentsAp)
            .values({
              ...paymentData,
              entityId: ctx.entityId!,
              invoiceApId,
              amount: paymentAmountStr,
            })
            .returning();

          const newBalance = currentBalance - paymentAmount;
          const newPaidAmount = parseFloat(invoice.paidAmount) + paymentAmount;
          const newStatus = newBalance <= 0 ? "paid" : "partial";

          await tx
            .update(invoicesAp)
            .set({
              paidAmount: newPaidAmount.toFixed(2),
              balance: Math.max(newBalance, 0).toFixed(2),
              status: newStatus,
            })
            .where(
              and(
                eq(invoicesAp.id, invoiceApId),
                eq(invoicesAp.entityId, ctx.entityId!),
              ),
            );

          await tx.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ap.createPayment",
            entityType: "payment_ap",
            entityIdRef: payment.id,
            newValues: {
              invoiceApId,
              amount: paymentAmountStr,
              method: input.method,
              reference: input.reference,
            },
          });

          // Send email notification (non-blocking)
          if (invoice) {
            const supplier = await tx.query.suppliers.findFirst({
              where: and(
                eq(suppliers.id, invoice.supplierId),
                eq(suppliers.entityId, ctx.entityId!),
              ),
            });
            if (supplier && supplier.contactEmail) {
              getEnrichedEntityContext(ctx.entityId!)
                .then((entityCtx) => {
                  sendPaymentSentEmail(supplier.contactEmail!, {
                    supplierName: supplier.name,
                    invoiceNumber: invoice.invoiceNumber,
                    amount: paymentAmountStr,
                    currency: invoice.currency,
                    paymentMethod: input.method,
                    reference: input.reference,
                    entityName: entityCtx.entityName,
                  }).catch((e) =>
                    logger.error({ err: e }, "Failed to send payment email"),
                  );
                })
                .catch((e) =>
                  logger.error(
                    { err: e },
                    "Failed to send payment notification",
                  ),
                );
            }
          }

          // Fire-and-forget webhook dispatch
          try {
            void dispatchWebhookEvent({
              entityId: ctx.entityId!,
              eventType: "invoice.paid",
              data: {
                invoiceId: invoiceApId,
                invoiceNumber: invoice.invoiceNumber,
                amount: paymentAmountStr,
                method: input.method,
                reference: input.reference,
                newStatus,
              },
            });
          } catch (e) {
            logger.error({ err: e }, "Failed to dispatch invoice.paid webhook");
          }

          return payment;
        });
      } catch (error) {
        handleMutationError(error, "Failed to create payment");
      }
    }),

  // ── Delete Procedures ──

  deleteSupplier: rlsMutateProcedure
    .use(requirePermission("accounts_payable", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [existing] = await db
          .select()
          .from(suppliers)
          .where(
            and(
              eq(suppliers.id, input.id),
              eq(suppliers.entityId, ctx.entityId!),
            ),
          )
          .limit(1);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Supplier not found",
          });

        await db.delete(suppliers).where(eq(suppliers.id, input.id));

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "ap.deleteSupplier",
          entityType: "supplier",
          entityIdRef: input.id,
          oldValues: { name: existing.name },
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete supplier");
      }
    }),

  deletePO: rlsMutateProcedure
    .use(requirePermission("accounts_payable", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [existing] = await db
          .select()
          .from(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.id, input.id),
              eq(purchaseOrders.entityId, ctx.entityId!),
            ),
          )
          .limit(1);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase order not found",
          });

        if (existing.status === "approved") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete an approved or closed purchase order",
          });
        }

        await db.transaction(async (tx) => {
          await tx.delete(poLines).where(eq(poLines.purchaseOrderId, input.id));
          await tx
            .delete(purchaseOrders)
            .where(eq(purchaseOrders.id, input.id));

          await tx.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ap.deletePO",
            entityType: "purchase_order",
            entityIdRef: input.id,
            oldValues: {
              poNumber: existing.poNumber,
              supplierId: existing.supplierId,
            },
          });
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete purchase order");
      }
    }),

  deleteInvoice: rlsMutateProcedure
    .use(requirePermission("accounts_payable", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [existing] = await db
          .select()
          .from(invoicesAp)
          .where(
            and(
              eq(invoicesAp.id, input.id),
              eq(invoicesAp.entityId, ctx.entityId!),
            ),
          )
          .limit(1);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invoice not found",
          });

        if (existing.status === "paid") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete a paid or posted invoice",
          });
        }

        await db.transaction(async (tx) => {
          await tx
            .delete(invoiceApLines)
            .where(eq(invoiceApLines.invoiceApId, input.id));
          await tx.delete(invoicesAp).where(eq(invoicesAp.id, input.id));

          await tx.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ap.deleteInvoice",
            entityType: "invoice_ap",
            entityIdRef: input.id,
            oldValues: {
              invoiceNumber: existing.invoiceNumber,
              supplierId: existing.supplierId,
            },
          });
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete invoice");
      }
    }),

  deletePayment: rlsMutateProcedure
    .use(requirePermission("accounts_payable", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [existing] = await db
          .select()
          .from(paymentsAp)
          .where(
            and(
              eq(paymentsAp.id, input.id),
              eq(paymentsAp.entityId, ctx.entityId!),
            ),
          )
          .limit(1);
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payment not found",
          });

        await db.delete(paymentsAp).where(eq(paymentsAp.id, input.id));

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "ap.deletePayment",
          entityType: "payment_ap",
          entityIdRef: input.id,
          oldValues: {
            invoiceApId: existing.invoiceApId,
            amount: existing.amount,
          },
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete payment");
      }
    }),
});

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Name-keyword patterns used both to derive vendorType in the response and
 * to filter by it, so the filter and the badge always agree.
 */
function vendorTypePatterns(vendorType: string): string[] | null {
  switch (vendorType) {
    case "Bank":
      return ["bank"];
    case "Service Provider":
      return ["service", "consult"];
    case "Logistics":
      return ["transport", "logistics"];
    default:
      return null;
  }
}
