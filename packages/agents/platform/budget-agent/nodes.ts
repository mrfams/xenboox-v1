import { langfuse } from "../../core/langfuse"
import { createAuditEntry } from "../../core/state"
import { getVarianceAnalysis, getBudgetVsActual } from "./tools"
import type { BudgetStateType } from "./state"

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: BudgetStateType) {
  const trace = await langfuse.trace({
    name: "budget-parse-input",
    metadata: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input ?? {}
  const operationType = state.currentOperation?.type ?? "variance_analysis"

  await trace.update({ output: { operationType, inputKeys: Object.keys(input) } })

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
  }
}

// ─── Node: Variance Analysis ───────────────────────────────────────────────

export async function nodeVarianceAnalysis(state: BudgetStateType) {
  const trace = await langfuse.span({
    name: "budget-variance-analysis",
    input: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input as {
    periodStart?: string
    periodEnd?: string
  } | undefined

  try {
    const periodStart = input?.periodStart ?? "2026-01-01"
    const periodEnd = input?.periodEnd ?? "2026-12-31"

    const summary = await getVarianceAnalysis(state.entityId, periodStart, periodEnd)

    const audit = createAuditEntry({
      agentId: "budget-agent",
      action: "variance_analysis_completed",
      details: {
        period: summary.period,
        totalBudget: summary.totalBudget,
        totalActual: summary.totalActual,
        variance: summary.totalVariance,
        itemCount: summary.items.length,
      },
      confidence: 0.85,
    })

    await trace.update({
      output: { totalBudget: summary.totalBudget, totalActual: summary.totalActual, itemCount: summary.items.length },
    })

    return {
      budgetSummary: summary,
      result: { type: "variance_analysis", ...summary },
      confidence: 0.85,
      reasoning: `Variance analysis for ${summary.period}: budget ${summary.totalBudget}, actual ${summary.totalActual}, variance ${summary.totalVariance}`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: summary }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Variance analysis error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to perform variance analysis: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Budget vs Actual ────────────────────────────────────────────────

export async function nodeBudgetVsActual(state: BudgetStateType) {
  const trace = await langfuse.span({
    name: "budget-vs-actual",
    input: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input as {
    period?: string
    budgetInput?: Record<string, number>
  } | undefined

  try {
    const period = input?.period ?? "2026-01"
    const budgetInput = input?.budgetInput ?? {}

    const summary = await getBudgetVsActual(state.entityId, period, budgetInput)

    const audit = createAuditEntry({
      agentId: "budget-agent",
      action: "budget_vs_actual_completed",
      details: {
        period,
        totalBudget: summary.totalBudget,
        totalActual: summary.totalActual,
        variance: summary.totalVariance,
      },
      confidence: 0.85,
    })

    await trace.update({ output: { period, totalBudget: summary.totalBudget, totalActual: summary.totalActual } })

    return {
      budgetSummary: summary,
      result: { type: "budget_vs_actual", ...summary },
      confidence: 0.85,
      reasoning: `Budget vs actual for ${period}: budget ${summary.totalBudget}, actual ${summary.totalActual}, variance ${summary.totalVariance}`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: summary }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Budget vs actual error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to compare budget vs actual: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Create Budget ───────────────────────────────────────────────────

export async function nodeCreateBudget(state: BudgetStateType) {
  const trace = await langfuse.span({
    name: "budget-create",
    input: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input as {
    period?: string
    budgetInput?: Record<string, number>
  } | undefined

  try {
    const period = input?.period ?? "2026-01"
    const budgetInput = input?.budgetInput ?? {}

    const summary = await getBudgetVsActual(state.entityId, period, budgetInput)

    const audit = createAuditEntry({
      agentId: "budget-agent",
      action: "budget_created",
      details: { period, totalBudget: summary.totalBudget, itemCount: summary.items.length },
      confidence: 0.8,
    })

    await trace.update({ output: { period, totalBudget: summary.totalBudget, itemCount: summary.items.length } })

    return {
      budgetSummary: summary,
      result: { type: "budget_created", ...summary },
      confidence: 0.8,
      reasoning: `Budget created for ${period}: ${summary.items.length} line items, total budget ${summary.totalBudget}`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: summary }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Budget creation error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to create budget: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Budget Forecast ─────────────────────────────────────────────────

export async function nodeBudgetForecast(state: BudgetStateType) {
  const trace = await langfuse.span({
    name: "budget-forecast",
    input: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input as {
    period?: string
    months?: number
  } | undefined

  try {
    const period = input?.period ?? "2026-01"
    const months = input?.months ?? 12

    // Simple linear forecast: current budget ÷ months remaining
    const summary = await getVarianceAnalysis(state.entityId, period, `${period}`)

    const forecast = {
      period,
      forecastMonths: months,
      items: summary.items.map((item) => ({
        ...item,
        forecastedAnnual: item.budgetAmount * months,
      })),
    }

    const audit = createAuditEntry({
      agentId: "budget-agent",
      action: "budget_forecast_completed",
      details: { period, months, itemCount: forecast.items.length },
      confidence: 0.75,
    })

    await trace.update({ output: { period, months, itemCount: forecast.items.length } })

    return {
      budgetSummary: summary,
      result: { type: "budget_forecast", ...forecast },
      confidence: 0.75,
      reasoning: `Budget forecast for ${period}: ${months}-month projection, ${forecast.items.length} line items`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: forecast }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Budget forecast error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to forecast budget: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: BudgetStateType) {
  langfuse.event({
    name: "budget-escalation",
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
      agentId: "budget-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  }
}
