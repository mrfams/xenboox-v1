import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";
import { organizations } from "./organization";
import { entities } from "./organization";

// ─── CONFIDENCE THRESHOLDS ─────────────────────────
//
// Per-agent, per-transaction-type, per-amount-band confidence thresholds.
// org_id null = platform default; org-level override takes precedence.
// Platform ships with sane defaults seeded below.
//
// Schema:
//   confidence_thresholds
//     id              uuid PK
//     org_id          nullable — null = platform default
//     agent_id        which agent this applies to
//     transaction_type  e.g. "ap_aging", "reconciliation", "payroll"
//     amount_band     e.g. "<100", "100-10000", ">10000"
//     min_confidence  decimal, e.g. 0.95
//     updated_by      who created/modified this
//     created_at, updated_at

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

// ─── AGENT ROUTING LOGS ────────────────────────────
//
// Every routing decision logged, regardless of outcome.
// Exportable per period, per entity, on demand.
//
// Schema matches spec Step 10:
//   { timestamp, session_id, input, intent, agents_involved, confidence,
//     threshold_used, decision (auto/escalated), human_response (if any) }

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
