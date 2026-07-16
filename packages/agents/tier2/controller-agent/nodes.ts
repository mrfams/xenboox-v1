import { langfuse } from "../../core/langfuse"
import { CONTROLLER_SYSTEM_PROMPT } from "../../core/prompts"
import { createAuditEntry } from "../../core/state"
import { validateEntryStructural, reconcileSubLedgers, queryTrialBalanceFromDB } from "./tools"
import type { ControllerStateType, PendingEntryReview, CloseChecklist } from "./state"

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: ControllerStateType) {
  const trace = await langfuse.trace({
    name: "controller-parse-input",
    metadata: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input ?? {}
  const operationType = state.currentOperation?.type ?? "review_entries"

  await trace.update({ output: { operationType, inputKeys: Object.keys(input) } })

  return { confidence: 0, reasoning: `Operation ${operationType} received` }
}

// ─── Node: Review Entries (iterates batch, 7 structural checks each) ───────

export async function nodeReviewEntries(state: ControllerStateType) {
  const trace = await langfuse.span({
    name: "controller-review-entries",
    input: { entryCount: state.pendingEntries.length },
  })

  const approved: PendingEntryReview[] = []
  const rejected: PendingEntryReview[] = []
  const allFlags: string[] = []

  for (const entry of state.pendingEntries) {
    const result = await validateEntryStructural(entry, state.entityId)

    const reviewed: PendingEntryReview = {
      ...entry,
      status: result.approved ? "approved" : "rejected",
      rejectionReason: result.rejectionReason,
      reviewedAt: new Date().toISOString(),
      confidence: result.confidence,
    }

    if (result.approved) {
      approved.push(reviewed)
    } else {
      rejected.push(reviewed)
    }
    allFlags.push(...result.structuralFlags, ...result.qualitativeFlags)
  }

  const totalConfidence =
    approved.length > 0
      ? approved.reduce((sum, e) => sum + e.confidence, 0) / approved.length
      : 0.9

  const audit = createAuditEntry({
    agentId: "controller-agent",
    action: "entries_reviewed",
    details: {
      total: state.pendingEntries.length,
      approved: approved.length,
      rejected: rejected.length,
      flags: allFlags,
    },
    confidence: totalConfidence,
  })

  await trace.update({
    output: { approved: approved.length, rejected: rejected.length, flags: allFlags },
  })

  return {
    approvedEntries: approved,
    rejectedEntries: rejected,
    confidence: totalConfidence,
    reasoning: `${approved.length}/${state.pendingEntries.length} entries approved. ${rejected.length} rejected.`,
    auditTrail: [audit],
  }
}

// ─── Node: Review Trial Balance ────────────────────────────────────────────

export async function nodeReviewTrialBalance(state: ControllerStateType) {
  const trace = await langfuse.span({
    name: "controller-review-trial-balance",
    input: { entityId: state.entityId },
  })

  const periodId = (state.currentOperation?.input as Record<string, unknown>)
    ?.periodId as string | undefined

  if (!periodId) {
    return { errors: ["Missing periodId for trial balance review"], confidence: 0 }
  }

  try {
    const tb = await queryTrialBalanceFromDB(state.entityId, periodId)

    const audit = createAuditEntry({
      agentId: "controller-agent",
      action: "trial_balance_reviewed",
      details: {
        balanced: tb.balanced,
        totalDebits: tb.totalDebits,
        totalCredits: tb.totalCredits,
        accountCount: tb.accounts.length,
      },
      confidence: tb.balanced ? 0.95 : 0.0,
    })

    await trace.update({
      output: { balanced: tb.balanced, totalDebits: tb.totalDebits, totalCredits: tb.totalCredits },
    })

    if (!tb.balanced) {
      return {
        trialBalance: tb,
        confidence: 0.0,
        reasoning: `CRITICAL: Trial balance is unbalanced. Debits: ${tb.totalDebits}, Credits: ${tb.totalCredits}. Escalating to CFO.`,
        errors: [`Trial balance unbalanced: debits ${tb.totalDebits} != credits ${tb.totalCredits}`],
        auditTrail: [audit],
      }
    }

    return {
      trialBalance: tb,
      confidence: 0.95,
      reasoning: `Trial balance balanced with ${tb.accounts.length} accounts`,
      auditTrail: [audit],
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { errors: [`Trial balance review error: ${msg}`], confidence: 0.0 }
  }
}

// ─── Node: Run Close Checklist ─────────────────────────────────────────────

export async function nodeRunCloseChecklist(state: ControllerStateType) {
  const trace = await langfuse.span({
    name: "controller-close-checklist",
    input: { entityId: state.entityId },
  })

  const periodLabel = (state.currentOperation?.input as Record<string, unknown>)
    ?.periodLabel as string | undefined

  const checklist: CloseChecklist = {
    period: periodLabel ?? "Unknown",
    items: [
      { domain: "AP", description: "All AP invoices entered for period", status: "pending", completedAt: null, blockedReason: null },
      { domain: "AR", description: "All AR invoices entered for period", status: "pending", completedAt: null, blockedReason: null },
      { domain: "Assets", description: "Depreciation and amortization posted", status: "pending", completedAt: null, blockedReason: null },
      { domain: "GL", description: "All pending entries reviewed", status: "pending", completedAt: null, blockedReason: null },
      { domain: "Sub-ledgers", description: "AP, AR, fixed assets reconcile to GL", status: "pending", completedAt: null, blockedReason: null },
      { domain: "TB", description: "Trial balance generated and balanced", status: "pending", completedAt: null, blockedReason: null },
      { domain: "Review", description: "Summary prepared for CFO Agent", status: "pending", completedAt: null, blockedReason: null },
    ],
    allComplete: false,
    confirmedToCFO: false,
  }

  // Auto-check sub-ledger reconciliation
  const subLedger = await reconcileSubLedgers(state.entityId)

  const subLedgerItem = checklist.items.find((i) => i.domain === "Sub-ledgers")
  if (subLedgerItem) {
    const allReconciled = subLedger.ap.reconciled && subLedger.ar.reconciled && subLedger.fixedAssets.reconciled && subLedger.inventory.reconciled
    subLedgerItem.status = allReconciled ? "complete" : "blocked"
    subLedgerItem.completedAt = allReconciled ? new Date().toISOString() : null
    subLedgerItem.blockedReason = allReconciled
      ? null
      : `AP variance: ${subLedger.ap.variance}, AR variance: ${subLedger.ar.variance}`
  }

  const allComplete = checklist.items.every((i) => i.status === "complete")
  checklist.allComplete = allComplete

  const audit = createAuditEntry({
    agentId: "controller-agent",
    action: "close_checklist_run",
    details: {
      period: checklist.period,
      itemsComplete: checklist.items.filter((i) => i.status === "complete").length,
      totalItems: checklist.items.length,
      allComplete,
    },
    confidence: allComplete ? 0.92 : 0.6,
  })

  await trace.update({
    output: {
      period: checklist.period,
      allComplete,
      itemsComplete: checklist.items.filter((i) => i.status === "complete").length,
    },
  })

  return {
    closeChecklist: checklist,
    subLedgerStatus: subLedger,
    confidence: allComplete ? 0.92 : 0.6,
    reasoning: allComplete
      ? `Close checklist complete for ${checklist.period}. Ready to confirm to CFO.`
      : `Close checklist incomplete for ${checklist.period}. ${checklist.items.filter((i) => i.status !== "complete").length} items pending.`,
    auditTrail: [audit],
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: ControllerStateType) {
  langfuse.event({
    name: "controller-escalation",
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
      agentId: "controller-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  }
}
