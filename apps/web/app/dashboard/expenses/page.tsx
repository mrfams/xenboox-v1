"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Bot,
  MoreHorizontal,
  RefreshCw,
  Send,
  Plus,
  Upload,
  FileText,
  Clock,
  AlertCircle,
  TrendingUp,
  Receipt,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import type { SummaryCardItem } from "@/components/module/module-page-shell.types";

// ─── Types ─────────────────────────────────────────────────────────────────

type TabFilter = "all" | "draft" | "pending" | "approved" | "reimbursed";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function buildSummaryCards(overview: {
  totalExpenses: number;
  totalExpensesChange: number;
  totalReimbursed: number;
  totalReimbursedChange: number;
  pendingApproval: number;
  pendingCount: number;
  averageExpense: number;
  budgetPercent: number;
  budgetRemaining: number;
}): SummaryCardItem[] {
  const cards: SummaryCardItem[] = [
    {
      label: "Total Expenses (MTD)",
      value: `GMD ${overview.totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: overview.totalExpensesChange,
      icon: FileText,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Total Reimbursed (MTD)",
      value: `GMD ${overview.totalReimbursed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: overview.totalReimbursedChange,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Pending Approval",
      value: `GMD ${overview.pendingApproval.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${overview.pendingCount} expenses`,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Average Expense",
      value: `GMD ${overview.averageExpense.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: "Per expense",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Budget vs Actual",
      value: `${overview.budgetPercent}%`,
      subtitle: `GMD ${overview.budgetRemaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} left`,
      icon: Receipt,
      color: overview.budgetPercent > 90 ? "text-red-600" : "text-emerald-600",
      bgColor: overview.budgetPercent > 90 ? "bg-red-50" : "bg-emerald-50",
    },
  ];

  return cards;
}

// ─── Expense Table ─────────────────────────────────────────────────────────

function ExpenseTable({
  expenses,
  selectedId,
  onSelect,
  isLoading,
}: {
  expenses: Array<{
    id: string;
    date: string;
    description: string;
    category: string;
    vendor: string;
    amount: number;
    amountFormatted: string;
    paymentMethod: string;
    status: string;
    statusColor: string;
    hasReceipt: boolean;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  const categoryColors: Record<string, string> = {
    "Meals & Entertainment": "bg-pink-100 text-pink-700",
    Utilities: "bg-yellow-100 text-yellow-700",
    Travel: "bg-green-100 text-green-700",
    "Office Supplies": "bg-orange-100 text-orange-700",
    Software: "bg-purple-100 text-purple-700",
    Marketing: "bg-red-100 text-red-700",
    Maintenance: "bg-slate-100 text-slate-700",
    General: "bg-blue-100 text-blue-700",
  };

  const statusColors: Record<string, string> = {
    "Pending Approval": "bg-amber-100 text-amber-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Paid: "bg-emerald-100 text-emerald-700",
    Draft: "bg-slate-100 text-slate-600",
    Overdue: "bg-red-100 text-red-700",
  };

  const paymentMethodIcons: Record<string, { icon: string; color: string }> = {
    card: { icon: "VISA", color: "bg-blue-600 text-white" },
    bank_transfer: { icon: "BT", color: "bg-indigo-600 text-white" },
    cash: { icon: "$", color: "bg-emerald-600 text-white" },
    mobile_money: { icon: "MM", color: "bg-purple-600 text-white" },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left py-3 px-4">
              <input type="checkbox" className="rounded border-slate-300" />
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Date
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Expense
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Category
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Vendor / Merchant
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Amount (GMD)
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Payment Method
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Receipt
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr
              key={expense.id}
              onClick={() => onSelect(expense.id)}
              className={cn(
                "border-b border-slate-100 cursor-pointer transition-colors",
                selectedId === expense.id
                  ? "bg-indigo-50"
                  : "hover:bg-slate-50",
              )}
            >
              <td className="py-3 px-4">
                <input type="checkbox" className="rounded border-slate-300" />
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {new Date(expense.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className="py-3 px-4">
                <p className="text-sm font-medium text-slate-900">
                  {expense.description}
                </p>
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                    categoryColors[expense.category] || categoryColors.General,
                  )}
                >
                  {expense.category}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-slate-700">
                {expense.vendor}
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-sm font-medium text-slate-900">
                  {expense.amountFormatted}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {paymentMethodIcons[expense.paymentMethod] ? (
                    <div
                      className={cn(
                        "h-6 px-2 rounded flex items-center justify-center text-[10px] font-bold",
                        paymentMethodIcons[expense.paymentMethod].color,
                      )}
                    >
                      {paymentMethodIcons[expense.paymentMethod].icon}
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-600">
                        {expense.paymentMethod.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-slate-600 capitalize">
                    {expense.paymentMethod.replace("_", " ")}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                    statusColors[expense.status] || statusColors.Draft,
                  )}
                >
                  {expense.status}
                </span>
              </td>
              <td className="py-3 px-4">
                {expense.hasReceipt ? (
                  <div className="h-6 w-6 rounded bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                )}
              </td>
              <td className="py-3 px-4">
                <button className="p-1 hover:bg-slate-100 rounded">
                  <MoreHorizontal className="h-4 w-4 text-slate-400" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── AI Copilot Panel ──────────────────────────────────────────────────────

function AiCopilotPanel({
  insights,
  budgetOverview,
  topVendors: _topVendors,
}: {
  insights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
  budgetOverview: {
    hasBudget: boolean;
    categories: Array<{
      name: string;
      budget: number;
      budgetFormatted: string;
      percent: number;
      spent: number;
      spentFormatted: string;
    }>;
    overallPercent: number;
  };
  topVendors: Array<{
    name: string;
    total: number;
    totalFormatted: string;
  }>;
}) {
  const [message, setMessage] = useState("");

  const quickActions = [
    "Show expenses over budget",
    "Which categories are trending up?",
    "Find expenses without receipts",
    "How much did we spend on travel?",
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
              <h3 className="font-medium text-slate-900">Xenboox AI Copilot</h3>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                Beta
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* AI Insights */}
        <div>
          <p className="text-sm text-slate-600 mb-3">
            I&apos;ve analyzed your expenses and found a few insights.
          </p>
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
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-blue-600" />
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
            {quickActions.map((action, i) => (
              <button
                key={i}
                className="w-full text-left text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Budget Overview */}
        {budgetOverview.hasBudget && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-900">
                Budget Overview
              </h4>
              <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                View budget →
              </button>
            </div>
            <div className="space-y-3">
              {budgetOverview.categories.map((cat) => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600">{cat.name}</span>
                    <span className="text-xs text-slate-500">
                      {cat.percent}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          cat.percent > 90
                            ? "bg-red-500"
                            : cat.percent > 70
                              ? "bg-amber-500"
                              : "bg-emerald-500",
                        )}
                        style={{ width: `${Math.min(cat.percent, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 w-24 text-right">
                      GMD {cat.spent.toLocaleString()} /{" "}
                      {cat.budget.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">
                  Overall Budget
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {budgetOverview.overallPercent}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-3">
            Quick Actions
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200">
              <Plus className="h-4 w-4 text-indigo-600" />
              New Expense
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200">
              <Upload className="h-4 w-4 text-emerald-600" />
              Upload Receipt
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200">
              <FileText className="h-4 w-4 text-blue-600" />
              Bulk Import
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200">
              <Download className="h-4 w-4 text-purple-600" />
              Expense Report
            </button>
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
            placeholder="Ask anything about expenses..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Fetch overview
  const { data: overview } = trpc.expenses.getOverview.useQuery({});

  // Fetch tab counts
  const { data: tabCounts } = trpc.expenses.getTabCounts.useQuery({});

  // Fetch expenses
  const { data: expensesData, isLoading: expensesLoading } =
    trpc.expenses.listExpenses.useQuery({
      status: activeTab,
      search: searchQuery || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

  // Fetch budget overview
  const { data: budgetOverview } = trpc.expenses.getBudgetOverview.useQuery();

  // Fetch top vendors
  const { data: topVendors } = trpc.expenses.getTopVendors.useQuery({});

  // Fetch AI insights
  const { data: insights } = trpc.expenses.getAiInsights.useQuery();

  const tabs = [
    { key: "all" as TabFilter, label: "All Expenses", count: tabCounts?.all },
    { key: "draft" as TabFilter, label: "Draft", count: tabCounts?.draft },
    {
      key: "pending" as TabFilter,
      label: "Pending Approval",
      count: tabCounts?.pending,
    },
    {
      key: "approved" as TabFilter,
      label: "Approved",
      count: tabCounts?.approved,
    },
    {
      key: "reimbursed" as TabFilter,
      label: "Reimbursed",
      count: tabCounts?.reimbursed,
    },
  ];

  return (
    <ModulePageShell
      title="Expenses"
      description="Track, categorize and manage business expenses with AI."
      icon={Receipt}
      actions={
        <>
          <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4" />
            New Expense
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Upload className="h-4 w-4" />
            Import
          </button>
        </>
      }
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(key) => {
        setActiveTab(key as TabFilter);
        setPage(1);
      }}
      summaryCards={overview ? buildSummaryCards(overview) : []}
      filters={
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>All Categories</option>
            <option>Meals & Entertainment</option>
            <option>Utilities</option>
            <option>Travel</option>
            <option>Office Supplies</option>
            <option>Software</option>
            <option>Marketing</option>
          </select>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>All Payment Methods</option>
            <option>Card</option>
            <option>Bank Transfer</option>
            <option>Cash</option>
            <option>Mobile Money</option>
          </select>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>All Statuses</option>
            <option>Draft</option>
            <option>Pending Approval</option>
            <option>Approved</option>
            <option>Reimbursed</option>
          </select>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      }
      pagination={
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, expensesData?.totalCount ?? 0)} of{" "}
            {expensesData?.totalCount ?? 0} expenses
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded disabled:opacity-50"
            >
              ←
            </button>
            {Array.from(
              { length: Math.min(5, expensesData?.totalPages ?? 1) },
              (_, i) => i + 1,
            ).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded",
                  page === p
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                {p}
              </button>
            ))}
            <button className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded">
              ...
            </button>
            <button
              onClick={() =>
                setPage(Math.min(expensesData?.totalPages ?? 1, page + 1))
              }
              disabled={page === (expensesData?.totalPages ?? 1)}
              className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded disabled:opacity-50"
            >
              →
            </button>
            <select
              value={pageSize}
              onChange={() => setPage(1)}
              className="ml-4 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      }
    >
      <ExpenseTable
        expenses={expensesData?.expenses ?? []}
        selectedId={selectedExpenseId}
        onSelect={setSelectedExpenseId}
        isLoading={expensesLoading}
      />
    </ModulePageShell>
  );
}
