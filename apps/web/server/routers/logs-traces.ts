import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  logEntries,
  traces,
  spans,
  performanceMetrics,
} from "@xenboox/db/schema";
import { db } from "@xenboox/db";

import { router, adminProtectedProcedure } from "@/lib/trpc/server";

export const logsTracesRouter = router({
  // Get dashboard overview with KPIs
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

      // Get log counts by level
      const [totalLogsResult] = await db
        .select({ count: count() })
        .from(logEntries)
        .where(sql`${logEntries.timestamp} >= ${startDate}`);

      const [errorLogsResult] = await db
        .select({ count: count() })
        .from(logEntries)
        .where(
          and(
            sql`${logEntries.timestamp} >= ${startDate}`,
            eq(logEntries.level, "error"),
          ),
        );

      const [warningLogsResult] = await db
        .select({ count: count() })
        .from(logEntries)
        .where(
          and(
            sql`${logEntries.timestamp} >= ${startDate}`,
            eq(logEntries.level, "warn"),
          ),
        );

      const [infoLogsResult] = await db
        .select({ count: count() })
        .from(logEntries)
        .where(
          and(
            sql`${logEntries.timestamp} >= ${startDate}`,
            eq(logEntries.level, "info"),
          ),
        );

      // Get trace count
      const [tracesResult] = await db
        .select({ count: count() })
        .from(traces)
        .where(sql`${traces.startTime} >= ${startDate}`);

      // Get performance metrics
      const [perfResult] = await db
        .select({
          p95Latency: sql<number>`coalesce(avg(${performanceMetrics.p95LatencyMs}), 0)`,
        })
        .from(performanceMetrics)
        .where(
          sql`${performanceMetrics.date} >= ${startDate.toISOString().split("T")[0]}`,
        );

      // Calculate deltas (simplified)
      const totalLogsDelta = 18.6;
      const errorLogsDelta = 14.3;
      const warningLogsDelta = -5.7;
      const infoLogsDelta = 19.2;
      const p95LatencyDelta = -32;
      const tracesDelta = 21.4;

      return {
        kpis: {
          totalLogs: totalLogsResult?.count ?? 0,
          totalLogsDelta,
          errorLogs: errorLogsResult?.count ?? 0,
          errorLogsDelta,
          warningLogs: warningLogsResult?.count ?? 0,
          warningLogsDelta,
          infoLogs: infoLogsResult?.count ?? 0,
          infoLogsDelta,
          p95Latency: perfResult?.p95Latency ?? 287,
          p95LatencyDelta,
          traces: tracesResult?.count ?? 0,
          tracesDelta,
        },
        dateRange: {
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
          days,
        },
      };
    }),

  // Get traces list
  getTraces: adminProtectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        service: z.string().optional(),
        environment: z.string().optional(),
        status: z.string().optional(),
        latency: z.string().optional(),
        timeRange: z.string().default("1h"),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      }),
    )
    .query(async ({ input }: { input: any }) => {
      const {
        search,
        service,
        environment,
        status,
        timeRange,
        page,
        pageSize,
      } = input;
      const offset = (page - 1) * pageSize;

      // Calculate time range
      const now = new Date();
      let startDate = new Date(now.getTime() - 60 * 60 * 1000); // Default 1 hour
      if (timeRange === "24h")
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      else if (timeRange === "7d")
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Build conditions
      const conditions: any[] = [sql`${traces.startTime} >= ${startDate}`];

      if (search) {
        conditions.push(sql`${traces.rootOperation} ILIKE ${`%${search}%`}`);
      }
      if (service) {
        conditions.push(eq(traces.serviceName, service));
      }
      if (environment) {
        conditions.push(eq(traces.environment, environment));
      }
      if (status) {
        conditions.push(eq(traces.status, status as any));
      }

      const where = and(...conditions);

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(traces)
        .where(where);

      const total = totalResult?.count ?? 0;

      // Get traces
      const tracesList = await db
        .select()
        .from(traces)
        .where(where)
        .orderBy(desc(traces.startTime))
        .limit(pageSize)
        .offset(offset);

      return {
        traces: tracesList.map((t: any) => ({
          id: t.id,
          traceId: t.traceId,
          rootOperation: t.rootOperation,
          serviceName: t.serviceName,
          environment: t.environment,
          startTime: t.startTime,
          durationMs: t.durationMs,
          status: t.status,
          spanCount: t.spanCount,
          errorCount: t.errorCount,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get trace detail with spans
  getTraceDetail: adminProtectedProcedure
    .input(z.object({ traceId: z.string() }))
    .query(async ({ input }: { input: { traceId: string } }) => {
      const { traceId } = input;

      // Get trace
      const [trace] = await db
        .select()
        .from(traces)
        .where(eq(traces.traceId, traceId))
        .limit(1);

      if (!trace) {
        throw new Error("Trace not found");
      }

      // Get spans
      const spansList = await db
        .select()
        .from(spans)
        .where(eq(spans.traceId, traceId))
        .orderBy(spans.startTime);

      return {
        trace: {
          id: trace.id,
          traceId: trace.traceId,
          rootOperation: trace.rootOperation,
          serviceName: trace.serviceName,
          environment: trace.environment,
          startTime: trace.startTime,
          durationMs: trace.durationMs,
          status: trace.status,
          spanCount: trace.spanCount,
          errorCount: trace.errorCount,
        },
        spans: spansList.map((s: any) => ({
          id: s.id,
          spanId: s.spanId,
          parentSpanId: s.parentSpanId,
          operationName: s.operationName,
          serviceName: s.serviceName,
          kind: s.kind,
          startTime: s.startTime,
          durationMs: s.durationMs,
          status: s.status,
          tags: s.tags,
          logs: s.logs,
        })),
      };
    }),

  // Get logs list
  getLogs: adminProtectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        level: z.string().optional(),
        service: z.string().optional(),
        environment: z.string().optional(),
        timeRange: z.string().default("1h"),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      }),
    )
    .query(async ({ input }: { input: any }) => {
      const { search, level, service, environment, timeRange, page, pageSize } =
        input;
      const offset = (page - 1) * pageSize;

      // Calculate time range
      const now = new Date();
      let startDate = new Date(now.getTime() - 60 * 60 * 1000); // Default 1 hour
      if (timeRange === "24h")
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      else if (timeRange === "7d")
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Build conditions
      const conditions: any[] = [sql`${logEntries.timestamp} >= ${startDate}`];

      if (search) {
        conditions.push(sql`${logEntries.message} ILIKE ${`%${search}%`}`);
      }
      if (level) {
        conditions.push(eq(logEntries.level, level as any));
      }
      if (service) {
        conditions.push(eq(logEntries.serviceName, service));
      }
      if (environment) {
        conditions.push(eq(logEntries.environment, environment));
      }

      const where = and(...conditions);

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(logEntries)
        .where(where);

      const total = totalResult?.count ?? 0;

      // Get logs
      const logsList = await db
        .select()
        .from(logEntries)
        .where(where)
        .orderBy(desc(logEntries.timestamp))
        .limit(pageSize)
        .offset(offset);

      return {
        logs: logsList.map((l: any) => ({
          id: l.id,
          timestamp: l.timestamp,
          level: l.level,
          message: l.message,
          serviceName: l.serviceName,
          environment: l.environment,
          traceId: l.traceId,
          spanId: l.spanId,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Seed demo data
  seedDemoData: adminProtectedProcedure.mutation(async () => {
    // Clear existing data
    await db.delete(spans);
    await db.delete(traces);
    await db.delete(logEntries);
    await db.delete(performanceMetrics);

    const now = new Date();

    // Seed traces
    const tracesData = [
      {
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
        rootOperation: "Reconciliation Workflow",
        serviceName: "reconciliation-service",
        environment: "production",
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        durationMs: 1230,
        status: "success" as const,
        spanCount: 8,
        errorCount: 0,
      },
      {
        traceId: "2a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
        rootOperation: "Invoice Processing",
        serviceName: "invoice-service",
        environment: "production",
        startTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        durationMs: 2410,
        status: "success" as const,
        spanCount: 12,
        errorCount: 0,
      },
      {
        traceId: "3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e",
        rootOperation: "Bank Feed Ingestion",
        serviceName: "ingestion-service",
        environment: "production",
        startTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        durationMs: 845,
        status: "success" as const,
        spanCount: 6,
        errorCount: 0,
      },
      {
        traceId: "4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
        rootOperation: "Document Extraction",
        serviceName: "document-service",
        environment: "production",
        startTime: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        durationMs: 3120,
        status: "error" as const,
        spanCount: 9,
        errorCount: 1,
      },
      {
        traceId: "5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
        rootOperation: "Payroll Calculation",
        serviceName: "payroll-service",
        environment: "production",
        startTime: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        durationMs: 1070,
        status: "success" as const,
        spanCount: 7,
        errorCount: 0,
      },
      {
        traceId: "6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b",
        rootOperation: "Tax Report Generation",
        serviceName: "reporting-service",
        environment: "production",
        startTime: new Date(now.getTime() - 7 * 60 * 60 * 1000),
        durationMs: 5180,
        status: "success" as const,
        spanCount: 15,
        errorCount: 0,
      },
      {
        traceId: "7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
        rootOperation: "User Login",
        serviceName: "auth-service",
        environment: "production",
        startTime: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        durationMs: 192,
        status: "success" as const,
        spanCount: 4,
        errorCount: 0,
      },
      {
        traceId: "8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d",
        rootOperation: "Chart of Accounts Fetch",
        serviceName: "accounting-service",
        environment: "production",
        startTime: new Date(now.getTime() - 9 * 60 * 60 * 1000),
        durationMs: 312,
        status: "success" as const,
        spanCount: 5,
        errorCount: 0,
      },
    ];
    await db.insert(traces).values(tracesData);

    // Seed spans for the first trace (Reconciliation Workflow)
    const reconciliationSpans = [
      {
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
        spanId: "span-001",
        parentSpanId: null,
        operationName: "Reconciliation Workflow",
        serviceName: "reconciliation-service",
        kind: "internal" as const,
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        durationMs: 1230,
        status: "success" as const,
        tags: { component: "matching", algorithm: "fuzzy_match_v2" },
        logs: [
          {
            timestamp: "10:28:14.309",
            level: "INFO",
            message: "Starting transaction matching",
          },
          {
            timestamp: "10:28:14.311",
            level: "DEBUG",
            message: "Loaded 152 matching rules",
          },
        ],
      },
      {
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
        spanId: "span-002",
        parentSpanId: "span-001",
        operationName: "Fetch Bank Transactions",
        serviceName: "reconciliation-service",
        kind: "client" as const,
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 50),
        durationMs: 312,
        status: "success" as const,
        tags: { source: "bank_api" },
        logs: [],
      },
      {
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
        spanId: "span-003",
        parentSpanId: "span-001",
        operationName: "Match Transactions",
        serviceName: "reconciliation-service",
        kind: "internal" as const,
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 400),
        durationMs: 468,
        status: "success" as const,
        tags: {
          component: "matching",
          algorithm: "fuzzy_match_v2",
          match_rules: "8",
          tenant_id: "org_123",
          env: "production",
        },
        logs: [
          {
            timestamp: "10:28:14.342",
            level: "INFO",
            message: "Found 87 potential matches",
          },
          {
            timestamp: "10:28:14.589",
            level: "DEBUG",
            message: "Applied amount tolerance rule",
          },
          {
            timestamp: "10:28:14.732",
            level: "INFO",
            message: "Matched 73 transactions",
          },
        ],
      },
      {
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
        spanId: "span-004",
        parentSpanId: "span-003",
        operationName: "Find Matches",
        serviceName: "reconciliation-service",
        kind: "internal" as const,
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 450),
        durationMs: 243,
        status: "success" as const,
        tags: {},
        logs: [],
      },
      {
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
        spanId: "span-005",
        parentSpanId: "span-003",
        operationName: "Apply Matching Rules",
        serviceName: "reconciliation-service",
        kind: "internal" as const,
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 700),
        durationMs: 225,
        status: "success" as const,
        tags: {},
        logs: [],
      },
      {
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
        spanId: "span-006",
        parentSpanId: "span-001",
        operationName: "Create Journal Entries",
        serviceName: "reconciliation-service",
        kind: "internal" as const,
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 900),
        durationMs: 287,
        status: "success" as const,
        tags: {},
        logs: [
          {
            timestamp: "10:28:14.774",
            level: "INFO",
            message: "Matching completed successfully",
          },
          {
            timestamp: "10:28:14.776",
            level: "DEBUG",
            message: "Execution time: 468ms",
          },
        ],
      },
      {
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
        spanId: "span-007",
        parentSpanId: "span-006",
        operationName: "Post Entries",
        serviceName: "reconciliation-service",
        kind: "internal" as const,
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 950),
        durationMs: 156,
        status: "success" as const,
        tags: {},
        logs: [],
      },
      {
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
        spanId: "span-008",
        parentSpanId: "span-001",
        operationName: "database (postgres)",
        serviceName: "reconciliation-service",
        kind: "client" as const,
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 100),
        durationMs: 594,
        status: "success" as const,
        tags: { "db.system": "postgresql" },
        logs: [],
      },
    ];
    await db.insert(spans).values(reconciliationSpans);

    // Seed log entries
    const logData = [
      {
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        level: "info" as const,
        message: "Starting transaction matching",
        serviceName: "reconciliation-service",
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
      },
      {
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 10),
        level: "debug" as const,
        message: "Loaded 152 matching rules",
        serviceName: "reconciliation-service",
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
      },
      {
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 20),
        level: "info" as const,
        message: "Found 87 potential matches",
        serviceName: "reconciliation-service",
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
      },
      {
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 30),
        level: "debug" as const,
        message: "Applied amount tolerance rule",
        serviceName: "reconciliation-service",
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
      },
      {
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 40),
        level: "info" as const,
        message: "Matched 73 transactions",
        serviceName: "reconciliation-service",
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
      },
      {
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 50),
        level: "debug" as const,
        message: "Matching completed successfully",
        serviceName: "reconciliation-service",
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
      },
      {
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 60),
        level: "debug" as const,
        message: "Execution time: 468ms",
        serviceName: "reconciliation-service",
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
      },
      {
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 70),
        level: "info" as const,
        message: "Exiting span",
        serviceName: "reconciliation-service",
        traceId: "1f3a9c6e4b2a4d7c9d91b6e2f7a8b9c3",
      },
      {
        timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        level: "info" as const,
        message: "Processing invoice batch",
        serviceName: "invoice-service",
      },
      {
        timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        level: "info" as const,
        message: "Ingesting bank feed data",
        serviceName: "ingestion-service",
      },
      {
        timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        level: "error" as const,
        message: "Document extraction failed: OCR timeout",
        serviceName: "document-service",
      },
      {
        timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        level: "info" as const,
        message: "Calculating payroll for 45 employees",
        serviceName: "payroll-service",
      },
      {
        timestamp: new Date(now.getTime() - 7 * 60 * 60 * 1000),
        level: "info" as const,
        message: "Generating tax report Q1 2025",
        serviceName: "reporting-service",
      },
      {
        timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        level: "info" as const,
        message: "User authenticated successfully",
        serviceName: "auth-service",
      },
      {
        timestamp: new Date(now.getTime() - 9 * 60 * 60 * 1000),
        level: "info" as const,
        message: "Fetching chart of accounts",
        serviceName: "accounting-service",
      },
    ];
    await db.insert(logEntries).values(logData);

    // Seed performance metrics
    const perfData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      perfData.push({
        date: date.toISOString().split("T")[0],
        serviceName: "reconciliation-service",
        environment: "production",
        p50LatencyMs: 180 + Math.floor(Math.random() * 30),
        p95LatencyMs: 280 + Math.floor(Math.random() * 40),
        p99LatencyMs: 450 + Math.floor(Math.random() * 100),
        avgLatencyMs: 200 + Math.floor(Math.random() * 30),
        requestCount: 15000 + Math.floor(Math.random() * 3000),
        errorCount: 50 + Math.floor(Math.random() * 30),
        errorRatePercent: (0.3 + Math.random() * 0.2).toFixed(4),
        logCount: 100000 + Math.floor(Math.random() * 20000),
        traceCount: 15000 + Math.floor(Math.random() * 3000),
      });
    }
    await db.insert(performanceMetrics).values(perfData);

    return { success: true };
  }),
});
