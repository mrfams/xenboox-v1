"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

import { AICopilotSidebar } from "@/components/dashboard/ai-copilot-sidebar";
import { RunPayrollDialog } from "./run-payroll-dialog";
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
  PlayCircle,
  Calculator,
  Shield,
  Banknote,
  CalendarDays,
  Upload,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const mockEmployees = [
  {
    id: "1",
    name: "Modou Jallow",
    employeeId: "EMP-001",
    department: "Finance",
    payType: "Monthly",
    grossPay: 12500,
    deductions: 2050,
    netPay: 10450,
    status: "Paid",
  },
  {
    id: "2",
    name: "Fatou Camara",
    employeeId: "EMP-002",
    department: "Operations",
    payType: "Monthly",
    grossPay: 9800,
    deductions: 1580,
    netPay: 8220,
    status: "Paid",
  },
  {
    id: "3",
    name: "Yusupha Sanneh",
    employeeId: "EMP-003",
    department: "Sales",
    payType: "Monthly",
    grossPay: 8750,
    deductions: 1350,
    netPay: 7400,
    status: "Paid",
  },
  {
    id: "4",
    name: "Awa Njie",
    employeeId: "EMP-004",
    department: "Customer Support",
    payType: "Monthly",
    grossPay: 7200,
    deductions: 1080,
    netPay: 6120,
    status: "Paid",
  },
  {
    id: "5",
    name: "Lamin Bah",
    employeeId: "EMP-005",
    department: "IT",
    payType: "Monthly",
    grossPay: 11000,
    deductions: 1760,
    netPay: 9240,
    status: "Paid",
  },
  {
    id: "6",
    name: "Mariama Ceesay",
    employeeId: "EMP-006",
    department: "HR",
    payType: "Monthly",
    grossPay: 8200,
    deductions: 1230,
    netPay: 6970,
    status: "Paid",
  },
  {
    id: "7",
    name: "Samba Sanyang",
    employeeId: "EMP-007",
    department: "Operations",
    payType: "Bi-Weekly",
    grossPay: 4600,
    deductions: 720,
    netPay: 3880,
    status: "Paid",
  },
  {
    id: "8",
    name: "Alieu Fofana",
    employeeId: "EMP-008",
    department: "Warehouse",
    payType: "Bi-Weekly",
    grossPay: 4100,
    deductions: 640,
    netPay: 3460,
    status: "Paid",
  },
];

