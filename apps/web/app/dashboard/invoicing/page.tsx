"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Download,
  ChevronDown,
  MoreHorizontal,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bot,
  TrendingUp,
  TrendingDown,
  Eye,
  Download as DownloadIcon,
  RefreshCw,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Settings,
  PlusCircle,
  Link,
  CreditCard,
  FileCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type StatusFilter =
  | "all"
  | "draft"
  | "sent"
  | "viewed"
  | "overdue"
  | "paid"
  | "cancelled";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  summary,
}: {
  summary: {
    totalOutstanding: number;
    outstandingChange: number;
    overdueAmount: number;
    overdueCount: number;
    paidThisMonth: number;
    paidChange: number;
    avgCollectionDays: number;
    avgCollectionChange: number;
    conversionRate: number;
    conversionChange: number;
  };
}) {
  const cards = [
    {
      label: "Total Outstanding",
      value: `GMD ${summary.totalOutstanding.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      change: summary.outstandingChange,
      icon: Wallet,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Overdue Amount",
      value: `GMD ${summary.overdueAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtitle: `${summary.overdueCount} invoices`,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Paid This Month",
      value: `GMD ${summary.paidThisMonth.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      change: summary.paidChange,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Average Collection Time",
      value: `${summary.avgCollectionDays} days`,
      change: summary.avgCollectionChange,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Conversion Rate",
      value: `${summary.conversionRate}%`,
      change: summary.conversionChange,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
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
          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          {card.change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {card.change >= 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span
                className={cn(
                  "text-sm",
                  card.change >= 0 ? "text-emerald-600" : "text-red-600",
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

// ─── Invoice Table ─────────────────────────────────────────────────────────

function InvoiceTable({
  invoices,
  selectedId,
  onSelect,
  isLoading,
}: {
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerEmail: string;
    invoiceDate: string;
    dueDate: string;
    amount: number;
    balance: number;
    status: string;
    dueStatus: string;
    daysUntilDue: number;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  const statusColors: Record<string, string> = {
    pending: "bg-blue-100 text-blue-700",
    partial: "bg-amber-100 text-amber-700",
    overdue: "bg-red-100 text-red-700",
    paid: "bg-emerald-100 text-emerald-700",
    voided: "bg-slate-100 text-slate-600",
  };

  const statusLabels: Record<string, string> = {
    pending: "Sent",
    partial: "Viewed",
    overdue: "Overdue",
    paid: "Paid",
    voided: "Cancelled",
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
              Invoice #
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Customer
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Issue Date
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Due Date
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Amount
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Due In / Overdue
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              onClick={() => onSelect(inv.id)}
              className={cn(
                "border-b border-slate-100 cursor-pointer transition-colors",
                selectedId === inv.id ? "bg-indigo-50" : "hover:bg-slate-50",
              )}
            >
              <td className="py-3 px-4">
                <input type="checkbox" className="rounded border-slate-300" />
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {inv.invoiceNumber}
                  </p>
                  <p className="text-xs text-slate-400">
                    PO-{inv.invoiceNumber.split("-").pop()}
                  </p>
                </div>
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {inv.customerName}
                  </p>
                  <p className="text-xs text-slate-400">{inv.customerEmail}</p>
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {new Date(inv.invoiceDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {new Date(inv.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-sm font-medium text-slate-900">
                  GMD{" "}
                  {inv.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                    statusColors[inv.status] || statusColors.pending,
                  )}
                >
                  {statusLabels[inv.status] || inv.status}
                </span>
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "text-sm",
                    inv.status === "paid"
                      ? "text-emerald-600"
                      : inv.status === "overdue"
                        ? "text-red-600"
                        : inv.daysUntilDue <= 2
                          ? "text-amber-600"
                          : "text-slate-600",
                  )}
                >
                  {inv.status === "paid"
                    ? `Paid on ${new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : inv.dueStatus}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <button className="p-1 hover:bg-slate-100 rounded">
                    <Eye className="h-4 w-4 text-slate-400" />
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

// ─── Charts Row ────────────────────────────────────────────────────────────

function ChartsRow({
  chartsData,
}: {
  chartsData: {
    statusCounts: {
      draft: number;
      sent: number;
      viewed: number;
      overdue: number;
      paid: number;
      cancelled: number;
    };
    total: number;
    trendData: Array<{ date: string; outstanding: number }>;
  };
}) {
  const statusColors: Record<string, string> = {
    sent: "bg-blue-500",
    viewed: "bg-indigo-500",
    paid: "bg-emerald-500",
    overdue: "bg-red-500",
    draft: "bg-slate-400",
  };

  const statusLabels: Record<string, string> = {
    sent: "Sent",
    viewed: "Viewed",
    paid: "Paid",
    overdue: "Overdue",
    draft: "Draft",
  };

  // Calculate donut chart segments
  const total = chartsData.total || 1;
  const segments = Object.entries(chartsData.statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      count,
      percentage: (count / total) * 100,
      color: statusColors[status] || "bg-slate-400",
      label: statusLabels[status] || status,
    }));

  // Simple line chart data
  const maxOutstanding = Math.max(
    ...chartsData.trendData.map((d) => d.outstanding),
    1,
  );

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Outstanding Trend */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-slate-900">Outstanding Trend</h3>
          <button className="text-xs text-slate-500 hover:text-slate-700">
            Last 30 days ▾
          </button>
        </div>
        <div className="h-40 flex items-end gap-1">
          {chartsData.trendData
            .filter((_, i) => i % 3 === 0)
            .map((d, i) => {
              const height = (d.outstanding / maxOutstanding) * 100;
              return (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-indigo-500 rounded-t opacity-80"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  />
                </div>
              );
            })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>Apr 20</span>
          <span>Apr 27</span>
          <span>May 4</span>
          <span>May 11</span>
          <span>May 18</span>
        </div>
      </div>

      {/* Invoices by Status */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-slate-900">Invoices by Status</h3>
        </div>
        <div className="flex items-center gap-6">
          {/* Donut Chart */}
          <div className="relative w-32 h-32">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {segments.map((seg, i) => {
                const startAngle = segments
                  .slice(0, i)
                  .reduce((sum, s) => sum + s.percentage * 3.6, 0);
                const endAngle = startAngle + seg.percentage * 3.6;
                const largeArc = seg.percentage > 50 ? 1 : 0;
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
                  seg.color === "bg-blue-500"
                    ? "#3b82f6"
                    : seg.color === "bg-indigo-500"
                      ? "#6366f1"
                      : seg.color === "bg-emerald-500"
                        ? "#10b981"
                        : seg.color === "bg-red-500"
                          ? "#ef4444"
                          : "#9ca3af";

                return (
                  <path
                    key={seg.status}
                    d={`M ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A 25 25 0 ${largeArc} 0 ${x4} ${y4} Z`}
                    fill={fillColor}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-lg font-bold text-slate-900">{total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {segments.map((seg) => (
              <div
                key={seg.status}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("h-3 w-3 rounded", seg.color)} />
                  <span className="text-sm text-slate-700">{seg.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-slate-900">
                    {seg.count}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    ({seg.percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Customers */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-slate-900">
            Top Customers (Outstanding)
          </h3>
          <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
            View all →
          </button>
        </div>
        <div className="space-y-3">
          {chartsData.statusCounts &&
            Object.entries(chartsData.statusCounts)
              .filter(([_, count]) => count > 0)
              .slice(0, 5)
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">
                    {statusLabels[status] || status}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {count} invoices
                  </span>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

// ─── AI Copilot Panel ──────────────────────────────────────────────────────

function AiCopilotPanel({
  insights,
  agingSummary,
  totalOutstanding,
}: {
  insights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
  agingSummary: {
    current: number;
    "31_60": number;
    "61_90": number;
    "90_plus": number;
  };
  totalOutstanding: number;
}) {
  const [message, setMessage] = useState("");

  const quickQuestions = [
    "Why is invoice INV-2025-1040 overdue?",
    "Show invoices for Access Bank Gambia",
    "Who are my top paying customers?",
    "Predict cash flow from invoices",
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
          <h4 className="font-medium text-slate-900">
            Good morning, Famara! 👋
          </h4>
          <p className="text-sm text-slate-500 mt-1">
            I analyzed your invoicing data and found a few things you might want
            to know.
          </p>
        </div>

        {/* AI Insights */}
        <div>
          <h4 className="font-medium text-slate-900 mb-3">Top Insight</h4>
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

        {/* Aging Summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Aging Summary</h4>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View report →
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Current (0-30 days)</span>
              <span className="font-medium text-emerald-600">
                GMD {agingSummary.current.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">31-60 days</span>
              <span className="font-medium text-amber-600">
                GMD {agingSummary["31_60"].toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">61-90 days</span>
              <span className="font-medium text-orange-600">
                GMD {agingSummary["61_90"].toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">90+ days</span>
              <span className="font-medium text-red-600">
                GMD {agingSummary["90_plus"].toLocaleString()}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-900">
                  Total Outstanding
                </span>
                <span className="font-bold text-slate-900">
                  GMD {totalOutstanding.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="font-medium text-slate-900 mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <PlusCircle className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  Create Invoice
                </p>
                <p className="text-xs text-slate-500">New invoice</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  Recurring Invoices
                </p>
                <p className="text-xs text-slate-500">Manage templates</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Link className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  Payment Links
                </p>
                <p className="text-xs text-slate-500">Share & get paid</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileCheck className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  Credit Notes
                </p>
                <p className="text-xs text-slate-500">Issue credit note</p>
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

// ─── Helper ────────────────────────────────────────────────────────────────

function Wallet(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function InvoicingPage() {
  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  );

  // Fetch overview data
  const { data: overviewData, isLoading: overviewLoading } =
    trpc.invoicing.getOverview.useQuery();

  // Fetch invoices
  const { data: invoicesData, isLoading: invoicesLoading } =
    trpc.invoicing.listInvoices.useQuery({
      status: activeTab,
      limit: 10,
      offset: 0,
    });

  // Fetch charts data
  const { data: chartsData } = trpc.invoicing.getChartsData.useQuery();

  // Fetch AI insights
  const { data: aiInsights } = trpc.invoicing.getAiInsights.useQuery();

  const tabs = [
    { key: "all" as StatusFilter, label: "All Invoices" },
    {
      key: "draft" as StatusFilter,
      label: "Draft",
      count: overviewData?.statusCounts.draft,
    },
    {
      key: "sent" as StatusFilter,
      label: "Sent",
      count: overviewData?.statusCounts.sent,
    },
    {
      key: "viewed" as StatusFilter,
      label: "Viewed",
      count: overviewData?.statusCounts.viewed,
    },
    {
      key: "overdue" as StatusFilter,
      label: "Overdue",
      count: overviewData?.statusCounts.overdue,
    },
    {
      key: "paid" as StatusFilter,
      label: "Paid",
      count: overviewData?.statusCounts.paid,
    },
    {
      key: "cancelled" as StatusFilter,
      label: "Cancelled",
      count: overviewData?.statusCounts.cancelled,
    },
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
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
                <p className="text-sm text-slate-500">
                  Create, send and track your invoices. Get paid faster with AI.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                <Plus className="h-4 w-4" />
                New Invoice
                <ChevronDown className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Download className="h-4 w-4" />
                Import
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <MoreHorizontal className="h-4 w-4" />
                More
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
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "ml-2 px-2 py-0.5 rounded-full text-xs",
                      activeTab === tab.key
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
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
                placeholder="Search invoices..."
                className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>All Customers</option>
            </select>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>All Statuses</option>
              <option>Draft</option>
              <option>Sent</option>
              <option>Viewed</option>
              <option>Overdue</option>
              <option>Paid</option>
              <option>Cancelled</option>
            </select>
            <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>All Teams</option>
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

        {/* Invoice Table */}
        <div className="flex-1 overflow-auto bg-white">
          <InvoiceTable
            invoices={invoicesData?.invoices ?? []}
            selectedId={selectedInvoiceId}
            onSelect={setSelectedInvoiceId}
            isLoading={invoicesLoading}
          />
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing 1 to {invoicesData?.invoices.length ?? 0} of{" "}
              {(invoicesData?.totalCount ?? 0).toLocaleString()} invoices
            </p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, "...", 9].map((p, i) => (
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

        {/* Charts Row */}
        {chartsData && (
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <ChartsRow chartsData={chartsData} />
          </div>
        )}
      </div>

      {/* AI Copilot Panel */}
      <div className="w-[360px]">
        <AiCopilotPanel
          insights={aiInsights ?? []}
          agingSummary={
            overviewData?.agingSummary ?? {
              current: 0,
              "31_60": 0,
              "61_90": 0,
              "90_plus": 0,
            }
          }
          totalOutstanding={overviewData?.summary.totalOutstanding ?? 0}
        />
      </div>
    </div>
  );
}
