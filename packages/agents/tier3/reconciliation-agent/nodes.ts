import { langfuse } from "../../core/langfuse"
import { createAuditEntry } from "../../core/state"
import {
  matchTransactions as matchTransactionsTool,
  ingestStatementTransactions as ingestStatementTransactionsTool,
  generateReconciliationReport as generateReconciliationReportTool,
  flagUnmatched as flagUnmatchedTool,
} from "./tools"
import type { ReconciliationStateType } from "./state"

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: ReconciliationStateType) {
  const trace = await langfuse.trace({
    name: "reconciliation-parse-input",
    metadata: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input ?? {}
  const operationType = state.currentOperation?.type ?? "match_transactions"

  await trace.update({ output: { operationType, inputKeys: Object.keys(input) } })

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
  }
}

// ─── Node: Match Transactions ──────────────────────────────────────────────

export async function nodeMatchTransactions(state: ReconciliationStateType) {
  const trace = await langfuse.span({
    name: "reconciliation-match-transactions",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  })

  const input = state.currentOperation?.input as Record<string, unknown> | undefined
  if (!input) {
    const error = "No match input provided"
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

  const bankAccountId = input.bankAccountId as string
  const statementTransactions = input.statementTransactions as Array<{
    id: string
    amount: string
    transactionDate: string
    reference: string | null
    description: string
    type: string
  }>

  if (!bankAccountId) {
    const error = "bankAccountId is required"
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

  if (!statementTransactions || statementTransactions.length === 0) {
    const error = "statementTransactions array is required and must not be empty"
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

  const results = await matchTransactionsTool(state.entityId, bankAccountId, statementTransactions)

  const matchedCount = results.filter((r) => r.matchType !== "unmatched").length
  const unmatchedCount = results.filter((r) => r.matchType === "unmatched").length

  await trace.update({
    output: {
      totalTransactions: results.length,
      matchedCount,
      unmatchedCount,
    },
  })

  const overallConfidence =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      : 0

  const audit = createAuditEntry({
    agentId: "reconciliation-agent",
    action: "transactions_matched",
    details: {
      bankAccountId,
      totalTransactions: results.length,
      matchedCount,
      unmatchedCount,
    },
    confidence: overallConfidence,
  })

  return {
    currentMatchResults: results,
    confidence: overallConfidence,
    reasoning: `Matched ${matchedCount} of ${results.length} transactions (${unmatchedCount} unmatched)`,
    auditTrail: [audit],
    currentOperation: state.currentOperation
      ? { ...state.currentOperation, status: "completed" as const, output: results }
      : null,
  }
}

// ─── Node: Ingest Statement ───────────────────────────────────────────────

export async function nodeIngestStatement(state: ReconciliationStateType) {
  const trace = await langfuse.span({
    name: "reconciliation-ingest-statement",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  })

  const input = state.currentOperation?.input as Record<string, unknown> | undefined
  if (!input) {
    const error = "No ingest input provided"
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

  const transactions = input.transactions as Array<{
    bankAccountId: string
    transactionDate: string
    valueDate?: string
    type: string
    amount: string
    balance?: string
    description: string
    reference?: string
    metadata?: Record<string, unknown>
  }>

  if (!transactions || transactions.length === 0) {
    const error = "transactions array is required and must not be empty"
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

  const result = await ingestStatementTransactionsTool(state.entityId, transactions)

  await trace.update({
    output: {
      success: result.success,
      insertedCount: result.insertedIds.length,
      errorCount: result.errors.length,
    },
  })

  if (!result.success) {
    return {
      errors: result.errors,
      confidence: 0.3,
      reasoning: `Statement ingest completed with ${result.errors.length} errors: ${result.errors.join("; ")}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: result.errors.join("; ") }
        : null,
    }
  }

  const audit = createAuditEntry({
    agentId: "reconciliation-agent",
    action: "statement_ingested",
    details: {
      insertedCount: result.insertedIds.length,
      insertedIds: result.insertedIds,
    },
    confidence: 0.9,
  })

  return {
    confidence: 0.9,
    reasoning: `Successfully ingested ${result.insertedIds.length} bank transactions`,
    auditTrail: [audit],
    currentOperation: state.currentOperation
      ? { ...state.currentOperation, status: "completed" as const, output: result }
      : null,
  }
}

// ─── Node: Reconciliation Report ──────────────────────────────────────────

export async function nodeReconciliationReport(state: ReconciliationStateType) {
  const trace = await langfuse.span({
    name: "reconciliation-report",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  })

  const input = state.currentOperation?.input as Record<string, unknown> | undefined
  if (!input) {
    const error = "No report input provided"
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

  const bankAccountId = input.bankAccountId as string
  if (!bankAccountId) {
    const error = "bankAccountId is required"
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
    const summary = await generateReconciliationReportTool(state.entityId, bankAccountId)

    await trace.update({
      output: {
        matchedCount: summary.matchedCount,
        unmatchedCount: summary.unmatchedCount,
        totalAmount: summary.totalAmount,
        matchedAmount: summary.matchedAmount,
        unmatchedAmount: summary.unmatchedAmount,
      },
    })

    const audit = createAuditEntry({
      agentId: "reconciliation-agent",
      action: "reconciliation_report_generated",
      details: {
        bankAccountId,
        matchedCount: summary.matchedCount,
        unmatchedCount: summary.unmatchedCount,
        totalAmount: summary.totalAmount,
        matchedAmount: summary.matchedAmount,
        unmatchedAmount: summary.unmatchedAmount,
      },
      confidence: 0.95,
    })

    return {
      reconciliationSummary: summary,
      confidence: 0.95,
      reasoning: `Reconciliation report: ${summary.matchedCount} matched, ${summary.unmatchedCount} unmatched, total ${summary.totalAmount}`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: summary }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      errors: [`Reconciliation report error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to generate reconciliation report: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Flag Unmatched ─────────────────────────────────────────────────

export async function nodeFlagUnmatched(state: ReconciliationStateType) {
  const trace = await langfuse.span({
    name: "reconciliation-flag-unmatched",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  })

  const input = state.currentOperation?.input as Record<string, unknown> | undefined
  if (!input) {
    const error = "No flag input provided"
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

  const reconciliationId = input.reconciliationId as string
  const unmatchedItems = input.unmatchedItems as Array<{
    bankTransactionId: string
    notes?: string
  }>

  if (!reconciliationId) {
    const error = "reconciliationId is required"
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

  if (!unmatchedItems || unmatchedItems.length === 0) {
    const error = "unmatchedItems array is required and must not be empty"
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

  const result = await flagUnmatchedTool(state.entityId, reconciliationId, unmatchedItems)

  await trace.update({
    output: {
      success: result.success,
      createdCount: result.createdCount,
      errorCount: result.errors.length,
    },
  })

  if (!result.success) {
    return {
      errors: result.errors,
      confidence: 0.4,
      reasoning: `Flag unmatched completed with ${result.errors.length} errors: ${result.errors.join("; ")}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: result.errors.join("; ") }
        : null,
    }
  }

  const audit = createAuditEntry({
    agentId: "reconciliation-agent",
    action: "unmatched_flagged",
    details: {
      reconciliationId,
      flaggedCount: result.createdCount,
    },
    confidence: 0.9,
  })

  return {
    confidence: 0.9,
    reasoning: `Flagged ${result.createdCount} unmatched transactions for reconciliation ${reconciliationId}`,
    auditTrail: [audit],
    currentOperation: state.currentOperation
      ? { ...state.currentOperation, status: "completed" as const, output: result }
      : null,
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: ReconciliationStateType) {
  langfuse.event({
    name: "reconciliation-escalation",
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
      agentId: "reconciliation-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  }
}
