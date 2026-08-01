"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

import { AICopilotSidebar } from "@/components/dashboard/ai-copilot-sidebar";
import { SubmitClaimDialog } from "./submit-claim-dialog";
import { PolicyRulesEditor } from "./policy-rules-editor";
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
  Receipt,
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
  Upload,
  CreditCard,
  Wallet,
  Users,
  BarChart3,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const mockExpenses = [
  {
    id: "1",
    date: "May 19, 2025",
    description: "Office Lunch Meeting",
    subtext: "Team meeting with client",
    category: "Meals & Entertainment",
    vendor: "Dominos Pizza",
    amount: 850,
    paymentMethod: "Visa •••• 4242",
    status: "Pending Approval",
    receipt: true,
  },
  {
    id: "2",
    date: "May 18, 2025",
    description: "Internet Subscription",
    subtext: "Monthly internet bill",
    category: "Utilities",
    vendor: "Africell Gambia",
    amount: 1200,
    paymentMethod: "Bank Transfer",
    status: "Approved",
    receipt: true,
  },
  {
    id: "3",
    date: "May 17, 2025",
    description: "Fuel Expense",
    subtext: "Generator fuel purchase",
    category: "Transport",
    vendor: "Gambia Oil Company",
    amount: 2450,
    paymentMethod: "Cash",
    status: "Approved",
    receipt: true,
  },
  {
    id: "4",
    date: "May 16, 2025",
    description: "Office Supplies",
    subtext: "Stationery and printing",
    category: "Office Supplies",
    vendor: "ASK Trading",
    amount: 1875,
    paymentMethod: "Visa •••• 4242",
    status: "Approved",
    receipt: false,
  },
  {
    id: "5",
    date: "May 15, 2025",
    description: "Travel to Banjul",
    subtext: "Client visit and meeting",
    category: "Travel",
    vendor: "GPRT Bus Service",
    amount: 600,
    paymentMethod: "Cash",
    status: "Paid",
    receipt: true,
  },
  {
    id: "6",
    date: "May 14, 2025",
    description: "Software Subscription",
    subtext: "Xenboox Pro Plan",
    category: "Software",
    vendor: "Xenboox",
    amount: 3500,
    paymentMethod: "Visa •••• 4242",
    status: "Paid",
    receipt: false,
  },
  {
    id: "7",
    date: "May 13, 2025",
    description: "Marketing Material",
    subtext: "Brochure printing",
    category: "Marketing",
    vendor: "PrintGambia",
    amount: 2200,
    paymentMethod: "Bank Transfer",
    status: "Pending Approval",
    receipt: true,
  },
  {
    id: "8",
    date: "May 12, 2025",
    description: "Staff Lunch",
    subtext: "Monthly team lunch",
    category: "Meals & Entertainment",
    vendor: "Yassa Restaurant",
    amount: 1650,
    paymentMethod: "Cash",
    status: "Approved",
    receipt: true,
  },
  {
    id: "9",
    date: "May 11, 2025",
    description: "Domain Renewal",
    subtext: "xenboox.com",
    category: "Software",
    vendor: "Namecheap",
    amount: 1350,
    paymentMethod: "Visa •••• 4242",
    status: "Paid",
    receipt: false,
  },
  {
    id: "10",
    date: "May 10, 2025",
    description: "Generator Maintenance",
    subtext: "Routine maintenance",
    category: "Maintenance",
    vendor: "Power Solutions",
    amount: 2800,
    paymentMethod: "Bank Transfer",
    status: "Approved",
    receipt: true,
  },
];

const categoryColors: Record<string, string> = {
  "Meals & Entertainment": "bg-orange-100 text-orange-700",
  Utilities: "bg-blue-100 text-blue-700",
  Transport: "bg-emerald-100 text-emerald-700",
  "Office Supplies": "bg-purple-100 text-purple-700",
  Travel: "bg-amber-100 text-amber-700",
  Software: "bg-indigo-100 text-indigo-700",
  Marketing: "bg-pink-100 text-pink-700",
  Maintenance: "bg-gray-100 text-gray-700",
};

const statusColors: Record<string, string> = {
  "Pending Approval": "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Paid: "bg-blue-100 text-blue-700",
  Rejected: "bg-red-100 text-red-700",
};

