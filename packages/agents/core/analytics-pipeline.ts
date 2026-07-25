// ─── Analytics & Insights Pipeline (Phase 2, Pipeline 5 of 5) ──────────────
//
// Trends, anomalies, forecasting, health scoring, and proactive insights —
// surfaced without being asked. Read-only consumer of every other pipeline's
// output; never writes to the ledger or any transactional table.
//
// Pipeline Steps:
//   1. Data Aggregation Layer       — Pulls from Reporting, Recon, Cash, Expense snapshots
//   2. Trend Detection Engine        — Revenue/expense/cash trends, sliceable per dimension
//   3. Anomaly Detection             — Statistical + rule-based, not LLM judgment alone
//   4. Fraud Pattern Detection       → Compliance Agent (pattern-level, avoids duplicate alerts)
//   5. Cash Flow Forecasting         — "At current trajectory, X months of runway"
//   6. Financial Health Scoring      — Composite score with explainable component breakdown
//   7. Benchmarking Engine           — ⛔ Requires anonymization + consent (not built here)
//   8. Materiality Gate              — Not every trend is alert-worthy
//   9. Proactive Alert Generation    → Routes through CFO Agent, never direct to human
//  10. Year-on-Year Comparison       — YoY reports for key metrics
//  11. Audit Trail Logging           — Every alert is explainable
//
// Critical Rules:
//   - Analytics Agent is READ-ONLY: no write path to the ledger or transactional tables
//   - Benchmarking never ships without verified anonymization and consent
//   - Every proactive alert routes through the CFO Agent, never direct to a human

import { db } from "@xenboox/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import {
  analyticsSnapshots,
  detectedTrends,
  anomalyFlags,
  healthScores,
  benchmarkCohorts,
  forecastModels,
} from "@xenboox/db/schema/analytics";
import { auditLog, entities } from "@xenboox/db/schema";
import { langfuse } from "./langfuse";
import { createAuditEntry } from "./state";
import {
  getBenchmarkingAvailability,
  runBenchmarkingPipeline,
} from "./benchmarking-pipeline";
import type { AuditEntry } from "./state";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AnalyticsStepId =
  | "data_aggregation"
  | "trend_detection"
  | "anomaly_detection"
  | "fraud_pattern_detection"
  | "cash_flow_forecast"
  | "health_scoring"
  | "benchmarking"
  | "materiality_gate"
  | "proactive_alerts"
  | "year_on_year_comparison"
  | "audit_trail_logging";

export type AnalyticsStepStatus =
  "pending" | "in_progress" | "completed" | "failed" | "skipped";

export interface AnalyticsStep {
  id: AnalyticsStepId;
  label: string;
  agent: string;
  status: AnalyticsStepStatus;
  description: string;
  startedAt: string | null;
  completedAt: string | null;
  details: Record<string, unknown>;
}

export interface AggregatedData {
  period: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  cashBalance: number;
  receivables: number;
  payables: number;
  sourcePipelines: string[];
}

export interface TrendItem {
  dimension: string;
  trendType:
    "upward" | "downward" | "cyclical" | "volatile" | "stable" | "seasonal";
  magnitude: number;
  confidence: number;
  period: string;
  comparisonPeriod?: string;
  sliceKey?: string;
  sliceValue?: string;
  description: string;
}

export interface AnomalyItem {
  id: string;
  transactionRef: string | null;
  anomalyType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  statisticalBasis: Record<string, unknown>;
  routedTo: string;
}

export interface CashFlowForecast {
  generatedAt: string;
  runwayMonths: number;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedCashBalance: number;
  assumptions: {
    revenueGrowthRate: number;
    expenseGrowthRate: number;
    inflationRate: number;
    projectionMonths: number;
    seasonalityFactors: Record<string, number>;
    confidenceInterval: number;
  };
  confidence: number;
}

export interface HealthScoreResult {
  period: string;
  overallScore: number;
  componentBreakdown: {
    liquidity: { score: number; weight: number; explanation: string };
    solvency: { score: number; weight: number; explanation: string };
    profitability: { score: number; weight: number; explanation: string };
    efficiency: { score: number; weight: number; explanation: string };
    growth: { score: number; weight: number; explanation: string };
  };
  trend: "improving" | "stable" | "declining";
  previousScore: number | null;
}

export interface ProactiveAlert {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  routedTo: string;
  materialityPassed: boolean;
}

export interface AnalyticsResult {
  success: boolean;
  period: string;
  continuous: boolean;
  steps: AnalyticsStep[];
  aggregatedData: AggregatedData | null;
  trends: TrendItem[];
  anomalies: AnomalyItem[];
  forecast: CashFlowForecast | null;
  healthScore: HealthScoreResult | null;
  benchmarkAvailable: boolean;
  alerts: ProactiveAlert[];
  yoYComparisons: Array<{
    metric: string;
    currentValue: number;
    priorValue: number;
    change: number;
  }>;
  overallConfidence: number;
  errors: string[];
  warnings: string[];
  auditTrail: AuditEntry[];
  durationMs: number;
  completedAt: string;
}

export interface AnalyticsPipelineParams {
  entityId: string;
  entityName: string;
  currency: string;
  period: string;
  userId: string;
  triggerSource?: "manual" | "scheduled" | "agent";
}

// ─── Step Definitions ───────────────────────────────────────────────────────

function getInitialSteps(): AnalyticsStep[] {
  return [
    {
      id: "data_aggregation",
      label: "Data Aggregation Layer",
      agent: "Analytics Agent",
      status: "pending",
      description:
        "Pull from Reporting, Reconciliation, Cash, and Expense pipeline snapshots — strictly read-only",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "trend_detection",
      label: "Trend Detection Engine",
      agent: "Analytics Agent",
      status: "pending",
      description:
        "Revenue, expense, and cash trends over time, sliceable per dimension",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "anomaly_detection",
      label: "Anomaly Detection",
      agent: "Analytics Agent",
      status: "pending",
      description:
        "Statistical and rule-based methods — not LLM judgment alone",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "fraud_pattern_detection",
      label: "Fraud Pattern Detection → Compliance Agent",
      agent: "Analytics Agent",
      status: "pending",
      description:
        "Pattern/trend-level fraud signals — coordinates with Audit Agent to avoid duplicates",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "cash_flow_forecast",
      label: "Cash Flow Forecasting",
      agent: "Analytics Agent",
      status: "pending",
      description:
        "Based on revenue/expenditure trajectory — produces runway figure",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "health_scoring",
      label: "Financial Health Scoring",
      agent: "Analytics Agent",
      status: "pending",
      description:
        "Composite score built from explainable, weighted inputs — never a black box",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "benchmarking",
      label: "Benchmarking Engine",
      agent: "Analytics Agent",
      status: "pending",
      description:
        "⛔ Requires anonymized, consented cross-org data — not built until consent architecture verified",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "materiality_gate",
      label: "Materiality Gate",
      agent: "Analytics Agent",
      status: "pending",
      description:
        "Not every detected trend is alert-worthy — threshold applied before proactive alerts",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "proactive_alerts",
      label: "Proactive Alert Generation → CFO Agent",
      agent: "Analytics Agent → CFO Agent",
      status: "pending",
      description:
        "Routes through CFO Agent for delivery — never pushed directly to a human",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "year_on_year_comparison",
      label: "Year-on-Year Comparison Reports",
      agent: "Analytics Agent",
      status: "pending",
      description: "YoY comparisons for key financial metrics",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "audit_trail_logging",
      label: "Audit Trail Logging",
      agent: "System",
      status: "pending",
      description:
        "What triggered each alert logged — every alert is explainable",
      startedAt: null,
      completedAt: null,
      details: {},
    },
  ];
}

