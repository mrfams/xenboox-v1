// @ts-nocheck

import { z } from "zod"
import { eq, and, desc } from "drizzle-orm"
import { router, protectedProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import {
  cashAccounts,
  imprestFloats,
  imprestReceipts,
  pettyCashLedger,
} from "@xenboox/db/schema"
import { auditLog } from "@xenboox/db/schema/documents"
import { TRPCError } from "@trpc/server"

// ─── Cash Router ─────────────────────────────────────────────────────────────

export const cashRouter = router({
  // ── Cash Accounts ──
  listCashAccounts: protectedProcedure.query(({ ctx }) => {
    return db.query.cashAccounts.findMany({
      where: eq(cashAccounts.entityId, ctx.entityId!),
      orderBy: [desc(cashAccounts.createdAt)],
    })
  }),

  createCashAccount: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        currency: z.string().length(3).default("GMD"),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [cashAccount] = await db
          .insert(cashAccounts)
          .values({ ...input, entityId: ctx.entityId! })
          .returning()
        if (!cashAccount) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create cash account" })
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "cash_account.create",
          entityType: "cash_account",
          entityIdRef: cashAccount.id,
          newValues: { name: input.name, currency: input.currency, isActive: input.isActive },
        })

        return cashAccount
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create cash account" })
      }
    }),

  updateCashAccount: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      const [updated] = await db
        .update(cashAccounts)
        .set(data)
        .where(eq(cashAccounts.id, id))
        .returning()
      return updated
    }),

  // ── Imprest Floats ──
  listImprestFloats: protectedProcedure.query(({ ctx }) => {
    return db.query.imprestFloats.findMany({
      where: eq(imprestFloats.entityId, ctx.entityId!),
      orderBy: [desc(imprestFloats.createdAt)],
    })
  }),

  createImprestFloat: protectedProcedure
    .input(
      z.object({
        cashAccountId: z.string().uuid(),
        assigneeName: z.string().min(1),
        purpose: z.string().optional(),
        amount: z.string(),
        issuedDate: z.string(),
        settleByDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [float] = await db
          .insert(imprestFloats)
          .values({
            ...input,
            entityId: ctx.entityId!,
            remainingBalance: input.amount,
            status: "active",
          })
          .returning()
        if (!float) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create imprest float" })
        }
        return float
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create imprest float" })
      }
    }),

  getImprestFloatById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const float = await db.query.imprestFloats.findFirst({
        where: eq(imprestFloats.id, input.id),
      })
      if (!float) return null

      const receipts = await db.query.imprestReceipts.findMany({
        where: eq(imprestReceipts.imprestFloatId, float.id),
      })

      return { ...float, receipts }
    }),

  addImprestReceipt: protectedProcedure
    .input(
      z.object({
        imprestFloatId: z.string().uuid(),
        description: z.string().min(1),
        amount: z.string(),
        receiptDate: z.string(),
        documentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { imprestFloatId, amount: amountStr, ...receiptData } = input
      const amount = parseFloat(amountStr)

      const float = await db.query.imprestFloats.findFirst({
        where: eq(imprestFloats.id, imprestFloatId),
      })
      if (!float) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Imprest float not found" })
      }

      const currentBalance = parseFloat(float.remainingBalance)
      if (amount > currentBalance) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Receipt amount ${amountStr} exceeds remaining balance ${float.remainingBalance}`,
        })
      }

      return db.transaction(async (tx) => {
        const [receipt] = await tx
          .insert(imprestReceipts)
          .values({
            ...receiptData,
            imprestFloatId,
            amount: amountStr,
          })
          .returning()

        const newBalance = currentBalance - amount
        await tx
          .update(imprestFloats)
          .set({ remainingBalance: Math.max(newBalance, 0).toFixed(2) })
          .where(eq(imprestFloats.id, imprestFloatId))

        return receipt
      })
    }),

  settleImprestFloat: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      try {
        const [updated] = await db
          .update(imprestFloats)
          .set({
            status: "settled",
            settledAt: new Date(),
          })
          .where(
            and(
              eq(imprestFloats.id, input.id),
              eq(imprestFloats.status, "active")
            )
          )
          .returning()
        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Imprest float not found or already settled" })
        }
        return updated
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to settle imprest float" })
      }
    }),

  // ── Petty Cash ──
  listPettyCash: protectedProcedure.query(({ ctx }) => {
    return db.query.pettyCashLedger.findMany({
      where: eq(pettyCashLedger.entityId, ctx.entityId!),
      orderBy: [desc(pettyCashLedger.createdAt)],
    })
  }),

  createPettyCashEntry: protectedProcedure
    .input(
      z.object({
        cashAccountId: z.string().uuid(),
        transactionDate: z.string(),
        description: z.string().min(1),
        debit: z.string().optional(),
        credit: z.string().optional(),
        balance: z.string(),
        category: z.string().optional(),
        reference: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [entry] = await db
          .insert(pettyCashLedger)
          .values({
            ...input,
            entityId: ctx.entityId!,
          })
          .returning()
        if (!entry) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create petty cash entry" })
        }
        return entry
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create petty cash entry" })
      }
    }),
})
