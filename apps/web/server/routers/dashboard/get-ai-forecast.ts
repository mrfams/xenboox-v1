import { eq, and, sql, gte, sum, ne } from "drizzle-orm";
import { salesInvoices, invoicesAp, bankAccounts } from "@xenboox/db/schema";

import { rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { safeQuery, fillMonthlyWindow } from "./_helpers";
import {
  redactPii,
  INJECTION_DEFENSE_SUFFIX,
} from "@xenboox/agents/core/security/injection-defense";

/**
 * Projects revenue, expenses, and cash flow for the next 3 months.
 * Uses historical trends + LLM intelligence. Cached for 30 minutes.
 */
export const getAiForecast = rlsProtectedProcedure.query(async ({ ctx }) => {
  const entityId = ctx.entityId!;
  const entityNameRaw = ctx.entityName ?? "your business";
  const entityName = redactPii(entityNameRaw).text.substring(0, 100);
  const currency = ctx.entityCurrency ?? "USD";
  const now = new Date();
  const cacheKey = `forecast:${entityId}`;

  // Check Redis cache (30-minute TTL)
  try {
    const { getRedis } = await import("@/lib/redis");
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }
  } catch {
    // Cache unavailable
  }

  // Gather 6 months of historical data
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 10);

  // Monthly revenue from sales invoices
  const revenueRows = await safeQuery(
    "forecastRevenue",
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
            ne(salesInvoices.status, "voided"),
            gte(salesInvoices.invoiceDate, sixMonthsAgo),
          ),
        )
        .groupBy(sql`1`),
    [],
  );

  // Monthly expenses from AP invoices
  const expenseRows = await safeQuery(
    "forecastExpenses",
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
            gte(invoicesAp.invoiceDate, sixMonthsAgo),
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
  const monthlyExpenses = fillMonthlyWindow(
    expenseRows as Array<{ month: string | null; total: string | null }>,
    6,
    now,
  );

  // Calculate trends
  const avgRevenue = monthlyRevenues.reduce((s, v) => s + (v ?? 0), 0) / 6;
  const avgExpenses = monthlyExpenses.reduce((s, v) => s + (v ?? 0), 0) / 6;
  const recentRev =
    monthlyRevenues.slice(-3).reduce((s, v) => s + (v ?? 0), 0) / 3;
  const olderRev =
    monthlyRevenues.slice(0, 3).reduce((s, v) => s + (v ?? 0), 0) / 3;
  const revTrend = olderRev > 0 ? ((recentRev - olderRev) / olderRev) * 100 : 0;
  const recentExp =
    monthlyExpenses.slice(-3).reduce((s, v) => s + (v ?? 0), 0) / 3;
  const olderExp =
    monthlyExpenses.slice(0, 3).reduce((s, v) => s + (v ?? 0), 0) / 3;
  const expTrend = olderExp > 0 ? ((recentExp - olderExp) / olderExp) * 100 : 0;

  // Get current cash balance
  const bankAccountsData = await safeQuery(
    "forecastBank",
    () =>
      db.query.bankAccounts.findMany({
        where: eq(bankAccounts.entityId, entityId),
        columns: { currentBalance: true },
      }),
    [],
  );
  const cashBalance = bankAccountsData.reduce(
    (s, a) => s + parseFloat(a.currentBalance ?? "0"),
    0,
  );

  // Build context for AI
  const monthLabels = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(
      d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    );
  }
  const forecastLabels = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    forecastLabels.push(
      d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    );
  }

  const prompt = `You are a CFO AI assistant for ${entityName}. Based on 6 months of historical data, project financials for the next 3 months.

HISTORICAL MONTHLY REVENUE (oldest to newest):
${monthLabels.map((l, i) => `${l}: ${currency} ${(monthlyRevenues[i] ?? 0).toLocaleString()}`).join("\n")}

HISTORICAL MONTHLY EXPENSES (oldest to newest):
${monthLabels.map((l, i) => `${l}: ${currency} ${(monthlyExpenses[i] ?? 0).toLocaleString()}`).join("\n")}

TRENDS:
- Revenue trend (3-month vs 3-month): ${revTrend > 0 ? "+" : ""}${revTrend.toFixed(1)}%
- Expense trend (3-month vs 3-month): ${expTrend > 0 ? "+" : ""}${expTrend.toFixed(1)}%
- Current cash balance: ${currency} ${cashBalance.toLocaleString()}

Generate a JSON forecast with:
1. projectedRevenue: array of 3 numbers (next 3 months)
2. projectedExpenses: array of 3 numbers (next 3 months)
3. confidence: number 0-1
4. summary: 2-3 sentence plain English summary
5. risks: array of 1-2 risk factors
6. opportunities: array of 1-2 opportunities

Rules:
- Base projections on historical trends, not wishes
- If revenue is declining, project continued decline
- If expenses are rising, project continued rise
- Be conservative — under-promise, over-deliver
- Consider seasonality if patterns exist
- Return ONLY valid JSON, no markdown

${INJECTION_DEFENSE_SUFFIX}`;

  try {
    const { getLLMRegistry } = await import(
      "@xenboox/agents/core/llm/registry"
    );
    const registry = getLLMRegistry();
    const { model } = await registry.getModel("fast");

    const result = await model.invoke(prompt);
    const text =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);

    // Parse AI response
    let forecast;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      forecast = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      // Fallback to trend-based projection
      forecast = {
        projectedRevenue: [
          avgRevenue * (1 + revTrend / 100),
          avgRevenue * (1 + revTrend / 100) * (1 + revTrend / 200),
          avgRevenue * (1 + revTrend / 100) * (1 + revTrend / 150),
        ],
        projectedExpenses: [
          avgExpenses * (1 + expTrend / 100),
          avgExpenses * (1 + expTrend / 100) * (1 + expTrend / 200),
          avgExpenses * (1 + expTrend / 100) * (1 + expTrend / 150),
        ],
        confidence: 0.5,
        summary: "Projection based on historical trends.",
        risks: ["Limited historical data for accurate forecasting"],
        opportunities: ["Stable revenue base for growth"],
      };
    }

    // Calculate projected cash flow
    const projectedCashFlow = (forecast.projectedRevenue ?? []).map(
      (rev: number, i: number) => rev - (forecast.projectedExpenses?.[i] ?? 0),
    );

    // Calculate runway
    const avgMonthlyBurn = avgExpenses - avgRevenue;
    const runwayMonths =
      avgMonthlyBurn > 0 ? cashBalance / avgMonthlyBurn : Infinity;

    const response = {
      historical: {
        revenues: monthlyRevenues,
        expenses: monthlyExpenses,
        labels: monthLabels,
      },
      projected: {
        revenues: forecast.projectedRevenue ?? [],
        expenses: forecast.projectedExpenses ?? [],
        cashFlow: projectedCashFlow,
        labels: forecastLabels,
      },
      trends: {
        revenueTrend: revTrend,
        expenseTrend: expTrend,
        avgRevenue,
        avgExpenses,
        cashBalance,
        runwayMonths: runwayMonths === Infinity ? null : runwayMonths,
      },
      ai: {
        summary: forecast.summary ?? "",
        confidence: forecast.confidence ?? 0.7,
        risks: forecast.risks ?? [],
        opportunities: forecast.opportunities ?? [],
        generatedAt: now.toISOString(),
      },
      currency,
    };

    // Cache for 30 minutes
    try {
      const { getRedis } = await import("@/lib/redis");
      const redis = getRedis();
      if (redis) {
        await redis.setex(cacheKey, 1800, JSON.stringify(response));
      }
    } catch {
      // Cache write failed
    }

    return response;
  } catch (error) {
    logger.error({ err: error }, "[dashboard] AI forecast generation failed");

    // Fallback to trend-based projection
    return {
      historical: {
        revenues: monthlyRevenues,
        expenses: monthlyExpenses,
        labels: monthLabels,
      },
      projected: {
        revenues: [
          avgRevenue * (1 + revTrend / 100),
          avgRevenue * (1 + revTrend / 100) * (1 + revTrend / 200),
          avgRevenue * (1 + revTrend / 100) * (1 + revTrend / 150),
        ],
        expenses: [
          avgExpenses * (1 + expTrend / 100),
          avgExpenses * (1 + expTrend / 100) * (1 + expTrend / 200),
          avgExpenses * (1 + expTrend / 100) * (1 + expTrend / 150),
        ],
        cashFlow: [],
        labels: forecastLabels,
      },
      trends: {
        revenueTrend: revTrend,
        expenseTrend: expTrend,
        avgRevenue,
        avgExpenses,
        cashBalance,
        runwayMonths:
          avgExpenses - avgRevenue > 0
            ? cashBalance / (avgExpenses - avgRevenue)
            : null,
      },
      ai: {
        summary:
          "Projection based on historical trends. AI generation unavailable.",
        confidence: 0.4,
        risks: ["AI forecast unavailable — using trend-based projection"],
        opportunities: [],
        generatedAt: now.toISOString(),
      },
      currency,
    };
  }
});
