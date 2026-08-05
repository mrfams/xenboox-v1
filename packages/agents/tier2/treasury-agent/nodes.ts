import { langfuse } from "../../core/langfuse";
import { createAuditEntry } from "../../core/state";
import { getAgentGraph } from "../../core/orchestrator";
import type { AgentState } from "../../core/orchestrator";
import {
  getCashPosition,
  checkReconciliationStatus,
  generateDailyReport,
} from "./tools";
import type { TreasuryStateType } from "./state";

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: TreasuryStateType) {
  const trace = await langfuse.trace({
    name: "treasury-parse-input",
    metadata: { entityId: state.entityId },
  });

  const input = state.currentOperation?.input ?? {};
  const operationType = state.currentOperation?.type ?? "cash_position";

  await trace.update({
    output: { operationType, inputKeys: Object.keys(input) },
  });

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
    humanResponse: null,
  };
}

// ─── Node: Get Cash Position ───────────────────────────────────────────────

export async function nodeGetCashPosition(state: TreasuryStateType) {
  const trace = await langfuse.span({
    name: "treasury-get-cash-position",
    input: { entityId: state.entityId },
  });

  try {
    const position = await getCashPosition(state.entityId);

    const audit = createAuditEntry({
      agentId: "treasury-agent",
      action: "cash_position_retrieved",
      details: {
        bankAccountCount: position.bankAccounts.length,
        mmWalletCount: position.mmWallets.length,
        physicalCash: position.physicalCash,
        totalBaseCurrency: position.totalBaseCurrency,
      },
      confidence: 0.95,
    });

    await trace.update({
      output: {
        totalBaseCurrency: position.totalBaseCurrency,
        bankAccounts: position.bankAccounts.length,
        mmWallets: position.mmWallets.length,
      },
    });

    return {
      cashPosition: position,
      confidence: 0.95,
      reasoning: `Cash position retrieved: ${position.totalBaseCurrency.toFixed(2)} across ${position.bankAccounts.length} bank accounts, ${position.mmWallets.length} MM wallets`,
      humanResponse: `Cash position: ${state.currency} ${position.totalBaseCurrency.toFixed(2)} across ${position.bankAccounts.length} bank account(s) and ${position.mmWallets.length} mobile money wallet(s). Physical cash: ${state.currency} ${position.physicalCash.toFixed(2)}.`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Cash position retrieval failed: ${msg}`],
      confidence: 0.0,
      reasoning: `Unable to retrieve cash position: ${msg}`,
      humanResponse: `Unable to retrieve cash position: ${msg}`,
    };
  }
}

// ─── Node: Run Reconciliation ──────────────────────────────────────────────
// Phase 6: Calls Reconciliation Agent for bank matching, then checks status.

export async function nodeRunReconciliation(state: TreasuryStateType) {
  const trace = await langfuse.span({
    name: "treasury-run-reconciliation",
    input: { entityId: state.entityId },
  });

  try {
    // Phase 6: Call Reconciliation Agent for bank matching
    let reconciliationResult: any = null;
    try {
      const reconGraph = await getAgentGraph("reconciliation");
      const reconState: AgentState = {
        entityId: state.entityId,
        entityName: state.entityName,
        currency: state.currency,
        currentOperation: {
          type: "bank_reconciliation",
          status: "processing",
          input: {
            period: (state.currentOperation?.input as Record<string, unknown>)
              ?.period,
          },
          output: null,
          error: null,
        },
      };
      reconciliationResult = await reconGraph.invoke(reconState);
      langfuse.event({
        name: "treasury-reconciliation-agent-dispatched",
        metadata: {
          confidence: (reconciliationResult as any).confidence ?? 0,
          hasResult: !!(reconciliationResult as any).result,
        },
      });
    } catch (err) {
      langfuse.event({
        name: "treasury-reconciliation-dispatch-failed",
        metadata: { error: err instanceof Error ? err.message : String(err) },
      });
    }

    // Check reconciliation status (deterministic DB check)
    const status = await checkReconciliationStatus(state.entityId);
    const allComplete =
      status.bankComplete && status.mmComplete && status.cashComplete;

    const confidence = allComplete
      ? 0.92
      : status.unresolvedItems > 5
        ? 0.5
        : 0.75;

    const audit = createAuditEntry({
      agentId: "treasury-agent",
      action: "reconciliation_checked",
      details: {
        bankComplete: status.bankComplete,
        mmComplete: status.mmComplete,
        cashComplete: status.cashComplete,
        unresolvedItems: status.unresolvedItems,
        reconciliationAgentCalled: !!reconciliationResult,
      },
      confidence,
    });

    await trace.update({
      output: {
        allComplete,
        unresolvedItems: status.unresolvedItems,
        bankComplete: status.bankComplete,
        mmComplete: status.mmComplete,
        reconciliationAgentCalled: !!reconciliationResult,
      },
    });

    const errors: string[] = [];
    if (!allComplete) {
      errors.push(
        `${status.unresolvedItems} unresolved reconciliation item(s) across accounts`,
      );
    }

    const humanResponse = allComplete
      ? `Reconciliation complete: all bank accounts, mobile money wallets, and petty cash fully reconciled. ${status.unresolvedItems} unresolved items.`
      : `Reconciliation incomplete: ${status.unresolvedItems} unresolved item(s) across accounts. Bank: ${status.bankComplete ? "complete" : "incomplete"}. Mobile money: ${status.mmComplete ? "complete" : "incomplete"}.`;

    return {
      reconciliationStatus: status,
      confidence,
      reasoning: allComplete
        ? "All accounts fully reconciled"
        : `Reconciliation incomplete: ${status.unresolvedItems} unresolved items`,
      humanResponse,
      auditTrail: [audit],
      errors,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Reconciliation check failed: ${msg}`],
      confidence: 0.0,
      reasoning: `Unable to run reconciliation: ${msg}`,
      humanResponse: `Reconciliation check failed: ${msg}`,
    };
  }
}

