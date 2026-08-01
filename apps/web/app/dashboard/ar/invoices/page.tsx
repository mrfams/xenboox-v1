"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { CreateInvoiceDialog } from "./create-dialog";
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
  Send,
  Bot,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/badge-variants";

export default function ARInvoicesPage() {
  const router = useRouter();
  const { data: invoices, isLoading } = trpc.ar.listInvoices.useQuery({});
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [copilotOpen, setCopilotOpen] = useState(true);

  const filtered = useMemo(() => {
    if (!invoices) return [];
    let result = [...invoices];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.invoiceNumber.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      result = result.filter((i) => i.status === statusFilter);
    }
    result.sort(
      (a, b) =>
        new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
    );
    return result;
  }, [invoices, search, statusFilter]);

  // Compute KPI metrics
  const kpis = useMemo(() => {
    if (!invoices) return null;
    const total = invoices.length;
    const unpaid = invoices.filter(
      (i) => i.status !== "paid" && i.status !== "voided",
    ).length;
    const paid = invoices.filter((i) => i.status === "paid").length;
    const overdue = invoices.filter((i) => i.status === "overdue").length;
    const totalAmount = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
    const paidAmount = invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + Number(i.totalAmount), 0);
    return { total, unpaid, paid, overdue, totalAmount, paidAmount };
  }, [invoices]);

  // AI Copilot insights
  const insights = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        id: "1",
        type: "warning" as const,
        title: `${kpis.overdue} invoices are overdue`,
        description: `Total overdue amount is ${formatCurrency(Math.floor(Math.random() * 50000) + 20000)}`,
        action: { label: "View overdue invoices", onClick: () => {} },
      },
      {
        id: "2",
        type: "success" as const,
        title: "Invoice conversion rate improved",
        description: "72% of invoices are paid",
        action: { label: "View analytics", onClick: () => {} },
      },
    ];
  }, [kpis]);

  const tabs = [
    { id: "all", label: "All Invoices", count: kpis?.total ?? 0 },
    { id: "draft", label: "Draft", count: 18 },
    { id: "sent", label: "Sent", count: 42 },
    { id: "viewed", label: "Viewed", count: 20 },
    { id: "overdue", label: "Overdue", count: kpis?.overdue ?? 0 },
    { id: "paid", label: "Paid", count: kpis?.paid ?? 0 },
    { id: "cancelled", label: "Cancelled", count: 4 },
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
                <FileText className="h-6 w-6 text-primary" />
                Invoices
              </h1>
              <p className="text-sm text-muted-foreground">
                Create, send and track your customer invoices.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Upload Invoice
              </Button>
              <Button variant="outline" size="sm">
                More actions
                <MoreHorizontal className="ml-2 h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
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
                <span className="ml-1.5 text-xs">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Total Outstanding",
                value: formatCurrency(245600),
                change: "+12.6%",
                changeLabel: "vs last 30 days",
                icon: DollarSign,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Overdue",
                value: formatCurrency(78450),
                change: "+8.3%",
                changeLabel: "vs last 30 days",
                icon: AlertTriangle,
                color: "text-red-600",
                bgColor: "bg-red-50",
              },
              {
                label: "Paid (This Month)",
                value: formatCurrency(156200),
                change: "+15.4%",
                changeLabel: "vs last 30 days",
                icon: CheckCircle,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Draft",
                value: "18",
                change: "~0%",
                changeLabel: "vs last 30 days",
                icon: FileText,
                color: "text-muted-foreground",
                bgColor: "bg-muted",
              },
              {
                label: "Conversion Rate",
                value: "72%",
                change: "+5.2%",
                changeLabel: "vs last 30 days",
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
                  <p className={cn("text-xs mt-1", kpi.color)}>
                    {kpi.change}{" "}
                    <span className="text-muted-foreground">
                      {kpi.changeLabel}
                    </span>
                  </p>
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
                  placeholder="Search invoices..."
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
                <SelectItem value="all">Date: All time</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Data Table */}
          {isLoading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No sales invoices"
              description="Create your first invoice to start billing customers."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground w-10">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Invoice #
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Customer
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Issue Date
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Due Date
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Balance
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(`/dashboard/ar/invoices/${inv.id}`)
                      }
                    >
                      <td
                        className="py-3 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input type="checkbox" className="rounded" />
                      </td>
                      <td className="py-3 px-4 text-sm font-mono font-medium text-primary">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            {inv.invoiceNumber?.charAt(0) || "C"}
                          </div>
                          <span className="text-sm">Customer</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono font-medium">
                        {formatCurrency(Number(inv.totalAmount))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className={statusBadgeClass(inv.status)}
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(Number(inv.balance))}
                      </td>
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
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
                  Showing 1 to {Math.min(filtered.length, 10)} of{" "}
                  {filtered.length} invoices
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
          )}

          {/* Bottom Charts Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Aging Summary */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-4">Aging Summary</h3>
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
                      strokeDasharray="70 30"
                      strokeDashoffset="25"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-amber-500"
                      strokeDasharray="24 76"
                      strokeDashoffset="55"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-orange-500"
                      strokeDasharray="13 87"
                      strokeDashoffset="31"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-red-500"
                      strokeDasharray="14 86"
                      strokeDashoffset="18"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">
                      {formatCurrency(245600)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Total
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    {
                      label: "Current (0-30 days)",
                      amount: 120300,
                      pct: "49%",
                      color: "bg-emerald-500",
                    },
                    {
                      label: "31-60 days",
                      amount: 58600,
                      pct: "24%",
                      color: "bg-amber-500",
                    },
                    {
                      label: "61-90 days",
                      amount: 32150,
                      pct: "13%",
                      color: "bg-orange-500",
                    },
                    {
                      label: "90+ days",
                      amount: 34550,
                      pct: "14%",
                      color: "bg-red-500",
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
                        {formatCurrency(item.amount)} {item.pct}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Invoices Trend */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Invoices Trend</h3>
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
                      className="w-full flex gap-0.5 items-end"
                      style={{ height: `${h}%` }}
                    >
                      <div
                        className="flex-1 bg-primary/60 rounded-t"
                        style={{ height: "100%" }}
                      />
                      <div
                        className="flex-1 bg-emerald-500/60 rounded-t"
                        style={{ height: "70%" }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {["Dec", "Jan", "Feb", "Mar", "Apr", "May"][i]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded bg-primary/60" />
                  <span className="text-[10px] text-muted-foreground">
                    Issued
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded bg-emerald-500/60" />
                  <span className="text-[10px] text-muted-foreground">
                    Paid
                  </span>
                </div>
              </div>
            </div>

            {/* Top Customers (Outstanding) */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Top Customers (Outstanding)
                </h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all customers <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  {
                    name: "GTBank Gambia Ltd",
                    amount: 45600,
                    color: "bg-primary",
                  },
                  {
                    name: "Kairaiba Beach Hotel",
                    amount: 38200,
                    color: "bg-emerald-500",
                  },
                  {
                    name: "African Wholesale Ltd",
                    amount: 29750,
                    color: "bg-amber-500",
                  },
                  {
                    name: "Ministry of Finance",
                    amount: 25600,
                    color: "bg-orange-500",
                  },
                  { name: "Unique Motors", amount: 18550, color: "bg-red-500" },
                ].map((customer, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn("h-2 w-2 rounded-full", customer.color)}
                      />
                      <span className="text-sm">{customer.name}</span>
                    </div>
                    <span className="text-sm font-mono font-medium">
                      {formatCurrency(customer.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Invoice Assistant Sidebar */}
      {copilotOpen && (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="AI Invoice Assistant"
            subtitle="How can I help you with invoices today?"
            insights={insights}
            suggestedActions={[
              {
                id: "1",
                icon: <FileText className="h-4 w-4" />,
                label: "Find overdue invoices",
                description: "View all overdue",
              },
              {
                id: "2",
                icon: <Plus className="h-4 w-4" />,
                label: "Create invoice for GTBank",
                description: "Quick create",
              },
              {
                id: "3",
                icon: <TrendingUp className="h-4 w-4" />,
                label: "Show top customers by sales",
                description: "View report",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}

      <CreateInvoiceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
