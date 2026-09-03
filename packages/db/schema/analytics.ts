import {
  pgTable,
  uuid,
  text,
  jsonb,
  index,
  real,
  boolean,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";

// ─── ANALYTICS EVENTS ─────────────────────────────────────────────────────
//
// Tracks activation events for measuring user onboarding success.
// Every event is entity-scoped and includes metadata for analysis.

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    event: text("event").notNull(),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("analytics_events_entity").on(t.entityId),
    index("analytics_events_user").on(t.userId),
    index("analytics_events_event").on(t.event),
    index("analytics_events_entity_event").on(t.entityId, t.event),
  ],
);

export const analyticsEventsRelations = relations(
  analyticsEvents,
  ({ one }) => ({
    entity: one(entities, {
      fields: [analyticsEvents.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── ACTIVATION EVENTS ────────────────────────────────────────────────────
//
// Pre-defined activation events with weights for scoring.

export const ACTIVATION_EVENTS = {
  signup: { weight: 0.1, description: "User created account" },
  setup_business: { weight: 0.15, description: "User entered business info" },
  create_invoice: { weight: 0.3, description: "User created first invoice" },
  see_narrative: { weight: 0.15, description: "User saw AI narrative" },
  import_bank: { weight: 0.2, description: "User imported bank transactions" },
  invite_team: { weight: 0.1, description: "User invited team member" },
} as const;

export type ActivationEvent = keyof typeof ACTIVATION_EVENTS;

// ─── HELPER: Calculate Activation Score ────────────────────────────────────

export function calculateActivationScore(completedEvents: string[]): number {
  let score = 0;
  for (const event of completedEvents) {
    const config = ACTIVATION_EVENTS[event as ActivationEvent];
    if (config) {
      score += config.weight;
    }
  }
  return Math.min(1, score);
}

// ─── HELPER: Get Activation Status ─────────────────────────────────────────

export function getActivationStatus(score: number): {
  level: string;
  label: string;
  color: string;
} {
  if (score >= 1)
    return { level: "complete", label: "Fully Activated", color: "green" };
  if (score >= 0.75)
    return { level: "nearly", label: "Nearly There", color: "blue" };
  if (score >= 0.5)
    return { level: "progress", label: "Almost There", color: "yellow" };
  if (score >= 0.25)
    return { level: "started", label: "Getting Started", color: "orange" };
  return { level: "new", label: "Not Started", color: "gray" };
}

// ─── HELPER: Get Next Step ─────────────────────────────────────────────────

export function getNextStep(completedEvents: string[]): {
  event: ActivationEvent;
  description: string;
  weight: number;
} | null {
  // Priority order: most impactful first
  const priorityOrder: ActivationEvent[] = [
    "create_invoice",
    "import_bank",
    "see_narrative",
    "setup_business",
    "invite_team",
  ];

  for (const event of priorityOrder) {
    if (!completedEvents.includes(event)) {
      const config = ACTIVATION_EVENTS[event];
      return {
        event,
        description: config.description,
        weight: config.weight,
      };
    }
  }

  return null; // All events completed
}

// ─── NARRATIVE HISTORY ─────────────────────────────────────────────────────
//
// Stores AI-generated financial narratives for historical reference.
// Users can see how narratives change over time.

export const narrativeHistory = pgTable(
  "narrative_history",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    narrativeType: text("narrative_type").notNull(), // 'dashboard', 'pnl', 'balance_sheet', 'cash_flow', 'invoice', 'budget_variance'
    periodId: text("period_id"), // nullable for dashboard/invoice narratives
    summary: text("summary").notNull(),
    highlights: jsonb("highlights").default([]).$type<string[]>(),
    concerns: jsonb("concerns").default([]).$type<string[]>(),
    action: text("action"),
    confidence: real("confidence").default(0.8),
    poweredBy: text("powered_by").default("llm"), // 'llm' or 'fallback'
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("narrative_history_entity").on(t.entityId),
    index("narrative_history_type").on(t.narrativeType),
    index("narrative_history_entity_type").on(t.entityId, t.narrativeType),
    index("narrative_history_entity_period").on(t.entityId, t.periodId),
  ],
);

export const narrativeHistoryRelations = relations(
  narrativeHistory,
  ({ one }) => ({
    entity: one(entities, {
      fields: [narrativeHistory.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── BENCHMARK COHORTS ────────────────────────────────────────────────────
//
// Aggregate benchmarking cohorts. The table was created by migration 0015 but
// its schema definition was lost from the codebase — restored here so the
// schema matches the database and migrations can be generated.
//
// Aggregates only — no individual organization's figures are stored on the
// cohort itself; consented org IDs are tracked for audit/eligibility only.

export const benchmarkCohorts = pgTable(
  "benchmark_cohorts",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    market: text("market").notNull(),
    segment: text("segment").notNull(),
    anonymizationVerified: boolean("anonymization_verified")
      .notNull()
      .default(false),
    consentedOrgIds: text("consented_org_ids")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    consentVerifiedAt: timestamp("consent_verified_at"),
    activeMembers: numeric("active_members").notNull().default("0"),
    aggregateData: jsonb("aggregate_data"),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("benchmark_entity").on(t.entityId),
    index("benchmark_market_segment").on(t.market, t.segment),
    index("benchmark_anonymized").on(t.anonymizationVerified),
  ],
);

export const benchmarkCohortsRelations = relations(
  benchmarkCohorts,
  ({ one }) => ({
    entity: one(entities, {
      fields: [benchmarkCohorts.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── ANALYTICS SNAPSHOTS ───────────────────────────────────────────────────
//
// Point-in-time snapshots of analytics output per entity/period. Definitions
// were previously stripped from the schema while the tables remained in the
// DB — restored here so the schema matches the database.

export const analyticsSnapshots = pgTable(
  "analytics_snapshots",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    period: text("period").notNull(),
    sourcePipelines: jsonb("source_pipelines").notNull(),
    snapshotData: jsonb("snapshot_data").notNull(),
    dataFreshness: numeric("data_freshness", { precision: 3, scale: 2 })
      .notNull()
      .default("1.0"),
    generatedBy: text("generated_by").notNull().default("analytics-pipeline"),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("analytics_snap_entity").on(t.entityId),
    index("analytics_snap_period").on(t.entityId, t.period),
    index("analytics_snap_generated").on(t.entityId, t.generatedAt),
  ],
);

export const analyticsSnapshotsRelations = relations(
  analyticsSnapshots,
  ({ one }) => ({
    entity: one(entities, {
      fields: [analyticsSnapshots.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── ANOMALY FLAGS ─────────────────────────────────────────────────────────

export const anomalyFlags = pgTable(
  "anomaly_flags",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    transactionRef: text("transaction_ref"),
    anomalyType: text("anomaly_type").notNull(),
    severity: text("severity").notNull().default("medium"),
    description: text("description").notNull(),
    statisticalBasis: jsonb("statistical_basis"),
    routedTo: text("routed_to"),
    acknowledged: boolean("acknowledged").notNull().default(false),
    acknowledgedAt: timestamp("acknowledged_at"),
    acknowledgedBy: text("acknowledged_by"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("anomaly_entity").on(t.entityId),
    index("anomaly_type").on(t.entityId, t.anomalyType),
    index("anomaly_severity").on(t.entityId, t.severity),
    index("anomaly_routed").on(t.entityId, t.routedTo),
  ],
);

export const anomalyFlagsRelations = relations(anomalyFlags, ({ one }) => ({
  entity: one(entities, {
    fields: [anomalyFlags.entityId],
    references: [entities.id],
  }),
}));

// ─── DETECTED TRENDS ───────────────────────────────────────────────────────

export const detectedTrends = pgTable(
  "detected_trends",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    dimension: text("dimension").notNull(),
    trendType: text("trend_type").notNull(),
    magnitude: numeric("magnitude", { precision: 10, scale: 4 }).notNull(),
    confidence: numeric("confidence", { precision: 3, scale: 2 })
      .notNull()
      .default("0.0"),
    period: text("period").notNull(),
    comparisonPeriod: text("comparison_period"),
    sliceKey: text("slice_key"),
    sliceValue: text("slice_value"),
    description: text("description").notNull(),
    detectedAt: timestamp("detected_at").notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("trends_entity").on(t.entityId),
    index("trends_dimension").on(t.entityId, t.dimension),
    index("trends_type").on(t.entityId, t.trendType),
    index("trends_period").on(t.entityId, t.period),
    index("trends_detected").on(t.entityId, t.detectedAt),
  ],
);

export const detectedTrendsRelations = relations(detectedTrends, ({ one }) => ({
  entity: one(entities, {
    fields: [detectedTrends.entityId],
    references: [entities.id],
  }),
}));

// ─── FORECAST MODELS ───────────────────────────────────────────────────────

export const forecastModels = pgTable(
  "forecast_models",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    runwayMonths: numeric("runway_months", {
      precision: 5,
      scale: 1,
    }).notNull(),
    projectedRevenue: numeric("projected_revenue", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    projectedExpenses: numeric("projected_expenses", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    projectedCashBalance: numeric("projected_cash_balance", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    assumptions: jsonb("assumptions").notNull(),
    confidence: numeric("confidence", { precision: 3, scale: 2 })
      .notNull()
      .default("0.7"),
    period: text("period").notNull(),
    methodology: text("methodology").notNull().default("linear_regression"),
    supersededBy: uuid("superseded_by"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("forecast_entity").on(t.entityId),
    index("forecast_active").on(t.entityId, t.isActive),
    index("forecast_generated").on(t.entityId, t.generatedAt),
  ],
);

export const forecastModelsRelations = relations(forecastModels, ({ one }) => ({
  entity: one(entities, {
    fields: [forecastModels.entityId],
    references: [entities.id],
  }),
}));

// ─── HEALTH SCORES ─────────────────────────────────────────────────────────

export const healthScores = pgTable(
  "health_scores",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    period: text("period").notNull(),
    overallScore: numeric("overall_score", {
      precision: 4,
      scale: 2,
    }).notNull(),
    componentBreakdown: jsonb("component_breakdown").notNull(),
    trend: text("trend").notNull().default("stable"),
    previousScore: numeric("previous_score", { precision: 4, scale: 2 }),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("health_entity").on(t.entityId),
    index("health_period").on(t.entityId, t.period),
    index("health_score").on(t.entityId, t.overallScore),
  ],
);

export const healthScoresRelations = relations(healthScores, ({ one }) => ({
  entity: one(entities, {
    fields: [healthScores.entityId],
    references: [entities.id],
  }),
}));

// ─── HELPER: Save Narrative to History ─────────────────────────────────────

export async function saveNarrativeHistory(
  db: any,
  params: {
    entityId: string;
    narrativeType: string;
    periodId?: string;
    summary: string;
    highlights: string[];
    concerns: string[];
    action?: string;
    confidence: number;
    poweredBy: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(narrativeHistory).values({
    entityId: params.entityId,
    narrativeType: params.narrativeType,
    periodId: params.periodId ?? null,
    summary: params.summary,
    highlights: params.highlights,
    concerns: params.concerns,
    action: params.action ?? null,
    confidence: params.confidence,
    poweredBy: params.poweredBy,
    metadata: params.metadata ?? {},
  });
}

// ─── HELPER: Get Narrative History ──────────────────────────────────────────

export async function getNarrativeHistory(
  db: any,
  params: {
    entityId: string;
    narrativeType?: string;
    limit?: number;
  },
): Promise<Array<typeof narrativeHistory.$inferSelect>> {
  const { entityId, narrativeType, limit = 10 } = params;

  const conditions = [narrativeHistory.entityId];
  if (narrativeType) {
    conditions.push(narrativeHistory.narrativeType);
  }

  return db.query.narrativeHistory.findMany({
    where: (t: any, { and, eq }: any) => {
      const clauses = [eq(t.entityId, entityId)];
      if (narrativeType) {
        clauses.push(eq(t.narrativeType, narrativeType));
      }
      return and(...clauses);
    },
    orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    limit,
  });
}