// ─── Node: Generate Daily Report ───────────────────────────────────────────

export async function nodeGenerateDailyReport(state: TreasuryStateType) {
  const trace = await langfuse.span({
    name: "treasury-daily-report",
    input: { entityId: state.entityId },
  });

  try {
    const report = await generateDailyReport(state.entityId, state.currency);

    const hasAlerts = report.alerts.length > 0;
    const confidence = hasAlerts ? 0.75 : 0.9;

    const audit = createAuditEntry({
      agentId: "treasury-agent",
      action: "daily_report_generated",
      details: {
        date: report.date,
        totalCash: report.totalCash,
        alertCount: report.alerts.length,
        recommendationCount: report.recommendations.length,
      },
      confidence,
    });

    await trace.update({
      output: {
        date: report.date,
        totalCash: report.totalCash,
        alertCount: report.alerts.length,
      },
    });

    const errors: string[] = hasAlerts ? report.alerts : [];

    return {
      dailyReport: report,
      confidence,
      reasoning: hasAlerts
        ? `Daily report generated with ${report.alerts.length} alert(s)`
        : "Daily report generated — no alerts",
      humanResponse: hasAlerts
        ? `Daily report for ${report.date}: ${state.currency} ${report.totalCash.toFixed(2)} total cash. ${report.alerts.length} alert(s): ${report.alerts.join("; ")}`
        : `Daily report for ${report.date}: ${state.currency} ${report.totalCash.toFixed(2)} total cash. No alerts.`,
      auditTrail: [audit],
      errors,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Daily report generation failed: ${msg}`],
      confidence: 0.0,
      reasoning: `Unable to generate daily report: ${msg}`,
      humanResponse: `Unable to generate daily report: ${msg}`,
    };
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: TreasuryStateType) {
  langfuse.event({
    name: "treasury-escalation",
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
      agentId: "treasury-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
    humanResponse: `Escalation from Treasury Agent: ${state.reasoning}. Errors: ${state.errors.join("; ")}`,
  };
}
