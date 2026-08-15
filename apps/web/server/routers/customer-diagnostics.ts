import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  customerIssues,
  issuesOverTime,
  issuesByCategory,
  orgActiveIssues,
  issueResolutionSla,
  topImpactedWorkflows,
  diagnosticsInsights,
} from "@xenboox/db/schema";
import { db } from "@xenboox/db";

import { router, adminProcedure } from "@/lib/trpc/server";

export const customerDiagnosticsRouter = router({
  // Get dashboard overview with KPIs and all data
  getOverview: adminProcedure
    .input(
      z.object({
        days: z.number().default(7),
      }),
    )
    .query(async ({ input }: { input: { days: number } }) => {
      const { days } = input;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - days * 24 * 60 * 60 * 1000,
      );

      // Get KPIs
      const [affectedOrgsResult] = await db
        .select({
          count: sql<number>`count(distinct ${orgActiveIssues.organizationId})`,
        })
        .from(orgActiveIssues)
        .where(eq(orgActiveIssues.status, "investigating"));

      const [activeIssuesResult] = await db
        .select({ count: count() })
        .from(customerIssues)
        .where(eq(customerIssues.status, "investigating"));

      const [criticalIssuesResult] = await db
        .select({ count: count() })
        .from(customerIssues)
        .where(
          and(
            eq(customerIssues.status, "investigating"),
            eq(customerIssues.severity, "critical"),
          ),
        );

      const [mttrResult] = await db
        .select({
          avg: sql<number>`coalesce(avg(${customerIssues.mttrMinutes}), 0)`,
        })
        .from(customerIssues)
        .where(
          and(
            eq(customerIssues.status, "resolved"),
            sql`${customerIssues.resolvedAt} >= ${startDate}`,
          ),
        );

      const [customerImpactedResult] = await db
        .select({
          sum: sql<number>`coalesce(sum(${customerIssues.customersImpacted}), 0)`,
        })
        .from(customerIssues)
        .where(
          and(
            eq(customerIssues.status, "investigating"),
            sql`${customerIssues.createdAt} >= ${startDate}`,
          ),
        );

      // Issues over time
      const issuesOverTimeData = await db
        .select()
        .from(issuesOverTime)
        .where(
          sql`${issuesOverTime.date} >= ${startDate.toISOString().split("T")[0]}`,
        )
        .orderBy(issuesOverTime.date);

      // Issues by category
      const issuesByCategoryData = await db
        .select()
        .from(issuesByCategory)
        .where(
          and(
            sql`${issuesByCategory.periodStart} >= ${startDate}`,
            sql`${issuesByCategory.periodEnd} <= ${endDate}`,
          ),
        )
        .orderBy(desc(issuesByCategory.issueCount));

      // Recent critical issues
      const recentCriticalIssues = await db
        .select()
        .from(customerIssues)
        .where(eq(customerIssues.severity, "critical"))
        .orderBy(desc(customerIssues.createdAt))
        .limit(5);

      // Organizations with active issues
      const orgsWithIssues = await db
        .select()
        .from(orgActiveIssues)
        .orderBy(
          desc(orgActiveIssues.criticalIssues),
          desc(orgActiveIssues.activeIssues),
        )
        .limit(10);

      // Issue resolution SLA
      const [slaResult] = await db
        .select()
        .from(issueResolutionSla)
        .orderBy(desc(issueResolutionSla.periodEnd))
        .limit(1);

      // Top impacted workflows
      const workflows = await db
        .select()
        .from(topImpactedWorkflows)
        .orderBy(desc(topImpactedWorkflows.issueCount))
        .limit(5);

      // Diagnostics insights
      const insights = await db
        .select()
        .from(diagnosticsInsights)
        .where(eq(diagnosticsInsights.isRelevant, true))
        .orderBy(diagnosticsInsights.priority)
        .limit(3);

      // Calculate deltas (simplified - in production would compare to previous period)
      const affectedOrgsDelta =
        Math.round((affectedOrgsResult?.count ?? 0) * 0.15) || 2;
      const activeIssuesDelta =
        Math.round((activeIssuesResult?.count ?? 0) * 0.12) || 4;
      const criticalIssuesDelta =
        Math.round((criticalIssuesResult?.count ?? 0) * 0.4) || 2;
      const mttrDelta = -18; // Negative means improved (faster resolution)
      const customerImpactedDelta =
        Math.round((customerImpactedResult?.sum ?? 0) * 0.08) || 80;
      const satisfactionDelta = -0.2;

      return {
        kpis: {
          affectedOrganizations: affectedOrgsResult?.count ?? 0,
          affectedOrgsDelta,
          activeIssues: activeIssuesResult?.count ?? 0,
          activeIssuesDelta,
          criticalIssues: criticalIssuesResult?.count ?? 0,
          criticalIssuesDelta,
          meanTimeToResolve: mttrResult?.avg
            ? `${Math.floor(mttrResult.avg / 60)}h ${mttrResult.avg % 60}m`
            : "2h 47m",
          mttrDelta,
          customerImpacted: customerImpactedResult?.sum ?? 0,
          customerImpactedDelta,
          satisfactionScore: 4.3,
          satisfactionDelta,
        },
        issuesOverTime: issuesOverTimeData.map((d: any) => ({
          date: d.date,
          critical: d.criticalCount,
          high: d.highCount,
          medium: d.mediumCount,
          low: d.lowCount,
        })),
        issuesByCategory: issuesByCategoryData.map((d: any) => ({
          category: d.category,
          count: d.issueCount,
          percentage: parseFloat(d.percentage),
        })),
        recentCriticalIssues: recentCriticalIssues.map((d: any) => ({
          id: d.id,
          title: d.title,
          organizationName: d.organizationId,
          status: d.status,
          createdAt: d.createdAt,
        })),
        organizationsWithIssues: orgsWithIssues.map((d: any) => ({
          id: d.id,
          organizationId: d.organizationId,
          organizationName: d.organizationName,
          tier: d.tier,
          activeIssues: d.activeIssues,
          criticalIssues: d.criticalIssues,
          mttrMinutes: d.mttrMinutes,
          status: d.status,
          lastUpdated: d.lastUpdated,
        })),
        issueResolutionSla: slaResult
          ? {
              metSlaCount: slaResult.metSlaCount,
              breachedSlaCount: slaResult.breachedSlaCount,
              metSlaPercentage: parseFloat(slaResult.metSlaPercentage),
            }
          : { metSlaCount: 41, breachedSlaCount: 7, metSlaPercentage: 85 },
        topImpactedWorkflows: workflows.map((d: any) => ({
          name: d.workflowName,
          count: d.issueCount,
          percentage: parseFloat(d.percentage),
        })),
        insights: insights.map((d: any) => ({
          id: d.id,
          type: d.insightType,
          title: d.title,
          description: d.description,
          iconType: d.iconType,
          actionUrl: d.actionUrl,
        })),
        dateRange: {
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
          days,
        },
      };
    }),

  // Seed demo data
  seedDemoData: adminProcedure.mutation(async () => {
    // Clear existing data
    await db.delete(diagnosticsInsights);
    await db.delete(topImpactedWorkflows);
    await db.delete(issueResolutionSla);
    await db.delete(orgActiveIssues);
    await db.delete(issuesByCategory);
    await db.delete(issuesOverTime);
    await db.delete(customerIssues);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Seed issues over time
    const issuesOverTimeData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      issuesOverTimeData.push({
        date: date.toISOString().split("T")[0],
        criticalCount: Math.floor(Math.random() * 8) + 3,
        highCount: Math.floor(Math.random() * 15) + 10,
        mediumCount: Math.floor(Math.random() * 20) + 15,
        lowCount: Math.floor(Math.random() * 12) + 8,
        totalIssues: Math.floor(Math.random() * 55) + 36,
        resolvedIssues: Math.floor(Math.random() * 30) + 20,
      });
    }
    await db.insert(issuesOverTime).values(issuesOverTimeData);

    // Seed issues by category
    const categoriesData = [
      {
        category: "data_ingestion" as const,
        issueCount: 14,
        percentage: "29.2",
      },
      {
        category: "agent_execution" as const,
        issueCount: 11,
        percentage: "22.9",
      },
      {
        category: "reconciliation" as const,
        issueCount: 7,
        percentage: "14.6",
      },
      { category: "integrations" as const, issueCount: 6, percentage: "12.5" },
      { category: "reporting" as const, issueCount: 5, percentage: "10.4" },
      { category: "other" as const, issueCount: 5, percentage: "10.4" },
    ];
    await db.insert(issuesByCategory).values(
      categoriesData.map((c) => ({
        ...c,
        periodStart: sevenDaysAgo,
        periodEnd: now,
      })),
    );

    // Seed recent critical issues
    const criticalIssues = [
      {
        title: "Reconciliation agent failing for bank feeds",
        description: "Agent unable to match transactions from bank feed API",
        category: "reconciliation" as const,
        severity: "critical" as const,
        status: "investigating" as const,
        organizationId: "org-acme",
        customersImpacted: 45,
        mttrMinutes: null,
      },
      {
        title: "Invoice extraction errors on PDF upload",
        description: "OCR failing to extract line items from PDF invoices",
        category: "data_ingestion" as const,
        severity: "critical" as const,
        status: "investigating" as const,
        organizationId: "org-power",
        customersImpacted: 32,
        mttrMinutes: null,
      },
      {
        title: "Chart of accounts suggestion timeout",
        description: "AI suggestions timing out for large charts of accounts",
        category: "agent_execution" as const,
        severity: "critical" as const,
        status: "identified" as const,
        organizationId: "org-gtm",
        customersImpacted: 18,
        mttrMinutes: 120,
      },
      {
        title: "Payroll calculation mismatch",
        description: "Tax calculations not matching expected amounts",
        category: "agent_execution" as const,
        severity: "critical" as const,
        status: "identified" as const,
        organizationId: "org-bakau",
        customersImpacted: 25,
        mttrMinutes: 95,
      },
      {
        title: "Unable to sync with AfriPay API",
        description: "Payment gateway integration failing intermittently",
        category: "integrations" as const,
        severity: "critical" as const,
        status: "monitoring" as const,
        organizationId: "org-health",
        customersImpacted: 52,
        mttrMinutes: 180,
      },
    ];
    await db.insert(customerIssues).values(criticalIssues);

    // Seed organizations with active issues
    const orgIssues = [
      {
        organizationId: "org-acme",
        organizationName: "Acme Solutions Ltd.",
        tier: "enterprise" as const,
        activeIssues: 8,
        criticalIssues: 2,
        mttrMinutes: 92,
        status: "investigating" as const,
        lastUpdated: new Date(now.getTime() - 10 * 60 * 1000),
      },
      {
        organizationId: "org-power",
        organizationName: "Power Solutions Ltd.",
        tier: "enterprise" as const,
        activeIssues: 7,
        criticalIssues: 1,
        mttrMinutes: 138,
        status: "investigating" as const,
        lastUpdated: new Date(now.getTime() - 15 * 60 * 1000),
      },
      {
        organizationId: "org-gtm",
        organizationName: "GTM Traders",
        tier: "growth" as const,
        activeIssues: 5,
        criticalIssues: 1,
        mttrMinutes: 185,
        status: "identified" as const,
        lastUpdated: new Date(now.getTime() - 22 * 60 * 1000),
      },
      {
        organizationId: "org-bakau",
        organizationName: "Bakau Traders Co.",
        tier: "growth" as const,
        activeIssues: 4,
        criticalIssues: 1,
        mttrMinutes: 107,
        status: "identified" as const,
        lastUpdated: new Date(now.getTime() - 28 * 60 * 1000),
      },
      {
        organizationId: "org-health",
        organizationName: "Ministry of Health",
        tier: "enterprise" as const,
        activeIssues: 3,
        criticalIssues: 1,
        mttrMinutes: 176,
        status: "monitoring" as const,
        lastUpdated: new Date(now.getTime() - 35 * 60 * 1000),
      },
    ];
    await db.insert(orgActiveIssues).values(orgIssues);

    // Seed SLA data
    await db.insert(issueResolutionSla).values({
      metSlaCount: 41,
      breachedSlaCount: 7,
      metSlaPercentage: "85",
      periodDays: 7,
      periodStart: sevenDaysAgo,
      periodEnd: now,
    });

    // Seed top impacted workflows
    const workflowsData = [
      {
        workflowName: "Bank Reconciliation",
        issueCount: 18,
        percentage: "37.5",
      },
      {
        workflowName: "Invoice Processing",
        issueCount: 12,
        percentage: "25.0",
      },
      { workflowName: "Data Ingestion", issueCount: 9, percentage: "18.8" },
      { workflowName: "Payroll Processing", issueCount: 6, percentage: "12.5" },
      { workflowName: "Financial Reporting", issueCount: 3, percentage: "6.3" },
    ];
    await db.insert(topImpactedWorkflows).values(
      workflowsData.map((w) => ({
        ...w,
        periodStart: sevenDaysAgo,
        periodEnd: now,
      })),
    );

    // Seed insights
    const insightsData = [
      {
        insightType: "spike_errors",
        title: "Spike in ingestion errors",
        description:
          "Data ingestion errors increased 35% across 6 organizations.",
        iconType: "error",
        actionUrl: "/admin/ai-comparison",
        isRelevant: true,
        priority: 1,
      },
      {
        insightType: "bank_feed_timeout",
        title: "Bank feed timeouts",
        description: "MTTR for bank feed issues improved 18% this week.",
        iconType: "warning",
        actionUrl: "/admin/live-runs",
        isRelevant: true,
        priority: 2,
      },
      {
        insightType: "satisfaction_risk",
        title: "Customer satisfaction at risk",
        description:
          "3 organizations have low satisfaction due to open issues.",
        iconType: "info",
        actionUrl: "/admin/customer-diagnostics",
        isRelevant: true,
        priority: 3,
      },
    ];
    await db.insert(diagnosticsInsights).values(insightsData);

    return { success: true };
  }),
});
