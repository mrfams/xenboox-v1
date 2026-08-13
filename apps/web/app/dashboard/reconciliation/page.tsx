"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Bot,
  TrendingUp,
  TrendingDown,
  Eye,
  Settings,
  FileText,
  BarChart3,
  ArrowRight,
  Building2,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { CreateReconciliationDialog } from "@/components/dashboard/create-reconciliation-dialog";
import { RowActionsMenu } from "@/components/module/row-actions-menu";
import { DocumentUploadButton } from "@/components/module/document-upload-button";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";
import { RowAiAction } from "@/components/module/row-ai-action";
import { ModulePageCopilot } from "@/components/module/module-page-copilot";
import {
  ModuleAiProvider,
  useModuleAi,
} from "@/components/module/module-ai-context";
import type { PageContextPayload } from "@/lib/chat/page-context";

// ─── Types ─────────────────────────────────────────────────────────────────

type TabType =
  | "overview"
  | "bank_accounts"
  | "reconciliations"
  | "discrepancies"
  | "rules"
  | "reports"
  | "settings";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  summary,
}: {
  summary: {
    totalAccounts: number;
    activeAccounts: number;
    totalReconciledMTD: number;
    unreconciledMTD: number;
    reconciliationRate: number;
    openDiscrepancies: number;
  };
}) {
  const cards = [
    {
      label: "Total Accounts",
      value: summary.totalAccounts.toString(),
      subtitle: `${summary.activeAccounts} Active bank accounts`,
      icon: Building2,
      color: "text-indigo-600",
      iconBg: "bg-indigo-100",
    },
    {
      label: "Total Reconciled (MTD)",
      value: `GMD ${summary.totalReconciledMTD.toLocaleString()}`,
      change: 18.6,
      icon: CheckCircle2,
      color: "text-emerald-600",
      iconBg: "bg-emerald-100",
    },
    {
      label: "Unreconciled (MTD)",
      value: `GMD ${summary.unreconciledMTD.toLocaleString()}`,
      change: -12.3,
      icon: AlertTriangle,
      color: "text-amber-600",
      iconBg: "bg-amber-100",
    },
    {
      label: "Reconciliation Rate",
      value: `${summary.reconciliationRate}%`,
      change: 3.7,
      icon: TrendingUp,
      color: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      label: "Open Discrepancies",
      value: summary.openDiscrepancies.toString(),
      subtitle: "Needs attention",
      icon: AlertTriangle,
      color: "text-purple-600",
      iconBg: "bg-purple-100",
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
          {card.change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {card.change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-emerald-500" />
              )}
              <span
                className={cn(
                  "text-sm",
                  card.change >= 0 ? "text-emerald-600" : "text-emerald-600",
                )}
              >
                {card.change >= 0 ? "+" : ""}
                {card.change}%
              </span>
              <span className="text-xs text-slate-400">vs last month</span>
            </div>
          )}
          {card.subtitle && (
            <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Account Table ─────────────────────────────────────────────────────────

function AccountTable({
  accounts,
  selectedId,
  onSelect,
  isLoading,
}: {
  accounts: Array<{
    id: string;
    name: string;
    accountNumber: string;
    bankName: string;
    type: string;
    bookBalance: number;
    bankBalance: number;
    difference: number;
    status: string;
    lastReconciled: string | null;
    lastReconciledBy: string | null;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  const statusColors: Record<string, string> = {
    Reconciled: "bg-emerald-100 text-emerald-700",
    Unreconciled: "bg-red-100 text-red-700",
    "Not Required": "bg-slate-100 text-slate-600",
  };

  const bankColors: Record<string, string> = {
    "Access Bank": "bg-blue-600",
    GTBank: "bg-red-500",
    "Africell Money": "bg-amber-500",
    "Standard Chartered": "bg-green-600",
    Visa: "bg-slate-600",
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
            <th className="text-left py-3 px-4">
              <input type="checkbox" className="rounded border-slate-300" />
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account Number
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Bank
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Book Balance
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Bank Balance
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Difference
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Reconciliation Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Last Reconciled
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const bankColor = bankColors[account.bankName] ?? "bg-slate-400";
            const initials = account.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase();

            return (
              <tr
                key={account.id}
                onClick={() => onSelect(account.id)}
                className={cn(
                  "group relative border-b border-slate-100 cursor-pointer transition-colors",
                  selectedId === account.id
                    ? "bg-indigo-50"
                    : "hover:bg-slate-50",
                )}
              >
                <RowAiAction
                  focus={{
                    kind: "Bank Account",
                    name: account.name,
                    id: account.id,
                    fields: [
                      { label: "Type", value: account.type },
                      {
                        label: "Account number",
                        value:
                          account.accountNumber.length > 8
                            ? `•••• •••• ${account.accountNumber.slice(-4)}`
                            : account.accountNumber,
                      },
                      { label: "Bank", value: account.bankName },
                      {
                        label: "Book balance",
                        value: `GMD ${account.bookBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                      },
                      {
                        label: "Difference",
                        value:
                          account.difference === 0
                            ? "GMD 0.00"
                            : `GMD ${Math.abs(account.difference).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                      },
                      { label: "Status", value: account.status },
                    ],
                  }}
                />
                <td className="py-3 px-4">
                  <input type="checkbox" className="rounded border-slate-300" />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold",
                        bankColor,
                      )}
                    >
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {account.name}
                      </p>
                      <p className="text-xs text-slate-400">{account.type}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {account.accountNumber.length > 8
                    ? `•••• •••• ${account.accountNumber.slice(-4)}`
                    : account.accountNumber}
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
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-medium text-slate-900">
                    GMD{" "}
                    {account.bookBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm text-slate-600">
                    {account.bankBalance > 0
                      ? `GMD ${account.bankBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                      : "N/A"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      account.difference === 0
                        ? "text-slate-900"
                        : "text-red-600",
                    )}
                  >
                    {account.difference === 0
                      ? "GMD 0.00"
                      : `GMD ${Math.abs(account.difference).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                      statusColors[account.status] || statusColors.Reconciled,
                    )}
                  >
                    {account.status === "Reconciled" && (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    {account.status === "Unreconciled" && (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {account.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {account.lastReconciled ? (
                    <div>
                      <p className="text-sm text-slate-600">
                        {new Date(account.lastReconciled).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        by {account.lastReconciledBy ?? "AI Agent"}
                      </p>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="View account"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(account.id);
                      }}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <Eye className="h-4 w-4 text-slate-400" />
                    </button>
                    <RowActionsMenu
                      items={[
                        {
                          label: "View details",
                          icon: <Eye className="h-3.5 w-3.5" />,
                          onSelect: () => onSelect(account.id),
                        },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Reconciliation Trend Chart ────────────────────────────────────────────

function ReconciliationTrendChart({
  trendData,
}: {
  trendData: Array<{ month: string; rate: number }>;
}) {
  const maxValue = 100;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">Reconciliation Trend</h3>
        <button className="text-xs text-slate-500 hover:text-slate-700">
          Last 6 months ▾
        </button>
      </div>
      <div className="h-40 flex items-end gap-2">
        {trendData.map((d, _i) => (
          <div
            key={d.month}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className="w-full bg-emerald-500 rounded-t"
              style={{ height: `${(d.rate / maxValue) * 100}%` }}
            />
            <span className="text-[10px] text-slate-400">{d.month}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-slate-400">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ─── Reconciliation Status Donut ───────────────────────────────────────────

function ReconciliationStatusDonut({
  status,
}: {
  status: {
    reconciled: number;
    unreconciled: number;
    notRequired: number;
  };
}) {
  const total =
    status.reconciled + status.unreconciled + status.notRequired || 1;
  const segments = [
    { label: "Reconciled", count: status.reconciled, color: "bg-emerald-500" },
    { label: "Unreconciled", count: status.unreconciled, color: "bg-red-500" },
    { label: "Not Required", count: status.notRequired, color: "bg-slate-400" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">Reconciliation Status</h3>
      </div>
      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {segments.map((seg, i) => {
              const startAngle = segments
                .slice(0, i)
                .reduce((sum, s) => sum + (s.count / total) * 360, 0);
              const endAngle = startAngle + (seg.count / total) * 360;
              const largeArc = seg.count / total > 0.5 ? 1 : 0;
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

              const fillColor =
                seg.color === "bg-emerald-500"
                  ? "#10b981"
                  : seg.color === "bg-red-500"
                    ? "#ef4444"
                    : "#9ca3af";

              return (
                <path
                  key={seg.label}
                  d={`M ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A 25 25 0 ${largeArc} 0 ${x4} ${y4} Z`}
                  fill={fillColor}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xl font-bold text-slate-900">{total}</p>
            <p className="text-xs text-slate-500">Accounts</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {segments.map((seg) => {
            const percentage = total > 0 ? (seg.count / total) * 100 : 0;
            return (
              <div
                key={seg.label}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded", seg.color)} />
                  <span className="text-xs text-slate-600">{seg.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-slate-900">
                    {seg.count}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">
                    ({percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Top Unreconciled Accounts ─────────────────────────────────────────────

function TopUnreconciledAccounts({
  accounts,
}: {
  accounts: Array<{ name: string; difference: number }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">
          Top Unreconciled Accounts
        </h3>
        <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          View all →
        </button>
      </div>
      <div className="space-y-3">
        {accounts.map((account, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-sm text-slate-700">{account.name}</span>
            <span className="text-sm font-medium text-red-600">
              GMD{" "}
              {Math.abs(account.difference).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        ))}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between">
            <span className="font-medium text-slate-900">
              Total Unreconciled
            </span>
            <span className="font-bold text-red-600">
              GMD{" "}
              {accounts
                .reduce((sum, a) => sum + Math.abs(a.difference), 0)
                .toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI Copilot Panel ──────────────────────────────────────────────────────

function AiCopilotPanel({
  insights,
  reconciliationSummary,
}: {
  insights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
  reconciliationSummary: {
    total: number;
    matched: number;
    unmatched: number;
    partialMatch: number;
    duplicates: number;
  };
}) {
  const [message, setMessage] = useState("");

  const quickQuestions = [
    "Which accounts are unreconciled?",
    "Show me top discrepancies",
    "Why didn't this transaction match?",
    "Reconcile this account",
  ];

  const total = reconciliationSummary.total || 1;
  const segments = [
    {
      label: "Matched",
      count: reconciliationSummary.matched,
      color: "bg-emerald-500",
    },
    {
      label: "Unmatched",
      count: reconciliationSummary.unmatched,
      color: "bg-red-500",
    },
    {
      label: "Partial Match",
      count: reconciliationSummary.partialMatch,
      color: "bg-amber-500",
    },
    {
      label: "Duplicates",
      count: reconciliationSummary.duplicates,
      color: "bg-purple-500",
    },
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
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Live
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Greeting */}
        <div>
          <p className="text-sm text-slate-500">
            I analyzed your reconciliations and found a few things.
          </p>
        </div>

        {/* AI Insights */}
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

        {/* Ask AI */}
        <div>
          <h4 className="font-medium text-slate-900 mb-3">Ask me anything</h4>
          <div className="space-y-2">
            {quickQuestions.map((question, i) => (
              <button
                key={i}
                className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Reconciliation Summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">
              Reconciliation Summary (MTD)
            </h4>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View report →
            </button>
          </div>
          <div className="flex items-center gap-4">
            {/* Donut Chart */}
            <div className="relative w-28 h-28">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {segments.map((seg, i) => {
                  const startAngle = segments
                    .slice(0, i)
                    .reduce((sum, s) => sum + (s.count / total) * 360, 0);
                  const endAngle = startAngle + (seg.count / total) * 360;
                  const largeArc = seg.count / total > 0.5 ? 1 : 0;
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

                  const fillColor =
                    seg.color === "bg-emerald-500"
                      ? "#10b981"
                      : seg.color === "bg-red-500"
                        ? "#ef4444"
                        : seg.color === "bg-amber-500"
                          ? "#f59e0b"
                          : "#8b5cf6";

                  return (
                    <path
                      key={seg.label}
                      d={`M ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A 25 25 0 ${largeArc} 0 ${x4} ${y4} Z`}
                      fill={fillColor}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-lg font-bold text-slate-900">{total}</p>
                <p className="text-[10px] text-slate-500">Transactions</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-1">
              {segments.map((seg) => {
                const percentage = total > 0 ? (seg.count / total) * 100 : 0;
                return (
                  <div
                    key={seg.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded", seg.color)} />
                      <span className="text-xs text-slate-600">
                        {seg.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium text-slate-900">
                        {seg.count}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="font-medium text-slate-900 mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  Reconcile Account
                </p>
                <p className="text-xs text-slate-500">
                  Start new reconciliation
                </p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">Bank Feeds</p>
                <p className="text-xs text-slate-500">Manage bank feeds</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  Reconciliation Rules
                </p>
                <p className="text-xs text-slate-500">Create or edit rules</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  Discrepancy Report
                </p>
                <p className="text-xs text-slate-500">View all discrepancies</p>
              </div>
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
            placeholder="Ask anything about reconciliation..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700">
            <ArrowRight className="h-4 w-4" />
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

export default function ReconciliationPage() {
  return (
    <ModuleAiProvider>
      <ReconciliationPageInner />
    </ModuleAiProvider>
  );
}

function ReconciliationPageInner() {
  const { focusRequest } = useModuleAi();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [showCreate, setShowCreate] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("");
  const [accountStatusFilter, setAccountStatusFilter] = useState("");

  // Fetch overview data
  const { data: overviewData, isLoading: overviewLoading } =
    trpc.reconciliation.getOverview.useQuery();

  // Fetch AI insights
  const { data: aiInsights } = trpc.reconciliation.getAiInsights.useQuery();

  const tabs = [
    { key: "overview" as TabType, label: "Overview" },
    { key: "bank_accounts" as TabType, label: "Bank Accounts" },
    { key: "reconciliations" as TabType, label: "Reconciliations" },
    { key: "discrepancies" as TabType, label: "Discrepancies" },
    { key: "rules" as TabType, label: "Rules" },
    { key: "reports" as TabType, label: "Reports" },
    { key: "settings" as TabType, label: "Settings" },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Reconciliation
                </h1>
                <p className="text-sm text-slate-500">
                  Reconcile bank accounts, books, and transactions with
                  AI-powered matching.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AiSimulationTrigger
                traceId="ledger-reconciliation"
                label="AI Reconcile"
                variant="outline"
              />
              <AiSimulationTrigger
                traceId="reconciliation-automatch"
                label="AI Auto-Match"
                variant="outline"
              />
              <ModulePageCopilot
                title="Reconciliation"
                pageContext={
                  {
                    page: "Reconciliation",
                    module: "reconciliation",
                    view: activeTab,
                  } as PageContextPayload
                }
                focusRequest={focusRequest}
              />
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                New Reconciliation
              </button>
              <DocumentUploadButton
                docType="bank_statement"
                label="Import"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              />
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

        {/* Tab Content */}
        {(() => {
          const allAccounts = overviewData?.accountStatuses ?? [];
          const filteredAccounts = allAccounts.filter((a) => {
            if (
              accountSearch &&
              !a.name.toLowerCase().includes(accountSearch.toLowerCase())
            )
              return false;
            if (accountTypeFilter && a.type !== accountTypeFilter) return false;
            if (accountStatusFilter && a.status !== accountStatusFilter)
              return false;
            return true;
          });

          switch (activeTab) {
            case "bank_accounts":
              return (
                <>
                  {/* Search and Filters */}
                  <div className="p-4 bg-white border-b border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={accountSearch}
                          onChange={(e) => setAccountSearch(e.target.value)}
                          placeholder="Search accounts..."
                          className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <select
                        value={accountTypeFilter}
                        onChange={(e) => setAccountTypeFilter(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Account Types</option>
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                        <option value="mobile_money">Mobile Money</option>
                      </select>
                      <select
                        value={accountStatusFilter}
                        onChange={(e) => setAccountStatusFilter(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">All Statuses</option>
                        <option value="Reconciled">Reconciled</option>
                        <option value="Unreconciled">Unreconciled</option>
                        <option value="Not Required">Not Required</option>
                      </select>
                      {(accountSearch ||
                        accountTypeFilter ||
                        accountStatusFilter) && (
                        <button
                          onClick={() => {
                            setAccountSearch("");
                            setAccountTypeFilter("");
                            setAccountStatusFilter("");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto bg-white">
                    <AccountTable
                      accounts={filteredAccounts}
                      selectedId={selectedAccountId}
                      onSelect={setSelectedAccountId}
                      isLoading={overviewLoading}
                    />
                  </div>
                </>
              );

            case "reconciliations":
              return (
                <div className="flex-1 overflow-auto bg-white p-4">
                  <div className="rounded-xl border border-slate-200">
                    <div className="p-4 border-b border-slate-200">
                      <h3 className="font-medium text-slate-900">
                        Reconciliation History
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Recent reconciliation runs across all accounts.
                      </p>
                    </div>
                    {allAccounts.filter((a) => a.lastReconciled).length ===
                    0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <RefreshCw className="h-10 w-10 text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-900">
                          No reconciliations yet
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Completed reconciliations will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                                Account
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                                Bank
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                                Last Reconciled
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {allAccounts
                              .filter((a) => a.lastReconciled)
                              .map((a) => (
                                <tr
                                  key={a.id}
                                  className="border-b border-slate-100 hover:bg-slate-50"
                                >
                                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                                    {a.name}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-slate-600">
                                    {a.bankName}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-slate-600">
                                    {a.lastReconciled
                                      ? new Date(
                                          a.lastReconciled,
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })
                                      : "—"}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                                        a.status === "Reconciled"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : a.status === "Unreconciled"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-slate-100 text-slate-600",
                                      )}
                                    >
                                      {a.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );

            case "discrepancies": {
              const discrepantAccounts = allAccounts.filter(
                (a) => a.status === "Unreconciled" || a.difference !== 0,
              );
              return (
                <div className="flex-1 overflow-auto bg-white p-4">
                  <div className="rounded-xl border border-slate-200">
                    <div className="p-4 border-b border-slate-200">
                      <h3 className="font-medium text-slate-900">
                        Open Discrepancies ({discrepantAccounts.length})
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Accounts with unmatched or differing balances.
                      </p>
                    </div>
                    {discrepantAccounts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-300 mb-3" />
                        <p className="text-sm font-medium text-slate-900">
                          All clear
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          No open discrepancies found.
                        </p>
                      </div>
                    ) : (
                      <AccountTable
                        accounts={discrepantAccounts}
                        selectedId={selectedAccountId}
                        onSelect={setSelectedAccountId}
                        isLoading={overviewLoading}
                      />
                    )}
                  </div>
                </div>
              );
            }

            case "rules":
              return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="rounded-xl border border-slate-200 bg-white p-8">
                    <Settings className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900">
                      Matching Rules
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm">
                      AI-powered matching rules for automatic reconciliation
                      will be configured here.
                    </p>
                  </div>
                </div>
              );

            case "reports":
              return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="rounded-xl border border-slate-200 bg-white p-8">
                    <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900">
                      Reconciliation Reports
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm">
                      Variance reports and reconciliation summaries will be
                      generated here.
                    </p>
                  </div>
                </div>
              );

            case "settings":
              return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="rounded-xl border border-slate-200 bg-white p-8">
                    <Settings className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900">
                      Account Settings
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm">
                      Bank feed connections and account reconciliation
                      preferences will be managed here.
                    </p>
                  </div>
                </div>
              );

            default:
              // Overview — summary cards + recent accounts + bottom charts
              return (
                <>
                  {overviewData?.summary && (
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                      <SummaryCards summary={overviewData.summary} />
                    </div>
                  )}
                  <div className="p-4 bg-white border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-slate-900">
                        Account Status
                      </h3>
                      <button
                        onClick={() => setActiveTab("bank_accounts")}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        View all →
                      </button>
                    </div>
                  </div>
                  <div className="bg-white">
                    <AccountTable
                      accounts={allAccounts.slice(0, 5)}
                      selectedId={selectedAccountId}
                      onSelect={setSelectedAccountId}
                      isLoading={overviewLoading}
                    />
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <div className="grid grid-cols-3 gap-6">
                      {overviewData?.trendData && (
                        <ReconciliationTrendChart
                          trendData={overviewData.trendData}
                        />
                      )}
                      {overviewData?.reconciliationStatus && (
                        <ReconciliationStatusDonut
                          status={overviewData.reconciliationStatus}
                        />
                      )}
                      {overviewData?.topUnreconciled && (
                        <TopUnreconciledAccounts
                          accounts={overviewData.topUnreconciled}
                        />
                      )}
                    </div>
                  </div>
                </>
              );
          }
        })()}
      </div>

      {/*
        Right AI Copilot Panel - DISABLED
        <div className="w-[360px]">
          <AiCopilotPanel
            insights={aiInsights ?? []}
            reconciliationSummary={
              overviewData?.reconciliationSummary ?? {
                total: 0,
                matched: 0,
                unmatched: 0,
                partialMatch: 0,
                duplicates: 0,
              }
            }
          />
        </div>
      */}
      <CreateReconciliationDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
