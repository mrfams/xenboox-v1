// ─── Ops Console Schema ─────────────────────────────────────────────────────
//
// Platform-level operational metrics for the admin Ops Dashboard.
// NOT entity-scoped — these are global platform metrics.
// Tables:
//   ops_system_health        — Service health status snapshots
//   ops_metrics_daily        — Daily aggregated platform metrics
//   ops_ai_runs              — Individual AI run records for aggregation
//   ops_support_tickets      — Support ticket tracking
//   ops_activity_feed        — Platform activity feed events
//   ops_model_usage_daily    — Daily model usage aggregation

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

export const serviceStatusEnum = pgEnum("service_status", [
  "operational",
  "degraded",
  "outage",
  "maintenance",
]);

export const ticketSeverityEnum = pgEnum("ticket_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "bank_reconciliation",
  "ai_model_updated",
  "organization_created",
  "error_detected",
  "invoice_processed",
  "deployment",
  "alert",
  "agent_run",
  "user_signup",
  "subscription_change",
]);

// ─── System Health ──────────────────────────────────────────────────────────
// Snapshots of service health status. Updated by monitoring system.

export const opsSystemHealth = pgTable(
  "ops_system_health",
  {
    id: uuidId(),
    serviceName: text("service_name").notNull().unique(),
    displayName: text("display_name").notNull(),
    status: serviceStatusEnum("status").notNull().default("operational"),
    uptimePercent: numeric("uptime_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("100.00"),
    lastCheckedAt: timestamp("last_checked_at").notNull().defaultNow(),
    incidentCount: integer("incident_count").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [index("ops_health_status").on(t.status)],
);

// ─── Daily Metrics ──────────────────────────────────────────────────────────
// Aggregated platform metrics per day. Powers the KPI cards and charts.

export const opsMetricsDaily = pgTable(
  "ops_metrics_daily",
  {
    id: uuidId(),
    date: text("date").notNull(), // YYYY-MM-DD
    activeOrganizations: integer("active_organizations").notNull().default(0),
    activeOrganizationsDelta: integer("active_organizations_delta")
      .notNull()
      .default(0),
    mrr: numeric("mrr", { precision: 15, scale: 2 }).notNull().default("0"),
    mrrCurrency: text("mrr_currency").notNull().default("USD"),
    mrrDeltaPercent: numeric("mrr_delta_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    aiRuns: integer("ai_runs").notNull().default(0),
    aiRunsDeltaPercent: numeric("ai_runs_delta_percent", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalCost: numeric("total_cost", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    totalCostDeltaPercent: numeric("total_cost_delta_percent", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),
    grossMargin: numeric("gross_margin", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    grossMarginDeltaPercent: numeric("gross_margin_delta_percent", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),
    aiSuccessRate: numeric("ai_success_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    avgResponseTimeMs: numeric("avg_response_time_ms", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    openSupportTickets: integer("open_support_tickets").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ops_metrics_date").on(t.date),
    index("ops_metrics_created").on(t.createdAt),
  ],
);

// ─── AI Runs ────────────────────────────────────────────────────────────────
// Individual AI run records for detailed analytics and cost tracking.

export const opsAiRuns = pgTable(
  "ops_ai_runs",
  {
    id: uuidId(),
    date: text("date").notNull(), // YYYY-MM-DD
    modelId: text("model_id").notNull(),
    modelName: text("model_name").notNull(),
    provider: text("provider").notNull(),
    agentName: text("agent_name"),
    requestId: text("request_id"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 })
      .notNull()
      .default("0"),
    latencyMs: integer("latency_ms").notNull().default(0),
    success: boolean("success").notNull().default(true),
    errorMessage: text("error_message"),
    ...timestamps,
  },
  (t) => [
    index("ops_ai_runs_date").on(t.date),
    index("ops_ai_runs_model").on(t.modelId),
    index("ops_ai_runs_provider").on(t.provider),
    index("ops_ai_runs_date_model").on(t.date, t.modelId),
  ],
);

// ─── Support Tickets ────────────────────────────────────────────────────────

export const opsSupportTickets = pgTable(
  "ops_support_tickets",
  {
    id: uuidId(),
    ticketNumber: text("ticket_number").notNull().unique(),
    subject: text("subject").notNull(),
    description: text("description"),
    severity: ticketSeverityEnum("severity").notNull().default("medium"),
    status: ticketStatusEnum("status").notNull().default("open"),
    organizationName: text("organization_name"),
    organizationId: uuid("organization_id"),
    assignedTo: text("assigned_to"),
    resolvedAt: timestamp("resolved_at"),
    ...timestamps,
  },
  (t) => [
    index("ops_tickets_status").on(t.status),
    index("ops_tickets_severity").on(t.severity),
    index("ops_tickets_created").on(t.createdAt),
  ],
);

// ─── Activity Feed ──────────────────────────────────────────────────────────
// Platform-wide activity feed for the admin dashboard.

export const opsActivityFeed = pgTable(
  "ops_activity_feed",
  {
    id: uuidId(),
    activityType: activityTypeEnum("activity_type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    entityName: text("entity_name"), // Organization or entity name
    entityId: uuid("entity_id"),
    organizationId: uuid("organization_id"),
    actorName: text("actor_name"),
    actorId: uuid("actor_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("ops_activity_type").on(t.activityType),
    index("ops_activity_created").on(t.createdAt),
    index("ops_activity_org").on(t.organizationId),
  ],
);

// ─── Model Usage Daily ──────────────────────────────────────────────────────
// Aggregated model usage per day for the "Top AI Models" chart.

export const opsModelUsageDaily = pgTable(
  "ops_model_usage_daily",
  {
    id: uuidId(),
    date: text("date").notNull(), // YYYY-MM-DD
    modelId: text("model_id").notNull(),
    modelName: text("model_name").notNull(),
    provider: text("provider").notNull(),
    runCount: integer("run_count").notNull().default(0),
    totalInputTokens: integer("total_input_tokens").notNull().default(0),
    totalOutputTokens: integer("total_output_tokens").notNull().default(0),
    totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 4 })
      .notNull()
      .default("0"),
    avgLatencyMs: integer("avg_latency_ms").notNull().default(0),
    successRate: numeric("success_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ops_model_usage_daily_unique").on(t.date, t.modelId),
    index("ops_model_usage_date").on(t.date),
    index("ops_model_usage_model").on(t.modelId),
  ],
);
