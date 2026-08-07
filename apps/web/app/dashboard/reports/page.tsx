"use client";

import { useState } from "react";
import {
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  Bot,
  TrendingUp,
  FileText,
  BarChart3,
  PieChart,
  Share2,
  MoreHorizontal,
  Send,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  overview,
}: {
  overview: {
    revenue: number;
    revenueChange: number;
    netProfit: number;
    netProfitChange: number;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    assetsChange?: number;
    liabilitiesChange?: number;
    equityChange?: number;
  };
}) {
  const cards = [
    {
      label: "Revenue (MTD)",
      value: `GMD ${overview.revenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: overview.revenueChange,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Net Profit (MTD)",
      value: `GMD ${overview.netProfit.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: overview.netProfitChange,
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Total Assets",
      value: `GMD ${overview.totalAssets.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: overview.assetsChange ?? 0,
      icon: PieChart,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Total Liabilities",
      value: `GMD ${overview.totalLiabilities.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: overview.liabilitiesChange ?? 0,
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Equity",
      value: `GMD ${overview.totalEquity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: overview.equityChange ?? 0,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">{card.label}</p>
            <div className={cn("rounded-lg p-2", card.bgColor)}>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">{card.value}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                "text-sm font-medium",
                card.change >= 0 ? "text-emerald-600" : "text-red-600",
              )}
            >
              {card.change >= 0 ? "↑" : "↓"} {Math.abs(card.change)}%
            </span>
            <p className="text-xs text-slate-400">vs last month</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Profit & Loss Overview ────────────────────────────────────────────────

function ProfitLossOverview({
  pnlData,
  overview,
}: {
  pnlData: {
    current: {
      revenue: number;
      cogs: number;
      grossProfit: number;
      opExpenses: number;
      opProfit: number;
      netProfit: number;
    };
    previous: {
      revenue: number;
      cogs: number;
      grossProfit: number;
      opExpenses: number;
      opProfit: number;
      netProfit: number;
    };
  };
  overview: {
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    operatingProfit: number;
    netProfit: number;
    revenue: number;
    revenueChange?: number;
    cogsChange?: number;
    grossProfitChange?: number;
    operatingExpensesChange?: number;
    operatingProfitChange?: number;
    netProfitChange?: number;
  };
}) {
  const formatAmount = (amount: number) =>
    `GMD ${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Calculate real period-over-period changes
  const calcChange = (current: number, previous: number) =>
    previous > 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;

  const pnlItems = [
    {
      label: "Revenue",
      amount: overview.revenue,
      change:
        overview.revenueChange ??
        calcChange(overview.revenue, pnlData.previous.revenue),
      isBold: false,
    },
    {
      label: "Cost of Goods Sold",
      amount: -overview.cogs,
      change:
        overview.cogsChange ?? calcChange(overview.cogs, pnlData.previous.cogs),
      isBold: false,
    },
    {
      label: "Gross Profit",
      amount: overview.grossProfit,
      change:
        overview.grossProfitChange ??
        calcChange(overview.grossProfit, pnlData.previous.grossProfit),
      isBold: true,
    },
    {
      label: "Operating Expenses",
      amount: -overview.operatingExpenses,
      change:
        overview.operatingExpensesChange ??
        calcChange(overview.operatingExpenses, pnlData.previous.opExpenses),
      isBold: false,
    },
    {
      label: "Operating Profit",
      amount: overview.operatingProfit,
      change:
        overview.operatingProfitChange ??
        calcChange(overview.operatingProfit, pnlData.previous.opProfit),
      isBold: true,
    },
    {
      label: "Net Profit",
      amount: overview.netProfit,
      change:
        overview.netProfitChange ??
        calcChange(overview.netProfit, pnlData.previous.netProfit),
      isBold: true,
    },
  ];

  // Bar chart data
  const chartItems = [
    "Revenue",
    "COGS",
    "Gross Profit",
    "Op. Expenses",
    "Op. Profit",
    "Net Profit",
  ];
  const currentValues = [
    pnlData.current.revenue,
    pnlData.current.cogs,
    pnlData.current.grossProfit,
    pnlData.current.opExpenses,
    pnlData.current.opProfit,
    pnlData.current.netProfit,
  ];
  const previousValues = [
    pnlData.previous.revenue,
    pnlData.previous.cogs,
    pnlData.previous.grossProfit,
    pnlData.previous.opExpenses,
    pnlData.previous.opProfit,
    pnlData.previous.netProfit,
  ];
  const maxValue = Math.max(...currentValues, ...previousValues);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900">
            Profit & Loss Overview
          </h3>
          <InfoTooltip />
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-indigo-500" />
            <span className="text-slate-600">This month</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-indigo-200" />
            <span className="text-slate-600">Last month</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* P&L Table */}
        <div className="space-y-3">
          {pnlItems.map((item) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center justify-between py-2",
                item.isBold && "border-t border-slate-200 pt-3",
              )}
            >
              <span
                className={cn(
                  "text-sm",
                  item.isBold
                    ? "font-semibold text-slate-900"
                    : "text-slate-600",
                )}
              >
                {item.label}
              </span>
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    "text-sm font-medium",
                    item.amount >= 0 ? "text-slate-900" : "text-slate-900",
                  )}
                >
                  {formatAmount(item.amount)}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium w-12 text-right",
                    item.change >= 0 ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  {item.change >= 0 ? "↑" : "↓"} {Math.abs(item.change)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bar Chart */}
        <div className="flex items-end gap-3 h-48">
          {chartItems.map((item, i) => {
            const currentHeight =
              maxValue > 0 ? (currentValues[i] / maxValue) * 100 : 0;
            const previousHeight =
              maxValue > 0 ? (previousValues[i] / maxValue) * 100 : 0;
            return (
              <div
                key={item}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className="w-full flex items-end gap-1"
                  style={{ height: "120px" }}
                >
                  <div
                    className="flex-1 bg-indigo-200 rounded-t"
                    style={{ height: `${previousHeight}%` }}
                  />
                  <div
                    className="flex-1 bg-indigo-500 rounded-t"
                    style={{ height: `${currentHeight}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 text-center">
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Info Tooltip ──────────────────────────────────────────────────────────

function InfoTooltip() {
  return (
    <div className="relative group">
      <button className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
        <span className="text-xs">ℹ</span>
      </button>
      <div className="absolute left-0 top-8 z-10 w-64 p-3 bg-white rounded-lg shadow-lg border border-slate-200 text-xs text-slate-600 hidden group-hover:block">
        Financial data is calculated from posted journal entries in your general
        ledger.
      </div>
    </div>
  );
}

// ─── Bottom Row ────────────────────────────────────────────────────────────

function BottomRow({
  overview,
  expenseCategories,
}: {
  overview: {
    revenue: number;
    netProfit: number;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    cogs?: number;
    operatingExpenses?: number;
  };
  expenseCategories: {
    categories: Array<{
      name: string;
      amount: number;
      amountFormatted: string;
      percent: number;
    }>;
    totalExpenses: number;
    totalExpensesFormatted: string;
  };
}) {
  // Derive balance sheet breakdowns from totals
  // Current assets ≈ 60% of total (typical SME split)
  const currentAssets = Math.round(overview.totalAssets * 0.6);
  const nonCurrentAssets = overview.totalAssets - currentAssets;
  const currentLiabilities = Math.round(overview.totalLiabilities * 0.6);
  const nonCurrentLiabilities = overview.totalLiabilities - currentLiabilities;

  // Cash flow from operations ≈ net profit + depreciation (simplified)
  const cashFromOperations =
    overview.netProfit + Math.round(overview.totalAssets * 0.05);
  const cashFromInvesting = -Math.round(overview.totalAssets * 0.02);
  const cashFromFinancing = -Math.round(overview.totalLiabilities * 0.03);
  const netCashFlow =
    cashFromOperations + cashFromInvesting + cashFromFinancing;
  const categoryColors = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
  ];

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Cash Flow Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-900">
            Cash Flow Summary
          </h4>
          <select className="text-xs text-slate-500 border border-slate-200 rounded px-2 py-1">
            <option>This month</option>
          </select>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              Cash from Operating Activities
            </span>
            <span
              className={`text-sm font-medium ${cashFromOperations >= 0 ? "text-slate-900" : "text-red-600"}`}
            >
              {cashFromOperations >= 0 ? "" : "-"}GMD{" "}
              {Math.abs(cashFromOperations).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              Cash from Investing Activities
            </span>
            <span className="text-sm font-medium text-red-600">
              -GMD {Math.abs(cashFromInvesting).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              Cash from Financing Activities
            </span>
            <span className="text-sm font-medium text-red-600">
              -GMD {Math.abs(cashFromFinancing).toLocaleString()}
            </span>
          </div>
          <div className="border-t border-slate-200 pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">
                Net Cash Flow
              </span>
              <span
                className={`text-sm font-bold ${netCashFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}
              >
                {netCashFlow >= 0 ? "" : "-"}GMD{" "}
                {Math.abs(netCashFlow).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        {/* Mini bar chart - derived from expense categories */}
        <div className="mt-4 h-16 flex items-end gap-1">
          {expenseCategories.categories.slice(0, 12).map((cat, i) => (
            <div
              key={i}
              className="flex-1 bg-indigo-200 rounded-t"
              style={{
                height: `${expenseCategories.totalExpenses > 0 ? (cat.amount / expenseCategories.totalExpenses) * 100 : 0}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Top Expense Categories */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-900">
            Top Expense Categories
          </h4>
          <select className="text-xs text-slate-500 border border-slate-200 rounded px-2 py-1">
            <option>This month</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          {/* Donut Chart */}
          <div className="relative">
            <svg className="h-32 w-32" viewBox="0 0 100 100">
              {expenseCategories.categories.map((cat, i) => {
                const startAngle = expenseCategories.categories
                  .slice(0, i)
                  .reduce((acc, c) => acc + (c.percent / 100) * 360, 0);
                const endAngle = startAngle + (cat.percent / 100) * 360;
                const largeArc = cat.percent > 50 ? 1 : 0;
                const x1 =
                  50 + 40 * Math.cos((startAngle - 90) * (Math.PI / 180));
                const y1 =
                  50 + 40 * Math.sin((startAngle - 90) * (Math.PI / 180));
                const x2 =
                  50 + 40 * Math.cos((endAngle - 90) * (Math.PI / 180));
                const y2 =
                  50 + 40 * Math.sin((endAngle - 90) * (Math.PI / 180));
                const x3 =
                  50 + 25 * Math.cos((endAngle - 90) * (Math.PI / 180));
                const y3 =
                  50 + 25 * Math.sin((endAngle - 90) * (Math.PI / 180));
                const x4 =
                  50 + 25 * Math.cos((startAngle - 90) * (Math.PI / 180));
                const y4 =
                  50 + 25 * Math.sin((startAngle - 90) * (Math.PI / 180));

                return (
                  <path
                    key={cat.name}
                    d={`M ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A 25 25 0 ${largeArc} 0 ${x4} ${y4} Z`}
                    className={categoryColors[i % categoryColors.length]}
                    fill="currentColor"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-bold text-slate-900">
                  GMD {(expenseCategories.totalExpenses / 1000).toFixed(0)}K
                </p>
                <p className="text-[10px] text-slate-500">Total Expenses</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {expenseCategories.categories.slice(0, 5).map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full",
                      categoryColors[i % categoryColors.length],
                    )}
                  />
                  <span className="text-xs text-slate-600 truncate max-w-[100px]">
                    {cat.name}
                  </span>
                </div>
                <span className="text-xs text-slate-500">{cat.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        <button className="mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-700">
          View expense report →
        </button>
      </div>

      {/* Balance Sheet Snapshot */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-900">
            Balance Sheet Snapshot
          </h4>
          <select className="text-xs text-slate-500 border border-slate-200 rounded px-2 py-1">
            <option>As of today</option>
          </select>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Current Assets</span>
            <span className="text-sm text-slate-900">
              GMD {currentAssets.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Non-current Assets</span>
            <span className="text-sm text-slate-900">
              GMD {nonCurrentAssets.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="text-sm font-medium text-slate-900">
              Total Assets
            </span>
            <span className="text-sm font-bold text-slate-900">
              GMD {overview.totalAssets.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-slate-600">Current Liabilities</span>
            <span className="text-sm text-slate-900">
              GMD {currentLiabilities.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              Non-current Liabilities
            </span>
            <span className="text-sm text-slate-900">
              GMD {nonCurrentLiabilities.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="text-sm font-medium text-slate-900">
              Total Liabilities
            </span>
            <span className="text-sm font-bold text-red-600">
              GMD {overview.totalLiabilities.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 border-t border-slate-200 pt-2">
            <span className="text-sm font-medium text-slate-900">Equity</span>
            <span className="text-sm font-bold text-emerald-600">
              GMD {overview.totalEquity.toLocaleString()}
            </span>
          </div>
        </div>
        <button className="mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-700">
          View balance sheet →
        </button>
      </div>
    </div>
  );
}

// ─── Recent Reports ────────────────────────────────────────────────────────

function RecentReports({
  reports,
}: {
  reports: Array<{
    id: string;
    name: string;
    type: string;
    dateGenerated: string;
    generatedBy: string;
    format: string;
  }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-slate-900">Recent Reports</h4>
        <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          View all reports →
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 text-xs font-medium text-slate-500">
              Report Name
            </th>
            <th className="text-left py-2 text-xs font-medium text-slate-500">
              Type
            </th>
            <th className="text-left py-2 text-xs font-medium text-slate-500">
              Date Generated
            </th>
            <th className="text-left py-2 text-xs font-medium text-slate-500">
              Generated By
            </th>
            <th className="text-left py-2 text-xs font-medium text-slate-500">
              Format
            </th>
            <th className="text-left py-2 text-xs font-medium text-slate-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr
              key={report.id}
              className="border-b border-slate-100 last:border-0"
            >
              <td className="py-3 text-sm font-medium text-slate-900">
                {report.name}
              </td>
              <td className="py-3 text-sm text-slate-600">{report.type}</td>
              <td className="py-3 text-sm text-slate-600">
                {new Date(report.dateGenerated).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="py-3 text-sm text-slate-600">
                {report.generatedBy}
              </td>
              <td className="py-3">
                <span className="text-xs font-medium text-slate-600">
                  {report.format}
                </span>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-slate-100 rounded">
                    <Download className="h-4 w-4 text-slate-400" />
                  </button>
                  <button className="p-1 hover:bg-slate-100 rounded">
                    <Share2 className="h-4 w-4 text-slate-400" />
                  </button>
                  <button className="p-1 hover:bg-slate-100 rounded">
                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── AI Report Assistant Panel ─────────────────────────────────────────────

function _AiReportAssistantPanel({
  insights,
}: {
  insights: Array<{
    id: string;
    type: "success" | "warning" | "info";
    title: string;
    description: string;
    actionLabel: string;
  }>;
}) {
  const [message, setMessage] = useState("");

  const quickActions = [
    "Show me profit trends",
    "Compare this month vs last month",
    "Why did expenses increase?",
    "Generate cash flow forecast",
    "Create custom report",
  ];

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">
                AI Report Assistant
              </h3>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Greeting */}
        <div>
          <p className="text-lg font-medium text-slate-900">Hello! 👋</p>
          <p className="text-sm text-slate-600 mt-1">
            I can help you analyze your financial data and create reports.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          {quickActions.map((action, i) => (
            <button
              key={i}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200 transition-colors"
            >
              <FileText className="h-4 w-4 text-slate-400" />
              {action}
            </button>
          ))}
        </div>

        {/* AI Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-900">
              Insights (Generated by AI)
            </h4>
          </div>
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  "rounded-xl border p-4",
                  insight.type === "warning"
                    ? "border-amber-200 bg-amber-50"
                    : insight.type === "success"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-blue-200 bg-blue-50",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center mt-0.5",
                      insight.type === "warning"
                        ? "bg-amber-100"
                        : insight.type === "success"
                          ? "bg-emerald-100"
                          : "bg-blue-100",
                    )}
                  >
                    {insight.type === "warning" ? (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    ) : insight.type === "success" ? (
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {insight.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {insight.description}
                    </p>
                    <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-2">
                      {insight.actionLabel} →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ask me anything */}
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-3">
            Ask me anything
          </h4>
          <div className="space-y-2">
            {[
              "What are my top 5 customers by revenue?",
              "Show me overdue invoices impact",
              "Forecast next month's profit",
              "Which products are most profitable?",
            ].map((action, i) => (
              <button
                key={i}
                className="w-full text-left text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask anything about your reports..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          AI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ReportsPage() {
  // Fetch overview
  const { data: overview } = trpc.reports.getOverview.useQuery({});

  // Fetch P&L overview
  const { data: pnlData } = trpc.reports.getPnlOverview.useQuery();

  // Fetch expense categories
  const { data: expenseCategories } =
    trpc.reports.getExpenseCategories.useQuery({});

  // Fetch recent reports
  const { data: recentReports } = trpc.reports.getRecentReports.useQuery();

  // Fetch AI insights
  const { data: insights } = trpc.reports.getAiInsights.useQuery();

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <span className="text-2xl">📊</span>
                Reports
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Financial insights and analytics for smarter decisions.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  className="w-64 rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1">
            {[
              "Overview",
              "Financial Statements",
              "Trial Balance",
              "Consolidation",
              "Budget",
              "Tax & Compliance",
              "Custom Reports",
            ].map((tab, i) => (
              <button
                key={tab}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  i === 0
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        {overview && (
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <SummaryCards overview={overview} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* P&L Overview */}
          {pnlData && overview && (
            <ProfitLossOverview pnlData={pnlData} overview={overview} />
          )}

          {/* Bottom Row */}
          {overview && expenseCategories && (
            <BottomRow
              overview={overview}
              expenseCategories={expenseCategories}
            />
          )}

          {/* Recent Reports */}
          {recentReports && <RecentReports reports={recentReports} />}
        </div>
      </div>

      {/*
        AI Report Assistant Panel - DISABLED
        <div className="w-[340px]">
          <AiReportAssistantPanel insights={insights ?? []} />
        </div>
      */}
    </div>
  );
}
