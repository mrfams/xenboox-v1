import { langfuse } from "../../core/langfuse"
import { createAuditEntry } from "../../core/state"
import { reviewTaxPosition, checkFilingStatus } from "./tools"
import type { ComplianceStateType } from "./state"

export async function nodeParseInput(state: ComplianceStateType) {
  const trace = await langfuse.trace({
    name: "compliance-parse-input",
    metadata: { entityId: state.entityId },
  })

  await trace.update({ output: { operationType: state.currentOperation?.type } })

  return { confidence: 0, reasoning: `Operation ${state.currentOperation?.type ?? "unknown"} received` }
}

export async function nodeReviewTaxPosition(state: ComplianceStateType) {
  const trace = await langfuse.span({ name: "compliance-tax-review" })

  try {
    const taxInfo = await reviewTaxPosition(state.entityId)

    await trace.update({ output: { hasTaxEntries: taxInfo.hasTaxEntries, accountCount: taxInfo.taxAccounts.length } })

    return {
      result: {
        type: "tax_review",
        hasTaxEntries: taxInfo.hasTaxEntries,
        taxAccounts: taxInfo.taxAccounts,
      },
      confidence: 0.9,
      reasoning: taxInfo.hasTaxEntries
        ? `Found ${taxInfo.taxAccounts.length} tax-related accounts`
        : "No tax accounts found in chart of accounts",
      auditTrail: [createAuditEntry({
        agentId: "compliance-agent",
        action: "tax_review",
        details: { hasTaxEntries: taxInfo.hasTaxEntries, accountCount: taxInfo.taxAccounts.length },
        confidence: 0.9,
      })],
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { errors: [`Tax review error: ${msg}`], confidence: 0.0 }
  }
}

export async function nodeCheckFilingStatus(state: ComplianceStateType) {
  const trace = await langfuse.span({ name: "compliance-filing-status" })

  try {
    const status = await checkFilingStatus(state.entityId)

    await trace.update({ output: status })

    return {
      filingStatus: status,
      confidence: 0.85,
      reasoning: `Filing status: VAT=${status.vat}, Income Tax=${status.incomeTax}, Payroll=${status.payroll}`,
      auditTrail: [createAuditEntry({
        agentId: "compliance-agent",
        action: "filing_status_checked",
        details: status as unknown as Record<string, unknown>,
        confidence: 0.85,
      })],
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { errors: [`Filing status error: ${msg}`], confidence: 0.0 }
  }
}

export async function nodeCloseConfirmation(state: ComplianceStateType) {
  const trace = await langfuse.span({ name: "compliance-close" })

  const allCurrent = state.filingStatus
    ? state.filingStatus.vat !== "overdue" &&
      state.filingStatus.incomeTax !== "overdue" &&
      state.filingStatus.payroll !== "overdue"
    : false

  await trace.update({ output: { confirmed: allCurrent, filingStatus: state.filingStatus } })

  return {
    result: {
      type: "close_confirmation",
      domain: "compliance",
      confirmed: allCurrent,
      filingStatus: state.filingStatus,
    },
    confidence: allCurrent ? 0.88 : 0.5,
    reasoning: allCurrent
      ? "All filings current — compliance domain confirmed for close"
      : "Filing(s) overdue — compliance domain blocked",
  }
}

export async function nodeEscalate(state: ComplianceStateType) {
  langfuse.event({
    name: "compliance-escalation",
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
      agentId: "compliance-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  }
}
