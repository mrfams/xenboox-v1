"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Bot,
  TrendingUp,
  Eye,
  RefreshCw,
  Send,
  PlusCircle,
  CreditCard,
  LayoutGrid,
  Edit,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import type { SummaryCardItem } from "@/components/module/module-page-shell.types";
import { CreateInvoiceDialog } from "@/components/dashboard/create-invoice-dialog";
import { RowActionsMenu } from "@/components/module/row-actions-menu";
import { DocumentUploadButton } from "@/components/module/document-upload-button";

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

function buildSummaryCards(summary: {
  totalOutstanding: number;
  outstandingChange: number;
  overdueAmount: number;
  overdueCount: number;
  overdueChange: number;
  paidThisMonth: number;
  paidChange: number;
  avgCollectionDays: number;
  avgCollectionChange: number;
  conversionRate: number;
  conversionChange: number;
  draftCount: number;
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
      label: "Overdue",
      value: `GMD ${summary.overdueAmount.toLocaleString()}`,
      change: summary.overdueChange ?? 8.3,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Paid (This Month)",
      value: `GMD ${summary.paidThisMonth.toLocaleString()}`,
      change: summary.paidChange,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Draft",
      value: summary.draftCount.toString(),
      change: 0,
      icon: FileText,
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
    partial: "bg-indigo-100 text-indigo-700",
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

  const customerColors: Record<string, string> = {
    "GTBank Gambia Ltd": "bg-red-500",
    "Speedline Logistics": "bg-purple-500",
    "Kairaba Beach Hotel": "bg-amber-500",
    "Ministry of Finance": "bg-blue-600",
    "African Wholesale Ltd": "bg-emerald-500",
    "Banjul Breweries": "bg-indigo-500",
    "Unique Motors": "bg-slate-600",
    "Gambia Ports Authority": "bg-cyan-500",
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
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Balance
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const customerColor =
              customerColors[inv.customerName] ?? "bg-slate-400";

            return (
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
                  <span className="text-sm font-medium text-slate-900">
                    {inv.invoiceNumber}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold",
                        customerColor,
                      )}
                    >
                      {inv.customerName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-slate-900">
                      {inv.customerName}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {new Date(inv.invoiceDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="py-3 px-4">
                  <div>
                    <p className="text-sm text-slate-600">
                      {new Date(inv.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {Math.abs(inv.daysUntilDue)} days
                    </p>
                  </div>
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
                <td className="py-3 px-4 text-right">
                  <div>
                    <span className="text-sm font-medium text-slate-900">
                      GMD{" "}
                      {inv.balance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    {inv.status === "paid" && (
                      <p className="text-xs text-emerald-600">
                        Paid on{" "}
                        {new Date(inv.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                    {inv.status === "overdue" && (
                      <p className="text-xs text-red-600">
                        {Math.abs(inv.daysUntilDue)} day
                        {Math.abs(inv.daysUntilDue) > 1 ? "s" : ""} overdue
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="View invoice"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(inv.id);
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
                          onSelect: () => onSelect(inv.id),
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

// ─── Aging Summary Chart ───────────────────────────────────────────────────

function AgingSummaryChart({
  agingSummary,
  totalOutstanding,
}: {
  agingSummary: {
    current: number;
    "31_60": number;
    "61_90": number;
    "90_plus": number;
  };
  totalOutstanding: number;
}) {
  const total = totalOutstanding || 1;
  const segments = [
    {
      label: "Current (0-30 days)",
      value: agingSummary.current,
      color: "bg-emerald-500",
      percentage: (agingSummary.current / total) * 100,
    },
    {
      label: "31-60 days",
      value: agingSummary["31_60"],
      color: "bg-amber-500",
      percentage: (agingSummary["31_60"] / total) * 100,
    },
    {
      label: "61-90 days",
      value: agingSummary["61_90"],
      color: "bg-orange-500",
      percentage: (agingSummary["61_90"] / total) * 100,
    },
    {
      label: "90+ days",
      value: agingSummary["90_plus"],
      color: "bg-red-500",
      percentage: (agingSummary["90_plus"] / total) * 100,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-medium text-slate-900 mb-4">Aging Summary</h3>
      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-40 h-40">
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
                seg.color === "bg-emerald-500"
                  ? "#10b981"
                  : seg.color === "bg-amber-500"
                    ? "#f59e0b"
                    : seg.color === "bg-orange-500"
                      ? "#f97316"
                      : "#ef4444";

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
            <p className="text-xl font-bold text-slate-900">
              GMD {(totalOutstanding / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-slate-500">Total Outstanding</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("h-3 w-3 rounded", seg.color)} />
                <span className="text-sm text-slate-700">{seg.label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-slate-900">
                  GMD {seg.value.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  {seg.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Invoices Trend Chart ──────────────────────────────────────────────────

function InvoicesTrendChart({
  trendData,
}: {
  trendData: Array<{ month: string; issued: number; paid: number }>;
}) {
  const maxValue = Math.max(
    ...trendData.map((d) => Math.max(d.issued, d.paid)),
    1,
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">Invoices Trend</h3>
        <button className="text-xs text-slate-500 hover:text-slate-700">
          Last 6 months ▾
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-indigo-500" />
          <span className="text-xs text-slate-600">Issued</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-600">Paid</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-40 flex items-end gap-2">
        {trendData.map((d, _i) => (
          <div
            key={d.month}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className="w-full flex gap-1 items-end justify-center"
              style={{ height: "120px" }}
            >
              <div
                className="w-3 bg-indigo-500 rounded-t"
                style={{ height: `${(d.issued / maxValue) * 100}%` }}
              />
              <div
                className="w-3 bg-emerald-500 rounded-t"
                style={{ height: `${(d.paid / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top Customers ─────────────────────────────────────────────────────────

function TopCustomers({
  customers,
}: {
  customers: Array<{ name: string; outstanding: number }>;
}) {
  const customerColors: Record<string, string> = {
    "GTBank Gambia Ltd": "bg-red-500",
    "Kairaba Beach Hotel": "bg-amber-500",
    "African Wholesale Ltd": "bg-emerald-500",
    "Ministry of Finance": "bg-blue-600",
    "Unique Motors": "bg-slate-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">
          Top Customers (Outstanding)
        </h3>
        <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          View all customers →
        </button>
      </div>
      <div className="space-y-3">
        {customers.map((customer, i) => {
          const color = customerColors[customer.name] ?? "bg-slate-400";
          return (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold",
                    color,
                  )}
                >
                  {customer.name.charAt(0)}
                </div>
                <span className="text-sm text-slate-700">{customer.name}</span>
              </div>
              <span className="text-sm font-medium text-slate-900">
                GMD {customer.outstanding.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI Invoice Assistant Panel ────────────────────────────────────────────

function AiInvoiceAssistantPanel({
  insights,
  recentActivity,
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
    invoiceNumber: string;
    action: string;
    date: string;
    amount: number;
  }>;
}) {
  const [message, setMessage] = useState("");

  const quickActions = [
    "Find overdue invoices",
    "Create invoice for GTBank",
    "Show top customers by sales",
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
                AI Invoice Assistant
              </h3>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
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
          <h4 className="font-medium text-slate-900">Hello Famara! 👋</h4>
          <p className="text-sm text-slate-500 mt-1">
            How can I help you with invoices today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          {quickActions.map((action, i) => (
            <button
              key={i}
              className="w-full text-left rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <div className="h-5 w-5 rounded bg-indigo-100 flex items-center justify-center">
                <Bot className="h-3 w-3 text-indigo-600" />
              </div>
              {action}
            </button>
          ))}
        </div>

        {/* AI Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">AI Insights</h4>
            <span className="text-xs text-slate-400">Generated 2 min ago</span>
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
                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">
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

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Recent Activity</h4>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">
                      {activity.invoiceNumber}
                    </span>{" "}
                    {activity.action}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(activity.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
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
            placeholder="Ask anything about invoices..."
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

// ─── Shortcuts Sidebar ─────────────────────────────────────────────────────

function ShortcutsSidebar() {
  const shortcuts = [
    { label: "New Invoice", icon: PlusCircle, href: "#" },
    { label: "Recurring Invoices", icon: RefreshCw, href: "#" },
    { label: "Customer Statements", icon: FileText, href: "#" },
    { label: "Credit Notes", icon: CreditCard, href: "#" },
  ];

  return (
    <div className="border-b border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-900">Shortcuts</h3>
        <button className="text-slate-400 hover:text-slate-600">
          <Edit className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.label}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <shortcut.icon className="h-4 w-4 text-slate-400" />
            {shortcut.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function InvoicingPage() {
  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);

  // Fetch overview data
  const { data: overviewData, isLoading: overviewLoading } =
    trpc.invoicing.getOverview.useQuery();

  // Fetch invoices
  const { data: invoicesData, isLoading: invoicesLoading } =
    trpc.invoicing.listInvoices.useQuery({
      status: activeTab,
      search: searchQuery || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

  // Fetch charts data
  const { data: chartsData } = trpc.invoicing.getChartsData.useQuery();

  // Fetch AI insights
  const { data: aiInsights } = trpc.invoicing.getAiInsights.useQuery();

  // Fetch recent activity
  const { data: recentActivity } = trpc.invoicing.getRecentActivity.useQuery();

  // Fetch invoices trend
  const { data: invoicesTrend } = trpc.invoicing.getInvoicesTrend.useQuery();

  const tabs = [
    {
      key: "all" as StatusFilter,
      label: "All Invoices",
      count: overviewData?.totalInvoices,
    },
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

  // Add draftCount to summary
  const summaryWithDraft = overviewData?.summary
    ? { ...overviewData.summary, draftCount: overviewData.statusCounts.draft }
    : undefined;

  // Empty state for new users
  const isEmpty =
    !invoicesLoading && (!overviewData || overviewData.totalInvoices === 0);

  return (
    <div className="flex min-h-full">
      {/* Left Shortcuts Sidebar */}
      <div className="w-[200px] border-r border-slate-200 bg-white hidden lg:block">
        <ShortcutsSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <ModulePageShell
          noOuterWrapper
          title="Invoices"
          description="Create, send and track your customer invoices."
          icon={FileText}
          actions={
            <>
              <DocumentUploadButton
                docType="invoice"
                label="Upload Invoice"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              />
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Invoice
              </button>
            </>
          }
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as StatusFilter)}
          summaryCards={
            summaryWithDraft ? buildSummaryCards(summaryWithDraft) : []
          }
          filters={
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search invoices..."
                  className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Clear search
                </button>
              )}
            </div>
          }
          pagination={
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing 1 to {invoicesData?.invoices.length ?? 0} of{" "}
                {(invoicesData?.totalCount ?? 0).toLocaleString()} invoices
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded disabled:opacity-50"
                >
                  ←
                </button>
                <span className="text-sm text-slate-600">Page {page}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={
                    page >=
                    Math.ceil((invoicesData?.totalCount ?? 0) / pageSize)
                  }
                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded disabled:opacity-50"
                >
                  →
                </button>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="ml-4 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>
          }
          bottomCharts={
            <div className="grid grid-cols-3 gap-6">
              {overviewData?.agingSummary && (
                <AgingSummaryChart
                  agingSummary={overviewData.agingSummary}
                  totalOutstanding={overviewData.summary.totalOutstanding}
                />
              )}
              {invoicesTrend && (
                <InvoicesTrendChart trendData={invoicesTrend} />
              )}
              {overviewData?.topCustomers && (
                <TopCustomers customers={overviewData.topCustomers} />
              )}
            </div>
          }
        >
          {isEmpty ? (
            <div className="flex items-center justify-center py-16">
              <div className="max-w-lg text-center space-y-6 p-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-100">
                  <FileText className="h-10 w-10 text-indigo-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    Create your first invoice
                  </h2>
                  <p className="text-sm text-slate-500">
                    Start billing your customers by creating your first invoice.
                    You can also upload existing invoices or let AI help you.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Create Invoice
                  </button>
                  <DocumentUploadButton
                    docType="invoice"
                    label="Upload Invoice"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  />
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                  <span>✓ Auto-reminders for overdue</span>
                  <span>✓ Track payments automatically</span>
                  <span>✓ AI-powered insights</span>
                </div>
              </div>
            </div>
          ) : (
            <InvoiceTable
              invoices={invoicesData?.invoices ?? []}
              selectedId={selectedInvoiceId}
              onSelect={setSelectedInvoiceId}
              isLoading={invoicesLoading}
            />
          )}
        </ModulePageShell>
      </div>

      {/* Right AI Assistant Panel */}
      <div className="w-[360px] hidden xl:block">
        <AiInvoiceAssistantPanel
          insights={aiInsights ?? []}
          recentActivity={recentActivity ?? []}
        />
      </div>
      <CreateInvoiceDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}

// ─── Upload Icon (missing from lucide) ─────────────────────────────────────

function Upload(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
