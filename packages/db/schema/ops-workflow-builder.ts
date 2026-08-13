import {
  pgEnum,
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";

// Enums
export const workflowStatusEnum = pgEnum("workflow_status", [
  "draft",
  "active",
  "paused",
  "archived",
]);

export const nodeTypeEnum = pgEnum("node_type", [
  "trigger",
  "ai_agent",
  "action",
  "condition",
  "router",
  "delay",
  "approval",
  "review",
]);

export const triggerTypeEnum = pgEnum("trigger_type", [
  "schedule",
  "webhook",
  "file_upload",
  "email_inbound",
  "manual",
]);

export const runStatusEnum = pgEnum("run_status", [
  "running",
  "completed",
  "failed",
  "paused",
  "cancelled",
]);

// Workflows
export const workflows = pgTable("workflows", {
  id: uuidId(),
  ...timestamps,

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: workflowStatusEnum("status").notNull().default("draft"),

  // Version
  version: varchar("version", { length: 50 }).notNull().default("1.0"),
  lastPublishedAt: timestamp("last_published_at"),

  // Stats
  totalSteps: integer("total_steps").notNull().default(0),
  aiAgentCount: integer("ai_agent_count").notNull().default(0),
  humanStepCount: integer("human_step_count").notNull().default(0),
  integrationCount: integer("integration_count").notNull().default(0),
  avgDurationMinutes: numeric("avg_duration_minutes", {
    precision: 5,
    scale: 2,
  }),

  // Performance
  successRate: numeric("success_rate", { precision: 5, scale: 2 }),
  totalRuns: integer("total_runs").notNull().default(0),

  // Canvas data
  canvasData: jsonb("canvas_data").$type<Record<string, unknown>>(),

  // Settings
  settings: jsonb("settings").$type<Record<string, unknown>>(),
});

// Workflow Nodes
export const workflowNodes = pgTable("workflow_nodes", {
  id: uuidId(),
  ...timestamps,

  workflowId: uuid("workflow_id")
    .references(() => workflows.id)
    .notNull(),

  // Node details
  name: varchar("name", { length: 255 }).notNull(),
  type: nodeTypeEnum("type").notNull(),
  stepNumber: integer("step_number"),

  // Position (for canvas)
  x: numeric("x", { precision: 10, scale: 2 }),
  y: numeric("y", { precision: 10, scale: 2 }),

  // Configuration
  config: jsonb("config").$type<Record<string, unknown>>(),

  // For AI agents
  model: varchar("model", { length: 100 }),
  instructions: text("instructions"),
  outputSchema: jsonb("output_schema").$type<Record<string, unknown>>(),
  confidenceThreshold: integer("confidence_threshold").default(85),

  // For triggers
  triggerType: triggerTypeEnum("trigger_type"),

  // For conditions
  condition: text("condition"),
  trueBranch: varchar("true_branch", { length: 255 }),
  falseBranch: varchar("false_branch", { length: 255 }),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

// Workflow Edges (connections between nodes)
export const workflowEdges = pgTable("workflow_edges", {
  id: uuidId(),
  ...timestamps,

  workflowId: uuid("workflow_id")
    .references(() => workflows.id)
    .notNull(),

  sourceNodeId: uuid("source_node_id")
    .references(() => workflowNodes.id)
    .notNull(),
  targetNodeId: uuid("target_node_id")
    .references(() => workflowNodes.id)
    .notNull(),

  // Label (e.g., "Yes", "No")
  label: varchar("label", { length: 100 }),

  // Condition
  condition: text("condition"),
});

// Workflow Runs
export const workflowRuns = pgTable("workflow_runs", {
  id: uuidId(),
  ...timestamps,

  workflowId: uuid("workflow_id")
    .references(() => workflows.id)
    .notNull(),

  status: runStatusEnum("status").notNull().default("running"),

  // Timing
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  durationMinutes: numeric("duration_minutes", { precision: 5, scale: 2 }),

  // Progress
  currentNodeId: varchar("current_node_id", { length: 255 }),
  completedSteps: integer("completed_steps").notNull().default(0),
  totalSteps: integer("total_steps").notNull().default(0),

  // Results
  result: jsonb("result").$type<Record<string, unknown>>(),
  error: text("error"),

  // Stats
  confidence: numeric("confidence", { precision: 5, scale: 2 }),
  fieldsExtracted: integer("fields_extracted"),
  fieldsTotal: integer("fields_total"),

  // Triggered by
  triggeredBy: varchar("triggered_by", { length: 255 }),
});

// Workflow Versions
export const workflowVersions = pgTable("workflow_versions", {
  id: uuidId(),
  ...timestamps,

  workflowId: uuid("workflow_id")
    .references(() => workflows.id)
    .notNull(),

  version: varchar("version", { length: 50 }).notNull(),
  description: text("description"),

  // Snapshot
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>(),

  // Published by
  publishedBy: varchar("published_by", { length: 255 }),
});

// Workflow Templates
export const workflowTemplates = pgTable("workflow_templates", {
  id: uuidId(),
  ...timestamps,

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),

  // Template data
  templateData: jsonb("template_data").$type<Record<string, unknown>>(),

  // Stats
  usageCount: integer("usage_count").notNull().default(0),
});
