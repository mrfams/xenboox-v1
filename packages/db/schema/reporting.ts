import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";
import { fiscalPeriods } from "./accounting";

// ─── ENUMS ────────────────────────────────────────────────────────────────

/** Type of financial statement */
export const statementTypeEnum = pgEnum("statement_type", [
  "profit_and_loss",
  "balance_sheet",
  "cash_flow",
  "trial_balance",
  "general_ledger",
  "custom",
]);

/** Status of a report request */
export const reportRequestStatusEnum = pgEnum("report_request_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "blocked",
]);

/** Lock status for a statement version */
export const statementLockStatusEnum = pgEnum("statement_lock_status", [
  "draft",
  "locked",
  "archived",
]);

/** Format for report delivery */
export const reportFormatEnum = pgEnum("report_format", [
  "dashboard",
  "chat",
  "pdf",
  "excel",
  "email",
]);

// ─── REPORT REQUESTS ─────────────────────────────────────────────────────
//
// Every report generation request normalized into a structured form.
// Supports both standard statements and free-text queries.

export const reportRequests = pgTable(
  "report_requests",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    requestedByUserId: text("requested_by_user_id"),
    statementType: statementTypeEnum("statement_type"),
    freeTextQuery: text("free_text_query"),
    periodId: uuid("period_id").references(() => fiscalPeriods.id, {
      onDelete: "set null",
    }),
    comparisonPeriodId: uuid("comparison_period_id"),
    format: reportFormatEnum("format").notNull().default("dashboard"),
    status: reportRequestStatusEnum("status").notNull().default("pending"),
    source: text("source").notNull().default("dashboard"), // "cfo_agent", "close_pipeline", "dashboard", "scheduled"
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    completedAt: timestamp("completed_at"),
    errorMessage: text("error_message"),
    ...timestamps,
  },
  (t) => [
    index("report_reqs_entity").on(t.entityId),
    index("report_reqs_period").on(t.periodId),
    index("report_reqs_status").on(t.entityId, t.status),
  ],
);

export const reportRequestsRelations = relations(reportRequests, ({ one }) => ({
  entity: one(entities, {
    fields: [reportRequests.entityId],
    references: [entities.id],
  }),
}));

// ─── REPORT SNAPSHOTS ──────────────────────────────────────────────────
//
// Immutable ledger state snapshot at the time of report generation.
// The trial_balance_balanced field is checked deterministically before
// ANY statement is presented from this snapshot.

export const reportSnapshots = pgTable(
  "report_snapshots",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    periodId: uuid("period_id").references(() => fiscalPeriods.id, {
      onDelete: "set null",
    }),
    periodLabel: text("period_label"),
    trialBalanceBalanced: boolean("trial_balance_balanced")
      .notNull()
      .default(false),
    totalDebits: numeric("total_debits", { precision: 15, scale: 2 }).default(
      "0",
    ),
    totalCredits: numeric("total_credits", { precision: 15, scale: 2 }).default(
      "0",
    ),
    accountCount: numeric("account_count").default("0"),
    entryCount: numeric("entry_count").default("0"),
    ledgerSnapshotRef: text("ledger_snapshot_ref"),
    accountBalances: jsonb("account_balances")
      .default([])
      .$type<
        Array<{
          accountId: string;
          code: string;
          name: string;
          type: string;
          debit: number;
          credit: number;
        }>
      >(),
    generatedBy: text("generated_by").default("reporting-pipeline"),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("report_snaps_entity").on(t.entityId),
    index("report_snaps_period").on(t.periodId),
  ],
);

export const reportSnapshotsRelations = relations(
  reportSnapshots,
  ({ one }) => ({
    entity: one(entities, {
      fields: [reportSnapshots.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── STATEMENT VERSIONS ────────────────────────────────────────────────
//
// Each generated statement from a snapshot. Locked for closed periods,
// draft/recalculating for open periods. Every version is traceable.

export const statementVersions = pgTable(
  "statement_versions",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => reportSnapshots.id, { onDelete: "cascade" }),
    statementType: statementTypeEnum("statement_type").notNull(),
    versionNumber: numeric("version_number").notNull().default("1"),
    lockStatus: statementLockStatusEnum("lock_status")
      .notNull()
      .default("draft"),
    narrativeSummary: text("narrative_summary"),
    statementData: jsonb("statement_data").$type<Record<string, unknown>>(),
    generatedByUserId: text("generated_by_user_id"),
    isLatest: boolean("is_latest").notNull().default(true),
    lockedAt: timestamp("locked_at"),
    ...timestamps,
  },
  (t) => [
    index("stmt_versions_entity").on(t.entityId),
    index("stmt_versions_snapshot").on(t.snapshotId),
    index("stmt_versions_type").on(t.entityId, t.statementType, t.isLatest),
  ],
);

export const statementVersionsRelations = relations(
  statementVersions,
  ({ one }) => ({
    entity: one(entities, {
      fields: [statementVersions.entityId],
      references: [entities.id],
    }),
    snapshot: one(reportSnapshots, {
      fields: [statementVersions.snapshotId],
      references: [reportSnapshots.id],
    }),
  }),
);
