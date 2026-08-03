// ─── Agent Monitor Schema ───────────────────────────────────────────────────
//
// Platform-level agent health and performance monitoring.
// Powers the AI Agent Monitor admin page.
// NOT entity-scoped — these are global platform metrics.
// Tables:
//   ops_agent_health         — Current health status per agent
//   ops_agent_runs_hourly    — Hourly aggregated runs per agent
//   ops_agent_alerts         — Agent-specific alerts and warnings
//   ops_system_resources     — System resource snapshots (CPU, memory, queue)

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const agentHealthStatusEnum = pgEnum("agent_health_status", [
  "healthy",
  "warning",
  "critical",
  "offline",
]);

export const agentCategoryEnum = pgEnum("agent_category", [
  "accounting",
  "analytics",
  "hr",
  "compliance",
  "treasury",
  "operations",
  "other",
]);

export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "running",
  "completed",
  "review",
  "failed",
  "scheduled",
]);

// ─── Agent Health ───────────────────────────────────────────────────────────
// Current health status and metrics per agent. Updated by monitoring system.

export const opsAgentHealth = pgTable(
  "ops_agent_health",
  {
    id: uuidId(),
    agentName: text("agent_name").notNull().unique(),
    displayName: text("display_name").notNull(),
    category: agentCategoryEnum("category").notNull().default("other"),
    status: agentHealthStatusEnum("status").notNull().default("healthy"),
    healthScore: integer("health_score").notNull().default(100),
    successRate: numeric("success_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("100.00"),
    totalRuns24h: integer("total_runs_24h").notNull().default(0),
    errors24h: integer("errors_24h").notNull().default(0),
    avgLatencyMs: integer("avg_latency_ms").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    lastRunAt: timestamp("last_run_at"),
    lastErrorAt: timestamp("last_error_at"),
    lastErrorMessage: text("last_error_message"),
    trendData: jsonb("trend_data").$type<number[]>().default([]),
    // 7-day trend data points for sparkline
    // Current task fields
    currentTask: text("current_task"),
    currentTaskProgress: integer("current_task_progress").default(0),
    currentTaskEta: text("current_task_eta"),
    currentTaskStartedAt: timestamp("current_task_started_at"),
    // Model and tools
    model: text("model"),
    toolsCount: integer("tools_count").default(0),
    memoryUsageGb: numeric("memory_usage_gb", { precision: 5, scale: 1 }),
    // Task counts
    tasksRunning: integer("tasks_running").default(0),
    tasksCompleted: integer("tasks_completed").default(0),
    tasksReview: integer("tasks_review").default(0),
    tasksFailed: integer("tasks_failed").default(0),
    // Human review
    humanReviewCount: integer("human_review_count").default(0),
    // Time saved
    timeSavedHours: numeric("time_saved_hours", {
      precision: 7,
      scale: 1,
    }).default("0"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("ops_agent_health_status").on(t.status),
    index("ops_agent_health_category").on(t.category),
    index("ops_agent_health_score").on(t.healthScore),
  ],
);

// ─── Agent Runs Hourly ─────────────────────────────────────────────────────
// Hourly aggregated run data per agent. Powers the runs-over-time charts.

export const opsAgentRunsHourly = pgTable(
  "ops_agent_runs_hourly",
  {
    id: uuidId(),
    agentName: text("agent_name").notNull(),
    hour: text("hour").notNull(), // YYYY-MM-DD HH:00
    runs: integer("runs").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    totalLatencyMs: integer("total_latency_ms").notNull().default(0),
    avgLatencyMs: integer("avg_latency_ms").notNull().default(0),
    successRate: numeric("success_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("100.00"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ops_agent_runs_hourly_unique").on(t.agentName, t.hour),
    index("ops_agent_runs_hourly_hour").on(t.hour),
    index("ops_agent_runs_hourly_agent").on(t.agentName),
  ],
);

// ─── Agent Alerts ───────────────────────────────────────────────────────────
// Agent-specific alerts and warnings for the Recent Alerts panel.

export const opsAgentAlerts = pgTable(
  "ops_agent_alerts",
  {
    id: uuidId(),
    agentName: text("agent_name").notNull(),
    alertType: text("alert_type").notNull(),
    // Types: "high_error_rate", "low_success_rate", "high_latency", "agent_offline", "agent_deployed"
    severity: text("severity").notNull().default("warning"),
    // "info", "warning", "critical"
    title: text("title").notNull(),
    description: text("description"),
    acknowledged: boolean("acknowledged").notNull().default(false),
    resolvedAt: timestamp("resolved_at"),
    ...timestamps,
  },
  (t) => [
    index("ops_agent_alerts_agent").on(t.agentName),
    index("ops_agent_alerts_type").on(t.alertType),
    index("ops_agent_alerts_severity").on(t.severity),
    index("ops_agent_alerts_created").on(t.createdAt),
  ],
);

// ─── System Resources ───────────────────────────────────────────────────────
// System resource snapshots (CPU, memory, worker queue).

export const opsSystemResources = pgTable(
  "ops_system_resources",
  {
    id: uuidId(),
    cpuUsagePercent: numeric("cpu_usage_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    cpuCores: integer("cpu_cores").notNull().default(0),
    memoryUsagePercent: numeric("memory_usage_percent", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),
    memoryTotalGb: numeric("memory_total_gb", { precision: 5, scale: 1 })
      .notNull()
      .default("0"),
    workerQueueJobs: integer("worker_queue_jobs").notNull().default(0),
    allSystemsOperational: boolean("all_systems_operational")
      .notNull()
      .default(true),
    activeWorkflows: integer("active_workflows").default(0),
    queueLength: integer("queue_length").default(0),
    ...timestamps,
  },
  (t) => [index("ops_system_resources_created").on(t.createdAt)],
);

// ─── Agent Activity ─────────────────────────────────────────────────────────
// Recent agent activity for the activity feed.

export const opsAgentActivity = pgTable(
  "ops_agent_activity",
  {
    id: uuidId(),
    agentName: text("agent_name").notNull(),
    activityType: text("activity_type").notNull(),
    // Types: "matched", "identified", "downloaded", "connected", "processed", "reviewed"
    title: text("title").notNull(),
    description: text("description"),
    ...timestamps,
  },
  (t) => [
    index("ops_agent_activity_agent").on(t.agentName),
    index("ops_agent_activity_created").on(t.createdAt),
  ],
);

// ─── Workload Distribution ──────────────────────────────────────────────────
// Daily workload distribution for the donut chart.

export const opsWorkloadDistribution = pgTable(
  "ops_workload_distribution",
  {
    id: uuidId(),
    date: text("date").notNull(), // YYYY-MM-DD
    completed: integer("completed").default(0),
    inProgress: integer("in_progress").default(0),
    review: integer("review").default(0),
    scheduled: integer("scheduled").default(0),
    failed: integer("failed").default(0),
    totalTasks: integer("total_tasks").default(0),
    ...timestamps,
  },
  (t) => [index("ops_workload_distribution_date").on(t.date)],
);
