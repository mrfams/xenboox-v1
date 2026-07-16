import { langfuse } from "../../core/langfuse"
import { createAuditEntry } from "../../core/state"
import {
  processInvoice as processInvoiceTool,
  generateAgingReport as generateAgingReportTool,
  getPaymentSchedule as getPaymentScheduleTool,
} from "./tools"
import type { ApStateType } from "./state"

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: ApStateType) {
  const trace = await langfuse.trace({
    name: "ap-parse-input",
    metadata: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input ?? {}
  const operationType = state.currentOperation?.type ?? "process_invoice"

  await trace.update({ output: { operationType, inputKeys: Object.keys(input) } })

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
  }
}

// ─── Node: Process Invoice ─────────────────────────────────────────────────

export async function nodeProcessInvoice(state: ApStateType) {
  const trace = await langfuse.span({
    name: "ap-process-invoice",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  })

  const input = state.currentOperation?.input as Record<string, unknown> | undefined
  if (!input) {
    const error = "No invoice input provided"
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

  const invoiceInput = {
    supplierId: input.supplierId as string,
    invoiceNumber: input.invoiceNumber as string,
    invoiceDate: input.invoiceDate as string,
    dueDate: input.dueDate as string,
    totalAmount: input.totalAmount as number,
    currency: (input.currency as string) ?? state.currency,
    notes: input.notes as string | undefined,
  }

  const result = await processInvoiceTool(state.entityId, invoiceInput)

  await trace.update({
    output: { success: result.success, duplicateFound: result.duplicateFound, errors: result.errors },
  })

  if (!result.success) {
    return {
      errors: result.errors,
      confidence: result.duplicateFound ? 0.1 : 0.3,
      reasoning: result.duplicateFound
        ? `Duplicate invoice detected: ${result.errors[0]}`
        : `Invoice validation failed: ${result.errors.join("; ")}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: result.errors.join("; ") }
        : null,
    }
  }

  const audit = createAuditEntry({
    agentId: "ap-agent",
    action: "invoice_processed",
    details: {
      invoiceId: result.invoiceId,
      invoiceNumber: invoiceInput.invoiceNumber,
      supplierId: invoiceInput.supplierId,
      totalAmount: invoiceInput.totalAmount,
    },
    confidence: 0.9,
  })

  return {
    currentInvoice: {
      id: result.invoiceId!,
      supplierId: invoiceInput.supplierId,
      invoiceNumber: invoiceInput.invoiceNumber,
      amount: invoiceInput.totalAmount,
      currency: invoiceInput.currency,
      dueDate: invoiceInput.dueDate,
      status: "pending",
    },
    confidence: 0.9,
    reasoning: `Invoice ${invoiceInput.invoiceNumber} processed successfully (id: ${result.invoiceId})`,
    auditTrail: [audit],
    currentOperation: state.currentOperation
      ? { ...state.currentOperation, status: "completed" as const, output: result }
      : null,
  }
}

// ─── Node: Generate Aging Report ──────────────────────────────────────────

export async function nodeGenerateAgingReport(state: ApStateType) {
  const trace = await langfuse.span({
    name: "ap-aging-report",
    input: { entityId: state.entityId },
  })

  try {
    const report = await generateAgingReportTool(state.entityId)

    await trace.update({
      output: {
        totalOutstanding: report.totalOutstanding,
        invoiceCount: report.invoiceCount,
        overdueCount: report.overdueCount,
      },
    })

    const audit = createAuditEntry({
      agentId: "ap-agent",
      action: "aging_report_generated",
      details: {
        totalOutstanding: report.totalOutstanding,
        invoiceCount: report.invoiceCount,
        overdueCount: report.overdueCount,
      },
      confidence: 0.95,
    })

    return {
      agingReport: report,
      confidence: 0.95,
      reasoning: `Aging report generated: ${report.invoiceCount} outstanding invoices, ${report.overdueCount} overdue, total ${report.totalOutstanding}`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: report }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
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

// ─── Node: Get Payment Schedule ───────────────────────────────────────────

export async function nodeGetPaymentSchedule(state: ApStateType) {
  const trace = await langfuse.span({
    name: "ap-payment-schedule",
    input: { entityId: state.entityId },
  })

  try {
    const schedule = await getPaymentScheduleTool(state.entityId)

    await trace.update({
      output: { invoiceCount: schedule.length },
    })

    const audit = createAuditEntry({
      agentId: "ap-agent",
      action: "payment_schedule_retrieved",
      details: { invoiceCount: schedule.length },
      confidence: 0.95,
    })

    return {
      paymentSchedule: schedule,
      confidence: 0.95,
      reasoning: `Payment schedule retrieved: ${schedule.length} invoices due in next 30 days`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: schedule }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      errors: [`Payment schedule error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to retrieve payment schedule: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: ApStateType) {
  langfuse.event({
    name: "ap-escalation",
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
      agentId: "ap-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  }
}
