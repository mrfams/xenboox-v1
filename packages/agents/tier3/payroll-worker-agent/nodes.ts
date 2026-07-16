import { langfuse } from "../../core/langfuse"
import { createAuditEntry } from "../../core/state"
import { calculatePayslip, calculateBatchPayslips } from "./tools"
import type { PayrollWorkerStateType } from "./state"

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: PayrollWorkerStateType) {
  const trace = await langfuse.trace({
    name: "payroll-worker-parse-input",
    metadata: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input ?? {}
  const operationType = state.currentOperation?.type ?? "calculate_paye"

  await trace.update({ output: { operationType, inputKeys: Object.keys(input) } })

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
  }
}

// ─── Node: Calculate PAYE ──────────────────────────────────────────────────

export async function nodeCalculatePaye(state: PayrollWorkerStateType) {
  const trace = await langfuse.span({
    name: "payroll-worker-calculate-paye",
    input: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input as {
    employeeId?: string
    period?: string
  } | undefined

  try {
    if (input?.employeeId && input?.period) {
      const payslip = await calculatePayslip(state.entityId, input.employeeId, input.period)

      const audit = createAuditEntry({
        agentId: "payroll-worker-agent",
        action: "paye_calculated",
        details: { employeeId: input.employeeId, payeTax: payslip.payeTax, netPay: payslip.netPay },
        confidence: 0.95,
      })

      await trace.update({ output: { payeTax: payslip.payeTax, netPay: payslip.netPay } })

      return {
        payslips: [payslip],
        result: { type: "paye_calculated", payslip },
        confidence: 0.95,
        reasoning: `PAYE calculated for employee: tax ${payslip.payeTax}, net ${payslip.netPay}`,
        auditTrail: [audit],
        currentOperation: state.currentOperation
          ? { ...state.currentOperation, status: "completed" as const, output: payslip }
          : null,
      }
    }

    // Batch: calculate for all active employees
    const payslips = await calculateBatchPayslips(state.entityId, input?.period ?? "current")

    const totalTax = payslips.reduce((s, p) => s + p.payeTax, 0)
    const totalNet = payslips.reduce((s, p) => s + p.netPay, 0)

    const audit = createAuditEntry({
      agentId: "payroll-worker-agent",
      action: "batch_paye_calculated",
      details: { employeeCount: payslips.length, totalTax, totalNet },
      confidence: 0.9,
    })

    await trace.update({ output: { employeeCount: payslips.length, totalTax, totalNet } })

    return {
      payslips,
      result: { type: "batch_paye_calculated", payslips, totalTax, totalNet },
      confidence: 0.9,
      reasoning: `Batch PAYE calculated: ${payslips.length} employees, total tax ${totalTax}, total net ${totalNet}`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: { payslips } }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`PAYE calculation error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to calculate PAYE: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Calculate Social Security ────────────────────────────────────────

export async function nodeCalculateSocialSecurity(state: PayrollWorkerStateType) {
  const trace = await langfuse.span({
    name: "payroll-worker-calculate-ss",
    input: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input as {
    period?: string
  } | undefined

  try {
    const payslips = await calculateBatchPayslips(state.entityId, input?.period ?? "current")

    const totalEmployeeSS = payslips.reduce((s, p) => s + p.socialSecurityEmployee, 0)
    const totalEmployerSS = payslips.reduce((s, p) => s + p.socialSecurityEmployer, 0)

    const audit = createAuditEntry({
      agentId: "payroll-worker-agent",
      action: "social_security_calculated",
      details: { employeeCount: payslips.length, totalEmployeeSS, totalEmployerSS },
      confidence: 0.9,
    })

    await trace.update({ output: { employeeCount: payslips.length, totalEmployeeSS, totalEmployerSS } })

    return {
      payslips,
      result: { type: "social_security_calculated", payslips, totalEmployeeSS, totalEmployerSS },
      confidence: 0.9,
      reasoning: `Social security calculated: ${payslips.length} employees, employee contribution ${totalEmployeeSS}, employer contribution ${totalEmployerSS}`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: { payslips } }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Social security calculation error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to calculate social security: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Generate Payslip ────────────────────────────────────────────────

export async function nodeGeneratePayslip(state: PayrollWorkerStateType) {
  const trace = await langfuse.span({
    name: "payroll-worker-generate-payslip",
    input: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input as {
    employeeId?: string
    period?: string
  } | undefined

  if (!input?.employeeId || !input?.period) {
    const error = "Missing required fields: employeeId, period"
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
    const payslip = await calculatePayslip(state.entityId, input.employeeId, input.period)

    const audit = createAuditEntry({
      agentId: "payroll-worker-agent",
      action: "payslip_generated",
      details: { employeeId: input.employeeId, period: input.period, netPay: payslip.netPay },
      confidence: 0.95,
    })

    await trace.update({ output: { employeeId: input.employeeId, netPay: payslip.netPay } })

    return {
      payslips: [payslip],
      result: { type: "payslip_generated", payslip },
      confidence: 0.95,
      reasoning: `Payslip generated for ${payslip.employeeName}: net pay ${payslip.netPay}`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: payslip }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Payslip generation error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to generate payslip: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Process Payroll Batch ────────────────────────────────────────────

export async function nodeProcessPayrollBatch(state: PayrollWorkerStateType) {
  const trace = await langfuse.span({
    name: "payroll-worker-process-batch",
    input: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input as {
    period?: string
  } | undefined

  try {
    const period = input?.period ?? "current"
    const payslips = await calculateBatchPayslips(state.entityId, period)

    const totalGross = payslips.reduce((s, p) => s + p.grossPay, 0)
    const totalTax = payslips.reduce((s, p) => s + p.payeTax, 0)
    const totalSS = payslips.reduce((s, p) => s + p.socialSecurityEmployee, 0)
    const totalNet = payslips.reduce((s, p) => s + p.netPay, 0)

    const audit = createAuditEntry({
      agentId: "payroll-worker-agent",
      action: "payroll_batch_processed",
      details: { period, employeeCount: payslips.length, totalGross, totalTax, totalSS, totalNet },
      confidence: 0.9,
    })

    await trace.update({ output: { period, employeeCount: payslips.length, totalGross, totalTax, totalSS, totalNet } })

    return {
      payslips,
      result: { type: "payroll_batch_processed", period, payslips, totalGross, totalTax, totalSS, totalNet },
      confidence: 0.9,
      reasoning: `Payroll batch processed for ${period}: ${payslips.length} employees, gross ${totalGross}, net ${totalNet}`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: { payslips } }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Payroll batch error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to process payroll batch: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: PayrollWorkerStateType) {
  langfuse.event({
    name: "payroll-worker-escalation",
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
      agentId: "payroll-worker-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  }
}
