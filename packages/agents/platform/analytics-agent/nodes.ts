import { langfuse } from "../../core/langfuse"
import { createAuditEntry } from "../../core/state"
import { getFinancialRatios, getKpiDashboard, getTrendAnalysis, getCashFlowAnalysis } from "./tools"
import type { AnalyticsStateType } from "./state"

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: AnalyticsStateType) {
  const trace = await langfuse.trace({
    name: "analytics-parse-input",
    metadata: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input ?? {}
  const operationType = state.currentOperation?.type ?? "kpi_dashboard"

  await trace.update({ output: { operationType, inputKeys: Object.keys(input) } })

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
  }
}

// ─── Node: Financial Ratios ────────────────────────────────────────────────

export async function nodeFinancialRatios(state: AnalyticsStateType) {
  const trace = await langfuse.span({
    name: "analytics-financial-ratios",
    input: { entityId: state.entityId },
  })

  try {
    const ratios = await getFinancialRatios(state.entityId)

    const summary = {
      period: new Date().toISOString().slice(0, 7),
      ratios,
      insights: ratios.filter((r) => r.status !== "good").map((r) => `${r.name}: ${r.status} — ${r.description}`),
      kpis: {},
    }

    const audit = createAuditEntry({
      agentId: "analytics-agent",
      action: "financial_ratios_calculated",
      details: { ratioCount: ratios.length, warningCount: ratios.filter((r) => r.status === "warning").length },
      confidence: 0.85,
    })

    await trace.update({ output: { ratioCount: ratios.length } })

    return {
      analyticsSummary: summary,
      result: { type: "financial_ratios", ...summary },
      confidence: 0.85,
      reasoning: `Financial ratios calculated: ${ratios.length} ratios, ${summary.insights.length} insights`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: summary }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Financial ratios error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to calculate financial ratios: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: KPI Dashboard ──────────────────────────────────────────────────

export async function nodeKpiDashboard(state: AnalyticsStateType) {
  const trace = await langfuse.span({
    name: "analytics-kpi-dashboard",
    input: { entityId: state.entityId },
  })

  try {
    const summary = await getKpiDashboard(state.entityId)

    const audit = createAuditEntry({
      agentId: "analytics-agent",
      action: "kpi_dashboard_generated",
      details: { ratioCount: summary.ratios.length, insightCount: summary.insights.length },
      confidence: 0.85,
    })

    await trace.update({ output: { ratioCount: summary.ratios.length, insightCount: summary.insights.length } })

    return {
      analyticsSummary: summary,
      result: { type: "kpi_dashboard", ...summary },
      confidence: 0.85,
      reasoning: `KPI dashboard generated: ${summary.ratios.length} ratios, ${summary.insights.length} insights`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: summary }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`KPI dashboard error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to generate KPI dashboard: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Trend Analysis ─────────────────────────────────────────────────

export async function nodeTrendAnalysis(state: AnalyticsStateType) {
  const trace = await langfuse.span({
    name: "analytics-trend-analysis",
    input: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input as {
    periods?: number
  } | undefined

  try {
    const summary = await getTrendAnalysis(state.entityId, input?.periods ?? 6)

    const audit = createAuditEntry({
      agentId: "analytics-agent",
      action: "trend_analysis_completed",
      details: { periodCount: input?.periods ?? 6, ratioCount: summary.ratios.length },
      confidence: 0.8,
    })

    await trace.update({ output: { ratioCount: summary.ratios.length } })

    return {
      analyticsSummary: summary,
      result: { type: "trend_analysis", ...summary },
      confidence: 0.8,
      reasoning: `Trend analysis completed: ${summary.ratios.length} ratios across ${input?.periods ?? 6} periods`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: summary }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Trend analysis error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to perform trend analysis: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Cash Flow Analysis ─────────────────────────────────────────────

export async function nodeCashFlowAnalysis(state: AnalyticsStateType) {
  const trace = await langfuse.span({
    name: "analytics-cash-flow",
    input: { entityId: state.entityId },
  })

  try {
    const summary = await getCashFlowAnalysis(state.entityId)

    const audit = createAuditEntry({
      agentId: "analytics-agent",
      action: "cash_flow_analysis_completed",
      details: { ratioCount: summary.ratios.length },
      confidence: 0.8,
    })

    await trace.update({ output: { ratioCount: summary.ratios.length } })

    return {
      analyticsSummary: summary,
      result: { type: "cash_flow_analysis", ...summary },
      confidence: 0.8,
      reasoning: `Cash flow analysis completed: ${summary.ratios.length} ratios`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: summary }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Cash flow analysis error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to perform cash flow analysis: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: AnalyticsStateType) {
  langfuse.event({
    name: "analytics-escalation",
    metadata: {
      entityId: state.entityId,
      confidence: state.confidence,
      errors: state.errors,
      reasoning: state.reasoning,
      escalated: true,
    },
  })

  return {
    result: {
      type: "escalation",
      agentId: "analytics-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  }
}
