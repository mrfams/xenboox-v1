import { langfuse } from "../../core/langfuse";
import { createAuditEntry } from "../../core/state";
import {
  generateProfitLoss,
  generateBalanceSheet,
  generateTrialBalance,
  generateCashFlow,
  generateBudgetVsActual,
  generateNarrative,
} from "./tools";
import type { ReportingStateType } from "./state";

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: ReportingStateType) {
  const trace = await langfuse.trace({
    name: "reporting-parse-input",
    metadata: { entityId: state.entityId },
  });

  const request = state.currentRequest;

  if (!request) {
    return {
      confidence: 0,
      reasoning: "No report request provided",
      errors: ["Missing currentRequest — cannot determine report type"],
    };
  }

  await trace.update({
    output: {
      reportType: request.type,
      period: request.period,
      format: request.format,
    },
  });

  return {
    confidence: 0.9,
    reasoning: `Report request received: ${request.type} for period ${request.period}`,
  };
}

// ─── Node: Generate Profit & Loss ──────────────────────────────────────────

export async function nodeGenerateProfitLoss(state: ReportingStateType) {
  const span = await langfuse.span({
    name: "reporting-generate-profit-loss",
    input: { entityId: state.entityId, period: state.currentRequest?.period },
  });

  const periodId = state.currentRequest?.period ?? "";
  if (!periodId) {
    return {
      errors: ["Missing period for profit & loss report"],
      confidence: 0,
    };
  }

  try {
    const pnl = await generateProfitLoss(state.entityId, periodId);

    const audit = createAuditEntry({
      agentId: "reporting-agent",
      action: "profit_loss_generated",
      details: {
        period: periodId,
        revenue: pnl.revenue,
        expenses: pnl.expenses,
        netProfit: pnl.netProfit,
        revenueAccountCount: pnl.revenueByAccount.length,
        expenseAccountCount: pnl.expensesByAccount.length,
      },
      confidence: 0.92,
    });

    await span.update({
      output: {
        revenue: pnl.revenue,
        expenses: pnl.expenses,
        netProfit: pnl.netProfit,
      },
    });

    return {
      reportData: {
        profitAndLoss: pnl,
        balanceSheet: null,
        trialBalance: null,
        cashFlow: null,
        budgetVsActual: null,
      },
      confidence: 0.92,
      reasoning: `P&L generated: revenue ${state.currency} ${pnl.revenue}, expenses ${state.currency} ${pnl.expenses}, net profit ${state.currency} ${pnl.netProfit}`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`P&L generation error: ${msg}`],
      confidence: 0,
    };
  }
}

// ─── Node: Generate Balance Sheet ──────────────────────────────────────────

export async function nodeGenerateBalanceSheet(state: ReportingStateType) {
  const span = await langfuse.span({
    name: "reporting-generate-balance-sheet",
    input: { entityId: state.entityId },
  });

  try {
    const bs = await generateBalanceSheet(state.entityId);

    const audit = createAuditEntry({
      agentId: "reporting-agent",
      action: "balance_sheet_generated",
      details: {
        assets: bs.assets,
        liabilities: bs.liabilities,
        equity: bs.equity,
        assetsAccountCount: bs.assetsByAccount.length,
        liabilitiesAccountCount: bs.liabilitiesByAccount.length,
        equityAccountCount: bs.equityByAccount.length,
      },
      confidence: 0.92,
    });

    await span.update({
      output: {
        assets: bs.assets,
        liabilities: bs.liabilities,
        equity: bs.equity,
      },
    });

    return {
      reportData: {
        profitAndLoss: null,
        balanceSheet: bs,
        trialBalance: null,
        cashFlow: null,
        budgetVsActual: null,
      },
      confidence: 0.92,
      reasoning: `Balance sheet generated: assets ${state.currency} ${bs.assets}, liabilities ${state.currency} ${bs.liabilities}, equity ${state.currency} ${bs.equity}`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Balance sheet generation error: ${msg}`],
      confidence: 0,
    };
  }
}

// ─── Node: Generate Trial Balance ──────────────────────────────────────────

export async function nodeGenerateTrialBalance(state: ReportingStateType) {
  const span = await langfuse.span({
    name: "reporting-generate-trial-balance",
    input: { entityId: state.entityId, period: state.currentRequest?.period },
  });

  const periodId = state.currentRequest?.period ?? "";
  if (!periodId) {
    return {
      errors: ["Missing period for trial balance report"],
      confidence: 0,
    };
  }

  try {
    const tb = await generateTrialBalance(state.entityId, periodId);

    const audit = createAuditEntry({
      agentId: "reporting-agent",
      action: "trial_balance_generated",
      details: {
        period: periodId,
        balanced: tb.balanced,
        totalDebits: tb.totalDebits,
        totalCredits: tb.totalCredits,
        accountCount: tb.accounts.length,
      },
      confidence: tb.balanced ? 0.95 : 0.0,
    });

    await span.update({
      output: {
        balanced: tb.balanced,
        totalDebits: tb.totalDebits,
        totalCredits: tb.totalCredits,
      },
    });

    if (!tb.balanced) {
      return {
        reportData: {
          profitAndLoss: null,
          balanceSheet: null,
          trialBalance: tb,
          cashFlow: null,
          budgetVsActual: null,
        },
        confidence: 0.0,
        reasoning: `CRITICAL: Trial balance unbalanced — debits ${state.currency} ${tb.totalDebits} ≠ credits ${state.currency} ${tb.totalCredits}`,
        errors: [
          `Trial balance unbalanced: debits ${tb.totalDebits} != credits ${tb.totalCredits}`,
        ],
        auditTrail: [audit],
      };
    }

    return {
      reportData: {
        profitAndLoss: null,
        balanceSheet: null,
        trialBalance: tb,
        cashFlow: null,
        budgetVsActual: null,
      },
      confidence: 0.95,
      reasoning: `Trial balance generated with ${tb.accounts.length} accounts — balanced`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Trial balance generation error: ${msg}`],
      confidence: 0,
    };
  }
}

