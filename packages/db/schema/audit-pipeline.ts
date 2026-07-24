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
import { users } from "./auth";

// ─── ENUMS ───────────────────────────────────────

export const auditSampleStatusEnum = pgEnum("audit_sample_status", [
  "sampled",
  "verified",
  "discrepancy",
  "investigating",
]);

export const driftTrendEnum = pgEnum("drift_trend", [
  "improving",
  "stable",
  "declining",
  "critical",
]);

export const auditPackageStatusEnum = pgEnum("audit_package_status", [
  "assembling",
  "ready",
  "delivered",
  "acknowledged",
]);

export const portalSessionStatusEnum = pgEnum("portal_session_status", [
  "active",
  "expired",
  "revoked",
]);

export const queryStatusEnum = pgEnum("query_status", [
  "open",
  "answered",
  "closed",
]);

// ─── AUDIT SAMPLES ───────────────────────────────
//
// Every sampled transaction records the agent that processed it, the
// recomputed result (using independent logic), and whether the original
// and recomputed results match.

export const auditSamples = pgTable(
  "audit_samples",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    transactionRef: text("transaction_ref").notNull(),
    sampledAt: timestamp("sampled_at").notNull().defaultNow(),
    agentChecked: text("agent_checked").notNull(),
    transactionType: text("transaction_type").notNull(),
    originalResult: jsonb("original_result")
      .notNull()
      .$type<Record<string, unknown>>(),
    recomputedResult: jsonb("recomputed_result")
      .notNull()
      .$type<Record<string, unknown>>(),
    matchesOriginal: boolean("matches_original").notNull(),
    discrepancyDetails: jsonb("discrepancy_details").$type<
      Record<string, unknown>
    >(),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).default(
      "1.0",
    ),
    status: auditSampleStatusEnum("status").notNull().default("sampled"),
    ...timestamps,
  },
  (t) => [
    index("audit_samples_entity").on(t.entityId),
    index("audit_samples_agent").on(t.agentChecked),
    index("audit_samples_status").on(t.entityId, t.status),
    index("audit_samples_date").on(t.entityId, t.sampledAt),
  ],
);

export const auditSamplesRelations = relations(auditSamples, ({ one }) => ({
  entity: one(entities, {
    fields: [auditSamples.entityId],
    references: [entities.id],
  }),
}));

// ─── GOLDEN DATASET SCENARIOS ────────────────────
//
// Maintained set of verified-correct accounting scenarios used to compute
// drift scores per agent. New scenarios added as edge cases are discovered.

export const goldenDatasetScenarios = pgTable(
  "golden_dataset_scenarios",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    scenarioType: text("scenario_type").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    inputData: jsonb("input_data").notNull().$type<Record<string, unknown>>(),
    expectedResult: jsonb("expected_result")
      .notNull()
      .$type<Record<string, unknown>>(),
    actualResult: jsonb("actual_result").$type<Record<string, unknown>>(),
    lastTestedAt: timestamp("last_tested_at"),
    lastTestPassed: boolean("last_test_passed"),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    addedBy: text("added_by"),
    ...timestamps,
  },
  (t) => [
    index("golden_dataset_entity").on(t.entityId),
    index("golden_dataset_type").on(t.entityId, t.scenarioType),
  ],
);

