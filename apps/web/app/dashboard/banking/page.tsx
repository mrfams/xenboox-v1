"use client";

import { useState } from "react";
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
  Landmark,
  Plus,
  Download,
  MoreHorizontal,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  Eye,
  FileText,
  Bot,
  Settings,
  Upload,
  RefreshCw,
  Link2,
  Activity,
  Building,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const mockAccounts = [
  {
    id: "1",
    name: "Operating Account",
    last4: "7890",
    bank: "GTBank Gambia Ltd",
    bankLogo: "bg-emerald-500",
    type: "Checking",
    currency: "GMD",
    balance: 525600,
    unreconciled: 12450,
    status: "Active",
    lastSync: "2 mins ago",
  },
  {
    id: "2",
    name: "Payroll Account",
    last4: "4567",
    bank: "Access Bank Gambia",
    bankLogo: "bg-blue-500",
    type: "Checking",
    currency: "GMD",
    balance: 218750,
    unreconciled: 0,
    status: "Active",
    lastSync: "4 mins ago",
  },
  {
    id: "3",
    name: "Savings Account",
    last4: "1234",
    bank: "Standard Chartered",
    bankLogo: "bg-amber-500",
    type: "Savings",
    currency: "GMD",
    balance: 312300,
    unreconciled: 5800,
    status: "Active",
    lastSync: "7 mins ago",
  },
  {
    id: "4",
    name: "USD Account",
    last4: "9876",
    bank: "GTBank Gambia Ltd",
    bankLogo: "bg-emerald-500",
    type: "Checking (USD)",
    currency: "USD",
    balance: 12450,
    unreconciled: 0,
    status: "Active",
    lastSync: "1 min ago",
  },
  {
    id: "5",
    name: "Petty Cash Account",
    last4: "0001",
    bank: "Cash Account",
    bankLogo: "bg-purple-500",
    type: "Petty Cash",
    currency: "GMD",
    balance: 8500,
    unreconciled: 0,
    status: "Active",
    lastSync: "—",
  },
  {
    id: "6",
    name: "Dormant Account",
    last4: "5555",
    bank: "UBA Gambia",
    bankLogo: "bg-gray-400",
    type: "Checking",
    currency: "GMD",
    balance: 0,
    unreconciled: 30000,
    status: "Inactive",
    lastSync: "—",
  },
];

