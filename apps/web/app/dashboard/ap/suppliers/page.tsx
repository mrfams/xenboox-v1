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
  Users,
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
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const mockVendors = [
  {
    id: "1",
    name: "Sunu Trading Co.",
    code: "VEN-001",
    type: "Supplier",
    phone: "(220) 333-2211",
    email: "info@sunutrading.gm",
    payables: 15600,
    overdue: 5900,
    paymentTerms: "Net 30",
    status: "Active",
  },
  {
    id: "2",
    name: "GTBank Gambia Ltd",
    code: "VEN-002",
    type: "Bank",
    phone: "(220) 439-5500",
    email: "business@gtbank.gm",
    payables: 0,
    overdue: 0,
    paymentTerms: "Net 0",
    status: "Active",
  },
  {
    id: "3",
    name: "Africell Gambia",
    code: "VEN-003",
    type: "Service Provider",
    phone: "(220) 420-0000",
    email: "accounts@africell.gm",
    payables: 8750,
    overdue: 2450,
    paymentTerms: "Net 15",
    status: "Active",
  },
  {
    id: "4",
    name: "Power Solutions Ltd",
    code: "VEN-004",
    type: "Supplier",
    phone: "(220) 632-1122",
    email: "info@powersolutions.gm",
    payables: 12300,
    overdue: 0,
    paymentTerms: "Net 30",
    status: "Active",
  },
  {
    id: "5",
    name: "Yassa Restaurant",
    code: "VEN-005",
    type: "Supplier",
    phone: "(220) 226-7788",
    email: "orders@yassa.gm",
    payables: 3250,
    overdue: 1350,
    paymentTerms: "Net 7",
    status: "Active",
  },
  {
    id: "6",
    name: "Delta Shipping Co.",
    code: "VEN-006",
    type: "Logistics",
    phone: "(220) 390-9080",
    email: "operations@delta.gm",
    payables: 6450,
    overdue: 0,
    paymentTerms: "Net 30",
    status: "Active",
  },
  {
    id: "7",
    name: "Office Furniture Gambia",
    code: "VEN-007",
    type: "Supplier",
    phone: "(220) 799-3344",
    email: "sales@officefurn.gm",
    payables: 4800,
    overdue: 2200,
    paymentTerms: "Net 15",
    status: "On Hold",
  },
  {
    id: "8",
    name: "Marina Pharmacy",
    code: "VEN-008",
    type: "Supplier",
    phone: "(220) 441-1020",
    email: "orders@marinapharma.gm",
    payables: 2950,
    overdue: 780,
    paymentTerms: "Net 7",
    status: "Active",
  },
];

