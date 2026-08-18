"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Download,
  ChevronDown,
  MoreHorizontal,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bot,
  RefreshCw,
  Send,
  PlusCircle,
  FileText,
  CreditCard,
  BarChart3,
  Eye,
  Mail,
  Clipboard,
  CalendarClock,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";
import type { SummaryCardItem } from "@/components/module/module-page-shell.types";
import { CreateCustomerDialog } from "@/components/dashboard/create-customer-dialog";
import { RowActionsMenu } from "@/components/module/row-actions-menu";
import { RowAiAction } from "@/components/module/row-ai-action";

// ─── Types ─────────────────────────────────────────────────────────────────

type StatusFilter =
  | "overview"
  | "all"
  | "active"
  | "inactive"
  | "prospects"
  | "overdue"
  | "high_risk";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function buildSummaryCards(summary: {
  totalReceivables: number;
  receivablesChange: number;
  overdueAmount: number;
  overdueChange: number;
  currentAmount: number;
  currentChange: number;
  totalCustomers: number;
  activeCustomers: number;
  avgDaysToPay: number;
  avgDaysToPayChange: number;
}): SummaryCardItem[] {
  return [
    {
      label: "Total Receivables",
      value: `GMD ${summary.totalReceivables.toLocaleString()}`,
      change: summary.receivablesChange,
      icon: CreditCard,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Overdue Amount",
      value: `GMD ${summary.overdueAmount.toLocaleString()}`,
      change: summary.overdueChange,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Current (Not Due)",
      value: `GMD ${summary.currentAmount.toLocaleString()}`,
      change: summary.currentChange,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Customers",
      value: summary.totalCustomers.toString(),
      subtitle: `${summary.activeCustomers} Active customers`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Avg. Days to Pay",
      value: `${summary.avgDaysToPay} days`,
      change: summary.avgDaysToPayChange,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];
}

// ─── Customer Table ────────────────────────────────────────────────────────

function CustomerTable({
  customers,
  selectedId,
  onSelect,
  isLoading,
}: {
  customers: Array<{
    id: string;
    name: string;
    email: string;
    group: string;
    currentBalance: number;
    overdueAmount: number;
    creditLimit: number;
    avgDaysToPay: number;
    status: string;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  const statusColors: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700",
    Inactive: "bg-slate-100 text-slate-600",
    Overdue: "bg-red-100 text-red-700",
    "At Risk": "bg-amber-100 text-amber-700",
  };

  const customerColors: Record<string, string> = {
    "Access Bank Gambia": "bg-blue-600",
    "GTBank Gambia Ltd": "bg-red-500",
    "Ministry of Health": "bg-emerald-600",
    "Kombo Auto Works": "bg-amber-500",
    "Sunu Trading Co.": "bg-purple-500",
    "Reliable Pharmacy": "bg-cyan-500",
    "BuildCo Ltd": "bg-indigo-500",
    "Westfield Supermarket": "bg-pink-500",
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
              Customer
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Customer Group
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Current Balance
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Overdue Amount
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Credit Limit
            </th>
            <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">
              Days to Pay (Avg.)
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
          {customers.map((customer) => {
            const customerColor =
              customerColors[customer.name] ?? "bg-slate-400";
            const initials = customer.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <tr
                key={customer.id}
                onClick={() => onSelect(customer.id)}
                className={cn(
                  "group relative border-b border-slate-100 cursor-pointer transition-colors",
                  selectedId === customer.id
                    ? "bg-indigo-50"
                    : "hover:bg-slate-50",
                )}
              >
                <RowAiAction
                  focus={{
                    kind: "Customer",
                    name: customer.name,
                    id: customer.id,
                    fields: [
                      { label: "Email", value: customer.email },
                      { label: "Group", value: customer.group },
                      {
                        label: "Balance",
                        value: `GMD ${customer.currentBalance.toLocaleString()}`,
                      },
                      {
                        label: "Overdue",
                        value: `GMD ${customer.overdueAmount.toLocaleString()}`,
                      },
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
                        "h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold",
                        customerColor,
                      )}
                    >
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {customer.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        CUST-{customer.id.slice(-3).toUpperCase()} •{" "}
                        {customer.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {customer.group}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-medium text-slate-900">
                    GMD{" "}
                    {customer.currentBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      customer.overdueAmount > 0
                        ? "text-red-600"
                        : "text-slate-900",
                    )}
                  >
                    GMD{" "}
                    {customer.overdueAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm text-slate-600">
                    GMD{" "}
                    {customer.creditLimit.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-sm text-slate-600">
                    {customer.avgDaysToPay}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                      statusColors[customer.status] || statusColors.Active,
                    )}
                  >
                    {customer.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <RowActionsMenu
                    items={[
                      {
                        label: "View details",
                        icon: <Eye className="h-3.5 w-3.5" />,
                        onSelect: () => onSelect(customer.id),
                      },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Receivables Trend Chart ───────────────────────────────────────────────

function ReceivablesTrendChart({
  trendData,
}: {
  trendData: Array<{ month: string; receivables: number }>;
}) {
  const maxValue = Math.max(...trendData.map((d) => d.receivables), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">Receivables Trend</h3>
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
              style={{ height: `${(d.receivables / maxValue) * 100}%` }}
            />
            <span className="text-[10px] text-slate-400">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top Customers Chart ───────────────────────────────────────────────────

function TopCustomersChart({
  customers,
}: {
  customers: Array<{ name: string; balance: number }>;
}) {
  const maxBalance = Math.max(...customers.map((c) => c.balance), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">
          Top Customers (By Balance)
        </h3>
        <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          View all →
        </button>
      </div>
      <div className="space-y-3">
        {customers.map((customer, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-40 truncate">
              {customer.name}
            </span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${(customer.balance / maxBalance) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-900 w-24 text-right">
              GMD {customer.balance.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Aging Summary ─────────────────────────────────────────────────────────

function AgingSummary({
  agingSummary,
  totalReceivables,
}: {
  agingSummary: {
    current: number;
    "31_60": number;
    "61_90": number;
    "90_plus": number;
  };
  totalReceivables: number;
}) {
  const total = totalReceivables || 1;
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">Aging Summary</h3>
        <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          View aging report →
        </button>
      </div>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-32">
              <div className={cn("h-3 w-3 rounded", seg.color)} />
              <span className="text-xs text-slate-600">{seg.label}</span>
            </div>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", seg.color)}
                style={{ width: `${seg.percentage}%` }}
              />
            </div>
            <div className="text-right w-40">
              <span className="text-sm font-medium text-slate-900">
                GMD {seg.value.toLocaleString()} ({seg.percentage.toFixed(0)}%)
              </span>
            </div>
          </div>
        ))}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between">
            <span className="font-medium text-slate-900">
              Total Receivables
            </span>
            <span className="font-bold text-slate-900">
              GMD {totalReceivables.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Panel ────────────────────────────────────────────────────────
// Executive snapshot for the Overview tab: receivables trend, top customers,
// aging, and AI insights. The full filterable customer table lives on the
// status tabs.

function CustomersOverview({
  receivablesTrend,
  topCustomers,
  agingSummary,
  totalReceivables,
  insights,
}: {
  receivablesTrend?: Array<{ month: string; receivables: number }>;
  topCustomers?: Array<{ name: string; balance: number }>;
  agingSummary?: {
    current: number;
    "31_60": number;
    "61_90": number;
    "90_plus": number;
  };
  totalReceivables: number;
  insights?: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
}) {
  return (
    <>
      {/* Receivables trend + concentration */}
      <div className="grid grid-cols-3 gap-6 bg-slate-50/70 p-4">
        {receivablesTrend && (
          <ReceivablesTrendChart trendData={receivablesTrend} />
        )}
        {topCustomers && <TopCustomersChart customers={topCustomers} />}
        {agingSummary && (
          <AgingSummary
            agingSummary={agingSummary}
            totalReceivables={totalReceivables}
          />
        )}
      </div>

      {/* AI Insights */}
      <div className="border-t border-slate-200 bg-slate-50/70 p-4">
        <h3 className="mb-3 font-medium text-slate-900">AI Insights</h3>
        {insights && insights.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {insights.slice(0, 4).map((insight) => (
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
    </>
  );
}

// ─── AI Copilot Panel ──────────────────────────────────────────────────────

function AiCopilotPanel({
  insights,
  customerHealth,
}: {
  insights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
  customerHealth: {
    healthy: number;
    atRisk: number;
    overdue: number;
    inactive: number;
  };
}) {
  const [message, setMessage] = useState("");

  const quickQuestions = [
    "Who are my top paying customers?",
    "Which customers pay late most often?",
    "Show customers with high balances",
    "Predict cash flow from customers",
  ];

  const total =
    customerHealth.healthy +
    customerHealth.atRisk +
    customerHealth.overdue +
    customerHealth.inactive;
  const healthSegments = [
    {
      label: "Healthy",
      count: customerHealth.healthy,
      color: "bg-emerald-500",
      percentage: (customerHealth.healthy / total) * 100,
    },
    {
      label: "At Risk",
      count: customerHealth.atRisk,
      color: "bg-amber-500",
      percentage: (customerHealth.atRisk / total) * 100,
    },
    {
      label: "Overdue",
      count: customerHealth.overdue,
      color: "bg-red-500",
      percentage: (customerHealth.overdue / total) * 100,
    },
    {
      label: "Inactive",
      count: customerHealth.inactive,
      color: "bg-slate-400",
      percentage: (customerHealth.inactive / total) * 100,
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
          <h4 className="font-medium text-slate-900">
            Good morning, Famara! 👋
          </h4>
          <p className="text-sm text-slate-500 mt-1">
            I reviewed your customer data and found a few things.
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

        {/* Customer Health Overview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">
              Customer Health Overview
            </h4>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View report →
            </button>
          </div>
          <div className="flex items-center gap-4">
            {/* Donut Chart */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {healthSegments.map((seg, i) => {
                  const startAngle = healthSegments
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
                <p className="text-lg font-bold text-slate-900">{total}</p>
                <p className="text-[10px] text-slate-500">Total</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-1">
              {healthSegments.map((seg) => (
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
                      ({seg.percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
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
                  New Customer
                </p>
                <p className="text-xs text-slate-500">Add new customer</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  Customer Statement
                </p>
                <p className="text-xs text-slate-500">Generate statement</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  Customer Credit Note
                </p>
                <p className="text-xs text-slate-500">Issue credit note</p>
              </div>
            </button>
            <button className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">
                  Aging Report
                </p>
                <p className="text-xs text-slate-500">View aging summary</p>
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
            placeholder="Ask anything about your customers..."
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

// ─── AI Credit Review (overview) ──────────────────────────────────────────
// Live procedure behind the "AI Review Credit" button: exposure vs credit
// limits per customer with aging — over-limit and near-limit flagged first.

function CreditReviewPanel() {
  const { data: review } = trpc.customers.getCreditReview.useQuery();

  if (!review) {
    return (
      <div className="border-t border-slate-200 bg-slate-50/70 p-4">
        <p className="text-sm text-slate-400">
          Reviewing customer credit exposure…
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <CreditCard className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Credit review
            </h3>
            <p className="text-[11px] text-slate-500">
              Exposure vs credit limits · over-limit and near-limit flagged
            </p>
          </div>
        </div>
        <AiSimulationTrigger
          traceId="credit-limit-review"
          label="Run"
          variant="outline"
          className="!py-1 !px-2.5 !text-[11px]"
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            Total exposure
          </p>
          <p className="text-sm font-bold text-slate-900">
            GMD {review.summary.totalExposure.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-red-50 p-2">
          <p className="text-[10px] uppercase tracking-wide text-red-500">
            Over limit
          </p>
          <p className="text-sm font-bold text-red-700">
            {review.summary.overLimit}
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 p-2">
          <p className="text-[10px] uppercase tracking-wide text-amber-500">
            Near limit
          </p>
          <p className="text-sm font-bold text-amber-700">
            {review.summary.nearLimit}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            With overdue
          </p>
          <p className="text-sm font-bold text-slate-900">
            {review.summary.withOverdue}
          </p>
        </div>
      </div>

      <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
        {review.rows.slice(0, 10).map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-2.5 py-1.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-800">
                {r.name}
              </p>
              <p className="text-[10px] text-slate-400">
                GMD {r.exposure.toLocaleString()} / limit GMD{" "}
                {r.creditLimit.toLocaleString()}
                {r.utilization != null && ` · ${r.utilization}% used`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "max-w-[220px] truncate text-[10px]",
                  r.overLimit
                    ? "text-red-600"
                    : r.nearLimit
                      ? "text-amber-600"
                      : r.overdue > 0
                        ? "text-orange-600"
                        : "text-slate-400",
                )}
              >
                {r.recommendation}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  r.overLimit
                    ? "bg-red-50 text-red-600"
                    : r.nearLimit
                      ? "bg-amber-50 text-amber-600"
                      : r.overdue > 0
                        ? "bg-orange-50 text-orange-600"
                        : "bg-emerald-50 text-emerald-600",
                )}
              >
                {r.overLimit
                  ? "Over limit"
                  : r.nearLimit
                    ? "Near limit"
                    : r.overdue > 0
                      ? "Overdue"
                      : "Healthy"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [activeTab, setActiveTab] = useState<StatusFilter>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);
  const [showCollections, setShowCollections] = useState(false);

  // Fetch overview data
  const { data: overviewData, isLoading: overviewLoading } =
    trpc.customers.getOverview.useQuery();

  // Fetch customers
  const { data: customersData, isLoading: customersLoading } =
    trpc.customers.listCustomers.useQuery({
      status: activeTab === "overview" ? "all" : activeTab,
      search: searchQuery || undefined,
      group: groupFilter || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

  // Fetch receivables trend
  const { data: receivablesTrend } =
    trpc.customers.getReceivablesTrend.useQuery();

  // Fetch AI insights
  const { data: aiInsights } = trpc.customers.getAiInsights.useQuery();

  const tabs = [
    { key: "overview" as StatusFilter, label: "Overview" },
    {
      key: "all" as StatusFilter,
      label: "All Customers",
      count: overviewData?.statusCounts.all,
    },
    {
      key: "active" as StatusFilter,
      label: "Active",
      count: overviewData?.statusCounts.active,
    },
    {
      key: "inactive" as StatusFilter,
      label: "Inactive",
      count: overviewData?.statusCounts.inactive,
    },
    {
      key: "prospects" as StatusFilter,
      label: "Prospects",
      count: overviewData?.statusCounts.prospects,
    },
    {
      key: "overdue" as StatusFilter,
      label: "Overdue",
      count: overviewData?.statusCounts.overdue,
    },
    {
      key: "high_risk" as StatusFilter,
      label: "High Risk",
      count: overviewData?.statusCounts.highRisk,
    },
  ];

  // Empty state for new users
  const isEmpty =
    !customersLoading && (!overviewData || overviewData.statusCounts.all === 0);

  const pagination = (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-500">
        Showing 1 to {customersData?.customers.length ?? 0} of{" "}
        {(customersData?.totalCount ?? 0).toLocaleString()} customers
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
            page >= Math.ceil((customersData?.totalCount ?? 0) / pageSize)
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
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>
    </div>
  );

  return (
    <ModulePageShell
      title="Customers"
      description="Manage your customer relationships, credit, and receivables with AI."
      icon={Users}
      iconBgClassName="bg-gradient-to-br from-indigo-500 to-purple-500"
      actions={
        <>
          <AiSimulationTrigger
            traceId="collections-flow"
            label="AI Collect"
            variant="outline"
          />
          <AiSimulationTrigger
            traceId="credit-limit-review"
            label="AI Review Credit"
            variant="outline"
          />
          <button
            onClick={() => setShowCollections(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Mail className="h-4 w-4 text-indigo-600" />
            Collections
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Customer
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={groupFilter}
            onChange={(e) => {
              setGroupFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Customer Groups</option>
            {overviewData?.customerGroups &&
              Object.keys(overviewData.customerGroups).map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
          </select>
          {(searchQuery || groupFilter) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setGroupFilter("");
                setPage(1);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </div>
      }
      pagination={activeTab !== "overview" ? pagination : undefined}
    >
      {isEmpty ? (
        <div className="flex items-center justify-center py-16">
          <div className="max-w-lg text-center space-y-6 p-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-100">
              <Users className="h-10 w-10 text-indigo-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                Add your first customer
              </h2>
              <p className="text-sm text-slate-500">
                Start tracking invoices, payments, and customer relationships.
                You can add customers manually or import from a spreadsheet.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Customer
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <Download className="h-4 w-4" />
                Import Customers
              </button>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
              <span>✓ Track receivables</span>
              <span>✓ Auto-reminders</span>
              <span>✓ Credit limits</span>
            </div>
          </div>
        </div>
      ) : activeTab === "overview" ? (
        <>
          <CustomersOverview
            receivablesTrend={receivablesTrend}
            topCustomers={overviewData?.topCustomers}
            agingSummary={overviewData?.agingSummary}
            totalReceivables={overviewData?.summary.totalReceivables ?? 0}
            insights={aiInsights}
          />
          <CreditReviewPanel />
        </>
      ) : (
        <CustomerTable
          customers={customersData?.customers ?? []}
          selectedId={selectedCustomerId}
          onSelect={setSelectedCustomerId}
          isLoading={customersLoading}
        />
      )}
      <CreateCustomerDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
      <CollectionsModal
        open={showCollections}
        onClose={() => setShowCollections(false)}
      />
    </ModulePageShell>
  );
}

// ─── Collections queue (ai-reminders / collections-agent) ──────────────────

function CollectionsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading, refetch, isFetching } =
    trpc.ar.listCollections.useQuery(undefined, { enabled: open });
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const draftQuery = trpc.ar.draftReminder.useQuery(
    { invoiceId: draftingId ?? "" },
    { enabled: !!draftingId },
  );

  if (!open) return null;

  const items = data?.items ?? [];
  const totals = data?.totals;
  const draft = draftQuery.data?.draft;

  const copyDraft = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(
      `To: ${draft.to ?? ""}\nSubject: ${draft.subject}\n\n${draft.body}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Collections queue
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {totals
                ? `${totals.count} open invoices · GMD ${totals.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })} outstanding`
                : "Loading…"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw
                className={cn("h-4 w-4", isFetching && "animate-spin")}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Loading collections…
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No outstanding invoices — you&apos;re all caught up.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.invoiceNumber}
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          item.daysOverdue === 0
                            ? "bg-blue-50 text-blue-700"
                            : item.daysOverdue <= 7
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700",
                        )}
                      >
                        <CalendarClock className="mr-1 h-2.5 w-2.5" />
                        {item.daysOverdue === 0
                          ? "Due soon"
                          : `${item.daysOverdue}d overdue`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.customerName} · due {item.dueDate}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      GMD{" "}
                      {item.balance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraftingId(item.id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      draftingId === item.id
                        ? "bg-indigo-600 text-white"
                        : "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
                    )}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Draft reminder
                  </button>
                </div>

                {draftingId === item.id && draft && (
                  <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                        AI-drafted reminder
                      </p>
                      <button
                        type="button"
                        onClick={copyDraft}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <Clipboard className="h-3 w-3" />
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="mt-2 space-y-1.5 text-[12px] leading-5 text-slate-700">
                      <p>
                        <span className="font-medium">To:</span>{" "}
                        {draft.to ?? "(no email on file)"}
                      </p>
                      <p>
                        <span className="font-medium">Subject:</span>{" "}
                        {draft.subject}
                      </p>
                      <p className="whitespace-pre-wrap rounded-lg bg-white p-3">
                        {draft.body}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
