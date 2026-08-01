"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  FileText,
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
  Bot,
  Upload,
  RefreshCw,
  Zap,
  Users,
  BarChart3,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const mockEntries = [
  {
    id: "1",
    entryNumber: "JE-2025-0132",
    date: "May 19, 2025",
    description: "Bank charges",
    source: "Manual",
    reference: "CHG-0519",
    debit: 150,
    credit: 150,
    status: "Approved",
    createdBy: "Famara T.",
  },
  {
    id: "2",
    entryNumber: "JE-2025-0131",
    date: "May 18, 2025",
    description: "Office supplies adjustment",
    source: "Manual",
    reference: "ADJ-0518",
    debit: 1250,
    credit: 1250,
    status: "Pending Approval",
    createdBy: "Mariama C.",
  },
  {
    id: "3",
    entryNumber: "JE-2025-0130",
    date: "May 18, 2025",
    description: "Loan repayment entry",
    source: "Bank Import",
    reference: "LN-8890",
    debit: 12300,
    credit: 12300,
    status: "Approved",
    createdBy: "System (AI)",
  },
  {
    id: "4",
    entryNumber: "JE-2025-0129",
    date: "May 17, 2025",
    description: "Salary expense – May 2025",
    source: "Payroll",
    reference: "PAY-MAY-25",
    debit: 25460,
    credit: 25460,
    status: "Posted",
    createdBy: "System (AI)",
  },
  {
    id: "5",
    entryNumber: "JE-2025-0128",
    date: "May 16, 2025",
    description: "Inventory stock adjustment",
    source: "Inventory",
    reference: "INV-ADJ-016",
    debit: 8750,
    credit: 8750,
    status: "Approved",
    createdBy: "Yusupha S.",
  },
  {
    id: "6",
    entryNumber: "JE-2025-0127",
    date: "May 15, 2025",
    description: "Depreciation – Office Equip.",
    source: "Automation",
    reference: "DEP-MAY-25",
    debit: 3600,
    credit: 3600,
    status: "Posted",
    createdBy: "System (AI)",
  },
  {
    id: "7",
    entryNumber: "JE-2025-0126",
    date: "May 14, 2025",
    description: "Sales return adjustment",
    source: "Manual",
    reference: "SR-0514",
    debit: 2450,
    credit: 2450,
    status: "Approved",
    createdBy: "Fatou C.",
  },
  {
    id: "8",
    entryNumber: "JE-2025-0125",
    date: "May 13, 2025",
    description: "Interest income – May",
    source: "Bank Import",
    reference: "INT-0513",
    debit: 950,
    credit: 950,
    status: "Posted",
    createdBy: "System (AI)",
  },
  {
    id: "9",
    entryNumber: "JE-2025-0124",
    date: "May 12, 2025",
    description: "Cash in transit",
    source: "Manual",
    reference: "CIT-0512",
    debit: 5000,
    credit: 5000,
    status: "Pending Approval",
    createdBy: "Lamin B.",
  },
  {
    id: "10",
    entryNumber: "JE-2025-0123",
    date: "May 11, 2025",
    description: "Bank fees reversal",
    source: "Manual",
    reference: "REV-0511",
    debit: 75,
    credit: 75,
    status: "Approved",
    createdBy: "Famara T.",
  },
];

const sourceColors: Record<string, string> = {
  Manual: "bg-blue-100 text-blue-700",
  "Bank Import": "bg-emerald-100 text-emerald-700",
  Payroll: "bg-purple-100 text-purple-700",
  Inventory: "bg-amber-100 text-amber-700",
  Automation: "bg-indigo-100 text-indigo-700",
};

const statusColors: Record<string, string> = {
  Approved: "bg-emerald-100 text-emerald-700",
  "Pending Approval": "bg-amber-100 text-amber-700",
  Posted: "bg-blue-100 text-blue-700",
  Voided: "bg-red-100 text-red-700",
};

