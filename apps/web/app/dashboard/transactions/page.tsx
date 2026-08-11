"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Bot,
  RefreshCw,
  XCircle,
  Edit3,
  StickyNote,
  Sparkles,
  Clock,
  Filter,
  Eye,
  Check,
  Ban,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import type { TabItem } from "@/components/module/module-page-shell.types";
import { CreateTransactionDialog } from "@/components/dashboard/create-transaction-dialog";
import { RowActionsMenu } from "@/components/module/row-actions-menu";
import { RowAiAction } from "@/components/module/row-ai-action";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";

type TabFilter =
  | "overview"
  | "all"
  | "uncategorized"
  | "needs_review"
  | "matched"
  | "excluded";
type DetailTab = "details" | "ai_insights" | "history";

// ─── Transaction Table ─────────────────────────────────────────────────────

function TransactionTable({
  transactions,
  selectedId,
  onSelect,
  onApprove,
  onReject,
  isLoading,
}: {
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    reference: string | null;
    account: string;
    accountCode: string;
    category: string;
    categoryColor: string;
    amount: number;
    amountFormatted: string;
    isPositive: boolean;
    status: string;
    statusLabel: string;
    confidence: number;
    source: string;
    sourceIcon: string;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isLoading: boolean;
}) {
  const statusColors: Record<string, string> = {
    matched: "bg-emerald-100 text-emerald-700",
    needs_review: "bg-amber-100 text-amber-700",
    unmatched: "bg-red-100 text-red-700",
    excluded: "bg-slate-100 text-slate-600",
    uncategorized: "bg-orange-100 text-orange-700",
  };

  const categoryColors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
    gray: "bg-slate-100 text-slate-600",
    red: "bg-red-100 text-red-700",
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
              Description
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Account
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Amount
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Category
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Confidence
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Source
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              onClick={() => onSelect(tx.id)}
              className={cn(
                "group relative border-b border-slate-100 cursor-pointer transition-colors",
                selectedId === tx.id ? "bg-indigo-50" : "hover:bg-slate-50",
              )}
            >
              <RowAiAction
                reversible
                focus={{
                  kind: "Transaction",
                  name: tx.description || tx.reference || tx.id,
                  id: tx.id,
                  fields: [
                    { label: "Date", value: tx.date },
                    { label: "Account", value: tx.account },
                    { label: "Amount", value: tx.amountFormatted },
                    { label: "Category", value: tx.category },
                    { label: "Source", value: tx.source },
                    { label: "Status", value: tx.statusLabel },
                  ],
                }}
              />
              <td className="py-3 px-4">
                <input type="checkbox" className="rounded border-slate-300" />
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {new Date(tx.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {tx.description}
                  </p>
                  {tx.reference && (
                    <p className="text-xs text-slate-400">{tx.reference}</p>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="text-sm text-slate-700">{tx.account}</p>
                  <p className="text-xs text-slate-400">{tx.accountCode}</p>
                </div>
              </td>
              <td className="py-3 px-4 text-right">
                <span
                  className={cn(
                    "text-sm font-medium",
                    tx.isPositive ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  {tx.amountFormatted}
                </span>
              </td>
              <td className="py-3 px-4">
                {tx.category !== "Uncategorized" ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                      categoryColors[tx.categoryColor] || categoryColors.gray,
                    )}
                  >
                    {tx.category}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                {tx.confidence > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          tx.confidence >= 90
                            ? "bg-emerald-500"
                            : tx.confidence >= 70
                              ? "bg-amber-500"
                              : "bg-red-500",
                        )}
                        style={{ width: `${tx.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-600">
                      {tx.confidence}%
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  {tx.source === "Bank Feed" && (
                    <div className="h-4 w-4 rounded bg-blue-100 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-blue-600">
                        BF
                      </span>
                    </div>
                  )}
                  {tx.source === "Invoice" && (
                    <div className="h-4 w-4 rounded bg-purple-100 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-purple-600">
                        INV
                      </span>
                    </div>
                  )}
                  {tx.source === "Bill" && (
                    <div className="h-4 w-4 rounded bg-orange-100 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-orange-600">
                        BIL
                      </span>
                    </div>
                  )}
                  {tx.source === "Manual" && (
                    <div className="h-4 w-4 rounded bg-slate-100 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-slate-600">
                        M
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-slate-600">{tx.source}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                    statusColors[tx.status] || statusColors.excluded,
                  )}
                >
                  {tx.statusLabel}
                </span>
              </td>
              <td className="py-3 px-4">
                <RowActionsMenu
                  items={[
                    {
                      label: "View details",
                      icon: <Eye className="h-3.5 w-3.5" />,
                      onSelect: () => onSelect(tx.id),
                    },
                    {
                      label: "Approve",
                      icon: <Check className="h-3.5 w-3.5" />,
                      disabled: tx.status === "matched",
                      onSelect: () => onApprove(tx.id),
                    },
                    {
                      label: "Reject",
                      icon: <Ban className="h-3.5 w-3.5" />,
                      destructive: true,
                      disabled: tx.status === "excluded",
                      onSelect: () => onReject(tx.id),
                    },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Transaction Detail Panel ──────────────────────────────────────────────

function TransactionDetailPanel({
  transactionDetail,
  aiInsights,
  onClose,
}: {
  transactionDetail: {
    id: string;
    date: string;
    description: string;
    reference: string | null;
    amount: number;
    amountFormatted: string;
    isPositive: boolean;
    status: string;
    statusLabel: string;
    confidence: number;
    bankAccount?: { name: string; number: string; bank: string } | null;
    account?: { code: string; name: string; type: string } | null;
    category: string;
    source: string;
    journalEntry?: {
      id: string;
      entryNumber: number;
      description: string;
      status: string;
    } | null;
    aiExplanation?: string;
    relatedTransactions?: Array<{
      id: string;
      date: string;
      description: string;
      amount: number;
      amountFormatted: string;
      isPositive: boolean;
    }>;
    history?: Array<{
      id: string;
      action: string;
      timestamp: string;
      user: string;
      details: string;
    }>;
  } | null;
  aiInsights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("details");

  if (!transactionDetail) {
    return (
      <div className="h-full flex flex-col bg-white border-l border-slate-200">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">
              Select a transaction
            </p>
            <p className="text-xs text-slate-500">
              Click on a transaction to view details
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      {/* Header with Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-1">
            {(["details", "ai_insights", "history"] as DetailTab[]).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    activeTab === tab
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {tab === "details"
                    ? "Details"
                    : tab === "ai_insights"
                      ? "AI Insights"
                      : "History"}
                </button>
              ),
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <XCircle className="h-5 w-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "details" && (
          <div className="space-y-6">
            {/* Transaction Header */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {transactionDetail.description}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(transactionDetail.date).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                    transactionDetail.status === "matched"
                      ? "bg-emerald-100 text-emerald-700"
                      : transactionDetail.status === "needs_review"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700",
                  )}
                >
                  {transactionDetail.statusLabel}
                </span>
              </div>
              <p
                className={cn(
                  "text-2xl font-bold",
                  transactionDetail.isPositive
                    ? "text-emerald-600"
                    : "text-red-600",
                )}
              >
                {transactionDetail.amountFormatted}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-slate-500">
                  {transactionDetail.confidence}% Confidence score
                </span>
                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      transactionDetail.confidence >= 90
                        ? "bg-emerald-500"
                        : transactionDetail.confidence >= 70
                          ? "bg-amber-500"
                          : "bg-red-500",
                    )}
                    style={{ width: `${transactionDetail.confidence}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Account</span>
                <span className="text-sm font-medium text-slate-900">
                  {transactionDetail.account?.code} -{" "}
                  {transactionDetail.account?.name}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Category</span>
                <span className="text-sm font-medium text-slate-900">
                  {transactionDetail.category}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Description</span>
                <span className="text-sm font-medium text-slate-900">
                  {transactionDetail.description}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Source</span>
                <span className="text-sm font-medium text-slate-900">
                  {transactionDetail.source}{" "}
                  {transactionDetail.bankAccount?.bank
                    ? `- ${transactionDetail.bankAccount.bank}`
                    : ""}
                </span>
              </div>
              {transactionDetail.reference && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Reference</span>
                  <span className="text-sm font-medium text-slate-900">
                    {transactionDetail.reference}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Balance impact</span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    transactionDetail.isPositive
                      ? "text-emerald-600"
                      : "text-red-600",
                  )}
                >
                  {transactionDetail.amountFormatted}
                </span>
              </div>
            </div>

            {/* AI Explanation */}
            {transactionDetail.aiExplanation && (
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-700">
                    AI explanation
                  </span>
                </div>
                <p className="text-sm text-slate-700">
                  {transactionDetail.aiExplanation}
                </p>
                <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-2">
                  Show more →
                </button>
              </div>
            )}

            {/* Actions */}
            <div>
              <h4 className="text-sm font-medium text-slate-900 mb-3">
                Actions
              </h4>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                  <Edit3 className="h-4 w-4 text-slate-400" />
                  Edit transaction
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                  <RefreshCw className="h-4 w-4 text-slate-400" />
                  Recategorize
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <XCircle className="h-4 w-4" />
                  Exclude
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                  <StickyNote className="h-4 w-4 text-slate-400" />
                  Add note
                </button>
              </div>
            </div>

            {/* Related Transactions */}
            {transactionDetail.relatedTransactions &&
              transactionDetail.relatedTransactions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-900">
                      Related transactions
                    </h4>
                    <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                      View all →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {transactionDetail.relatedTransactions.map((related) => (
                      <div
                        key={related.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {related.description}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(related.date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            related.isPositive
                              ? "text-emerald-600"
                              : "text-red-600",
                          )}
                        >
                          {related.amountFormatted}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {activeTab === "ai_insights" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5" />
                <span className="font-medium">AI Insights</span>
              </div>
              <p className="text-sm text-white/90">
                AI-powered analysis of this transaction and related patterns.
              </p>
            </div>

            {aiInsights.map((insight) => (
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
                      {insight.actionLabel} →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-900">
              Activity Timeline
            </h4>
            {transactionDetail.history &&
            transactionDetail.history.length > 0 ? (
              <div className="space-y-4">
                {transactionDetail.history.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative">
                      <div className="h-2 w-2 rounded-full bg-indigo-500 mt-2" />
                      <div className="absolute left-[3px] top-4 w-px h-full bg-slate-200" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-slate-900">
                        {item.action}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.user} •{" "}
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                      {item.details && (
                        <p className="text-xs text-slate-600 mt-1">
                          {item.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No history available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Overview Panel ────────────────────────────────────────────────────────
// Executive snapshot for the Overview tab: categorization health and AI
// insights. The reviewable transaction list lives on the status tabs.

function TransactionsOverview({
  summary,
  aiInsights,
}: {
  summary?: {
    totalTransactions: number;
    aiCategorized: number;
    needsReview: number;
    matched: number;
    excluded: number;
  } | null;
  aiInsights?: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
}) {
  const total = summary?.totalTransactions ?? 0;
  const autoRate =
    total > 0 ? Math.round(((summary?.aiCategorized ?? 0) / total) * 100) : 0;
  const segments = [
    {
      label: "Auto-categorized",
      count: summary?.aiCategorized ?? 0,
      color: "bg-emerald-500",
    },
    {
      label: "Matched",
      count: summary?.matched ?? 0,
      color: "bg-blue-500",
    },
    {
      label: "Needs review",
      count: summary?.needsReview ?? 0,
      color: "bg-amber-500",
    },
    {
      label: "Excluded",
      count: summary?.excluded ?? 0,
      color: "bg-slate-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-6 bg-slate-50/70 p-4">
      {/* Categorization Health */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-slate-900">Categorization Health</h3>
          <span className="text-xs text-slate-500">This month</span>
        </div>
        <div className="flex items-center gap-6">
          {/* Donut Chart */}
          <div className="relative h-32 w-32 shrink-0">
            <svg className="h-full w-full" viewBox="0 0 100 100">
              {segments.map((seg, i) => {
                const startAngle = segments
                  .slice(0, i)
                  .reduce((sum, s) => sum + (s.count / (total || 1)) * 360, 0);
                const endAngle = startAngle + (seg.count / (total || 1)) * 360;
                const largeArc = seg.count / (total || 1) > 0.5 ? 1 : 0;
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
                    : seg.color === "bg-blue-500"
                      ? "#3b82f6"
                      : seg.color === "bg-amber-500"
                        ? "#f59e0b"
                        : "#94a3b8";

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
              <p className="text-lg font-bold tabular-nums text-slate-900">
                {autoRate}%
              </p>
              <p className="text-[10px] text-slate-500">auto-categorized</p>
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

      {/* AI Insights */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-medium text-slate-900">AI Insights</h3>
        {aiInsights && aiInsights.length > 0 ? (
          <div className="space-y-3">
            {aiInsights.slice(0, 3).map((insight) => (
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
                <p className="text-sm font-medium text-slate-900">
                  {insight.title}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {insight.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No insights at this time.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("this_month");
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);

  // Map the date filter select to real start/end dates.
  const dateRange = useMemo(() => {
    const now = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    switch (dateFilter) {
      case "today": {
        return { startDate: iso(now), endDate: iso(now) };
      }
      case "this_week": {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        return { startDate: iso(start), endDate: iso(now) };
      }
      case "this_month":
      default: {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: iso(start), endDate: iso(now) };
      }
    }
  }, [dateFilter]);

  const { data: summary } = trpc.transactions.getSummary.useQuery({});

  const { data: transactionsData, isLoading: transactionsLoading } =
    trpc.transactions.listTransactions.useQuery({
      status: activeTab === "overview" ? "all" : activeTab,
      search: searchQuery || undefined,
      accountId: accountFilter || undefined,
      type: typeFilter || undefined,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

  const { data: transactionDetail } =
    trpc.transactions.getTransactionDetail.useQuery(
      { transactionId: selectedTransactionId ?? "" },
      { enabled: !!selectedTransactionId },
    );

  const { data: aiInsights } = trpc.transactions.getAiInsights.useQuery({});

  const { data: accounts } = trpc.transactions.getAccounts.useQuery();

  const utils = trpc.useUtils();
  const approveMutation = trpc.transactions.approveTransaction.useMutation();
  const rejectMutation = trpc.transactions.rejectTransaction.useMutation();

  const handleApprove = (transactionId: string) => {
    approveMutation.mutate(
      { transactionId },
      {
        onSuccess: () => {
          utils.transactions.listTransactions.invalidate();
          utils.transactions.getSummary.invalidate();
        },
        onError: () => undefined,
      },
    );
  };

  const handleReject = (transactionId: string) => {
    rejectMutation.mutate(
      { transactionId, reason: "Rejected from transactions list" },
      {
        onSuccess: () => {
          utils.transactions.listTransactions.invalidate();
          utils.transactions.getSummary.invalidate();
        },
        onError: () => undefined,
      },
    );
  };

  // Real counts only — no hardcoded fallbacks. The summary router doesn't
  // expose an uncategorized count, so that tab carries no badge rather than
  // a fabricated number.
  const tabs: TabItem[] = [
    { key: "overview" as TabFilter, label: "Overview" },
    { key: "all" as TabFilter, label: "All" },
    { key: "uncategorized" as TabFilter, label: "Uncategorized" },
    {
      key: "needs_review" as TabFilter,
      label: "Needs review",
      count: summary?.needsReview,
    },
    {
      key: "matched" as TabFilter,
      label: "Matched",
      count: summary?.matched,
    },
    {
      key: "excluded" as TabFilter,
      label: "Excluded",
      count: summary?.excluded,
    },
  ];

  const summaryCards = summary
    ? [
        {
          label: "Total transactions",
          value: summary.totalTransactions.toLocaleString(),
          change: summary.totalTransactionsChange,
          icon: FileText,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50",
        },
        {
          label: "Auto-categorized",
          value: summary.aiCategorized.toLocaleString(),
          change: summary.aiChange,
          icon: Bot,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
        },
        {
          label: "Needs review",
          value: summary.needsReview.toLocaleString(),
          change: summary.needsReviewChange,
          icon: AlertTriangle,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
        },
        {
          label: "Excluded",
          value: summary.excluded.toLocaleString(),
          change: summary.excludedChange,
          icon: XCircle,
          color: "text-red-600",
          bgColor: "bg-red-50",
        },
      ]
    : [];

  const filters = (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search transactions..."
          className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
      <select
        value={accountFilter}
        onChange={(e) => {
          setAccountFilter(e.target.value);
          setPage(1);
        }}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All accounts</option>
        {accounts?.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.name}
          </option>
        ))}
      </select>
      <select
        value={typeFilter}
        onChange={(e) => {
          setTypeFilter(e.target.value);
          setPage(1);
        }}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All types</option>
        <option value="deposit">Deposit</option>
        <option value="withdrawal">Withdrawal</option>
        <option value="transfer">Transfer</option>
      </select>
      <select
        value={dateFilter}
        onChange={(e) => {
          setDateFilter(e.target.value);
          setPage(1);
        }}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="this_month">This month</option>
        <option value="today">Today</option>
        <option value="this_week">This week</option>
      </select>
      {dateFilter === "today" && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
          <Filter className="h-3 w-3" />
          {accountFilter || typeFilter ? "Filtered" : "Today"}
        </span>
      )}
      {(accountFilter || typeFilter) && (
        <button
          onClick={() => {
            setAccountFilter("");
            setTypeFilter("");
            setPage(1);
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  const pagination = (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-500">
        Showing {(page - 1) * pageSize + 1} to{" "}
        {Math.min(page * pageSize, transactionsData?.totalCount ?? 0)} of{" "}
        {(transactionsData?.totalCount ?? 0).toLocaleString()} transactions
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
          { length: Math.min(5, transactionsData?.totalPages ?? 1) },
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
            setPage(Math.min(transactionsData?.totalPages ?? 1, page + 1))
          }
          disabled={page === (transactionsData?.totalPages ?? 1)}
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
  );

  const headerSearch = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Ask anything about transactions..."
        className="w-80 rounded-lg border border-slate-200 pl-10 pr-12 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-slate-400">
        <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">⌘</kbd>
        <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">K</kbd>
      </div>
    </div>
  );

  const actions = (
    <>
      {headerSearch}
      <AiSimulationTrigger
        traceId="transaction-categorization"
        label="AI Categorize"
        variant="outline"
      />
      <button
        onClick={() => setShowCreate(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        New transaction
      </button>
    </>
  );

  return (
    <ModulePageShell
      title="Transactions"
      description="All your transactions, intelligently categorized by Xenboox."
      actions={actions}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(key) => {
        setActiveTab(key as TabFilter);
        setPage(1);
      }}
      summaryCards={summaryCards}
      filters={filters}
      pagination={activeTab !== "overview" ? pagination : undefined}
      aiContext={{
        page: "Transactions",
        module: "transactions",
        view: tabs.find((t) => t.key === activeTab)?.label ?? activeTab,
        filters: searchQuery ? [`search: ${searchQuery}`] : undefined,
        count: transactionsData?.totalCount,
        notes: searchQuery
          ? `The user has an active search: "${searchQuery}".`
          : undefined,
      }}
    >
      {activeTab === "overview" ? (
        <TransactionsOverview summary={summary} aiInsights={aiInsights} />
      ) : (
        <TransactionTable
          transactions={transactionsData?.transactions ?? []}
          selectedId={selectedTransactionId}
          onSelect={setSelectedTransactionId}
          onApprove={handleApprove}
          onReject={handleReject}
          isLoading={transactionsLoading}
        />
      )}
      <CreateTransactionDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </ModulePageShell>
  );
}