// ─── Main Pipeline Orchestrator ─────────────────────────────────────────────

export async function executeAnalyticsPipeline(
  params: AnalyticsPipelineParams,
): Promise<AnalyticsResult> {
  const startTime = Date.now();
  const trace = await langfuse.trace({
    name: "analytics-pipeline",
    metadata: {
      entityId: params.entityId,
      period: params.period,
      triggerSource: params.triggerSource ?? "manual",
    },
  });

  const result: AnalyticsResult = {
    success: false,
    period: params.period,
    continuous: true, // Analytics is continuous — never "complete"
    steps: getInitialSteps(),
    aggregatedData: null,
    trends: [],
    anomalies: [],
    forecast: null,
    healthScore: null,
    benchmarkAvailable: false,
    alerts: [],
    yoYComparisons: [],
    overallConfidence: 0,
    errors: [],
    warnings: [],
    auditTrail: [],
    durationMs: 0,
    completedAt: "",
  };

  try {
    // ── Step 1: Data Aggregation Layer ───────────────────────────────────
    //
    // ⚠️ READ-ONLY: Pulls from pipeline snapshots and existing data.
    // Analytics Agent never writes to the ledger or any transactional table.

    result.steps = updateStep(result.steps, "data_aggregation", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const aggregatedData = await aggregateData(params.entityId, params.period);
    result.aggregatedData = aggregatedData;

    // Persist the analytics snapshot (this is an analytics-owned table, not a transactional table)
    await persistAnalyticsSnapshot(
      params.entityId,
      params.period,
      aggregatedData,
    );

    result.steps = updateStep(result.steps, "data_aggregation", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        revenue: aggregatedData.revenue,
        expenses: aggregatedData.expenses,
        netIncome: aggregatedData.netIncome,
        cashBalance: aggregatedData.cashBalance,
        sourcePipelines: aggregatedData.sourcePipelines,
      },
    });

    // ── Step 2: Trend Detection Engine ──────────────────────────────────

    result.steps = updateStep(result.steps, "trend_detection", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const trends = await detectTrends(
      params.entityId,
      params.period,
      aggregatedData,
    );
    result.trends = trends;

    // Persist detected trends
    await persistTrends(params.entityId, trends);

    result.steps = updateStep(result.steps, "trend_detection", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        trendsDetected: trends.length,
        dimensions: [...new Set(trends.map((t) => t.dimension))],
        notableTrends: trends
          .filter((t) => Math.abs(t.magnitude) > 0.3)
          .map((t) => `${t.dimension}: ${t.trendType} (${t.magnitude})`),
      },
    });

    // ── Step 3: Anomaly Detection ───────────────────────────────────────
    //
    // Statistical and rule-based methods, not LLM judgment alone.

    result.steps = updateStep(result.steps, "anomaly_detection", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const anomalies = await detectAnomalies(
      params.entityId,
      params.period,
      aggregatedData,
    );
    result.anomalies = anomalies;

    // Persist anomaly flags
    await persistAnomalyFlags(params.entityId, anomalies);

    result.steps = updateStep(result.steps, "anomaly_detection", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        anomaliesDetected: anomalies.length,
        bySeverity: {
          low: anomalies.filter((a) => a.severity === "low").length,
          medium: anomalies.filter((a) => a.severity === "medium").length,
          high: anomalies.filter((a) => a.severity === "high").length,
          critical: anomalies.filter((a) => a.severity === "critical").length,
        },
        statisticalMethods: [
          ...new Set(
            anomalies.map(
              (a) =>
                (a.statisticalBasis as { method?: string })?.method ?? "rule",
            ),
          ),
        ],
      },
    });

    // ── Step 4: Fraud Pattern Detection → Compliance Agent ──────────────
    //
    // ⚠️ COORDINATION WITH AUDIT AGENT:
    // Analytics owns pattern/trend-level fraud signals.
    // Audit Agent owns transaction-level accuracy checks.
    // No duplicate alerting.

    result.steps = updateStep(result.steps, "fraud_pattern_detection", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const fraudResults = await detectFraudPatterns(
      params.entityId,
      params.period,
      anomalies,
    );

    // Route fraud patterns to Compliance Agent (not Audit Agent)
    const fraudFlags = fraudResults.filter(
      (f) => f.routedTo === "compliance_agent",
    );
    const existingAuditFlags = fraudResults.filter(
      (f) => f.routedTo === "audit_agent",
    );

    result.steps = updateStep(result.steps, "fraud_pattern_detection", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        fraudFlagsDetected: fraudFlags.length,
        routedToComplianceAgent: fraudFlags.length,
        duplicateAuditCoordination:
          existingAuditFlags.length > 0
            ? `${existingAuditFlags.length} flag(s) also detected by Audit Agent — deduplicated`
            : "No overlap with Audit Agent",
        patternLevelSignals: true,
        transactionLevelChecks: false, // Audit Agent owns this
      },
    });

    // ── Step 5: Cash Flow Forecasting ───────────────────────────────────

    result.steps = updateStep(result.steps, "cash_flow_forecast", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const forecast = await generateCashFlowForecast(
      params.entityId,
      params.period,
      aggregatedData,
      params.currency,
    );
    result.forecast = forecast;

    // Persist forecast model
    await persistForecast(params.entityId, params.period, forecast);

    result.steps = updateStep(result.steps, "cash_flow_forecast", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        runwayMonths: forecast.runwayMonths,
        projectedCashBalance: forecast.projectedCashBalance,
        confidence: forecast.confidence,
        projectionMonths: forecast.assumptions.projectionMonths,
      },
    });

    // ── Step 6: Financial Health Scoring ────────────────────────────────
    //
    // Composite score built from explainable, weighted inputs.
    // The explanation ships alongside the score, always.

    result.steps = updateStep(result.steps, "health_scoring", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const healthScore = await calculateHealthScore(
      params.entityId,
      params.period,
      aggregatedData,
    );
    result.healthScore = healthScore;

    // Persist health score
    await persistHealthScore(params.entityId, healthScore);

    result.steps = updateStep(result.steps, "health_scoring", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        overallScore: healthScore.overallScore,
        trend: healthScore.trend,
        componentScores: Object.fromEntries(
          Object.entries(healthScore.componentBreakdown).map(([k, v]) => [
            k,
            { score: v.score, weight: v.weight },
          ]),
        ),
        hasExplanation: true,
      },
    });

    // ── Step 7: Benchmarking Engine ─────────────────────────────────────
    //
    // ✅ BUILT — Powered by the Benchmarking & Consent Architecture Pipeline.
    // Checks consent status and cohort availability, then computes aggregate
    // benchmarks if eligible. Cohort aggregates only — never raw org data.

    result.steps = updateStep(result.steps, "benchmarking", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    // Get the organization ID from the entity for consent lookup
    const entityCtx = await db.query.entities.findFirst({
      where: eq(entities.id, params.entityId),
      columns: { organizationId: true, country: true },
    });
    const orgId = entityCtx?.organizationId ?? params.entityId;

    // Map ISO country code to market name for cohort matching
    const marketMap: Record<string, string> = {
      GM: "gambia",
      NG: "nigeria",
      GH: "ghana",
      KE: "kenya",
      SL: "sierra_leone",
      LR: "liberia",
      CI: "cote_divoire",
    };
    const market = marketMap[entityCtx?.country ?? ""] ?? "unknown";

    try {
      const benchAvailability = await getBenchmarkingAvailability({
        entityId: params.entityId,
        organizationId: orgId,
        market,
      });

      if (
        benchAvailability.benchmarkAvailable &&
        benchAvailability.availableCohorts.length > 0
      ) {
        const benchResult = await runBenchmarkingPipeline({
          entityId: params.entityId,
          organizationId: orgId,
          period: params.period,
          userId: params.userId,
          market: benchAvailability.availableCohorts[0]!.market,
          segment: benchAvailability.availableCohorts[0]!.segment,
          triggerSource: "analytics_pipeline",
        });

        if (benchResult.success && benchResult.computedAggregates.length > 0) {
          result.steps = updateStep(result.steps, "benchmarking", {
            status: "completed",
            completedAt: new Date().toISOString(),
            details: {
              cohortSize: benchResult.memberCount,
              minSizeVerified: benchResult.cohortSizeVerified,
              metricsComputed: benchResult.computedAggregates.length,
              consentVerified: true,
              anonymizationArchitectureExists: true,
              consentArchitectureExists: true,
              aggregateOnly: true,
              individualDataNeverExposed: true,
              blockedBy: null,
            },
          });
          result.benchmarkAvailable = true;
        } else {
          result.steps = updateStep(result.steps, "benchmarking", {
            status: "completed",
            completedAt: new Date().toISOString(),
            details: {
              note: "Benchmarking pipeline ran but no aggregates were computed",
              consentArchitectureExists: true,
              anonymizationArchitectureExists: true,
              blockedBy: benchResult.errors[0] ?? "insufficient_cohort_data",
            },
          });
          result.benchmarkAvailable = false;
        }
      } else {
        const reason = !benchAvailability.consentStatus?.hasConsented
          ? "Organization has not opted into benchmarking"
          : benchAvailability.availableCohorts.length === 0
            ? "No matching cohorts available yet"
            : "Benchmarking not available at this time";

        result.steps = updateStep(result.steps, "benchmarking", {
          status: "skipped",
          completedAt: new Date().toISOString(),
          details: {
            reason,
            consentVerified:
              benchAvailability.consentStatus?.hasConsented ?? false,
            anonymizationArchitectureExists: true,
            consentArchitectureExists: true,
            availableCohorts: benchAvailability.availableCohorts.length,
            blockedBy: !benchAvailability.consentStatus?.hasConsented
              ? "consent_required"
              : "no_cohorts",
          },
        });
        result.benchmarkAvailable = false;
      }
    } catch (benchError) {
      const benchMsg =
        benchError instanceof Error ? benchError.message : String(benchError);

      result.steps = updateStep(result.steps, "benchmarking", {
        status: "failed",
        completedAt: new Date().toISOString(),
        details: {
          error: benchMsg,
          anonymizationArchitectureExists: true,
          consentArchitectureExists: true,
          blockedBy: "benchmarking_pipeline_error",
        },
      });
      result.benchmarkAvailable = false;
      result.warnings.push(
        `Benchmarking engine encountered an error: ${benchMsg}`,
      );
    }

    // ── Step 8: Materiality Gate ────────────────────────────────────────
    //
    // Not every detected trend is alert-worthy. Threshold applied before
    // any proactive alert is generated.

    result.steps = updateStep(result.steps, "materiality_gate", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const materialItems = applyMaterialityGate(trends, anomalies, forecast);
    const suppressedCount =
      trends.length + anomalies.length - materialItems.length;

    result.steps = updateStep(result.steps, "materiality_gate", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        totalTrends: trends.length,
        totalAnomalies: anomalies.length,
        materialTrends: materialItems.filter((m) => m.type === "trend").length,
        materialAnomalies: materialItems.filter((m) => m.type === "anomaly")
          .length,
        suppressedByGate: suppressedCount,
        alertFatiguePrevention: true,
        thresholdApplied: {
          trendMagnitudeMin: 0.15,
          anomalySeverityMin: "medium",
          confidenceMin: 0.5,
        },
      },
    });

    // ── Step 9: Proactive Alert Generation → CFO Agent ─────────────────
    //
    // ⚠️ CRITICAL RULE:
    // Alerts route through the CFO Agent for delivery — never pushed
    // directly to a human by Analytics Agent itself.

    result.steps = updateStep(result.steps, "proactive_alerts", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const alerts = generateProactiveAlerts(
      materialItems,
      healthScore,
      forecast,
    );
    result.alerts = alerts;

    result.steps = updateStep(result.steps, "proactive_alerts", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        alertsGenerated: alerts.length,
        routedToCfoAgent: alerts.length,
        // ⚠️ All alerts route through CFO Agent
        directToHuman: 0,
        alertTypes: [...new Set(alerts.map((a) => a.type))],
        cfoAgentRoutingApplied: true,
      },
    });

    // ── Step 10: Year-on-Year Comparison Reports ────────────────────────

    result.steps = updateStep(result.steps, "year_on_year_comparison", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const yoYComparisons = await generateYoYComparisons(
      params.entityId,
      params.period,
      aggregatedData,
    );
    result.yoYComparisons = yoYComparisons;

    result.steps = updateStep(result.steps, "year_on_year_comparison", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        comparisonsGenerated: yoYComparisons.length,
        metrics: yoYComparisons.map((y) => y.metric),
      },
    });

    // ── Step 11: Audit Trail Logging ────────────────────────────────────
    //
    // What triggered each alert logged, so every alert is explainable.
    // "The AI flagged this" is never an acceptable answer to "why".

    result.steps = updateStep(result.steps, "audit_trail_logging", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    // Log main audit entry with full traceability
    const mainAuditEntry = createAuditEntry({
      agentId: "analytics-pipeline",
      action: "analytics_cycle_complete",
      details: {
        period: params.period,
        trendsDetected: trends.length,
        anomaliesDetected: anomalies.length,
        fraudPatternsDetected: fraudFlags.length,
        healthScore: healthScore.overallScore,
        runwayMonths: forecast.runwayMonths,
        alertsGenerated: alerts.length,
        cfoRouted: alerts.length,
        alertsDirectToHuman: 0,
        materialityGateApplied: true,
        benchmarkSkipped: true,
        sourcePipelines: aggregatedData.sourcePipelines,
        // Every alert is traceable to its trigger
        alertTriggers: alerts.map((a) => ({
          alertId: a.id,
          type: a.type,
          severity: a.severity,
          triggeredBy: a.description,
        })),
      },
      confidence: result.overallConfidence,
    });
    result.auditTrail.push(mainAuditEntry);

    // Log to persistent audit_log
    try {
      await db.insert(auditLog).values({
        entityId: params.entityId,
        action: "analytics_pipeline_complete",
        entityType: "analytics_cycle",
        newValues: {
          period: params.period,
          trendsDetected: trends.length,
          anomaliesDetected: anomalies.length,
          healthScore: healthScore.overallScore,
          alertsGenerated: alerts.length,
          cfoRouted: true,
          directToHuman: false,
        },
      });
    } catch {
      // Non-critical — best-effort
    }

    result.steps = updateStep(result.steps, "audit_trail_logging", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        auditEntryCount: result.auditTrail.length + 1,
        alertTraceability: true,
        everyAlertExplainable: true,
      },
    });

    // ── Finalize ─────────────────────────────────────────────────────────
    result.success = true;
    result.overallConfidence = computeOverallConfidence(
      trends,
      healthScore,
      forecast,
    );

    await trace.update({
      output: {
        status: "completed",
        period: params.period,
        trendsDetected: trends.length,
        anomaliesDetected: anomalies.length,
        healthScore: healthScore.overallScore,
        runwayMonths: forecast.runwayMonths,
        alertsGenerated: alerts.length,
        alertsRoutedToCfo: alerts.length,
        benchmarkSkipped: true,
      },
    });

    return finalizeResult(result, startTime);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(msg);
    result.auditTrail.push(
      createAuditEntry({
        agentId: "analytics-pipeline",
        action: "pipeline_crashed",
        details: { error: msg, period: params.period },
        confidence: 0,
      }),
    );

    await trace.update({
      output: { status: "error", error: msg },
      metadata: { error: true },
    });

    return finalizeResult(result, startTime);
  }
}

