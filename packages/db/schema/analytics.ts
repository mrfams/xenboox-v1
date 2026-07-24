// ─── Analytics & Insights Schema ─────────────────────────────────────────────
//
// Read-only consumer of every other pipeline's output; never writes to the
// ledger or any transactional table. Stores computed analytics results for
// trend detection, anomaly detection, health scoring, and forecasting.
//
// Tables:
//   analytics_snapshots   — Frozen pipeline output snapshots per period
//   detected_trends       — Revenue, expense, and cash trends over time
//   anomaly_flags         — Unusual transactions and pattern shifts
//   health_scores         — Composite financial health scores (explainable)
//   benchmark_cohorts     — Anonymized, consented cohort definitions
//   forecast_models       — Cash flow forecasting models and runway

import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps, entityId } from "./helpers";
import { entities } from "./organization";

// ─── Analytics Snapshots ────────────────────────────────────────────────────
//
// Frozen pipeline output snapshots per period. These are the raw material
// for trend detection and health scoring. Never written to by external
// agents — only the Analytics Pipeline writes here.

export const analyticsSnapshots = pgTable(
  "analytics_snapshots",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // YYYY-MM
    sourcePipelines: jsonb("source_pipelines").notNull().$type<string[]>(),
    // Which pipelines fed this snapshot: ["reporting", "reconciliation", "cash", "expense"]
    snapshotData: jsonb("snapshot_data").notNull().$type<{
      revenue: number;
      expenses: number;
      netIncome: number;
      totalAssets: number;
      totalLiabilities: number;
      cashBalance: number;
      receivables: number;
      payables: number;
      [key: string]: unknown;
    }>(),
    dataFreshness: numeric("data_freshness", { precision: 3, scale: 2 })
      .notNull()
      .default("1.0"),
    // 1.0 = fully fresh, lower = staleness factor
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

// ─── Detected Trends ────────────────────────────────────────────────────────
//
// Revenue, expense, and cash trends over time, sliceable per dimension
// (customer, project, department, cost center). Statistical and rule-based.

export const detectedTrends = pgTable(
  "detected_trends",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    dimension: text("dimension").notNull(),
    // Dimensions: "revenue", "expense", "cash_flow", "profit_margin", "receivables", "payables"
    trendType: text("trend_type").notNull(),
    // Types: "upward", "downward", "cyclical", "volatile", "stable", "seasonal"
    magnitude: numeric("magnitude", { precision: 10, scale: 4 }).notNull(),
    // -1.0 to 1.0, negative = decreasing, positive = increasing
    confidence: numeric("confidence", { precision: 3, scale: 2 })
      .notNull()
      .default("0.0"),
    period: text("period").notNull(),
    // The period over which the trend was detected
    comparisonPeriod: text("comparison_period"),
    // Optional period to compare against (e.g., same period last year)
    sliceKey: text("slice_key"),
    // Optional dimension slice: e.g., department=engineering, customer=acme
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

// ─── Anomaly Flags ──────────────────────────────────────────────────────────
//
// Unusual transactions, spending pattern shifts, timing irregularities.
// Statistical and rule-based methods, not LLM judgment alone.
// Coordinates with Audit Agent to avoid duplicate alerting.

export const anomalyFlags = pgTable(
  "anomaly_flags",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    transactionRef: text("transaction_ref"),
    anomalyType: text("anomaly_type").notNull(),
    // Types: "unusual_amount", "pattern_shift", "timing_irregularity",
    //        "duplicate_transaction", "round_trip", "velocity_change"
    severity: text("severity").notNull().default("medium"),
    // "low", "medium", "high", "critical"
    description: text("description").notNull(),
    statisticalBasis: jsonb("statistical_basis").$type<{
      method: string;
      zScore?: number;
      percentile?: number;
      expectedValue?: number;
      actualValue?: number;
      stdDev?: number;
      timeWindow?: string;
    }>(),
    // Statistical method used (not LLM judgment)
    routedTo: text("routed_to"),
    // "compliance_agent" | "audit_agent" | "cfo_agent" | "none"
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

// ─── Health Scores ──────────────────────────────────────────────────────────
//
// Composite score built from explainable, weighted inputs.
// The explanation ships alongside the score, never a black box number.

export const healthScores = pgTable(
  "health_scores",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // YYYY-MM
    overallScore: numeric("overall_score", {
      precision: 4,
      scale: 2,
    }).notNull(),
    // 0.00 to 1.00 composite health score
    componentBreakdown: jsonb("component_breakdown").notNull().$type<{
      liquidity: { score: number; weight: number; explanation: string };
      solvency: { score: number; weight: number; explanation: string };
      profitability: { score: number; weight: number; explanation: string };
      efficiency: { score: number; weight: number; explanation: string };
      growth: { score: number; weight: number; explanation: string };
    }>(),
    // Every component has an explanation — never a black box
    trend: text("trend").notNull().default("stable"),
    // "improving", "stable", "declining"
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

// ─── Benchmark Cohorts ─────────────────────────────────────────────────────
//
// ⚠️ CRITICAL RULE:
// Benchmarking never ships without verified anonymization and consent.
// No organization's data is ever exposed to another without both.
// `anonymizationVerified` and `consentedOrgIds` must be populated and valid.

export const benchmarkCohorts = pgTable(
  "benchmark_cohorts",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    market: text("market").notNull(),
    // Market: "gambia", "nigeria", "kenya", "ghana", "west_africa", "east_africa"
    segment: text("segment").notNull(),
    // Segment: "small_business", "mid_market", "enterprise", "nonprofit", "fintech"
    anonymizationVerified: boolean("anonymization_verified")
      .notNull()
      .default(false),
    // ⚠️ MUST be true before cohort is usable
    consentedOrgIds: text("consented_org_ids").array().notNull().default([]),
    // Organization IDs that have explicitly consented to anonymized benchmarking
    consentVerifiedAt: timestamp("consent_verified_at"),
    activeMembers: numeric("active_members").notNull().default("0"),
    aggregateData: jsonb("aggregate_data").$type<{
      medianRevenue: number;
      medianExpense: number;
      medianProfitMargin: number;
      avgLiquidityRatio: number;
      avgSolvencyRatio: number;
      dataFreshness: string;
    }>(),
    // Only aggregate, anonymized data — never individual org data
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("benchmark_entity").on(t.entityId),
    index("benchmark_market_segment").on(t.market, t.segment),
    index("benchmark_anonymized").on(t.anonymizationVerified),
  ],
);

// ─── Forecast Models ────────────────────────────────────────────────────────
//
// Cash flow forecasting models. Produces the "at current trajectory you have
// X months of runway" figure based on current revenue/expenditure trajectory.

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
    // Projected months of runway at current trajectory
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
    assumptions: jsonb("assumptions").notNull().$type<{
      revenueGrowthRate: number;
      expenseGrowthRate: number;
      inflationRate: number;
      projectionMonths: number;
      seasonalityFactors: Record<string, number>;
      confidenceInterval: number;
    }>(),
    // Every assumption is recorded — never a black box
    confidence: numeric("confidence", { precision: 3, scale: 2 })
      .notNull()
      .default("0.7"),
    period: text("period").notNull(), // The base period for the forecast
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
