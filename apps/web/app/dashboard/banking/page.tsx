"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Download,
  MoreHorizontal,
  Building2,
  Wallet,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Clock,
  FileText,
  Eye,
  Shield,
  TrendingUp,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  PageEmptyState,
  getPageEmptyState,
} from "@/components/shared/page-empty-state";
import {
  realtimeQueryOptions,
  analyticsQueryOptions,
} from "@/lib/trpc/query-options";
import { ModulePageShell } from "@/components/module/module-page-shell";
import type {
  SummaryCardItem,
  TabItem,
} from "@/components/module/module-page-shell.types";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  summary,
}: {
  summary: {
    totalBalance: number;
    totalBalanceChange: number;
    accountCount: number;
    activeAccounts: number;
    inactiveAccounts: number;
    unreconciledBalance: number;
    unreconciledAccounts: number;
    lastSyncAt: string | null;
  };
}) {
  const cards: SummaryCardItem[] = [
    {
      label: "Total Cash Balance",
      value: `GMD ${summary.totalBalance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      change: summary.totalBalanceChange,
      subtitle: `Across ${summary.accountCount} accounts`,
      icon: Wallet,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Accounts",
      value: summary.accountCount.toString(),
      subtitle: `${summary.activeAccounts} active · ${summary.inactiveAccounts} inactive`,
      icon: Building2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Unreconciled Balance",
      value: `GMD ${summary.unreconciledBalance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtitle: `${summary.unreconciledAccounts} accounts`,
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Last Updated",
      value: formatTimeAgo(summary.lastSyncAt),
      subtitle: summary.lastSyncAt
        ? new Date(summary.lastSyncAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "No sync yet",
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
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
          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          {card.change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-sm text-emerald-600">{card.change}%</span>
              <span className="text-xs text-slate-400">vs last month</span>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Bank Accounts Table ───────────────────────────────────────────────────

function BankAccountsTable({
  accounts,
  selectedId,
  onSelect,
  isLoading,
}: {
  accounts: Array<{
    id: string;
    name: string;
    maskedNumber: string;
    bankName: string;
    type: string;
    currency: string;
    currentBalance: string;
    isActive: boolean;
    lastTransactionDate: string | null;
    transactionCount: number;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  const bankColors: Record<string, string> = {
    "GTBank Gambia Ltd": "bg-red-500",
    "Access Bank Gambia": "bg-blue-600",
    "Standard Chartered": "bg-green-600",
    "UBA Gambia": "bg-red-600",
    "Cash Account": "bg-purple-500",
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
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Bank / Institution
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account Type
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Currency
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Balance
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Unreconciled
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Last Sync
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const balance = parseFloat(account.currentBalance ?? "0");
            const bankColor = bankColors[account.bankName] ?? "bg-slate-400";

            return (
              <tr
                key={account.id}
                onClick={() => onSelect(account.id)}
                className={cn(
                  "border-b border-slate-100 cursor-pointer transition-colors",
                  selectedId === account.id
                    ? "bg-indigo-50"
                    : "hover:bg-slate-50",
                )}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {account.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {account.maskedNumber}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-6 w-6 rounded flex items-center justify-center",
                        bankColor,
                      )}
                    >
                      <Building2 className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm text-slate-700">
                      {account.bankName}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-700 capitalize">
                    {account.type}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-700">
                    {account.currency}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-medium text-slate-900">
                    {balance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={cn(
                      "text-sm",
                      account.isActive ? "text-slate-900" : "text-slate-400",
                    )}
                  >
                    {account.isActive ? "0.00" : "—"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-sm",
                      account.isActive ? "text-emerald-600" : "text-slate-400",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        account.isActive ? "bg-emerald-500" : "bg-slate-300",
                      )}
                    />
                    {account.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-500">
                    {account.lastTransactionDate
                      ? formatTimeAgo(account.lastTransactionDate)
                      : "—"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button className="p-1 hover:bg-slate-100 rounded">
                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Cash Position Chart ───────────────────────────────────────────────────

function CashPositionChart({
  data,
}: {
  data: {
    dailyBalances: Record<string, number>;
    currentBalance: number;
    incoming: number;
    outgoing: number;
    netChange: number;
  };
}) {
  const maxBalance = Math.max(
    ...Object.values(data.dailyBalances),
    data.currentBalance,
  );
  const minBalance = Math.min(...Object.values(data.dailyBalances), 0);
  const range = maxBalance - minBalance || 1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">
          Cash Position (This Month)
        </h3>
        <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          View in Report
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Chart */}
        <div className="h-48 flex items-end gap-1">
          {Object.entries(data.dailyBalances)
            .slice(-10)
            .map(([date, balance]) => {
              const height = ((balance - minBalance) / range) * 100;
              return (
                <div
                  key={date}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-indigo-500 rounded-t"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  />
                  <span className="text-[10px] text-slate-400">
                    {new Date(date).getDate()}
                  </span>
                </div>
              );
            })}
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div>
            <p className="text-2xl font-bold text-slate-900">
              GMD {data.currentBalance.toLocaleString()}
            </p>
            <p className="text-sm text-slate-500">Current Balance</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Incoming</span>
              <span className="font-medium text-emerald-600">
                GMD {data.incoming.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Outgoing</span>
              <span className="font-medium text-red-600">
                GMD {data.outgoing.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Net Change</span>
              <span
                className={cn(
                  "font-medium",
                  data.netChange >= 0 ? "text-emerald-600" : "text-red-600",
                )}
              >
                GMD {data.netChange.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Balance by Currency ───────────────────────────────────────────────────

function BalanceByCurrency({
  data,
}: {
  data: Array<{
    currency: string;
    balance: number;
    percentage: number;
  }>;
}) {
  const totalBalance = data.reduce((sum, d) => sum + d.balance, 0);

  const colors: Record<string, string> = {
    GMD: "bg-indigo-500",
    USD: "bg-emerald-500",
    EUR: "bg-blue-500",
    GBP: "bg-purple-500",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">Balance by Currency</h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {data.map((item, i) => {
              const startAngle = data
                .slice(0, i)
                .reduce((sum, d) => sum + d.percentage * 3.6, 0);
              const endAngle = startAngle + item.percentage * 3.6;
              const largeArc = item.percentage > 50 ? 1 : 0;
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              const x1 = 50 + 40 * Math.cos(startRad);
              const y1 = 50 + 40 * Math.sin(startRad);
              const x2 = 50 + 40 * Math.cos(endRad);
              const y2 = 50 + 40 * Math.sin(endRad);
              const x3 = 50 + 25 * Math.cos(endRad);
              const y3 = 50 + 25 * Math.sin(endRad);
              const x4 = 50 + 25 * Math.cos(startRad);
              const y4 = 50 + 25 * Math.sin(startRad);

              const colorClass = colors[item.currency] ?? "bg-slate-400";
              const fillColor =
                colorClass === "bg-indigo-500"
                  ? "#6366f1"
                  : colorClass === "bg-emerald-500"
                    ? "#10b981"
                    : colorClass === "bg-blue-500"
                      ? "#3b82f6"
                      : "#8b5cf6";

              return (
                <path
                  key={item.currency}
                  d={`M ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A 25 25 0 ${largeArc} 0 ${x4} ${y4} Z`}
                  fill={fillColor}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-lg font-bold text-slate-900">1.24M</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {data.map((item) => {
            const colorClass = colors[item.currency] ?? "bg-slate-400";
            return (
              <div
                key={item.currency}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("h-3 w-3 rounded", colorClass)} />
                  <span className="text-sm text-slate-700">
                    {item.currency}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-slate-900">
                    {item.balance.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-slate-300" />
                <span className="text-sm text-slate-700">Unreconciled</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-slate-900">
                  {(totalBalance * 0.039).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 ml-2">3.9%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-sm text-slate-500">
          Primary Currency:{" "}
          <span className="font-medium text-slate-900">GMD</span>
        </p>
      </div>
    </div>
  );
}

// ─── AI Copilot Panel ──────────────────────────────────────────────────────

function AiCopilotPanel({
  insights,
  recentActivity,
  connections,
}: {
  insights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
  recentActivity: Array<{
    id: string;
    bankName: string;
    accountName: string;
    action: string;
    date: string;
  }>;
  connections: Array<{
    id: string;
    name: string;
    accountName: string;
  }>;
}) {
  const [message, setMessage] = useState("");

  const quickQuestions = [
    "Why is the balance lower this month?",
    "Show me large transactions this week",
    "Which account has unreconciled items?",
    "Forecast my cash for next 30 days",
  ];

  const bankColors: Record<string, string> = {
    "GTBank Gambia Ltd": "bg-red-500",
    "Access Bank Gambia": "bg-blue-600",
    "Standard Chartered": "bg-green-600",
    "UBA Gambia": "bg-red-600",
  };

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
          <div className="flex items-center gap-2">
            <button className="text-slate-400 hover:text-slate-600">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Greeting */}
        <div>
          <p className="text-lg font-medium text-slate-900">
            Good morning, Famara 👋
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Here&apos;s your banking overview for today.
          </p>
        </div>

        {/* AI Insights */}
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
                    <Clock className="h-3 w-3 text-blue-600" />
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

        {/* Recent Activity */}
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-3">
            Recent Activity
          </h4>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {activity.action}
                  </p>
                  <p className="text-xs text-slate-500">
                    {activity.bankName} · {activity.accountName}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {formatTimeAgo(activity.date)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Connected Banks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Connected Banks</h4>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              Manage
            </button>
          </div>
          <div className="flex items-center gap-2">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  bankColors[conn.name] ?? "bg-slate-400",
                )}
              >
                <Building2 className="h-5 w-5 text-white" />
              </div>
            ))}
            <button className="h-10 w-10 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-indigo-400 transition-colors">
              <Plus className="h-5 w-5 text-slate-400" />
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
            placeholder="Ask anything..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700">
            <Bot className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper Functions ──────────────────────────────────────────────────────

function formatTimeAgo(date: Date | string | null) {
  if (!date) return "Never";
  const now = new Date();
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function BankingPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  const { data: overviewData, isLoading: overviewLoading } =
    trpc.banking.getOverview.useQuery(undefined, realtimeQueryOptions);

  const { data: cashPosition } = trpc.banking.getCashPosition.useQuery(
    {},
    realtimeQueryOptions,
  );

  const { data: aiInsights } = trpc.banking.getAiInsights.useQuery(
    undefined,
    analyticsQueryOptions,
  );

  const { data: recentActivity } = trpc.banking.getRecentActivity.useQuery(
    undefined,
    realtimeQueryOptions,
  );

  const tabs: TabItem[] = [
    { key: "overview", label: "Overview" },
    { key: "accounts", label: "Accounts" },
    { key: "transactions", label: "Transactions" },
    { key: "cash", label: "Cash Management" },
    { key: "mobile-money", label: "Mobile Money" },
    { key: "rules", label: "Rules" },
    { key: "connections", label: "Connections" },
    { key: "statements", label: "Statements" },
    { key: "settings", label: "Settings" },
  ];

  const summaryCards = overviewData?.summary
    ? [
        {
          label: "Total Cash Balance",
          value: `GMD ${overviewData.summary.totalBalance.toLocaleString(
            "en-US",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )}`,
          change: overviewData.summary.totalBalanceChange,
          subtitle: `Across ${overviewData.summary.accountCount} accounts`,
          icon: Wallet,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50",
        },
        {
          label: "Accounts",
          value: overviewData.summary.accountCount.toString(),
          subtitle: `${overviewData.summary.activeAccounts} active · ${overviewData.summary.inactiveAccounts} inactive`,
          icon: Building2,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
        },
        {
          label: "Unreconciled Balance",
          value: `GMD ${overviewData.summary.unreconciledBalance.toLocaleString(
            "en-US",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )}`,
          subtitle: `${overviewData.summary.unreconciledAccounts} accounts`,
          icon: AlertTriangle,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
        },
        {
          label: "Last Updated",
          value: formatTimeAgo(overviewData.summary.lastSyncAt),
          subtitle: overviewData.summary.lastSyncAt
            ? new Date(overviewData.summary.lastSyncAt).toLocaleString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )
            : "No sync yet",
          icon: Clock,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
      ]
    : [];

  const filters = (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search accounts..."
          className="rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
      <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <option>All Status</option>
        <option>Active</option>
        <option>Inactive</option>
      </select>
      <div className="flex items-center gap-1 border border-slate-200 rounded-lg">
        <button className="p-2 hover:bg-slate-50 rounded-l-lg">
          <Eye className="h-4 w-4 text-slate-600" />
        </button>
        <button className="p-2 hover:bg-slate-50 rounded-r-lg border-l border-slate-200">
          <FileText className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </div>
  );

  const pagination = (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-500">
        Showing 1 to {overviewData?.accounts.length ?? 0} of{" "}
        {overviewData?.accounts.length ?? 0} accounts
      </p>
    </div>
  );

  const badge = (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <Shield className="h-3 w-3" />
      Secure
    </span>
  );

  const actions = (
    <>
      <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
        <Plus className="h-4 w-4" />
        Connect Bank
      </button>
      <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <Download className="h-4 w-4" />
        Import Statement
      </button>
      <button className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50">
        <MoreHorizontal className="h-4 w-4 text-slate-600" />
      </button>
    </>
  );

  return (
    <ModulePageShell
      title="Banking"
      description="Connect, monitor, and manage all your bank accounts in one place."
      icon={Building2}
      iconBgClassName="bg-gradient-to-br from-indigo-500 to-purple-500"
      badge={badge}
      actions={actions}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      summaryCards={summaryCards}
      filters={filters}
      pagination={pagination}
      bottomCharts={
        <div className="grid grid-cols-2 gap-6">
          {cashPosition && <CashPositionChart data={cashPosition} />}
          {overviewData?.currencyBreakdown && (
            <BalanceByCurrency data={overviewData.currencyBreakdown} />
          )}
        </div>
      }
    >
      <BankAccountsTable
        accounts={overviewData?.accounts ?? []}
        selectedId={selectedAccountId}
        onSelect={setSelectedAccountId}
        isLoading={overviewLoading}
      />
    </ModulePageShell>
  );
}