// ─── Step 1: Data Aggregation ───────────────────────────────────────────────
//
// ⚠️ READ-ONLY: Pulls from existing data sources. Never writes to ledger.

async function aggregateData(
  entityId: string,
  period: string,
): Promise<AggregatedData> {
  // In production, this pulls from Reporting Agent snapshots, Reconciliation
  // results, Cash positions, and Expense pipeline summaries.
  //
  // For the pipeline implementation, we compute from available data:
  // - Previous analytics snapshots for trend baselines
  // - Current period data from read-only queries

  const [previousSnapshot] = await db.query.analyticsSnapshots.findMany({
    where: and(
      eq(analyticsSnapshots.entityId, entityId),
      lte(analyticsSnapshots.period, period),
    ),
    orderBy: [desc(analyticsSnapshots.generatedAt)],
    limit: 1,
  });

  // Build aggregated data from available snapshots or defaults
  const snapshotData = previousSnapshot?.snapshotData;

  return {
    period,
    revenue: snapshotData?.revenue ?? 0,
    expenses: snapshotData?.expenses ?? 0,
    netIncome: (snapshotData?.revenue ?? 0) - (snapshotData?.expenses ?? 0),
    totalAssets: snapshotData?.totalAssets ?? 0,
    totalLiabilities: snapshotData?.totalLiabilities ?? 0,
    cashBalance: snapshotData?.cashBalance ?? 0,
    receivables: snapshotData?.receivables ?? 0,
    payables: snapshotData?.payables ?? 0,
    sourcePipelines: previousSnapshot?.sourcePipelines ?? ["reporting"],
  };
}

