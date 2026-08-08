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
  Eye,
  RefreshCw,
  Send,
  Filter,
  Calendar,
  CreditCard,
  Link,
  BarChart3,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import type { SummaryCardItem } from "@/components/module/module-page-shell.types";

// ─── Types ─────────────────────────────────────────────────────────────────

type StatusFilter =
  | "all"
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "paid"
  | "overdue";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function buildSummaryCards(summary: {
  totalOutstanding: number;
  outstandingChange: number;
  overdueAmount: number;
  overdueCount: number;
  dueThisWeek: number;
  dueThisWeekCount: number;
  paidThisMonth: number;
  paidThisMonthCount: number;
  avgDaysToPay: number;
  avgDaysToPayChange: number;
}): SummaryCardItem[] {
  return [
    {
      label: "Total Outstanding",
      value: `GMD ${summary.totalOutstanding.toLocaleString()}`,
      change: summary.outstandingChange,
      icon: CreditCard,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Overdue Amount",
      value: `GMD ${summary.overdueAmount.toLocaleString()}`,
      subtitle: `${summary.overdueCount} bills overdue`,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Due This Week",
      value: `GMD ${summary.dueThisWeek.toLocaleString()}`,
      subtitle: `${summary.dueThisWeekCount} bills`,
      icon: Calendar,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Paid This Month",
      value: `GMD ${summary.paidThisMonth.toLocaleString()}`,
      subtitle: `${summary.paidThisMonthCount} bills`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Average Days to Pay",
      value: `${summary.avgDaysToPay} days`,
      change: summary.avgDaysToPayChange,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];
}

// ─── Bills Table ───────────────────────────────────────────────────────────

function BillsTable({
  bills,
  selectedId,
  onSelect,
  isLoading,
}: {
  bills: Array<{
    id: string;
    billNumber: string;
    vendorName: string;
    billDate: string;
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
    pending: "bg-amber-100 text-amber-700",
    partial: "bg-blue-100 text-blue-700",
    overdue: "bg-red-100 text-red-700",
    paid: "bg-emerald-100 text-emerald-700",
    voided: "bg-slate-100 text-slate-600",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending Approval",
    partial: "Scheduled",
    overdue: "Overdue",
    paid: "Paid",
    voided: "Cancelled",
  };

  const vendorColors: Record<string, string> = {
    "Access Bank Gambia": "bg-blue-600",
    "Kombo Auto Works": "bg-amber-500",
    "Office Supplies Co.": "bg-purple-500",
    "Gamtel Ltd": "bg-emerald-600",
    "Total Energies": "bg-red-500",
    "Ministry of Lands": "bg-slate-600",
    "Alpha Logistics": "bg-indigo-500",
    "BuildCo Ltd": "bg-cyan-500",
    "Sunu Trading Co.": "bg-pink-500",
    "PaperCo Gambia": "bg-orange-500",
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
              Bill #
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Vendor
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Bill Date
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
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Due In / Overdue
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => {
            const vendorColor = vendorColors[bill.vendorName] ?? "bg-slate-400";
            const initials = bill.vendorName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <tr
                key={bill.id}
                onClick={() => onSelect(bill.id)}
                className={cn(
                  "border-b border-slate-100 cursor-pointer transition-colors",
                  selectedId === bill.id ? "bg-indigo-50" : "hover:bg-slate-50",
                )}
              >
                <td className="py-3 px-4">
                  <input type="checkbox" className="rounded border-slate-300" />
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-medium text-indigo-600">
                    {bill.billNumber}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold",
                        vendorColor,
                      )}
                    >
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {bill.vendorName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {bill.vendorName.split(" ")[0]}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {new Date(bill.billDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {new Date(bill.dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-medium text-slate-900">
                    GMD{" "}
                    {bill.amount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                      statusColors[bill.status] || statusColors.pending,
                    )}
                  >
                    {statusLabels[bill.status] || bill.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={cn(
                      "text-sm",
                      bill.status === "paid"
                        ? "text-emerald-600"
                        : bill.status === "overdue"
                          ? "text-red-600"
                          : bill.daysUntilDue <= 2
                            ? "text-amber-600"
                            : "text-slate-600",
                    )}
                  >
                    {bill.status === "paid"
                      ? `Paid on ${new Date(bill.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : bill.dueStatus}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Bills Trend Chart ─────────────────────────────────────────────────────

function BillsTrendChart({
  trendData,
}: {
  trendData: Array<{ month: string; total: number }>;
}) {
  const maxValue = Math.max(...trendData.map((d) => d.total), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">Bills Trend</h3>
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
              className="w-full bg-indigo-500 rounded-t"
              style={{ height: `${(d.total / maxValue) * 100}%` }}
            />
            <span className="text-[10px] text-slate-400">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top Vendors Chart ─────────────────────────────────────────────────────

function TopVendorsChart({
  vendors,
}: {
  vendors: Array<{ name: string; balance: number }>;
}) {
  const maxBalance = Math.max(...vendors.map((v) => v.balance), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">
          Top Vendors (Outstanding)
        </h3>
        <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          View all →
        </button>
      </div>
      <div className="space-y-3">
        {vendors.map((vendor, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-32 truncate">
              {vendor.name}
            </span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${(vendor.balance / maxBalance) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-900 w-24 text-right">
              GMD {vendor.balance.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bills by Status Donut ─────────────────────────────────────────────────

function BillsByStatusDonut({
  data,
  total,
}: {
  data: Array<{ label: string; count: number; color: string }>;
  total: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">Bills by Status</h3>
      </div>
      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {data.map((seg, i) => {
              const startAngle = data
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
                seg.color === "bg-amber-500"
                  ? "#f59e0b"
                  : seg.color === "bg-emerald-500"
                    ? "#10b981"
                    : seg.color === "bg-blue-500"
                      ? "#3b82f6"
                      : seg.color === "bg-red-500"
                        ? "#ef4444"
                        : seg.color === "bg-purple-500"
                          ? "#8b5cf6"
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
            <p className="text-xs text-slate-500">Total Bills</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1">
          {data.map((seg) => {
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
    "0_30": number;
    "31_60": number;
    "61_90": number;
    "90_plus": number;
  };
  totalOutstanding: number;
}) {
  const [message, setMessage] = useState("");

  const quickQuestions = [
    "Which bills are overdue?",
    "Show bills by vendor",
    "Predict cash flow with these bills",
    "Which bills are pending my approval?",
  ];

  const agingTotal =
    agingSummary["0_30"] +
      agingSummary["31_60"] +
      agingSummary["61_90"] +
      agingSummary["90_plus"] || 1;

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
            I analyzed your bills and found 4 things to review.
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

        {/* Bill Aging */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Bill Aging</h4>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View report →
            </button>
          </div>
          <div className="space-y-2">
            {[
              {
                label: "0-30 days",
                value: agingSummary["0_30"],
                color: "bg-emerald-500",
              },
              {
                label: "31-60 days",
                value: agingSummary["31_60"],
                color: "bg-amber-500",
              },
              {
                label: "61-90 days",
                value: agingSummary["61_90"],
                color: "bg-orange-500",
              },
              {
                label: "90+ days",
                value: agingSummary["90_plus"],
                color: "bg-red-500",
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-24">
                  <div className={cn("h-2 w-2 rounded", item.color)} />
                  <span className="text-xs text-slate-600">{item.label}</span>
                </div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", item.color)}
                    style={{ width: `${(item.value / agingTotal) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-900 w-24 text-right">
                  GMD {item.value.toLocaleString()}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between">
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
                <Plus className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">New Bill</p>
                <p className="text-xs text-slate-500">Create a new bill</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  Recurring Bills
                </p>
                <p className="text-xs text-slate-500">Manage recurring</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Link className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  Vendor Credits
                </p>
                <p className="text-xs text-slate-500">Apply or create</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  Payment Run
                </p>
                <p className="text-xs text-slate-500">Pay multiple bills</p>
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
            placeholder="Ask anything about your bills..."
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

export default function BillsPage() {
  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  // Fetch overview data
  const { data: overviewData, isLoading: overviewLoading } =
    trpc.bills.getOverview.useQuery();

  // Fetch bills
  const { data: billsData, isLoading: billsLoading } =
    trpc.bills.listBills.useQuery({
      status: activeTab,
      limit: 10,
      offset: 0,
    });

  // Fetch bills trend
  const { data: billsTrend } = trpc.bills.getBillsTrend.useQuery();

  // Fetch AI insights
  const { data: aiInsights } = trpc.bills.getAiInsights.useQuery();

  const tabs = [
    {
      key: "all" as StatusFilter,
      label: "All Bills",
      count: overviewData?.statusCounts.all,
    },
    {
      key: "draft" as StatusFilter,
      label: "Draft",
      count: overviewData?.statusCounts.draft,
    },
    {
      key: "pending_approval" as StatusFilter,
      label: "Pending Approval",
      count: overviewData?.statusCounts.pending_approval,
    },
    {
      key: "approved" as StatusFilter,
      label: "Approved",
      count: overviewData?.statusCounts.approved,
    },
    {
      key: "scheduled" as StatusFilter,
      label: "Scheduled",
      count: overviewData?.statusCounts.scheduled,
    },
    {
      key: "paid" as StatusFilter,
      label: "Paid",
      count: overviewData?.statusCounts.paid,
    },
    {
      key: "overdue" as StatusFilter,
      label: "Overdue",
      count: overviewData?.statusCounts.overdue,
    },
  ];

  return (
    <ModulePageShell
      title="Bills"
      description="Manage your vendor bills and payables. Extract, review and pay with confidence."
      icon={FileText}
      iconBgClassName="bg-gradient-to-br from-indigo-500 to-purple-500"
      actions={
        <>
          <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4" />
            New Bill
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Import
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            More
            <ChevronDown className="h-4 w-4" />
          </button>
        </>
      }
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(key) => setActiveTab(key as StatusFilter)}
      summaryCards={
        overviewData?.summary ? buildSummaryCards(overviewData.summary) : []
      }
      filters={
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search bills..."
              className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>All Vendors</option>
          </select>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>All Statuses</option>
          </select>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>All Due Dates</option>
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
            Showing 1 to {billsData?.bills.length ?? 0} of{" "}
            {(billsData?.totalCount ?? 0).toLocaleString()} bills
          </p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, "...", 13].map((p, i) => (
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
      }
      bottomCharts={
        <div className="grid grid-cols-3 gap-6">
          {billsTrend && <BillsTrendChart trendData={billsTrend} />}
          {overviewData?.topVendors && (
            <TopVendorsChart vendors={overviewData.topVendors} />
          )}
          {overviewData?.billsByStatus && (
            <BillsByStatusDonut
              data={overviewData.billsByStatus}
              total={overviewData.totalBills}
            />
          )}
        </div>
      }
    >
      <BillsTable
        bills={billsData?.bills ?? []}
        selectedId={selectedBillId}
        onSelect={setSelectedBillId}
        isLoading={billsLoading}
      />
    </ModulePageShell>
  );
}
