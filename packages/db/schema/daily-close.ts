// ─── Daily Close Pipeline Schema ──────────────────────────────────────────
//
// Tracks daily auto-reconciliation runs. Simpler than month-end closeSessions
// because daily close is automated — no human approval needed unless exceptions.

import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { entities } from "./organization";

// ─── ENUMS ────────────────────────────────────────────────────────────────

export const dailyCloseStatusEnum = pgEnum("daily_close_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "exception",
]);

// ─── DAILY CLOSE RUNS ────────────────────────────────────────────────────
//
// One row per entity per day. Tracks the full daily close lifecycle.

export const dailyCloseRuns = pgTable(
  "daily_close_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    closeDate: text("close_date").notNull(), // YYYY-MM-DD

    // Status tracking
    status: dailyCloseStatusEnum("status").notNull().default("pending"),

    // Agent step statuses
    bankReconciliationStatus: text("bank_reconciliation_status"), // pending | complete | exception | skipped
    cashCountStatus: text("cash_count_status"),
    mobileMoneyStatus: text("mobile_money_status"),
    transactionCategorizationStatus: text("transaction_categorization_status"),

    // Metrics
    transactionsProcessed: numeric("transactions_processed").default("0"),
    anomaliesDetected: numeric("anomalies_detected").default("0"),
    autoMatched: numeric("auto_matched").default("0"),
    needsHumanReview: numeric("needs_human_review").default("0"),

    // Agent outputs
    agentResults: jsonb("agent_results").$type<Record<string, unknown>>(),
    exceptions: jsonb("exceptions").$type<
      Array<{
        type: string;
        description: string;
        agentId: string;
        confidence: number;
      }>
    >(),

    // Confidence
    overallConfidence: numeric("overall_confidence"),

    // Timestamps
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("daily_close_entity_date").on(t.entityId, t.closeDate),
    index("daily_close_status").on(t.entityId, t.status),
    index("daily_close_date").on(t.closeDate),
  ],
);

export const dailyCloseRunsRelations = relations(dailyCloseRuns, ({ one }) => ({
  entity: one(entities, {
    fields: [dailyCloseRuns.entityId],
    references: [entities.id],
  }),
}));