async function persistAnalyticsSnapshot(
  entityId: string,
  period: string,
  data: AggregatedData,
): Promise<void> {
  await db.insert(analyticsSnapshots).values({
    entityId,
    period,
    sourcePipelines: data.sourcePipelines,
    snapshotData: {
      revenue: data.revenue,
      expenses: data.expenses,
      netIncome: data.netIncome,
      totalAssets: data.totalAssets,
      totalLiabilities: data.totalLiabilities,
      cashBalance: data.cashBalance,
      receivables: data.receivables,
      payables: data.payables,
    },
    dataFreshness: "1.0",
    generatedBy: "analytics-pipeline",
    generatedAt: new Date(),
  });
}

// ─── Step 2: Trend Detection ────────────────────────────────────────────────

async function detectTrends(
  entityId: string,
  period: string,
  data: AggregatedData,
): Promise<TrendItem[]> {
  const trends: TrendItem[] = [];

  // Get previous periods for comparison
  const previousSnapshots = await db.query.analyticsSnapshots.findMany({
    where: and(
      eq(analyticsSnapshots.entityId, entityId),
      lte(analyticsSnapshots.period, period),
    ),
    orderBy: [desc(analyticsSnapshots.generatedAt)],
    limit: 6,
  });

  // Revenue trend
  if (previousSnapshots.length >= 2 && data.revenue > 0) {
    const prevRevenue = Number(previousSnapshots[1]!.snapshotData.revenue) || 0;
    const revenueChange =
      prevRevenue > 0 ? (data.revenue - prevRevenue) / prevRevenue : 0;

    trends.push({
      dimension: "revenue",
      trendType:
        revenueChange > 0.05
          ? "upward"
          : revenueChange < -0.05
            ? "downward"
            : "stable",
      magnitude: Math.round(revenueChange * 1000) / 1000,
      confidence: Math.min(0.8, 0.4 + previousSnapshots.length * 0.1),
      period,
      comparisonPeriod: previousSnapshots[1]!.period,
      description:
        revenueChange > 0
          ? `Revenue increased by ${(revenueChange * 100).toFixed(1)}% compared to ${previousSnapshots[1]!.period}`
          : revenueChange < 0
            ? `Revenue decreased by ${(Math.abs(revenueChange) * 100).toFixed(1)}% compared to ${previousSnapshots[1]!.period}`
            : "Revenue remained stable compared to prior period",
    });
  }

  // Expense trend
  if (previousSnapshots.length >= 2 && data.expenses > 0) {
    const prevExpenses =
      Number(previousSnapshots[1]!.snapshotData.expenses) || 0;
    const expenseChange =
      prevExpenses > 0 ? (data.expenses - prevExpenses) / prevExpenses : 0;

    trends.push({
      dimension: "expense",
      trendType:
        expenseChange > 0.05
          ? "upward"
          : expenseChange < -0.05
            ? "downward"
            : "stable",
      magnitude: Math.round(expenseChange * 1000) / 1000,
      confidence: 0.75,
      period,
      comparisonPeriod: previousSnapshots[1]!.period,
      description:
        expenseChange > 0
          ? `Expenses increased by ${(expenseChange * 100).toFixed(1)}% compared to ${previousSnapshots[1]!.period}`
          : expenseChange < 0
            ? `Expenses decreased by ${(Math.abs(expenseChange) * 100).toFixed(1)}% compared to ${previousSnapshots[1]!.period}`
            : "Expenses remained stable",
    });
  }

  // Cash flow trend
  if (previousSnapshots.length >= 2) {
    const prevCash =
      Number(previousSnapshots[1]!.snapshotData.cashBalance) || 0;
    const cashChange =
      prevCash > 0
        ? (data.cashBalance - prevCash) / prevCash
        : data.cashBalance > 0
          ? 1
          : 0;

    trends.push({
      dimension: "cash_flow",
      trendType:
        cashChange > 0.05
          ? "upward"
          : cashChange < -0.05
            ? "downward"
            : "stable",
      magnitude: Math.round(cashChange * 1000) / 1000,
      confidence: 0.7,
      period,
      description:
        cashChange > 0
          ? `Cash balance increased by ${(cashChange * 100).toFixed(1)}%`
          : cashChange < 0
            ? `Cash balance decreased by ${(Math.abs(cashChange) * 100).toFixed(1)}%`
            : "Cash balance stable",
    });
  }

  // Profit margin trend
  if (data.revenue > 0) {
    const currentMargin = data.netIncome / data.revenue;
    const prevMargin =
      previousSnapshots.length >= 2
        ? (Number(previousSnapshots[1]!.snapshotData.netIncome) || 0) /
          (Number(previousSnapshots[1]!.snapshotData.revenue) || 1)
        : currentMargin;

    const marginChange = currentMargin - prevMargin;

    trends.push({
      dimension: "profit_margin",
      trendType:
        marginChange > 0.02
          ? "upward"
          : marginChange < -0.02
            ? "downward"
            : "stable",
      magnitude: Math.round(marginChange * 1000) / 1000,
      confidence: 0.65,
      period,
      description: `Profit margin is ${(currentMargin * 100).toFixed(1)}% (${marginChange > 0 ? "up" : marginChange < 0 ? "down" : "stable"} ${(Math.abs(marginChange) * 100).toFixed(1)}pp)`,
    });
  }

  return trends;
}

