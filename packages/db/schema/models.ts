import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";
import { users } from "./auth";

// ─── ENUMS ───────────────────────────────────────

export const modelProviderEnum = pgEnum("model_provider", [
  "anthropic",
  "bedrock",
  "vertex",
  "openai",
  "fireworks",
  "together",
  "deepinfra",
  "openrouter",
]);

export const modelTaskTypeEnum = pgEnum("model_task_type", [
  // Strategic (CFO Agent)
  "strategic_planning",
  "financial_analysis",
  "executive_summary",
  "risk_assessment",
  // Management (Controller, Treasury, Payroll, Compliance)
  "approval_decision",
  "cash_flow_forecast",
  "payroll_calculation",
  "compliance_check",
  "reconciliation_review",
  // Worker (AP, AR, Ledger, Cash, Reconciliation, Tax, Filing, Reporting)
  "invoice_matching",
  "payment_scheduling",
  "journal_posting",
  "cash_reconciliation",
  "tax_calculation",
  "filing_preparation",
  "report_generation",
  // Platform (Document, Budget, Analytics)
  "ocr_field_extraction",
  "document_classification",
  "structured_extraction",
  "budget_variance_analysis",
  "anomaly_detection",
  // Chat / General
  "chat_response",
  "summarization",
  "translation",
]);

// ─── MODEL ASSIGNMENTS ────────────────────────────
// Admin-configurable model routing per agent/task type
// This is what the Model Ops admin panel edits — changing a model in production
// is a row update, not a deploy

export const modelAssignments = pgTable(
  "model_assignments",
  {
    id: uuidId(),
    agentName: text("agent_name").notNull(),
    taskType: modelTaskTypeEnum("task_type").notNull(),
    liveModelId: text("live_model_id").notNull(),
    liveProvider: modelProviderEnum("live_provider").notNull(),
    fallbackModelId: text("fallback_model_id"),
    fallbackProvider: modelProviderEnum("fallback_provider"),
    trafficSplit: jsonb("traffic_split")
      .default({})
      .$type<Record<string, number>>(), // e.g. {"claude-sonnet-4-6": 90, "kimi-k3": 10}
    evaluationGate: text("evaluation_gate").default("none"), // "gate1" | "gate2" | "gate3" | "gate4" | "complete"
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("model_assignments_agent_task").on(t.agentName, t.taskType),
    index("model_assignments_active").on(t.isActive),
  ],
);

// ─── MODEL REGISTRY ──────────────────────────────
// Registry of all available models (candidate + live)
// Cost per 1M tokens for budgeting

export const modelRegistry = pgTable(
  "model_registry",
  {
    id: uuidId(),
    modelId: text("model_id").notNull().unique(), // e.g. "claude-sonnet-4-6", "kimi-k3", "deepseek-r1"
    displayName: text("display_name").notNull(),
    provider: modelProviderEnum("provider").notNull(),
    capabilities: jsonb("capabilities").default({}).$type<{
      supportsTools: boolean;
      supportsVision: boolean;
      supportsStreaming: boolean;
      maxContextTokens: number;
      maxOutputTokens: number;
    }>(),
    costPerMillionInputTokens: text("cost_per_million_input_tokens").notNull(), // string for precision
    costPerMillionOutputTokens: text(
      "cost_per_million_output_tokens",
    ).notNull(),
    endpoints: jsonb("endpoints").default([]).$type<string[]>(), // API endpoints for provider pooling
    isActive: boolean("is_active").notNull().default(true),
    isDeprecated: boolean("is_deprecated").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("model_registry_provider").on(t.provider)],
);

// ─── MODEL EVALUATION RUNS ───────────────────────
// Tracks Gate 1-4 evaluation results per candidate model

export const modelEvaluations = pgTable(
  "model_evaluations",
  {
    id: uuidId(),
    modelId: text("model_id").notNull(),
    provider: modelProviderEnum("provider").notNull(),
    agentName: text("agent_name").notNull(),
    taskType: modelTaskTypeEnum("task_type").notNull(),
    gate: text("gate").notNull(), // "gate1" | "gate2" | "gate3" | "gate4"
    status: text("status").notNull(), // "pending" | "running" | "passed" | "failed" | "skipped"
    goldenDatasetPassRate: text("golden_dataset_pass_rate"), // 0-1
    shadowModeComparison: jsonb("shadow_mode_comparison").$type<{
      liveModelOutputs: number;
      candidateModelOutputs: number;
      agreementRate: number;
      confidenceDelta: number;
    }>(),
    canaryMetrics: jsonb("canary_metrics").$type<{
      trafficPercent: number;
      requestsCount: number;
      errorRate: number;
      avgLatencyMs: number;
      escalationRate: number;
      confidenceScore: number;
    }>(),
    notes: text("notes"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    ...timestamps,
  },
  (t) => [
    index("model_evaluations_model").on(t.modelId),
    index("model_evaluations_agent_task").on(t.agentName, t.taskType),
    index("model_evaluations_gate").on(t.gate),
  ],
);

// ─── MODEL COST TRACKING ─────────────────────────
// Aggregated cost per agent/model for the cost dashboard

export const modelCostTracking = pgTable(
  "model_cost_tracking",
  {
    id: uuidId(),
    entityId: uuid("entity_id").notNull(),
    agentName: text("agent_name").notNull(),
    modelId: text("model_id").notNull(),
    provider: modelProviderEnum("provider").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD for daily aggregation
    requestsCount: text("requests_count").notNull().default("0"),
    inputTokens: text("input_tokens").notNull().default("0"),
    outputTokens: text("output_tokens").notNull().default("0"),
    costUsd: text("cost_usd").notNull().default("0"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("model_cost_tracking_daily").on(
      t.entityId,
      t.agentName,
      t.modelId,
      t.date,
    ),
    index("model_cost_tracking_entity_date").on(t.entityId, t.date),
  ],
);
