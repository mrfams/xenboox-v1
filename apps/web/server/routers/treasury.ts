import { z } from "zod"
import { eq, and, desc } from "drizzle-orm"
import { router, protectedProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import {
  bankAccounts,
  bankTransactions,
  reconciliations,
  reconciliationItems,
  auditLog,
} from "@xenboox/db/schema"
import { TRPCError } from "@trpc/server"

export const treasuryRouter = router({
  listBankAccounts: protectedProcedure.query(({ ctx }) => {
    return db.query.bankAccounts.findMany({
      where: eq(bankAccounts.entityId, ctx.entityId!),
      orderBy: [desc(bankAccounts.createdAt)],
    })
  }),

  createBankAccount: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        bankName: z.string().min(1),
        accountNumber: z.string().min(1),
        currency: z.string().length(3).default("USD"),
        openingBalance: z.string().default("0"),
        type: z.enum(["checking", "savings", "fixed_deposit"]).default("checking"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [bankAccount] = await db
          .insert(bankAccounts)
          .values({ ...input, entityId: ctx.entityId!, isActive: true })
          .returning()

        if (bankAccount) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "treasury.createBankAccount",
            entityType: "bank_account",
            entityIdRef: bankAccount.id,
            newValues: { name: input.name, bankName: input.bankName, accountNumber: input.accountNumber, currency: input.currency, type: input.type },
          })
        }

        return bankAccount
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create bank account" })
      }
    }),

  updateBankAccount: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        bankName: z.string().min(1).optional(),
        accountNumber: z.string().min(1).optional(),
        currency: z.string().length(3).optional(),
        type: z.enum(["checking", "savings", "fixed_deposit"]).optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const [updated] = await db
        .update(bankAccounts)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(bankAccounts.id, id), eq(bankAccounts.entityId, ctx.entityId!)))
        .returning()
      
      if (updated) {
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "treasury.updateBankAccount",
          entityType: "bank_account",
          entityIdRef: updated.id,
          newValues: data,
        })
      }
      return updated
    }),

  getBankAccountById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return db.query.bankAccounts.findFirst({
        where: and(eq(bankAccounts.id, input.id), eq(bankAccounts.entityId, ctx.entityId!)),
      })
    }),

  listBankTransactions: protectedProcedure
    .input(z.object({ bankAccountId: z.string().uuid().optional() }).optional())
    .query(({ ctx, input }) => {
      const conditions = [eq(bankTransactions.entityId, ctx.entityId!)]
      if (input?.bankAccountId) {
        conditions.push(eq(bankTransactions.bankAccountId, input.bankAccountId))
      }
      return db.query.bankTransactions.findMany({
        where: and(...conditions),
        orderBy: [desc(bankTransactions.createdAt)],
      })
    }),

  createBankTransaction: protectedProcedure
    .input(
      z.object({
        bankAccountId: z.string().uuid(),
        type: z.enum(["deposit", "withdrawal", "transfer", "fee", "interest"]),
        amount: z.string(),
        description: z.string().min(1),
        transactionDate: z.string(),
        reference: z.string().optional(),
        isReconciled: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [tx] = await db
          .insert(bankTransactions)
          .values({
            ...input,
            entityId: ctx.entityId!,
          })
          .returning()

        if (tx) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "treasury.createBankTransaction",
            entityType: "bank_transaction",
            entityIdRef: tx.id,
            newValues: { bankAccountId: input.bankAccountId, type: input.type, amount: input.amount, description: input.description },
          })
        }

        return tx
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create bank transaction" })
      }
    }),

  listReconciliations: protectedProcedure
    .input(z.object({ bankAccountId: z.string().uuid().optional() }).optional())
    .query(({ ctx, input }) => {
      const conditions = [eq(reconciliations.entityId, ctx.entityId!)]
      if (input?.bankAccountId) {
        conditions.push(eq(reconciliations.bankAccountId, input.bankAccountId))
      }
      return db.query.reconciliations.findMany({
        where: and(...conditions),
        orderBy: [desc(reconciliations.createdAt)],
      })
    }),

  createReconciliation: protectedProcedure
    .input(
      z.object({
        bankAccountId: z.string().uuid(),
        statementDate: z.string(),
        statementBalance: z.string(),
        bookBalance: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const stmtBalance = parseFloat(input.statementBalance)
        const bookBalance = parseFloat(input.bookBalance)
        const difference = stmtBalance - bookBalance

        const [recon] = await db
          .insert(reconciliations)
          .values({
            bankAccountId: input.bankAccountId,
            entityId: ctx.entityId!,
            statementDate: input.statementDate,
            statementBalance: input.statementBalance,
            bookBalance: input.bookBalance,
            difference: difference.toFixed(2),
            status: "unmatched",
            notes: input.notes,
            closedBy: ctx.session!.user!.id!,
          })
          .returning()

        if (recon) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "treasury.createReconciliation",
            entityType: "reconciliation",
            entityIdRef: recon.id,
            newValues: { bankAccountId: input.bankAccountId, statementBalance: input.statementBalance, bookBalance: input.bookBalance, difference: difference.toFixed(2) },
          })
        }

        return recon
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create reconciliation" })
      }
    }),

  getReconciliationById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const recon = await db.query.reconciliations.findFirst({
        where: and(eq(reconciliations.id, input.id), eq(reconciliations.entityId, ctx.entityId!)),
      })
      if (!recon) return null

      const items = await db.query.reconciliationItems.findMany({
        where: eq(reconciliationItems.reconciliationId, recon.id),
        with: { bankTransaction: true },
      })

      return { ...recon, items }
    }),

  matchReconciliationItem: protectedProcedure
    .input(
      z.object({
        reconciliationId: z.string().uuid(),
        bankTransactionId: z.string().uuid(),
        matchedAmount: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { reconciliationId, bankTransactionId, ...itemData } = input

      const reconciliation = await db.query.reconciliations.findFirst({
        where: and(eq(reconciliations.id, reconciliationId), eq(reconciliations.entityId, ctx.entityId!)),
      })
      if (!reconciliation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reconciliation not found" })
      }

      const bankTx = await db.query.bankTransactions.findFirst({
        where: and(eq(bankTransactions.id, bankTransactionId), eq(bankTransactions.entityId, ctx.entityId!)),
      })
      if (!bankTx) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bank transaction not found" })
      }

      const [item] = await db
        .insert(reconciliationItems)
        .values({
          reconciliationId,
          bankTransactionId,
          ...itemData,
          status: "matched",
        })
        .returning()

      await db
        .update(bankTransactions)
        .set({ isReconciled: true })
        .where(and(eq(bankTransactions.id, bankTransactionId), eq(bankTransactions.entityId, ctx.entityId!)))

      if (item) {
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "treasury.matchReconciliationItem",
          entityType: "reconciliation_item",
          entityIdRef: item.id,
          newValues: { matchedAmount: itemData.matchedAmount, notes: itemData.notes },
        })
      }

      return item
    }),

  closeReconciliation: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(reconciliations)
        .set({
          status: "closed",
          closedAt: new Date(),
          closedBy: ctx.session!.user!.id!,
        })
        .where(
          and(
            eq(reconciliations.id, input.id),
            eq(reconciliations.entityId, ctx.entityId!),
            eq(reconciliations.status, "unmatched")
          )
        )
        .returning()
      
      if (updated) {
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "treasury.closeReconciliation",
          entityType: "reconciliation",
          entityIdRef: updated.id,
          newValues: { status: "closed" },
        })
      }
      return updated
    }),
})
