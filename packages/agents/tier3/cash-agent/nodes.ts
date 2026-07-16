import { langfuse } from "../../core/langfuse"
import { createAuditEntry } from "../../core/state"
import {
  getDailyCashPosition as getDailyCashPositionTool,
  issueImprest as issueImprestTool,
  retireImprest as retireImprestTool,
  countCash as countCashTool,
  detectDiscrepancies as detectDiscrepanciesTool,
} from "./tools"
import type { CashStateType } from "./state"

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: CashStateType) {
  const trace = await langfuse.trace({
    name: "cash-parse-input",
    metadata: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input ?? {}
  const operationType = state.currentOperation?.type ?? "daily_cash_position"

  await trace.update({ output: { operationType, inputKeys: Object.keys(input) } })

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
  }
}

// ─── Node: Daily Cash Position ─────────────────────────────────────────────

export async function nodeDailyCashPosition(state: CashStateType) {
  const trace = await langfuse.span({
    name: "cash-daily-position",
    input: { entityId: state.entityId },
  })

  try {
    const position = await getDailyCashPositionTool(state.entityId)

    await trace.update({
      output: {
        totalBalance: position.totalBalance,
        accountCount: position.accountCount,
        activeFloats: position.activeFloats,
        outstandingImprest: position.outstandingImprest,
      },
    })

    const audit = createAuditEntry({
      agentId: "cash-agent",
      action: "daily_cash_position_retrieved",
      details: {
        totalBalance: position.totalBalance,
        accountCount: position.accountCount,
        activeFloats: position.activeFloats,
        outstandingImprest: position.outstandingImprest,
      },
      confidence: 0.95,
    })

    return {
      cashPosition: position,
      confidence: 0.95,
      reasoning: `Daily cash position: ${position.accountCount} accounts, total balance ${position.totalBalance}, ${position.activeFloats} active floats, ${position.outstandingImprest} outstanding imprest`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: position }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      errors: [`Cash position error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to retrieve daily cash position: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Issue Imprest ───────────────────────────────────────────────────

export async function nodeIssueImprest(state: CashStateType) {
  const trace = await langfuse.span({
    name: "cash-issue-imprest",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  })

  const input = state.currentOperation?.input as Record<string, unknown> | undefined
  if (!input) {
    const error = "No imprest input provided"
    await trace.update({ output: { success: false, error } })
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    }
  }

  const imprestInput = {
    cashAccountId: input.cashAccountId as string,
    assigneeName: input.assigneeName as string,
    assigneeUserId: input.assigneeUserId as string | undefined,
    amount: input.amount as number,
    purpose: input.purpose as string | undefined,
    settleByDate: input.settleByDate as string | undefined,
  }

  const result = await issueImprestTool(state.entityId, imprestInput)

  await trace.update({
    output: { success: result.success, floatId: result.floatId, errors: result.errors },
  })

  if (!result.success) {
    return {
      errors: result.errors,
      confidence: 0.3,
      reasoning: `Imprest issuance failed: ${result.errors.join("; ")}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: result.errors.join("; ") }
        : null,
    }
  }

  const audit = createAuditEntry({
    agentId: "cash-agent",
    action: "imprest_issued",
    details: {
      floatId: result.floatId,
      amount: result.amount,
      assigneeName: imprestInput.assigneeName,
      cashAccountId: imprestInput.cashAccountId,
    },
    confidence: 0.9,
  })

  return {
    imprestResult: {
      floatId: result.floatId!,
      amount: result.amount!,
      remainingBalance: result.remainingBalance!,
      status: result.status!,
    },
    confidence: 0.9,
    reasoning: `Imprest of ${result.amount} issued to ${imprestInput.assigneeName} (float id: ${result.floatId})`,
    auditTrail: [audit],
    currentOperation: state.currentOperation
      ? { ...state.currentOperation, status: "completed" as const, output: result }
      : null,
  }
}

// ─── Node: Retire Imprest ──────────────────────────────────────────────────

