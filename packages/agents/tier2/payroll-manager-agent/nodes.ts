import { langfuse } from "../../core/langfuse";
import { createAuditEntry } from "../../core/state";
import { getAgentGraph } from "../../core/orchestrator";
import type { AgentState } from "../../core/orchestrator";
import {
  validatePayrollData,
  checkTaxCalculations,
  type PayrollData,
} from "./tools";
import type { PayrollManagerStateType } from "./state";

export async function nodeParseInput(state: PayrollManagerStateType) {
  const trace = await langfuse.trace({
    name: "payroll-manager-parse-input",
    metadata: { entityId: state.entityId },
  });

  const _input = state.currentOperation?.input ?? {};
  await trace.update({
    output: { operationType: state.currentOperation?.type },
  });

  return {
    confidence: 0,
    reasoning: `Operation ${state.currentOperation?.type ?? "unknown"} received`,
  };
}

export async function nodeProcessPayroll(state: PayrollManagerStateType) {
  const trace = await langfuse.span({
    name: "payroll-manager-process",
    input: state.currentOperation?.input,
  });

  const payrollData = state.currentOperation?.input?.payroll as PayrollData;
  if (!payrollData) {
    return { errors: ["No payroll data provided"], confidence: 0 };
  }

  const validation = validatePayrollData(payrollData);

  if (!validation.valid) {
    await trace.update({ output: { valid: false, errors: validation.errors } });
    return {
      errors: validation.errors,
      confidence: 0,
      reasoning: `Payroll validation failed: ${validation.errors.join("; ")}`,
    };
  }

  const totalGross = payrollData.employees.reduce(
    (s: number, e: { grossPay: number }) => s + e.grossPay,
    0,
  );
  const totalDeductions = payrollData.employees.reduce(
    (s: number, e: { taxWithheld: number; benefits: number }) =>
      s + e.taxWithheld + e.benefits,
    0,
  );
  const totalNet = payrollData.employees.reduce(
    (s: number, e: { netPay: number }) => s + e.netPay,
    0,
  );

  const summary = {
    period: payrollData.period,
    employeeCount: payrollData.employees.length,
    grossPay: totalGross,
    deductions: totalDeductions,
    netPay: totalNet,
    status: "validated" as const,
  };

  await trace.update({ output: { summary } });

  return {
    payrollSummary: summary,
    confidence: 0.92,
    reasoning: `Payroll validated: ${summary.employeeCount} employees, gross ${totalGross}, net ${totalNet}`,
    auditTrail: [
      createAuditEntry({
        agentId: "payroll-manager-agent",
        action: "payroll_validated",
        details: summary,
        confidence: 0.92,
      }),
    ],
  };
}

export async function nodeValidatePayroll(state: PayrollManagerStateType) {
  const trace = await langfuse.span({ name: "payroll-manager-validate" });

  const payrollData = state.currentOperation?.input?.payroll as PayrollData;
  if (!payrollData) {
    return { errors: ["No payroll data to validate"], confidence: 0 };
  }

  const taxCheck = checkTaxCalculations(payrollData);

  await trace.update({
    output: { taxValid: taxCheck.valid, errors: taxCheck.errors },
  });

  if (!taxCheck.valid) {
    return {
      errors: taxCheck.errors,
      confidence: 0.3,
      reasoning: `Tax calculation errors: ${taxCheck.errors.join("; ")}`,
    };
  }

  return {
    confidence: 0.95,
    reasoning: "All tax calculations verified",
  };
}

export async function nodeCloseConfirmation(state: PayrollManagerStateType) {
  const trace = await langfuse.span({ name: "payroll-manager-close" });

  await trace.update({ output: { confirmed: true } });

  return {
    result: {
      type: "close_confirmation",
      domain: "payroll",
      confirmed: true,
      summary: state.payrollSummary ?? "No payroll processed this period",
    },
    confidence: state.payrollSummary ? 0.9 : 0.7,
    reasoning: "Payroll domain confirmed for close",
  };
}

// ─── Node: Dispatch to Payroll Worker (Phase 6) ─────────────────────────
// After validation, dispatches to Payroll Worker for PAYE, SSRC, payslips.

export async function nodeDispatchToWorker(state: PayrollManagerStateType) {
  const trace = await langfuse.span({ name: "payroll-manager-dispatch" });

  const payrollData = state.currentOperation?.input?.payroll;
  if (!payrollData) {
    return { errors: ["No payroll data to dispatch"], confidence: 0 };
  }

  try {
    const workerGraph = await getAgentGraph("payroll_worker");
    const workerState: AgentState = {
      entityId: state.entityId,
      entityName: state.entityName,
      currency: state.currency,
      currentOperation: {
        type: "process_payroll_batch",
        status: "processing",
        input: { payroll: payrollData },
        output: null,
        error: null,
      },
    };
    const workerResult = await workerGraph.invoke(workerState);

    langfuse.event({
      name: "payroll-manager-worker-dispatched",
      metadata: {
        confidence: (workerResult as any).confidence ?? 0,
        hasResult: !!(workerResult as any).result,
      },
    });

    await trace.update({
      output: {
        workerCalled: true,
        confidence: (workerResult as any).confidence ?? 0,
      },
    });

    return {
      result: {
        type: "payroll_dispatched",
        workerResult: (workerResult as any).result,
      },
      confidence: (workerResult as any).confidence ?? 0.85,
      reasoning: "Payroll Worker completed PAYE, SSRC, and payslip generation",
      auditTrail: [
        createAuditEntry({
          agentId: "payroll-manager-agent",
          action: "payroll_dispatched_to_worker",
          details: {
            workerCalled: true,
            confidence: (workerResult as any).confidence ?? 0,
          },
          confidence: (workerResult as any).confidence ?? 0.85,
        }),
      ],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    langfuse.event({
      name: "payroll-manager-worker-dispatch-failed",
      metadata: { error: msg },
    });

    await trace.update({ output: { workerCalled: false, error: msg } });

    return {
      errors: [`Payroll Worker dispatch failed: ${msg}`],
      confidence: 0,
      reasoning: "Payroll Worker unavailable",
    };
  }
}

export async function nodeEscalate(state: PayrollManagerStateType) {
  langfuse.event({
    name: "payroll-manager-escalation",
    metadata: {
      entityId: state.entityId,
      confidence: state.confidence,
      errors: state.errors,
      reasoning: state.reasoning,
      escalated: true,
    },
  });

  return {
    result: {
      type: "escalation",
      agentId: "payroll-manager-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  };
}
