import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { organizations } from "./organization";
import { entities } from "./organization";
import { fiscalPeriods } from "./accounting";
import { users } from "./auth";

// ─── ENUMS ──────────────────────────────────────────────────────────────

export const agentNameEnum = pgEnum("agent_name", [
  "cfo",
  "controller",
  "treasury",
  "payroll_manager",
  "compliance",
  "ledger",
  "ap",
  "ar",
  "asset",
  "inventory",
  "reconciliation",
  "cash",
  "mobile_money",
  "expense",
  "payroll_worker",
  "tax",
  "audit",
  "reporting",
  "budget",
  "analytics",
  "document",
]);

export const agentTierEnum = pgEnum("agent_tier", [
  "strategic",
  "management",
  "worker",
  "platform",
]);

export const agentModelEnum = pgEnum("agent_model", [
  "haiku-4-5",
  "sonnet-4-6",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "escalated",
]);

export const closePeriodStatusEnum = pgEnum("close_period_status", [
  "open",
  "pending_close",
  "closed",
  "reopened",
]);

// ─── AGENTS REFERENCE TABLE (§2.1) ───────────────────────────────────────
//
// Seeded once at deployment; not user-editable.
// Every agent_source FK in the schema points here.
// 19 agents in a 3-tier hierarchy + platform layer.

export const agents = pgTable(
  "agents",
  {
    id: uuidId(),
    name: agentNameEnum("name").notNull().unique(),
    displayName: text("display_name").notNull(),
    tier: agentTierEnum("tier").notNull(),
    model: agentModelEnum("model").notNull().default("haiku-4-5"),
    reportsTo: uuid("reports_to").references((): any => agents.id),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("agents_tier").on(t.tier),
    index("agents_reports_to").on(t.reportsTo),
  ],
);

export const agentsRelations = relations(agents, ({ one, many }) => ({
  manager: one(agents, {
    fields: [agents.reportsTo],
    references: [agents.id],
    relationName: "managerSubordinate",
  }),
  subordinates: many(agents, { relationName: "managerSubordinate" }),
}));

// ─── CONFIDENCE THRESHOLDS ─────────────────────────
//
// Per-agent, per-transaction-type, per-amount-band confidence thresholds.
// org_id null = platform default; org-level override takes precedence.
// Platform ships with sane defaults seeded below.