export default function JournalPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [copilotOpen, setCopilotOpen] = useState(true);

  const tabs = [
    { id: "all", label: "All Entries", count: 132 },
    { id: "draft", label: "Draft", count: 12 },
    { id: "pending", label: "Pending Approval", count: 6 },
    { id: "approved", label: "Approved", count: 124 },
    { id: "posted", label: "Posted", count: 320 },
    { id: "voided", label: "Voided", count: 4 },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Journal Entries
              </h1>
              <p className="text-sm text-muted-foreground">
                Create, review, and manage journal entries with AI assistance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Journal Entry
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
                {tab.label}{" "}
                <span className="ml-1.5 text-xs">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Total Entries (MTD)",
                value: "132",
                change: "+18.6%",
                changeLabel: "vs last month",
                icon: FileText,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Total Debit (MTD)",
                value: formatCurrency(284750),
                change: "+12.3%",
                changeLabel: "vs last month",
                icon: DollarSign,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Total Credit (MTD)",
                value: formatCurrency(284750),
                change: "+12.3%",
                changeLabel: "vs last month",
                icon: DollarSign,
                color: "text-blue-600",
                bgColor: "bg-blue-50",
              },
              {
                label: "Pending Approval",
                value: formatCurrency(45200),
                subtext: "6 entries",
                icon: Clock,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
              },
              {
                label: "Auto-Generated (MTD)",
                value: "78%",
                subtext: "103 of 132 entries",
                icon: Bot,
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

          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search journal entries..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="bank">Bank Import</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="automation">Automation</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground w-10">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Entry #
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Source
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Reference
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Debit (GMD)
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Credit (GMD)
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Created By
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td
                      className="py-3 px-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="py-3 px-4 text-sm font-mono font-medium text-primary">
                      {entry.entryNumber}
                    </td>
                    <td className="py-3 px-4 text-sm">{entry.date}</td>
                    <td className="py-3 px-4 text-sm font-medium">
                      {entry.description}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          sourceColors[entry.source],
                        )}
                      >
                        {entry.source}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                      {entry.reference}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {formatCurrency(entry.debit)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {formatCurrency(entry.credit)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          statusColors[entry.status],
                        )}
                      >
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {entry.createdBy.includes("System") && (
                          <Bot className="h-3 w-3 text-emerald-500" />
                        )}
                        {entry.createdBy}
                      </div>
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
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing 1 to 10 of 132 entries
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
                  2
                </Button>
                <Button variant="outline" size="sm">
                  3
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Journal Entry Trend */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Journal Entry Trend</h3>
                <Select defaultValue="6months">
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6months">Last 6 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="h-32 flex items-end gap-1">
                {[40, 55, 45, 70, 60, 85].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-primary/20 rounded-t"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {["Dec", "Jan", "Feb", "Mar", "Apr", "May"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Account Impact */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Top Account Impact (MTD)
                </h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View full report <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Cash at Bank", debit: 156300, credit: 156150 },
                  { name: "Salary Expense", debit: 25460, credit: 25460 },
                  { name: "Office Supplies", debit: 9750, credit: 9750 },
                  { name: "Interest Income", debit: 950, credit: 950 },
                  { name: "Accounts Payable", debit: 8650, credit: 8650 },
                ].map((account, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {account.name}
                    </span>
                    <div className="flex gap-4">
                      <span className="font-mono text-right w-24">
                        {formatCurrency(account.debit)}
                      </span>
                      <span className="font-mono text-right w-24">
                        {formatCurrency(account.credit)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Recent Activity</h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all activity <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  {
                    text: "JE-2025-0130 was approved",
                    by: "Mariama C.",
                    time: "2 min ago",
                    icon: CheckCircle2,
                    color: "text-emerald-500",
                  },
                  {
                    text: "JE-2025-0129 was posted",
                    by: "System (AI)",
                    time: "15 min ago",
                    icon: Bot,
                    color: "text-primary",
                  },
                  {
                    text: "JE-2025-0131 submitted for approval",
                    by: "Fatou C.",
                    time: "1 hour ago",
                    icon: Clock,
                    color: "text-amber-500",
                  },
                  {
                    text: "12 recurring entries created",
                    by: "System (AI)",
                    time: "2 hours ago",
                    icon: RefreshCw,
                    color: "text-blue-500",
                  },
                ].map((activity, i) => {
                  const Icon = activity.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <Icon
                        className={cn(
                          "h-4 w-4 mt-0.5 shrink-0",
                          activity.color,
                        )}
                      />
                      <div>
                        <p className="text-sm">{activity.text}</p>
                        <p className="text-xs text-muted-foreground">
                          by {activity.by} · {activity.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
            subtitle="I analyzed your journal entries and found a few insights."
            insights={[
              {
                id: "1",
                type: "warning",
                title: "6 entries need your review",
                description: "Total amount: GMD 45,200.00",
                action: { label: "Review pending entries", onClick: () => {} },
              },
              {
                id: "2",
                type: "info",
                title: "Bank charges detected",
                description: "GMD 150.00 in bank charges recorded.",
                action: { label: "View details", onClick: () => {} },
              },
              {
                id: "3",
                type: "success",
                title: "All automated entries are accurate",
                description: "103 AI-generated entries with 98.7% accuracy.",
                action: { label: "View automation log", onClick: () => {} },
              },
            ]}
            suggestedActions={[
              {
                id: "1",
                icon: <Plus className="h-4 w-4" />,
                label: "New Journal Entry",
                description: "Create manual entry",
              },
              {
                id: "2",
                icon: <Upload className="h-4 w-4" />,
                label: "Import Entries",
                description: "Import from Excel/CSV",
              },
              {
                id: "3",
                icon: <RefreshCw className="h-4 w-4" />,
                label: "Recurring Entries",
                description: "Manage recurring",
              },
              {
                id: "4",
                icon: <FileText className="h-4 w-4" />,
                label: "Journal Entry Report",
                description: "View reports",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