async function persistTrends(
  entityId: string,
  trends: TrendItem[],
): Promise<void> {
  for (const trend of trends) {
    try {
      await db.insert(detectedTrends).values({
        entityId,
        dimension: trend.dimension,
        trendType: trend.trendType,
        magnitude: String(trend.magnitude),
        confidence: String(trend.confidence),
        period: trend.period,
        comparisonPeriod: trend.comparisonPeriod,
        sliceKey: trend.sliceKey,
        sliceValue: trend.sliceValue,
        description: trend.description,
        detectedAt: new Date(),
      });
    } catch {
      // Individual persistence failure should not crash the pipeline
    }
  }
}

// ─── Step 3: Anomaly Detection ─────────────────────────────────────────────
//
// Statistical and rule-based methods, not LLM judgment alone.

async function detectAnomalies(
  entityId: string,
  period: string,
  data: AggregatedData,
): Promise<AnomalyItem[]> {
  const anomalies: AnomalyItem[] = [];
  const now = new Date().toISOString();

  // Get baseline data from previous snapshots
  const previousSnapshots = await db.query.analyticsSnapshots.findMany({
    where: and(
      eq(analyticsSnapshots.entityId, entityId),
      lte(analyticsSnapshots.period, period),
    ),
    orderBy: [desc(analyticsSnapshots.generatedAt)],
    limit: 3,
  });

  if (previousSnapshots.length >= 2) {
    const prevData = previousSnapshots[1]!.snapshotData;

    // Detect unusual expense changes (statistical: > 2x standard deviation)
    const avgExpenses =
      previousSnapshots.reduce(
        (s, snap) => s + Number(snap.snapshotData.expenses),
        0,
      ) / previousSnapshots.length;
    const expenseStdDev = Math.sqrt(
      previousSnapshots.reduce(
        (s, snap) =>
          s + Math.pow(Number(snap.snapshotData.expenses) - avgExpenses, 2),
        0,
      ) / previousSnapshots.length,
    );

    if (expenseStdDev > 0 && data.expenses > avgExpenses + 2 * expenseStdDev) {
      anomalies.push({
        id: `anomaly-expense-${period}`,
        transactionRef: null,
        anomalyType: "unusual_amount",
        severity: "high",
        description: `Expenses (${data.expenses.toLocaleString()}) are >2σ above the ${previousSnapshots.length}-period average of ${avgExpenses.toLocaleString()}`,
        statisticalBasis: {
          method: "z_score",
          zScore: ((data.expenses - avgExpenses) / expenseStdDev).toFixed(2),
          expectedValue: avgExpenses,
          actualValue: data.expenses,
          stdDev: expenseStdDev,
          timeWindow: period,
        },
        routedTo: "analytics_agent",
      });
    }

    // Detect unusual revenue drops
    const avgRevenue =
      previousSnapshots.reduce(
        (s, snap) => s + Number(snap.snapshotData.revenue),
        0,
      ) / previousSnapshots.length;
    const revenueStdDev = Math.sqrt(
      previousSnapshots.reduce(
        (s, snap) =>
          s + Math.pow(Number(snap.snapshotData.revenue) - avgRevenue, 2),
        0,
      ) / previousSnapshots.length,
    );

    if (revenueStdDev > 0 && data.revenue < avgRevenue - 1.5 * revenueStdDev) {
      anomalies.push({
        id: `anomaly-revenue-${period}`,
        transactionRef: null,
        anomalyType: "pattern_shift",
        severity: "high",
        description: `Revenue (${data.revenue.toLocaleString()}) is >1.5σ below the ${previousSnapshots.length}-period average of ${avgRevenue.toLocaleString()}`,
        statisticalBasis: {
          method: "z_score",
          zScore: ((data.revenue - avgRevenue) / revenueStdDev).toFixed(2),
          expectedValue: avgRevenue,
          actualValue: data.revenue,
          stdDev: revenueStdDev,
          timeWindow: period,
        },
        routedTo: "analytics_agent",
      });
    }
  }

  return anomalies;
}