export const confidenceThresholds = pgTable(
  "confidence_thresholds",
  {
    id: uuidId(),
    orgId: uuid("org_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    agentId: text("agent_id").notNull(),
    transactionType: text("transaction_type").notNull(),
    amountBand: text("amount_band").notNull().default("any"),
    minConfidence: numeric("min_confidence", {
      precision: 4,
      scale: 3,
    })
      .notNull()
      .default("0.900"),
    updatedBy: uuid("updated_by"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("idx_confidence_thresholds_unique").on(
      t.orgId,
      t.agentId,
      t.transactionType,
      t.amountBand,
    ),
    index("idx_confidence_thresholds_org").on(t.orgId),
    index("idx_confidence_thresholds_agent").on(t.agentId),
  ],
);

// ─── APPROVALS TABLE (§15) ──────────────────────────────────────────────
//
// Tracks every human-in-the-loop approval event across the platform.
// Agents request → humans approve/reject/escalate.
// Used by the Review Queue UI and audit trail queries.

export const approvals = pgTable(
  "approvals",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    requestedByAgentId: uuid("requested_by_agent_id")
      .notNull()
      .references(() => agents.id),
    approvalType: text("approval_type").notNull(),
    // e.g. "journal_entry", "payroll_run", "month_end_close", "expense_claim"
    targetRecordType: text("target_record_type").notNull(),
    targetRecordId: uuid("target_record_id").notNull(),
    // Polymorphic UUID — validated in app layer
    reasoning: text("reasoning"),
    // Agent's reasoning for requesting approval
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    status: approvalStatusEnum("status").notNull().default("pending"),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    resolutionNote: text("resolution_note"),
    escalatedToAgentId: uuid("escalated_to_agent_id").references(
      () => agents.id,
    ),
    ...timestamps,
  },
  (t) => [
    index("approvals_entity").on(t.entityId),
    index("approvals_agent").on(t.requestedByAgentId),
    index("approvals_status").on(t.entityId, t.status),
    index("approvals_target").on(t.targetRecordType, t.targetRecordId),
    index("approvals_assigned").on(t.assignedToUserId),
    index("approvals_created").on(t.entityId, t.createdAt),
  ],
);

export const approvalsRelations = relations(approvals, ({ one }) => ({
  entity: one(entities, {
    fields: [approvals.entityId],
    references: [entities.id],
  }),
  requestedBy: one(agents, {
    fields: [approvals.requestedByAgentId],
    references: [agents.id],
  }),
  assignedTo: one(users, {
    fields: [approvals.assignedToUserId],
    references: [users.id],
  }),
  escalatedTo: one(agents, {
    fields: [approvals.escalatedToAgentId],
    references: [agents.id],
  }),
}));

// ─── GOLDEN DATASET EVALS (§15) ─────────────────────────────────────────
//
// Platform-level evaluation framework per PRD §6.7 Layer 3.
// Not entity-scoped — runs against the model/agent directly.

export const goldenDatasetEvals = pgTable(
  "golden_dataset_evals",
  {
    id: uuidId(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id),
    scenarioDescription: text("scenario_description").notNull(),
    expectedOutput: jsonb("expected_output").notNull().$type<unknown>(),
    actualOutput: jsonb("actual_output").$type<unknown>(),
    passed: boolean("passed"),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    runAt: timestamp("run_at").notNull().defaultNow(),
    durationMs: numeric("duration_ms"),
    modelVersion: text("model_version"),
    errorMessage: text("error_message"),
    ...timestamps,
  },
  (t) => [
    index("gde_agent").on(t.agentId),
    index("gde_passed").on(t.agentId, t.passed),
    index("gde_run_at").on(t.agentId, t.runAt),
  ],
);

export const goldenDatasetEvalsRelations = relations(
  goldenDatasetEvals,
  ({ one }) => ({
    agent: one(agents, {
      fields: [goldenDatasetEvals.agentId],
      references: [agents.id],
    }),
  }),
);

// ─── CLOSE PERIODS (§15) ────────────────────────────────────────────────
//
// Period-level close status tracking.
// One row per entity per period month.
// P1 table per §17 build priority.

export const closePeriods = pgTable(
  "close_periods",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    fiscalPeriodId: uuid("fiscal_period_id")
      .notNull()
      .references(() => fiscalPeriods.id, { onDelete: "cascade" }),
    periodMonth: text("period_month").notNull(), // "2026-07"
    status: closePeriodStatusEnum("status").notNull().default("open"),
    closedBy: uuid("closed_by").references(() => agents.id),
    closedAt: timestamp("closed_at"),
    reopenedAt: timestamp("reopened_at"),
    reopenedReason: text("reopened_reason"),
    priorVersionSnapshotId: uuid("prior_version_snapshot_id").references(
      (): any => closePeriods.id,
    ),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("cp_entity_period").on(t.entityId, t.periodMonth),
    index("cp_entity").on(t.entityId),
    index("cp_status").on(t.entityId, t.status),
  ],
);

export const closePeriodsRelations = relations(closePeriods, ({ one }) => ({
  entity: one(entities, {
    fields: [closePeriods.entityId],
    references: [entities.id],
  }),
  fiscalPeriod: one(fiscalPeriods, {
    fields: [closePeriods.fiscalPeriodId],
    references: [fiscalPeriods.id],
  }),
  closedByAgent: one(agents, {
    fields: [closePeriods.closedBy],
    references: [agents.id],
  }),
}));

// ─── AGENT ROUTING LOGS ────────────────────────────
//
// Every routing decision logged, regardless of outcome.
// Exportable per period, per entity, on demand.

export const agentRoutingLogs = pgTable(
  "agent_routing_logs",
  {
    id: uuidId(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    sessionId: text("session_id"),
    conversationId: uuid("conversation_id"),
    intentType: text("intent_type").notNull(),
    inputSummary: text("input_summary").notNull(),
    agentsInvolved: text("agents_involved").array().notNull().default([]),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    thresholdUsed: numeric("threshold_used", { precision: 4, scale: 3 }),
    thresholdConfig: text("threshold_config"),
    decision: text("decision").notNull().default("auto"),
    humanResponse: text("human_response"),
    escalationReason: text("escalation_reason"),
    taskId: text("task_id"),
    durationMs: numeric("duration_ms"),
    metadata: text("metadata"),
    ...timestamps,
  },
  (t) => [
    index("idx_routing_logs_entity").on(t.entityId),
    index("idx_routing_logs_session").on(t.sessionId),
    index("idx_routing_logs_created").on(t.createdAt),
    index("idx_routing_logs_intent").on(t.intentType),
    index("idx_routing_logs_entity_created").on(t.entityId, t.createdAt),
  ],
);
