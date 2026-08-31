import { db } from "@xenboox/db";
import { eq } from "drizzle-orm";
import { fiscalPeriods } from "@xenboox/db/schema/accounting";
import { langfuse } from "../../core/langfuse";
import { createAuditEntry } from "../../core/state";
import {
  generateProfitLoss,
  generateBalanceSheet,
  generateTrialBalance,
  generateCashFlow,
  generateBudgetVsActual,
  generateNarrativeLLM,
  generateNarrative,
  generateDonorReport,
  findProjectsDueForReport,
} from "./tools";
import type { ReportingStateType } from "./state";
import type { ProfitAndLoss, BalanceSheet } from "./state";

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

  try {
    // Fetch prior period data for comparison
    let priorPeriodData: {
      profitAndLoss?: ProfitAndLoss | null;
      balanceSheet?: BalanceSheet | null;
    } | undefined;

    if (state.currentRequest?.period) {
      try {
        const currentPeriodId = state.currentRequest.period;
        // Try to find the prior period (one month before)
        const periods = await db.query.fiscalPeriods.findMany({
          where: eq(fiscalPeriods.entityId, state.entityId),
          orderBy: (fiscalPeriods: any, { desc }: any) => [
            desc(fiscalPeriods.year),
            desc(fiscalPeriods.month),
          ],
        });

        const currentIdx = periods.findIndex((p) => p.id === currentPeriodId);
        if (currentIdx >= 0 && currentIdx < periods.length - 1) {
          const priorPeriod = periods[currentIdx + 1];
          const [priorPnl, priorBs] = await Promise.all([
            generateProfitLoss(state.entityId, priorPeriod.id),
            generateBalanceSheet(state.entityId),
          ]);
          priorPeriodData = {
            profitAndLoss: priorPnl,
            balanceSheet: priorBs,
          };
        }
      } catch {
        // Prior period data not available — continue without it
      }
    }

    // Use LLM-powered narrative generation with prior period data
    const narrative = await generateNarrativeLLM(
      state.entityName,
      state.entityId,
      reportData,
      state.currency,
      priorPeriodData,
    );

    const audit = createAuditEntry({
      agentId: "reporting-agent",
      action: "narrative_generated",
      details: {
        highlightsCount: narrative.highlights.length,
        concernsCount: narrative.concerns.length,
        summaryLength: narrative.summary.length,
        hasAction: !!narrative.action,
        poweredBy: "llm",
      },
      confidence: 0.88,
    });

    await span.update({
      output: {
        summaryLength: narrative.summary.length,
        highlights: narrative.highlights.length,
        concerns: narrative.concerns.length,
        hasAction: !!narrative.action,
      },
    });

    return {
      narrative,
      confidence: 0.88,
      reasoning: `LLM narrative generated: ${narrative.highlights.length} highlights, ${narrative.concerns.length} concerns, action: ${narrative.action ? "yes" : "no"}`,
      auditTrail: [audit],
    };
  } catch (error) {
    // Fallback to rule-based narrative if LLM fails
    const msg = error instanceof Error ? error.message : String(error);
    langfuse.event({
      name: "narrative-llm-fallback",
      metadata: { entityId: state.entityId, error: msg },
    });

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
        poweredBy: "fallback",
        error: msg,
      },
      confidence: 0.75,
    });

    await span.update({
      output: {
        summaryLength: narrative.summary.length,
        highlights: narrative.highlights.length,
        concerns: narrative.concerns.length,
        fallback: true,
      },
    });

    return {
      narrative,
      confidence: 0.75,
      reasoning: `Fallback narrative generated (LLM failed: ${msg}): ${narrative.highlights.length} highlights, ${narrative.concerns.length} concerns`,
      auditTrail: [audit],
    };
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

// ─── Node: Generate Donor Report ───────────────────────────────────────────

export async function nodeGenerateDonorReport(state: ReportingStateType) {
  const span = await langfuse.span({
    name: "reporting-generate-donor-report",
    input: { entityId: state.entityId },
  });

  try {
    // Find all active donor projects that have reports due
    const projectsDue = await findProjectsDueForReport(state.entityId);

    if (projectsDue.length === 0) {
      await span.update({
        output: { projectsFound: 0, message: "No donor reports due" },
      });
      return {
        confidence: 0.9,
        reasoning: "No donor projects have reports due at this time",
        auditTrail: [],
      };
    }

    const results: Array<{
      projectId: string;
      projectName: string;
      period: string;
      snapshotId: string;
    }> = [];

    for (const { project, period } of projectsDue) {
      try {
        const report = await generateDonorReport(
          state.entityId,
          project.id,
          period,
        );

        results.push({
          projectId: report.projectId,
          projectName: report.projectName,
          period: report.period,
          snapshotId: report.snapshotId,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        // Log but don't fail the whole batch — continue with other projects
        langfuse.event({
          name: "donor-report-generation-error",
          metadata: {
            entityId: state.entityId,
            projectId: project.id,
            error: msg,
          },
        });
      }
    }

    const audit = createAuditEntry({
      agentId: "reporting-agent",
      action: "donor_reports_generated",
      details: {
        projectsDue: projectsDue.length,
        reportsGenerated: results.length,
        periods: results.map((r) => r.period),
      },
      confidence: results.length > 0 ? 0.9 : 0.5,
    });

    await span.update({
      output: {
        projectsFound: projectsDue.length,
        reportsGenerated: results.length,
      },
    });

    return {
      confidence: results.length > 0 ? 0.9 : 0.5,
      reasoning: `Generated ${results.length} donor reports for ${projectsDue.length} projects due`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Donor report generation error: ${msg}`],
      confidence: 0,
      reasoning: `Failed to generate donor reports: ${msg}`,
    };
  }
}

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
