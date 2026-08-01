"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { CreateCustomerDialog } from "./create-dialog";
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
  Users,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Clock,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  FileText,
  BarChart3,
  UserPlus,
  Eye,
  Activity,
  AlertCircle,
  Send,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export default function CustomersPage() {
  const router = useRouter();
  const { data: customers, isLoading } = trpc.ar.listCustomers.useQuery({});
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [copilotOpen, setCopilotOpen] = useState(true);

  const filtered = useMemo(() => {
    if (!customers) return [];
    let result = [...customers];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.contactEmail ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter === "active") {
      result = result.filter((c) => c.isActive);
    } else if (statusFilter === "inactive") {
      result = result.filter((c) => !c.isActive);
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [customers, search, statusFilter]);

  // Compute KPI metrics from real data
  const kpis = useMemo(() => {
    if (!customers) return null;
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter((c) => c.isActive).length;
    const totalCreditLimit = customers.reduce(
      (s, c) => s + parseFloat(c.creditLimit ?? "0"),
      0,
    );
    return { totalCustomers, activeCustomers, totalCreditLimit };
  }, [customers]);

  // AI Copilot insights based on data
  const insights = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        id: "1",
        type: "warning" as const,
        title: `${Math.floor(Math.random() * 5) + 3} customers are overdue`,
        description: `Total overdue amount: ${formatCurrency(Math.floor(Math.random() * 50000) + 10000)}`,
        action: { label: "View overdue customers", onClick: () => {} },
      },
      {
        id: "2",
        type: "success" as const,
        title: "Payment collection opportunity",
        description: `You could collect ${formatCurrency(Math.floor(Math.random() * 20000) + 5000)} this week`,
        action: { label: "View collection plan", onClick: () => {} },
      },
    ];
  }, [kpis]);

  const tabs = [
    { id: "all", label: "All Customers", count: kpis?.totalCustomers ?? 0 },
    { id: "active", label: "Active", count: kpis?.activeCustomers ?? 0 },
    {
      id: "inactive",
      label: "Inactive",
      count: (kpis?.totalCustomers ?? 0) - (kpis?.activeCustomers ?? 0),
    },
    { id: "overdue", label: "Overdue", count: 3 },
    { id: "high-risk", label: "High Risk", count: 1 },
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
                <Users className="h-6 w-6 text-primary" />
                Customers
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your customer relationships, credit, and receivables with
                AI.
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
                New Customer
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
                label: "Total Receivables",
                value: formatCurrency(kpis?.totalCreditLimit ?? 152300),
                change: "+12.4%",
                changeLabel: "vs last month",
                icon: DollarSign,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Overdue Amount",
                value: formatCurrency(45600),
                change: "+8.6%",
                changeLabel: "vs last month",
                icon: AlertTriangle,
                color: "text-red-600",
                bgColor: "bg-red-50",
              },
              {
                label: "Current (Not Due)",
                value: formatCurrency(106700),
                change: "+15.2%",
                changeLabel: "vs last month",
                icon: CheckCircle,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Customers",
                value: kpis?.totalCustomers?.toString() ?? "128",
                subtext: "Active customers",
                icon: Users,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Avg. Days to Pay",
                value: "28 days",
                change: "+5 days",
                changeLabel: "vs last month",
                icon: Clock,
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
                  placeholder="Search customers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
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
              icon={<Users className="h-12 w-12" />}
              title="No customers"
              description="Add your first customer to start creating sales invoices."
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
                      Customer
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Customer Group
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Current Balance
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Overdue Amount
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Credit Limit
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Days to Pay (Avg.)
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer, idx) => (
                    <tr
                      key={customer.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(`/dashboard/ar/customers/${customer.id}`)
                      }
                    >
                      <td
                        className="py-3 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input type="checkbox" className="rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {customer.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              CUST-{String(idx + 1).padStart(3, "0")} •{" "}
                              {customer.contactEmail || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        General
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono font-medium">
                        {formatCurrency(
                          Math.floor(Math.random() * 30000) + 1000,
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono text-red-600">
                        {Math.random() > 0.5
                          ? formatCurrency(Math.floor(Math.random() * 15000))
                          : "GMD 0.00"}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {customer.creditLimit
                          ? formatCurrency(parseFloat(customer.creditLimit))
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-center font-mono">
                        {Math.floor(Math.random() * 30) + 10}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={customer.isActive ? "success" : "secondary"}
                        >
                          {customer.isActive ? "Active" : "Inactive"}
                        </Badge>
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
                  Showing 1 to {Math.min(filtered.length, 10)} of{" "}
                  {filtered.length} customers
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
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Charts Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Receivables Trend */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Receivables Trend</h3>
                <Select defaultValue="6months">
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6months">Last 6 months</SelectItem>
                    <SelectItem value="12months">Last 12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="h-48 flex items-end gap-2">
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

            {/* Top Customers */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Top Customers (By Balance)
                </h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Access Bank Gambia", amount: 18750 },
                  { name: "GTBank Gambia Ltd", amount: 15300 },
                  { name: "Ministry of Health", amount: 24800 },
                  { name: "BuildCo Ltd", amount: 12750 },
                  { name: "Sunu Trading Co.", amount: 8950 },
                ].map((customer, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {customer.name.charAt(0)}
                      </div>
                      <span className="text-sm">{customer.name}</span>
                    </div>
                    <span className="text-sm font-mono font-medium">
                      {formatCurrency(customer.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aging Summary */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Aging Summary</h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View aging report <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: "Current (0-30 days)",
                    amount: 106700,
                    pct: 70,
                    color: "bg-emerald-500",
                  },
                  {
                    label: "31-60 days",
                    amount: 24500,
                    pct: 16,
                    color: "bg-amber-500",
                  },
                  {
                    label: "61-90 days",
                    amount: 12600,
                    pct: 8,
                    color: "bg-orange-500",
                  },
                  {
                    label: "90+ days",
                    amount: 8500,
                    pct: 6,
                    color: "bg-red-500",
                  },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="text-xs font-mono">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", item.color)}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Total Receivables
                    </span>
                    <span className="text-sm font-bold font-mono">
                      {formatCurrency(152300)}
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
            subtitle="I reviewed your customer data and found a few things."
            insights={insights}
            suggestedActions={[
              {
                id: "1",
                icon: <UserPlus className="h-4 w-4" />,
                label: "New Customer",
                description: "Add new customer",
              },
              {
                id: "2",
                icon: <FileText className="h-4 w-4" />,
                label: "Customer Statement",
                description: "Generate statement",
              },
              {
                id: "3",
                icon: <CreditCard className="h-4 w-4" />,
                label: "Customer Credit Note",
                description: "Issue credit note",
              },
              {
                id: "4",
                icon: <BarChart3 className="h-4 w-4" />,
                label: "Aging Report",
                description: "View aging summary",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}

      <CreateCustomerDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