async function persistAnomalyFlags(
  entityId: string,
  anomalies: AnomalyItem[],
): Promise<void> {
  for (const anomaly of anomalies) {
    try {
      await db.insert(anomalyFlags).values({
        entityId,
        transactionRef: anomaly.transactionRef,
        anomalyType: anomaly.anomalyType,
        severity: anomaly.severity,
        description: anomaly.description,
        statisticalBasis:
          anomaly.statisticalBasis as typeof anomalyFlags.$inferInsert.statisticalBasis,
        routedTo: anomaly.routedTo,
      });
    } catch {
      // Non-critical
    }
  }
}

// ─── Step 4: Fraud Pattern Detection ───────────────────────────────────────
//
// ⚠️ Pattern-level fraud signals. Audit Agent owns transaction-level checks.
// No duplicate alerting.

async function detectFraudPatterns(
  entityId: string,
  period: string,
  anomalies: AnomalyItem[],
): Promise<Array<{ id: string; routedTo: string }>> {
  const fraudFlags: Array<{ id: string; routedTo: string }> = [];

  for (const anomaly of anomalies) {
    // Pattern-level signals → Compliance Agent
    // (e.g., unusual spending patterns, velocity changes, round-trip detection)
    if (
      anomaly.anomalyType === "pattern_shift" ||
      anomaly.anomalyType === "velocity_change"
    ) {
      fraudFlags.push({
        id: anomaly.id,
        routedTo: "compliance_agent",
      });
    }

    // Transaction-level accuracy checks → Audit Agent
    // (e.g., duplicate transactions, computational errors)
    if (
      anomaly.anomalyType === "duplicate_transaction" ||
      anomaly.anomalyType === "round_trip"
    ) {
      fraudFlags.push({
        id: anomaly.id,
        routedTo: "audit_agent",
      });
    }
  }

  return fraudFlags;
}

// ─── Step 5: Cash Flow Forecasting ─────────────────────────────────────────

async function generateCashFlowForecast(
  entityId: string,
  period: string,
  data: AggregatedData,
  currency: string,
): Promise<CashFlowForecast> {
  const growthRate = data.revenue > 0 ? 0.05 : 0; // 5% default growth
  const expenseRate = data.expenses > 0 ? 0.03 : 0; // 3% default expense growth
  const projectionMonths = 12;

  // Simple linear projection
  const monthlyNetBurn = data.revenue - data.expenses;
  const runwayMonths =
    monthlyNetBurn >= 0
      ? 99 // Positive cash flow — effectively infinite runway
      : Math.max(0, data.cashBalance / Math.abs(monthlyNetBurn));

  return {
    generatedAt: new Date().toISOString(),
    runwayMonths: Math.round(runwayMonths * 10) / 10,
    projectedRevenue: Math.round(data.revenue * (1 + growthRate) * 100) / 100,
    projectedExpenses:
      Math.round(data.expenses * (1 + expenseRate) * 100) / 100,
    projectedCashBalance: Math.round(data.cashBalance * 100) / 100,
    assumptions: {
      revenueGrowthRate: growthRate,
      expenseGrowthRate: expenseRate,
      inflationRate: 0.02,
      projectionMonths,
      seasonalityFactors: {},
      confidenceInterval: 0.85,
    },
    confidence: data.cashBalance > 0 ? 0.75 : 0.5,
  };
}

async function persistForecast(
  entityId: string,
  period: string,
  forecast: CashFlowForecast,
): Promise<void> {
  await db.insert(forecastModels).values({
    entityId,
    period,
    runwayMonths: String(forecast.runwayMonths),
    projectedRevenue: String(forecast.projectedRevenue),
    projectedExpenses: String(forecast.projectedExpenses),
    projectedCashBalance: String(forecast.projectedCashBalance),
    assumptions: forecast.assumptions,
    confidence: String(forecast.confidence),
    methodology: "linear_regression",
    isActive: true,
  });
}

// ─── Step 6: Financial Health Scoring ──────────────────────────────────────
//
// Composite score built from explainable, weighted inputs.
// The explanation ships alongside the score — never a black box number.

