import { z } from "zod";
import { eq, and, desc, sql, count, gte, lte } from "drizzle-orm";
import {
  opsAgentHealth,
  opsAgentRunsHourly,
  opsAgentAlerts,
  opsSystemResources,
  opsAgentActivity,
  opsWorkloadDistribution,
} from "@xenboox/db/schema/ops-agent-monitor";

import { router, adminProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";

// ─── Helper: compute hour range strings ─────────────────────────────────────

function getHourRange(hours: number): { startHour: string; endHour: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 13).replace("T", " ") + ":00";
  const start =
    new Date(now.getTime() - hours * 3600000)
      .toISOString()
      .slice(0, 13)
      .replace("T", " ") + ":00";
  return { startHour: start, endHour: end };
}

// ─── Agent Monitor Router ───────────────────────────────────────────────────

export const agentMonitorRouter = router({
  // ── Agent Monitor Overview ────────────────────────────────────────────
  // Returns all data for the AI Agent Monitor page

  getOverview: adminProcedure
    .input(
      z
        .object({
          hours: z.number().min(1).max(168).default(24),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const hours = input?.hours ?? 24;

      // Get all agents
      const allAgents = await db.query.opsAgentHealth.findMany({
        orderBy: [desc(opsAgentHealth.healthScore)],
      });

      const totalAgents = allAgents.length;
      const activeAgents = allAgents.filter((a) => a.isActive).length;
      const healthyCount = allAgents.filter(
        (a) => a.status === "healthy",
      ).length;
      const warningCount = allAgents.filter(
        (a) => a.status === "warning",
      ).length;
      const criticalCount = allAgents.filter(
        (a) => a.status === "critical",
      ).length;

      // Aggregate metrics
      const totalRuns24h = allAgents.reduce(
        (sum, a) => sum + a.totalRuns24h,
        0,
      );
      const totalErrors24h = allAgents.reduce((sum, a) => sum + a.errors24h, 0);
      const avgSuccessRate =
        totalAgents > 0
          ? allAgents.reduce((sum, a) => sum + parseFloat(a.successRate), 0) /
            totalAgents
          : 0;
      const avgLatency =
        totalAgents > 0
          ? Math.round(
              allAgents.reduce((sum, a) => sum + a.avgLatencyMs, 0) /
                totalAgents,
            )
          : 0;
      const errorRate =
        totalRuns24h > 0 ? (totalErrors24h / totalRuns24h) * 100 : 0;

      // Task counts
      const tasksRunning = allAgents.reduce(
        (sum, a) => sum + (a.tasksRunning ?? 0),
        0,
      );
      const tasksCompleted = allAgents.reduce(
        (sum, a) => sum + (a.tasksCompleted ?? 0),
        0,
      );
      const tasksReview = allAgents.reduce(
        (sum, a) => sum + (a.tasksReview ?? 0),
        0,
      );
      const humanReviewCount = allAgents.reduce(
        (sum, a) => sum + (a.humanReviewCount ?? 0),
        0,
      );
      const timeSavedHours = allAgents.reduce(
        (sum, a) => sum + parseFloat(a.timeSavedHours ?? "0"),
        0,
      );

      // Get hourly runs data for charts
      const { startHour, endHour } = getHourRange(hours);
      const hourlyRuns = await db
        .select({
          hour: opsAgentRunsHourly.hour,
          runs: sql<number>`SUM(${opsAgentRunsHourly.runs})`,
          successCount: sql<number>`SUM(${opsAgentRunsHourly.successCount})`,
        })
        .from(opsAgentRunsHourly)
        .where(
          and(
            gte(opsAgentRunsHourly.hour, startHour),
            lte(opsAgentRunsHourly.hour, endHour),
          ),
        )
        .groupBy(opsAgentRunsHourly.hour)
        .orderBy(opsAgentRunsHourly.hour);

      // Runs by agent type (category)
      const runsByCategory = await db
        .select({
          category: opsAgentHealth.category,
          totalRuns: sql<number>`SUM(${opsAgentHealth.totalRuns24h})`,
        })
        .from(opsAgentHealth)
        .groupBy(opsAgentHealth.category)
        .orderBy(desc(sql`SUM(${opsAgentHealth.totalRuns24h})`));

      const totalRunsByCategory = runsByCategory.reduce(
        (sum, r) => sum + (r.totalRuns ?? 0),
        0,
      );

      // Recent alerts
      const recentAlerts = await db.query.opsAgentAlerts.findMany({
        orderBy: [desc(opsAgentAlerts.createdAt)],
        limit: 10,
      });

      // System resources
      const latestResources = await db.query.opsSystemResources.findFirst({
        orderBy: [desc(opsSystemResources.createdAt)],
      });

      // Workload distribution
      const workloadData = await db.query.opsWorkloadDistribution.findFirst({
        orderBy: [desc(opsWorkloadDistribution.createdAt)],
      });

      // Recent activity
      const recentActivity = await db.query.opsAgentActivity.findMany({
        orderBy: [desc(opsAgentActivity.createdAt)],
        limit: 10,
      });

      // Top performing agents
      const topPerformers = allAgents
        .sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate))
        .slice(0, 5)
        .map((a) => ({
          name: a.displayName,
          successRate: a.successRate,
        }));

      return {
        summary: {
          totalAgents,
          activeAgents,
          activePercent:
            totalAgents > 0
              ? ((activeAgents / totalAgents) * 100).toFixed(1)
              : "0",
          totalRuns24h,
          tasksRunning,
          tasksCompleted,
          tasksReview,
          humanReviewCount,
          successRate: avgSuccessRate.toFixed(1),
          errorRate: errorRate.toFixed(1),
          avgLatency: (avgLatency / 1000).toFixed(2),
          timeSavedHours: timeSavedHours.toFixed(1),
          healthCounts: {
            healthy: healthyCount,
            warning: warningCount,
            critical: criticalCount,
          },
        },
        agents: allAgents.map((a) => ({
          id: a.id,
          name: a.agentName,
          displayName: a.displayName,
          category: a.category,
          status: a.status,
          healthScore: a.healthScore,
          successRate: a.successRate,
          runs24h: a.totalRuns24h,
          errors24h: a.errors24h,
          avgLatencyMs: a.avgLatencyMs,
          avgLatency: (a.avgLatencyMs / 1000).toFixed(2),
          trendData: (a.trendData as number[]) ?? [],
          lastRunAt: a.lastRunAt,
          isActive: a.isActive,
          currentTask: a.currentTask,
          currentTaskProgress: a.currentTaskProgress,
          currentTaskEta: a.currentTaskEta,
          currentTaskStartedAt: a.currentTaskStartedAt,
          model: a.model,
          toolsCount: a.toolsCount,
          memoryUsageGb: a.memoryUsageGb,
          tasksRunning: a.tasksRunning,
          tasksCompleted: a.tasksCompleted,
          tasksReview: a.tasksReview,
          tasksFailed: a.tasksFailed,
        })),
        hourlyRuns: hourlyRuns.map((r) => ({
          hour: r.hour,
          runs: r.runs ?? 0,
          successRate:
            (r.runs ?? 0) > 0
              ? ((r.successCount ?? 0) / (r.runs ?? 1)) * 100
              : 100,
        })),
        runsByCategory: runsByCategory.map((r) => ({
          category: r.category,
          runs: r.totalRuns ?? 0,
          percentage:
            totalRunsByCategory > 0
              ? (((r.totalRuns ?? 0) / totalRunsByCategory) * 100).toFixed(1)
              : "0",
        })),
        totalRunsByCategory,
        recentAlerts: recentAlerts.map((a) => ({
          id: a.id,
          agentName: a.agentName,
          alertType: a.alertType,
          severity: a.severity,
          title: a.title,
          description: a.description,
          createdAt: a.createdAt,
        })),
        systemResources: latestResources
          ? {
              cpuUsagePercent: latestResources.cpuUsagePercent,
              cpuCores: latestResources.cpuCores,
              memoryUsagePercent: latestResources.memoryUsagePercent,
              memoryTotalGb: latestResources.memoryTotalGb,
              workerQueueJobs: latestResources.workerQueueJobs,
              allSystemsOperational: latestResources.allSystemsOperational,
              activeWorkflows: latestResources.activeWorkflows,
              queueLength: latestResources.queueLength,
            }
          : null,
        workload: workloadData
          ? {
              completed: workloadData.completed,
              inProgress: workloadData.inProgress,
              review: workloadData.review,
              scheduled: workloadData.scheduled,
              failed: workloadData.failed,
              totalTasks: workloadData.totalTasks,
            }
          : null,
        topPerformers,
        recentActivity: recentActivity.map((a) => ({
          id: a.id,
          agentName: a.agentName,
          activityType: a.activityType,
          title: a.title,
          description: a.description,
          createdAt: a.createdAt,
        })),
      };
    }),

  // ── List All Agents ──────────────────────────────────────────────────

  listAgents: adminProcedure
    .input(
      z
        .object({
          status: z
            .enum(["healthy", "warning", "critical", "offline"])
            .optional(),
          category: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input?.status)
        conditions.push(eq(opsAgentHealth.status, input.status));
      if (input?.category)
        conditions.push(eq(opsAgentHealth.category, input.category as any));

      const agents = await db.query.opsAgentHealth.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(opsAgentHealth.healthScore)],
        limit: input?.limit ?? 50,
      });

      return agents.map((a) => ({
        id: a.id,
        name: a.agentName,
        displayName: a.displayName,
        category: a.category,
        status: a.status,
        healthScore: a.healthScore,
        successRate: a.successRate,
        runs24h: a.totalRuns24h,
        errors24h: a.errors24h,
        avgLatencyMs: a.avgLatencyMs,
        avgLatency: (a.avgLatencyMs / 1000).toFixed(2),
        trendData: (a.trendData as number[]) ?? [],
        lastRunAt: a.lastRunAt,
        isActive: a.isActive,
        currentTask: a.currentTask,
        currentTaskProgress: a.currentTaskProgress,
        currentTaskEta: a.currentTaskEta,
        model: a.model,
        toolsCount: a.toolsCount,
        memoryUsageGb: a.memoryUsageGb,
      }));
    }),

  // ── Get Agent Runs Over Time ─────────────────────────────────────────

  getRunsOverTime: adminProcedure
    .input(
      z
        .object({
          hours: z.number().min(1).max(168).default(24),
          agentName: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const hours = input?.hours ?? 24;
      const { startHour, endHour } = getHourRange(hours);

      const conditions = [
        gte(opsAgentRunsHourly.hour, startHour),
        lte(opsAgentRunsHourly.hour, endHour),
      ];
      if (input?.agentName)
        conditions.push(eq(opsAgentRunsHourly.agentName, input.agentName));

      const runs = await db
        .select({
          hour: opsAgentRunsHourly.hour,
          runs: sql<number>`SUM(${opsAgentRunsHourly.runs})`,
          successCount: sql<number>`SUM(${opsAgentRunsHourly.successCount})`,
        })
        .from(opsAgentRunsHourly)
        .where(and(...conditions))
        .groupBy(opsAgentRunsHourly.hour)
        .orderBy(opsAgentRunsHourly.hour);

      return runs.map((r) => ({
        hour: r.hour,
        runs: r.runs ?? 0,
        successRate:
          (r.runs ?? 0) > 0
            ? ((r.successCount ?? 0) / (r.runs ?? 1)) * 100
            : 100,
      }));
    }),

  // ── Get Agent Alerts ─────────────────────────────────────────────────

  getAlerts: adminProcedure
    .input(
      z
        .object({
          severity: z.string().optional(),
          acknowledged: z.boolean().optional(),
          limit: z.number().min(1).max(50).default(20),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input?.severity)
        conditions.push(eq(opsAgentAlerts.severity, input.severity));
      if (input?.acknowledged !== undefined)
        conditions.push(eq(opsAgentAlerts.acknowledged, input.acknowledged));

      const alerts = await db.query.opsAgentAlerts.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(opsAgentAlerts.createdAt)],
        limit: input?.limit ?? 20,
      });

      return alerts.map((a) => ({
        id: a.id,
        agentName: a.agentName,
        alertType: a.alertType,
        severity: a.severity,
        title: a.title,
        description: a.description,
        acknowledged: a.acknowledged,
        createdAt: a.createdAt,
      }));
    }),

  // ── Seed demo data for AI Agent Monitor ──────────────────────────────

  seedAgentMonitorData: adminProcedure.mutation(async () => {
    // Only seed if tables are empty
    const existing = await db
      .select({ count: count() })
      .from(opsAgentHealth)
      .then((r) => r[0]?.count ?? 0);

    if (existing > 0) {
      return { seeded: false, reason: "Data already exists" };
    }

    const now = new Date();

    // Seed agent health data with current task info
    const agents = [
      {
        agentName: "bank_reconciler",
        displayName: "Bank Reconciler",
        category: "accounting" as const,
        healthScore: 96,
        successRate: "98.90",
        totalRuns24h: 1245,
        errors24h: 14,
        avgLatencyMs: 1850,
        status: "healthy" as const,
        currentTask: "Reconcile GTBank **** 6789 May 2025 transactions",
        currentTaskProgress: 78,
        currentTaskEta: "2m",
        model: "Claude 3.5 Sonnet",
        toolsCount: 5,
        memoryUsageGb: "1.2",
        tasksRunning: 3,
        tasksCompleted: 45,
        tasksReview: 2,
        tasksFailed: 0,
        humanReviewCount: 0,
        timeSavedHours: "12.5",
      },
      {
        agentName: "invoice_processor",
        displayName: "Invoice Processor",
        category: "accounting" as const,
        healthScore: 94,
        successRate: "98.10",
        totalRuns24h: 1980,
        errors24h: 34,
        avgLatencyMs: 2450,
        status: "healthy" as const,
        currentTask: "Process 23 uploaded invoices Extracting data with OCR",
        currentTaskProgress: 45,
        currentTaskEta: "6m",
        model: "Claude 3.5 Sonnet",
        toolsCount: 4,
        memoryUsageGb: "0.8",
        tasksRunning: 2,
        tasksCompleted: 38,
        tasksReview: 3,
        tasksFailed: 1,
        humanReviewCount: 2,
        timeSavedHours: "8.3",
      },
      {
        agentName: "payroll_assistant",
        displayName: "Payroll Assistant",
        category: "hr" as const,
        healthScore: 93,
        successRate: "96.80",
        totalRuns24h: 1320,
        errors24h: 42,
        avgLatencyMs: 1880,
        status: "healthy" as const,
        currentTask: "Prepare May 2025 payroll Calculating salaries & taxes",
        currentTaskProgress: 62,
        currentTaskEta: "12m",
        model: "Claude 3.5 Sonnet",
        toolsCount: 6,
        memoryUsageGb: "0.9",
        tasksRunning: 1,
        tasksCompleted: 28,
        tasksReview: 1,
        tasksFailed: 0,
        humanReviewCount: 0,
        timeSavedHours: "6.2",
      },
      {
        agentName: "journal_entry_agent",
        displayName: "Journal Entry Agent",
        category: "accounting" as const,
        healthScore: 97,
        successRate: "97.60",
        totalRuns24h: 2842,
        errors24h: 68,
        avgLatencyMs: 2110,
        status: "healthy" as const,
        currentTask: "Categorize 18 transactions Auto-categorizing expenses",
        currentTaskProgress: 88,
        currentTaskEta: "1m",
        model: "Claude 3.5 Sonnet",
        toolsCount: 3,
        memoryUsageGb: "0.6",
        tasksRunning: 4,
        tasksCompleted: 52,
        tasksReview: 1,
        tasksFailed: 0,
        humanReviewCount: 0,
        timeSavedHours: "9.8",
      },
      {
        agentName: "ap_payment_scanner",
        displayName: "AP Payment Scanner",
        category: "accounting" as const,
        healthScore: 91,
        successRate: "95.60",
        totalRuns24h: 1542,
        errors24h: 68,
        avgLatencyMs: 2090,
        status: "healthy" as const,
        currentTask: "Scan & process 12 bills Matching with POs",
        currentTaskProgress: 35,
        currentTaskEta: "8m",
        model: "Claude 3.5 Haiku",
        toolsCount: 4,
        memoryUsageGb: "0.7",
        tasksRunning: 2,
        tasksCompleted: 32,
        tasksReview: 2,
        tasksFailed: 1,
        humanReviewCount: 1,
        timeSavedHours: "5.4",
      },
      {
        agentName: "tax_compliance",
        displayName: "Tax Compliance",
        category: "compliance" as const,
        healthScore: 95,
        successRate: "95.70",
        totalRuns24h: 420,
        errors24h: 18,
        avgLatencyMs: 3200,
        status: "healthy" as const,
        currentTask: "VAT return preparation Collecting required data",
        currentTaskProgress: 20,
        currentTaskEta: "25m",
        model: "Claude 3.5 Sonnet",
        toolsCount: 5,
        memoryUsageGb: "1.1",
        tasksRunning: 1,
        tasksCompleted: 18,
        tasksReview: 1,
        tasksFailed: 0,
        humanReviewCount: 0,
        timeSavedHours: "3.8",
      },
      {
        agentName: "forecasting_agent",
        displayName: "Forecasting Agent",
        category: "analytics" as const,
        healthScore: 89,
        successRate: "96.50",
        totalRuns24h: 580,
        errors24h: 20,
        avgLatencyMs: 2650,
        status: "healthy" as const,
        currentTask: "Cash flow forecast Analyzing trends",
        currentTaskProgress: 90,
        currentTaskEta: "3m",
        model: "Claude 3.5 Sonnet",
        toolsCount: 4,
        memoryUsageGb: "1.4",
        tasksRunning: 1,
        tasksCompleted: 22,
        tasksReview: 3,
        tasksFailed: 0,
        humanReviewCount: 2,
        timeSavedHours: "4.2",
      },
      {
        agentName: "expense_auditor",
        displayName: "Expense Auditor",
        category: "accounting" as const,
        healthScore: 87,
        successRate: "95.10",
        totalRuns24h: 380,
        errors24h: 19,
        avgLatencyMs: 2180,
        status: "warning" as const,
        currentTask: "Review 30 flagged expenses Checking for duplicates",
        currentTaskProgress: 70,
        currentTaskEta: "5m",
        model: "Claude 3.5 Haiku",
        toolsCount: 3,
        memoryUsageGb: "0.5",
        tasksRunning: 1,
        tasksCompleted: 15,
        tasksReview: 4,
        tasksFailed: 2,
        humanReviewCount: 3,
        timeSavedHours: "2.1",
      },
      {
        agentName: "report_generation",
        displayName: "Report Generation Agent",
        category: "analytics" as const,
        healthScore: 90,
        successRate: "97.30",
        totalRuns24h: 1103,
        errors24h: 29,
        avgLatencyMs: 2220,
        status: "healthy" as const,
        currentTask: null,
        currentTaskProgress: 0,
        currentTaskEta: null,
        model: "Claude 3.5 Sonnet",
        toolsCount: 4,
        memoryUsageGb: "0.8",
        tasksRunning: 0,
        tasksCompleted: 42,
        tasksReview: 0,
        tasksFailed: 0,
        humanReviewCount: 0,
        timeSavedHours: "7.5",
      },
      {
        agentName: "document_understanding",
        displayName: "Document Understanding Agent",
        category: "accounting" as const,
        healthScore: 91,
        successRate: "98.10",
        totalRuns24h: 1987,
        errors24h: 37,
        avgLatencyMs: 2080,
        status: "healthy" as const,
        currentTask: null,
        currentTaskProgress: 0,
        currentTaskEta: null,
        model: "Claude 3.5 Sonnet",
        toolsCount: 5,
        memoryUsageGb: "1.0",
        tasksRunning: 0,
        tasksCompleted: 56,
        tasksReview: 0,
        tasksFailed: 0,
        humanReviewCount: 0,
        timeSavedHours: "10.2",
      },
      {
        agentName: "cash_flow_forecasting",
        displayName: "Cash Flow Forecasting Agent",
        category: "treasury" as const,
        healthScore: 88,
        successRate: "96.50",
        totalRuns24h: 580,
        errors24h: 20,
        avgLatencyMs: 2650,
        status: "healthy" as const,
        currentTask: null,
        currentTaskProgress: 0,
        currentTaskEta: null,
        model: "Claude 3.5 Sonnet",
        toolsCount: 4,
        memoryUsageGb: "1.3",
        tasksRunning: 0,
        tasksCompleted: 18,
        tasksReview: 0,
        tasksFailed: 0,
        humanReviewCount: 0,
        timeSavedHours: "3.5",
      },
      {
        agentName: "compliance_check",
        displayName: "Compliance Check Agent",
        category: "compliance" as const,
        healthScore: 85,
        successRate: "95.10",
        totalRuns24h: 420,
        errors24h: 21,
        avgLatencyMs: 3200,
        status: "healthy" as const,
        currentTask: null,
        currentTaskProgress: 0,
        currentTaskEta: null,
        model: "Claude 3.5 Haiku",
        toolsCount: 3,
        memoryUsageGb: "0.6",
        tasksRunning: 0,
        tasksCompleted: 14,
        tasksReview: 0,
        tasksFailed: 0,
        humanReviewCount: 0,
        timeSavedHours: "2.8",
      },
    ];

    for (const agent of agents) {
      const trendData = Array.from({ length: 7 }, () =>
        Math.floor(80 + Math.random() * 20),
      );
      await db.insert(opsAgentHealth).values({
        ...agent,
        trendData,
        isActive: true,
        lastRunAt: new Date(now.getTime() - Math.random() * 3600000),
        currentTaskStartedAt: agent.currentTask
          ? new Date(now.getTime() - 15 * 60000)
          : null,
      });
    }

    // Seed hourly runs (last 24 hours)
    for (let h = 23; h >= 0; h--) {
      const hour = new Date(now.getTime() - h * 3600000);
      const hourStr = hour.toISOString().slice(0, 13).replace("T", " ") + ":00";

      for (const agent of agents.slice(0, 8)) {
        const runs = Math.floor(50 + Math.random() * 200);
        const successCount = Math.floor(runs * (0.9 + Math.random() * 0.1));
        await db.insert(opsAgentRunsHourly).values({
          agentName: agent.agentName,
          hour: hourStr,
          runs,
          successCount,
          errorCount: runs - successCount,
          totalLatencyMs: runs * agent.avgLatencyMs,
          avgLatencyMs: agent.avgLatencyMs,
          successRate: ((successCount / runs) * 100).toFixed(2),
        });
      }
    }

    // Seed alerts
    const alerts = [
      {
        agentName: "expense_auditor",
        alertType: "high_error_rate",
        severity: "critical",
        title: "High error rate detected",
        description: "Expense Auditor has 5 failed tasks",
      },
      {
        agentName: "payroll_assistant",
        alertType: "human_review_required",
        severity: "warning",
        title: "Human review required",
        description: "7 tasks are waiting for your review",
      },
      {
        agentName: "cash_flow_forecasting",
        alertType: "agent_deployed",
        severity: "info",
        title: "New agent available",
        description: "Fixed Asset Manager is ready to use",
      },
      {
        agentName: "tax_compliance",
        alertType: "high_latency",
        severity: "warning",
        title: "High latency detected",
        description: "Tax Compliance Agent response time increased",
      },
      {
        agentName: "forecasting_agent",
        alertType: "low_success_rate",
        severity: "warning",
        title: "Success rate below 95%",
        description: "Forecasting Agent needs attention",
      },
    ];

    for (let i = 0; i < alerts.length; i++) {
      const minsAgo = [2, 18, 45, 60, 120][i]!;
      await db.insert(opsAgentAlerts).values({
        ...alerts[i],
        createdAt: new Date(now.getTime() - minsAgo * 60000),
      });
    }

    // Seed system resources
    await db.insert(opsSystemResources).values({
      cpuUsagePercent: "24.00",
      cpuCores: 16,
      memoryUsagePercent: "48.00",
      memoryTotalGb: "64.0",
      workerQueueJobs: 7,
      allSystemsOperational: true,
      activeWorkflows: 18,
      queueLength: 7,
    });

    // Seed workload distribution
    await db.insert(opsWorkloadDistribution).values({
      date: now.toISOString().slice(0, 10),
      completed: 68,
      inProgress: 24,
      review: 22,
      scheduled: 28,
      failed: 14,
      totalTasks: 156,
    });

    // Seed agent activity
    const activities = [
      {
        agentName: "bank_reconciler",
        activityType: "matched",
        title: "Matched 48 transactions",
        description: "Auto-matched with high confidence",
      },
      {
        agentName: "invoice_processor",
        activityType: "identified",
        title: "Identified 2 possible matches",
        description: "Awaiting confirmation",
      },
      {
        agentName: "bank_reconciler",
        activityType: "downloaded",
        title: "Downloaded 256 transactions",
        description: "From GTBank **** 6789",
      },
      {
        agentName: "bank_reconciler",
        activityType: "connected",
        title: "Connected to bank",
        description: "Secure connection established",
      },
      {
        agentName: "journal_entry_agent",
        activityType: "processed",
        title: "Processed 18 journal entries",
        description: "All entries posted successfully",
      },
    ];

    for (let i = 0; i < activities.length; i++) {
      const minsAgo = [10, 30, 34, 37, 45][i]!;
      await db.insert(opsAgentActivity).values({
        ...activities[i],
        createdAt: new Date(now.getTime() - minsAgo * 60000),
      });
    }

    return { seeded: true };
  }),
});
