// @ts-nocheck

import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure, mutateProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import { eq, and, asc, desc, sql } from "drizzle-orm"
import {
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  fiscalPeriods,
  trialBalanceSnapshots
} from "@xenboox/db/schema/accounting"
import { auditLog } from "@xenboox/db/schema/documents"

export const journalRouter = router({
  list: protectedProcedure
    .input(z.object({
      periodId: z.string().uuid().optional(),
      status: z.enum(["draft", "pending_review", "posted", "reversed", "voided"]).optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(journalEntries.entityId, ctx.entityId!)]
      if (input.periodId) conditions.push(eq(journalEntries.periodId, input.periodId))
      if (input.status) conditions.push(eq(journalEntries.status, input.status))

      return db.query.journalEntries.findMany({
        where: and(...conditions),
        orderBy: [desc(journalEntries.date)],
        limit: input.limit,
        offset: input.offset,
      })
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entry = await db.query.journalEntries.findFirst({
        where: and(eq(journalEntries.id, input.id), eq(journalEntries.entityId, ctx.entityId!))
      })
      if (!entry) return null

      const lines = await db.query.journalEntryLines.findMany({
        where: eq(journalEntryLines.journalEntryId, input.id)
      })

      return { ...entry, lines }
    }),

  create: mutateProcedure
    .input(z.object({
      description: z.string().min(1).max(500),
      reference: z.string().max(100).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      periodId: z.string().uuid(),
      lines: z.array(z.object({
        accountId: z.string().uuid(),
        debit: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
        credit: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
        description: z.string().max(500).optional(),
      })).min(2),
      source: z.string().optional(),
      confidence: z.number().min(0).max(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const totalDebit = input.lines.reduce((sum, l) => sum + Number(l.debit), 0)
        const totalCredit = input.lines.reduce((sum, l) => sum + Number(l.credit), 0)

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Debits (${totalDebit}) must equal credits (${totalCredit})`
          })
        }

        if (totalDebit === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Entry must have non-zero amounts"
          })
        }

        const period = await db.query.fiscalPeriods.findFirst({
          where: eq(fiscalPeriods.id, input.periodId)
        })
        if (!period) throw new TRPCError({ code: "NOT_FOUND", message: "Fiscal period not found" })
        if (period.status !== "open") {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Period is ${period.status}, not open` })
        }

        const lastEntry = await db.query.journalEntries.findFirst({
          where: eq(journalEntries.entityId, ctx.entityId!),
          orderBy: [desc(journalEntries.entryNumber)]
        })
        const entryNumber = (lastEntry?.entryNumber ?? 0) + 1

        const [entry] = await db.insert(journalEntries).values({
          entityId: ctx.entityId!,
          entryNumber,
          description: input.description,
          reference: input.reference,
          date: input.date,
          periodId: input.periodId,
          status: "draft",
          source: input.source,
          confidence: input.confidence ? String(input.confidence) : undefined,
        }).returning()

        const lines = await Promise.all(
          input.lines.map(line =>
            db.insert(journalEntryLines).values({
              journalEntryId: entry.id,
              accountId: line.accountId,
              debit: line.debit,
              credit: line.credit,
              description: line.description,
            }).returning()
          )
        )

        return { entry, lines: lines.flat() }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create journal entry" })
      }
    }),

  post: mutateProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const entry = await db.query.journalEntries.findFirst({
          where: and(eq(journalEntries.id, input.id), eq(journalEntries.entityId, ctx.entityId!))
        })
        if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Journal entry not found" })
        if (entry.status !== "draft" && entry.status !== "pending_review") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot post entry with status: ${entry.status}`
          })
        }

        const period = await db.query.fiscalPeriods.findFirst({
          where: eq(fiscalPeriods.id, entry.periodId)
        })
        if (!period || period.status !== "open") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Period is not open" })
        }

        const [updated] = await db.update(journalEntries)
          .set({
            status: "posted",
            postedBy: ctx.session!.user!.id!,
            postedAt: new Date(),
          })
          .where(eq(journalEntries.id, input.id))
          .returning()

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "journal_entry.post",
          entityType: "journal_entry",
          entityIdRef: input.id,
          newValues: { status: "posted" },
        })

        return updated
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to post journal entry" })
      }
    }),

  reverse: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      reason: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const entry = await db.query.journalEntries.findFirst({
          where: and(eq(journalEntries.id, input.id), eq(journalEntries.entityId, ctx.entityId!))
        })
        if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Journal entry not found" })
        if (entry.status !== "posted") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only posted entries can be reversed" })
        }

        const originalLines = await db.query.journalEntryLines.findMany({
          where: eq(journalEntryLines.journalEntryId, input.id)
        })

        const lastEntry = await db.query.journalEntries.findFirst({
          where: eq(journalEntries.entityId, ctx.entityId!),
          orderBy: [desc(journalEntries.entryNumber)]
        })
        const entryNumber = (lastEntry?.entryNumber ?? 0) + 1

        const [reversal] = await db.insert(journalEntries).values({
          entityId: ctx.entityId!,
          entryNumber,
          description: `Reversal of #${entry.entryNumber}: ${input.reason}`,
          reference: entry.reference,
          date: new Date().toISOString().split("T")[0],
          periodId: entry.periodId,
          status: "posted",
          reversedBy: entry.id,
          postedBy: ctx.session!.user!.id!,
          postedAt: new Date(),
          source: "reversal",
        }).returning()

        await Promise.all(
          originalLines.map(line =>
            db.insert(journalEntryLines).values({
              journalEntryId: reversal.id,
              accountId: line.accountId,
              debit: line.credit,
              credit: line.debit,
              description: `Reversal: ${line.description}`,
            })
          )
        )

        await db.update(journalEntries)
          .set({
            status: "reversed",
            reversedBy: reversal.id,
            reversedAt: new Date(),
          })
          .where(eq(journalEntries.id, input.id))

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "journal_entry.reverse",
          entityType: "journal_entry",
          entityIdRef: input.id,
          newValues: { status: "reversed", reversalId: reversal.id, reason: input.reason },
        })

        return { original: entry, reversal }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to reverse journal entry" })
      }
    }),

  getTrialBalance: protectedProcedure
    .input(z.object({ periodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        const entries = await db.query.journalEntries.findMany({
          where: and(
            eq(journalEntries.entityId, ctx.entityId!),
            eq(journalEntries.periodId, input.periodId),
            eq(journalEntries.status, "posted")
          )
        })

        const accountTotals = new Map<string, { debit: number; credit: number; account: Record<string, unknown> | null }>()

        for (const entry of entries) {
          const lines = await db.query.journalEntryLines.findMany({
            where: eq(journalEntryLines.journalEntryId, entry.id)
          })
          for (const line of lines) {
            const existing = accountTotals.get(line.accountId) || { debit: 0, credit: 0, account: null }
            existing.debit += Number(line.debit)
            existing.credit += Number(line.credit)
            if (!existing.account) {
              const acc = await db.query.chartOfAccounts.findFirst({
                where: eq(chartOfAccounts.id, line.accountId)
              })
              existing.account = acc ?? null
            }
            accountTotals.set(line.accountId, existing)
          }
        }

        const accounts = Array.from(accountTotals.entries()).map(([accountId, data]) => ({
          accountId,
          code: (data.account as { code?: string } | null)?.code,
          name: (data.account as { name?: string } | null)?.name,
          type: (data.account as { type?: string } | null)?.type,
          debit: data.debit,
          credit: data.credit,
          balance: data.debit - data.credit,
        }))

        const totalDebit = accounts.reduce((sum, a) => sum + a.debit, 0)
        const totalCredit = accounts.reduce((sum, a) => sum + a.credit, 0)

        return {
          accounts,
          totalDebit,
          totalCredit,
          isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate trial balance" })
      }
    }),
})
