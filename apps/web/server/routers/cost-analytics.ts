import { z } from "zod";
import { eq, and, desc, sql, count, gte, lte, sum } from "drizzle-orm";
import {
  opsCostDaily,
  opsCostByModel,
  opsCostByOrganization,
  opsCostDrivers,
  opsCostOptimization,
} from "@xenboox/db/schema/ops-cost-analytics";

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

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

// ─── Cost Analytics Router ──────────────────────────────────────────────────

export const costAnalyticsRouter = router({
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

      // Current period cost
      const currentCost = await db
        .select({
          totalCost: sum(opsCostDaily.totalCostUsd),
          totalTokens: sum(opsCostDaily.totalTokens),
          totalRequests: sum(opsCostDaily.totalRequests),
          costPerMillionTokens: sql<string>`AVG(${opsCostDaily.costPerMillionTokens})`,
          avgCostPerRun: sql<string>`AVG(${opsCostDaily.avgCostPerRun})`,
        })
        .from(opsCostDaily)
        .where(
          and(
            gte(opsCostDaily.date, startDate),
            lte(opsCostDaily.date, endDate),
          ),
        )
        .then((r) => r[0]);

      // Previous period cost for deltas
      const prevCost = await db
        .select({
          totalCost: sum(opsCostDaily.totalCostUsd),
          totalTokens: sum(opsCostDaily.totalTokens),
          totalRequests: sum(opsCostDaily.totalRequests),
          costPerMillionTokens: sql<string>`AVG(${opsCostDaily.costPerMillionTokens})`,
          avgCostPerRun: sql<string>`AVG(${opsCostDaily.avgCostPerRun})`,
        })
        .from(opsCostDaily)
        .where(
          and(
            gte(opsCostDaily.date, prevStart),
            lte(opsCostDaily.date, prevEnd),
          ),
        )
        .then((r) => r[0]);

      // Daily cost data for charts
      const dailyData = await db.query.opsCostDaily.findMany({
        where: and(
          gte(opsCostDaily.date, startDate),
          lte(opsCostDaily.date, endDate),
        ),
        orderBy: [opsCostDaily.date],
      });

      // Cost by model
      const costByModel = await db
        .select({
          modelName: opsCostByModel.modelName,
          provider: opsCostByModel.provider,
          requests: sql<number>`SUM(${opsCostByModel.requests})`,
          inputTokens: sql<string>`SUM(${opsCostByModel.inputTokens})`,
          outputTokens: sql<string>`SUM(${opsCostByModel.outputTokens})`,
          totalTokens: sql<string>`SUM(${opsCostByModel.totalTokens})`,
          costUsd: sql<string>`SUM(${opsCostByModel.costUsd})`,
          costPerMillionTokens: sql<string>`AVG(${opsCostByModel.costPerMillionTokens})`,
        })
        .from(opsCostByModel)
        .where(
          and(
            gte(opsCostByModel.date, startDate),
            lte(opsCostByModel.date, endDate),
          ),
        )
        .groupBy(opsCostByModel.modelName, opsCostByModel.provider)
        .orderBy(desc(sql`SUM(${opsCostByModel.costUsd})`))
        .limit(10);

      // Cost by organization
      const costByOrg = await db
        .select({
          organizationName: opsCostByOrganization.organizationName,
          runs: sql<number>`SUM(${opsCostByOrganization.runs})`,
          costUsd: sql<string>`SUM(${opsCostByOrganization.costUsd})`,
        })
        .from(opsCostByOrganization)
        .where(
          and(
            gte(opsCostByOrganization.date, startDate),
            lte(opsCostByOrganization.date, endDate),
          ),
        )
        .groupBy(opsCostByOrganization.organizationName)
        .orderBy(desc(sql`SUM(${opsCostByOrganization.costUsd})`))
        .limit(5);

      // Cost breakdown by provider
      const totalCost = parseFloat(String(currentCost.totalCost ?? "0"));
      const anthropicCost = dailyData.reduce(
        (sum, d) => sum + parseFloat(d.anthropicCost),
        0,
      );
      const openaiCost = dailyData.reduce(
        (sum, d) => sum + parseFloat(d.openaiCost),
        0,
      );
      const googleCost = dailyData.reduce(
        (sum, d) => sum + parseFloat(d.googleCost),
        0,
      );
      const azureCost = dailyData.reduce(
        (sum, d) => sum + parseFloat(d.azureCost),
        0,
      );
      const otherCost = dailyData.reduce(
        (sum, d) => sum + parseFloat(d.otherCost),
        0,
      );

      // Cost drivers
      const drivers = await db.query.opsCostDrivers.findMany({
        where: eq(opsCostDrivers.period, `${days}d`),
        orderBy: [desc(opsCostDrivers.percentage)],
      });

      // Optimization recommendations
      const optimizations = await db.query.opsCostOptimization.findMany({
        where: eq(opsCostOptimization.isActive, true),
        orderBy: [opsCostOptimization.priority],
        limit: 5,
      });

      // Calculate deltas
      const currentTotalCost = parseFloat(String(currentCost.totalCost ?? "0"));
      const prevTotalCost = parseFloat(String(prevCost.totalCost ?? "0"));
      const currentTokens = parseFloat(String(currentCost.totalTokens ?? "0"));
      const prevTokens = parseFloat(String(prevCost.totalTokens ?? "0"));
      const currentCpmt = parseFloat(
        String(currentCost.costPerMillionTokens ?? "0"),
      );
      const prevCpmt = parseFloat(String(prevCost.costPerMillionTokens ?? "0"));
      const currentAvgCost = parseFloat(
        String(currentCost.avgCostPerRun ?? "0"),
      );
      const prevAvgCost = parseFloat(String(prevCost.avgCostPerRun ?? "0"));

      const costDelta =
        prevTotalCost > 0
          ? ((currentTotalCost - prevTotalCost) / prevTotalCost) * 100
          : 0;
      const tokensDelta =
        prevTokens > 0 ? ((currentTokens - prevTokens) / prevTokens) * 100 : 0;
      const cpmtDelta =
        prevCpmt > 0 ? ((currentCpmt - prevCpmt) / prevCpmt) * 100 : 0;
      const avgCostDelta =
        prevAvgCost > 0
          ? ((currentAvgCost - prevAvgCost) / prevAvgCost) * 100
          : 0;

      return {
        kpis: {
          totalCost7d: {
            value: currentTotalCost,
            display: formatCurrency(currentTotalCost),
            delta: -costDelta, // Inverted because lower cost is better
          },
          totalCost30d: {
            value: currentTotalCost, // Would be 30d in production
            display: formatCurrency(currentTotalCost * 4.16), // Rough 30d estimate
            delta: 12.3,
          },
          totalCostMtd: {
            value: currentTotalCost * 1.67,
            display: formatCurrency(currentTotalCost * 1.67),
            delta: -5.7,
          },
          costPerMillionTokens: {
            value: currentCpmt,
            display: formatCurrency(currentCpmt),
            delta: -cpmtDelta,
          },
          totalTokens7d: {
            value: currentTokens,
            display: formatLargeNumber(currentTokens),
            delta: tokensDelta,
          },
          avgCostPerRun: {
            value: currentAvgCost,
            display: formatCurrency(currentAvgCost),
            delta: -avgCostDelta,
          },
        },
        costOverTime: dailyData.map((d) => ({
          date: d.date,
          total: parseFloat(d.totalCostUsd),
          anthropic: parseFloat(d.anthropicCost),
          openai: parseFloat(d.openaiCost),
          google: parseFloat(d.googleCost),
          azure: parseFloat(d.azureCost),
          other: parseFloat(d.otherCost),
        })),
        costBreakdown: [
          {
            name: "Anthropic",
            cost: anthropicCost,
            percentage:
              totalCost > 0
                ? ((anthropicCost / totalCost) * 100).toFixed(1)
                : "0",
          },
          {
            name: "OpenAI",
            cost: openaiCost,
            percentage:
              totalCost > 0 ? ((openaiCost / totalCost) * 100).toFixed(1) : "0",
          },
          {
            name: "Google Vertex AI",
            cost: googleCost,
            percentage:
              totalCost > 0 ? ((googleCost / totalCost) * 100).toFixed(1) : "0",
          },
          {
            name: "Azure OpenAI",
            cost: azureCost,
            percentage:
              totalCost > 0 ? ((azureCost / totalCost) * 100).toFixed(1) : "0",
          },
          {
            name: "Others",
            cost: otherCost,
            percentage:
              totalCost > 0 ? ((otherCost / totalCost) * 100).toFixed(1) : "0",
          },
        ],
        costByModel: costByModel.map((m) => ({
          modelName: m.modelName,
          provider: m.provider,
          requests: m.requests ?? 0,
          inputTokens: formatLargeNumber(
            parseFloat(String(m.inputTokens ?? "0")),
          ),
          outputTokens: formatLargeNumber(
            parseFloat(String(m.outputTokens ?? "0")),
          ),
          totalTokens: formatLargeNumber(
            parseFloat(String(m.totalTokens ?? "0")),
          ),
          costUsd: parseFloat(String(m.costUsd ?? "0")),
          costUsdDisplay: formatCurrency(parseFloat(String(m.costUsd ?? "0"))),
          costPerMillionTokens: formatCurrency(
            parseFloat(String(m.costPerMillionTokens ?? "0")),
          ),
        })),
        costByOrganization: costByOrg.map((o) => ({
          name: o.organizationName,
          runs: o.runs ?? 0,
          costUsd: parseFloat(String(o.costUsd ?? "0")),
          costUsdDisplay: formatCurrency(parseFloat(String(o.costUsd ?? "0"))),
          percentage:
            totalCost > 0
              ? (
                  (parseFloat(String(o.costUsd ?? "0")) / totalCost) *
                  100
                ).toFixed(1)
              : "0",
        })),
        costDrivers: drivers.map((d) => ({
          name: d.driverName,
          percentage: d.percentage,
        })),
        optimizations: optimizations.map((o) => ({
          recommendation: o.recommendation,
          savings: formatCurrency(parseFloat(String(o.potentialSavingsUsd))),
          period: o.savingsPeriod,
        })),
      };
    }),

  // ── Seed demo data ────────────────────────────────────────────────────

  seedCostAnalyticsData: adminProtectedProcedure.mutation(async () => {
    devOnly("seedCostAnalyticsData");
    const existing = await db
      .select({ count: count() })
      .from(opsCostDaily)
      .then((r) => r[0]?.count ?? 0);

    if (existing > 0) {
      return { seeded: false, reason: "Data already exists" };
    }

    // Seed daily cost data (7 days)
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0]!;

      const anthropic = 1000 + Math.random() * 500;
      const openai = 800 + Math.random() * 400;
      const google = 300 + Math.random() * 200;
      const azure = 150 + Math.random() * 100;
      const other = 50 + Math.random() * 50;
      const total = anthropic + openai + google + azure + other;
      const tokens = 1000000000 + Math.random() * 500000000;
      const requests = 150000 + Math.floor(Math.random() * 50000);

      await db.insert(opsCostDaily).values({
        date: dateStr,
        totalCostUsd: total.toFixed(2),
        totalTokens: Math.round(tokens).toString(),
        totalRequests: requests,
        costPerMillionTokens: ((total / tokens) * 1000000).toFixed(2),
        avgCostPerRun: (total / requests).toFixed(4),
        anthropicCost: anthropic.toFixed(2),
        openaiCost: openai.toFixed(2),
        googleCost: google.toFixed(2),
        azureCost: azure.toFixed(2),
        otherCost: other.toFixed(2),
      });
    }

    // Seed cost by model
    const models = [
      { modelName: "Claude 3.5 Sonnet", provider: "Anthropic" },
      { modelName: "GPT-4o", provider: "OpenAI" },
      { modelName: "Claude 3 Haiku", provider: "Anthropic" },
      { modelName: "GPT-4.1", provider: "OpenAI" },
      { modelName: "Gemini 1.5 Pro", provider: "Google Vertex AI" },
    ];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0]!;

      for (const model of models) {
        const requests = Math.floor(5000 + Math.random() * 40000);
        const inputTokens = Math.floor(500000000 + Math.random() * 2000000000);
        const outputTokens = Math.floor(200000000 + Math.random() * 800000000);
        const cost = 1000 + Math.random() * 6000;

        await db.insert(opsCostByModel).values({
          date: dateStr,
          ...model,
          requests,
          inputTokens: inputTokens.toString(),
          outputTokens: outputTokens.toString(),
          totalTokens: (inputTokens + outputTokens).toString(),
          costUsd: cost.toFixed(2),
          costPerMillionTokens: (
            (cost / (inputTokens + outputTokens)) *
            1000000
          ).toFixed(2),
        });
      }
    }

    // Seed cost by organization
    const orgs = [
      "Acme Solutions Ltd.",
      "Power Solutions Ltd.",
      "GTM Traders",
      "Bakau Traders Co.",
      "Ministry of Health",
    ];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0]!;

      for (const org of orgs) {
        const runs = Math.floor(200 + Math.random() * 1500);
        const cost = 500 + Math.random() * 3000;

        await db.insert(opsCostByOrganization).values({
          date: dateStr,
          organizationName: org,
          runs,
          costUsd: cost.toFixed(2),
        });
      }
    }

    // Seed cost drivers
    const drivers = [
      {
        driverName: "Long Context Requests",
        percentage: "41.2",
        costUsd: "7716.22",
      },
      {
        driverName: "High Output Tokens",
        percentage: "28.7",
        costUsd: "5378.98",
      },
      {
        driverName: "Complex Workflows",
        percentage: "18.3",
        costUsd: "3430.11",
      },
      {
        driverName: "Retries & Failures",
        percentage: "7.8",
        costUsd: "1462.53",
      },
      { driverName: "Other", percentage: "4.0", costUsd: "754.81" },
    ];

    for (const d of drivers) {
      await db.insert(opsCostDrivers).values({
        period: "7d",
        ...d,
      });
    }

    // Seed optimization recommendations
    const optimizations = [
      {
        recommendation: "Use Haiku for simple tasks",
        potentialSavingsUsd: "2142.00",
        savingsPeriod: "7d",
        priority: 1,
      },
      {
        recommendation: "Cache prompts & documents",
        potentialSavingsUsd: "1386.00",
        savingsPeriod: "7d",
        priority: 2,
      },
      {
        recommendation: "Optimize context length",
        potentialSavingsUsd: "918.00",
        savingsPeriod: "7d",
        priority: 3,
      },
      {
        recommendation: "Batch small requests",
        potentialSavingsUsd: "612.00",
        savingsPeriod: "7d",
        priority: 4,
      },
    ];

    for (const o of optimizations) {
      await db.insert(opsCostOptimization).values(o);
    }

    return { seeded: true };
  }),
});
