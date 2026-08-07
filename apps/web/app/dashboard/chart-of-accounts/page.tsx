"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Download,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Bot,
  RefreshCw,
  Send,
  Filter,
  Settings,
  FileText,
  Layers,
  BarChart3,
  AlertCircle,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type TabType = "all" | "groups" | "types" | "tags" | "rules" | "map";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  summary,
}: {
  summary: {
    totalAccounts: number;
    detailAccounts: number;
    headerAccounts: number;
    recentlyAdded: number;
    unusedAccounts: number;
  };
}) {
  const cards = [
    {
      label: "Total Accounts",
      value: summary.totalAccounts.toString(),
      subtitle: "Active accounts",
      icon: BookOpen,
      color: "text-indigo-600",
      iconBg: "bg-indigo-100",
    },
    {
      label: "Detail Accounts",
      value: summary.detailAccounts.toString(),
      subtitle: "Posting accounts",
      icon: FileText,
      color: "text-emerald-600",
      iconBg: "bg-emerald-100",
    },
    {
      label: "Header Accounts",
      value: summary.headerAccounts.toString(),
      subtitle: "Non-posting accounts",
      icon: Layers,
      color: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      label: "Recently Added",
      value: summary.recentlyAdded.toString(),
      subtitle: "This month",
      icon: Plus,
      color: "text-purple-600",
      iconBg: "bg-purple-100",
    },
    {
      label: "Unused Accounts",
      value: summary.unusedAccounts.toString(),
      subtitle: "No transactions",
      icon: AlertCircle,
      color: "text-amber-600",
      iconBg: "bg-amber-100",
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
            <div className={cn("rounded-lg p-2", card.iconBg)}>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Account Tree Table ────────────────────────────────────────────────────

function AccountTreeTable({
  accounts,
  expandedIds,
  onToggle,
  isLoading,
}: {
  accounts: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
    subtype: string;
    parentId: string | null;
    isActive: boolean;
    createdAt: string | null;
    children: Array<{
      id: string;
      code: string;
      name: string;
      type: string;
      subtype: string;
      parentId: string | null;
      isActive: boolean;
      createdAt: string | null;
      children: Array<{
        id: string;
        code: string;
        name: string;
        type: string;
        subtype: string;
        parentId: string | null;
        isActive: boolean;
        createdAt: string | null;
      }>;
    }>;
  }>;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  isLoading: boolean;
}) {
  const typeColors: Record<string, string> = {
    asset: "bg-emerald-100 text-emerald-700",
    liability: "bg-red-100 text-red-700",
    equity: "bg-blue-100 text-blue-700",
    revenue: "bg-purple-100 text-purple-700",
    expense: "bg-amber-100 text-amber-700",
  };

  const typeLabels: Record<string, string> = {
    Header: "Header",
    Detail: "Detail",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  const renderRow = (account: any, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedIds.has(account.id);
    const isHeader = hasChildren;

    return (
      <tr
        key={account.id}
        className="border-b border-slate-100 hover:bg-slate-50"
      >
        <td className="py-2 px-4">
          <div
            className="flex items-center"
            style={{ paddingLeft: `${level * 24}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => onToggle(account.id)}
                className="mr-2 p-1 hover:bg-slate-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
              </button>
            ) : (
              <span className="mr-2 w-6" />
            )}
            <span className="text-sm font-medium text-slate-700">
              {account.code}
            </span>
          </div>
        </td>
        <td className="py-2 px-4">
          <span
            className={cn(
              "text-sm font-semibold",
              isHeader ? "text-slate-900 uppercase" : "text-slate-700",
            )}
          >
            {account.name}
          </span>
        </td>
        <td className="py-2 px-4">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              isHeader
                ? "bg-indigo-100 text-indigo-700"
                : "bg-emerald-100 text-emerald-700",
            )}
          >
            {isHeader ? "Header" : "Detail"}
          </span>
        </td>
        <td className="py-2 px-4 text-sm text-slate-600">
          {account.parentId ? "1 - ASSETS" : "—"}
        </td>
        <td className="py-2 px-4 text-sm text-slate-600">GMD</td>
        <td className="py-2 px-4">
          <span className="inline-flex items-center gap-1 text-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-600">Active</span>
          </span>
        </td>
        <td className="py-2 px-4 text-sm text-slate-500">
          {account.createdAt
            ? new Date(account.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </td>
        <td className="py-2 px-4">
          <button className="p-1 hover:bg-slate-100 rounded">
            <MoreHorizontal className="h-4 w-4 text-slate-400" />
          </button>
        </td>
      </tr>
    );
  };

  const renderRows = (accounts: any[], level: number = 0) => {
    return accounts.flatMap((account) => {
      const rows = [renderRow(account, level)];
      if (expandedIds.has(account.id) && account.children) {
        rows.push(...renderRows(account.children, level + 1));
      }
      return rows;
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account Code
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account Name
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account Type
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Parent Account
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Currency
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Last Activity
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>{renderRows(accounts)}</tbody>
      </table>
    </div>
  );
}

// ─── Account Composition ───────────────────────────────────────────────────

function AccountComposition({
  composition,
}: {
  composition: Array<{ type: string; count: number; percentage: number }>;
}) {
  const colors: Record<string, string> = {
    Asset: "bg-emerald-500",
    Liability: "bg-red-500",
    Equity: "bg-blue-500",
    Revenue: "bg-purple-500",
    Expense: "bg-amber-500",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-medium text-slate-900 mb-4">Account Composition</h3>
      <div className="space-y-3">
        {composition.map((item) => (
          <div key={item.type} className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-20">{item.type}</span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  colors[item.type] ?? "bg-slate-400",
                )}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            <span className="text-sm text-slate-600 w-32 text-right">
              {item.count} accounts ({item.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recent Activity ───────────────────────────────────────────────────────

function RecentActivity({
  activities,
}: {
  activities: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string | null;
  }>;
}) {
  const actionIcons: Record<string, React.ElementType> = {
    "ar.createCustomer": Plus,
    "ar.updateCustomer": RefreshCw,
    "ar.createInvoice": FileText,
    "journal_entry.post": CheckCircle2,
  };

  const actionLabels: Record<string, string> = {
    "ar.createCustomer": "New account added",
    "ar.updateCustomer": "Account updated",
    "ar.createInvoice": "Account merged",
    "journal_entry.post": "Account posted",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">Recent Activity</h3>
        <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          View all →
        </button>
      </div>
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = actionIcons[activity.action] || FileText;
          const label = actionLabels[activity.action] || activity.action;

          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mt-0.5">
                <Icon className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-700">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activity.createdAt
                    ? new Date(activity.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Unknown"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI Copilot Panel ──────────────────────────────────────────────────────

function AiCopilotPanel({
  insights,
  healthScore,
}: {
  insights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
  healthScore: {
    score: number;
    wellStructured: number;
    needsImprovement: number;
    unbalanced: number;
  };
}) {
  const [message, setMessage] = useState("");

  const quickQuestions = [
    "Suggest accounts for a retail business",
    "Find duplicate or similar accounts",
    "Identify unused accounts",
    "Explain this account structure",
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
          <button className="text-slate-400 hover:text-slate-600">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Greeting */}
        <div>
          <p className="text-sm text-slate-500">
            How can I help you with your chart of accounts?
          </p>
        </div>

        {/* Quick Questions */}
        <div className="space-y-2">
          {quickQuestions.map((question, i) => (
            <button
              key={i}
              className="w-full text-left rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <div className="h-5 w-5 rounded bg-indigo-100 flex items-center justify-center">
                <Bot className="h-3 w-3 text-indigo-600" />
              </div>
              {question}
            </button>
          ))}
        </div>

        {/* AI Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">AI Insights</h4>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all insights →
            </button>
          </div>
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  "rounded-lg border p-3",
                  insight.type === "warning"
                    ? "border-amber-200 bg-amber-50"
                    : insight.type === "success"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-blue-200 bg-blue-50",
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center mt-0.5",
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
                      <Bot className="h-3 w-3 text-blue-600" />
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
                      {insight.actionLabel}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Account Structure Health */}
        <div>
          <h4 className="font-medium text-slate-900 mb-3">
            Account Structure Health
          </h4>
          <div className="flex items-center gap-4">
            {/* Donut Chart */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeDasharray={`${healthScore.score * 2.51} 251`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-lg font-bold text-slate-900">
                  {healthScore.score}
                </p>
                <p className="text-[10px] text-slate-500">Excellent</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded bg-emerald-500" />
                  <span className="text-xs text-slate-600">
                    Well Structured
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-900">
                  {healthScore.wellStructured}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded bg-amber-500" />
                  <span className="text-xs text-slate-600">
                    Needs Improvement
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-900">
                  {healthScore.needsImprovement}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded bg-red-500" />
                  <span className="text-xs text-slate-600">Unbalanced</span>
                </div>
                <span className="text-xs font-medium text-slate-900">
                  {healthScore.unbalanced}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="font-medium text-slate-900 mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Plus className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-slate-900">
                  Add Account Group
                </p>
                <p className="text-xs text-slate-500">
                  Create a new account group
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
            <button className="w-full flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Download className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-slate-900">
                  Import Chart of Accounts
                </p>
                <p className="text-xs text-slate-500">
                  Import from file or other system
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
            <button className="w-full flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-slate-900">
                  Export Chart of Accounts
                </p>
                <p className="text-xs text-slate-500">Export to Excel / PDF</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
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
            placeholder="Ask anything about your accounts..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          AI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ChartOfAccountsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(["1", "1.1", "1.2"]),
  );

  // Fetch overview data
  const { data: overviewData, isLoading: overviewLoading } =
    trpc.chartOfAccounts.getOverview.useQuery();

  // Fetch AI insights
  const { data: aiInsights } = trpc.chartOfAccounts.getAiInsights.useQuery();

  const tabs = [
    { key: "all" as TabType, label: "All Accounts" },
    { key: "groups" as TabType, label: "Account Groups" },
    { key: "types" as TabType, label: "Account Types" },
    { key: "tags" as TabType, label: "Account Tags" },
    { key: "rules" as TabType, label: "Account Rules" },
    { key: "map" as TabType, label: "Account Map" },
  ];

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">
                    Chart of Accounts
                  </h1>
                  <button className="text-slate-400 hover:text-slate-600">
                    <AlertCircle className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-500">
                  Manage your accounts structure and classifications.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                <Plus className="h-4 w-4" />
                New Account
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Download className="h-4 w-4" />
                Import
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                More
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.key
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        {overviewData?.summary && (
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <SummaryCards summary={overviewData.summary} />
          </div>
        )}

        {/* Search and Filters */}
        <div className="p-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>All Account Types</option>
              <option>Asset</option>
              <option>Liability</option>
              <option>Equity</option>
              <option>Revenue</option>
              <option>Expense</option>
            </select>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>All Tags</option>
            </select>
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <button className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50">
              <Settings className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Account Tree Table */}
        <div className="flex-1 overflow-auto bg-white">
          <AccountTreeTable
            accounts={overviewData?.accountTree ?? []}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            isLoading={overviewLoading}
          />
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing 1 to {overviewData?.accountsWithStats.length ?? 0} of{" "}
              {(overviewData?.summary.totalAccounts ?? 0).toLocaleString()}{" "}
              accounts
            </p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, "...", 17].map((p, i) => (
                <button
                  key={i}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded",
                    p === 1
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {p}
                </button>
              ))}
              <select className="ml-4 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-6">
            {overviewData?.composition && (
              <AccountComposition composition={overviewData.composition} />
            )}
            {overviewData?.recentActivity && (
              <RecentActivity activities={overviewData.recentActivity} />
            )}
          </div>
        </div>
      </div>

      {/* Right AI Copilot Panel */}
      <div className="w-[360px]">
        <AiCopilotPanel
          insights={aiInsights ?? []}
          healthScore={
            overviewData?.accountStructureHealth ?? {
              score: 0,
              wellStructured: 0,
              needsImprovement: 0,
              unbalanced: 0,
            }
          }
        />
      </div>
    </div>
  );
}
