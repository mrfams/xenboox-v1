// @ts-nocheck

import { z } from "zod"
import { eq, and, desc } from "drizzle-orm"
import { router, protectedProcedure, mutateProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import {
  customers,
  salesInvoices,
  salesInvoiceLines,
  paymentsAr,
  auditLog,
} from "@xenboox/db/schema"
import { TRPCError } from "@trpc/server"
import { sendPaymentReceivedEmail } from "@/lib/email"

// ─── AR Router ───────────────────────────────────────────────────────────────

export const arRouter = router({
  // ── Customers ──
  listCustomers: protectedProcedure.query(({ ctx }) => {
    return db.query.customers.findMany({
      where: eq(customers.entityId, ctx.entityId!),
      orderBy: [desc(customers.createdAt)],
    })
  }),

  createCustomer: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        taxId: z.string().optional(),
        address: z.string().optional(),
        paymentTerms: z.string().default("net30"),
        creditLimit: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [customer] = await db
          .insert(customers)
          .values({ ...input, entityId: ctx.entityId! })
          .returning()

        if (customer) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ar.createCustomer",
            entityType: "customer",
            entityIdRef: customer.id,
            newValues: { name: input.name, contactEmail: input.contactEmail, paymentTerms: input.paymentTerms, creditLimit: input.creditLimit },
          })
        }

        return customer
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create customer" })
      }
    }),

  updateCustomer: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        taxId: z.string().optional(),
        address: z.string().optional(),
        paymentTerms: z.string().optional(),
        creditLimit: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const [updated] = await db
        .update(customers)
        .set(data)
        .where(and(eq(customers.id, id), eq(customers.entityId, ctx.entityId!)))
        .returning()
      return updated
    }),

  getCustomerById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return db.query.customers.findFirst({
        where: and(eq(customers.id, input.id), eq(customers.entityId, ctx.entityId!)),
      })
    }),

  // ── Sales Invoices ──
  listInvoices: protectedProcedure.query(({ ctx }) => {
    return db.query.salesInvoices.findMany({
      where: eq(salesInvoices.entityId, ctx.entityId!),
      orderBy: [desc(salesInvoices.createdAt)],
    })
  }),

  createInvoice: mutateProcedure
    .input(
      z.object({
        customerId: z.string().uuid(),
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
          .insert(salesInvoices)
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

          await tx.insert(salesInvoiceLines).values({
            salesInvoiceId: invoice.id,
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
          action: "ar.createInvoice",
          entityType: "sales_invoice",
          entityIdRef: invoice.id,
          newValues: { customerId: input.customerId, invoiceNumber: input.invoiceNumber, totalAmount: totalAmount.toFixed(2), dueDate: input.dueDate },
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
        .update(salesInvoices)
        .set(data)
        .where(and(eq(salesInvoices.id, id), eq(salesInvoices.entityId, ctx.entityId!)))
        .returning()
      return updated
    }),

  getInvoiceById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const invoice = await db.query.salesInvoices.findFirst({
        where: and(eq(salesInvoices.id, input.id), eq(salesInvoices.entityId, ctx.entityId!)),
      })
      if (!invoice) return null

      const lines = await db.query.salesInvoiceLines.findMany({
        where: eq(salesInvoiceLines.salesInvoiceId, invoice.id),
      })

      return { ...invoice, lines }
    }),

  // ── AR Payments ──
  listPayments: protectedProcedure.query(({ ctx }) => {
    return db.query.paymentsAr.findMany({
      where: eq(paymentsAr.entityId, ctx.entityId!),
      orderBy: [desc(paymentsAr.createdAt)],
    })
  }),

  createPayment: mutateProcedure
    .input(
      z.object({
        salesInvoiceId: z.string().uuid(),
        amount: z.string(),
        paymentDate: z.string(),
        method: z.enum(["bank_transfer", "cash", "mobile_money", "check", "card"]),
        reference: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { salesInvoiceId, amount: paymentAmountStr, ...paymentData } = input
      const paymentAmount = parseFloat(paymentAmountStr)

      const invoice = await db.query.salesInvoices.findFirst({
        where: eq(salesInvoices.id, salesInvoiceId),
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
          .insert(paymentsAr)
          .values({
            ...paymentData,
            entityId: ctx.entityId!,
            salesInvoiceId,
            amount: paymentAmountStr,
          })
          .returning()

        const newBalance = currentBalance - paymentAmount
        const newPaidAmount = parseFloat(invoice.paidAmount) + paymentAmount
        const newStatus = newBalance <= 0 ? "paid" : "partial"

        await tx
          .update(salesInvoices)
          .set({
            paidAmount: newPaidAmount.toFixed(2),
            balance: Math.max(newBalance, 0).toFixed(2),
            status: newStatus,
          })
          .where(eq(salesInvoices.id, salesInvoiceId))

        await tx.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "ar.createPayment",
          entityType: "payment_ar",
          entityIdRef: payment.id,
          newValues: { salesInvoiceId, amount: paymentAmountStr, method: input.method, reference: input.reference },
        })

        // Send email notification (non-blocking)
        if (invoice) {
          const customer = await tx.query.customers.findFirst({
            where: eq(customers.id, invoice.customerId),
          })
          if (customer?.contactEmail) {
            sendPaymentReceivedEmail(customer.contactEmail, {
              customerName: customer.name,
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