// ─── Node: Generate Cash Flow ──────────────────────────────────────────────

export async function nodeGenerateCashFlow(state: ReportingStateType) {
  const span = await langfuse.span({
    name: "reporting-generate-cash-flow",
    input: { entityId: state.entityId, period: state.currentRequest?.period },
  });

  const periodId = state.currentRequest?.period ?? "";
  if (!periodId) {
    return { errors: ["Missing period for cash flow report"], confidence: 0 };
  }

  try {
    const cashFlow = await generateCashFlow(state.entityId, periodId);

    const audit = createAuditEntry({
      agentId: "reporting-agent",
      action: "cash_flow_generated",
      details: {
        period: cashFlow.period,
        openingCash: cashFlow.openingCash,
        closingCash: cashFlow.closingCash,
        netCashChange: cashFlow.netCashChange,
        operatingLines: cashFlow.operating.lines.length,
      },
      confidence: 0.9,
    });

    await span.update({
      output: {
        netCashChange: cashFlow.netCashChange,
        closingCash: cashFlow.closingCash,
      },
    });

    return {
      reportData: {
        profitAndLoss: null,
        balanceSheet: null,
        trialBalance: null,
        cashFlow,
        budgetVsActual: null,
      },
      confidence: 0.9,
      reasoning: `Cash flow generated: net change ${state.currency} ${cashFlow.netCashChange} (${cashFlow.operating.lines.length} operating lines)`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Cash flow generation error: ${msg}`],
      confidence: 0,
    };
  }
}

// ─── Node: Generate Budget vs Actual ───────────────────────────────────────

export async function nodeGenerateBudgetVsActual(state: ReportingStateType) {
  const span = await langfuse.span({
    name: "reporting-generate-budget-vs-actual",
    input: { entityId: state.entityId, period: state.currentRequest?.period },
  });

  const periodId = state.currentRequest?.period ?? "";
  if (!periodId) {
    return {
      errors: ["Missing period for budget vs actual report"],
      confidence: 0,
    };
  }

  try {
    const report = await generateBudgetVsActual(state.entityId, periodId);

    const audit = createAuditEntry({
      agentId: "reporting-agent",
      action: "budget_vs_actual_generated",
      details: {
        period: report.period,
        budgeted: report.totalBudgeted,
        actual: report.totalActual,
        variance: report.totalVariance,
        exceededLines: report.lines.filter((l) => l.status === "exceeded")
          .length,
      },
      confidence: 0.9,
    });

    await span.update({
      output: {
        totalVariance: report.totalVariance,
        exceededLines: report.lines.filter((l) => l.status === "exceeded")
          .length,
      },
    });

    return {
      reportData: {
        profitAndLoss: null,
        balanceSheet: null,
        trialBalance: null,
        cashFlow: null,
        budgetVsActual: report,
      },
      confidence: 0.9,
      reasoning: `Budget vs actual generated: variance ${state.currency} ${report.totalVariance}`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Budget vs actual generation error: ${msg}`],
      confidence: 0,
    };
  }
}

// ─── Node: Generate Narrative ──────────────────────────────────────────────

export async function nodeGenerateNarrative(state: ReportingStateType) {
  const span = await langfuse.span({
    name: "reporting-generate-narrative",
    input: { entityId: state.entityId },
  });

  const reportData = state.reportData;
  if (!reportData) {
    return {
      errors: ["No report data available to generate narrative"],
      confidence: 0,
    };
  }

  const narrative = generateNarrative(
    state.entityName,
    reportData,
    state.currency,
  );

  const audit = createAuditEntry({
    agentId: "reporting-agent",
    action: "narrative_generated",
    details: {
      highlightsCount: narrative.highlights.length,
      concernsCount: narrative.concerns.length,
      summaryLength: narrative.summary.length,
    },
    confidence: 0.88,
  });

  await span.update({
    output: {
      summaryLength: narrative.summary.length,
      highlights: narrative.highlights.length,
      concerns: narrative.concerns.length,
    },
  });

  return {
    narrative,
    confidence: 0.88,
    reasoning: `Narrative generated: ${narrative.highlights.length} highlights, ${narrative.concerns.length} concerns`,
    auditTrail: [audit],
  };
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: ReportingStateType) {
  langfuse.event({
    name: "reporting-escalation",
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
      agentId: "reporting-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  };
}