export default function PayrollPipelinePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [runDialogOpen, setRunDialogOpen] = useState(false);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "runs", label: "Runs" },
    { id: "employees", label: "Employees" },
    { id: "pay-items", label: "Pay Items" },
    { id: "deductions", label: "Deductions" },
    { id: "benefits", label: "Benefits" },
    { id: "taxes", label: "Taxes" },
    { id: "compliance", label: "Compliance" },
    { id: "reports", label: "Reports" },
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
                <Users className="h-6 w-6 text-primary" />
                Payroll
              </h1>
              <p className="text-sm text-muted-foreground">
                Run payroll, manage employees and statutory compliance with AI.
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
              <Button size="sm" onClick={() => setRunDialogOpen(true)}>
                <PlayCircle className="mr-2 h-4 w-4" />
                Run Payroll
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Total Payroll (This Month)",
                value: formatCurrency(318750),
                change: "+8.4%",
                changeLabel: "vs last month",
                icon: DollarSign,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                label: "Net Pay",
                value: formatCurrency(220450),
                subtext: "69.1% of total payroll",
                icon: Banknote,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Taxes & Statutory",
                value: formatCurrency(72840),
                subtext: "22.8% of total payroll",
                icon: Shield,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
              },
              {
                label: "Employer Contributions",
                value: formatCurrency(25460),
                subtext: "8.0% of total payroll",
                icon: Calculator,
                color: "text-blue-600",
                bgColor: "bg-blue-50",
              },
              {
                label: "Employees",
                value: "32",
                subtext: "Active employees",
                icon: Users,
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
                  placeholder="Search employees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="ops">Operations</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="it">IT</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Pay Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pay Types</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="biweekly">Bi-Weekly</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Employee Table */}
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground w-10">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Employee
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Employee ID
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Department
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Pay Type
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Gross Pay (GMD)
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Deductions
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Net Pay (GMD)
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() =>
                      router.push(`/dashboard/payroll/employees/${emp.id}`)
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
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {emp.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{emp.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                      {emp.employeeId}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {emp.department}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-[10px]">
                        {emp.payType}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono font-medium">
                      {formatCurrency(emp.grossPay)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono text-muted-foreground">
                      {formatCurrency(emp.deductions)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono font-semibold">
                      {formatCurrency(emp.netPay)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-700 text-[10px]"
                      >
                        {emp.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing 1 to 8 of 32 employees
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
                  4
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Payroll Trend */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Payroll Trend</h3>
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
                {[40, 50, 55, 60, 70, 85].map((h, i) => (
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

            {/* Payroll Summary */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-4">
                Payroll Summary (This Month)
              </h3>
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
                      strokeDasharray="69 31"
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
                      strokeDasharray="23 77"
                      strokeDashoffset="56"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-emerald-500"
                      strokeDasharray="8 92"
                      strokeDashoffset="33"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">
                      GMD
                    </span>
                    <span className="text-sm font-bold">318,750</span>
                    <span className="text-[10px] text-muted-foreground">
                      Total
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    {
                      label: "Net Pay",
                      pct: "69.1%",
                      amount: "GMD 220,450",
                      color: "bg-primary",
                    },
                    {
                      label: "Taxes & Statutory",
                      pct: "22.8%",
                      amount: "GMD 72,840",
                      color: "bg-amber-500",
                    },
                    {
                      label: "Employer Contributions",
                      pct: "8.0%",
                      amount: "GMD 25,460",
                      color: "bg-emerald-500",
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

            {/* Upcoming Statutory Payments */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Upcoming Statutory Payments
                </h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  {
                    name: "NASSIT (Employer & Employee)",
                    date: "May 25, 2025",
                    amount: 22340,
                    days: "5 days left",
                    color: "text-amber-600",
                  },
                  {
                    name: "PAYE (Withholding Tax)",
                    date: "May 25, 2025",
                    amount: 18950,
                    days: "5 days left",
                    color: "text-amber-600",
                  },
                  {
                    name: "GRA (Skills Development Levy)",
                    date: "May 31, 2025",
                    amount: 6450,
                    days: "11 days left",
                    color: "text-emerald-600",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-medium">
                        {formatCurrency(item.amount)}
                      </p>
                      <p className={cn("text-xs", item.color)}>{item.days}</p>
                    </div>
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
            subtitle="I reviewed your payroll data and found a few things."
            insights={[
              {
                id: "1",
                type: "warning",
                title: "High Overtime This Month",
                description: "Overtime pay increased by 32% vs last month",
                action: { label: "View details", onClick: () => {} },
              },
              {
                id: "2",
                type: "info",
                title: "Statutory Payment Due Soon",
                description:
                  "NASSIT payment of GMD 22,340.00 is due by May 25, 2025",
                action: { label: "View compliance", onClick: () => {} },
              },
              {
                id: "3",
                type: "success",
                title: "Payroll Run Looks Good",
                description:
                  "All employees paid. No failed payments. Great job!",
                action: { label: "View report", onClick: () => {} },
              },
            ]}
            suggestedActions={[
              {
                id: "1",
                icon: <PlayCircle className="h-4 w-4" />,
                label: "Run Payroll",
                description: "Create new payroll run",
              },
              {
                id: "2",
                icon: <Plus className="h-4 w-4" />,
                label: "Add Employee",
                description: "Register new employee",
              },
              {
                id: "3",
                icon: <Banknote className="h-4 w-4" />,
                label: "Pay Items",
                description: "Manage pay items",
              },
              {
                id: "4",
                icon: <FileText className="h-4 w-4" />,
                label: "Payroll Report",
                description: "Generate payroll report",
              },
            ]}
            onClose={() => setCopilotOpen(false)}
          />
        </div>
      )}

      <RunPayrollDialog
        open={runDialogOpen}
        onOpenChange={setRunDialogOpen}
        onComplete={() => setRunDialogOpen(false)}
        currentPeriod="2025-05"
      />
    </div>
  );
}
