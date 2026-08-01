"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
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
  Landmark,
  Plus,
  Download,
  Upload,
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
  RefreshCw,
  AlertCircle,
  Link2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

type BankAccount = {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  currentBalance: string;
  isActive: boolean;
  type: string;
};

// Mock transaction data for the table
const mockTransactions = [
  {
    id: "1",
    date: "May 29, 2025",
    description: "Stripe Payout",
    category: "Sales Revenue",
    amount: 12450,
    account: "GTBank",
    status: "Reconciled",
    confidence: 98,
  },
  {
    id: "2",
    date: "May 29, 2025",
    description: "Office World",
    category: "Office Supplies",
    amount: -1280,
    account: "Access Bank",
    status: "Reconciled",
    confidence: 96,
  },
  {
    id: "3",
    date: "May 28, 2025",
    description: "Ministry of Finance",
    category: "VAT / Tax",
    amount: -9850,
    account: "GTBank",
    status: "Reconciled",
    confidence: 99,
  },
  {
    id: "4",
    date: "May 28, 2025",
    description: "Staff Payroll",
    category: "Salaries & Wages",
    amount: -78450,
    account: "GTBank",
    status: "Reconciled",
    confidence: 97,
  },
  {
    id: "5",
    date: "May 28, 2025",
    description: "POS Purchase",
    category: "Needs Review",
    amount: -2450,
    account: "Trust Wallet",
    status: "Needs Review",
    confidence: 72,
  },
  {
    id: "6",
    date: "May 27, 2025",
    description: "Banjul Hardware",
    category: "Cost of Goods",
    amount: -4200,
    account: "Access Bank",
    status: "Reconciled",
    confidence: 94,
  },
  {
    id: "7",
    date: "May 27, 2025",
    description: "Invoice INV-1007",
    category: "Accounts Receivable",
    amount: 25000,
    account: "GTBank",
    status: "Reconciled",
    confidence: 98,
  },
];

