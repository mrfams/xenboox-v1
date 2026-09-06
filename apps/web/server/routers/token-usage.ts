import { z } from "zod";
import { eq, and, desc, sql, count, gte, lte, sum } from "drizzle-orm";
import {
  opsTokenDaily,
  opsTokenByModel,
  opsTokenByOrg,
  opsTokenByAgent,
  opsTokenByContext,
  opsTokenInsights,
} from "@xenboox/db/schema/ops-token-usage";

import { router, adminProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { devOnly } from "@/server/lib/dev-only";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDateRange(days: number): { startDate: string; endDate: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0]!;
  const start = new Date(now.getTime() - days * 86400000)
    .toISOString()
    .split("T")[0]!;
  return { startDate: start, endDate: end };
}

function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Token Usage Router ─────────────────────────────────────────────────────

export const tokenUsageRouter = router({
  // ── Dashboard Overview ────────────────────────────────────────────────

  getOverview: adminProtectedProcedure
    .input(
      z
        .object({
          days: z.number().min(1).max(90).default(7),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const days = input?.days ?? 7;
      const { startDate, endDate } = getDateRange(days);
      const prevStart = getDateRange(days * 2).startDate;
      const prevEnd = startDate;

      // Current period totals
      const current = await db
        .select({
          totalTokens: sum(opsTokenDaily.totalTokens),
          inputTokens: sum(opsTokenDaily.inputTokens),
          outputTokens: sum(opsTokenDaily.outputTokens),
          totalCostUsd: sum(opsTokenDaily.totalCostUsd),
          totalRuns: sum(opsTokenDaily.totalRuns),
          avgTokensPerRun: sql<string>`AVG(${opsTokenDaily.avgTokensPerRun})`,
          avgContextWindowUsed: sql<string>`AVG(${opsTokenDaily.avgContextWindowUsed})`,
        })
        .from(opsTokenDaily)
        .where(
          and(
            gte(opsTokenDaily.date, startDate),
            lte(opsTokenDaily.date, endDate),
          ),
        )
        .then((r) => r[0]);

      // Previous period for deltas
      const prev = await db
        .select({
          totalTokens: sum(opsTokenDaily.totalTokens),
          inputTokens: sum(opsTokenDaily.inputTokens),
          outputTokens: sum(opsTokenDaily.outputTokens),
          totalCostUsd: sum(opsTokenDaily.totalCostUsd),
          totalRuns: sum(opsTokenDaily.totalRuns),
          avgTokensPerRun: sql<string>`AVG(${opsTokenDaily.avgTokensPerRun})`,
          avgContextWindowUsed: sql<string>`AVG(${opsTokenDaily.avgContextWindowUsed})`,
        })
        .from(opsTokenDaily)
        .where(
          and(
            gte(opsTokenDaily.date, prevStart),
            lte(opsTokenDaily.date, prevEnd),
          ),
        )
        .then((r) => r[0]);

      // Daily data for charts
      const dailyData = await db.query.opsTokenDaily.findMany({
        where: and(
          gte(opsTokenDaily.date, startDate),
          lte(opsTokenDaily.date, endDate),
        ),
        orderBy: [opsTokenDaily.date],
      });

      // Token by model
      const byModel = await db
        .select({
          modelName: opsTokenByModel.modelName,
          provider: opsTokenByModel.provider,
          runs: sql<number>`SUM(${opsTokenByModel.runs})`,
          inputTokens: sql<string>`SUM(${opsTokenByModel.inputTokens})`,
          outputTokens: sql<string>`SUM(${opsTokenByModel.outputTokens})`,
          totalTokens: sql<string>`SUM(${opsTokenByModel.totalTokens})`,
          costUsd: sql<string>`SUM(${opsTokenByModel.costUsd})`,
          avgTokensPerRun: sql<number>`AVG(${opsTokenByModel.avgTokensPerRun})`,
        })
        .from(opsTokenByModel)
        .where(
          and(
            gte(opsTokenByModel.date, startDate),
            lte(opsTokenByModel.date, endDate),
          ),
        )
        .groupBy(opsTokenByModel.modelName, opsTokenByModel.provider)
        .orderBy(desc(sql`SUM(${opsTokenByModel.totalTokens})`))
        .limit(10);

      // Token by organization
      const byOrg = await db
        .select({
          organizationName: opsTokenByOrg.organizationName,
          runs: sql<number>`SUM(${opsTokenByOrg.runs})`,
          totalTokens: sql<string>`SUM(${opsTokenByOrg.totalTokens})`,
        })
        .from(opsTokenByOrg)
        .where(
          and(
            gte(opsTokenByOrg.date, startDate),
            lte(opsTokenByOrg.date, endDate),
          ),
        )
        .groupBy(opsTokenByOrg.organizationName)
        .orderBy(desc(sql`SUM(${opsTokenByOrg.totalTokens})`))
        .limit(8);

      // Token by agent
      const byAgent = await db
        .select({
          agentName: opsTokenByAgent.agentName,
          runs: sql<number>`SUM(${opsTokenByAgent.runs})`,
          totalTokens: sql<string>`SUM(${opsTokenByAgent.totalTokens})`,
        })
        .from(opsTokenByAgent)
        .where(
          and(
            gte(opsTokenByAgent.date, startDate),
            lte(opsTokenByAgent.date, endDate),
          ),
        )
        .groupBy(opsTokenByAgent.agentName)
        .orderBy(desc(sql`SUM(${opsTokenByAgent.totalTokens})`))
        .limit(8);

      // Token by context window
      const byContext = await db
        .select({
          bucket: opsTokenByContext.bucket,
          totalTokens: sql<string>`SUM(${opsTokenByContext.totalTokens})`,
          requests: sql<number>`SUM(${opsTokenByContext.requests})`,
        })
        .from(opsTokenByContext)
        .where(
          and(
            gte(opsTokenByContext.date, startDate),
            lte(opsTokenByContext.date, endDate),
          ),
        )
        .groupBy(opsTokenByContext.bucket)
        .orderBy(opsTokenByContext.bucket);

      // Insights
      const insights = await db.query.opsTokenInsights.findMany({
        orderBy: [opsTokenInsights.priority],
        limit: 5,
      });

      // Calculate totals and deltas
      const curTotal = parseFloat(String(current.totalTokens ?? "0"));
      const prevTotal = parseFloat(String(prev.totalTokens ?? "0"));
      const curInput = parseFloat(String(current.inputTokens ?? "0"));
      const prevInput = parseFloat(String(prev.inputTokens ?? "0"));
      const curOutput = parseFloat(String(current.outputTokens ?? "0"));
      const prevOutput = parseFloat(String(prev.outputTokens ?? "0"));
      const curCost = parseFloat(String(current.totalCostUsd ?? "0"));
      const prevCost = parseFloat(String(prev.totalCostUsd ?? "0"));
      const curAvgTokens = parseFloat(String(current.avgTokensPerRun ?? "0"));
      const prevAvgTokens = parseFloat(String(prev.avgTokensPerRun ?? "0"));
      const curContext = parseFloat(
        String(current.avgContextWindowUsed ?? "0"),
      );
      const prevContext = parseFloat(String(prev.avgContextWindowUsed ?? "0"));

      const totalDelta =
        prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : 0;
      const inputDelta =
        prevInput > 0 ? ((curInput - prevInput) / prevInput) * 100 : 0;
      const outputDelta =
        prevOutput > 0 ? ((curOutput - prevOutput) / prevOutput) * 100 : 0;
      const costDelta =
        prevCost > 0 ? ((curCost - prevCost) / prevCost) * 100 : 0;
      const avgTokensDelta =
        prevAvgTokens > 0
          ? ((curAvgTokens - prevAvgTokens) / prevAvgTokens) * 100
          : 0;
      const contextDelta =
        prevContext > 0 ? ((curContext - prevContext) / prevContext) * 100 : 0;

      // Model breakdown for donut
      const modelBreakdown = byModel.map((m) => ({
        name: m.modelName,
        tokens: parseFloat(String(m.totalTokens ?? "0")),
        tokensDisplay: formatLargeNumber(
          parseFloat(String(m.totalTokens ?? "0")),
        ),
        percentage:
          curTotal > 0
            ? (
                (parseFloat(String(m.totalTokens ?? "0")) / curTotal) *
                100
              ).toFixed(1)
            : "0",
      }));

      // Org breakdown
      const orgBreakdown = byOrg.map((o) => ({
        name: o.organizationName,
        tokens: parseFloat(String(o.totalTokens ?? "0")),
        tokensDisplay: formatLargeNumber(
          parseFloat(String(o.totalTokens ?? "0")),
        ),
        runs: o.runs ?? 0,
        percentage:
          curTotal > 0
            ? (
                (parseFloat(String(o.totalTokens ?? "0")) / curTotal) *
                100
              ).toFixed(1)
            : "0",
      }));

      // Agent breakdown
      const agentBreakdown = byAgent.map((a) => ({
        name: a.agentName,
        tokens: parseFloat(String(a.totalTokens ?? "0")),
        tokensDisplay: formatLargeNumber(
          parseFloat(String(a.totalTokens ?? "0")),
        ),
        runs: a.runs ?? 0,
        percentage:
          curTotal > 0
            ? (
                (parseFloat(String(a.totalTokens ?? "0")) / curTotal) *
                100
              ).toFixed(1)
            : "0",
      }));

      // Context breakdown
      const contextBreakdown = byContext.map((c) => ({
        bucket: c.bucket,
        tokens: parseFloat(String(c.totalTokens ?? "0")),
        tokensDisplay: formatLargeNumber(
          parseFloat(String(c.totalTokens ?? "0")),
        ),
        requests: c.requests ?? 0,
        percentage:
          curTotal > 0
            ? (
                (parseFloat(String(c.totalTokens ?? "0")) / curTotal) *
                100
              ).toFixed(1)
            : "0",
      }));

      return {
        kpis: {
          totalTokens: {
            value: curTotal,
            display: formatLargeNumber(curTotal),
            delta: totalDelta,
          },
          inputTokens: {
            value: curInput,
            display: formatLargeNumber(curInput),
            delta: inputDelta,
          },
          outputTokens: {
            value: curOutput,
            display: formatLargeNumber(curOutput),
            delta: outputDelta,
          },
          totalCost: {
            value: curCost,
            display: formatCurrency(curCost),
            delta: costDelta,
          },
          avgTokensPerRun: {
            value: curAvgTokens,
            display: Math.round(curAvgTokens).toLocaleString(),
            delta: avgTokensDelta,
          },
          contextWindowUsed: {
            value: curContext,
            display: `${Math.round(curContext)}%`,
            delta: contextDelta,
          },
        },
        tokenOverTime: dailyData.map((d) => ({
          date: d.date,
          inputTokens: parseFloat(String(d.inputTokens)),
          outputTokens: parseFloat(String(d.outputTokens)),
        })),
        modelBreakdown,
        orgBreakdown,
        modelDetails: byModel.map((m) => ({
          modelName: m.modelName,
          provider: m.provider,
          runs: m.runs ?? 0,
          inputTokens: formatLargeNumber(
            parseFloat(String(m.inputTokens ?? "0")),
          ),
          outputTokens: formatLargeNumber(
            parseFloat(String(m.outputTokens ?? "0")),
          ),
          totalTokens: formatLargeNumber(
            parseFloat(String(m.totalTokens ?? "0")),
          ),
          costUsd: formatCurrency(parseFloat(String(m.costUsd ?? "0"))),
          avgTokensPerRun: (m.avgTokensPerRun ?? 0).toLocaleString(),
        })),
        agentBreakdown,
        contextBreakdown,
        insights: insights.map((i) => ({
          type: i.insightType,
          title: i.title,
          description: i.description,
          badge: i.badge,
        })),
      };
    }),

  // ── Seed demo data ────────────────────────────────────────────────────

  seedTokenUsageData: adminProtectedProcedure.mutation(async () => {
    devOnly("seedTokenUsageData");
    const existing = await db
      .select({ count: count() })
      .from(opsTokenDaily)
      .then((r) => r[0]?.count ?? 0);

    if (existing > 0) return { seeded: false, reason: "Data exists" };

    const now = new Date();

    // Seed daily data
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0]!;
      const input = 800000000 + Math.random() * 300000000;
      const output = 400000000 + Math.random() * 200000000;
      await db.insert(opsTokenDaily).values({
        date: dateStr,
        totalTokens: Math.round(input + output).toString(),
        inputTokens: Math.round(input).toString(),
        outputTokens: Math.round(output).toString(),
        totalCostUsd: (2500 + Math.random() * 500).toFixed(2),
        totalRuns: 150000 + Math.floor(Math.random() * 50000),
        avgTokensPerRun: Math.floor(30000 + Math.random() * 10000),
        avgContextWindowUsed: (35 + Math.random() * 15).toFixed(1),
      });
    }

    // Seed model data
    const models = [
      { modelName: "Claude 3.5 Sonnet", provider: "Anthropic" },
      { modelName: "GPT-4o", provider: "OpenAI" },
      { modelName: "Claude 3 Haiku", provider: "Anthropic" },
      { modelName: "GPT-4.1", provider: "OpenAI" },
      { modelName: "Gemini 1.5 Pro", provider: "Google" },
      { modelName: "Other Models", provider: "Various" },
    ];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0]!;
      for (const m of models) {
        const tokens = 100000000 + Math.floor(Math.random() * 500000000);
        await db.insert(opsTokenByModel).values({
          date: dateStr,
          ...m,
          runs: 2000 + Math.floor(Math.random() * 15000),
          inputTokens: Math.round(tokens * 0.65).toString(),
          outputTokens: Math.round(tokens * 0.35).toString(),
          totalTokens: tokens.toString(),
          costUsd: (500 + Math.random() * 2000).toFixed(2),
          avgTokensPerRun: Math.floor(tokens / (2000 + Math.random() * 15000)),
        });
      }
    }

    // Seed org data
    const orgs = [
      "Acme Solutions Ltd.",
      "Power Solutions Ltd.",
      "GTM Traders",
      "Bakau Traders Co.",
      "Ministry of Health",
      "Africell Gambia Ltd.",
      "Delta Shipping Co.",
    ];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0]!;
      for (const org of orgs) {
        await db.insert(opsTokenByOrg).values({
          date: dateStr,
          organizationName: org,
          runs: 500 + Math.floor(Math.random() * 3000),
          totalTokens: (
            100000000 + Math.floor(Math.random() * 400000000)
          ).toString(),
        });
      }
    }

    // Seed agent data
    const agents = [
      "Bookkeeping Agent",
      "Reconciliation Agent",
      "Invoice Processing Agent",
      "Tax Preparation Agent",
      "Document Understanding Agent",
      "Report Generation Agent",
    ];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0]!;
      for (const agent of agents) {
        await db.insert(opsTokenByAgent).values({
          date: dateStr,
          agentName: agent,
          runs: 500 + Math.floor(Math.random() * 3000),
          totalTokens: (
            50000000 + Math.floor(Math.random() * 300000000)
          ).toString(),
        });
      }
    }

    // Seed context data
    const buckets = ["0-25%", "25-50%", "50-75%", "75-100%"];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0]!;
      for (const bucket of buckets) {
        await db.insert(opsTokenByContext).values({
          date: dateStr,
          bucket,
          totalTokens: (
            200000000 + Math.floor(Math.random() * 600000000)
          ).toString(),
          requests: 30000 + Math.floor(Math.random() * 50000),
        });
      }
    }

    // Seed insights
    await db.insert(opsTokenInsights).values([
      {
        insightType: "increase",
        title: "Token usage increased 3.6% compared to the prior 7 days.",
        description: "Total tokens: 8.59B vs 8.30B",
        badge: "Increase",
        priority: 1,
      },
      {
        insightType: "attention",
        title: "Claude 3.5 Sonnet accounts for 42.1% of total tokens.",
        description: "Consider load balancing to optimize costs.",
        badge: "Attention",
        priority: 2,
      },
      {
        insightType: "info",
        title: "Average context window usage is 42%.",
        description: "You have room to increase context for better results.",
        badge: "Info",
        priority: 3,
      },
    ]);

    return { seeded: true };
  }),
});
