import { langfuse } from "../../core/langfuse"
import { createAuditEntry } from "../../core/state"
import { generateAgingReport, getOverdueAlerts, matchPayment } from "./tools"
import type { ArStateType } from "./state"
import type { PaymentData } from "./tools"

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: ArStateType) {
  const trace = await langfuse.trace({
    name: "ar-parse-input",
    metadata: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input ?? {}
  const operationType = state.currentOperation?.type ?? "aging_report"

  await trace.update({ output: { operationType, inputKeys: Object.keys(input) } })

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
  }
}

// ─── Node: Generate Aging Report ────────────────────────────────────────────

export async function nodeGenerateAgingReport(state: ArStateType) {
  const trace = await langfuse.span({
    name: "ar-aging-report",
    input: { entityId: state.entityId },
  })

  try {
    const report = await generateAgingReport(state.entityId)

    await trace.update({
      output: {
        totalOutstanding: report.totalOutstanding,
        invoiceCount: report.invoiceCount,
        overdueCount: report.overdueCount,
      },
    })

    return {
      agingReport: report,
      confidence: 0.95,
      reasoning: `Aging report generated: ${report.invoiceCount} open invoices, ${report.overdueCount} overdue, total outstanding ${report.totalOutstanding}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: report }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Aging report error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to generate aging report: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Get Overdue Alerts ───────────────────────────────────────────────

export async function nodeGetOverdueAlerts(state: ArStateType) {
  const trace = await langfuse.span({
    name: "ar-overdue-alerts",
    input: { entityId: state.entityId },
  })

  try {
    const alerts = await getOverdueAlerts(state.entityId)

    await trace.update({
      output: {
        alertCount: alerts.length,
        escalationBreakdown: {
          "7d": alerts.filter((a) => a.escalationLevel === "7d").length,
          "30d": alerts.filter((a) => a.escalationLevel === "30d").length,
          "60d": alerts.filter((a) => a.escalationLevel === "60d").length,
          "90d+": alerts.filter((a) => a.escalationLevel === "90d+").length,
        },
      },
    })

    const hasCritical = alerts.some((a) => a.escalationLevel === "90d+")
    const confidence = hasCritical ? 0.7 : 0.9

    return {
      overdueAlerts: alerts,
      confidence,
      reasoning: `Found ${alerts.length} overdue invoices. ${hasCritical ? "CRITICAL: invoices past 90 days detected." : "No critical overdue invoices."}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: alerts }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Overdue alerts error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to generate overdue alerts: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Match Payment ────────────────────────────────────────────────────

export async function nodeMatchPayment(state: ArStateType) {
  const trace = await langfuse.span({
    name: "ar-match-payment",
    input: { entityId: state.entityId, paymentData: state.currentOperation?.input },
  })

  const paymentData = state.currentOperation?.input as PaymentData | undefined

  if (!paymentData?.paymentId || !paymentData?.customerId || !paymentData?.amount) {
    const error = "Missing required payment data: paymentId, customerId, amount"
    await trace.update({ output: { error } })

    return {
      errors: [error],
      confidence: 0.0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    }
  }

  if (paymentData.amount <= 0) {
    const error = "Payment amount must be greater than zero"
    await trace.update({ output: { error } })

    return {
      errors: [error],
      confidence: 0.0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    }
  }

  try {
    const result = await matchPayment(state.entityId, paymentData)

    const audit = createAuditEntry({
      agentId: "ar-agent",
      action: "payment_matched",
      details: {
        paymentId: result.paymentId,
        totalApplied: result.totalApplied,
        remainingAmount: result.remainingAmount,
        invoiceCount: result.matchedInvoices.length,
      },
      confidence: 0.9,
    })

    await trace.update({
      output: {
        paymentId: result.paymentId,
        totalApplied: result.totalApplied,
        remainingAmount: result.remainingAmount,
        matchedCount: result.matchedInvoices.length,
      },
    })

    const hasUnapplied = result.remainingAmount > 0
    const confidence = hasUnapplied ? 0.7 : 0.9

    return {
      result: {
        type: "payment_matched",
        ...result,
      },
      confidence,
      reasoning: hasUnapplied
        ? `Payment ${result.paymentId}: ${result.totalApplied} applied to ${result.matchedInvoices.length} invoices, ${result.remainingAmount} unapplied`
        : `Payment ${result.paymentId}: fully applied to ${result.matchedInvoices.length} invoices`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: result }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Payment matching error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to match payment: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: ArStateType) {
  langfuse.event({
    name: "ar-escalation",
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
      agentId: "ar-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  }
}
