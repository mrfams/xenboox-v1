"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { CreateBillDialog } from "./create-dialog";
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
  CreditCard,
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
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/badge-variants";

export default function APInvoicesPage() {
  const router = useRouter();
  const { data: invoices, isLoading } = trpc.ap.listInvoices.useQuery();
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
    const overdue = invoices.filter((i) => i.status === "overdue").length;
    const paid = invoices.filter((i) => i.status === "paid").length;
    return { total, overdue, paid };
  }, [invoices]);

  // AI Copilot insights
  const insights = useMemo(() => {
    return [
      {
        id: "1",
        type: "warning" as const,
        title: "3 duplicate bills detected",
        description: `Total potential savings: ${formatCurrency(6350)}`,
        action: { label: "Review duplicates", onClick: () => {} },
      },
      {
        id: "2",
        type: "warning" as const,
        title: "2 bills missing approvals",
        description: `Total amount: ${formatCurrency(21450)}`,
        action: { label: "Review now", onClick: () => {} },
      },
    ];
  }, []);

  const tabs = [
    { id: "all", label: "All Bills", count: kpis?.total ?? 126 },
    { id: "draft", label: "Draft", count: 14 },
    { id: "pending", label: "Pending Approval", count: 22 },
    { id: "approved", label: "Approved", count: 18 },
    { id: "scheduled", label: "Scheduled", count: 15 },
    { id: "paid", label: "Paid", count: kpis?.paid ?? 42 },
    { id: "overdue", label: "Overdue", count: kpis?.overdue ?? 15 },
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
                <CreditCard className="h-6 w-6 text-primary" />
                Bills
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your vendor bills and payables. Extract, review and pay
                with confidence.
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
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Bill
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
                label: "Total Outstanding",
                value: formatCurrency(245600),
                change: "+23.4%",
                changeLabel: "vs last month",
                icon: DollarSign,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Overdue Amount",
                value: formatCurrency(45300),
                subtext: "15 bills overdue",
                icon: AlertTriangle,
                color: "text-red-600",
                bgColor: "bg-red-50",
              },
              {
                label: "Due This Week",
                value: formatCurrency(64200),
                subtext: "9 bills",
                icon: Clock,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
              },
              {
                label: "Paid This Month",
                value: formatCurrency(188750),
                subtext: "32 bills",
                icon: CheckCircle,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Average Days to Pay",
                value: "26 days",
                change: "+5 days",
                changeLabel: "vs last month",
                icon: TrendingUp,
                color: "text-blue-600",
                bgColor: "bg-blue-50",
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
                  placeholder="Search bills..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
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
            <TableSkeleton rows={6} columns={8} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-12 w-12" />}
              title="No bills"
              description="Record your first supplier bill to start tracking payables."
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
                      Bill #
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Vendor
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Bill Date
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
                      Due In / Overdue
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
                        router.push(`/dashboard/ap/invoices/${inv.id}`)
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
                      <td className="py-3 px-4 text-sm">Vendor</td>
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
                      <td className="py-3 px-4 text-sm text-right">
                        {inv.status === "overdue" ? (
                          <span className="text-red-600 font-medium">
                            {Math.floor(Math.random() * 5) + 1} days overdue
                          </span>
                        ) : (
                          <span className="text-emerald-600">
                            Due in {Math.floor(Math.random() * 7) + 1} days
                          </span>
                        )}
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
                  {filtered.length} bills
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

          {/* Bottom Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Bills Trend */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Bills Trend</h3>
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
                {[30, 45, 55, 40, 65, 80].map((h, i) => (
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

            {/* Top Vendors (Outstanding) */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Top Vendors (Outstanding)
                </h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { name: "BuildCo Ltd", amount: 32500, color: "bg-primary" },
                  {
                    name: "Ministry of Lands",
                    amount: 15000,
                    color: "bg-emerald-500",
                  },
                  {
                    name: "Total Energies",
                    amount: 12400,
                    color: "bg-amber-500",
                  },
                  {
                    name: "Alpha Logistics",
                    amount: 6800,
                    color: "bg-orange-500",
                  },
                  {
                    name: "Kombo Auto Works",
                    amount: 8950,
                    color: "bg-red-500",
                  },
                ].map((vendor, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn("h-2 w-2 rounded-full", vendor.color)}
                      />
                      <span className="text-sm">{vendor.name}</span>
                    </div>
                    <span className="text-sm font-mono font-medium">
                      {formatCurrency(vendor.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bills by Status */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-4">Bills by Status</h3>
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
                      className="text-amber-500"
                      strokeDasharray="17 83"
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
                      strokeDasharray="14 86"
                      strokeDashoffset="8"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-blue-500"
                      strokeDasharray="12 88"
                      strokeDashoffset="94"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-red-500"
                      strokeDasharray="15 85"
                      strokeDashoffset="82"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-purple-500"
                      strokeDasharray="33 67"
                      strokeDashoffset="67"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-gray-300"
                      strokeDasharray="11 89"
                      strokeDashoffset="34"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">
                      {kpis?.total ?? 126}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Total Bills
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    {
                      label: "Pending Approval",
                      count: 22,
                      pct: "17%",
                      color: "bg-amber-500",
                    },
                    {
                      label: "Approved",
                      count: 18,
                      pct: "14%",
                      color: "bg-emerald-500",
                    },
                    {
                      label: "Scheduled",
                      count: 15,
                      pct: "12%",
                      color: "bg-blue-500",
                    },
                    {
                      label: "Overdue",
                      count: 15,
                      pct: "12%",
                      color: "bg-red-500",
                    },
                    {
                      label: "Paid",
                      count: 42,
                      pct: "33%",
                      color: "bg-purple-500",
                    },
                    {
                      label: "Draft",
                      count: 14,
                      pct: "11%",
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
          </div>
        </div>
      </div>

      {/* AI Copilot Sidebar */}
      {copilotOpen && (
        <div className="w-80 border-l bg-card hidden lg:block">
          <AICopilotSidebar
            title="Xenboox AI Copilot"
            subtitle="I analyzed your bills and found 4 things to review."
            insights={insights}
            suggestedActions={[
              {
                id: "1",
                icon: <Plus className="h-4 w-4" />,
                label: "New Bill",
                description: "Create a new bill",
              },
              {
                id: "2",
                icon: <TrendingUp className="h-4 w-4" />,
                label: "Recurring Bills",
                description: "Manage recurring",
              },
              {
                id: "3",
                icon: <CreditCard className="h-4 w-4" />,
                label: "Vendor Credits",
                description: "Apply or create",
              },
              {
                id: "4",
                icon: <FileText className="h-4 w-4" />,
                label: "Payment Run",
                description: "Pay multiple bills",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}

      <CreateBillDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
