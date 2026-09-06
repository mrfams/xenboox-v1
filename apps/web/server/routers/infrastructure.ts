import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  infraHealthOverview,
  infraServices,
  infraAlerts,
  infraIncidents,
  infraResourceUsage,
} from "@xenboox/db/schema";
import { db } from "@xenboox/db";

import { router, adminProtectedProcedure } from "@/lib/trpc/server";
import { devOnly } from "@/server/lib/dev-only";

export const infrastructureRouter = router({
  // Get dashboard overview with KPIs and all data
  getOverview: adminProtectedProcedure
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

      // Get latest overview snapshot
      const [latestOverview] = await db
        .select()
        .from(infraHealthOverview)
        .orderBy(desc(infraHealthOverview.date))
        .limit(1);

      // Get system health over time
      const healthOverTime = await db
        .select()
        .from(infraHealthOverview)
        .where(
          sql`${infraHealthOverview.date} >= ${startDate.toISOString().split("T")[0]}`,
        )
        .orderBy(infraHealthOverview.date);

      // Get services
      const services = await db
        .select()
        .from(infraServices)
        .orderBy(infraServices.status, infraServices.name)
        .limit(50);

      // Get current alerts
      const alerts = await db
        .select()
        .from(infraAlerts)
        .where(sql`${infraAlerts.resolvedAt} IS NULL`)
        .orderBy(desc(infraAlerts.severity), desc(infraAlerts.createdAt))
        .limit(10);

      // Get recent incidents
      const incidents = await db
        .select()
        .from(infraIncidents)
        .orderBy(desc(infraIncidents.startedAt))
        .limit(5);

      // Get resource usage by environment
      const resourceUsage = await db
        .select()
        .from(infraResourceUsage)
        .where(
          sql`${infraResourceUsage.date} >= ${startDate.toISOString().split("T")[0]}`,
        )
        .orderBy(infraResourceUsage.environment, infraResourceUsage.date);

      // Calculate deltas (simplified - in production would compare to previous period)
      const uptimeDelta = 0.03;
      const incidentsDelta = -60;
      const responseTimeDelta = -18;
      const errorRateDelta = -0.04;

      return {
        kpis: {
          overallStatus: latestOverview?.overallStatus ?? "healthy",
          uptimePercent: latestOverview?.uptimePercent ?? "100",
          uptimeDelta,
          incidentCount: latestOverview?.incidentCount ?? 0,
          incidentsDelta,
          totalServices: latestOverview?.totalServices ?? 0,
          degradedServices: latestOverview?.degradedServices ?? 0,
          activeAlerts: latestOverview?.activeAlerts ?? 0,
          criticalAlerts: latestOverview?.criticalAlerts ?? 0,
          avgResponseTimeMs: latestOverview?.avgResponseTimeMs ?? 0,
          responseTimeDelta,
          errorRatePercent: latestOverview?.errorRatePercent ?? "0",
          errorRateDelta,
          cpuUsagePercent: latestOverview?.cpuUsagePercent ?? "0",
          cpuDelta: -6,
          memoryUsagePercent: latestOverview?.memoryUsagePercent ?? "0",
          memoryDelta: -4,
          diskUsagePercent: latestOverview?.diskUsagePercent ?? "0",
          diskDelta: -3,
          networkInMbps: latestOverview?.networkInMbps ?? "0",
          networkInDelta: 12,
          networkOutMbps: latestOverview?.networkOutMbps ?? "0",
          networkOutDelta: 8,
        },
        infrastructureOverview: {
          healthy: latestOverview?.healthyServices ?? 0,
          degraded: latestOverview?.degradedServices ?? 0,
          unhealthy: latestOverview?.unhealthyServices ?? 0,
          maintenance: latestOverview?.maintenanceServices ?? 0,
          unknown: latestOverview?.unknownServices ?? 0,
          total: latestOverview?.totalServices ?? 0,
        },
        healthOverTime: healthOverTime.map((d: any) => ({
          date: d.date,
          uptime: parseFloat(d.uptimePercent),
          errorRate: parseFloat(d.errorRatePercent),
        })),
        services: services.map((s: any) => ({
          id: s.id,
          name: s.name,
          displayName: s.displayName,
          type: s.type,
          status: s.status,
          environment: s.environment,
          uptimePercent30d: parseFloat(s.uptimePercent30d),
          responseTimeP95Ms: s.responseTimeP95Ms,
          errorRatePercent7d: s.errorRatePercent7d
            ? parseFloat(s.errorRatePercent7d)
            : null,
          responseTimeDelta: s.responseTimeDelta,
          errorRateDelta: s.errorRateDelta
            ? parseFloat(s.errorRateDelta)
            : null,
          lastCheckedAt: s.lastCheckedAt,
        })),
        alerts: alerts.map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          severity: a.severity,
          serviceName: a.serviceName,
          environment: a.environment,
          createdAt: a.createdAt,
        })),
        incidents: incidents.map((i: any) => ({
          id: i.id,
          title: i.title,
          severity: i.severity,
          startedAt: i.startedAt,
          resolvedAt: i.resolvedAt,
          durationMinutes: i.durationMinutes,
          status: i.status,
        })),
        resourceUsageByEnvironment: aggregateResourceUsage(resourceUsage),
        dateRange: {
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
          days,
        },
      };
    }),

  // Seed demo data
  seedDemoData: adminProtectedProcedure.mutation(async () => {
    devOnly("seedDemoData");
    // Clear existing data
    await db.delete(infraResourceUsage);
    await db.delete(infraIncidents);
    await db.delete(infraAlerts);
    await db.delete(infraServices);
    await db.delete(infraHealthOverview);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Seed health overview (7 days)
    const overviewData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      overviewData.push({
        date: date.toISOString().split("T")[0],
        overallStatus: "healthy" as const,
        uptimePercent: (99.95 + Math.random() * 0.04).toFixed(4),
        incidentCount: i === 3 ? 2 : 0,
        totalServices: 42,
        healthyServices: 34 + Math.floor(Math.random() * 3),
        degradedServices: 2,
        unhealthyServices: 1,
        maintenanceServices: 2,
        unknownServices: 3,
        activeAlerts: 7,
        criticalAlerts: 3,
        warningAlerts: 3,
        infoAlerts: 1,
        avgResponseTimeMs: 135 + Math.floor(Math.random() * 20),
        errorRatePercent: (0.1 + Math.random() * 0.04).toFixed(4),
        cpuUsagePercent: (30 + Math.random() * 5).toFixed(2),
        memoryUsagePercent: (55 + Math.random() * 6).toFixed(2),
        diskUsagePercent: (39 + Math.random() * 4).toFixed(2),
        networkInMbps: (250 + Math.random() * 30).toFixed(2),
        networkOutMbps: (180 + Math.random() * 20).toFixed(2),
      });
    }
    await db.insert(infraHealthOverview).values(overviewData);

    // Seed services
    const servicesData = [
      {
        name: "reconciliation-service",
        displayName: "Reconciliation Service",
        type: "api" as const,
        status: "degraded" as const,
        environment: "Production",
        uptimePercent30d: "99.85",
        responseTimeP95Ms: 312,
        errorRatePercent7d: "0.38",
        responseTimeDelta: 32,
        errorRateDelta: "0.21",
      },
      {
        name: "bank-feeds-service",
        displayName: "Bank Feeds Service",
        type: "worker" as const,
        status: "healthy" as const,
        environment: "Production",
        uptimePercent30d: "99.99",
        responseTimeP95Ms: 128,
        errorRatePercent7d: "0.05",
        responseTimeDelta: -12,
        errorRateDelta: "-0.01",
      },
      {
        name: "ai-agent-service",
        displayName: "AI Agent Service",
        type: "api" as const,
        status: "healthy" as const,
        environment: "Production",
        uptimePercent30d: "99.98",
        responseTimeP95Ms: 143,
        errorRatePercent7d: "0.07",
        responseTimeDelta: -8,
        errorRateDelta: "-0.02",
      },
      {
        name: "postgresql-primary",
        displayName: "PostgreSQL (Primary)",
        type: "database" as const,
        status: "degraded" as const,
        environment: "Production",
        uptimePercent30d: "99.92",
        responseTimeP95Ms: 25,
        errorRatePercent7d: "0.02",
        responseTimeDelta: 15,
        errorRateDelta: null,
      },
      {
        name: "redis-cluster-primary",
        displayName: "Redis Cluster (Primary)",
        type: "cache" as const,
        status: "unhealthy" as const,
        environment: "Production",
        uptimePercent30d: "98.76",
        responseTimeP95Ms: 1,
        errorRatePercent7d: "0.15",
        responseTimeDelta: 120,
        errorRateDelta: "0.10",
      },
      {
        name: "agent-runs-queue",
        displayName: "Agent Runs Queue",
        type: "queue" as const,
        status: "healthy" as const,
        environment: "Production",
        uptimePercent30d: "99.99",
        responseTimeP95Ms: 5,
        errorRatePercent7d: "0.01",
        responseTimeDelta: -5,
        errorRateDelta: "-0.01",
      },
      {
        name: "document-processing",
        displayName: "Document Processing",
        type: "worker" as const,
        status: "healthy" as const,
        environment: "Production",
        uptimePercent30d: "99.97",
        responseTimeP95Ms: 89,
        errorRatePercent7d: "0.03",
        responseTimeDelta: -10,
        errorRateDelta: "-0.02",
      },
      {
        name: "email-service",
        displayName: "Email Service",
        type: "api" as const,
        status: "healthy" as const,
        environment: "Production",
        uptimePercent30d: "100.00",
        responseTimeP95Ms: 156,
        errorRatePercent7d: "0.00",
        responseTimeDelta: 0,
        errorRateDelta: "0.00",
      },
    ];
    await db.insert(infraServices).values(servicesData);

    // Seed alerts
    const alertsData = [
      {
        title: "High error rate on /api/v1/reconcile",
        description: "Reconciliation Service • Production",
        severity: "critical" as const,
        serviceName: "reconciliation-service",
        environment: "Production",
      },
      {
        title: "Redis memory usage > 85%",
        description: "Redis Cluster (Primary) • Production",
        severity: "warning" as const,
        serviceName: "redis-cluster-primary",
        environment: "Production",
      },
      {
        title: "Database connections > 80%",
        description: "PostgreSQL (Primary) • Production",
        severity: "critical" as const,
        serviceName: "postgresql-primary",
        environment: "Production",
      },
      {
        title: "Queue backlog high",
        description: "Agent Runs Queue • Production",
        severity: "warning" as const,
        serviceName: "agent-runs-queue",
        environment: "Production",
      },
      {
        title: "Worker autoscaling triggered",
        description: "AI Workers • Production",
        severity: "info" as const,
        serviceName: "ai-agent-service",
        environment: "Production",
      },
    ];
    await db.insert(infraAlerts).values(alertsData);

    // Seed incidents
    const incidentsData = [
      {
        title: "Reconciliation service timeouts",
        severity: "major" as const,
        startedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        resolvedAt: new Date(now.getTime() - 3.5 * 60 * 60 * 1000),
        durationMinutes: 14,
        status: "resolved",
        environment: "Production",
      },
      {
        title: "High latency on bank feeds",
        severity: "minor" as const,
        startedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        resolvedAt: new Date(
          now.getTime() - 3 * 24 * 60 * 60 * 1000 + 35 * 60 * 1000,
        ),
        durationMinutes: 35,
        status: "resolved",
        environment: "Production",
      },
      {
        title: "Scheduled maintenance",
        severity: "maintenance" as const,
        startedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        resolvedAt: new Date(
          now.getTime() - 5 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000,
        ),
        durationMinutes: 20,
        status: "resolved",
        environment: "Production",
      },
    ];
    await db.insert(infraIncidents).values(incidentsData);

    // Seed resource usage by environment
    const environments = ["Production", "Staging", "Development", "QA"];
    const resourceData = [];
    for (const env of environments) {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const baseCpu =
          env === "Production"
            ? 32
            : env === "Staging"
              ? 18
              : env === "Development"
                ? 12
                : 15;
        const baseMemory =
          env === "Production"
            ? 58
            : env === "Staging"
              ? 36
              : env === "Development"
                ? 28
                : 30;
        const baseDisk =
          env === "Production"
            ? 41
            : env === "Staging"
              ? 27
              : env === "Development"
                ? 18
                : 22;

        resourceData.push({
          environment: env,
          date: date.toISOString().split("T")[0],
          cpuAvgPercent: (baseCpu + Math.random() * 5).toFixed(2),
          cpuPeakPercent: (baseCpu + 20 + Math.random() * 10).toFixed(2),
          memoryAvgPercent: (baseMemory + Math.random() * 5).toFixed(2),
          memoryPeakPercent: (baseMemory + 15 + Math.random() * 10).toFixed(2),
          diskAvgPercent: (baseDisk + Math.random() * 3).toFixed(2),
          diskPeakPercent: (baseDisk + 10 + Math.random() * 5).toFixed(2),
          networkInMbps:
            env === "Production" ? (260 + Math.random() * 20).toFixed(2) : "0",
          networkOutMbps:
            env === "Production" ? (185 + Math.random() * 15).toFixed(2) : "0",
        });
      }
    }
    await db.insert(infraResourceUsage).values(resourceData);

    return { success: true };
  }),
});

// Helper function to aggregate resource usage by environment
function aggregateResourceUsage(data: any[]) {
  const envMap: Record<string, any> = {};

  for (const row of data) {
    if (!envMap[row.environment]) {
      envMap[row.environment] = {
        environment: row.environment,
        cpuAvg: 0,
        memoryAvg: 0,
        diskAvg: 0,
        count: 0,
      };
    }
    envMap[row.environment].cpuAvg += parseFloat(row.cpuAvgPercent);
    envMap[row.environment].memoryAvg += parseFloat(row.memoryAvgPercent);
    envMap[row.environment].diskAvg += parseFloat(row.diskAvgPercent);
    envMap[row.environment].count += 1;
  }

  return Object.values(envMap).map((env: any) => ({
    environment: env.environment,
    cpuAvg: Math.round(env.cpuAvg / env.count),
    memoryAvg: Math.round(env.memoryAvg / env.count),
    diskAvg: Math.round(env.diskAvg / env.count),
  }));
}