export default function SuppliersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [copilotOpen, setCopilotOpen] = useState(true);

  const tabs = [
    { id: "all", label: "All Vendors", count: 85 },
    { id: "active", label: "Active", count: 85 },
    { id: "inactive", label: "Inactive", count: 6 },
    { id: "onhold", label: "On Hold", count: 3 },
    { id: "1099", label: "1099 Vendors", count: 32 },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Vendors
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your vendors, payments, and relationships.
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
                New Vendor
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
                label: "Total Payables (All)",
                value: formatCurrency(96450),
                change: "-8.6%",
                changeLabel: "vs last month",
                icon: DollarSign,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Overdue Amount",
                value: formatCurrency(22680),
                change: "+15.2%",
                changeLabel: "vs last month",
                icon: AlertTriangle,
                color: "text-red-600",
                bgColor: "bg-red-50",
              },
              {
                label: "Due Within 7 Days",
                value: formatCurrency(18750),
                subtext: "12 invoices",
                icon: Clock,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
              },
              {
                label: "Total Vendors",
                value: "88",
                subtext: "Active vendors",
                icon: Users,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Avg. Days to Pay",
                value: "23 days",
                change: "-4 days",
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
                    <p
                      className={cn(
                        "text-xs mt-1",
                        kpi.change?.startsWith("-")
                          ? "text-emerald-600"
                          : "text-red-600",
                      )}
                    >
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
                  placeholder="Search vendors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="onhold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Vendor Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendor Types</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="service">Service Provider</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Payment Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Terms</SelectItem>
                <SelectItem value="net7">Net 7</SelectItem>
                <SelectItem value="net15">Net 15</SelectItem>
                <SelectItem value="net30">Net 30</SelectItem>
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
                    Vendor
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Vendor Type
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Phone / Email
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Payables (GMD)
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Overdue (GMD)
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Payment Terms
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
                {mockVendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td
                      className="py-3 px-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {vendor.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{vendor.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {vendor.code}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {vendor.type}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm">{vendor.phone}</p>
                        <p className="text-xs text-muted-foreground">
                          {vendor.email}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono font-medium">
                      {formatCurrency(vendor.payables)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono">
                      {vendor.overdue > 0 ? (
                        <span className="text-red-600">
                          {formatCurrency(vendor.overdue)}
                        </span>
                      ) : (
                        <span className="text-emerald-600">0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="secondary" className="text-[10px]">
                        {vendor.paymentTerms}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          vendor.status === "Active"
                            ? "bg-emerald-100 text-emerald-700"
                            : vendor.status === "On Hold"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-600",
                        )}
                      >
                        {vendor.status}
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
                Showing 1 to 8 of 88 vendors
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
            {/* Payables Trend */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Payables Trend</h3>
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

            {/* Top Vendors by Payables */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Top Vendors by Payables
                </h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  {
                    name: "Sunu Trading Co.",
                    amount: 15600,
                    color: "bg-primary",
                  },
                  {
                    name: "Power Solutions Ltd",
                    amount: 12300,
                    color: "bg-emerald-500",
                  },
                  {
                    name: "Africell Gambia",
                    amount: 8750,
                    color: "bg-amber-500",
                  },
                  {
                    name: "Delta Shipping Co.",
                    amount: 6450,
                    color: "bg-orange-500",
                  },
                  {
                    name: "Office Furniture Gambia",
                    amount: 4800,
                    color: "bg-red-500",
                  },
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

            {/* Payment Terms Overview */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-4">
                Payment Terms Overview
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
                      className="text-primary"
                      strokeDasharray="32 68"
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
                      strokeDasharray="25 75"
                      strokeDashoffset="93"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-amber-500"
                      strokeDasharray="34 66"
                      strokeDashoffset="68"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-gray-300"
                      strokeDasharray="9 91"
                      strokeDashoffset="34"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">88</span>
                    <span className="text-[10px] text-muted-foreground">
                      Vendors
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    {
                      label: "Net 7",
                      count: 28,
                      pct: "31.8%",
                      color: "bg-primary",
                    },
                    {
                      label: "Net 15",
                      count: 22,
                      pct: "25.0%",
                      color: "bg-emerald-500",
                    },
                    {
                      label: "Net 30",
                      count: 30,
                      pct: "34.1%",
                      color: "bg-amber-500",
                    },
                    {
                      label: "Net 0",
                      count: 8,
                      pct: "9.1%",
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
            subtitle="Here's what I found in your vendor data."
            insights={[
              {
                id: "1",
                type: "warning",
                title: "6 vendors have overdue invoices",
                description: "Total overdue amount: GMD 22,680.00",
                action: { label: "View overdue vendors", onClick: () => {} },
              },
              {
                id: "2",
                type: "info",
                title: "5 invoices due within 7 days",
                description: "Total amount: GMD 18,750.00",
                action: { label: "View upcoming payments", onClick: () => {} },
              },
              {
                id: "3",
                type: "success",
                title: "Payment optimization",
                description: "You could save GMD 1,480 with early payments.",
                action: { label: "View recommendations", onClick: () => {} },
              },
            ]}
            suggestedActions={[
              {
                id: "1",
                icon: <Plus className="h-4 w-4" />,
                label: "New Vendor",
                description: "Add new vendor",
              },
              {
                id: "2",
                icon: <Upload className="h-4 w-4" />,
                label: "Upload Vendors",
                description: "Import from CSV",
              },
              {
                id: "3",
                icon: <FileText className="h-4 w-4" />,
                label: "Vendor Statement",
                description: "Generate statement",
              },
              {
                id: "4",
                icon: <CreditCard className="h-4 w-4" />,
                label: "1099 Report",
                description: "Generate 1099 report",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