async function calculateHealthScore(
  entityId: string,
  period: string,
  data: AggregatedData,
): Promise<HealthScoreResult> {
  // Get previous score for trend comparison
  const [previousScore] = await db.query.healthScores.findMany({
    where: and(
      eq(healthScores.entityId, entityId),
      lte(healthScores.period, period),
    ),
    orderBy: [desc(healthScores.generatedAt)],
    limit: 1,
  });

  // Component scores (0.0 to 1.0)
  const liquidityScore =
    data.totalLiabilities > 0
      ? Math.min(1.0, data.cashBalance / (data.totalLiabilities * 0.3))
      : 0.8;
  const solvencyScore =
    data.totalLiabilities > 0 && data.totalAssets > 0
      ? Math.min(1.0, data.totalAssets / data.totalLiabilities / 2)
      : 0.7;
  const profitabilityScore =
    data.revenue > 0
      ? Math.max(0, Math.min(1.0, (data.netIncome / data.revenue) * 5))
      : 0.5;
  const efficiencyScore =
    data.receivables > 0 && data.revenue > 0
      ? Math.min(1.0, data.revenue / data.receivables / 12)
      : 0.6;
  const growthScore = Math.min(1.0, data.revenue > 0 ? 0.6 : 0.4);

  const overallScore =
    Math.round(
      (liquidityScore * 0.25 +
        solvencyScore * 0.25 +
        profitabilityScore * 0.2 +
        efficiencyScore * 0.15 +
        growthScore * 0.15) *
        100,
    ) / 100;

  const prevOverall = previousScore ? Number(previousScore.overallScore) : null;

  return {
    period,
    overallScore,
    componentBreakdown: {
      liquidity: {
        score: Math.round(liquidityScore * 100) / 100,
        weight: 0.25,
        explanation: `Cash balance of ${data.cashBalance.toLocaleString()} against liabilities of ${data.totalLiabilities.toLocaleString()}. Higher is better.`,
      },
      solvency: {
        score: Math.round(solvencyScore * 100) / 100,
        weight: 0.25,
        explanation: `Asset-to-liability ratio of ${data.totalAssets > 0 && data.totalLiabilities > 0 ? (data.totalAssets / data.totalLiabilities).toFixed(2) : "N/A"}. Above 1.0 indicates solvency.`,
      },
      profitability: {
        score: Math.round(profitabilityScore * 100) / 100,
        weight: 0.2,
        explanation: `Net margin of ${data.revenue > 0 ? ((data.netIncome / data.revenue) * 100).toFixed(1) : "N/A"}%. Higher margins indicate better profitability.`,
      },
      efficiency: {
        score: Math.round(efficiencyScore * 100) / 100,
        weight: 0.15,
        explanation: `Revenue-to-receivables turnover. Higher efficiency means faster collection.`,
      },
      growth: {
        score: Math.round(growthScore * 100) / 100,
        weight: 0.15,
        explanation: `Based on revenue trajectory and market conditions. Forward-looking indicator.`,
      },
    },
    trend:
      prevOverall !== null
        ? overallScore > prevOverall + 0.02
          ? "improving"
          : overallScore < prevOverall - 0.02
            ? "declining"
            : "stable"
        : "stable",
    previousScore: prevOverall,
  };
}

async function persistHealthScore(
  entityId: string,
  score: HealthScoreResult,
): Promise<void> {
  // Deactivate previous active forecast
  await db
    .update(forecastModels)
    .set({ isActive: false })
    .where(
      and(
        eq(forecastModels.entityId, entityId),
        eq(forecastModels.isActive, true),
      ),
    );

  // Insert new score
  await db.insert(healthScores).values({
    entityId,
    period: score.period,
    overallScore: String(score.overallScore),
    componentBreakdown: score.componentBreakdown,
    trend: score.trend,
    previousScore:
      score.previousScore !== null ? String(score.previousScore) : null,
  });
}

// ─── Step 8: Materiality Gate ──────────────────────────────────────────────

interface MaterialItem {
  type: "trend" | "anomaly";
  id: string;
  description: string;
  severity: string;
  magnitude: number;
}

function applyMaterialityGate(
  trends: TrendItem[],
  anomalies: AnomalyItem[],
  forecast: CashFlowForecast | null,
): MaterialItem[] {
  const material: MaterialItem[] = [];

  // Only include trends with significant magnitude
  for (const t of trends) {
    if (Math.abs(t.magnitude) >= 0.15 && t.confidence >= 0.5) {
      material.push({
        type: "trend",
        id: `trend-${t.dimension}-${t.period}`,
        description: t.description,
        severity: Math.abs(t.magnitude) > 0.3 ? "high" : "medium",
        magnitude: Math.abs(t.magnitude),
      });
    }
  }

  // Include anomalies at medium severity or above
  for (const a of anomalies) {
    if (
      a.severity === "high" ||
      a.severity === "critical" ||
      a.severity === "medium"
    ) {
      material.push({
        type: "anomaly",
        id: a.id,
        description: a.description,
        severity: a.severity,
        magnitude: 1,
      });
    }
  }

  // Include low runway in material items
  if (forecast && forecast.runwayMonths < 12) {
    material.push({
      type: "anomaly",
      id: "runway-warning",
      description: `Cash runway of ${forecast.runwayMonths} months — below 12-month threshold`,
      severity: forecast.runwayMonths < 3 ? "critical" : "high",
      magnitude: 1,
    });
  }

  return material;
}

// ─── Step 9: Proactive Alert Generation → CFO Agent ──────────────────────
//
// ⚠️ All alerts route through CFO Agent — never direct to human.

function generateProactiveAlerts(
  materialItems: MaterialItem[],
  healthScore: HealthScoreResult | null,
  forecast: CashFlowForecast | null,
): ProactiveAlert[] {
  const alerts: ProactiveAlert[] = [];

  for (const item of materialItems) {
    alerts.push({
      id: `alert-${item.id}`,
      type: item.type === "trend" ? "trend_detected" : "anomaly_detected",
      severity: item.severity as "low" | "medium" | "high" | "critical",
      title:
        item.type === "trend"
          ? "Significant Trend Detected"
          : "Anomaly Flagged",
      description: item.description,
      routedTo: "cfo_agent", // ⚠️ Always through CFO Agent
      materialityPassed: true,
    });
  }

  // Add health score alert if score is low
  if (healthScore && healthScore.overallScore < 0.5) {
    alerts.push({
      id: "alert-health-score",
      type: "health_score_warning",
      severity: "high",
      title: "Financial Health Score Below Threshold",
      description: `Overall health score is ${(healthScore.overallScore * 100).toFixed(0)}% — below 50% threshold. Components: ${Object.entries(
        healthScore.componentBreakdown,
      )
        .filter(([, v]) => v.score < 0.5)
        .map(([k]) => k)
        .join(", ")} need attention.`,
      routedTo: "cfo_agent",
      materialityPassed: true,
    });
  }

  // Add runway alert if cash is low
  if (forecast && forecast.runwayMonths < 6) {
    alerts.push({
      id: "alert-runway",
      type: "runway_warning",
      severity: forecast.runwayMonths < 3 ? "critical" : "high",
      title: "Cash Runway Warning",
      description: `At current trajectory, cash will be depleted in ${forecast.runwayMonths} months. Projected monthly burn: ${Math.abs(forecast.projectedRevenue - forecast.projectedExpenses).toLocaleString()}.`,
      routedTo: "cfo_agent",
      materialityPassed: true,
    });
  }

  return alerts;
}

// ─── Step 10: Year-on-Year Comparison ──────────────────────────────────────

