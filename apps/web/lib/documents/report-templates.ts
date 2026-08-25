"use client";

// ─── Report Templates ──────────────────────────────────────────────────────
//
// Professional, branded report templates for financial documents.
// Each template defines the exact structure, formatting, and data mapping
// for a specific report type. Used by the document generation utilities.

import type { ReportData, ReportSection } from "./generate-documents";

// ─── Brand Config ──────────────────────────────────────────────────────────

export const BRAND = {
  name: "Xenboox",
  color: { r: 79, g: 70, b: 229 }, // #4f46e5
  colorHex: "#4f46e5",
  tagline: "AI-Native Accounting Platform",
  website: "xenboox.com",
};

// ─── Number Formatting ─────────────────────────────────────────────────────

export function formatAmount(value: number, currency: string = "USD"): string {
  return `${currency} ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

// ─── Profit & Loss Template ────────────────────────────────────────────────

export type PnlData = {
  entityName: string;
  currency: string;
  period: string;
  revenue: number;
  revenueByAccount: Array<{ code: string; name: string; amount: number }>;
  expenses: number;
  expensesByAccount: Array<{ code: string; name: string; amount: number }>;
  cogs: number;
  grossProfit: number;
  opExpenses: number;
  netProfit: number;
  priorRevenue?: number;
  priorExpenses?: number;
  narrative?: string;
};

export function buildPnlReport(data: PnlData): ReportData {
  const revenueChange = data.priorRevenue
    ? ((data.revenue - data.priorRevenue) / data.priorRevenue) * 100
    : undefined;
  const expensesChange = data.priorExpenses
    ? ((data.expenses - data.priorExpenses) / data.priorExpenses) * 100
    : undefined;
  const grossMargin =
    data.revenue > 0 ? (data.grossProfit / data.revenue) * 100 : 0;
  const netMargin =
    data.revenue > 0 ? (data.netProfit / data.revenue) * 100 : 0;

  const sections: ReportSection[] = [];

  // Narrative section
  if (data.narrative) {
    sections.push({
      heading: "Executive Summary",
      paragraphs: [data.narrative],
    });
  }

  // Revenue section
  sections.push({
    heading: "Revenue",
    intro: `Total revenue for ${data.period}: ${formatAmount(data.revenue, data.currency)}${revenueChange !== undefined ? ` (${formatPercent(revenueChange)} vs prior period)` : ""}`,
    table: {
      columns: ["Account", "Amount", "% of Total"],
      rows: data.revenueByAccount.map((a) => [
        `${a.code} — ${a.name}`,
        formatAmount(a.amount, data.currency),
        data.revenue > 0
          ? `${((a.amount / data.revenue) * 100).toFixed(1)}%`
          : "0%",
      ]),
    },
    footer: [
      {
        label: "Total Revenue",
        value: formatAmount(data.revenue, data.currency),
      },
    ],
  });

  // Expenses section
  sections.push({
    heading: "Expenses",
    intro: `Total expenses for ${data.period}: ${formatAmount(data.expenses, data.currency)}${expensesChange !== undefined ? ` (${formatPercent(expensesChange)} vs prior period)` : ""}`,
    table: {
      columns: ["Account", "Amount", "% of Revenue"],
      rows: data.expensesByAccount.map((a) => [
        `${a.code} — ${a.name}`,
        formatAmount(a.amount, data.currency),
        data.revenue > 0
          ? `${((a.amount / data.revenue) * 100).toFixed(1)}%`
          : "0%",
      ]),
    },
    footer: [
      {
        label: "Total Expenses",
        value: formatAmount(data.expenses, data.currency),
      },
    ],
  });

  // Profitability summary
  sections.push({
    heading: "Profitability",
    table: {
      columns: ["Metric", "Amount", "Margin"],
      rows: [
        [
          "Gross Profit",
          formatAmount(data.grossProfit, data.currency),
          `${grossMargin.toFixed(1)}%`,
        ],
        [
          "Operating Expenses",
          formatAmount(data.opExpenses, data.currency),
          data.revenue > 0
            ? `${((data.opExpenses / data.revenue) * 100).toFixed(1)}%`
            : "0%",
        ],
        [
          "Net Profit / (Loss)",
          formatAmount(data.netProfit, data.currency),
          `${netMargin.toFixed(1)}%`,
        ],
      ],
    },
    footer: [
      {
        label: "Net Profit",
        value: formatAmount(data.netProfit, data.currency),
      },
      { label: "Net Margin", value: `${netMargin.toFixed(1)}%` },
    ],
  });

  return {
    title: "Profit & Loss Statement",
    subtitle: `${data.entityName} · ${data.period}`,
    entityName: data.entityName,
    currency: data.currency,
    generatedAt: new Date(),
    sections,
  };
}

// ─── Balance Sheet Template ────────────────────────────────────────────────

export type BalanceSheetData = {
  entityName: string;
  currency: string;
  asAt: string;
  assets: number;
  assetsByAccount: Array<{ code: string; name: string; amount: number }>;
  liabilities: number;
  liabilitiesByAccount: Array<{ code: string; name: string; amount: number }>;
  equity: number;
  equityByAccount: Array<{ code: string; name: string; amount: number }>;
  narrative?: string;
};

export function buildBalanceSheetReport(data: BalanceSheetData): ReportData {
  const sections: ReportSection[] = [];

  if (data.narrative) {
    sections.push({
      heading: "Executive Summary",
      paragraphs: [data.narrative],
    });
  }

  sections.push({
    heading: "Assets",
    table: {
      columns: ["Account", "Amount"],
      rows: data.assetsByAccount.map((a) => [
        `${a.code} — ${a.name}`,
        formatAmount(a.amount, data.currency),
      ]),
    },
    footer: [
      {
        label: "Total Assets",
        value: formatAmount(data.assets, data.currency),
      },
    ],
  });

  sections.push({
    heading: "Liabilities",
    table: {
      columns: ["Account", "Amount"],
      rows: data.liabilitiesByAccount.map((a) => [
        `${a.code} — ${a.name}`,
        formatAmount(a.amount, data.currency),
      ]),
    },
    footer: [
      {
        label: "Total Liabilities",
        value: formatAmount(data.liabilities, data.currency),
      },
    ],
  });

  sections.push({
    heading: "Equity",
    table: {
      columns: ["Account", "Amount"],
      rows: data.equityByAccount.map((a) => [
        `${a.code} — ${a.name}`,
        formatAmount(a.amount, data.currency),
      ]),
    },
    footer: [
      {
        label: "Total Equity",
        value: formatAmount(data.equity, data.currency),
      },
    ],
  });

  const balanced =
    Math.abs(data.assets - (data.liabilities + data.equity)) < 0.01;
  sections.push({
    heading: "Balance Check",
    bullets: [
      `Total Assets: ${formatAmount(data.assets, data.currency)}`,
      `Total Liabilities + Equity: ${formatAmount(data.liabilities + data.equity, data.currency)}`,
      `Balanced: ${balanced ? "Yes ✓" : "No ✗ — investigate discrepancy"}`,
    ],
  });

  return {
    title: "Balance Sheet",
    subtitle: `${data.entityName} · As at ${data.asAt}`,
    entityName: data.entityName,
    currency: data.currency,
    generatedAt: new Date(),
    sections,
  };
}

// ─── Cash Flow Statement Template ──────────────────────────────────────────

export type CashFlowData = {
  entityName: string;
  currency: string;
  period: string;
  openingCash: number;
  operating: {
    lines: Array<{ name: string; amount: number }>;
    total: number;
  };
  investing: {
    lines: Array<{ name: string; amount: number }>;
    total: number;
  };
  financing: {
    lines: Array<{ name: string; amount: number }>;
    total: number;
  };
  closingCash: number;
  narrative?: string;
};

export function buildCashFlowReport(data: CashFlowData): ReportData {
  const netChange = data.closingCash - data.openingCash;

  const sections: ReportSection[] = [];

  if (data.narrative) {
    sections.push({
      heading: "Executive Summary",
      paragraphs: [data.narrative],
    });
  }

  sections.push({
    heading: "Operating Activities",
    table: {
      columns: ["Item", "Amount"],
      rows: data.operating.lines.map((l) => [
        l.name,
        formatAmount(l.amount, data.currency),
      ]),
    },
    footer: [
      {
        label: "Net Cash from Operations",
        value: formatAmount(data.operating.total, data.currency),
      },
    ],
  });

  sections.push({
    heading: "Investing Activities",
    table: {
      columns: ["Item", "Amount"],
      rows: data.investing.lines.map((l) => [
        l.name,
        formatAmount(l.amount, data.currency),
      ]),
    },
    footer: [
      {
        label: "Net Cash from Investing",
        value: formatAmount(data.investing.total, data.currency),
      },
    ],
  });

  sections.push({
    heading: "Financing Activities",
    table: {
      columns: ["Item", "Amount"],
      rows: data.financing.lines.map((l) => [
        l.name,
        formatAmount(l.amount, data.currency),
      ]),
    },
    footer: [
      {
        label: "Net Cash from Financing",
        value: formatAmount(data.financing.total, data.currency),
      },
    ],
  });

  sections.push({
    heading: "Cash Position Summary",
    table: {
      columns: ["Metric", "Amount"],
      rows: [
        ["Opening Cash Balance", formatAmount(data.openingCash, data.currency)],
        ["Net Change", formatAmount(netChange, data.currency)],
        ["Closing Cash Balance", formatAmount(data.closingCash, data.currency)],
      ],
    },
  });

  return {
    title: "Cash Flow Statement",
    subtitle: `${data.entityName} · ${data.period}`,
    entityName: data.entityName,
    currency: data.currency,
    generatedAt: new Date(),
    sections,
  };
}

// ─── Trial Balance Template ────────────────────────────────────────────────

export type TrialBalanceData = {
  entityName: string;
  currency: string;
  period: string;
  accounts: Array<{
    code: string;
    name: string;
    type: string;
    debitBalance: number;
    creditBalance: number;
  }>;
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
};

export function buildTrialBalanceReport(data: TrialBalanceData): ReportData {
  // Group accounts by type
  const grouped = data.accounts.reduce(
    (acc, a) => {
      const type = a.type.charAt(0).toUpperCase() + a.type.slice(1);
      if (!acc[type]) acc[type] = [];
      acc[type].push(a);
      return acc;
    },
    {} as Record<string, typeof data.accounts>,
  );

  const typeOrder = ["Asset", "Liability", "Equity", "Revenue", "Expense"];
  const sections: ReportSection[] = [];

  for (const type of typeOrder) {
    const accounts = grouped[type];
    if (!accounts || accounts.length === 0) continue;

    const typeDebits = accounts.reduce((s, a) => s + a.debitBalance, 0);
    const typeCredits = accounts.reduce((s, a) => s + a.creditBalance, 0);

    sections.push({
      heading: `${type} Accounts`,
      table: {
        columns: ["Code", "Account", "Debit", "Credit"],
        rows: accounts.map((a) => [
          a.code,
          a.name,
          a.debitBalance > 0 ? formatAmount(a.debitBalance, data.currency) : "",
          a.creditBalance > 0
            ? formatAmount(a.creditBalance, data.currency)
            : "",
        ]),
      },
      footer: [
        {
          label: `Total ${type}`,
          value: `Dr ${formatAmount(typeDebits, data.currency)} / Cr ${formatAmount(typeCredits, data.currency)}`,
        },
      ],
    });
  }

  sections.push({
    heading: "Totals",
    table: {
      columns: ["", "Debit", "Credit"],
      rows: [
        [
          "Total",
          formatAmount(data.totalDebits, data.currency),
          formatAmount(data.totalCredits, data.currency),
        ],
      ],
    },
    footer: [
      {
        label: "Status",
        value: data.balanced ? "Balanced ✓" : "Out of Balance ✗",
      },
    ],
  });

  return {
    title: "Trial Balance",
    subtitle: `${data.entityName} · ${data.period}`,
    entityName: data.entityName,
    currency: data.currency,
    generatedAt: new Date(),
    sections,
  };
}

// ─── Donor Report Template ────────────────────────────────────────────────

export type DonorReportData = {
  projectName: string;
  projectCode: string | null;
  period: string;
  currency: string;
  grantAmount: number;
  amountDisbursed: number;
  amountRemaining: number;
  reportingFormat: string;
  budgetVsActual: {
    categories: Array<{
      category: string;
      budgeted: number;
      actual: number;
      variance: number;
      variancePct: number;
    }>;
    totalBudgeted: number;
    totalActual: number;
    totalVariance: number;
    totalVariancePct: number;
  };
  narrativeSummary: string | null;
  status: string;
  generatedAt: string;
};

export function buildDonorReportPdf(data: DonorReportData): ReportData {
  const sections: ReportSection[] = [];

  // Executive summary
  if (data.narrativeSummary) {
    sections.push({
      heading: "Narrative Summary",
      paragraphs: [data.narrativeSummary],
    });
  }

  // Grant overview
  sections.push({
    heading: "Grant Overview",
    table: {
      columns: ["Metric", "Value"],
      rows: [
        ["Project Name", data.projectName],
        ["Project Code", data.projectCode ?? "—"],
        ["Reporting Period", data.period],
        ["Reporting Format", data.reportingFormat.toUpperCase()],
        [
          "Report Status",
          data.status.charAt(0).toUpperCase() + data.status.slice(1),
        ],
        ["Total Grant", formatAmount(data.grantAmount, data.currency)],
        ["Amount Disbursed", formatAmount(data.amountDisbursed, data.currency)],
        ["Amount Remaining", formatAmount(data.amountRemaining, data.currency)],
        [
          "Grant Utilization",
          data.grantAmount > 0
            ? `${((data.amountDisbursed / data.grantAmount) * 100).toFixed(1)}%`
            : "0%",
        ],
      ],
    },
  });

  // Budget vs Actual
  const categories = data.budgetVsActual.categories;
  if (categories.length > 0) {
    sections.push({
      heading: "Budget vs Actual",
      intro: `Total budgeted: ${formatAmount(data.budgetVsActual.totalBudgeted, data.currency)} · Total actual: ${formatAmount(data.budgetVsActual.totalActual, data.currency)}`,
      table: {
        columns: ["Category", "Budgeted", "Actual", "Variance", "Variance %"],
        rows: categories.map((c) => [
          c.category,
          formatAmount(c.budgeted, data.currency),
          formatAmount(c.actual, data.currency),
          `${c.variance > 0 ? "+" : ""}${formatAmount(c.variance, data.currency)}`,
          `${c.variancePct > 0 ? "+" : ""}${c.variancePct.toFixed(1)}%`,
        ]),
      },
      footer: [
        {
          label: "Total Variance",
          value: `${data.budgetVsActual.totalVariance > 0 ? "+" : ""}${formatAmount(data.budgetVsActual.totalVariance, data.currency)} (${data.budgetVsActual.totalVariancePct > 0 ? "+" : ""}${data.budgetVsActual.totalVariancePct.toFixed(1)}%)`,
        },
      ],
    });
  } else {
    sections.push({
      heading: "Budget vs Actual",
      paragraphs: ["No budget vs actual data available for this period."],
    });
  }

  return {
    title: "Donor Report",
    subtitle: `${data.projectName} · ${data.period}`,
    entityName: data.projectName,
    currency: data.currency,
    generatedAt: new Date(),
    sections,
  };
}