export default function BankingPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [copilotOpen, setCopilotOpen] = useState(true);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "accounts", label: "Accounts" },
    { id: "transactions", label: "Transactions" },
    { id: "rules", label: "Rules" },
    { id: "connections", label: "Connections" },
    { id: "statements", label: "Statements" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Landmark className="h-6 w-6 text-primary" />
                Banking
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-emerald-100 text-emerald-700"
                >
                  <span className="mr-1">●</span>Secure
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Connect, monitor, and manage all your bank accounts in one
                place.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import Statement
              </Button>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Connect Bank
              </Button>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total Cash Balance",
                value: formatCurrency(1245600),
                change: "+12.4%",
                changeLabel: "vs last month",
                subtext: "Across 6 accounts",
                icon: DollarSign,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Accounts",
                value: "6",
                subtext: "5 active · 1 inactive",
                icon: Building,
                color: "text-blue-600",
                bgColor: "bg-blue-50",
              },
              {
                label: "Unreconciled Balance",
                value: formatCurrency(48250),
                subtext: "4 accounts",
                icon: AlertTriangle,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
              },
              {
                label: "Last Updated",
                value: "2 mins ago",
                subtext: "May 19, 2025, 10:42 AM",
                icon: Clock,
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

          {/* Bank Accounts Table */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold">Bank Accounts (6)</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search accounts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-[200px] h-8"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Account
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Bank / Institution
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Account Type
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Currency
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Balance
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Unreconciled
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Last Sync
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
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold",
                              account.bankLogo,
                            )}
                          >
                            {account.bank.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {account.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              1546 •••• {account.last4}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {account.bank}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {account.type}
                      </td>
                      <td className="py-3 px-4 text-sm">{account.currency}</td>
                      <td className="py-3 px-4 text-sm text-right font-mono font-medium">
                        {account.balance > 0
                          ? formatCurrency(account.balance)
                          : "0.00"}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {account.unreconciled > 0 ? (
                          <span className="text-amber-600">
                            {formatCurrency(account.unreconciled)}
                          </span>
                        ) : (
                          <span className="text-emerald-600">0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            account.status === "Active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600",
                          )}
                        >
                          ● {account.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {account.lastSync}
                      </td>
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Cash Position */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Cash Position (This Month)
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
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <p className="text-2xl font-bold tabular-nums">
                    {formatCurrency(1245600)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current Balance
                  </p>
                  <p className="text-xs text-emerald-600">
                    ↑ 12.4% vs last month
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Incoming</span>{" "}
                    <span className="font-mono text-emerald-600">
                      {formatCurrency(2450000)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Outgoing</span>{" "}
                    <span className="font-mono text-red-600">
                      -{formatCurrency(1204400)}
                    </span>
                  </div>
                  <div className="text-sm border-t pt-1">
                    <span className="text-muted-foreground">Net Change</span>{" "}
                    <span className="font-mono font-semibold">
                      {formatCurrency(1245600)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="h-32 flex items-end gap-1">
                {[40, 55, 45, 70, 60, 85, 50, 65, 75, 55, 80, 90].map(
                  (h, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-full bg-primary/20 rounded-t"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[8px] text-muted-foreground">
                        {i + 1}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Balance by Currency */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Balance by Currency</h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View in Report <ArrowRight className="h-3 w-3" />
                </button>
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
                      strokeDasharray="86 14"
                      strokeDashoffset="25"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-blue-500"
                      strokeDasharray="10 90"
                      strokeDashoffset="39"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-gray-300"
                      strokeDasharray="1 99"
                      strokeDashoffset="29"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-amber-500"
                      strokeDasharray="4 96"
                      strokeDashoffset="28"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">
                      Total
                    </span>
                    <span className="text-sm font-bold">1.24M</span>
                    <span className="text-[10px] text-muted-foreground">
                      GMD
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    {
                      label: "GMD",
                      amount: "1,064,650",
                      pct: "85.5%",
                      color: "bg-primary",
                    },
                    {
                      label: "USD",
                      amount: "12,450",
                      pct: "10.0%",
                      color: "bg-blue-500",
                    },
                    {
                      label: "Other",
                      amount: "0.00",
                      pct: "0.5%",
                      color: "bg-gray-300",
                    },
                    {
                      label: "Unreconciled",
                      amount: "48,250",
                      pct: "3.9%",
                      color: "bg-amber-500",
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
                      <div className="flex gap-4">
                        <span className="font-mono w-20 text-right">
                          {item.amount}
                        </span>
                        <span className="font-mono w-10 text-right">
                          {item.pct}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Primary Currency: GMD
                </span>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View in Report <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Connected Banks */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Connected Banks</h3>
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                Manage <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              {[
                { name: "GTBank", color: "bg-emerald-500" },
                { name: "Access", color: "bg-blue-500" },
                { name: "Standard Chartered", color: "bg-amber-500" },
                { name: "UBA", color: "bg-red-500" },
              ].map((bank, i) => (
                <div
                  key={i}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white"
                >
                  <div className={cn("h-6 w-6 rounded", bank.color)} />
                </div>
              ))}
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Copilot Sidebar */}
      {copilotOpen && (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="Xenboox AI Copilot"
            subtitle="I analyzed your bank accounts and found a few things."
            insights={[
              {
                id: "1",
                type: "warning",
                title: "Unusual Activity Detected",
                description:
                  "Large cash withdrawal of GMD 45,000 from Operating Account on May 18, 2025.",
                action: { label: "Review transaction", onClick: () => {} },
              },
              {
                id: "2",
                type: "info",
                title: "Cash Forecast",
                description:
                  "Based on your trends, you may have a cash surplus of GMD 85,000 by May 31, 2025.",
                action: { label: "View forecast", onClick: () => {} },
              },
              {
                id: "3",
                type: "success",
                title: "Reconciliation Suggestion",
                description:
                  "4 accounts have unreconciled items. Reconcile now to keep your books accurate.",
                action: { label: "Go to Reconciliation", onClick: () => {} },
              },
            ]}
            suggestedActions={[
              {
                id: "1",
                icon: <Landmark className="h-4 w-4" />,
                label: "Reconcile Account",
                description: "Start new reconciliation",
              },
              {
                id: "2",
                icon: <RefreshCw className="h-4 w-4" />,
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
