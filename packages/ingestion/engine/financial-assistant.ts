/**
 * AI Financial Assistant
 *
 * Provides intelligent answers to the 6 core financial questions:
 *   1. "What happened?" — Financial event summary
 *   2. "Why did profit change?" — Variance analysis with plain-English explanations
 *   3. "Where is cash going?" — Cash flow analysis
 *   4. "What should we do?" — Actionable recommendations
 *   5. "What risks exist?" — Risk assessment
 *   6. "What needs attention?" — Priority alerts
 *
 * This service queries the General Ledger, Monitoring Engine, and Period Manager
 * to answer these questions autonomously without requiring LLM calls.
 * Answers are data-driven with plain-English summaries.
 */

import { db } from "@xenboox/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  journalEntries,
  journalEntryLines,
  trialBalanceSnapshots,
  chartOfAccounts,
  fiscalPeriods,
} from "@xenboox/db/schema/accounting";
import { getTrialBalance, getTopMovingAccounts } from "./general-ledger";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FinancialAssistantResponse {
  question: FinancialQuestion;
  answer: string;
  confidence: number; // 0-1, how confident the system is in this answer
  dataPoints: string[];
  recommendations?: string[];
  risks?: string[];
  timestamp: string;
}

export type FinancialQuestion =
  | "what_happened"
  | "why_profit_changed"
  | "where_cash_going"
  | "what_should_we_do"
  | "what_risks_exist"
  | "what_needs_attention";

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Ask a financial question about the entity's financial state.
 * Returns a data-driven answer with supporting evidence.
 */
export async function askFinancialQuestion(
  entityId: string,
  question: FinancialQuestion,
  options?: {
    periodId?: string;
    previousPeriodId?: string;
  },
): Promise<FinancialAssistantResponse> {
  const timestamp = new Date().toISOString();

  switch (question) {
    case "what_happened":
      return answerWhatHappened(entityId, options);
    case "why_profit_changed":
      return answerWhyProfitChanged(entityId, options);
    case "where_cash_going":
      return answerWhereCashGoing(entityId, options);
    case "what_should_we_do":
      return answerWhatShouldWeDo(entityId, options);
    case "what_risks_exist":
      return answerWhatRisksExist(entityId, options);
    case "what_needs_attention":
      return answerWhatNeedsAttention(entityId, options);
    default:
      return {
        question,
        answer:
          "I don't understand that question. Please ask one of: What happened? Why did profit change? Where is cash going? What should we do? What risks exist? What needs attention?",
        confidence: 0,
        dataPoints: [],
        timestamp,
      };
  }
}

// ─── 1. "What happened?" ────────────────────────────────────────────────────

/**
 * Summarize recent financial activity — the most important events
 * in the current period: entries posted, revenue/expense changes,
 * notable transactions.
 */