export async function nodeRetireImprest(state: CashStateType) {
  const trace = await langfuse.span({
    name: "cash-retire-imprest",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  })

  const input = state.currentOperation?.input as Record<string, unknown> | undefined
  if (!input?.floatId) {
    const error = "No float ID provided for retirement"
    await trace.update({ output: { success: false, error } })
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    }
  }

  const floatId = input.floatId as string
  const result = await retireImprestTool(state.entityId, floatId)

  await trace.update({
    output: { success: result.success, floatId: result.floatId, errors: result.errors },
  })

  if (!result.success) {
    return {
      errors: result.errors,
      confidence: 0.3,
      reasoning: `Imprest retirement failed: ${result.errors.join("; ")}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: result.errors.join("; ") }
        : null,
    }
  }

  const audit = createAuditEntry({
    agentId: "cash-agent",
    action: "imprest_retired",
    details: {
      floatId: result.floatId,
      originalAmount: result.originalAmount,
      totalReceipts: result.totalReceipts,
      remainingBalance: result.remainingBalance,
      status: result.status,
    },
    confidence: 0.9,
  })

  return {
    imprestResult: {
      floatId: result.floatId!,
      amount: result.originalAmount!,
      remainingBalance: result.remainingBalance!,
      status: result.status!,
    },
    confidence: 0.9,
    reasoning: `Imprest ${floatId} retired: ${result.totalReceipts} in receipts, ${result.remainingBalance} remaining, status ${result.status}`,
    auditTrail: [audit],
    currentOperation: state.currentOperation
      ? { ...state.currentOperation, status: "completed" as const, output: result }
      : null,
  }
}

// ─── Node: Count Cash ──────────────────────────────────────────────────────

export async function nodeCountCash(state: CashStateType) {
  const trace = await langfuse.span({
    name: "cash-count",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  })

  const input = state.currentOperation?.input as Record<string, unknown> | undefined
  if (!input?.cashAccountId || input.countedAmount === undefined) {
    const error = "cashAccountId and countedAmount are required"
    await trace.update({ output: { success: false, error } })
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    }
  }

  try {
    const cashAccountId = input.cashAccountId as string
    const countedAmount = input.countedAmount as number
    const result = await countCashTool(state.entityId, cashAccountId, countedAmount)

    await trace.update({
      output: {
        accountName: result.accountName,
        expected: result.expected,
        actual: result.actual,
        difference: result.difference,
        hasDiscrepancy: result.hasDiscrepancy,
        severity: result.severity,
      },
    })

    const confidence = result.hasDiscrepancy
      ? result.severity === "critical" ? 0.3
        : result.severity === "material" ? 0.5
        : result.severity === "moderate" ? 0.7
        : 0.85
      : 0.95

    const audit = createAuditEntry({
      agentId: "cash-agent",
      action: result.hasDiscrepancy ? "cash_count_discrepancy" : "cash_count_ok",
      details: {
        cashAccountId,
        accountName: result.accountName,
        expected: result.expected,
        actual: result.actual,
        difference: result.difference,
        severity: result.severity,
      },
      confidence,
    })

    return {
      confidence,
      reasoning: result.hasDiscrepancy
        ? `Cash count discrepancy at "${result.accountName}": expected ${result.expected}, counted ${result.actual}, difference ${result.difference} (${result.severity})`
        : `Cash count at "${result.accountName}" matches: ${result.actual}`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: result }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { success: false, error: msg } })
    return {
      errors: [`Cash count error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to count cash: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Detect Discrepancies ────────────────────────────────────────────

export async function nodeDetectDiscrepancies(state: CashStateType) {
  const trace = await langfuse.span({
    name: "cash-detect-discrepancies",
    input: { entityId: state.entityId },
  })

  try {
    const report = await detectDiscrepanciesTool(state.entityId)

    await trace.update({
      output: {
        totalLocations: report.totalLocations,
        discrepancyCount: report.discrepancyCount,
        discrepancies: report.discrepancies,
      },
    })

    const hasMaterial = report.discrepancies.some(
      (d) => d.severity === "material" || d.severity === "critical"
    )

    const confidence = report.discrepancyCount === 0
      ? 0.95
      : hasMaterial ? 0.4 : 0.7

    const audit = createAuditEntry({
      agentId: "cash-agent",
      action: "discrepancy_scan_completed",
      details: {
        totalLocations: report.totalLocations,
        discrepancyCount: report.discrepancyCount,
        discrepancies: report.discrepancies,
      },
      confidence,
    })

    return {
      discrepancyReport: report,
      confidence,
      reasoning: report.discrepancyCount === 0
        ? `No discrepancies detected across ${report.totalLocations} locations`
        : `${report.discrepancyCount} discrepancies found across ${report.totalLocations} locations${hasMaterial ? " (material/critical severity)" : ""}`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: report }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      errors: [`Discrepancy detection error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to detect discrepancies: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: CashStateType) {
  langfuse.event({
    name: "cash-escalation",
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
      agentId: "cash-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  }
}