export default function ExpenseDashboardPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  const tabs = [
    { id: "all", label: "All Expenses", count: 156 },
    { id: "draft", label: "Draft", count: 18 },
    { id: "pending", label: "Pending Approval", count: 24 },
    { id: "approved", label: "Approved", count: 156 },
    { id: "reimbursed", label: "Reimbursed", count: 89 },
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
                <Receipt className="h-6 w-6 text-primary" />
                Expenses
              </h1>
              <p className="text-sm text-muted-foreground">
                Track, categorize and manage business expenses with AI.
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
              <Button size="sm" onClick={() => setSubmitDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Expense
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
                <span className="ml-1.5 text-xs">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Total Expenses (MTD)",
                value: formatCurrency(78450),
                change: "+8.7%",
                changeLabel: "vs last month",
                icon: DollarSign,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Total Reimbursed (MTD)",
                value: formatCurrency(42300),
                change: "+12.1%",
                changeLabel: "vs last month",
                icon: Wallet,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Pending Approval",
                value: formatCurrency(26150),
                subtext: "24 expenses",
                icon: Clock,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
              },
              {
                label: "Average Expense",
                value: formatCurrency(1142.75),
                subtext: "Per expense",
                icon: BarChart3,
                color: "text-blue-600",
                bgColor: "bg-blue-50",
              },
              {
                label: "Budget vs Actual",
                value: "82%",
                subtext: formatCurrency(18550) + " left",
                icon: TrendingUp,
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
                  placeholder="Search expenses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="meals">Meals & Entertainment</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="software">Software</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Payment Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Methods</SelectItem>
                <SelectItem value="visa">Visa</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
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
                    Date
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Expense
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Vendor / Merchant
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Amount (GMD)
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Payment Method
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Receipt
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td
                      className="py-3 px-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="py-3 px-4 text-sm">{expense.date}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium">
                          {expense.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {expense.subtext}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          categoryColors[expense.category],
                        )}
                      >
                        {expense.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {expense.vendor}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono font-medium">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {expense.paymentMethod}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          statusColors[expense.status],
                        )}
                      >
                        {expense.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {expense.receipt ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <div className="h-4 w-4 rounded border-2 border-dashed border-muted-foreground/30 mx-auto" />
                      )}
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
                Showing 1 to 10 of 156 expenses
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
            {/* Expenses by Category */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Expenses by Category (MTD)
                </h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View full report <ArrowRight className="h-3 w-3" />
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
                      className="text-orange-500"
                      strokeDasharray="24 76"
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
                      strokeDasharray="16 84"
                      strokeDashoffset="1"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-emerald-500"
                      strokeDasharray="14 86"
                      strokeDashoffset="85"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-indigo-500"
                      strokeDasharray="14 86"
                      strokeDashoffset="71"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-purple-500"
                      strokeDasharray="11 89"
                      strokeDashoffset="57"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-gray-300"
                      strokeDasharray="21 79"
                      strokeDashoffset="46"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">
                      GMD
                    </span>
                    <span className="text-sm font-bold">78,450</span>
                    <span className="text-[10px] text-muted-foreground">
                      Total
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[
                    {
                      label: "Meals & Entertainment",
                      amount: "18,450.00",
                      pct: "23.5%",
                      color: "bg-orange-500",
                    },
                    {
                      label: "Utilities",
                      amount: "12,600.00",
                      pct: "16.1%",
                      color: "bg-blue-500",
                    },
                    {
                      label: "Transport",
                      amount: "11,050.00",
                      pct: "14.1%",
                      color: "bg-emerald-500",
                    },
                    {
                      label: "Software",
                      amount: "10,850.00",
                      pct: "13.8%",
                      color: "bg-indigo-500",
                    },
                    {
                      label: "Office Supplies",
                      amount: "8,900.00",
                      pct: "11.3%",
                      color: "bg-purple-500",
                    },
                    {
                      label: "Others",
                      amount: "16,600.00",
                      pct: "21.2%",
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
                        {item.amount} ({item.pct})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Monthly Trend</h3>
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

            {/* Top Vendors */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Top Vendors (MTD)</h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  {
                    name: "Africell Gambia",
                    amount: 6600,
                    color: "bg-primary",
                  },
                  {
                    name: "Gambia Oil Company",
                    amount: 5900,
                    color: "bg-emerald-500",
                  },
                  { name: "Xenboox", amount: 3500, color: "bg-amber-500" },
                  {
                    name: "Power Solutions",
                    amount: 2800,
                    color: "bg-orange-500",
                  },
                  { name: "PrintGambia", amount: 2200, color: "bg-red-500" },
                ].map((vendor, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm">{vendor.name}</span>
                    <span className="text-sm font-mono font-medium">
                      {formatCurrency(vendor.amount)}
                    </span>
                  </div>
                ))}
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
            subtitle="I've analyzed your expenses and found a few insights."
            insights={[
              {
                id: "1",
                type: "warning",
                title: "3 duplicate expenses detected",
                description: "You could save GMD 1,250.00",
                action: { label: "Review duplicates", onClick: () => {} },
              },
              {
                id: "2",
                type: "info",
                title: "Missing receipts",
                description: "7 expenses are missing receipts",
                action: { label: "Upload receipts", onClick: () => {} },
              },
              {
                id: "3",
                type: "success",
                title: "Category suggestion",
                description: "2 expenses could be recategorized",
                action: { label: "Review suggestions", onClick: () => {} },
              },
            ]}
            suggestedActions={[
              {
                id: "1",
                icon: <Plus className="h-4 w-4" />,
                label: "New Expense",
                description: "Create expense entry",
              },
              {
                id: "2",
                icon: <Upload className="h-4 w-4" />,
                label: "Upload Receipt",
                description: "Add receipt image",
              },
              {
                id: "3",
                icon: <Download className="h-4 w-4" />,
                label: "Bulk Import",
                description: "Import from CSV",
              },
              {
                id: "4",
                icon: <FileText className="h-4 w-4" />,
                label: "Expense Report",
                description: "Create expense report",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}

      <SubmitClaimDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        onComplete={() => setSubmitDialogOpen(false)}
      />
    </div>
  );
}
