import { eq, and, sql, inArray } from "drizzle-orm";
import {
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  bankAccounts,
} from "@xenboox/db/schema";

import { rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { formatCurrency } from "@/lib/utils";
import { MONTH_NAMES } from "./_helpers";

/**
 * Generates a natural language narrative from real financial data.
 * Uses Haiku for speed. Cached for 10 minutes per entity.
 */
export const getAiNarrative = rlsProtectedProcedure.query(async ({ ctx }) => {
  const entityId = ctx.entityId!;
  const entityName = ctx.entityName ?? "your business";
  const currency = ctx.entityCurrency ?? "USD";
  const now = new Date();

  // Check Redis cache first
  const cacheKey = `narrative:${entityId}`;
  try {
    const { getRedis } = await import("@/lib/redis");
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as {
          text: string;
          confidence: number;
          generatedAt: string;
          highlights: string[];
          concerns: string[];
        };
      }
    }
  } catch {
    // Cache unavailable — continue without it
  }

  // Gather financial context
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
  const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${new Date(currentYear, currentMonth + 1, 0).getDate()}`;

  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
      sql`${journalEntries.date} >= ${startDate}`,
      sql`${journalEntries.date} <= ${endDate}`,
    ),
  });

  const lineIds = entries.map((e) => e.id);
  const lines =
    lineIds.length > 0
      ? await db.query.journalEntryLines.findMany({
          where: inArray(journalEntryLines.journalEntryId, lineIds),
        })
      : [];

  const accounts = await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.entityId, entityId),
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  let revenue = 0;
  let expenses = 0;
  const revenueByAccount: Record<string, number> = {};
  const expensesByAccount: Record<string, number> = {};

  for (const line of lines) {
    const account = accountMap.get(line.accountId);
    if (!account) continue;
    const amount =
      parseFloat(line.credit ?? "0") - parseFloat(line.debit ?? "0");
    if (account.type === "revenue") {
      revenue += Math.abs(amount);
      revenueByAccount[account.name] =
        (revenueByAccount[account.name] ?? 0) + Math.abs(amount);
    }
    if (account.type === "expense") {
      expenses += Math.abs(amount);
      expensesByAccount[account.name] =
        (expensesByAccount[account.name] ?? 0) + Math.abs(amount);
    }
  }

  const netProfit = revenue - expenses;
  const margin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

  // Get prior month for comparison
  const priorMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const priorYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const priorStart = `${priorYear}-${String(priorMonth + 1).padStart(2, "0")}-01`;
  const priorEnd = `${priorYear}-${String(priorMonth + 1).padStart(2, "0")}-${new Date(priorYear, priorMonth + 1, 0).getDate()}`;

  const priorEntries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
      sql`${journalEntries.date} >= ${priorStart}`,
      sql`${journalEntries.date} <= ${priorEnd}`,
    ),
  });

  const priorLineIds = priorEntries.map((e) => e.id);
  const priorLines =
    priorLineIds.length > 0
      ? await db.query.journalEntryLines.findMany({
          where: inArray(journalEntryLines.journalEntryId, priorLineIds),
        })
      : [];

  let priorRevenue = 0;
  let priorExpenses = 0;

  for (const line of priorLines) {
    const account = accountMap.get(line.accountId);
    if (!account) continue;
    const amount =
      parseFloat(line.credit ?? "0") - parseFloat(line.debit ?? "0");
    if (account.type === "revenue") priorRevenue += Math.abs(amount);
    if (account.type === "expense") priorExpenses += Math.abs(amount);
  }

  const revenueChange =
    priorRevenue > 0 ? ((revenue - priorRevenue) / priorRevenue) * 100 : 0;
  const expensesChange =
    priorExpenses > 0 ? ((expenses - priorExpenses) / priorExpenses) * 100 : 0;

  // Get banking context
  const bankAccountsData = await db.query.bankAccounts.findMany({
    where: eq(bankAccounts.entityId, entityId),
  });
  const cashBalance = bankAccountsData.reduce(
    (sum, a) => sum + parseFloat(a.balance ?? "0"),
    0,
  );

  // Build context for AI
  const topExpenses = Object.entries(expensesByAccount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => `${name}: ${currency} ${amount.toLocaleString()}`)
    .join("\n");

  const topRevenue = Object.entries(revenueByAccount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => `${name}: ${currency} ${amount.toLocaleString()}`)
    .join("\n");

  const prompt = `You are a CFO AI assistant for ${entityName}. Generate a concise, insightful financial narrative for this month (${MONTH_NAMES[currentMonth]} ${currentYear}).

CURRENT MONTH:
- Revenue: ${currency} ${revenue.toLocaleString()}${revenueChange !== 0 ? ` (${revenueChange > 0 ? "+" : ""}${revenueChange.toFixed(1)}% vs prior)` : ""}
- Expenses: ${currency} ${expenses.toLocaleString()}${expensesChange !== 0 ? ` (${expensesChange > 0 ? "+" : ""}${expensesChange.toFixed(1)}% vs prior)` : ""}
- Net Profit: ${currency} ${netProfit.toLocaleString()} (${margin}% margin)
- Cash Balance: ${currency} ${cashBalance.toLocaleString()}

TOP REVENUE SOURCES:
${topRevenue || "No data"}

TOP EXPENSE CATEGORIES:
${topExpenses || "No data"}

PRIOR MONTH:
- Revenue: ${currency} ${priorRevenue.toLocaleString()}
- Expenses: ${currency} ${priorExpenses.toLocaleString()}
- Net Profit: ${currency} ${(priorRevenue - priorExpenses).toLocaleString()}

Write a 2-3 paragraph narrative that:
1. Summarizes the financial position in plain English
2. Highlights what's working well (positive trends)
3. Flags concerns or areas needing attention
4. Ends with 1-2 actionable recommendations

Keep it professional but conversational. Use specific numbers. Don't be generic.`;

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

    // Extract highlights and concerns from the narrative
    const highlights: string[] = [];
    const concerns: string[] = [];

    if (revenueChange > 5)
      highlights.push(
        `Revenue grew ${revenueChange.toFixed(1)}% vs prior month`,
      );
    if (expensesChange < -5)
      highlights.push(
        `Expenses reduced ${Math.abs(expensesChange).toFixed(1)}% vs prior month`,
      );
    if (margin > 20) highlights.push(`Healthy ${margin}% profit margin`);
    if (cashBalance > expenses * 3)
      highlights.push(
        `Strong cash position with ${Math.round(cashBalance / (expenses || 1))} months of runway`,
      );

    if (revenueChange < -10)
      concerns.push(
        `Revenue declined ${Math.abs(revenueChange).toFixed(1)}% vs prior month`,
      );
    if (expensesChange > 15)
      concerns.push(
        `Expenses increased ${expensesChange.toFixed(1)}% — investigate unusual spending`,
      );
    if (margin < 10 && revenue > 0)
      concerns.push(
        `Thin ${margin}% margin — consider pricing or cost optimization`,
      );
    if (cashBalance < expenses * 1)
      concerns.push(`Low cash balance — less than 1 month of expenses covered`);

    const narrative = {
      text,
      confidence: 0.85,
      generatedAt: now.toISOString(),
      highlights,
      concerns,
    };

    // Cache for 10 minutes
    try {
      const { getRedis } = await import("@/lib/redis");
      const redis = getRedis();
      if (redis) {
        await redis.setex(cacheKey, 600, JSON.stringify(narrative));
      }
    } catch {
      // Cache write failed — non-critical
    }

    return narrative;
  } catch (error) {
    logger.error({ err: error }, "[dashboard] AI narrative generation failed");

    // Fallback to assembled narrative
    const parts: string[] = [];
    if (revenue > 0)
      parts.push(
        `Revenue is ${currency} ${revenue.toLocaleString()}${revenueChange !== 0 ? ` (${revenueChange > 0 ? "+" : ""}${revenueChange.toFixed(1)}% vs prior)` : ""}.`,
      );
    if (expenses > 0)
      parts.push(
        `Expenses are ${currency} ${expenses.toLocaleString()}${expensesChange !== 0 ? ` (${expensesChange > 0 ? "+" : ""}${expensesChange.toFixed(1)}%)` : ""}.`,
      );
    parts.push(
      `Net ${netProfit >= 0 ? "profit" : "loss"} is ${currency} ${Math.abs(netProfit).toLocaleString()} (${margin}% margin).`,
    );

    return {
      text: parts.join(" "),
      confidence: 0.5,
      generatedAt: now.toISOString(),
      highlights:
        revenueChange > 5 ? [`Revenue grew ${revenueChange.toFixed(1)}%`] : [],
      concerns:
        revenueChange < -10
          ? [`Revenue declined ${Math.abs(revenueChange).toFixed(1)}%`]
          : [],
    };
  }
});
