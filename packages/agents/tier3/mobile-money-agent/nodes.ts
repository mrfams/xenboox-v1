import { langfuse } from "../../core/langfuse"
import { createAuditEntry } from "../../core/state"
import {
  ingestMobileStatement as ingestMobileStatementTool,
  matchMobileTransactions as matchMobileTransactionsTool,
  reconcileWallet as reconcileWalletTool,
  analyzeFees as analyzeFeesTool,
} from "./tools"
import type { MobileMoneyStateType } from "./state"

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: MobileMoneyStateType) {
  const trace = await langfuse.trace({
    name: "mobile-money-parse-input",
    metadata: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input ?? {}
  const operationType = state.currentOperation?.type ?? "ingest_statement"

  await trace.update({ output: { operationType, inputKeys: Object.keys(input) } })

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
  }
}

// ─── Node: Ingest Statement ────────────────────────────────────────────────

export async function nodeIngestStatement(state: MobileMoneyStateType) {
  const span = await langfuse.span({
    name: "mobile-money-ingest-statement",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  })

  const input = state.currentOperation?.input as Record<string, unknown> | undefined
  if (!input) {
    const error = "No ingestion input provided"
    await span.update({ output: { success: false, error } })
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    }
  }

  const accountId = input.accountId as string
  const transactions = input.transactions as Array<Record<string, unknown>>

  if (!accountId) {
    const error = "accountId is required"
    await span.update({ output: { success: false, error } })
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    }
  }

  if (!Array.isArray(transactions) || transactions.length === 0) {
    const error = "transactions array is required and must not be empty"
    await span.update({ output: { success: false, error } })
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    }
  }

  const result = await ingestMobileStatementTool(state.entityId, accountId, transactions as unknown as import("./tools").MobileStatementTx[])

  await span.update({
    output: { success: result.success, result: result.result, errors: result.errors },
  })

  if (!result.success) {
    return {
      errors: result.errors,
      confidence: 0.2,
      reasoning: `Statement ingestion failed: ${result.errors.join("; ")}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: result.errors.join("; ") }
        : null,
    }
  }

  const audit = createAuditEntry({
    agentId: "mobile-money-agent",
    action: "statement_ingested",
    details: {
      accountId,
      imported: result.result.imported,
      duplicates: result.result.duplicates,
      errors: result.result.errors,
    },
    confidence: 0.9,
  })

  return {
    ingestionResult: result.result,
    confidence: 0.9,
    reasoning: `Statement ingested: ${result.result.imported} imported, ${result.result.duplicates} duplicates, ${result.result.errors} errors`,
    auditTrail: [audit],
    currentOperation: state.currentOperation
      ? { ...state.currentOperation, status: "completed" as const, output: result.result }
      : null,
  }
}

// ─── Node: Match Transactions ──────────────────────────────────────────────

export async function nodeMatchTransactions(state: MobileMoneyStateType) {
  const span = await langfuse.span({
    name: "mobile-money-match-transactions",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  })

  const input = state.currentOperation?.input as Record<string, unknown> | undefined
  const accountId = input?.accountId as string | undefined

  if (!accountId) {
    const error = "accountId is required for transaction matching"
    await span.update({ output: { success: false, error } })
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
    const results = await matchMobileTransactionsTool(state.entityId, accountId)

    const matchedCount = results.filter((r) => r.matched).length
    const unmatchedCount = results.length - matchedCount

    await span.update({
      output: { total: results.length, matched: matchedCount, unmatched: unmatchedCount },
    })

    const audit = createAuditEntry({
      agentId: "mobile-money-agent",
      action: "transactions_matched",
      details: {
        accountId,
        total: results.length,
        matched: matchedCount,
        unmatched: unmatchedCount,
      },
      confidence: matchedCount / Math.max(results.length, 1),
    })

    return {
      matchResults: results,
      confidence: matchedCount / Math.max(results.length, 1),
      reasoning: `Matched ${matchedCount}/${results.length} transactions to ledger entries`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: { matched: matchedCount, unmatched: unmatchedCount } }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      errors: [`Transaction matching error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to match transactions: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Reconcile Wallet ────────────────────────────────────────────────

export async function nodeReconcileWallet(state: MobileMoneyStateType) {
  const span = await langfuse.span({
    name: "mobile-money-reconcile-wallet",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  })

  const input = state.currentOperation?.input as Record<string, unknown> | undefined
  const accountId = input?.accountId as string | undefined

  if (!accountId) {
    const error = "accountId is required for wallet reconciliation"
    await span.update({ output: { success: false, error } })
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
    const reconciliation = await reconcileWalletTool(state.entityId, accountId)

    await span.update({
      output: {
        walletBalance: reconciliation.walletBalance,
        ledgerBalance: reconciliation.ledgerBalance,
        difference: reconciliation.difference,
        status: reconciliation.status,
      },
    })

    const confidence = reconciliation.status === "reconciled" ? 0.95 : reconciliation.status === "discrepancy" ? 0.6 : 0.3

    const audit = createAuditEntry({
      agentId: "mobile-money-agent",
      action: "wallet_reconciled",
      details: {
        accountId,
        walletBalance: reconciliation.walletBalance,
        ledgerBalance: reconciliation.ledgerBalance,
        difference: reconciliation.difference,
        status: reconciliation.status,
      },
      confidence,
    })

    return {
      walletReconciliation: reconciliation,
      confidence,
      reasoning: reconciliation.status === "reconciled"
        ? `Wallet reconciled: balance ${reconciliation.walletBalance} matches ledger ${reconciliation.ledgerBalance}`
        : `Wallet discrepancy: wallet ${reconciliation.walletBalance} vs ledger ${reconciliation.ledgerBalance} (diff ${reconciliation.difference})`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: reconciliation }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      errors: [`Wallet reconciliation error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to reconcile wallet: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Track Fees ──────────────────────────────────────────────────────

export async function nodeTrackFees(state: MobileMoneyStateType) {
  const span = await langfuse.span({
    name: "mobile-money-track-fees",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  })

  const input = state.currentOperation?.input as Record<string, unknown> | undefined
  const startDate = input?.startDate as string | undefined
  const endDate = input?.endDate as string | undefined

  if (!startDate || !endDate) {
    const error = "startDate and endDate are required for fee analysis"
    await span.update({ output: { success: false, error } })
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
    const analysis = await analyzeFeesTool(state.entityId, startDate, endDate)

    await span.update({
      output: {
        totalFees: analysis.totalFees,
        feeByProvider: analysis.feeByProvider,
        averageFeeRate: analysis.averageFeeRate,
      },
    })

    const audit = createAuditEntry({
      agentId: "mobile-money-agent",
      action: "fees_analyzed",
      details: {
        startDate,
        endDate,
        totalFees: analysis.totalFees,
        feeByProvider: analysis.feeByProvider,
        averageFeeRate: analysis.averageFeeRate,
      },
      confidence: 0.95,
    })

    return {
      feeAnalysis: analysis,
      confidence: 0.95,
      reasoning: `Fee analysis: total ${analysis.totalFees} across ${Object.keys(analysis.feeByProvider).length} providers, avg rate ${(analysis.averageFeeRate * 100).toFixed(2)}%`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: analysis }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      errors: [`Fee analysis error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to analyze fees: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: MobileMoneyStateType) {
  langfuse.event({
    name: "mobile-money-escalation",
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
      agentId: "mobile-money-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  }
}
