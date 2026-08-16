import { langfuse } from "../../core/langfuse";
import { createAuditEntry } from "../../core/state";
import { db } from "@xenboox/db";
import { eq, desc } from "drizzle-orm";
import { expenseClaims } from "@xenboox/db/schema";
import {
  extractReceipt as extractReceiptTool,
  checkPolicyCompliance as checkPolicyTool,
  routeForApproval as routeApprovalTool,
  classifyReceiptCategory,
} from "./tools";
import type { ExpenseStateType } from "./state";

export async function nodeParseInput(state: ExpenseStateType) {
  const trace = await langfuse.trace({
    name: "expense-parse-input",
    metadata: { entityId: state.entityId },
  });
  const input = state.currentOperation?.input ?? {};
  const operationType = state.currentOperation?.type ?? "extract_receipt";
  await trace.update({
    output: { operationType, inputKeys: Object.keys(input) },
  });
  return { confidence: 0, reasoning: `Operation ${operationType} received` };
}

export async function nodeExtractReceipt(state: ExpenseStateType) {
  const trace = await langfuse.span({
    name: "expense-extract-receipt",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  });
  const input = state.currentOperation?.input as
    Record<string, unknown> | undefined;
  if (!input?.documentId) {
    await trace.update({
      output: { success: false, error: "No documentId provided" },
    });
    return {
      errors: ["documentId is required"],
      confidence: 0,
      reasoning: "Missing documentId",
    };
  }

  try {
    const result = await extractReceiptTool(
      state.entityId,
      input.documentId as string,
    );
    const category = await classifyReceiptCategory(
      state.entityId,
      input.documentId as string,
      result,
    );
    await trace.update({
      output: {
        documentId: input.documentId,
        ocrConfidence: result.ocrConfidence,
        category,
      },
    });

    const useHaiku = result.ocrConfidence >= 0.7;
    const confidence = useHaiku
      ? result.ocrConfidence
      : Math.min(result.ocrConfidence, 0.65);

    const audit = createAuditEntry({
      agentId: "expense-agent",
      action: "receipt_extracted",
      details: {
        documentId: input.documentId,
        ocrConfidence: result.ocrConfidence,
        category,
      },
      confidence,
    });

    return {
      extractedReceipt: result,
      confidence,
      reasoning: useHaiku
        ? `Receipt ${input.documentId} extracted with confidence ${result.ocrConfidence}`
        : `Receipt ${input.documentId} extracted with low confidence ${result.ocrConfidence} — sonnet review needed`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await trace.update({ output: { success: false, error: msg } });
    return {
      errors: [`Extraction error: ${msg}`],
      confidence: 0,
      reasoning: msg,
    };
  }
}

export async function nodeCheckPolicy(state: ExpenseStateType) {
  const trace = await langfuse.span({
    name: "expense-check-policy",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  });
  const input = state.currentOperation?.input as
    Record<string, unknown> | undefined;
  if (!input?.claimId) {
    await trace.update({
      output: { success: false, error: "No claimId provided" },
    });
    return {
      errors: ["claimId is required"],
      confidence: 0,
      reasoning: "Missing claimId",
    };
  }

  try {
    const result = await checkPolicyTool(state.entityId, {
      claimId: input.claimId as string,
    });
    await trace.update({
      output: {
        compliant: result.compliant,
        violations: result.policyViolations.length,
      },
    });

    const hasViolation = result.policyViolations.some(
      (v) => v.severity === "violation",
    );
    const confidence = hasViolation ? 0.85 : 0.95;

    const audit = createAuditEntry({
      agentId: "expense-agent",
      action: hasViolation
        ? "policy_violation_detected"
        : "policy_check_passed",
      details: {
        claimId: input.claimId,
        compliant: result.compliant,
        violations: result.policyViolations,
      },
      confidence,
    });

    return {
      policyCheckResult: result,
      confidence,
      reasoning: hasViolation
        ? `Claim ${input.claimId} has ${result.policyViolations.length} policy violations`
        : `Claim ${input.claimId} passed policy check`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await trace.update({ output: { success: false, error: msg } });
    return {
      errors: [`Policy check error: ${msg}`],
      confidence: 0,
      reasoning: msg,
    };
  }
}

export async function nodeRouteApproval(state: ExpenseStateType) {
  const trace = await langfuse.span({
    name: "expense-route-approval",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  });
  const input = state.currentOperation?.input as
    Record<string, unknown> | undefined;
  if (!input?.claimId || !input?.managerId) {
    await trace.update({
      output: { success: false, error: "claimId and managerId required" },
    });
    return {
      errors: ["claimId and managerId are required"],
      confidence: 0,
      reasoning: "Missing required params",
    };
  }

  try {
    const result = await routeApprovalTool(state.entityId, {
      claimId: input.claimId as string,
      managerId: input.managerId as string,
      managerName: input.managerName as string | undefined,
    });
    await trace.update({
      output: { routedTo: result.routedTo, status: result.status },
    });

    const audit = createAuditEntry({
      agentId: "expense-agent",
      action: "claim_routed_for_approval",
      details: {
        claimId: input.claimId,
        routedTo: result.routedTo,
        escalationLevel: result.escalationLevel,
      },
      confidence: 0.9,
    });

    return {
      approvalRouteResult: result,
      confidence: 0.9,
      reasoning: `Claim ${input.claimId} routed to ${result.routedToName} for approval`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await trace.update({ output: { success: false, error: msg } });
    return { errors: [`Routing error: ${msg}`], confidence: 0, reasoning: msg };
  }
}

export async function nodeExpenseReport(state: ExpenseStateType) {
  const trace = await langfuse.span({
    name: "expense-report",
    input: { entityId: state.entityId },
  });

  try {
    const claims = await db.query.expenseClaims.findMany({
      where: eq(expenseClaims.entityId, state.entityId),
      orderBy: [desc(expenseClaims.createdAt)],
      limit: 500,
    });

    const byStatus: Record<string, number> = {};
    let totalAmount = 0;
    for (const claim of claims) {
      byStatus[claim.status] = (byStatus[claim.status] ?? 0) + 1;
      totalAmount += Number(claim.totalAmount);
    }

    const pendingApproval = byStatus["submitted"] ?? 0;
    const report = {
      claimCount: claims.length,
      byStatus,
      totalAmount: Math.round(totalAmount * 100) / 100,
      pendingApproval,
    };

    await trace.update({ output: report });

    const audit = createAuditEntry({
      agentId: "expense-agent",
      action: "expense_report_generated",
      details: {
        claimCount: claims.length,
        pendingApproval,
      },
      confidence: 0.95,
    });

    return {
      expenseReportResult: report,
      result: { type: "expense_report", ...report },
      confidence: 0.95,
      reasoning: `Expense report: ${claims.length} claims totaling ${totalAmount} minor units, ${pendingApproval} pending approval`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await trace.update({ output: { success: false, error: msg } });
    return {
      errors: [`Expense report error: ${msg}`],
      confidence: 0,
      reasoning: msg,
    };
  }
}

export async function nodeEscalate(state: ExpenseStateType) {
  langfuse.event({
    name: "expense-escalation",
    metadata: {
      entityId: state.entityId,
      confidence: state.confidence,
      errors: state.errors,
      reasoning: state.reasoning,
    },
  });
  return {
    result: {
      type: "escalation",
      agentId: "expense-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  };
}
