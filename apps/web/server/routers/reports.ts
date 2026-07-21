import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { eq, and, asc, inArray } from "drizzle-orm";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  fiscalPeriods,
} from "@xenboox/db/schema/accounting";

type AccountRow = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  debit: number;
  credit: number;
  balance: number;
};

type ReportSection = {
  label: string;
  accounts: AccountRow[];
  total: number;
};

export const reportsRouter = router({
  getProfitAndLoss: protectedProcedure
    .input(
      z.object({
        periodId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const conditions = [
          eq(journalEntries.entityId, ctx.entityId!),
          eq(journalEntries.status, "posted"),
        ];
        if (input.periodId) {
          conditions.push(eq(journalEntries.periodId, input.periodId));
        }

        const entryIds = await db
          .select({ id: journalEntries.id })
          .from(journalEntries)
          .where(and(...conditions));
        const ids = entryIds.map((e) => e.id);

        const lines =
          ids.length > 0
            ? await db.query.journalEntryLines.findMany({
                where: inArray(journalEntryLines.journalEntryId, ids),
              })
            : [];

        const accountMap = new Map<
          string,
          {
            accountId: string;
            code: string;
            name: string;
            type: string;
            subtype: string;
            debit: number;
            credit: number;
          }
        >();

        for (const line of lines) {
          const existing = accountMap.get(line.accountId) || {
            accountId: line.accountId,
            code: "",
            name: "",
            type: "",
            subtype: "",
            debit: 0,
            credit: 0,
          };
          existing.debit += Number(line.debit);
          existing.credit += Number(line.credit);
          accountMap.set(line.accountId, existing);
        }

        const accounts = await db.query.chartOfAccounts.findMany({
          where: eq(chartOfAccounts.entityId, ctx.entityId!),
          orderBy: [asc(chartOfAccounts.code)],
        });

        for (const acc of accounts) {
          const row = accountMap.get(acc.id);
          if (row) {
            row.code = acc.code;
            row.name = acc.name;
            row.type = acc.type;
            row.subtype = acc.subtype;
          }
        }

        const allRows: AccountRow[] = Array.from(accountMap.values()).map(
          (r) => ({
            ...r,
            balance: r.debit - r.credit,
          }),
        );

        const revenueAccounts = allRows.filter((a) => a.type === "revenue");
        const expenseAccounts = allRows.filter((a) => a.type === "expense");

        const revenue = revenueAccounts.map((a) => ({
          ...a,
          displayAmount: a.credit - a.debit,
        }));
        const expenses = expenseAccounts.map((a) => ({
          ...a,
          displayAmount: a.debit - a.credit,
        }));

        const totalRevenue = revenue.reduce((s, a) => s + a.displayAmount, 0);
        const totalExpenses = expenses.reduce((s, a) => s + a.displayAmount, 0);
        const netIncome = totalRevenue - totalExpenses;

        return {
          revenue: {
            label: "Revenue",
            accounts: revenue,
            total: totalRevenue,
          },
          expenses: {
            label: "Expenses",
            accounts: expenses,
            total: totalExpenses,
          },
          netIncome,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate P&L report",
        });
      }
    }),

  getBalanceSheet: protectedProcedure
    .input(
      z.object({
        periodId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const conditions = [
          eq(journalEntries.entityId, ctx.entityId!),
          eq(journalEntries.status, "posted"),
        ];
        if (input.periodId) {
          conditions.push(eq(journalEntries.periodId, input.periodId));
        }

        const entryIds = await db
          .select({ id: journalEntries.id })
          .from(journalEntries)
          .where(and(...conditions));
        const ids = entryIds.map((e) => e.id);

        const lines =
          ids.length > 0
            ? await db.query.journalEntryLines.findMany({
                where: inArray(journalEntryLines.journalEntryId, ids),
              })
            : [];

        const accountMap = new Map<
          string,
          {
            accountId: string;
            code: string;
            name: string;
            type: string;
            subtype: string;
            debit: number;
            credit: number;
          }
        >();

        for (const line of lines) {
          const existing = accountMap.get(line.accountId) || {
            accountId: line.accountId,
            code: "",
            name: "",
            type: "",
            subtype: "",
            debit: 0,
            credit: 0,
          };
          existing.debit += Number(line.debit);
          existing.credit += Number(line.credit);
          accountMap.set(line.accountId, existing);
        }

        const accounts = await db.query.chartOfAccounts.findMany({
          where: eq(chartOfAccounts.entityId, ctx.entityId!),
          orderBy: [asc(chartOfAccounts.code)],
        });

        for (const acc of accounts) {
          const row = accountMap.get(acc.id);
          if (row) {
            row.code = acc.code;
            row.name = acc.name;
            row.type = acc.type;
            row.subtype = acc.subtype;
          }
        }

        const allRows: AccountRow[] = Array.from(accountMap.values()).map(
          (r) => ({
            ...r,
            balance: r.debit - r.credit,
          }),
        );

        const classifyNormal = (type: string): "debit" | "credit" => {
          if (type === "asset" || type === "expense") return "debit";
          return "credit";
        };

        const getBalance = (row: AccountRow): number => {
          const normal = classifyNormal(row.type);
          return normal === "debit"
            ? row.debit - row.credit
            : row.credit - row.debit;
        };

        const assetAccounts = allRows
          .filter((a) => a.type === "asset")
          .map((a) => ({ ...a, displayAmount: getBalance(a) }));

        const liabilityAccounts = allRows
          .filter((a) => a.type === "liability")
          .map((a) => ({ ...a, displayAmount: getBalance(a) }));

        const equityAccounts = allRows
          .filter((a) => a.type === "equity")
          .map((a) => ({ ...a, displayAmount: getBalance(a) }));

        const totalAssets = assetAccounts.reduce(
          (s, a) => s + a.displayAmount,
          0,
        );
        const totalLiabilities = liabilityAccounts.reduce(
          (s, a) => s + a.displayAmount,
          0,
        );
        const totalEquity = equityAccounts.reduce(
          (s, a) => s + a.displayAmount,
          0,
        );

        return {
          assets: {
            label: "Assets",
            accounts: assetAccounts,
            total: totalAssets,
          },
          liabilities: {
            label: "Liabilities",
            accounts: liabilityAccounts,
            total: totalLiabilities,
          },
          equity: {
            label: "Equity",
            accounts: equityAccounts,
            total: totalEquity,
          },
          isBalanced:
            Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate balance sheet",
        });
      }
    }),

  listPeriods: protectedProcedure.query(async ({ ctx }) => {
    return db.query.fiscalPeriods.findMany({
      where: eq(fiscalPeriods.entityId, ctx.entityId!),
      orderBy: [asc(fiscalPeriods.startDate)],
    });
  }),
});
