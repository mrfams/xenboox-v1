"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Bot,
  TrendingUp,
  FileText,
  BarChart3,
  PieChart,
  Send,
  Network,
  Settings,
  Calculator,
  Link2,
  Wallet,
  ArrowRight,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import type { SummaryCardItem } from "@/components/module/module-page-shell.types";
import { RowAiAction } from "@/components/module/row-ai-action";
import {
  ModulePanel,
  ModulePanelEmpty,
  ModulePanelLoading,
} from "@/components/module/module-tab-panel";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function buildSummaryCards(overview: {
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
}): SummaryCardItem[] {
  return [
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

// ─── Financial statement panels (period-scoped, real ledger data) ──────────

function fmtGmd(v: number) {
  return `${v < 0 ? "−" : ""}GMD ${Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function PeriodPicker({
  periods,
  value,
  onChange,
}: {
  periods: Array<{ id: string; year: number; month: number; status: string }>;
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Period
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {periods.length === 0 && <option value="">No fiscal periods</option>}
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.year}-{String(p.month).padStart(2, "0")} ·{" "}
            {p.status === "open" ? "Open" : "Closed"}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatementSection({
  title,
  accounts,
  total,
}: {
  title: string;
  accounts: Array<{
    code?: string | null;
    name?: string | null;
    displayAmount: number;
  }>;
  total: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-slate-200 py-2.5">
        <h4 className="text-[13px] font-semibold text-slate-900">{title}</h4>
        <span className="text-[13px] font-semibold tabular-nums text-slate-900">
          {fmtGmd(total)}
        </span>
      </div>
      {accounts.length === 0 && (
        <p className="py-2.5 text-sm text-slate-400">
          No activity in this period.
        </p>
      )}
      {accounts.map((acc, i) => (
        <div
          key={acc.code ?? acc.name ?? i}
          className="flex items-center justify-between border-b border-slate-100 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-16 shrink-0 text-xs tabular-nums text-slate-400">
              {acc.code ?? ""}
            </span>
            <span className="truncate text-sm text-slate-700">
              {acc.name ?? "Unknown"}
            </span>
          </div>
          <span className="text-sm tabular-nums text-slate-900">
            {fmtGmd(acc.displayAmount)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProfitAndLossPanel({
  data,
  isLoading,
}: {
  data: {
    revenue: {
      accounts: Array<{
        code?: string | null;
        name?: string | null;
        displayAmount: number;
      }>;
      total: number;
    };
    expenses: {
      accounts: Array<{
        code?: string | null;
        name?: string | null;
        displayAmount: number;
      }>;
      total: number;
    };
    netIncome: number;
  } | null;
  isLoading: boolean;
}) {
  if (isLoading) return <ModulePanelLoading rows={7} />;
  if (!data) {
    return (
      <ModulePanelEmpty
        icon={BarChart3}
        title="No posted entries for this period"
        description="The profit & loss statement is built from posted journal entries. Post entries or pick another period."
      />
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <h4 className="text-[13px] font-semibold text-slate-900">
          Profit & Loss
        </h4>
        <span className="text-[11px] text-slate-400">Posted entries</span>
      </div>
      <div className="px-4 pb-3">
        <StatementSection
          title="Revenue"
          accounts={data.revenue.accounts}
          total={data.revenue.total}
        />
        <StatementSection
          title="Expenses"
          accounts={data.expenses.accounts}
          total={data.expenses.total}
        />
        <div className="flex items-center justify-between py-3">
          <span className="text-sm font-semibold text-slate-900">
            Net Income
          </span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              data.netIncome >= 0 ? "text-emerald-600" : "text-red-600",
            )}
          >
            {fmtGmd(data.netIncome)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BalanceSheetPanel({
  data,
  isLoading,
}: {
  data: {
    assets: {
      accounts: Array<{
        code?: string | null;
        name?: string | null;
        displayAmount: number;
      }>;
      total: number;
    };
    liabilities: {
      accounts: Array<{
        code?: string | null;
        name?: string | null;
        displayAmount: number;
      }>;
      total: number;
    };
    equity: {
      accounts: Array<{
        code?: string | null;
        name?: string | null;
        displayAmount: number;
      }>;
      total: number;
    };
    isBalanced: boolean;
  } | null;
  isLoading: boolean;
}) {
  if (isLoading) return <ModulePanelLoading rows={7} />;
  if (!data) {
    return (
      <ModulePanelEmpty
        icon={PieChart}
        title="No posted entries for this period"
        description="The balance sheet is built from posted journal entries. Post entries or pick another period."
      />
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <h4 className="text-[13px] font-semibold text-slate-900">
          Balance Sheet
        </h4>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
            data.isBalanced
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700",
          )}
        >
          {data.isBalanced ? "Balanced" : "Out of balance"}
        </span>
      </div>
      <div className="px-4 pb-3">
        <StatementSection
          title="Assets"
          accounts={data.assets.accounts}
          total={data.assets.total}
        />
        <StatementSection
          title="Liabilities"
          accounts={data.liabilities.accounts}
          total={data.liabilities.total}
        />
        <StatementSection
          title="Equity"
          accounts={data.equity.accounts}
          total={data.equity.total}
        />
      </div>
    </div>
  );
}

function CashFlowPanel({
  data,
  isLoading,
}: {
  data: {
    period: string;
    openingCash: number;
    closingCash: number;
    netCashChange: number;
    operating: {
      lines: Array<{ accountName: string; amount: number }>;
      total: number;
    };
    investing: {
      lines: Array<{ accountName: string; amount: number }>;
      total: number;
    };
    financing: {
      lines: Array<{ accountName: string; amount: number }>;
      total: number;
    };
  } | null;
  isLoading: boolean;
}) {
  if (isLoading) return <ModulePanelLoading rows={6} />;
  if (!data) {
    return (
      <ModulePanelEmpty
        icon={Wallet}
        title="No cash flow data for this period"
        description="The cash flow statement is derived from posted journal entries for the selected period."
      />
    );
  }

  const section = (
    title: string,
    bucket: {
      lines: Array<{ accountName: string; amount: number }>;
      total: number;
    },
  ) => (
    <div>
      <div className="flex items-center justify-between border-b border-slate-200 py-2.5">
        <h4 className="text-[13px] font-semibold text-slate-900">{title}</h4>
        <span className="text-[13px] font-semibold tabular-nums text-slate-900">
          {fmtGmd(bucket.total)}
        </span>
      </div>
      {bucket.lines.length === 0 && (
        <p className="py-2 text-sm text-slate-400">No activity.</p>
      )}
      {bucket.lines.map((line, i) => (
        <div
          key={line.accountName + i}
          className="flex items-center justify-between border-b border-slate-100 py-1.5"
        >
          <span className="truncate text-sm text-slate-700">
            {line.accountName}
          </span>
          <span className="text-sm tabular-nums text-slate-900">
            {fmtGmd(line.amount)}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <h4 className="text-[13px] font-semibold text-slate-900">
          Cash Flow Statement
        </h4>
        <span className="text-[11px] tabular-nums text-slate-400">
          {data.period}
        </span>
      </div>
      <div className="px-4 pb-3">
        <div className="grid grid-cols-3 gap-3 border-b border-slate-200 py-3">
          <div>
            <p className="text-[11px] text-slate-400">Opening Cash</p>
            <p className="text-sm font-medium tabular-nums text-slate-900">
              {fmtGmd(data.openingCash)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Net Change</p>
            <p
              className={cn(
                "text-sm font-medium tabular-nums",
                data.netCashChange >= 0 ? "text-emerald-600" : "text-red-600",
              )}
            >
              {fmtGmd(data.netCashChange)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Closing Cash</p>
            <p className="text-sm font-medium tabular-nums text-slate-900">
              {fmtGmd(data.closingCash)}
            </p>
          </div>
        </div>
        {section("Operating Activities", data.operating)}
        {section("Investing Activities", data.investing)}
        {section("Financing Activities", data.financing)}
      </div>
    </div>
  );
}

function TrialBalancePanel({
  data,
  isLoading,
}: {
  data: {
    accounts: Array<{
      code?: string | null;
      name?: string | null;
      type?: string | null;
      debit: number;
      credit: number;
      balance: number;
    }>;
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  } | null;
  isLoading: boolean;
}) {
  if (isLoading) return <ModulePanelLoading rows={7} />;
  if (!data || data.accounts.length === 0) {
    return (
      <ModulePanelEmpty
        icon={Calculator}
        title="No posted entries for this period"
        description="The trial balance lists every account with posted activity for the selected period."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <h4 className="text-[13px] font-semibold text-slate-900">
          Trial Balance
        </h4>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
            data.isBalanced
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700",
          )}
        >
          {data.isBalanced ? "Balanced" : "Out of balance"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500">
                Account
              </th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500">
                Type
              </th>
              <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500">
                Debit
              </th>
              <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500">
                Credit
              </th>
              <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500">
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {data.accounts.map((acc) => (
              <tr
                key={acc.code ?? acc.name ?? ""}
                className="group relative border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <RowAiAction
                  focus={{
                    kind: "Account",
                    name: acc.name ?? acc.code ?? "Unknown",
                    id: acc.code ?? undefined,
                    fields: [
                      { label: "Code", value: acc.code ?? "—" },
                      { label: "Type", value: acc.type ?? "—" },
                      {
                        label: "Debit",
                        value: acc.debit.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }),
                      },
                      {
                        label: "Credit",
                        value: acc.credit.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }),
                      },
                      {
                        label: "Balance",
                        value: acc.balance.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }),
                      },
                    ],
                  }}
                />
                <td className="py-2.5 px-4">
                  <span className="mr-2 text-xs tabular-nums text-slate-400">
                    {acc.code ?? ""}
                  </span>
                  <span className="text-sm text-slate-800">
                    {acc.name ?? "Unknown"}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-sm capitalize text-slate-600">
                  {acc.type ?? "—"}
                </td>
                <td className="py-2.5 px-4 text-right text-sm tabular-nums text-slate-900">
                  {acc.debit.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="py-2.5 px-4 text-right text-sm tabular-nums text-slate-900">
                  {acc.credit.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="py-2.5 px-4 text-right text-sm tabular-nums text-slate-700">
                  {acc.balance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50">
              <td className="py-2.5 px-4 text-sm font-semibold text-slate-900">
                Total
              </td>
              <td />
              <td className="py-2.5 px-4 text-right text-sm font-semibold tabular-nums text-slate-900">
                {data.totalDebit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="py-2.5 px-4 text-right text-sm font-semibold tabular-nums text-slate-900">
                {data.totalCredit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetVsActualPanel({
  data,
  isLoading,
}: {
  data: {
    period: string;
    budgetName: string;
    totalBudgeted: number;
    totalActual: number;
    totalVariance: number;
    totalVariancePct: number;
    lines: Array<{
      accountCode: string;
      accountName: string;
      budgetedAmount: number;
      actualAmount: number;
      variance: number;
      variancePct: number;
      status: string;
    }>;
  } | null;
  isLoading: boolean;
}) {
  const statusColors: Record<string, string> = {
    on_track: "bg-emerald-100 text-emerald-700",
    approaching: "bg-amber-100 text-amber-700",
    exceeded: "bg-red-100 text-red-700",
    no_budget: "bg-slate-100 text-slate-600",
  };

  if (isLoading) return <ModulePanelLoading rows={6} />;
  if (!data || data.lines.length === 0) {
    return (
      <ModulePanelEmpty
        icon={TrendingUp}
        title="No budget lines for this period"
        description="Create a budget to compare planned amounts against actual spend per account."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <div>
          <h4 className="text-[13px] font-semibold text-slate-900">
            Budget vs Actual
          </h4>
          <p className="text-[11px] text-slate-400">
            {data.budgetName} · {data.period}
          </p>
        </div>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            data.totalVariance <= 0 ? "text-emerald-600" : "text-red-600",
          )}
        >
          {data.totalVariance >= 0 ? "+" : ""}
          {fmtGmd(data.totalVariance)} ({data.totalVariancePct}%)
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500">
                Account
              </th>
              <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500">
                Budgeted
              </th>
              <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500">
                Actual
              </th>
              <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500">
                Variance
              </th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line, i) => (
              <tr
                key={line.accountCode + i}
                className="group relative border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <RowAiAction
                  focus={{
                    kind: "Budget Line",
                    name: line.accountName,
                    id: line.accountCode ?? undefined,
                    fields: [
                      { label: "Code", value: line.accountCode },
                      {
                        label: "Budgeted",
                        value: fmtGmd(line.budgetedAmount),
                      },
                      {
                        label: "Actual",
                        value: fmtGmd(line.actualAmount),
                      },
                      {
                        label: "Variance",
                        value: `${line.variance > 0 ? "+" : ""}${fmtGmd(line.variance)} (${line.variancePct}%)`,
                      },
                      {
                        label: "Status",
                        value: line.status.replace("_", " "),
                      },
                    ],
                  }}
                />
                <td className="py-2.5 px-4">
                  <span className="mr-2 text-xs tabular-nums text-slate-400">
                    {line.accountCode}
                  </span>
                  <span className="text-sm text-slate-800">
                    {line.accountName}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right text-sm tabular-nums text-slate-700">
                  {fmtGmd(line.budgetedAmount)}
                </td>
                <td className="py-2.5 px-4 text-right text-sm tabular-nums text-slate-700">
                  {fmtGmd(line.actualAmount)}
                </td>
                <td
                  className={cn(
                    "py-2.5 px-4 text-right text-sm font-medium tabular-nums",
                    line.variance > 0 ? "text-red-600" : "text-emerald-600",
                  )}
                >
                  {line.variance > 0 ? "+" : ""}
                  {fmtGmd(line.variance)} ({line.variancePct}%)
                </td>
                <td className="py-2.5 px-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                      statusColors[line.status] ?? statusColors.on_track,
                    )}
                  >
                    {line.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaxComplianceCard({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Link2 className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">
        Tax & Compliance Reporting
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-5 text-slate-500">
        Track filing obligations, deadlines and tax positions for your
        jurisdiction in the dedicated Tax & Compliance workspace.
      </p>
      <button
        onClick={() => onNavigate("tax")}
        className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Open Tax & Compliance
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Bottom Row ────────────────────────────────────────────────────────────

function BottomRow({
  overview,
  expenseCategories,
  onNavigate,
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
  onNavigate: (tab: string) => void;
}) {
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
      {/* Financial Statements — honest navigation into the real statements */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-slate-900">
            Financial Statements
          </h4>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Generated from your posted general ledger entries.
        </p>
        <div className="space-y-1">
          {[
            { tab: "statements", label: "Profit & Loss", icon: BarChart3 },
            { tab: "statements", label: "Balance Sheet", icon: PieChart },
            {
              tab: "statements",
              label: "Cash Flow Statement",
              icon: Wallet,
            },
            { tab: "trial-balance", label: "Trial Balance", icon: Calculator },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.tab)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
            >
              <span className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-slate-400" />
                {item.label}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
            </button>
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

      {/* Balance Sheet Snapshot — real totals only */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-900">
            Balance Sheet Snapshot
          </h4>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-sm font-medium text-slate-900">
              Total Assets
            </span>
            <span className="text-sm font-bold tabular-nums text-slate-900">
              GMD {overview.totalAssets.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-sm font-medium text-slate-900">
              Total Liabilities
            </span>
            <span className="text-sm font-bold tabular-nums text-red-600">
              GMD {overview.totalLiabilities.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900">Equity</span>
            <span className="text-sm font-bold tabular-nums text-emerald-600">
              GMD {overview.totalEquity.toLocaleString()}
            </span>
          </div>
        </div>
        <button
          onClick={() => onNavigate("statements")}
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          View full balance sheet
          <ArrowRight className="h-3.5 w-3.5" />
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
              className="group relative border-b border-slate-100 last:border-0"
            >
              <RowAiAction
                focus={{
                  kind: "Report",
                  name: report.name,
                  id: report.id,
                  fields: [
                    { label: "Type", value: report.type },
                    {
                      label: "Generated",
                      value: new Date(report.dateGenerated).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      ),
                    },
                    { label: "By", value: report.generatedBy },
                    { label: "Format", value: report.format },
                  ],
                }}
              />
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
              <td className="py-3" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── AI Report Assistant Panel ─────────────────────────────────────────────

function AiReportAssistantPanel({
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
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

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

  // Fetch fiscal periods for the statement period picker
  const { data: periods } = trpc.reports.listPeriods.useQuery();

  // Default to the latest period (preferring open ones) once loaded.
  useEffect(() => {
    if (!selectedPeriodId && periods && periods.length > 0) {
      const open = periods.filter((p) => p.status === "open");
      const latest = [...(open.length > 0 ? open : periods)].sort((a, b) =>
        a.startDate < b.startDate ? 1 : -1,
      )[0];
      if (latest) setSelectedPeriodId(latest.id);
    }
  }, [periods, selectedPeriodId]);

  const statementsEnabled = activeTab === "statements" && !!selectedPeriodId;
  const { data: pnl, isLoading: pnlLoading } =
    trpc.reports.getProfitAndLoss.useQuery(
      { periodId: selectedPeriodId ?? undefined },
      { enabled: statementsEnabled },
    );
  const { data: balanceSheet, isLoading: bsLoading } =
    trpc.reports.getBalanceSheet.useQuery(
      { periodId: selectedPeriodId ?? undefined },
      { enabled: statementsEnabled },
    );
  const { data: cashFlow, isLoading: cashFlowLoading } =
    trpc.reports.getCashFlow.useQuery(
      { periodId: selectedPeriodId ?? "" },
      { enabled: statementsEnabled },
    );

  const { data: trialBalance, isLoading: tbLoading } =
    trpc.journal.getTrialBalance.useQuery(
      { periodId: selectedPeriodId ?? "" },
      { enabled: activeTab === "trial-balance" && !!selectedPeriodId },
    );

  const { data: budgetVsActual, isLoading: budgetLoading } =
    trpc.reports.getBudgetVsActual.useQuery(
      { periodId: selectedPeriodId ?? "" },
      { enabled: activeTab === "budget" && !!selectedPeriodId },
    );

  const handleNavigate = (tab: string) => setActiveTab(tab);

  const renderPanel = () => {
    switch (activeTab) {
      case "statements":
        return (
          <ModulePanel
            title="Financial Statements"
            description="Profit & loss, balance sheet and cash flow from posted entries."
            action={
              <PeriodPicker
                periods={periods ?? []}
                value={selectedPeriodId}
                onChange={setSelectedPeriodId}
              />
            }
          >
            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
              <ProfitAndLossPanel data={pnl ?? null} isLoading={pnlLoading} />
              <BalanceSheetPanel
                data={balanceSheet ?? null}
                isLoading={bsLoading}
              />
              <div className="lg:col-span-2">
                <CashFlowPanel
                  data={cashFlow ?? null}
                  isLoading={cashFlowLoading}
                />
              </div>
            </div>
          </ModulePanel>
        );
      case "trial-balance":
        return (
          <ModulePanel
            title="Trial Balance"
            description="Debits and credits per account for the selected period."
            action={
              <PeriodPicker
                periods={periods ?? []}
                value={selectedPeriodId}
                onChange={setSelectedPeriodId}
              />
            }
          >
            <div className="p-4">
              <TrialBalancePanel
                data={trialBalance ?? null}
                isLoading={tbLoading}
              />
            </div>
          </ModulePanel>
        );
      case "budget":
        return (
          <ModulePanel
            title="Budget vs Actual"
            description="Planned spend compared against actuals for the selected period."
            action={
              <PeriodPicker
                periods={periods ?? []}
                value={selectedPeriodId}
                onChange={setSelectedPeriodId}
              />
            }
          >
            <div className="p-4">
              <BudgetVsActualPanel
                data={budgetVsActual ?? null}
                isLoading={budgetLoading}
              />
            </div>
          </ModulePanel>
        );
      case "consolidation":
        return (
          <ModulePanel
            title="Consolidation"
            description="Combined financials across multiple entities."
          >
            <ModulePanelEmpty
              icon={Network}
              title="Consolidation is coming"
              description="Combine financial statements across entities for group-level reporting. Single-entity books are fully supported today."
            />
          </ModulePanel>
        );
      case "tax":
        return (
          <ModulePanel
            title="Tax & Compliance"
            description="Filing obligations and tax positions."
          >
            <div className="p-4">
              <TaxComplianceCard onNavigate={handleNavigate} />
            </div>
          </ModulePanel>
        );
      case "custom":
        return (
          <ModulePanel
            title="Custom Reports"
            description="Build your own report layouts."
          >
            <ModulePanelEmpty
              icon={Settings}
              title="Custom reports are coming"
              description="Design bespoke reports from your chart of accounts and journal data."
            />
          </ModulePanel>
        );
      default:
        // Overview
        return (
          <div className="space-y-6 p-4">
            {pnlData && overview && (
              <ProfitLossOverview pnlData={pnlData} overview={overview} />
            )}
            {overview && expenseCategories && (
              <BottomRow
                overview={overview}
                expenseCategories={expenseCategories}
                onNavigate={handleNavigate}
              />
            )}
            {recentReports && <RecentReports reports={recentReports} />}
          </div>
        );
    }
  };

  return (
    <ModulePageShell
      title="Reports"
      description="Financial insights and analytics for smarter decisions."
      icon={BarChart3}
      tabs={[
        { key: "overview", label: "Overview" },
        { key: "statements", label: "Financial Statements" },
        { key: "trial-balance", label: "Trial Balance" },
        { key: "consolidation", label: "Consolidation" },
        { key: "budget", label: "Budget" },
        { key: "tax", label: "Tax & Compliance" },
        { key: "custom", label: "Custom Reports" },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      summaryCards={overview ? buildSummaryCards(overview) : []}
    >
      {renderPanel()}
    </ModulePageShell>
  );
}