async function answerWhatHappened(
  entityId: string,
  options?: { periodId?: string },
): Promise<FinancialAssistantResponse> {
  const dataPoints: string[] = [];
  const recommendations: string[] = [];

  // Get current period
  const currentPeriod = await getCurrentPeriod(entityId, options?.periodId);
  if (!currentPeriod) {
    return {
      question: "what_happened",
      answer:
        "No financial data available yet. Start by uploading documents or connecting a bank account.",
      confidence: 0.3,
      dataPoints: [],
      timestamp: new Date().toISOString(),
    };
  }

  // Get trial balance
  const tb = await getTrialBalance(entityId, currentPeriod.id);

  // Count entries
  const entryCount = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, currentPeriod.id),
    ),
  });

  // Summarize revenue and expenses
  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const account of tb.accounts) {
    if (account.accountType === "revenue") {
      totalRevenue += Math.abs(account.netBalance);
    }
    if (account.accountType === "expense") {
      totalExpenses += Math.abs(account.netBalance);
    }
  }

  const netIncome = totalRevenue - totalExpenses;
  const periodLabel = `${currentPeriod.year}-${String(currentPeriod.month).padStart(2, "0")}`;

  dataPoints.push(
    `Period: ${periodLabel} (${currentPeriod.status})`,
    `Journal entries: ${entryCount.length} entries posted`,
    `Total revenue: ${formatCurrency(totalRevenue)}`,
    `Total expenses: ${formatCurrency(totalExpenses)}`,
    `Net income: ${formatCurrency(netIncome)}`,
    `Trial balance: ${tb.isBalanced ? "Balanced ✓" : "NOT balanced ✗"}`,
  );

  let answer = `In ${periodLabel}, ${entryCount.length} journal entr${entryCount.length === 1 ? "y was" : "ies were"} posted. `;
  answer += `Revenue was ${formatCurrency(totalRevenue)} and expenses were ${formatCurrency(totalExpenses)}, `;
  answer += `resulting in a ${netIncome >= 0 ? "profit" : "loss"} of ${formatCurrency(Math.abs(netIncome))}. `;

  if (tb.isBalanced) {
    answer += "The trial balance is balanced. ";
  } else {
    answer += `The trial balance has a discrepancy of ${formatCurrency(tb.totalDebits - tb.totalCredits)}. `;
    recommendations.push(
      "Review the trial balance for the imbalance and correct the affected entries.",
    );
  }

  return {
    question: "what_happened",
    answer,
    confidence: 0.9,
    dataPoints,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

// ─── 2. "Why did profit change?" ────────────────────────────────────────────

/**
 * Analyze profit changes between two periods using top-moving accounts.
 * Explains the drivers of profitability changes in plain English.
 */
async function answerWhyProfitChanged(
  entityId: string,
  options?: { periodId?: string; previousPeriodId?: string },
): Promise<FinancialAssistantResponse> {
  const dataPoints: string[] = [];
  const recommendations: string[] = [];

  const currentPeriod = await getCurrentPeriod(entityId, options?.periodId);
  const previousPeriod = await getPreviousPeriod(
    entityId,
    currentPeriod?.id,
    options?.previousPeriodId,
  );

  if (!currentPeriod || !previousPeriod) {
    return {
      question: "why_profit_changed",
      answer:
        "Need at least two periods of data to compare profitability. Continue posting transactions and check back after the next period closes.",
      confidence: 0.4,
      dataPoints: ["Insufficient data — only one period available"],
      timestamp: new Date().toISOString(),
    };
  }

  // Get trial balances for both periods
  const currentTb = await getTrialBalance(entityId, currentPeriod.id);
  const previousTb = await getTrialBalance(entityId, previousPeriod.id);

  // Calculate revenue and expenses for both periods
  const getFinancialSummary = (tb: typeof currentTb) => {
    let revenue = 0;
    let expenses = 0;
    for (const acc of tb.accounts) {
      if (acc.accountType === "revenue") revenue += Math.abs(acc.netBalance);
      if (acc.accountType === "expense") expenses += Math.abs(acc.netBalance);
    }
    return { revenue, expenses, netIncome: revenue - expenses };
  };

  const current = getFinancialSummary(currentTb);
  const previous = getFinancialSummary(previousTb);

  const revenueChange = current.revenue - previous.revenue;
  const expenseChange = current.expenses - previous.expenses;
  const profitChange = current.netIncome - previous.netIncome;

  const currentLabel = `${currentPeriod.year}-${String(currentPeriod.month).padStart(2, "0")}`;
  const previousLabel = `${previousPeriod.year}-${String(previousPeriod.month).padStart(2, "0")}`;

  dataPoints.push(
    `Periods compared: ${previousLabel} → ${currentLabel}`,
    `Revenue: ${formatCurrency(previous.revenue)} → ${formatCurrency(current.revenue)} (${revenueChange >= 0 ? "+" : ""}${formatCurrency(revenueChange)})`,
    `Expenses: ${formatCurrency(previous.expenses)} → ${formatCurrency(current.expenses)} (${expenseChange >= 0 ? "+" : ""}${formatCurrency(expenseChange)})`,
    `Net income: ${formatCurrency(previous.netIncome)} → ${formatCurrency(current.netIncome)} (${profitChange >= 0 ? "+" : ""}${formatCurrency(profitChange)})`,
  );

  // Get top moving accounts
  const movers = await getTopMovingAccounts(
    entityId,
    currentPeriod.id,
    previousPeriod.id,
    5,
  );
  for (const mover of movers.slice(0, 3)) {
    dataPoints.push(
      `— ${mover.accountName} (${mover.accountCode}): ${mover.direction === "up" ? "↑" : "↓"} ${formatCurrency(mover.variance)} (${mover.variancePercent > 0 ? "+" : ""}${mover.variancePercent.toFixed(1)}%)`,
    );
  }

  // Build plain-English explanation
  let answer = `Profit changed by ${formatCurrency(profitChange)} from ${previousLabel} to ${currentLabel}. `;

  if (revenueChange > 0) {
    answer += `Revenue increased by ${formatCurrency(revenueChange)}, which `;
    answer +=
      expenseChange > 0
        ? `was partially offset by an expense increase of ${formatCurrency(expenseChange)}. `
        : expenseChange < 0
          ? `combined with an expense decrease of ${formatCurrency(Math.abs(expenseChange))} to drive the profit change. `
          : `drove the profit improvement with no significant expense change. `;
  } else if (revenueChange < 0) {
    answer += `Revenue declined by ${formatCurrency(Math.abs(revenueChange))}. `;
    answer +=
      expenseChange < 0
        ? `Expenses also decreased by ${formatCurrency(Math.abs(expenseChange))}, partially offsetting the revenue decline. `
        : `Expenses increased by ${formatCurrency(expenseChange)}, compounding the impact. `;
  } else {
    answer += `Revenue was flat, so the profit change was driven entirely by expense changes. `;
    answer +=
      expenseChange > 0
        ? `Expenses increased by ${formatCurrency(expenseChange)}. `
        : `Expenses decreased by ${formatCurrency(Math.abs(expenseChange))}. `;
  }

  // Top driver
  if (movers.length > 0) {
    const topMover = movers[0]!;
    dataPoints.push(`Top driver: ${topMover.accountName}`);
    answer += `The biggest driver was ${topMover.accountName}, which changed by ${formatCurrency(topMover.variance)}.`;
    recommendations.push(
      `Review ${topMover.accountName} — it was the largest contributor to the profit change this period.`,
    );
  }

  return {
    question: "why_profit_changed",
    answer,
    confidence: 0.85,
    dataPoints,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

// ─── 3. "Where is cash going?" ──────────────────────────────────────────────

/**
 * Analyze cash flow — top expense accounts, unusual spending,
 * cash-consuming activities.
 */
async function answerWhereCashGoing(
  entityId: string,
  options?: { periodId?: string },
): Promise<FinancialAssistantResponse> {
  const dataPoints: string[] = [];
  const recommendations: string[] = [];

  const currentPeriod = await getCurrentPeriod(entityId, options?.periodId);
  if (!currentPeriod) {
    return {
      question: "where_cash_going",
      answer: "No financial data available yet to analyze cash flow.",
      confidence: 0.3,
      dataPoints: [],
      timestamp: new Date().toISOString(),
    };
  }

  // Get expense accounts and their totals
  const tb = await getTrialBalance(entityId, currentPeriod.id);

  // Filter and sort expense accounts
  const expenseAccounts = tb.accounts
    .filter((a) => a.accountType === "expense" && a.netBalance !== 0)
    .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));

  const totalExpenses = expenseAccounts.reduce(
    (s, a) => s + Math.abs(a.netBalance),
    0,
  );

  dataPoints.push(
    `Period: ${tb.periodLabel}`,
    `Total expenses: ${formatCurrency(totalExpenses)}`,
    `Number of expense accounts with activity: ${expenseAccounts.length}`,
  );

  // Top expense categories
  for (const acc of expenseAccounts.slice(0, 5)) {
    const percentage =
      totalExpenses > 0 ? (Math.abs(acc.netBalance) / totalExpenses) * 100 : 0;
    dataPoints.push(
      `— ${acc.accountName}: ${formatCurrency(Math.abs(acc.netBalance))} (${percentage.toFixed(1)}% of total)`,
    );
  }

  let answer = `In ${tb.periodLabel}, total expenses were ${formatCurrency(totalExpenses)} across ${expenseAccounts.length} categories. `;

  if (expenseAccounts.length > 0) {
    const topExpense = expenseAccounts[0]!;
    const topPercentage =
      totalExpenses > 0
        ? (Math.abs(topExpense.netBalance) / totalExpenses) * 100
        : 0;
    answer += `The largest expense was "${topExpense.accountName}" at ${formatCurrency(Math.abs(topExpense.netBalance))} (${topPercentage.toFixed(1)}% of total). `;

    if (topPercentage > 50) {
      answer += `This category represents more than half of all spending — consider reviewing for cost optimization opportunities. `;
      recommendations.push(
        `Review "${topExpense.accountName}" — it accounts for over 50% of total expenses.`,
      );
    }
  }

  if (expenseAccounts.length > 3) {
    recommendations.push(
      `Review the top 3 expense categories for potential cost savings or budget adjustments.`,
    );
  }

  return {
    question: "where_cash_going",
    answer,
    confidence: 0.88,
    dataPoints,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

// ─── 4. "What should we do?" ────────────────────────────────────────────────

/**
 * Generate actionable recommendations based on financial data analysis.
 */
async function answerWhatShouldWeDo(
  entityId: string,
  options?: { periodId?: string },
): Promise<FinancialAssistantResponse> {
  const dataPoints: string[] = [];
  const recommendations: string[] = [];

  const currentPeriod = await getCurrentPeriod(entityId, options?.periodId);
  if (!currentPeriod) {
    return {
      question: "what_should_we_do",
      answer:
        "Start by uploading financial documents and connecting bank accounts so I can analyze your financial position and provide recommendations.",
      confidence: 0.3,
      dataPoints: [],
      recommendations: [
        "Upload your first document or connect a bank account to begin.",
      ],
      timestamp: new Date().toISOString(),
    };
  }

  const tb = await getTrialBalance(entityId, currentPeriod.id);

  // Analyze financial health
  let totalRevenue = 0;
  let totalExpenses = 0;
  for (const acc of tb.accounts) {
    if (acc.accountType === "revenue") totalRevenue += Math.abs(acc.netBalance);
    if (acc.accountType === "expense")
      totalExpenses += Math.abs(acc.netBalance);
  }

  const isProfitable = totalRevenue > totalExpenses;
  const profitMargin =
    totalRevenue > 0
      ? ((totalRevenue - totalExpenses) / totalRevenue) * 100
      : 0;

  // Check for unusual account activity
  const unusualCount = tb.accounts.filter(
    (a) => a.accountType === "suspense" || a.accountCode === "9999",
  ).length;

  if (!tb.isBalanced) {
    recommendations.push(
      "Fix the trial balance imbalance before closing the period.",
    );
  }

  if (unusualCount > 0) {
    recommendations.push(
      `${unusualCount} suspense account(s) have activity. These should be cleared before period close.`,
    );
    dataPoints.push(
      `${unusualCount} suspense account(s) with activity detected`,
    );
  }

  if (!isProfitable) {
    recommendations.push(
      "The entity is operating at a loss. Review expense categories for cost reduction opportunities.",
    );
    dataPoints.push("Entity is operating at a loss");
  }

  if (profitMargin < 10 && isProfitable) {
    recommendations.push(
      `Profit margin is ${profitMargin.toFixed(1)}%. Consider pricing review or cost optimization to improve margins.`,
    );
  }

  // Check period status
  if (currentPeriod.status === "open") {
    const entryCount = (
      await db.query.journalEntries.findMany({
        where: and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.periodId, currentPeriod.id),
        ),
      })
    ).length;

    if (entryCount > 0) {
      recommendations.push(
        `Period ${currentPeriod.year}-${String(currentPeriod.month).padStart(2, "0")} has ${entryCount} entries ready for review. Consider closing the period.`,
      );
    }
  }

  dataPoints.push(
    `Revenue: ${formatCurrency(totalRevenue)}`,
    `Expenses: ${formatCurrency(totalExpenses)}`,
    `Net income: ${formatCurrency(totalRevenue - totalExpenses)}`,
    `Profit margin: ${profitMargin.toFixed(1)}%`,
    `Period status: ${currentPeriod.status}`,
  );

  const answer =
    recommendations.length > 0
      ? `Based on the financial analysis, here are ${recommendations.length} recommended actions:\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
      : "The financial data looks healthy. No specific actions are needed right now. Continue monitoring and posting transactions as normal.";

  return {
    question: "what_should_we_do",
    answer,
    confidence: 0.82,
    dataPoints,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

// ─── 5. "What risks exist?" ───────────────────────────────────────────────

/**
 * Assess financial risks — trial balance issues, unreconciled periods,
 * unusual account activity, etc.
 */
async function answerWhatRisksExist(
  entityId: string,
  options?: { periodId?: string },
): Promise<FinancialAssistantResponse> {
  const dataPoints: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];

  const currentPeriod = await getCurrentPeriod(entityId, options?.periodId);
  if (!currentPeriod) {
    return {
      question: "what_risks_exist",
      answer:
        "No financial data to assess risks yet. Start posting transactions to enable risk analysis.",
      confidence: 0.3,
      dataPoints: [],
      timestamp: new Date().toISOString(),
    };
  }

  // Risk 1: Trial balance imbalance
  const tb = await getTrialBalance(entityId, currentPeriod.id);
  if (!tb.isBalanced) {
    risks.push(
      `Trial balance is NOT balanced. Difference: ${formatCurrency(tb.totalDebits - tb.totalCredits)}. This must be resolved before the period can be closed.`,
    );
    dataPoints.push(
      `Trial balance imbalance: ${formatCurrency(tb.totalDebits - tb.totalCredits)}`,
    );
  }

  // Risk 2: Suspense accounts
  const suspenseAccounts = tb.accounts.filter(
    (a) =>
      a.subtype === "suspense" ||
      a.accountCode === "9999" ||
      a.accountCode.startsWith("999"),
  );
  for (const acc of suspenseAccounts) {
    if (acc.netBalance !== 0) {
      risks.push(
        `Suspense account "${acc.accountName}" (${acc.accountCode}) has a balance of ${formatCurrency(acc.netBalance)}. Suspense accounts should be zero at period end.`,
      );
      dataPoints.push(
        `Suspense account balance: ${acc.accountName} = ${formatCurrency(acc.netBalance)}`,
      );
    }
  }

  // Risk 3: Unclosed previous period
  const previousPeriod = await getPreviousPeriod(entityId, currentPeriod.id);
  if (
    previousPeriod &&
    previousPeriod.status !== "closed" &&
    previousPeriod.status !== "locked"
  ) {
    risks.push(
      `Previous period (${previousPeriod.year}-${String(previousPeriod.month).padStart(2, "0")}) is still "${previousPeriod.status}". Close it before closing the current period.`,
    );
  }

  // Risk 4: Revenue/expense ratio (dangerous if expenses > revenue)
  let totalRevenue = 0;
  let totalExpenses = 0;
  for (const acc of tb.accounts) {
    if (acc.accountType === "revenue") totalRevenue += Math.abs(acc.netBalance);
    if (acc.accountType === "expense")
      totalExpenses += Math.abs(acc.netBalance);
  }

  if (totalExpenses > totalRevenue && totalRevenue > 0) {
    const ratio = (totalExpenses / totalRevenue) * 100;
    risks.push(
      `Expenses (${formatCurrency(totalExpenses)}) exceed revenue (${formatCurrency(totalRevenue)}). Expense-to-revenue ratio is ${ratio.toFixed(0)}%. This is not sustainable long-term.`,
    );
  }

  // Risk 5: No activity in current period
  const entryCount = (
    await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.periodId, currentPeriod.id),
      ),
    })
  ).length;

  if (entryCount === 0) {
    risks.push(
      `No journal entries in the current period (${currentPeriod.year}-${String(currentPeriod.month).padStart(2, "0")}). Transactions may not have been recorded.`,
    );
  }

  // Build response
  const answer =
    risks.length > 0
      ? `${risks.length} risk(s) identified:\n${risks.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
      : "No significant risks detected. The financial data is in good health.";

  if (risks.length > 0) {
    recommendations.push("Address the identified risks before period close.");
  }

  return {
    question: "what_risks_exist",
    answer,
    confidence: risks.length > 0 ? 0.9 : 0.7,
    dataPoints,
    recommendations,
    risks,
    timestamp: new Date().toISOString(),
  };
}

// ─── 6. "What needs attention?" ────────────────────────────────────────────

/**
 * Prioritized list of items requiring human attention.
 * Combines alerts from the monitoring engine, period management,
 * and journal entry quality checks.
 */
async function answerWhatNeedsAttention(
  entityId: string,
  options?: { periodId?: string },
): Promise<FinancialAssistantResponse> {
  const dataPoints: string[] = [];
  const recommendations: string[] = [];
  const attentionItems: string[] = [];

  const currentPeriod = await getCurrentPeriod(entityId, options?.periodId);

  // 1. Draft entries
  const draftEntries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "draft"),
    ),
    limit: 10,
  });

  if (draftEntries.length > 0) {
    attentionItems.push(
      `${draftEntries.length} draft journal entr${draftEntries.length === 1 ? "y needs" : "ies need"} attention.`,
    );
    dataPoints.push(`Draft entries: ${draftEntries.length}`);
  }

  // 2. Unbalanced entries
  if (currentPeriod) {
    const periodEntries = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.periodId, currentPeriod.id),
        eq(journalEntries.status, "posted"),
      ),
    });

    const entryIds = periodEntries.map((e) => e.id);
    if (entryIds.length > 0) {
      const allLines = await db.query.journalEntryLines.findMany({
        where: inArray(journalEntryLines.journalEntryId, entryIds),
      });

      const lineTotals = new Map<string, { debit: number; credit: number }>();
      for (const line of allLines) {
        const current = lineTotals.get(line.journalEntryId) ?? {
          debit: 0,
          credit: 0,
        };
        current.debit += Number(line.debit);
        current.credit += Number(line.credit);
        lineTotals.set(line.journalEntryId, current);
      }

      const unbalancedCount = Array.from(lineTotals.values()).filter(
        (t) => Math.abs(t.debit - t.credit) > 0.01,
      ).length;

      if (unbalancedCount > 0) {
        attentionItems.push(
          `${unbalancedCount} posted journal entr${unbalancedCount === 1 ? "y is" : "ies are"} not balanced.`,
        );
        dataPoints.push(`Unbalanced posted entries: ${unbalancedCount}`);
      }
    }

    // 3. Period status
    if (currentPeriod.status === "open") {
      attentionItems.push(
        `Period ${currentPeriod.year}-${String(currentPeriod.month).padStart(2, "0")} is open and ready for review.`,
      );
    } else if (currentPeriod.status === "closing") {
      attentionItems.push(
        `Period ${currentPeriod.year}-${String(currentPeriod.month).padStart(2, "0")} is in closing process.`,
      );
    }
  }

  // 4. Check for entries with unusually low confidence
  const lowConfidenceEntries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
    ),
    orderBy: [desc(journalEntries.createdAt)],
    limit: 50,
  });

  const lowConfCount = lowConfidenceEntries.filter(
    (e) => e.confidence && Number(e.confidence) < 0.8,
  ).length;

  if (lowConfCount > 0) {
    attentionItems.push(
      `${lowConfCount} recently posted entr${lowConfCount === 1 ? "y has" : "ies have"} low confidence (<80%). Review for accuracy.`,
    );
    dataPoints.push(`Low confidence entries: ${lowConfCount}`);
  }

  // Build response
  const answer =
    attentionItems.length > 0
      ? `Here are ${attentionItems.length} item(s) that need your attention:\n${attentionItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}`
      : "Everything looks good. No items currently require your attention.";

  if (attentionItems.length > 0) {
    recommendations.push(
      ...attentionItems
        .map((item) => item.replace(/\.$/, "").replace(/^\d+ /, ""))
        .slice(0, 3),
    );
  }

  return {
    question: "what_needs_attention",
    answer,
    confidence: 0.85,
    dataPoints,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getCurrentPeriod(
  entityId: string,
  periodId?: string,
): Promise<
  { id: string; year: number; month: number; status: string } | undefined
> {
  if (periodId) {
    return db.query.fiscalPeriods.findFirst({
      where: and(
        eq(fiscalPeriods.id, periodId),
        eq(fiscalPeriods.entityId, entityId),
      ),
    });
  }

  // Find the most recent open period (or closed period if none open)
  const openPeriod = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      eq(fiscalPeriods.status, "open"),
    ),
    orderBy: [desc(fiscalPeriods.year), desc(fiscalPeriods.month)],
  });

  if (openPeriod) return openPeriod;

  // Fallback: most recent period of any status
  return db.query.fiscalPeriods.findFirst({
    where: eq(fiscalPeriods.entityId, entityId),
    orderBy: [desc(fiscalPeriods.year), desc(fiscalPeriods.month)],
  });
}

async function getPreviousPeriod(
  entityId: string,
  currentPeriodId?: string,
  specificPeriodId?: string,
): Promise<
  { id: string; year: number; month: number; status: string } | undefined
> {
  if (specificPeriodId) {
    return db.query.fiscalPeriods.findFirst({
      where: and(
        eq(fiscalPeriods.id, specificPeriodId),
        eq(fiscalPeriods.entityId, entityId),
      ),
    });
  }

  if (!currentPeriodId) return undefined;

  const current = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.id, currentPeriodId),
      eq(fiscalPeriods.entityId, entityId),
    ),
  });

  if (!current) return undefined;

  const prevMonth = current.month === 1 ? 12 : current.month - 1;
  const prevYear = current.month === 1 ? current.year - 1 : current.year;

  return db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      eq(fiscalPeriods.year, prevYear),
      eq(fiscalPeriods.month, prevMonth),
    ),
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
