// ─── Autonomous Close Pipeline Schema (Pipeline 2 of 6) ─────────────────────
//
// Tables for the full 12-step close lifecycle including session tracking,
// department confirmations, versioned close packages, and error recovery.
//
// Hard rule: Owner notification (Step 6) is never optional — removing it
// removes Xenboox's core liability protection per PRD Section 14.

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

/** Status of a close session through its lifecycle */
export const closeSessionStatusEnum = pgEnum("close_session_status", [
  "in_progress",
  "ready",
  "blocked",
  "notified",
  "locked",
  "reopened",
]);

/** How the close was triggered */
export const closeTriggerSourceEnum = pgEnum("close_trigger_source", [
  "scheduled",
  "manual",
  "agent",
]);

/** Confirmation status from a department head */
export const closeConfirmationStatusEnum = pgEnum("close_confirmation_status", [
  "confirmed",
  "blocked",
  "pending",
]);

/** Error recovery classification */
export const reopenClassificationEnum = pgEnum("reopen_classification", [
  "simple_correction",
  "missing_data",
  "cascading_error",
]);

/** Channel through which a reopen was raised */
export const reopenChannelEnum = pgEnum("reopen_channel", [
  "dashboard",
  "email",
  "chat",
]);

// ─── CLOSE SESSIONS ──────────────────────────────────────────────────────
//
// Master record for each close cycle. One session per entity per period.
// Tracks the complete lifecycle from trigger through lock/reopen.

export const closeSessions = pgTable(
  "close_sessions",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    fiscalPeriodId: uuid("fiscal_period_id")
      .notNull()
      .references(() => fiscalPeriods.id, { onDelete: "cascade" }),
    periodLabel: text("period_label").notNull(), // "2026-07"
    status: closeSessionStatusEnum("status").notNull().default("in_progress"),
    triggeredBy: closeTriggerSourceEnum("triggered_by")
      .notNull()
      .default("scheduled"),
    triggeredByUserId: text("triggered_by_user_id"),
    openedAt: timestamp("opened_at").notNull().defaultNow(),
    closedAt: timestamp("closed_at"),
    lockedAt: timestamp("locked_at"),
    overallConfidence: numeric("overall_confidence", {
      precision: 5,
      scale: 4,
    }).default("0"),
    errors: jsonb("errors").default([]).$type<string[]>(),
    warnings: jsonb("warnings").default([]).$type<string[]>(),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("close_sessions_entity").on(t.entityId),
    index("close_sessions_period").on(t.fiscalPeriodId),
    index("close_sessions_status").on(t.entityId, t.status),
    index("close_sessions_lookup").on(t.entityId, t.fiscalPeriodId),
  ],
);

export const closeSessionsRelations = relations(
  closeSessions,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [closeSessions.entityId],
      references: [entities.id],
    }),
    period: one(fiscalPeriods, {
      fields: [closeSessions.fiscalPeriodId],
      references: [fiscalPeriods.id],
    }),
    confirmations: many(closeConfirmations),
    versions: many(closeVersions),
    reopenRequests: many(reopenRequests),
  }),
);

// ─── CLOSE CONFIRMATIONS ──────────────────────────────────────────────────
//
// Each department head's confirmation object for a close session.
// Collected in parallel, evaluated at the Close Readiness Gate (Step 3).

export const closeConfirmations = pgTable(
  "close_confirmations",
  {
    id: uuidId(),
    closeSessionId: uuid("close_session_id")
      .notNull()
      .references(() => closeSessions.id, { onDelete: "cascade" }),
    agentId: text("agent_id").notNull(), // "controller", "treasury", "compliance"
    status: closeConfirmationStatusEnum("status").notNull().default("pending"),
    confidence: numeric("confidence", { precision: 5, scale: 4 }).default("0"),
    openItems: jsonb("open_items").default([]).$type<
      Array<{
        item: string;
        severity: "warning" | "blocking";
        amount?: string;
        reference?: string;
      }>
    >(),
    summary: text("summary"),
    details: jsonb("details").default({}).$type<Record<string, unknown>>(),
    collectedAt: timestamp("collected_at"),
    ...timestamps,
  },
  (t) => [
    index("close_conf_session").on(t.closeSessionId),
    index("close_conf_agent").on(t.closeSessionId, t.agentId),
  ],
);

export const closeConfirmationsRelations = relations(
  closeConfirmations,
  ({ one }) => ({
    session: one(closeSessions, {
      fields: [closeConfirmations.closeSessionId],
      references: [closeSessions.id],
    }),
  }),
);

// ─── CLOSE VERSIONS ──────────────────────────────────────────────────────
//
// Versioned close packages. Original and every correction preserved.
// Nothing is overwritten or deleted, ever.

export const closeVersions = pgTable(
  "close_versions",
  {
    id: uuidId(),
    closeSessionId: uuid("close_session_id")
      .notNull()
      .references(() => closeSessions.id, { onDelete: "cascade" }),
    versionNumber: numeric("version_number").notNull().default("1"),
    packageRef: text("package_ref"), // Reference to the generated close package
    reportSnapshotId: text("report_snapshot_id"), // Link to report pipeline snapshot
    isCorrection: boolean("is_correction").notNull().default(false),
    correctionReason: text("correction_reason"),
    supersededBy: uuid("superseded_by"), // null = current version
    generatedByUserId: text("generated_by_user_id"),
    packageData: jsonb("package_data").$type<Record<string, unknown>>(),
    narrativeSummary: text("narrative_summary"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("close_ver_session").on(t.closeSessionId),
    index("close_ver_superseded").on(t.supersededBy),
  ],
);

export const closeVersionsRelations = relations(closeVersions, ({ one }) => ({
  session: one(closeSessions, {
    fields: [closeVersions.closeSessionId],
    references: [closeSessions.id],
  }),
}));

// ─── REOPEN REQUESTS ─────────────────────────────────────────────────────
//
// Error recovery records. Every reopen is logged with classification,
// affected periods, and approval tracking.

export const reopenRequests = pgTable(
  "reopen_requests",
  {
    id: uuidId(),
    closeSessionId: uuid("close_session_id")
      .notNull()
      .references(() => closeSessions.id, { onDelete: "cascade" }),
    raisedByUserId: text("raised_by_user_id").notNull(),
    raisedVia: reopenChannelEnum("raised_via").notNull().default("dashboard"),
    description: text("description").notNull(),
    classification: reopenClassificationEnum("classification"),
    affectedPeriods: jsonb("affected_periods").default([]).$type<string[]>(),
    depthMonths: numeric("depth_months"), // How far back (for governor check)
    downstreamWarning: text("downstream_warning"),
    approvedAt: timestamp("approved_at"),
    approvedByUserId: text("approved_by_user_id"),
    correctionReference: text("correction_reference"),
    resolvedAt: timestamp("resolved_at"),
    ...timestamps,
  },
  (t) => [
    index("reopen_session").on(t.closeSessionId),
    index("reopen_raised_by").on(t.raisedByUserId),
    index("reopen_status").on(t.closeSessionId, t.approvedAt),
  ],
);

export const reopenRequestsRelations = relations(reopenRequests, ({ one }) => ({
  session: one(closeSessions, {
    fields: [reopenRequests.closeSessionId],
    references: [closeSessions.id],
  }),
}));
