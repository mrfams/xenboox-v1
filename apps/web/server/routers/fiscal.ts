import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import { eq, and, asc, desc } from "drizzle-orm"
import { fiscalPeriods } from "@xenboox/db/schema/accounting"
import { trialBalanceSnapshots } from "@xenboox/db/schema/accounting"
import { chartOfAccounts, journalEntries, journalEntryLines } from "@xenboox/db/schema/accounting"
import { auditLog } from "@xenboox/db/schema/documents"
import { triggerClient } from "@/lib/trigger"

export const fiscalRouter = router({
  list: protectedProcedure
    .input(z.object({ year: z.number().int().optional() }))
    .query(async ({ ctx, input }) => {
      return db.query.fiscalPeriods.findMany({
        where: input.year
          ? and(
              eq(fiscalPeriods.entityId, ctx.entityId!),
              eq(fiscalPeriods.year, input.year)
            )
          : eq(fiscalPeriods.entityId, ctx.entityId!),
        orderBy: [desc(fiscalPeriods.year), asc(fiscalPeriods.month)]
      })
    }),

  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    return db.query.fiscalPeriods.findFirst({
      where: and(
        eq(fiscalPeriods.entityId, ctx.entityId!),
        eq(fiscalPeriods.year, currentYear),
        eq(fiscalPeriods.month, currentMonth)
      )
    })
  }),

  create: protectedProcedure
    .input(z.object({
      year: z.number().int().min(2000).max(2100),
      month: z.number().int().min(1).max(12),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.fiscalPeriods.findFirst({
          where: and(
            eq(fiscalPeriods.entityId, ctx.entityId!),
            eq(fiscalPeriods.year, input.year),
            eq(fiscalPeriods.month, input.month)
          )
        })
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: `Period ${input.year}-${input.month} already exists` })
        }

        const startDate = `${input.year}-${String(input.month).padStart(2, "0")}-01`
        const lastDay = new Date(input.year, input.month, 0).getDate()
        const endDate = `${input.year}-${String(input.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

        const [period] = await db.insert(fiscalPeriods).values({
          entityId: ctx.entityId!,
          year: input.year,
          month: input.month,
          startDate,
          endDate,
        }).returning()

        return period
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create fiscal period" })
      }
    }),

  closePeriod: protectedProcedure
    .input(z.object({ periodId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const period = await db.query.fiscalPeriods.findFirst({
          where: and(eq(fiscalPeriods.id, input.periodId), eq(fiscalPeriods.entityId, ctx.entityId!))
        })
        if (!period) throw new TRPCError({ code: "NOT_FOUND", message: "Period not found" })
        if (period.status === "closed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Period already closed" })
        }
        if (period.status === "locked") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Period is locked" })
        }

        const entries = await db.query.journalEntries.findMany({
          where: and(
            eq(journalEntries.entityId, ctx.entityId!),
            eq(journalEntries.periodId, input.periodId),
            eq(journalEntries.status, "posted")
          )
        })

        const accountTotals = new Map<string, { debit: number; credit: number }>()

        for (const entry of entries) {
          const lines = await db.query.journalEntryLines.findMany({
            where: eq(journalEntryLines.journalEntryId, entry.id)
          })
          for (const line of lines) {
            const existing = accountTotals.get(line.accountId) || { debit: 0, credit: 0 }
            existing.debit += Number(line.debit)
            existing.credit += Number(line.credit)
            accountTotals.set(line.accountId, existing)
          }
        }

        for (const [accountId, totals] of accountTotals) {
          await db.insert(trialBalanceSnapshots).values({
            entityId: ctx.entityId!,
            periodId: input.periodId,
            accountId,
            debitTotal: String(totals.debit),
            creditTotal: String(totals.credit),
            balance: String(totals.debit - totals.credit),
            generatedBy: "system",
          })
        }

        const [updated] = await db.update(fiscalPeriods)
          .set({
            status: "closed",
            closedBy: ctx.session!.user!.id!,
            closedAt: new Date(),
          })
          .where(and(eq(fiscalPeriods.id, input.periodId), eq(fiscalPeriods.entityId, ctx.entityId!)))
          .returning()

        if (updated) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "fiscal.closePeriod",
            entityType: "fiscal_period",
            entityIdRef: updated.id,
            newValues: { status: "closed" },
          })
        }

        return updated
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to close period" })
      }
    }),

  lockPeriod: protectedProcedure
    .input(z.object({ periodId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const period = await db.query.fiscalPeriods.findFirst({
          where: and(eq(fiscalPeriods.id, input.periodId), eq(fiscalPeriods.entityId, ctx.entityId!))
        })
        if (!period) throw new TRPCError({ code: "NOT_FOUND", message: "Period not found" })
        if (period.status !== "closed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Must be closed before locking" })
        }

        const [updated] = await db.update(fiscalPeriods)
          .set({ status: "locked" })
          .where(and(eq(fiscalPeriods.id, input.periodId), eq(fiscalPeriods.entityId, ctx.entityId!)))
          .returning()

        if (updated) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "fiscal.lockPeriod",
            entityType: "fiscal_period",
            entityIdRef: updated.id,
            newValues: { status: "locked" },
          })
        }

        return updated
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to lock period" })
      }
    }),

  closePeriodAsync: protectedProcedure
    .input(z.object({ periodId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const period = await db.query.fiscalPeriods.findFirst({
          where: and(eq(fiscalPeriods.id, input.periodId), eq(fiscalPeriods.entityId, ctx.entityId!))
        })
        if (!period) throw new TRPCError({ code: "NOT_FOUND", message: "Period not found" })
        if (period.status === "closed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Period already closed" })
        }
        if (period.status === "locked") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Period is locked" })
        }

        const job = await triggerClient.tasks.trigger("process-month-end-close", {
          entityId: ctx.entityId!,
          month: period.month,
          year: period.year,
          userId: ctx.session!.user!.id!,
        })

        return { jobId: job.id, status: "triggered" }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to trigger period close" })
      }
    }),
})
