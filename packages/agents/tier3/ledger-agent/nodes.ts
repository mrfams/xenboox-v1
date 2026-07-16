import { langfuse } from "../../core/langfuse"
import { LEDGER_SYSTEM_PROMPT } from "../../core/prompts"
import { createAuditEntry } from "../../core/state"
import {
  runAllValidations,
  postEntry,
  generateTrialBalance,
} from "./tools"
import type { LedgerStateType } from "./state"

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: LedgerStateType) {
  const trace = await langfuse.trace({
    name: "ledger-parse-input",
    metadata: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input ?? {}
  const operationType = state.currentOperation?.type ?? "post_entry"

  await trace.update({ output: { operationType, inputKeys: Object.keys(input) } })

  if (operationType === "post_entry") {
    return {
      pendingEntry: input.entry ?? null,
      confidence: 0,
      reasoning: "Awaiting validation",
    }
  }

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
  }
}

// ─── Node: Validate Entry (Deterministic) ──────────────────────────────────

export async function nodeValidateEntry(state: LedgerStateType) {
  const trace = await langfuse.span({
    name: "ledger-validate-entry",
    input: { entryId: state.pendingEntry?.id },
  })

  if (!state.pendingEntry) {
    const error = "No pending entry to validate"
    await trace.update({ output: { valid: false, error } })
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    }
  }

  const result = await runAllValidations(state.pendingEntry, state.entityId)

  await trace.update({
    output: { valid: result.valid, errorCount: result.errors.length },
    metadata: { constraints: result.constraintLog.map((c) => `${c.constraint}: ${c.passed}`) },
  })

  return {
    constraintLog: result.constraintLog,
    errors: result.errors,
    confidence: result.valid ? 0.95 : 0.0,
    reasoning: result.valid
      ? "All 7 constraints passed — entry approved for posting"
      : `Constraints failed: ${result.errors.join("; ")}`,
    currentOperation: state.currentOperation
      ? {
          ...state.currentOperation,
          status: (result.valid ? "completed" : "failed") as "completed" | "failed",
          error: result.valid ? null : result.errors.join("; "),
        }
      : null,
  }
}

// ─── Node: Post Entry ──────────────────────────────────────────────────────

export async function nodePostEntry(state: LedgerStateType) {
  const trace = await langfuse.span({
    name: "ledger-post-entry",
    input: { entryId: state.pendingEntry?.id, entityId: state.entityId },
  })

  if (!state.pendingEntry) {
    return { errors: ["No pending entry to post"], confidence: 0 }
  }

  try {
    const posted = await postEntry(state.pendingEntry, state.entityId)

    const audit = createAuditEntry({
      agentId: "ledger-agent",
      action: "entry_posted",
      details: {
        entryId: posted.id,
        entryNumber: posted.entryNumber,
        description: posted.description,
        sourceAgent: state.pendingEntry.sourceAgent,
        lineCount: state.pendingEntry.entries.length,
        totalDebit: state.pendingEntry.totalDebit,
        totalCredit: state.pendingEntry.totalCredit,
      },
      confidence: 0.95,
    })

    await trace.update({
      output: { posted: true, entryId: posted.id, entryNumber: posted.entryNumber },
    })

    return {
      result: {
        type: "entry_posted",
        entryId: posted.id,
        entryNumber: posted.entryNumber,
        linesPosted: state.pendingEntry.entries.length,
      },
      confidence: 0.95,
      reasoning: `Entry JE-${posted.entryNumber} posted successfully with ${state.pendingEntry.entries.length} lines`,
      auditTrail: [audit],
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { posted: false, error: msg } })

    return {
      errors: [`Database error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to post entry: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Generate Trial Balance ──────────────────────────────────────────

export async function nodeTrialBalance(state: LedgerStateType) {
  const trace = await langfuse.span({
    name: "ledger-trial-balance",
    input: { entityId: state.entityId, periodId: state.currentOperation?.input?.periodId },
  })

  const periodId = (state.currentOperation?.input as Record<string, unknown>)
    ?.periodId as string | undefined

  if (!periodId) {
    return { errors: ["Missing periodId for trial balance"], confidence: 0 }
  }

  try {
    const tb = await generateTrialBalance(state.entityId, periodId)

    if (!tb.balanced) {
      await trace.update({ output: { balanced: false, totalDebits: tb.totalDebits, totalCredits: tb.totalCredits } })
      return {
        trialBalance: tb,
        confidence: 0.0,
        reasoning: `CRITICAL: Trial balance is unbalanced. Debits: ${tb.totalDebits}, Credits: ${tb.totalCredits}`,
        errors: [`Trial balance unbalanced: debits ${tb.totalDebits} != credits ${tb.totalCredits}`],
      }
    }

    await trace.update({ output: { balanced: true, accountCount: tb.accounts.length } })

    return {
      trialBalance: tb,
      confidence: 0.95,
      reasoning: `Trial balance balanced with ${tb.accounts.length} accounts`,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { errors: [`Trial balance error: ${msg}`], confidence: 0.0 }
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: LedgerStateType) {
  langfuse.event({
    name: "ledger-escalation",
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
      agentId: "ledger-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
      constraintLog: state.constraintLog,
    },
  }
}