export default function TreasuryPage() {
  const router = useRouter();
  const { data: accounts, isLoading } =
    trpc.treasury.listBankAccounts.useQuery();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [copilotOpen, setCopilotOpen] = useState(true);

  const filtered = useMemo(() => {
    if (!accounts) return [];
    let result = [...(accounts as BankAccount[])];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.bankName.toLowerCase().includes(q) ||
          a.accountNumber.toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [accounts, search]);

  // AI Copilot insights
  const insights = useMemo(() => {
    return [
      {
        id: "1",
        type: "warning" as const,
        title: "3 duplicate transactions detected",
        description: `Potential savings: ${formatCurrency(1350)}`,
        action: { label: "Review duplicates", onClick: () => {} },
      },
      {
        id: "2",
        type: "info" as const,
        title: "2 unusual transactions this week",
        description: "Review recommended",
        action: { label: "View analysis", onClick: () => {} },
      },
    ];
  }, []);

  const tabs = [
    { id: "all", label: "All Transactions", count: 2845 },
    { id: "review", label: "Needs Review", count: 182 },
    { id: "unreconciled", label: "Unreconciled", count: 100 },
    { id: "recurring", label: "Recurring", count: 42 },
    { id: "suggestions", label: "AI Suggestions", count: 14 },
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
                <Landmark className="h-6 w-6 text-primary" />
                Transactions
              </h1>
              <p className="text-sm text-muted-foreground">
                All your business transactions, reconciled by AI.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground border rounded-lg px-3 py-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>AI is working...</span>
                <span className="border-l pl-2">Connected Banks (3)</span>
              </div>
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Upload Documents
              </Button>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Transaction
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total Transactions",
                value: "2,845",
                change: "+12.4%",
                changeLabel: "vs last 30 days",
                icon: FileText,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Reconciled",
                value: "2,563 (90.1%)",
                change: "+6.2%",
                changeLabel: "",
                icon: CheckCircle,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Needs Review",
                value: "182 (6.4%)",
                change: "-18.3%",
                changeLabel: "",
                icon: AlertTriangle,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
              },
              {
                label: "Unreconciled",
                value: "100 (3.5%)",
                change: "-25.0%",
                changeLabel: "",
                icon: AlertCircle,
                color: "text-red-600",
                bgColor: "bg-red-50",
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
                  <p className={cn("text-xs mt-1", kpi.color)}>
                    {kpi.change}{" "}
                    {kpi.changeLabel && (
                      <span className="text-muted-foreground">
                        {kpi.changeLabel}
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          {/* AI Reconciliation Status */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <RefreshCw className="h-5 w-5 text-emerald-600 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-semibold">AI Reconciliation</p>
                  <p className="text-xs text-muted-foreground">
                    Bank reconciliation in progress...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-600">78%</p>
                  <p className="text-xs text-muted-foreground">ETA 2m</p>
                </div>
                <div className="w-32">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: "78%" }}
                    />
                  </div>
                </div>
              </div>
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
                <span className="ml-1.5 text-xs">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select defaultValue="30days">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Date: Last 30 days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Date: Last 30 days</SelectItem>
                <SelectItem value="90days">Date: Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
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
              More filters
            </Button>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground w-10">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Category (AI)
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Account
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Match
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td
                      className="py-3 px-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="py-3 px-4 text-sm">{tx.date}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            tx.amount > 0
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-red-50 text-red-600",
                          )}
                        >
                          {tx.amount > 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                        </div>
                        <span className="text-sm font-medium">
                          {tx.description}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="secondary"
                        className={cn(
                          tx.category === "Needs Review"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {tx.category}
                      </Badge>
                    </td>
                    <td
                      className={cn(
                        "py-3 px-4 text-sm text-right font-mono font-medium",
                        tx.amount > 0 ? "text-emerald-600" : "text-foreground",
                      )}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {formatCurrency(Math.abs(tx.amount))}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {tx.account}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="secondary"
                        className={cn(
                          tx.status === "Reconciled"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700",
                        )}
                      >
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tx.status === "Reconciled" && (
                        <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {tx.confidence}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">0 of 50 selected</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  {"<"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-primary text-primary-foreground"
                >
                  1
                </Button>
                <Button variant="outline" size="sm">
                  2
                </Button>
                <Button variant="outline" size="sm">
                  3
                </Button>
                <Button variant="outline" size="sm">
                  ...
                </Button>
                <Button variant="outline" size="sm">
                  57
                </Button>
                <Button variant="outline" size="sm">
                  {">"}
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Spending by Category */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Spending by Category</h3>
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
                      strokeDasharray="42 58"
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
                      strokeDasharray="28 72"
                      strokeDashoffset="83"
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
                      strokeDashoffset="55"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-purple-500"
                      strokeDasharray="8 92"
                      strokeDashoffset="43"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-gray-300"
                      strokeDasharray="10 90"
                      strokeDashoffset="35"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">
                      GMD
                    </span>
                    <span className="text-sm font-bold">813,650</span>
                    <span className="text-[10px] text-muted-foreground">
                      Total Expenses
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[
                    {
                      label: "Salaries & Wages",
                      pct: "42%",
                      amount: "GMD 342,500",
                      color: "bg-primary",
                    },
                    {
                      label: "Cost of Goods",
                      pct: "28%",
                      amount: "GMD 228,400",
                      color: "bg-emerald-500",
                    },
                    {
                      label: "Office Expenses",
                      pct: "12%",
                      amount: "GMD 96,600",
                      color: "bg-amber-500",
                    },
                    {
                      label: "Marketing",
                      pct: "8%",
                      amount: "GMD 64,800",
                      color: "bg-purple-500",
                    },
                    {
                      label: "Other",
                      pct: "10%",
                      amount: "GMD 82,350",
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
            </div>

            {/* Transaction Trends */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Transaction Trends</h3>
                <Select defaultValue="30days">
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="h-32 flex items-end gap-1">
                {[40, 55, 45, 70, 60, 85, 50, 65, 75, 55].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full flex gap-0.5 items-end"
                      style={{ height: `${h}%` }}
                    >
                      <div
                        className="flex-1 bg-emerald-500/60 rounded-t"
                        style={{ height: "100%" }}
                      />
                      <div
                        className="flex-1 bg-red-400/60 rounded-t"
                        style={{ height: "80%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded bg-emerald-500/60" />
                  <span className="text-[10px] text-muted-foreground">
                    Income
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded bg-red-400/60" />
                  <span className="text-[10px] text-muted-foreground">
                    Expenses
                  </span>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">AI Insights</h3>
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Bot className="h-3 w-3" />
                  AI generated
                </div>
              </div>
              <div className="space-y-3">
                {[
                  {
                    title: "Revenue collections up 14%",
                    desc: "Faster customer payments",
                    icon: TrendingUp,
                    color: "text-emerald-600",
                    bgColor: "bg-emerald-50",
                  },
                  {
                    title: "Expenses 8% lower",
                    desc: "Good cost control",
                    icon: TrendingUp,
                    color: "text-emerald-600",
                    bgColor: "bg-emerald-50",
                  },
                  {
                    title: "2 recurring expenses increased",
                    desc: "Review subscriptions",
                    icon: AlertTriangle,
                    color: "text-amber-600",
                    bgColor: "bg-amber-50",
                  },
                  {
                    title: "Cash flow remains healthy",
                    desc: "45 days runway",
                    icon: CheckCircle,
                    color: "text-emerald-600",
                    bgColor: "bg-emerald-50",
                  },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                          item.bgColor,
                        )}
                      >
                        <Icon className={cn("h-4 w-4", item.color)} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Chat Input */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Ask Xenboox about your transactions..."
                  className="border-0 bg-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {[
                "Find duplicate expenses",
                "Explain large payments",
                "Categorize uncategorized",
                "Reconcile today's transactions",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Transaction Assistant Sidebar */}
      {copilotOpen && (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="AI Transaction Assistant"
            subtitle="Active"
            insights={insights}
            suggestedActions={[
              {
                id: "1",
                icon: <RefreshCw className="h-4 w-4" />,
                label: "Reconcile 18 transactions",
                description: "Match bank feed",
              },
              {
                id: "2",
                icon: <AlertTriangle className="h-4 w-4" />,
                label: "Follow up 5 overdue invoices",
                description: "Send reminders",
              },
              {
                id: "3",
                icon: <FileText className="h-4 w-4" />,
                label: "Review upcoming bills",
                description: "Approve payments",
              },
              {
                id: "4",
                icon: <TrendingUp className="h-4 w-4" />,
                label: "Create cash flow forecast",
                description: "Predict next month",
              },
              {
                id: "5",
                icon: <Link2 className="h-4 w-4" />,
                label: "Optimize cash position",
                description: "Suggest transfers",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
