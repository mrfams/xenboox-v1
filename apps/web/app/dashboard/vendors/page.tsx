"use client";

import { useState } from "react";
import {
  Search,
  Download,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Bot,
  TrendingDown,
  FileText,
  MoreHorizontal,
  RefreshCw,
  Send,
  Plus,
  Upload,
  Users,
  Clock,
  Trash2,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";
import type { SummaryCardItem } from "@/components/module/module-page-shell.types";
import { CreateVendorDialog } from "@/components/dashboard/create-vendor-dialog";
import { RowActionsMenu } from "@/components/module/row-actions-menu";
import { RowAiAction } from "@/components/module/row-ai-action";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function buildSummaryCards(overview: {
  totalPayables: number;
  totalPayablesChange: number;
  overdueAmount: number;
  overdueChange: number;
  dueWithin7: number;
  dueWithin7Count: number;
  totalVendors: number;
  avgDaysToPay: number;
}): SummaryCardItem[] {
  return [
    {
      label: "Total Payables (All)",
      value: `GMD ${overview.totalPayables.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: overview.totalPayablesChange,
      icon: FileText,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Overdue Amount",
      value: `GMD ${overview.overdueAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: overview.overdueChange,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Due Within 7 Days",
      value: `GMD ${overview.dueWithin7.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${overview.dueWithin7Count} invoices`,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Total Vendors",
      value: overview.totalVendors.toString(),
      subtitle: "Active vendors",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Avg. Days to Pay",
      value: `${overview.avgDaysToPay} days`,
      change: -4,
      icon: TrendingDown,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];
}

// ─── Vendor Table ──────────────────────────────────────────────────────────

function VendorTable({
  vendors,
  isLoading,
  onDelete,
}: {
  vendors: Array<{
    id: string;
    name: string;
    vendorCode: string;
    vendorType: string;
    contactEmail: string | null;
    contactPhone: string | null;
    payables: number;
    payablesFormatted: string;
    overdue: number;
    overdueFormatted: string;
    paymentTerms: string;
    status: string;
    statusColor: string;
    initials: string;
  }>;
  isLoading: boolean;
  onDelete?: (id: string) => void;
}) {
  const vendorTypeColors: Record<string, string> = {
    Supplier: "bg-blue-100 text-blue-700",
    Bank: "bg-indigo-100 text-indigo-700",
    "Service Provider": "bg-purple-100 text-purple-700",
    Logistics: "bg-amber-100 text-amber-700",
  };

  const statusColors: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700",
    Inactive: "bg-slate-100 text-slate-600",
    "On Hold": "bg-amber-100 text-amber-700",
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
              Vendor
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Vendor Type
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Phone / Email
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Payables (GMD)
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Overdue (GMD)
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Payment Terms
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
          {vendors.map((vendor) => (
            <tr
              key={vendor.id}
              className="group relative border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <RowAiAction
                focus={{
                  kind: "Vendor",
                  name: vendor.name,
                  id: vendor.id,
                  fields: [
                    { label: "Code", value: vendor.vendorCode },
                    { label: "Type", value: vendor.vendorType },
                    {
                      label: "Payables",
                      value: `GMD ${vendor.payables.toLocaleString()}`,
                    },
                    {
                      label: "Overdue",
                      value: `GMD ${vendor.overdue.toLocaleString()}`,
                    },
                  ],
                }}
              />
              <td className="py-3 px-4">
                <input type="checkbox" className="rounded border-slate-300" />
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {vendor.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {vendor.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {vendor.vendorCode}
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                    vendorTypeColors[vendor.vendorType] ||
                      vendorTypeColors.Supplier,
                  )}
                >
                  {vendor.vendorType}
                </span>
              </td>
              <td className="py-3 px-4">
                <div>
                  {vendor.contactPhone && (
                    <p className="text-sm text-slate-700">
                      {vendor.contactPhone}
                    </p>
                  )}
                  {vendor.contactEmail && (
                    <p className="text-xs text-slate-500 truncate max-w-[150px]">
                      {vendor.contactEmail}
                    </p>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-sm font-medium text-slate-900">
                  {vendor.payables > 0
                    ? vendor.payables.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "0.00"}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span
                  className={cn(
                    "text-sm font-medium",
                    vendor.overdue > 0 ? "text-red-600" : "text-slate-600",
                  )}
                >
                  {vendor.overdue > 0
                    ? vendor.overdue.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "0.00"}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {vendor.paymentTerms}
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                    statusColors[vendor.status] || statusColors.Active,
                  )}
                >
                  {vendor.status}
                </span>
              </td>
              <td className="py-3 px-4">
                <RowActionsMenu
                  items={[
                    {
                      label: "Delete vendor",
                      icon: <Trash2 className="h-3.5 w-3.5" />,
                      destructive: true,
                      onSelect: () => onDelete?.(vendor.id),
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

// ─── AI Copilot Panel ──────────────────────────────────────────────────────

function AiCopilotPanel({
  insights,
  aging,
}: {
  insights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
  aging: {
    aging: Array<{
      label: string;
      amount: number;
      amountFormatted: string;
      percent: number;
    }>;
    total: number;
    totalFormatted: string;
  };
}) {
  const [message, setMessage] = useState("");

  const quickActions = [
    "Which vendors have the highest payables?",
    "Show vendors with overdue invoices",
    "Who are my 1099 vendors?",
    "Analyze vendor payment trends",
  ];

  const agingColors = [
    "bg-emerald-500",
    "bg-blue-500",
    "bg-amber-500",
    "bg-red-500",
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
        {/* Greeting */}
        <div>
          <p className="text-lg font-medium text-slate-900">
            Good morning, Famara 👋
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Here&apos;s what I found in your vendor data.
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

        {/* Vendor Aging (Payables) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-900">
              Vendor Aging (Payables)
            </h4>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View report →
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Donut Chart */}
            <div className="relative">
              <svg className="h-32 w-32" viewBox="0 0 100 100">
                {aging.aging.map((item, i) => {
                  const startAngle = aging.aging
                    .slice(0, i)
                    .reduce((acc, a) => acc + (a.percent / 100) * 360, 0);
                  const endAngle = startAngle + (item.percent / 100) * 360;
                  const largeArc = item.percent > 50 ? 1 : 0;
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
                      key={item.label}
                      d={`M ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A 25 25 0 ${largeArc} 0 ${x4} ${y4} Z`}
                      className={agingColors[i % agingColors.length]}
                      fill="currentColor"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900">
                    GMD {(aging.total / 1000).toFixed(0)}K
                  </p>
                  <p className="text-[10px] text-slate-500">Total</p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-2">
              {aging.aging.map((item, i) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full",
                        agingColors[i % agingColors.length],
                      )}
                    />
                    <span className="text-xs text-slate-600">{item.label}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {item.amountFormatted} ({item.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-3">
            Quick Actions
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200">
              <Plus className="h-4 w-4 text-indigo-600" />
              New Vendor
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200">
              <Upload className="h-4 w-4 text-emerald-600" />
              Upload Vendors
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200">
              <FileText className="h-4 w-4 text-blue-600" />
              Vendor Statement
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200">
              <Download className="h-4 w-4 text-purple-600" />
              1099 Report
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
            placeholder="Ask anything about your vendors..."
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

// ─── Bottom Row ────────────────────────────────────────────────────────────

function BottomRow({
  topVendors,
  paymentTerms,
}: {
  topVendors: Array<{
    name: string;
    total: number;
    totalFormatted: string;
  }>;
  paymentTerms: {
    terms: Array<{
      name: string;
      count: number;
      percent: number;
    }>;
    totalVendors: number;
  };
}) {
  // Mock payables trend data (would come from API in production)
  const trendData = [
    { month: "Dec", amount: 85000 },
    { month: "Jan", amount: 92000 },
    { month: "Feb", amount: 78000 },
    { month: "Mar", amount: 95000 },
    { month: "Apr", amount: 88000 },
    { month: "May", amount: 96450 },
  ];

  const maxTrend = Math.max(...trendData.map((d) => d.amount));

  const termsColors = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-blue-500",
  ];

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Payables Trend */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-900">Payables Trend</h4>
          <select className="text-xs text-slate-500 border border-slate-200 rounded px-2 py-1">
            <option>Last 6 months</option>
          </select>
        </div>

        {/* Line Chart */}
        <div className="h-32 flex items-end gap-2">
          {trendData.map((d, _i) => {
            const height = maxTrend > 0 ? (d.amount / maxTrend) * 100 : 0;
            return (
              <div
                key={d.month}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="w-full relative" style={{ height: "80px" }}>
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">{d.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Vendors by Payables */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-900">
            Top Vendors by Payables
          </h4>
          <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
            View all →
          </button>
        </div>
        <div className="space-y-3">
          {topVendors.map((vendor, _i) => {
            const maxAmount = topVendors[0]?.total ?? 1;
            const width = maxAmount > 0 ? (vendor.total / maxAmount) * 100 : 0;
            return (
              <div key={vendor.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-700 truncate max-w-[120px]">
                    {vendor.name}
                  </span>
                  <span className="text-xs font-medium text-slate-900">
                    {vendor.totalFormatted}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Terms Overview */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-900">
            Payment Terms Overview
          </h4>
        </div>

        <div className="flex items-center gap-4">
          {/* Donut Chart */}
          <div className="relative">
            <svg className="h-32 w-32" viewBox="0 0 100 100">
              {paymentTerms.terms.map((term, i) => {
                const startAngle = paymentTerms.terms
                  .slice(0, i)
                  .reduce((acc, t) => acc + (t.percent / 100) * 360, 0);
                const endAngle = startAngle + (term.percent / 100) * 360;
                const largeArc = term.percent > 50 ? 1 : 0;
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
                    key={term.name}
                    d={`M ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A 25 25 0 ${largeArc} 0 ${x4} ${y4} Z`}
                    className={termsColors[i % termsColors.length]}
                    fill="currentColor"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">
                  {paymentTerms.totalVendors}
                </p>
                <p className="text-[10px] text-slate-500">Vendors</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {paymentTerms.terms.map((term, i) => (
              <div
                key={term.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full",
                      termsColors[i % termsColors.length],
                    )}
                  />
                  <span className="text-xs text-slate-600">{term.name}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {term.count} ({term.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Panel ────────────────────────────────────────────────────────
// Executive snapshot for the Overview tab: payables trend, top vendors,
// payment terms, aging and AI insights. The full vendor table lives on the
// status tabs.

function VendorsOverview({
  topVendors,
  paymentTerms,
  aging,
  insights,
}: {
  topVendors: Array<{
    name: string;
    total: number;
    totalFormatted: string;
  }>;
  paymentTerms: {
    terms: Array<{
      name: string;
      count: number;
      percent: number;
    }>;
    totalVendors: number;
  };
  aging?: {
    aging: Array<{
      label: string;
      amount: number;
      amountFormatted: string;
      percent: number;
    }>;
    total: number;
    totalFormatted: string;
  };
  insights?: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
}) {
  const agingColors = [
    "bg-emerald-500",
    "bg-blue-500",
    "bg-amber-500",
    "bg-red-500",
  ];

  return (
    <>
      {/* Payables trend + concentration */}
      <div className="bg-slate-50/70 p-4">
        <BottomRow topVendors={topVendors} paymentTerms={paymentTerms} />
      </div>

      {/* Aging + AI insights */}
      <div className="grid grid-cols-2 gap-6 border-t border-slate-200 bg-slate-50/70 p-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-medium text-slate-900">
            Vendor Aging (Payables)
          </h3>
          {aging && aging.aging.length > 0 ? (
            <div className="space-y-3">
              {aging.aging.map((item, i) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-32">
                    <div
                      className={cn(
                        "h-3 w-3 rounded",
                        agingColors[i % agingColors.length],
                      )}
                    />
                    <span className="text-xs text-slate-600">{item.label}</span>
                  </div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        agingColors[i % agingColors.length],
                      )}
                      style={{ width: `${Math.min(item.percent, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-900 w-24 text-right">
                    {item.amountFormatted}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-900">
                    Total Payables
                  </span>
                  <span className="font-bold text-slate-900">
                    {aging.totalFormatted}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No aging data yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-medium text-slate-900">AI Insights</h3>
          {insights && insights.length > 0 ? (
            <div className="space-y-3">
              {insights.slice(0, 3).map((insight) => (
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
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "all" | "active" | "inactive" | "on_hold" | "1099"
  >("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [vendorTypeFilter, setVendorTypeFilter] = useState("");
  const [paymentTermsFilter, setPaymentTermsFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);

  // Fetch overview
  const { data: overview } = trpc.ap.getVendorsOverview.useQuery({});

  // Fetch tab counts
  const { data: tabCounts } = trpc.ap.getVendorTabCounts.useQuery();

  // Fetch vendors
  const { data: vendorsData, isLoading: vendorsLoading } =
    trpc.ap.listVendorsWithPayables.useQuery({
      status:
        activeTab === "overview" || activeTab === "1099" ? "all" : activeTab,
      is1099: activeTab === "1099" ? true : undefined,
      search: searchQuery || undefined,
      vendorType: vendorTypeFilter || undefined,
      paymentTerms: paymentTermsFilter || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

  // Fetch top vendors
  const { data: topVendors } = trpc.ap.getTopVendors.useQuery({ limit: 5 });

  // Fetch payment terms
  const { data: paymentTerms } = trpc.ap.getPaymentTermsOverview.useQuery();

  // Fetch aging
  const { data: aging } = trpc.ap.getVendorAging.useQuery();

  // Fetch AI insights
  const { data: insights } = trpc.ap.getVendorAiInsights.useQuery();

  const utils = trpc.useUtils();
  const deleteVendor = trpc.ap.deleteSupplier.useMutation({
    onSuccess: () => {
      utils.ap.listVendorsWithPayables.invalidate();
      utils.ap.getVendorsOverview.invalidate();
    },
    onError: () => undefined,
  });

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "all" as const, label: "All Vendors", count: tabCounts?.all },
    { key: "active" as const, label: "Active", count: tabCounts?.active },
    { key: "inactive" as const, label: "Inactive", count: tabCounts?.inactive },
    { key: "on_hold" as const, label: "On Hold", count: tabCounts?.onHold },
    {
      key: "1099" as const,
      label: "1099 Vendors",
      count: tabCounts?.vendors1099,
    },
  ];

  // Empty state for new users
  const isEmpty = !vendorsLoading && (!overview || overview.totalVendors === 0);

  const pagination = (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-500">
        Showing {(page - 1) * pageSize + 1} to{" "}
        {Math.min(page * pageSize, vendorsData?.totalCount ?? 0)} of{" "}
        {vendorsData?.totalCount ?? 0} vendors
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
          { length: Math.min(5, vendorsData?.totalPages ?? 1) },
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
        <button
          onClick={() =>
            setPage(Math.min(vendorsData?.totalPages ?? 1, page + 1))
          }
          disabled={page === (vendorsData?.totalPages ?? 1)}
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

  return (
    <ModulePageShell
      title="Vendors"
      description="Manage your vendors, payments, and relationships."
      icon={Users}
      actions={
        <>
          <AiSimulationTrigger
            traceId="vendor-profile"
            label="AI Enrich"
            variant="outline"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Vendor
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Upload className="h-4 w-4" />
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
      onTabChange={(key) => {
        setActiveTab(key as typeof activeTab);
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
              placeholder="Search vendors..."
              className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={vendorTypeFilter}
            onChange={(e) => {
              setVendorTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Vendor Types</option>
            <option value="supplier">Supplier</option>
            <option value="bank">Bank</option>
            <option value="service_provider">Service Provider</option>
            <option value="logistics">Logistics</option>
          </select>
          <select
            value={paymentTermsFilter}
            onChange={(e) => {
              setPaymentTermsFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Payment Terms</option>
            <option value="net_0">Net 0</option>
            <option value="net_7">Net 7</option>
            <option value="net_15">Net 15</option>
            <option value="net_30">Net 30</option>
          </select>
          {(vendorTypeFilter || paymentTermsFilter) && (
            <button
              onClick={() => {
                setVendorTypeFilter("");
                setPaymentTermsFilter("");
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
                Add your first vendor
              </h2>
              <p className="text-sm text-slate-500">
                Track your suppliers, payments, and purchase orders. You can add
                vendors manually or import from a spreadsheet.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Vendor
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <Upload className="h-4 w-4" />
                Import Vendors
              </button>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
              <span>✓ Track payables</span>
              <span>✓ Payment reminders</span>
              <span>✓ 1099 tracking</span>
            </div>
          </div>
        </div>
      ) : activeTab === "overview" ? (
        <VendorsOverview
          topVendors={topVendors ?? []}
          paymentTerms={paymentTerms ?? { terms: [], totalVendors: 0 }}
          aging={aging}
          insights={insights}
        />
      ) : (
        <VendorTable
          vendors={vendorsData?.vendors ?? []}
          isLoading={vendorsLoading}
          onDelete={(id) => deleteVendor.mutate({ id })}
        />
      )}
      <CreateVendorDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </ModulePageShell>
  );
}
