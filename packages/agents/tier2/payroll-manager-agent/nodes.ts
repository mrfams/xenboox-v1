import { langfuse } from "../../core/langfuse";
import { createAuditEntry } from "../../core/state";
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
