"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { SubPageTabs } from "@/components/shared/sub-page-tabs";
import { MODULE_TABS } from "@/components/shared/module-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
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
  RefreshCw,
  Plus,
  Download,
  MoreHorizontal,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Eye,
  Landmark,
  AlertCircle,
  Clock,
  Link2,
  FileText,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Mock reconciliation data
const mockAccounts = [
  {
    id: "1",
    name: "Cash at Bank - Dalasi",
    type: "Checking Account",
    number: "**** 4422",
    bank: "Access Bank",
    bookBalance: 78450,
    bankBalance: 78450,
    difference: 0,
    status: "Reconciled",
    lastReconciled: "May 19, 2025",
  },
  {
    id: "2",
    name: "Cash at Bank - USD",
    type: "Foreign Account",
    number: "**** 7711",
    bank: "GTBank",
    bookBalance: 24800,
    bankBalance: 24650,
    difference: 150,
    status: "Unreconciled",
    lastReconciled: "May 18, 2025",
  },
  {
    id: "3",
    name: "Mobile Money Account",
    type: "Mobile Account",
    number: "**** 8890",
    bank: "Africell Money",
    bookBalance: 12300,
    bankBalance: 12300,
    difference: 0,
    status: "Reconciled",
    lastReconciled: "May 19, 2025",
  },
  {
    id: "4",
    name: "Payroll Account",
    type: "Checking Account",
    number: "**** 3344",
    bank: "Access Bank",
    bookBalance: 15200,
    bankBalance: 14950,
    difference: 250,
    status: "Unreconciled",
    lastReconciled: "May 17, 2025",
  },
  {
    id: "5",
    name: "Savings Account",
    type: "Savings Account",
    number: "**** 5566",
    bank: "GTBank",
    bookBalance: 35600,
    bankBalance: 35600,
    difference: 0,
    status: "Reconciled",
    lastReconciled: "May 19, 2025",
  },
  {
    id: "6",
    name: "Petty Cash",
    type: "Cash Account",
    number: "N/A",
    bank: "-",
    bookBalance: 3250,
    bankBalance: 0,
    difference: 0,
    status: "Not Required",
    lastReconciled: "-",
  },
  {
    id: "7",
    name: "Loan Account",
    type: "Liability Account",
    number: "**** 1122",
    bank: "Standard Chartered",
    bookBalance: 48750,
    bankBalance: 48900,
    difference: 150,
    status: "Unreconciled",
    lastReconciled: "May 16, 2025",
  },
  {
    id: "8",
    name: "Credit Card",
    type: "Credit Account",
    number: "**** 9988",
    bank: "Visa",
    bookBalance: -8650,
    bankBalance: -8650,
    difference: 0,
    status: "Reconciled",
    lastReconciled: "May 19, 2025",
  },
];

