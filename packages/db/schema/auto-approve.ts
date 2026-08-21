import {
  pgTable,
  text,
  numeric,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";

// ─── Auto-Approve Rules Schema ─────────────────────────────────────────────
//
// Smart rules that learn from approval patterns and auto-approve routine
// transactions. The AI observes which approvals are always approved and
// suggests rules. Rules have confidence thresholds and spending limits.

export const autoApproveRules = pgTable(
  "auto_approve_rules",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    // Rule identity
    name: text("name").notNull(),
    description: text("description"),
    // Rule conditions (all must match)
    conditions: jsonb("conditions").notNull().$type<{
      approvalType?: string; // e.g., "journal_entry", "expense_claim"
      minAmount?: number;
      maxAmount?: number;
      targetRecordType?: string;
      agentName?: string;
      accountCodes?: string[]; // e.g., ["5000", "5010"] for specific expense accounts
      vendors?: string[];
      keywords?: string[]; // Match in reasoning/description
    }>(),
    // Action
    action: text("action").notNull().default("auto_approve"), // "auto_approve", "auto_approve_with_limit", "escalate"
    maxAmount: numeric("max_amount", { precision: 15, scale: 2 }), // Spending limit for auto-approve
    // AI learning
    confidence: numeric("confidence", { precision: 3, scale: 2 }).default(
      "0.5",
    ), // AI confidence in this rule
    learnedFrom: integer("learned_from").default(0), // Number of approvals this was learned from
    lastTriggeredAt: timestamp("last_triggered_at"),
    triggerCount: integer("trigger_count").notNull().default(0),
    // Status
    isActive: boolean("is_active").notNull().default(true),
    createdBy: text("created_by").default("ai"), // "ai", "user", "system"
    ...timestamps,
  },
  (t) => [
    index("auto_approve_entity").on(t.entityId),
    index("auto_approve_active").on(t.entityId, t.isActive),
    index("auto_approve_type").on(t.entityId, t.conditions),
  ],
);

export const autoApproveRulesRelations = relations(
  autoApproveRules,
  ({ one }) => ({
    entity: one(entities, {
      fields: [autoApproveRules.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── Auto-Approve Log ──────────────────────────────────────────────────────
// Tracks every auto-approval for audit trail.

export const autoApproveLog = pgTable(
  "auto_approve_log",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    ruleId: uuid("rule_id").references(() => autoApproveRules.id),
    // What was auto-approved
    approvalType: text("approval_type").notNull(),
    targetRecordType: text("target_record_type").notNull(),
    targetRecordId: uuid("target_record_id").notNull(),
    // Rule match details
    matchedConditions:
      jsonb("matched_conditions").$type<Record<string, unknown>>(),
    // Outcome
    action: text("action").notNull(), // "auto_approved", "auto_approved_with_limit", "escalated"
    amount: numeric("amount", { precision: 15, scale: 2 }),
    // Audit
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    approvedAt: timestamp("approved_at").notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("auto_approve_log_entity").on(t.entityId),
    index("auto_approve_log_rule").on(t.ruleId),
    index("auto_approve_log_date").on(t.entityId, t.approvedAt),
  ],
);

export const autoApproveLogRelations = relations(autoApproveLog, ({ one }) => ({
  entity: one(entities, {
    fields: [autoApproveLog.entityId],
    references: [entities.id],
  }),
  rule: one(autoApproveRules, {
    fields: [autoApproveLog.ruleId],
    references: [autoApproveRules.id],
  }),
}));
