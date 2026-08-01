"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { AICopilotSidebar } from "@/components/dashboard/ai-copilot-sidebar";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import {
  BarChart3,
  TrendingUp,
  Download,
  Clock,
  ArrowRight,
  FileText,
  Bot,
  Plus,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Upload,
  MoreHorizontal,
  Scale,
  Wallet,
  Receipt,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const recentReports = [
  {
    name: "Profit & Loss Statement",
    type: "Financial Statement",
    date: "May 31, 2025 10:21 AM",
    by: "Xenboox AI",
    format: "PDF",
  },
  {
    name: "Cash Flow Statement",
    type: "Financial Statement",
    date: "May 31, 2025 10:21 AM",
    by: "Xenboox AI",
    format: "PDF",
  },
  {
    name: "Aged Receivables",
    type: "Management Report",
    date: "May 31, 2025 9:15 AM",
    by: "Famara Touray",
    format: "Excel",
  },
  {
    name: "Expense Analysis",
    type: "Management Report",
    date: "May 30, 2025 4:42 PM",
    by: "Xenboox AI",
    format: "PDF",
  },
];

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [copilotOpen, setCopilotOpen] = useState(true);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "statements", label: "Financial Statements" },
    { id: "management", label: "Management Reports" },
    { id: "compliance", label: "Compliance" },
    { id: "custom", label: "Custom Reports" },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Reports
              </h1>
              <p className="text-sm text-muted-foreground">
                Financial insights and analytics for smarter decisions.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Revenue (MTD)",
                value: formatCurrency(245600),
                change: "+12.6%",
                changeLabel: "vs Apr 2025",
                icon: DollarSign,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Net Profit (MTD)",
                value: formatCurrency(45230),
                change: "+8.3%",
                changeLabel: "vs Apr 2025",
                icon: TrendingUp,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Total Assets",
                value: formatCurrency(1245320),
                change: "+5.7%",
                changeLabel: "vs Apr 2025",
                icon: Scale,
                color: "text-blue-600",
                bgColor: "bg-blue-50",
              },
              {
                label: "Total Liabilities",
                value: formatCurrency(367890),
                change: "-2.1%",
                changeLabel: "vs Apr 2025",
                icon: AlertTriangle,
                color: "text-red-600",
                bgColor: "bg-red-50",
              },
              {
                label: "Equity",
                value: formatCurrency(877430),
                change: "+7.8%",
                changeLabel: "vs Apr 2025",
                icon: CheckCircle,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {kpi.label}
                    </p>
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        kpi.bgColor,
                      )}
                    >
                      <Icon className={cn("h-4 w-4", kpi.color)} />
                    </div>
                  </div>
                  <p className="text-xl font-bold tracking-tight tabular-nums">
                    {kpi.value}
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      kpi.change?.startsWith("-")
                        ? "text-red-600"
                        : "text-emerald-600",
                    )}
                  >
                    {kpi.change}{" "}
                    <span className="text-muted-foreground">
                      {kpi.changeLabel}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Profit & Loss Overview */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                Profit & Loss Overview
              </h3>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* P&L Table */}
              <div className="space-y-2">
                {[
                  {
                    label: "Revenue",
                    amount: 245600,
                    change: "+12.6%",
                    highlight: false,
                  },
                  {
                    label: "Cost of Goods Sold",
                    amount: -98450,
                    change: "+6.3%",
                    highlight: false,
                  },
                  {
                    label: "Gross Profit",
                    amount: 147150,
                    change: "+16.1%",
                    highlight: true,
                  },
                  {
                    label: "Operating Expenses",
                    amount: -72320,
                    change: "+4.8%",
                    highlight: false,
                  },
                  {
                    label: "Operating Profit",
                    amount: 74830,
                    change: "+21.4%",
                    highlight: true,
                  },
                  {
                    label: "Other Income",
                    amount: 5600,
                    change: "+13.2%",
                    highlight: false,
                  },
                  {
                    label: "Other Expenses",
                    amount: -2200,
                    change: "-5.1%",
                    highlight: false,
                  },
                  {
                    label: "Net Profit",
                    amount: 45230,
                    change: "+8.3%",
                    highlight: true,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between py-2 px-3 rounded",
                      item.highlight ? "bg-primary/5 font-semibold" : "",
                    )}
                  >
                    <span className="text-sm">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono">
                        {formatCurrency(Math.abs(item.amount))}
                      </span>
                      <span
                        className={cn(
                          "text-xs w-16 text-right",
                          item.change.startsWith("-")
                            ? "text-red-600"
                            : "text-emerald-600",
                        )}
                      >
                        {item.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bar Chart */}
              <div className="flex items-end gap-2 h-48">
                {[
                  {
                    label: "Revenue",
                    thisMonth: 245600,
                    lastMonth: 218100,
                    color: "bg-primary",
                  },
                  {
                    label: "COGS",
                    thisMonth: 98450,
                    lastMonth: 92600,
                    color: "bg-red-400",
                  },
                  {
                    label: "Gross Profit",
                    thisMonth: 147150,
                    lastMonth: 125500,
                    color: "bg-emerald-500",
                  },
                  {
                    label: "Op. Expenses",
                    thisMonth: 72320,
                    lastMonth: 69000,
                    color: "bg-amber-500",
                  },
                  {
                    label: "Op. Profit",
                    thisMonth: 74830,
                    lastMonth: 56500,
                    color: "bg-blue-500",
                  },
                  {
                    label: "Net Profit",
                    thisMonth: 45230,
                    lastMonth: 38000,
                    color: "bg-primary",
                  },
                ].map((bar, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full flex gap-0.5 items-end"
                      style={{ height: "100%" }}
                    >
                      <div
                        className={cn("flex-1 rounded-t opacity-60", bar.color)}
                        style={{ height: `${(bar.lastMonth / 245600) * 100}%` }}
                      />
                      <div
                        className={cn("flex-1 rounded-t", bar.color)}
                        style={{ height: `${(bar.thisMonth / 245600) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground text-center">
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded bg-primary" />
                <span className="text-[10px] text-muted-foreground">
                  This month
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded bg-primary/60" />
                <span className="text-[10px] text-muted-foreground">
                  Last month
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Cash Flow Summary */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Cash Flow Summary</h3>
                <Select defaultValue="month">
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">This month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: "Cash from Operating Activities",
                    amount: 58240,
                    color: "text-emerald-600",
                  },
                  {
                    label: "Cash from Investing Activities",
                    amount: -12450,
                    color: "text-red-600",
                  },
                  {
                    label: "Cash from Financing Activities",
                    amount: -8230,
                    color: "text-red-600",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={cn("font-mono font-medium", item.color)}>
                      {item.amount > 0 ? "+" : ""}
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">Net Cash Flow</span>
                  <span className="text-sm font-mono font-bold text-emerald-600">
                    {formatCurrency(37560)}
                  </span>
                </div>
              </div>
              <div className="h-24 flex items-end gap-1 mt-4">
                {[30, 45, 35, 60, 50, 75].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-emerald-500/20 rounded-t"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[8px] text-muted-foreground">
                      {
                        [
                          "May 1",
                          "May 8",
                          "May 15",
                          "May 22",
                          "May 29",
                          "Jun 5",
                        ][i]
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Expense Categories */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Top Expense Categories
                </h3>
                <Select defaultValue="month">
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">This month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative h-28 w-28">
                  <svg viewBox="0 0 36 36" className="h-full w-full">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-primary"
                      strokeDasharray="36 64"
                      strokeDashoffset="25"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-emerald-500"
                      strokeDasharray="19 81"
                      strokeDashoffset="89"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-amber-500"
                      strokeDasharray="12 88"
                      strokeDashoffset="70"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-blue-500"
                      strokeDasharray="9 91"
                      strokeDashoffset="58"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-gray-300"
                      strokeDasharray="24 76"
                      strokeDashoffset="49"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">
                      GMD
                    </span>
                    <span className="text-sm font-bold">72,320</span>
                    <span className="text-[10px] text-muted-foreground">
                      Total Expenses
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[
                    {
                      label: "Salaries & Wages",
                      pct: "35.6%",
                      amount: "GMD 25,730",
                      color: "bg-primary",
                    },
                    {
                      label: "Rent & Utilities",
                      pct: "18.8%",
                      amount: "GMD 13,610",
                      color: "bg-emerald-500",
                    },
                    {
                      label: "Marketing",
                      pct: "12.4%",
                      amount: "GMD 8,970",
                      color: "bg-amber-500",
                    },
                    {
                      label: "Professional Fees",
                      pct: "8.7%",
                      amount: "GMD 6,290",
                      color: "bg-blue-500",
                    },
                    {
                      label: "Software & Subscriptions",
                      pct: "8.2%",
                      amount: "GMD 5,930",
                      color: "bg-purple-500",
                    },
                    {
                      label: "Other",
                      pct: "16.3%",
                      amount: "GMD 11,790",
                      color: "bg-gray-300",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn("h-2 w-2 rounded-full", item.color)}
                        />
                        <span className="text-muted-foreground">
                          {item.label}
                        </span>
                      </div>
                      <span className="font-mono">
                        {item.pct} {item.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <button className="text-xs text-primary hover:underline mt-3">
                View expense report →
              </button>
            </div>

            {/* Balance Sheet Snapshot */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Balance Sheet Snapshot
                </h3>
                <Select defaultValue="today">
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">As of today</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Current Assets", amount: 685430 },
                  { label: "Non-current Assets", amount: 559890 },
                  { label: "Total Assets", amount: 1245320, bold: true },
                  { label: "Current Liabilities", amount: 215670 },
                  { label: "Non-current Liabilities", amount: 152220 },
                  {
                    label: "Total Liabilities",
                    amount: 367890,
                    bold: true,
                    color: "text-red-600",
                  },
                  {
                    label: "Equity",
                    amount: 877430,
                    bold: true,
                    color: "text-emerald-600",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between text-sm py-1",
                      item.bold ? "border-t pt-2 font-semibold" : "pl-3",
                    )}
                  >
                    <span
                      className={cn(item.bold ? "" : "text-muted-foreground")}
                    >
                      {item.label}
                    </span>
                    <span className={cn("font-mono", item.color || "")}>
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <button className="text-xs text-primary hover:underline mt-3">
                View balance sheet →
              </button>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold">Recent Reports</h3>
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                View all reports <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Report Name
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Date Generated
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Generated By
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Format
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((report, i) => (
                    <tr
                      key={i}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium">
                        {report.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {report.type}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {report.date}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {report.by.includes("AI") && (
                            <Bot className="h-3 w-3 text-emerald-500" />
                          )}
                          {report.by}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="secondary" className="text-[10px]">
                          {report.format}
                        </Badge>
                      </td>
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* AI Report Assistant Sidebar */}
      {copilotOpen && (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="AI Report Assistant"
            subtitle="I can help you analyze your financial data and create reports."
            insights={[
              {
                id: "1",
                type: "success",
                title: "Revenue is up 12.6%",
                description:
                  "Your revenue increased by GMD 27,500 compared to April. Main driver: Product Sales (+18%).",
                action: { label: "View analysis", onClick: () => {} },
              },
              {
                id: "2",
                type: "warning",
                title: "Expenses increased slightly",
                description:
                  "Operating expenses are up 4.8%. Marketing spend increased by 18%.",
                action: { label: "View details", onClick: () => {} },
              },
              {
                id: "3",
                type: "info",
                title: "Strong cash position",
                description:
                  "Your cash balance is healthy with 68 days of cash runway.",
                action: { label: "View cash flow", onClick: () => {} },
              },
            ]}
            suggestedActions={[
              {
                id: "1",
                icon: <TrendingUp className="h-4 w-4" />,
                label: "Show me profit trends",
                description: "View P&L history",
              },
              {
                id: "2",
                icon: <BarChart3 className="h-4 w-4" />,
                label: "Compare this month vs last month",
                description: "Side by side",
              },
              {
                id: "3",
                icon: <AlertTriangle className="h-4 w-4" />,
                label: "Why did expenses increase?",
                description: "Get explanation",
              },
              {
                id: "4",
                icon: <FileText className="h-4 w-4" />,
                label: "Generate cash flow forecast",
                description: "Next 3 months",
              },
              {
                id: "5",
                icon: <Plus className="h-4 w-4" />,
                label: "Create custom report",
                description: "Describe in plain English",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
