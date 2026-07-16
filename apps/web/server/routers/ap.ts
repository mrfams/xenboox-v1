// @ts-nocheck

import { z } from "zod"
import { eq, and, desc } from "drizzle-orm"
import { router, protectedProcedure, mutateProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import {
  suppliers,
  purchaseOrders,
  poLines,
  invoicesAp,
  invoiceApLines,
  paymentsAp,
  auditLog,
} from "@xenboox/db/schema"
import { TRPCError } from "@trpc/server"
import { sendPaymentSentEmail } from "@/lib/email"

// ─── AP Router ───────────────────────────────────────────────────────────────

export const apRouter = router({
  // ── Suppliers ──
  listSuppliers: protectedProcedure.query(({ ctx }) => {
    return db.query.suppliers.findMany({
      where: eq(suppliers.entityId, ctx.entityId!),
      orderBy: [desc(suppliers.createdAt)],
    })
  }),

  createSupplier: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        taxId: z.string().optional(),
        address: z.string().optional(),
        paymentTerms: z.string().default("net30"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [supplier] = await db
          .insert(suppliers)
          .values({ ...input, entityId: ctx.entityId! })
          .returning()

        if (supplier) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ap.createSupplier",
            entityType: "supplier",
            entityIdRef: supplier.id,
            newValues: { name: input.name, contactEmail: input.contactEmail, paymentTerms: input.paymentTerms },
          })
        }

        return supplier
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create supplier" })
      }
    }),

  updateSupplier: protectedProcedure
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const [updated] = await db
        .update(suppliers)
        .set(data)
        .where(and(eq(suppliers.id, id), eq(suppliers.entityId, ctx.entityId!)))
        .returning()
      return updated
    }),

  getSupplierById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return db.query.suppliers.findFirst({
        where: and(eq(suppliers.id, input.id), eq(suppliers.entityId, ctx.entityId!)),
      })
    }),

  // ── Purchase Orders ──
  listPOs: protectedProcedure.query(({ ctx }) => {
    return db.query.purchaseOrders.findMany({
      where: eq(purchaseOrders.entityId, ctx.entityId!),
      orderBy: [desc(purchaseOrders.createdAt)],
    })
  }),

  createPO: protectedProcedure
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
            })
          )
          .min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { lines, ...poData } = input

      let totalAmount = 0
      for (const line of lines) {
        const qty = line.quantity
        const price = parseFloat(line.unitPrice)
        totalAmount += qty * price
      }

      return db.transaction(async (tx) => {
        const [po] = await tx
          .insert(purchaseOrders)
          .values({
            ...poData,
            entityId: ctx.entityId!,
            totalAmount: totalAmount.toFixed(2),
            status: "draft",
          })
          .returning()

        if (!po) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })

        for (const line of lines) {
          const qty = line.quantity
          const price = parseFloat(line.unitPrice)
          const amount = (qty * price).toFixed(2)

          await tx.insert(poLines).values({
            purchaseOrderId: po.id,
            accountId: line.accountId,
            description: line.description,
            quantity: qty.toFixed(2),
            unitPrice: line.unitPrice,
            amount,
          })
        }

        await tx.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "ap.createPO",
          entityType: "purchase_order",
          entityIdRef: po.id,
          newValues: { supplierId: input.supplierId, poNumber: input.poNumber, totalAmount: totalAmount.toFixed(2), lineCount: lines.length },
        })

        return po
      })
    }),

  updatePO: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        expectedDate: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["draft", "submitted", "approved", "partial", "received", "cancelled"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const [updated] = await db
        .update(purchaseOrders)
        .set(data)
        .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.entityId, ctx.entityId!)))
        .returning()
      return updated
    }),

  getPOById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const po = await db.query.purchaseOrders.findFirst({
        where: and(eq(purchaseOrders.id, input.id), eq(purchaseOrders.entityId, ctx.entityId!)),
      })
      if (!po) return null

      const lines = await db.query.poLines.findMany({
        where: eq(poLines.purchaseOrderId, po.id),
      })

      return { ...po, lines }
    }),

  approvePO: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
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
            eq(purchaseOrders.status, "draft")
          )
        )
        .returning()
      return updated
    }),

  // ── AP Invoices ──
  listInvoices: protectedProcedure.query(({ ctx }) => {
    return db.query.invoicesAp.findMany({
      where: eq(invoicesAp.entityId, ctx.entityId!),
      orderBy: [desc(invoicesAp.createdAt)],
    })
  }),

  createInvoice: mutateProcedure
    .input(
      z.object({
        supplierId: z.string().uuid(),
        purchaseOrderId: z.string().uuid().optional(),
        invoiceNumber: z.string().min(1),
        invoiceDate: z.string(),
        dueDate: z.string(),
        currency: z.string().length(3).default("GMD"),
        notes: z.string().optional(),
        lines: z
          .array(
            z.object({
              description: z.string().min(1),
              accountId: z.string().uuid(),
              quantity: z.number().positive(),
              unitPrice: z.string(),
            })
          )
          .min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { lines, ...invoiceData } = input

      let totalAmount = 0
      for (const line of lines) {
        const qty = line.quantity
        const price = parseFloat(line.unitPrice)
        totalAmount += qty * price
      }

      return db.transaction(async (tx) => {
        const [invoice] = await tx
          .insert(invoicesAp)
          .values({
            ...invoiceData,
            entityId: ctx.entityId!,
            totalAmount: totalAmount.toFixed(2),
            balance: totalAmount.toFixed(2),
            status: "pending",
          })
          .returning()

        if (!invoice) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })

        for (const line of lines) {
          const qty = line.quantity
          const price = parseFloat(line.unitPrice)
          const amount = (qty * price).toFixed(2)

          await tx.insert(invoiceApLines).values({
            invoiceApId: invoice.id,
            accountId: line.accountId,
            description: line.description,
            quantity: qty.toFixed(2),
            unitPrice: line.unitPrice,
            amount,
          })
        }

        await tx.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "ap.createInvoice",
          entityType: "invoice_ap",
          entityIdRef: invoice.id,
          newValues: { supplierId: input.supplierId, invoiceNumber: input.invoiceNumber, totalAmount: totalAmount.toFixed(2), dueDate: input.dueDate },
        })

        return invoice
      })
    }),

  updateInvoice: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        dueDate: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["pending", "partial", "paid", "overdue", "voided"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const [updated] = await db
        .update(invoicesAp)
        .set(data)
        .where(and(eq(invoicesAp.id, id), eq(invoicesAp.entityId, ctx.entityId!)))
        .returning()
      return updated
    }),

  getInvoiceById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const invoice = await db.query.invoicesAp.findFirst({
        where: and(eq(invoicesAp.id, input.id), eq(invoicesAp.entityId, ctx.entityId!)),
      })
      if (!invoice) return null

      const lines = await db.query.invoiceApLines.findMany({
        where: eq(invoiceApLines.invoiceApId, invoice.id),
      })

      return { ...invoice, lines }
    }),

  // ── AP Payments ──
  listPayments: protectedProcedure.query(({ ctx }) => {
    return db.query.paymentsAp.findMany({
      where: eq(paymentsAp.entityId, ctx.entityId!),
      orderBy: [desc(paymentsAp.createdAt)],
    })
  }),

  createPayment: mutateProcedure
    .input(
      z.object({
        invoiceApId: z.string().uuid(),
        amount: z.string(),
        paymentDate: z.string(),
        method: z.enum(["bank_transfer", "cash", "mobile_money", "check", "card"]),
        reference: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { invoiceApId, amount: paymentAmountStr, ...paymentData } = input
      const paymentAmount = parseFloat(paymentAmountStr)

      const invoice = await db.query.invoicesAp.findFirst({
        where: eq(invoicesAp.id, invoiceApId),
      })
      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" })
      }

      const currentBalance = parseFloat(invoice.balance)
      if (paymentAmount > currentBalance) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Payment amount ${paymentAmountStr} exceeds invoice balance ${invoice.balance}`,
        })
      }

      return db.transaction(async (tx) => {
        const [payment] = await tx
          .insert(paymentsAp)
          .values({
            ...paymentData,
            entityId: ctx.entityId!,
            invoiceApId,
            amount: paymentAmountStr,
          })
          .returning()

        const newBalance = currentBalance - paymentAmount
        const newPaidAmount = parseFloat(invoice.paidAmount) + paymentAmount
        const newStatus = newBalance <= 0 ? "paid" : "partial"

        await tx
          .update(invoicesAp)
          .set({
            paidAmount: newPaidAmount.toFixed(2),
            balance: Math.max(newBalance, 0).toFixed(2),
            status: newStatus,
          })
          .where(eq(invoicesAp.id, invoiceApId))

        await tx.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "ap.createPayment",
          entityType: "payment_ap",
          entityIdRef: payment.id,
          newValues: { invoiceApId, amount: paymentAmountStr, method: input.method, reference: input.reference },
        })

        // Send email notification (non-blocking)
        if (invoice) {
          const supplier = await tx.query.suppliers.findFirst({
            where: eq(suppliers.id, invoice.supplierId),
          })
          if (supplier?.contactEmail) {
            sendPaymentSentEmail(supplier.contactEmail, {
              supplierName: supplier.name,
              invoiceNumber: invoice.invoiceNumber,
              amount: paymentAmountStr,
              currency: invoice.currency,
              paymentMethod: input.method,
              reference: input.reference,
              entityName: "Xenboox",
            }).catch(console.error)
          }
        }

        return payment
      })
    }),
})
