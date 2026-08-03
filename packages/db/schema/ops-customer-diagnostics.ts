import {
  pgEnum,
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";
import { organizations } from "./organization";

// Enums
export const issueSeverityEnum = pgEnum("issue_severity", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const issueStatusEnum = pgEnum("issue_status", [
  "investigating",
  "identified",
  "monitoring",
  "resolved",
  "closed",
]);

export const issueCategoryEnum = pgEnum("issue_category", [
  "data_ingestion",
  "agent_execution",
  "reconciliation",
  "integrations",
  "reporting",
  "other",
]);

export const organizationTierEnum = pgEnum("organization_tier", [
  "enterprise",
  "growth",
  "starter",
]);

// Customer Issues (main table)
export const customerIssues = pgTable("customer_issues", {
  id: uuidId(),
  ...timestamps,

  // Issue details
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  category: issueCategoryEnum("category").notNull(),
  severity: issueSeverityEnum("severity").notNull(),
  status: issueStatusEnum("status").notNull().default("investigating"),

  // Relationships
  organizationId: varchar("organization_id", { length: 255 }).references(
    () => organizations.id,
  ),
  agentId: varchar("agent_id", { length: 255 }),
  workflowId: varchar("workflow_id", { length: 255 }),

  // Impact tracking
  customersImpacted: integer("customers_impacted").default(0),

  // Resolution tracking
  identifiedAt: timestamp("identified_at"),
  resolvedAt: timestamp("resolved_at"),
  mttrMinutes: integer("mttr_minutes"), // Mean Time to Resolve in minutes

  // Metadata
  metadata: text("metadata"), // JSON string
});

// Issues Over Time (daily aggregation for charts)
export const issuesOverTime = pgTable("issues_over_time", {
  id: uuidId(),
  ...timestamps,

  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD

  // Counts by severity
  criticalCount: integer("critical_count").notNull().default(0),
  highCount: integer("high_count").notNull().default(0),
  mediumCount: integer("medium_count").notNull().default(0),
  lowCount: integer("low_count").notNull().default(0),

  // Totals
  totalIssues: integer("total_issues").notNull().default(0),
  resolvedIssues: integer("resolved_issues").notNull().default(0),
});

// Issues by Category (aggregated)
export const issuesByCategory = pgTable("issues_by_category", {
  id: uuidId(),
  ...timestamps,

  category: issueCategoryEnum("category").notNull(),
  issueCount: integer("issue_count").notNull().default(0),
  percentage: numeric("percentage", { precision: 5, scale: 1 })
    .notNull()
    .default("0"),

  // Time period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
});

// Organizations with Active Issues
export const orgActiveIssues = pgTable("org_active_issues", {
  id: uuidId(),
  ...timestamps,

  organizationId: varchar("organization_id", { length: 255 }).references(
    () => organizations.id,
  ),
  organizationName: varchar("organization_name", { length: 255 }).notNull(),
  tier: organizationTierEnum("tier").notNull(),

  // Issue counts
  activeIssues: integer("active_issues").notNull().default(0),
  criticalIssues: integer("critical_issues").notNull().default(0),

  // MTTR
  mttrMinutes: integer("mttr_minutes"), // Mean Time to Resolve in minutes

  // Status
  status: issueStatusEnum("status").notNull().default("investigating"),
  lastUpdated: timestamp("last_updated"),
});

// Issue Resolution SLA
export const issueResolutionSla = pgTable("issue_resolution_sla", {
  id: uuidId(),
  ...timestamps,

  metSlaCount: integer("met_sla_count").notNull().default(0),
  breachedSlaCount: integer("breached_sla_count").notNull().default(0),
  metSlaPercentage: numeric("met_sla_percentage", { precision: 5, scale: 1 })
    .notNull()
    .default("0"),

  // Time period
  periodDays: integer("period_days").notNull().default(7),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
});

// Top Impacted Workflows
export const topImpactedWorkflows = pgTable("top_impacted_workflows", {
  id: uuidId(),
  ...timestamps,

  workflowName: varchar("workflow_name", { length: 255 }).notNull(),
  issueCount: integer("issue_count").notNull().default(0),
  percentage: numeric("percentage", { precision: 5, scale: 1 })
    .notNull()
    .default("0"),

  // Time period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
});

// Diagnostics Insights
export const diagnosticsInsights = pgTable("diagnostics_insights", {
  id: uuidId(),
  ...timestamps,

  insightType: varchar("insight_type", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  iconType: varchar("icon_type", { length: 50 }), // error, warning, info
  actionUrl: varchar("action_url", { length: 1000 }),

  // Relevance
  isRelevant: boolean("is_relevant").default(true),
  priority: integer("priority").default(0),
});
