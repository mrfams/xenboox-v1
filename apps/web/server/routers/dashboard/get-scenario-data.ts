import { eq, and, sql, gte, sum } from "drizzle-orm";
import {
  bankAccounts,
  cashAccounts,
  invoicesAp,
  salesInvoices,
} from "@xenboox/db/schema";

import { rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { computeRunwayMonths } from "@/lib/dashboard-runway";
import { safeQuery, fillMonthlyWindow } from "./_helpers";

/**
 * Returns the real cash position and trailing burn so the insights page
 * can project runway under user-adjustable assumptions (revenue growth,
 * expense cuts) using the shared runway policy.
 */
export const getScenarioData = rlsProtectedProcedure.query(async ({ ctx }) => {
  const entityId = ctx.entityId!;

  const bankAccountsData = await safeQuery(
    "bankAccounts",
    () =>
      db.query.bankAccounts.findMany({
        where: eq(bankAccounts.entityId, entityId),
        columns: { currentBalance: true },
      }),
    [],
  );
  const cashBalance = bankAccountsData.reduce(
    (sum, a) => sum + parseFloat(a.currentBalance ?? "0"),
    0,
  );
  const cashAccountsData = await safeQuery(
    "cashAccounts",
    () =>
      db.query.cashAccounts.findMany({
        where: eq(cashAccounts.entityId, entityId),
        columns: { currentBalance: true },
      }),
    [],
  );
  const totalCashBalance =
    cashBalance +
    cashAccountsData.reduce(
      (sum, a) => sum + parseFloat(a.currentBalance ?? "0"),
      0,
    );

  const now = new Date();
  const sparklineStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 10);

  const revenueRows = await safeQuery(
    "monthlyRevenues",
    () =>
      db
        .select({
          month: sql<string>`to_char(${salesInvoices.invoiceDate}::date, 'YYYY-MM')`,
          total: sum(salesInvoices.totalAmount),
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.entityId, entityId),
            gte(salesInvoices.invoiceDate, sparklineStart),
          ),
        )
        .groupBy(sql`1`),
    [],
  );
  const monthlyRevenues = fillMonthlyWindow(
    revenueRows as Array<{ month: string | null; total: string | null }>,
    6,
    now,
  );

  const expenseRows = await safeQuery(
    "monthlyExpenses",
    () =>
      db
        .select({
          month: sql<string>`to_char(${invoicesAp.invoiceDate}::date, 'YYYY-MM')`,
          total: sum(invoicesAp.totalAmount),
        })
        .from(invoicesAp)
        .where(
          and(
            eq(invoicesAp.entityId, entityId),
            gte(invoicesAp.invoiceDate, sparklineStart),
          ),
        )
        .groupBy(sql`1`),
    [],
  );
  const monthlyExpenses = fillMonthlyWindow(
    expenseRows as Array<{ month: string | null; total: string | null }>,
    6,
    now,
  );

  const burnIndexes = [3, 4, 5];
  const burnValues = burnIndexes.map(
    (i) => (monthlyExpenses[i] ?? 0) - (monthlyRevenues[i] ?? 0),
  );
  const avgMonthlyBurn =
    burnValues.reduce((sum, v) => sum + v, 0) / burnValues.length;

  return {
    cashBalance: totalCashBalance,
    avgMonthlyBurn,
    runwayMonths: computeRunwayMonths(totalCashBalance, avgMonthlyBurn),
    monthlyRevenues,
    monthlyExpenses,
  };
});
