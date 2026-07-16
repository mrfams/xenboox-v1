import { langfuse } from "../../core/langfuse"
import { createAuditEntry } from "../../core/state"
import { getCashPosition, checkReconciliationStatus, generateDailyReport } from "./tools"
import type { TreasuryStateType } from "./state"

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: TreasuryStateType) {
  const trace = await langfuse.trace({
    name: "treasury-parse-input",
    metadata: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input ?? {}
  const operationType = state.currentOperation?.type ?? "cash_position"

  await trace.update({ output: { operationType, inputKeys: Object.keys(input) } })

  return { confidence: 0, reasoning: `Operation ${operationType} received` }
}

// ─── Node: Get Cash Position ───────────────────────────────────────────────

export async function nodeGetCashPosition(state: TreasuryStateType) {
  const trace = await langfuse.span({
    name: "treasury-get-cash-position",
    input: { entityId: state.entityId },
  })

  try {
    const position = await getCashPosition(state.entityId)

    const audit = createAuditEntry({
      agentId: "treasury-agent",
      action: "cash_position_retrieved",
      details: {
        bankAccountCount: position.bankAccounts.length,
        mmWalletCount: position.mmWallets.length,
        physicalCash: position.physicalCash,
        totalBaseCurrency: position.totalBaseCurrency,
      },
      confidence: 0.95,
    })

    await trace.update({
      output: {
        totalBaseCurrency: position.totalBaseCurrency,
        bankAccounts: position.bankAccounts.length,
        mmWallets: position.mmWallets.length,
      },
    })

    return {
      cashPosition: position,
      confidence: 0.95,
      reasoning: `Cash position retrieved: ${position.totalBaseCurrency.toFixed(2)} across ${position.bankAccounts.length} bank accounts, ${position.mmWallets.length} MM wallets`,
      auditTrail: [audit],
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      errors: [`Cash position retrieval failed: ${msg}`],
      confidence: 0.0,
      reasoning: `Unable to retrieve cash position: ${msg}`,
    }
  }
}

// ─── Node: Run Reconciliation ──────────────────────────────────────────────

export async function nodeRunReconciliation(state: TreasuryStateType) {
  const trace = await langfuse.span({
    name: "treasury-run-reconciliation",
    input: { entityId: state.entityId },
  })

  try {
    const status = await checkReconciliationStatus(state.entityId)
    const allComplete = status.bankComplete && status.mmComplete && status.cashComplete

    const confidence = allComplete
      ? 0.92
      : status.unresolvedItems > 5
        ? 0.5
        : 0.75

    const audit = createAuditEntry({
      agentId: "treasury-agent",
      action: "reconciliation_checked",
      details: {
        bankComplete: status.bankComplete,
        mmComplete: status.mmComplete,
        cashComplete: status.cashComplete,
        unresolvedItems: status.unresolvedItems,
      },
      confidence,
    })

    await trace.update({
      output: {
        allComplete,
        unresolvedItems: status.unresolvedItems,
        bankComplete: status.bankComplete,
        mmComplete: status.mmComplete,
      },
    })

    const errors: string[] = []
    if (!allComplete) {
      errors.push(
        `${status.unresolvedItems} unresolved reconciliation item(s) across accounts`,
      )
    }

    return {
      reconciliationStatus: status,
      confidence,
      reasoning: allComplete
        ? "All accounts fully reconciled"
        : `Reconciliation incomplete: ${status.unresolvedItems} unresolved items`,
      auditTrail: [audit],
      errors,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      errors: [`Reconciliation check failed: ${msg}`],
      confidence: 0.0,
      reasoning: `Unable to run reconciliation: ${msg}`,
    }
  }
}

// ─── Node: Generate Daily Report ───────────────────────────────────────────

export async function nodeGenerateDailyReport(state: TreasuryStateType) {
  const trace = await langfuse.span({
    name: "treasury-daily-report",
    input: { entityId: state.entityId },
  })

  try {
    const report = await generateDailyReport(state.entityId, state.currency)

    const hasAlerts = report.alerts.length > 0
    const confidence = hasAlerts ? 0.75 : 0.9

    const audit = createAuditEntry({
      agentId: "treasury-agent",
      action: "daily_report_generated",
      details: {
        date: report.date,
        totalCash: report.totalCash,
        alertCount: report.alerts.length,
        recommendationCount: report.recommendations.length,
      },
      confidence,
    })

    await trace.update({
      output: {
        date: report.date,
        totalCash: report.totalCash,
        alertCount: report.alerts.length,
      },
    })

    const errors: string[] = hasAlerts ? report.alerts : []

    return {
      dailyReport: report,
      confidence,
      reasoning: hasAlerts
        ? `Daily report generated with ${report.alerts.length} alert(s)`
        : "Daily report generated — no alerts",
      auditTrail: [audit],
      errors,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      errors: [`Daily report generation failed: ${msg}`],
      confidence: 0.0,
      reasoning: `Unable to generate daily report: ${msg}`,
    }
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: TreasuryStateType) {
  langfuse.event({
    name: "treasury-escalation",
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
      agentId: "treasury-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  }
}