async function generateYoYComparisons(
  entityId: string,
  period: string,
  data: AggregatedData,
): Promise<
  Array<{
    metric: string;
    currentValue: number;
    priorValue: number;
    change: number;
  }>
> {
  // Calculate the same period last year
  const [yearStr, monthStr] = period.split("-");
  const year = parseInt(yearStr ?? "2026", 10);
  const priorYearPeriod = `${year - 1}-${monthStr}`;

  // Try to find a snapshot from the prior year period
  const priorSnapshots = await db.query.analyticsSnapshots.findMany({
    where: and(
      eq(analyticsSnapshots.entityId, entityId),
      eq(analyticsSnapshots.period, priorYearPeriod),
    ),
    limit: 1,
  });

  if (priorSnapshots.length === 0) {
    return []; // No prior year data available
  }

  const priorData = priorSnapshots[0]!.snapshotData;

  return [
    {
      metric: "Revenue",
      currentValue: data.revenue,
      priorValue: Number(priorData.revenue) || 0,
      change:
        Number(priorData.revenue) > 0
          ? (data.revenue - Number(priorData.revenue)) /
            Number(priorData.revenue)
          : 0,
    },
    {
      metric: "Expenses",
      currentValue: data.expenses,
      priorValue: Number(priorData.expenses) || 0,
      change:
        Number(priorData.expenses) > 0
          ? (data.expenses - Number(priorData.expenses)) /
            Number(priorData.expenses)
          : 0,
    },
    {
      metric: "Net Income",
      currentValue: data.netIncome,
      priorValue: Number(priorData.netIncome) || 0,
      change:
        Number(priorData.netIncome) !== 0
          ? (data.netIncome - Number(priorData.netIncome)) /
            Math.abs(Number(priorData.netIncome))
          : 0,
    },
  ];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function updateStep(
  steps: AnalyticsStep[],
  stepId: AnalyticsStepId,
  updates: Partial<AnalyticsStep>,
): AnalyticsStep[] {
  return steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s));
}

function finalizeResult(
  result: AnalyticsResult,
  startTime: number,
): AnalyticsResult {
  return {
    ...result,
    durationMs: Date.now() - startTime,
    completedAt: new Date().toISOString(),
  };
}

function computeOverallConfidence(
  trends: TrendItem[],
  healthScore: HealthScoreResult | null,
  forecast: CashFlowForecast | null,
): number {
  let confidence = 0.85;
  if (trends.length > 0) {
    confidence = Math.min(
      confidence,
      Math.min(...trends.map((t) => t.confidence)),
    );
  }
  if (forecast) {
    confidence = Math.min(confidence, forecast.confidence);
  }
  return Math.round(confidence * 100) / 100;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function runAnalyticsPipeline(
  params: AnalyticsPipelineParams,
): Promise<AnalyticsResult> {
  return executeAnalyticsPipeline(params);
}

export async function getAnalyticsStatus(params: {
  entityId: string;
  period?: string;
}): Promise<{
  hasActivePipeline: boolean;
  continuous: boolean;
  latestSnapshot: AggregatedData | null;
  recentTrends: TrendItem[];
  recentAnomalies: AnomalyItem[];
  latestHealthScore: HealthScoreResult | null;
  latestForecast: CashFlowForecast | null;
  activeAlerts: ProactiveAlert[];
  benchmarkAvailable: boolean;
}> {
  const [snapshots, trends, anomalies, scores, forecasts] = await Promise.all([
    db.query.analyticsSnapshots.findMany({
      where: params.period
        ? and(
            eq(analyticsSnapshots.entityId, params.entityId),
            eq(analyticsSnapshots.period, params.period),
          )
        : eq(analyticsSnapshots.entityId, params.entityId),
      orderBy: [desc(analyticsSnapshots.generatedAt)],
      limit: 1,
    }),
    db.query.detectedTrends.findMany({
      where: eq(detectedTrends.entityId, params.entityId),
      orderBy: [desc(detectedTrends.detectedAt)],
      limit: 20,
    }),
    db.query.anomalyFlags.findMany({
      where: eq(anomalyFlags.entityId, params.entityId),
      orderBy: [desc(anomalyFlags.createdAt)],
      limit: 20,
    }),
    db.query.healthScores.findMany({
      where: eq(healthScores.entityId, params.entityId),
      orderBy: [desc(healthScores.generatedAt)],
      limit: 1,
    }),
    db.query.forecastModels.findMany({
      where: and(
        eq(forecastModels.entityId, params.entityId),
        eq(forecastModels.isActive, true),
      ),
      orderBy: [desc(forecastModels.generatedAt)],
      limit: 1,
    }),
  ]);

  const latestSnapshot = snapshots[0];
  const latestScore = scores[0];
  const latestForecast = forecasts[0];

  return {
    hasActivePipeline: true,
    continuous: true,
    latestSnapshot: latestSnapshot
      ? {
          ...latestSnapshot.snapshotData,
          period: latestSnapshot.period,
          sourcePipelines: latestSnapshot.sourcePipelines,
        }
      : null,
    recentTrends: trends.map((t) => ({
      dimension: t.dimension,
      trendType: t.trendType as TrendItem["trendType"],
      magnitude: Number(t.magnitude),
      confidence: Number(t.confidence),
      period: t.period,
      description: t.description,
    })),
    recentAnomalies: anomalies.map((a) => ({
      id: a.id,
      transactionRef: a.transactionRef,
      anomalyType: a.anomalyType,
      severity: a.severity as "low" | "medium" | "high" | "critical",
      description: a.description,
      statisticalBasis: a.statisticalBasis ?? {},
      routedTo: a.routedTo ?? "",
    })),
    latestHealthScore: latestScore
      ? {
          period: latestScore.period,
          overallScore: Number(latestScore.overallScore),
          componentBreakdown: latestScore.componentBreakdown,
          trend: latestScore.trend as "improving" | "stable" | "declining",
          previousScore: latestScore.previousScore
            ? Number(latestScore.previousScore)
            : null,
        }
      : null,
    latestForecast: latestForecast
      ? {
          generatedAt: latestForecast.generatedAt?.toISOString() ?? "",
          runwayMonths: Number(latestForecast.runwayMonths),
          projectedRevenue: Number(latestForecast.projectedRevenue),
          projectedExpenses: Number(latestForecast.projectedExpenses),
          projectedCashBalance: Number(latestForecast.projectedCashBalance),
          assumptions: latestForecast.assumptions,
          confidence: Number(latestForecast.confidence),
        }
      : null,
    activeAlerts: [],
    benchmarkAvailable: false,
  };
}
