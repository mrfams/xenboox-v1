import { z } from "zod";
import { eq, and, desc, sql, count, gte, lte } from "drizzle-orm";
import {
  opsSystemHealth,
  opsMetricsDaily,
  opsAiRuns,
  opsSupportTickets,
  opsActivityFeed,
  opsModelUsageDaily,
} from "@xenboox/db/schema/ops-console";
import { organizations } from "@xenboox/db/schema/organization";
import { users } from "@xenboox/db/schema/auth";

import { db } from "@/lib/db";
import { router, adminProtectedProcedure } from "@/lib/trpc/server";

// ─── Helper: compute date range strings ─────────────────────────────────────

function getDateRange(days: number): { startDate: string; endDate: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0]!;
  const start = new Date(now.getTime() - days * 86400000)
    .toISOString()
    .split("T")[0]!;
  return { startDate: start, endDate: end };
}

function formatCurrency(amount: number, currency = "GMD"): string {
  return `${currency} ${amount.toLocaleString()}`;
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// ─── Ops Console Router ─────────────────────────────────────────────────────

export const opsConsoleRouter = router({
  // ── Dashboard Overview ────────────────────────────────────────────────
  // Returns all KPI data for the main dashboard

  getDashboardOverview: adminProtectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          days: z.number().min(1).max(90).default(7),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const days = input?.days ?? 7;
      const { startDate, endDate } = input?.startDate
        ? {
            startDate: input.startDate,
            endDate: input.endDate ?? new Date().toISOString().split("T")[0]!,
          }
        : getDateRange(days);

      // Get latest metrics
      const latestMetrics = await db.query.opsMetricsDaily.findFirst({
        orderBy: [desc(opsMetricsDaily.date)],
      });

      // Get metrics from previous period for delta calculations
      const previousMetrics = await db.query.opsMetricsDaily.findFirst({
        where: lte(opsMetricsDaily.date, startDate),
        orderBy: [desc(opsMetricsDaily.date)],
      });

      // Get chart data for the period
      const chartData = await db.query.opsMetricsDaily.findMany({
        where: and(
          gte(opsMetricsDaily.date, startDate),
          lte(opsMetricsDaily.date, endDate),
        ),
        orderBy: [opsMetricsDaily.date],
      });

      // System health summary
      const healthServices = await db.query.opsSystemHealth.findMany({
        orderBy: [opsSystemHealth.serviceName],
      });

      const allOperational = healthServices.every(
        (s) => s.status === "operational",
      );
      const overallUptime =
        healthServices.length > 0
          ? healthServices.reduce(
              (sum, s) => sum + parseFloat(s.uptimePercent),
              0,
            ) / healthServices.length
          : 100;

      // Support tickets summary
      const openTickets = await db
        .select({ count: count() })
        .from(opsSupportTickets)
        .where(eq(opsSupportTickets.status, "open"))
        .then((r) => r[0]?.count ?? 0);

      const ticketSeverities = await db
        .select({
          severity: opsSupportTickets.severity,
          count: count(),
        })
        .from(opsSupportTickets)
        .where(eq(opsSupportTickets.status, "open"))
        .groupBy(opsSupportTickets.severity);

      const severityMap: Record<string, number> = {
        high: 0,
        medium: 0,
        low: 0,
        critical: 0,
      };
      for (const row of ticketSeverities) {
        severityMap[row.severity] = row.count;
      }

      // Previous period values for deltas
      const prevOrgs = previousMetrics?.activeOrganizations ?? 0;
      const prevMrr = parseFloat(previousMetrics?.mrr ?? "0");
      const prevAiRuns = previousMetrics?.aiRuns ?? 0;
      const prevCost = parseFloat(previousMetrics?.totalCost ?? "0");
      const prevMargin = parseFloat(previousMetrics?.grossMargin ?? "0");

      return {
        kpis: {
          activeOrganizations: {
            value: latestMetrics?.activeOrganizations ?? 0,
            delta: percentChange(
              latestMetrics?.activeOrganizations ?? 0,
              prevOrgs,
            ),
            vsLastWeek: `vs last week`,
          },
          mrr: {
            value: latestMetrics?.mrr ?? "0",
            displayValue: formatCurrency(parseFloat(latestMetrics?.mrr ?? "0")),
            delta: parseFloat(latestMetrics?.mrrDeltaPercent ?? "0"),
            vsLastWeek: `vs last week`,
          },
          aiRuns: {
            value: latestMetrics?.aiRuns ?? 0,
            delta: parseFloat(latestMetrics?.aiRunsDeltaPercent ?? "0"),
            vsLastWeek: `vs last week`,
          },
          totalCost: {
            value: latestMetrics?.totalCost ?? "0",
            displayValue: formatCurrency(
              parseFloat(latestMetrics?.totalCost ?? "0"),
            ),
            delta: parseFloat(latestMetrics?.totalCostDeltaPercent ?? "0"),
            vsLastWeek: `vs last week`,
          },
          grossMargin: {
            value: latestMetrics?.grossMargin ?? "0",
            displayValue: `${latestMetrics?.grossMargin ?? "0"}%`,
            delta: parseFloat(latestMetrics?.grossMarginDeltaPercent ?? "0"),
            vsLastWeek: `vs last week`,
          },
        },
        systemHealth: {
          allOperational,
          uptimePercent: overallUptime.toFixed(1),
          services: healthServices.map((s) => ({
            name: s.displayName,
            status: s.status,
          })),
        },
        aiMetrics: {
          successRate: latestMetrics?.aiSuccessRate ?? "0",
          avgResponseTime: latestMetrics?.avgResponseTimeMs ?? "0",
        },
        supportTickets: {
          total: openTickets,
          bySeverity: severityMap,
        },
        chartData: chartData.map((d) => ({
          date: d.date,
          activeOrgs: d.activeOrganizations,
          mrr: parseFloat(d.mrr),
          aiRuns: d.aiRuns,
          totalCost: parseFloat(d.totalCost),
          grossMargin: parseFloat(d.grossMargin),
          aiSuccessRate: parseFloat(d.aiSuccessRate),
          avgResponseTimeMs: parseFloat(d.avgResponseTimeMs),
        })),
      };
    }),

  // ── System Health ─────────────────────────────────────────────────────

  getSystemHealth: adminProtectedProcedure.query(async () => {
    const services = await db.query.opsSystemHealth.findMany({
      orderBy: [opsSystemHealth.serviceName],
    });

    const allOperational = services.every((s) => s.status === "operational");
    const overallUptime =
      services.length > 0
        ? services.reduce((sum, s) => sum + parseFloat(s.uptimePercent), 0) /
          services.length
        : 100;

    return {
      allOperational,
      uptimePercent: overallUptime.toFixed(1),
      services: services.map((s) => ({
        id: s.id,
        name: s.displayName,
        serviceName: s.serviceName,
        status: s.status,
        uptimePercent: s.uptimePercent,
        lastCheckedAt: s.lastCheckedAt,
        incidentCount: s.incidentCount,
      })),
    };
  }),

  updateServiceHealth: adminProtectedProcedure
    .input(
      z.object({
        serviceName: z.string(),
        status: z.enum(["operational", "degraded", "outage", "maintenance"]),
        uptimePercent: z.number().min(0).max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(opsSystemHealth)
        .set({
          status: input.status,
          ...(input.uptimePercent !== undefined && {
            uptimePercent: input.uptimePercent.toString(),
          }),
          lastCheckedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(opsSystemHealth.serviceName, input.serviceName))
        .returning();

      if (!updated) {
        // Create if doesn't exist
        await db.insert(opsSystemHealth).values({
          serviceName: input.serviceName,
          displayName: input.serviceName,
          status: input.status,
          uptimePercent: (input.uptimePercent ?? 100).toString(),
        });
      }

      return { success: true };
    }),

  // ── AI Runs Over Time ────────────────────────────────────────────────

  getAiRunsOverTime: adminProtectedProcedure
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

      const runs = await db
        .select({
          date: opsAiRuns.date,
          count: count(),
        })
        .from(opsAiRuns)
        .where(
          and(gte(opsAiRuns.date, startDate), lte(opsAiRuns.date, endDate)),
        )
        .groupBy(opsAiRuns.date)
        .orderBy(opsAiRuns.date);

      return runs.map((r) => ({
        date: r.date,
        runs: r.count,
      }));
    }),

  // ── Cost Over Time ───────────────────────────────────────────────────

  getCostOverTime: adminProtectedProcedure
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

      const costs = await db
        .select({
          date: opsMetricsDaily.date,
          totalCost: opsMetricsDaily.totalCost,
        })
        .from(opsMetricsDaily)
        .where(
          and(
            gte(opsMetricsDaily.date, startDate),
            lte(opsMetricsDaily.date, endDate),
          ),
        )
        .orderBy(opsMetricsDaily.date);

      return costs.map((c) => ({
        date: c.date,
        cost: parseFloat(c.totalCost),
      }));
    }),

  // ── Top AI Models by Usage ───────────────────────────────────────────

  getTopModels: adminProtectedProcedure
    .input(
      z
        .object({
          days: z.number().min(1).max(90).default(7),
          limit: z.number().min(1).max(20).default(5),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const days = input?.days ?? 7;
      const limit = input?.limit ?? 5;
      const { startDate, endDate } = getDateRange(days);

      const modelUsage = await db
        .select({
          modelName: opsModelUsageDaily.modelName,
          totalRuns: sql<number>`SUM(${opsModelUsageDaily.runCount})`,
          totalCost: sql<string>`SUM(${opsModelUsageDaily.totalCostUsd})`,
        })
        .from(opsModelUsageDaily)
        .where(
          and(
            gte(opsModelUsageDaily.date, startDate),
            lte(opsModelUsageDaily.date, endDate),
          ),
        )
        .groupBy(opsModelUsageDaily.modelName)
        .orderBy(desc(sql`SUM(${opsModelUsageDaily.runCount})`))
        .limit(limit);

      const totalRuns = modelUsage.reduce(
        (sum, m) => sum + (m.totalRuns ?? 0),
        0,
      );

      return modelUsage.map((m) => ({
        modelName: m.modelName,
        runs: m.totalRuns ?? 0,
        cost: parseFloat(m.totalCost ?? "0"),
        percentage: totalRuns > 0 ? ((m.totalRuns ?? 0) / totalRuns) * 100 : 0,
      }));
    }),

  // ── Support Tickets ──────────────────────────────────────────────────

  getSupportTickets: adminProtectedProcedure
    .input(
      z
        .object({
          status: z
            .enum(["open", "in_progress", "resolved", "closed"])
            .optional(),
          severity: z.enum(["low", "medium", "high", "critical"]).optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input?.status)
        conditions.push(eq(opsSupportTickets.status, input.status));
      if (input?.severity)
        conditions.push(eq(opsSupportTickets.severity, input.severity));

      const tickets = await db.query.opsSupportTickets.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(opsSupportTickets.createdAt)],
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
      });

      const total = await db
        .select({ count: count() })
        .from(opsSupportTickets)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .then((r) => r[0]?.count ?? 0);

      return { items: tickets, total };
    }),

  // ── Activity Feed ────────────────────────────────────────────────────

  getActivityFeed: adminProtectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const activities = await db.query.opsActivityFeed.findMany({
        orderBy: [desc(opsActivityFeed.createdAt)],
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
      });

      const total = await db
        .select({ count: count() })
        .from(opsActivityFeed)
        .then((r) => r[0]?.count ?? 0);

      return { items: activities, total };
    }),

  // ── Seed demo data (development only) ────────────────────────────────

  seedDemoData: adminProtectedProcedure.mutation(async () => {
    // Only seed if tables are empty
    const existingHealth = await db
      .select({ count: count() })
      .from(opsSystemHealth)
      .then((r) => r[0]?.count ?? 0);

    if (existingHealth > 0) {
      return { seeded: false, reason: "Data already exists" };
    }

    // Seed system health
    const services = [
      { serviceName: "api-gateway", displayName: "API Gateway" },
      { serviceName: "ai-orchestrator", displayName: "AI Orchestrator" },
      { serviceName: "database", displayName: "Database" },
      { serviceName: "storage", displayName: "Storage" },
      { serviceName: "worker-queue", displayName: "Worker Queue" },
    ];

    for (const svc of services) {
      await db.insert(opsSystemHealth).values({
        ...svc,
        status: "operational",
        uptimePercent: "100.00",
      });
    }

    // Seed 7 days of metrics
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0]!;

      const baseOrgs = 1200 + Math.floor(Math.random() * 100);
      const baseMrr = 700000 + Math.floor(Math.random() * 100000);
      const baseAiRuns = 120000 + Math.floor(Math.random() * 30000);
      const baseCost = 40000 + Math.floor(Math.random() * 10000);

      await db.insert(opsMetricsDaily).values({
        date: dateStr,
        activeOrganizations: baseOrgs,
        activeOrganizationsDelta: Math.floor(Math.random() * 50) - 20,
        mrr: baseMrr.toString(),
        mrrCurrency: "GMD",
        mrrDeltaPercent: (Math.random() * 10 - 3).toFixed(2),
        aiRuns: baseAiRuns,
        aiRunsDeltaPercent: (Math.random() * 20 - 5).toFixed(2),
        totalCost: baseCost.toString(),
        totalCostDeltaPercent: (Math.random() * 6 - 4).toFixed(2),
        grossMargin: (60 + Math.random() * 15).toFixed(2),
        grossMarginDeltaPercent: (Math.random() * 8 - 2).toFixed(2),
        aiSuccessRate: (97 + Math.random() * 2.5).toFixed(2),
        avgResponseTimeMs: (2000 + Math.random() * 800).toFixed(2),
        openSupportTickets: Math.floor(Math.random() * 30) + 10,
      });
    }

    // Seed model usage
    const models = [
      {
        modelId: "claude-sonnet-4-6",
        modelName: "Claude 3.5 Sonnet",
        provider: "anthropic",
      },
      { modelId: "gpt-4o", modelName: "GPT-4o", provider: "openai" },
      {
        modelId: "claude-haiku-4-5",
        modelName: "Claude 3 Haiku",
        provider: "anthropic",
      },
      { modelId: "gpt-4.1", modelName: "GPT-4.1", provider: "openai" },
      {
        modelId: "deepseek-v4-pro",
        modelName: "DeepSeek V4 Pro",
        provider: "deepseek",
      },
    ];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0]!;

      for (const model of models) {
        const runs = Math.floor(Math.random() * 20000) + 5000;
        await db.insert(opsModelUsageDaily).values({
          date: dateStr,
          ...model,
          runCount: runs,
          totalInputTokens: runs * 500,
          totalOutputTokens: runs * 200,
          totalCostUsd: (runs * 0.003).toFixed(4),
          avgLatencyMs: Math.floor(300 + Math.random() * 1000),
          successRate: (93 + Math.random() * 6).toFixed(2),
        });
      }
    }

    // Seed support tickets
    const ticketSubjects = [
      "Bank reconciliation not matching",
      "Invoice OCR failing on scanned documents",
      "Mobile money import timeout",
      "Report export showing incorrect totals",
      "User cannot access payroll module",
    ];

    for (let i = 0; i < 5; i++) {
      await db.insert(opsSupportTickets).values({
        ticketNumber: `SUP-${String(1000 + i).padStart(4, "0")}`,
        subject: ticketSubjects[i]!,
        description: `Customer reported issue with ${ticketSubjects[i]?.toLowerCase()}`,
        severity: (["high", "medium", "low", "medium", "high"] as const)[i],
        status: "open",
        organizationName: [
          "Acme Solutions",
          "Bakau Traders",
          "Power Solutions",
          "Gambia Foods",
          "Senegal Exports",
        ][i],
      });
    }

    // Seed activity feed
    const activities = [
      {
        type: "bank_reconciliation" as const,
        title: "Bank reconciliation completed",
        entityName: "Acme Solutions Ltd.",
        actorName: "AI Agent",
      },
      {
        type: "ai_model_updated" as const,
        title: "AI model updated",
        entityName: "Claude 3.5 Sonnet",
        actorName: "System",
      },
      {
        type: "organization_created" as const,
        title: "New organization created",
        entityName: "Bakau Traders Co.",
        actorName: "Admin",
      },
      {
        type: "error_detected" as const,
        title: "High error rate detected",
        entityName: "OCR Service",
        actorName: "Monitor",
      },
      {
        type: "invoice_processed" as const,
        title: "Invoice processing completed",
        entityName: "Power Solutions Ltd.",
        actorName: "AI Agent",
      },
    ];

    for (let i = 0; i < activities.length; i++) {
      const minsAgo = [2, 15, 32, 45, 60][i]!;
      await db.insert(opsActivityFeed).values({
        activityType: activities[i].type,
        title: activities[i].title,
        entityName: activities[i].entityName,
        actorName: activities[i].actorName,
        createdAt: new Date(Date.now() - minsAgo * 60000),
      });
    }

    return { seeded: true };
  }),
});