export default function ReconciliationOverviewPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [copilotOpen, setCopilotOpen] = useState(true);

  // AI Copilot insights
  const insights = useMemo(() => {
    return [
      {
        id: "1",
        type: "warning" as const,
        title: "14 discrepancies need attention",
        description: `Total unreconciled amount: ${formatCurrency(16450)}`,
        action: { label: "Review discrepancies", onClick: () => {} },
      },
      {
        id: "2",
        type: "success" as const,
        title: "88% auto-matched",
        description: "AI matched 456 transactions",
        action: { label: "View matched transactions", onClick: () => {} },
      },
    ];
  }, []);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "accounts", label: "Bank Accounts" },
    { id: "reconciliations", label: "Reconciliations" },
    { id: "discrepancies", label: "Discrepancies" },
    { id: "rules", label: "Rules" },
    { id: "reports", label: "Reports" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <RefreshCw className="h-6 w-6 text-primary" />
                Reconciliation
              </h1>
              <p className="text-sm text-muted-foreground">
                Reconcile bank accounts, books, and transactions with AI-powered
                matching.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Reconciliation
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors",
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
                label: "Total Accounts",
                value: "8",
                subtext: "Active bank accounts",
                icon: Landmark,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Total Reconciled (MTD)",
                value: formatCurrency(214750),
                change: "+18.6%",
                changeLabel: "vs last month",
                icon: CheckCircle,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Unreconciled (MTD)",
                value: formatCurrency(16450),
                change: "+12.3%",
                changeLabel: "vs last month",
                icon: AlertTriangle,
                color: "text-red-600",
                bgColor: "bg-red-50",
              },
              {
                label: "Reconciliation Rate",
                value: "92.8%",
                change: "+3.7%",
                changeLabel: "vs last month",
                icon: TrendingUp,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Open Discrepancies",
                value: "14",
                subtext: "Needs attention",
                icon: AlertCircle,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
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
                  {kpi.change && (
                    <p className={cn("text-xs mt-1", kpi.color)}>
                      {kpi.change}{" "}
                      <span className="text-muted-foreground">
                        {kpi.changeLabel}
                      </span>
                    </p>
                  )}
                  {kpi.subtext && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpi.subtext}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search accounts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Account Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Account Types</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Accounts Table */}
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground w-10">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Account
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Account Number
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Bank
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Book Balance
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Bank Balance
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Difference
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Reconciliation Status
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Last Reconciled
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td
                      className="py-3 px-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Landmark className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{account.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {account.type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                      {account.number}
                    </td>
                    <td className="py-3 px-4 text-sm">{account.bank}</td>
                    <td className="py-3 px-4 text-sm text-right font-mono font-medium">
                      {formatCurrency(account.bookBalance)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {account.bankBalance > 0
                        ? formatCurrency(account.bankBalance)
                        : "N/A"}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {account.difference > 0 ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(account.difference)}
                        </span>
                      ) : account.bankBalance === 0 ? (
                        <span className="text-muted-foreground">N/A</span>
                      ) : (
                        <span className="text-emerald-600">
                          {formatCurrency(0)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="secondary"
                        className={cn(
                          account.status === "Reconciled"
                            ? "bg-emerald-100 text-emerald-700"
                            : account.status === "Unreconciled"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700",
                        )}
                      >
                        {account.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {account.lastReconciled !== "-" ? (
                        <div>
                          <p>{account.lastReconciled}</p>
                          <p className="text-xs">by AI Agent</p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td
                      className="py-3 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing 1 to 8 of 8 accounts
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-primary text-primary-foreground"
                >
                  1
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Reconciliation Trend */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Reconciliation Trend</h3>
                <Select defaultValue="6months">
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6months">Last 6 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="h-48 flex items-end gap-2">
                {[60, 70, 65, 80, 85, 92].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-emerald-500/20 rounded-t"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {["Dec", "Jan", "Feb", "Mar", "Apr", "May"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reconciliation Status */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-4">
                Reconciliation Status
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24">
                  <svg viewBox="0 0 36 36" className="h-full w-full">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-emerald-500"
                      strokeDasharray="62 38"
                      strokeDashoffset="25"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-red-500"
                      strokeDasharray="38 62"
                      strokeDashoffset="87"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-gray-300"
                      strokeDasharray="13 87"
                      strokeDashoffset="49"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">8</span>
                    <span className="text-[10px] text-muted-foreground">
                      Accounts
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    {
                      label: "Reconciled",
                      count: 5,
                      pct: "62%",
                      color: "bg-emerald-500",
                    },
                    {
                      label: "Unreconciled",
                      count: 3,
                      pct: "38%",
                      color: "bg-red-500",
                    },
                    {
                      label: "Not Required",
                      count: 1,
                      pct: "13%",
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
                        {item.count} ({item.pct})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Unreconciled Accounts */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Top Unreconciled Accounts
                </h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  {
                    name: "Cash at Bank - USD",
                    amount: 150,
                    color: "bg-amber-500",
                  },
                  { name: "Payroll Account", amount: 250, color: "bg-red-500" },
                  { name: "Loan Account", amount: 150, color: "bg-orange-500" },
                ].map((account, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn("h-2 w-2 rounded-full", account.color)}
                      />
                      <span className="text-sm">{account.name}</span>
                    </div>
                    <span className="text-sm font-mono font-medium text-red-600">
                      {formatCurrency(account.amount)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Total Unreconciled
                    </span>
                    <span className="text-sm font-bold font-mono text-red-600">
                      {formatCurrency(550)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Copilot Sidebar */}
      {copilotOpen && (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="Xenboox AI Copilot"
            subtitle="I analyzed your reconciliations and found a few things."
            insights={insights}
            suggestedActions={[
              {
                id: "1",
                icon: <RefreshCw className="h-4 w-4" />,
                label: "Reconcile Account",
                description: "Start new reconciliation",
              },
              {
                id: "2",
                icon: <Landmark className="h-4 w-4" />,
                label: "Bank Feeds",
                description: "Manage bank feeds",
              },
              {
                id: "3",
                icon: <FileText className="h-4 w-4" />,
                label: "Reconciliation Rules",
                description: "Create or edit rules",
              },
              {
                id: "4",
                icon: <AlertTriangle className="h-4 w-4" />,
                label: "Discrepancy Report",
                description: "View all discrepancies",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