export const goldenDatasetScenariosRelations = relations(
  goldenDatasetScenarios,
  ({ one }) => ({
    entity: one(entities, {
      fields: [goldenDatasetScenarios.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── DRIFT SCORES ─────────────────────────────────
//
// Per-agent drift score computed over time from golden dataset comparisons.
// Trend tracks whether the agent is improving, stable, or declining.

export const driftScores = pgTable(
  "drift_scores",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    agentId: text("agent_id").notNull(),
    period: text("period").notNull(),
    score: numeric("score", { precision: 5, scale: 4 }).notNull(), // 0.0 - 1.0 (1.0 = perfect match)
    sampleSize: numeric("sample_size").notNull().default("0"),
    trend: driftTrendEnum("trend").notNull().default("stable"),
    previousScore: numeric("previous_score", { precision: 5, scale: 4 }),
    anomalyCount: numeric("anomaly_count").notNull().default("0"),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("drift_scores_entity").on(t.entityId),
    index("drift_scores_agent").on(t.entityId, t.agentId),
    index("drift_scores_period").on(t.entityId, t.period),
  ],
);

export const driftScoresRelations = relations(driftScores, ({ one }) => ({
  entity: one(entities, {
    fields: [driftScores.entityId],
    references: [entities.id],
  }),
}));

// ─── AUDIT PACKAGES ──────────────────────────────
//
// Compiled on demand for external auditor requests or scheduled cadence.

export const auditPackages = pgTable(
  "audit_packages",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    requestedBy: text("requested_by").notNull(),
    period: text("period").notNull(),
    status: auditPackageStatusEnum("status").notNull().default("assembling"),
    contentsRef: jsonb("contents_ref").notNull().$type<{
      sampleIds: string[];
      packageType: string;
      scheduleCount: number;
      periodStart: string;
      periodEnd: string;
    }>(),
    generatedAt: timestamp("generated_at").defaultNow(),
    deliveredAt: timestamp("delivered_at"),
    acknowledgedAt: timestamp("acknowledged_at"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("audit_packages_entity").on(t.entityId),
    index("audit_packages_period").on(t.entityId, t.period),
  ],
);

export const auditPackagesRelations = relations(auditPackages, ({ one }) => ({
  entity: one(entities, {
    fields: [auditPackages.entityId],
    references: [entities.id],
  }),
}));

// ─── AUDITOR PORTAL SESSIONS ─────────────────────
//
// Read-only, period-locked — always, no exceptions. No access to current
// period if auditing a prior one. Every portal action logged.

export const auditorPortalSessions = pgTable(
  "auditor_portal_sessions",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    auditorId: text("auditor_id").notNull(),
    auditorName: text("auditor_name"),
    auditorEmail: text("auditor_email"),
    periodLocked: text("period_locked").notNull(), // The period this session is locked to
    grantedBy: text("granted_by").notNull(),
    grantedAt: timestamp("granted_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),
    status: portalSessionStatusEnum("status").notNull().default("active"),
    lastAccessAt: timestamp("last_access_at"),
    accessCount: numeric("access_count").notNull().default("0"),
    readOnly: boolean("read_only").notNull().default(true), // ALWAYS true — enforced at API layer
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("portal_sessions_entity").on(t.entityId),
    index("portal_sessions_auditor").on(t.auditorId),
    index("portal_sessions_status").on(t.entityId, t.status),
  ],
);

export const auditorPortalSessionsRelations = relations(
  auditorPortalSessions,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [auditorPortalSessions.entityId],
      references: [entities.id],
    }),
    queries: many(auditorQueries),
  }),
);

// ─── AUDITOR QUERIES ─────────────────────────────
//
// Auditor asks → Audit Agent retrieves evidence → response logged.

export const auditorQueries = pgTable(
  "auditor_queries",
  {
    id: uuidId(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => auditorPortalSessions.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    evidenceRef: jsonb("evidence_ref").$type<{
      sampleIds: string[];
      auditTrailIds: string[];
      packageIds: string[];
    }>(),
    response: text("response"),
    respondedAt: timestamp("responded_at"),
    status: queryStatusEnum("status").notNull().default("open"),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    ...timestamps,
  },
  (t) => [
    index("auditor_queries_session").on(t.sessionId),
    index("auditor_queries_status").on(t.sessionId, t.status),
  ],
);

export const auditorQueriesRelations = relations(auditorQueries, ({ one }) => ({
  session: one(auditorPortalSessions, {
    fields: [auditorQueries.sessionId],
    references: [auditorPortalSessions.id],
  }),
}));
