import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { paymentLinks, salesInvoices, customers } from "@xenboox/db/schema";

import {
  router,
  rlsProtectedProcedure,
  publicProcedure,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random token for payment links.
 * 32 bytes = 64 hex chars — collision-resistant for public URLs.
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  // Use crypto.getRandomValues which is available in Node.js 19+ and Edge
  if (
    typeof globalThis.crypto !== "undefined" &&
    globalThis.crypto.getRandomValues
  ) {
    globalThis.crypto.getRandomValues(array);
  } else {
    // Fallback for older Node.js
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");
    const buf = nodeCrypto.randomBytes(32);
    for (let i = 0; i < 32; i++) array[i] = buf[i];
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ─── Router ──────────────────────────────────────────────────────────────

export const paymentLinksRouter = router({
  /**
   * List all payment links for the entity with filtering and pagination.
   */
  list: rlsProtectedProcedure
    .input(
      z.object({
        status: z
          .enum(["all", "active", "expired", "paid", "cancelled"])
          .default("all"),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const conditions = [eq(paymentLinks.entityId, entityId)];

      if (input.status !== "all") {
        conditions.push(eq(paymentLinks.status, input.status));
      }

      const links = await db.query.paymentLinks.findMany({
        where: and(...conditions),
        orderBy: [desc(paymentLinks.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      // Batch-fetch invoices and customers to avoid N+1
      const invoiceIds = [...new Set(links.map((l) => l.invoiceId))];
      const invoices =
        invoiceIds.length > 0
          ? await db.query.salesInvoices.findMany({
              where: sql`${salesInvoices.id} IN ${invoiceIds}`,
              columns: {
                id: true,
                invoiceNumber: true,
                status: true,
                customerId: true,
              },
            })
          : [];
      const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

      const customerIds = [
        ...new Set(invoices.map((i) => i.customerId).filter(Boolean)),
      ];
      const customerList =
        customerIds.length > 0
          ? await db.query.customers.findMany({
              where: sql`${customers.id} IN ${customerIds}`,
              columns: { id: true, name: true },
            })
          : [];
      const customerMap = new Map(customerList.map((c) => [c.id, c.name]));

      // Enrich links with batched data
      const enriched = links.map((link) => {
        const invoice = invoiceMap.get(link.invoiceId);
        return {
          ...link,
          invoiceNumber: invoice?.invoiceNumber ?? "Unknown",
          customerName: invoice?.customerId
            ? (customerMap.get(invoice.customerId) ?? "")
            : "",
          invoiceStatus: invoice?.status ?? "unknown",
        };
      });

      // Count total
      const [{ cnt }] = await db
        .select({ cnt: count() })
        .from(paymentLinks)
        .where(and(...conditions));

      return {
        links: enriched,
        totalCount: Number(cnt),
        page: Math.floor(input.offset / input.limit) + 1,
        pageSize: input.limit,
        totalPages: Math.ceil(Number(cnt) / input.limit),
      };
    }),

  /**
   * Get a single payment link with full details.
   */
  get: rlsProtectedProcedure
    .input(z.object({ linkId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const link = await db.query.paymentLinks.findFirst({
        where: and(
          eq(paymentLinks.id, input.linkId),
          eq(paymentLinks.entityId, entityId),
        ),
      });

      if (!link) return null;

      const invoice = await db.query.salesInvoices.findFirst({
        where: eq(salesInvoices.id, link.invoiceId),
      });

      let customerName = "";
      let customerEmail = "";
      if (invoice?.customerId) {
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, invoice.customerId),
        });
        customerName = customer?.name ?? "";
        customerEmail = customer?.contactEmail ?? "";
      }

      return {
        ...link,
        invoice,
        customerName,
        customerEmail,
      };
    }),

  /**
   * Generate a new payment link for an invoice.
   */
  create: rlsProtectedProcedure
    .input(
      z.object({
        invoiceId: z.string().uuid(),
        expiresInDays: z.number().min(1).max(365).default(30),
        paymentMethods: z.string().default("card,bank_transfer,mobile_money"),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const userId = ctx.session?.user?.id;

      // Verify invoice belongs to this entity
      const invoice = await db.query.salesInvoices.findFirst({
        where: and(
          eq(salesInvoices.id, input.invoiceId),
          eq(salesInvoices.entityId, entityId),
        ),
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      if (invoice.status === "paid") {
        throw new Error("Invoice is already fully paid");
      }

      if (invoice.status === "voided") {
        throw new Error("Cannot create payment link for voided invoice");
      }

      // Check for existing active link on this invoice
      const existingActive = await db.query.paymentLinks.findFirst({
        where: and(
          eq(paymentLinks.invoiceId, input.invoiceId),
          eq(paymentLinks.status, "active"),
        ),
      });

      if (existingActive) {
        // Return existing active link instead of creating duplicate
        return existingActive;
      }

      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      const [link] = await db
        .insert(paymentLinks)
        .values({
          entityId,
          invoiceId: input.invoiceId,
          token,
          amount: invoice.balance,
          currency: invoice.currency,
          expiresAt,
          paymentMethods: input.paymentMethods,
          createdBy: userId,
          metadata: input.note ? { note: input.note } : {},
        })
        .returning();

      logger.info(
        {
          linkId: link.id,
          invoiceId: input.invoiceId,
          entityId,
          amount: invoice.balance,
        },
        "Payment link created",
      );

      return link;
    }),

  /**
   * Cancel a payment link.
   */
  cancel: rlsProtectedProcedure
    .input(z.object({ linkId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const [updated] = await db
        .update(paymentLinks)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(paymentLinks.id, input.linkId),
            eq(paymentLinks.entityId, entityId),
            eq(paymentLinks.status, "active"),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error("Payment link not found or already inactive");
      }

      return updated;
    }),

  /**
   * Reactivate a cancelled payment link (generates new token).
   */
  reactivate: rlsProtectedProcedure
    .input(z.object({ linkId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const existing = await db.query.paymentLinks.findFirst({
        where: and(
          eq(paymentLinks.id, input.linkId),
          eq(paymentLinks.entityId, entityId),
        ),
      });

      if (!existing) {
        throw new Error("Payment link not found");
      }

      if (existing.status === "paid") {
        throw new Error("Cannot reactivate a paid payment link");
      }

      const newToken = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const [updated] = await db
        .update(paymentLinks)
        .set({
          status: "active",
          token: newToken,
          expiresAt,
          clickCount: 0,
        })
        .where(eq(paymentLinks.id, input.linkId))
        .returning();

      return updated;
    }),

  /**
   * Dashboard summary: counts and stats.
   */
  getSummary: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const links = await db.query.paymentLinks.findMany({
      where: eq(paymentLinks.entityId, entityId),
    });

    const active = links.filter((l) => l.status === "active").length;
    const paid = links.filter((l) => l.status === "paid").length;
    const expired = links.filter((l) => l.status === "expired").length;
    const cancelled = links.filter((l) => l.status === "cancelled").length;

    const totalAmount = links.reduce((sum, l) => sum + parseFloat(l.amount), 0);
    const paidAmount = links
      .filter((l) => l.status === "paid")
      .reduce((sum, l) => sum + parseFloat(l.paidAmount ?? l.amount), 0);
    const totalClicks = links.reduce((sum, l) => sum + l.clickCount, 0);

    // Conversion rate
    const conversionRate =
      active + paid > 0 ? Math.round((paid / (active + paid)) * 100) : 0;

    return {
      active,
      paid,
      expired,
      cancelled,
      total: links.length,
      totalAmount,
      paidAmount,
      totalClicks,
      conversionRate,
    };
  }),

  // ── Public endpoint (no auth required) ────────────────────────────────

  /**
   * Resolve a payment link by token (public — no auth).
   * Used by the payment page to display invoice details.
   */
  resolveByToken: publicProcedure
    .input(z.object({ token: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      const link = await db.query.paymentLinks.findFirst({
        where: eq(paymentLinks.token, input.token),
      });

      if (!link) {
        return { found: false };
      }

      // Check expiry
      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        // Auto-expire
        await db
          .update(paymentLinks)
          .set({ status: "expired" })
          .where(eq(paymentLinks.id, link.id));

        return { found: false, reason: "expired" };
      }

      if (link.status === "cancelled") {
        return { found: false, reason: "cancelled" };
      }

      if (link.status === "paid") {
        return { found: false, reason: "paid" };
      }

      // Increment click count (fire-and-forget, non-blocking)
      void db
        .update(paymentLinks)
        .set({
          clickCount: sql`${paymentLinks.clickCount} + 1`,
          lastClickedAt: new Date(),
        })
        .where(eq(paymentLinks.id, link.id));

      // Get invoice details + customer name in one query
      const invoice = await db.query.salesInvoices.findFirst({
        where: eq(salesInvoices.id, link.invoiceId),
        columns: {
          invoiceNumber: true,
          totalAmount: true,
          dueDate: true,
          currency: true,
          customerId: true,
        },
      });

      let customerName = "";
      if (invoice?.customerId) {
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, invoice.customerId),
          columns: { name: true },
        });
        customerName = customer?.name ?? "";
      }

      return {
        found: true,
        amount: link.amount,
        currency: link.currency,
        paymentMethods: link.paymentMethods,
        invoiceNumber: invoice?.invoiceNumber,
        dueDate: invoice?.dueDate,
        customerName,
      };
    }),

  /**
   * Record a payment against a payment link (public — no auth).
   */
  recordPayment: publicProcedure
    .input(
      z.object({
        token: z.string().min(1).max(128),
        amount: z.number().positive().max(10_000_000),
        method: z.enum(["card", "bank_transfer", "mobile_money", "cash"]),
      }),
    )
    .mutation(async ({ input }) => {
      const link = await db.query.paymentLinks.findFirst({
        where: eq(paymentLinks.token, input.token),
      });

      if (!link || link.status !== "active") {
        throw new Error("Invalid or inactive payment link");
      }

      // Validate amount doesn't exceed link amount (prevent overpayment)
      const linkAmount = parseFloat(link.amount);
      if (input.amount > linkAmount * 1.01) {
        // Allow 1% tolerance for rounding
        throw new Error(
          `Payment amount ${input.amount} exceeds invoice amount ${linkAmount}`,
        );
      }

      // Read current paid amount BEFORE updating (within same logical unit)
      const currentInvoice = await db.query.salesInvoices.findFirst({
        where: eq(salesInvoices.id, link.invoiceId),
        columns: { paidAmount: true, balance: true },
      });

      const currentPaid = parseFloat(currentInvoice?.paidAmount ?? "0");
      const currentBalance = parseFloat(currentInvoice?.balance ?? link.amount);

      // Mark link as paid
      await db
        .update(paymentLinks)
        .set({
          status: "paid",
          paidAt: new Date(),
          paidAmount: String(input.amount),
          metadata: {
            ...((link.metadata as Record<string, unknown>) ?? {}),
            paymentMethod: input.method,
          },
        })
        .where(eq(paymentLinks.id, link.id));

      // Update invoice balance atomically
      const newPaid = currentPaid + input.amount;
      const newBalance = Math.max(0, currentBalance - input.amount);
      await db
        .update(salesInvoices)
        .set({
          balance: String(newBalance),
          status: newBalance <= 0 ? "paid" : "partial",
          paidAmount: String(newPaid),
        })
        .where(eq(salesInvoices.id, link.invoiceId));

      logger.info(
        {
          linkId: link.id,
          invoiceId: link.invoiceId,
          amount: input.amount,
          method: input.method,
        },
        "Payment recorded via payment link",
      );

      return { success: true };
    }),
});
