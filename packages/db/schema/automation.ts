import {
  pgEnum,
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { uuidId, entityId, timestamps } from "./helpers";

// ─── Entity automation rules (tenant-facing Automation Studio) ─────────────
//
// Entity-scoped automation rules the workspace owner configures: recurring
// transactions, scheduled invoice reminders, and scheduled report exports.
// The scheduler (lib/automation) ticks these and marks nextRunAt/lastRunAt;
// runs are recorded so the page shows real activity. Entity scoping is
// non-negotiable — every row belongs to exactly one entity.

export const automationTriggerTypeEnum = pgEnum("automation_trigger_type", [
  "schedule",
  "event",
]);

export const automationActionTypeEnum = pgEnum("automation_action_type", [
  "recurring_transaction",
  "invoice_reminder",
  "bill_reminder",
  "report_export",
]);

export const automationRunStatusEnum = pgEnum("automation_run_status", [
  "idle",
  "success",
  "failed",
]);

export const entityAutomationRules = pgTable("entity_automation_rules", {
  id: uuidId(),
  ...timestamps,
  entityId: entityId.notNull(),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  // Trigger
  triggerType: automationTriggerTypeEnum("trigger_type")
    .notNull()
    .default("schedule"),
  /** Human schedule, e.g. "Every 1st of the month". */
  scheduleLabel: varchar("schedule_label", { length: 100 }),
  /** day of month (1-31) or weekday (0=Sun..6=Sat) depending on scheduleKind. */
  scheduleKind: varchar("schedule_kind", { length: 20 }), // "daily" | "weekly" | "monthly"
  scheduleDay: integer("schedule_day"),

  // Action
  actionType: automationActionTypeEnum("action_type").notNull(),
  /** Action-specific config: { amount, accountId, vendorId, reportType, … } */
  config: jsonb("config")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),

  // State
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  runCount: integer("run_count").notNull().default(0),
  lastRunStatus: automationRunStatusEnum("last_run_status")
    .notNull()
    .default("idle"),
  lastRunSummary: text("last_run_summary"),
});

export type EntityAutomationRule = typeof entityAutomationRules.$inferSelect;
export type NewEntityAutomationRule = typeof entityAutomationRules.$inferInsert;
