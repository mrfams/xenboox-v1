"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Bot,
  RefreshCw,
  Send,
  Plus,
  Upload,
  FileText,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  Download,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import type {
  SummaryCardItem,
  TabItem,
} from "@/components/module/module-page-shell.types";

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  overview,
}: {
  overview: {
    totalPayroll: number;
    totalPayrollChange: number;
    netPay: number;
    netPayPercent: number;
    totalDeductions: number;
    deductionsPercent: number;
    employerContributions: number;
    employerContribPercent: number;
    activeEmployees: number;
  };
}) {
  const cards: SummaryCardItem[] = [
    {
      label: "Total Payroll (This Month)",
      value: `GMD ${overview.totalPayroll.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: overview.totalPayrollChange,
      icon: FileText,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      label: "Net Pay",
      value: `GMD ${overview.netPay.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${overview.netPayPercent}% of total payroll`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Taxes & Statutory",
      value: `GMD ${overview.totalDeductions.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${overview.deductionsPercent}% of total payroll`,
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Employer Contributions",
      value: `GMD ${overview.employerContributions.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${overview.employerContribPercent}% of total payroll`,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Employees",
      value: overview.activeEmployees.toString(),
      subtitle: "Active employees",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">{card.label}</p>
            <div className={cn("rounded-lg p-2", card.bgColor)}>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          {card.change !== undefined && (
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  "text-sm font-medium",
                  card.change >= 0 ? "text-emerald-600" : "text-red-600",
                )}
              >
                {card.change >= 0 ? "↑" : "↓"} {Math.abs(card.change)}%
              </span>
              <p className="text-xs text-slate-400">vs last month</p>
            </div>
          )}
          {card.subtitle && card.change === undefined && (
            <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Employee Table ────────────────────────────────────────────────────────

function EmployeeTable({
  employees,
  isLoading,
}: {
  employees: Array<{
    id: string;
    name: string;
    employeeNumber: string;
    department: string;
    payType: string;
    grossPay: number;
    grossPayFormatted: string;
    deductions: number;
    deductionsFormatted: string;
    netPay: number;
    netPayFormatted: string;
    status: string;
  }>;
  isLoading: boolean;
}) {
  const statusColors: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    approved: "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-700",
    draft: "bg-slate-100 text-slate-600",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left py-3 px-4">
              <input type="checkbox" className="rounded border-slate-300" />
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Employee
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Employee ID
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Department
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Pay Type
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Gross Pay (GMD)
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Deductions
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Net Pay (GMD)
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr
              key={emp.id}
              className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <td className="py-3 px-4">
                <input type="checkbox" className="rounded border-slate-300" />
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {emp.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {emp.name}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {emp.employeeNumber}
              </td>
              <td className="py-3 px-4 text-sm text-slate-700">
                {emp.department}
              </td>
              <td className="py-3 px-4 text-sm text-slate-600 capitalize">
                {emp.payType}
              </td>
              <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">
                {emp.grossPayFormatted}
              </td>
              <td className="py-3 px-4 text-right text-sm text-slate-600">
                {emp.deductionsFormatted}
              </td>
              <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">
                {emp.netPayFormatted}
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                    statusColors[emp.status] || statusColors.draft,
                  )}
                >
                  {emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Right Panel ───────────────────────────────────────────────────────────

function RightPanel({
  overview,
  departmentBreakdown,
  insights,
  statutoryPayments,
}: {
  overview: {
    totalPayroll: number;
    period: string;
    hasRun: boolean;
    runStatus: string | null;
    activeEmployees: number;
  };
  departmentBreakdown: {
    departments: Array<{
      name: string;
      amount: number;
      amountFormatted: string;
      percent: number;
    }>;
    totalPayroll: number;
  };
  insights: Array<{
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    description: string;
    actionLabel: string;
  }>;
  statutoryPayments: Array<{
    name: string;
    dueDate: string;
    amountFormatted: string;
    daysLeft: number;
    status: string;
  }>;
}) {
  const [message, setMessage] = useState("");

  const quickActions = [
    "Why did payroll increase this month?",
    "Show overtime analysis",
    "Check statutory compliance",
    "Compare payroll with last month",
  ];

  const departmentColors = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
  ];

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Xenboox AI Copilot</h3>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                Beta
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Greeting */}
        <div>
          <p className="text-lg font-medium text-slate-900">
            Good morning, Famara 👋
          </p>
          <p className="text-sm text-slate-600 mt-1">
            I reviewed your payroll data and found a few things.
          </p>
        </div>

        {/* AI Insights */}
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                "rounded-xl border p-4",
                insight.type === "warning"
                  ? "border-amber-200 bg-amber-50"
                  : insight.type === "success"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-blue-200 bg-blue-50",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center mt-0.5",
                    insight.type === "warning"
                      ? "bg-amber-100"
                      : insight.type === "success"
                        ? "bg-emerald-100"
                        : "bg-blue-100",
                  )}
                >
                  {insight.type === "warning" ? (
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                  ) : insight.type === "success" ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <Clock className="h-3 w-3 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {insight.title}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {insight.description}
                  </p>
                  <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-2">
                    {insight.actionLabel} →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ask me anything */}
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-3">
            Ask me anything
          </h4>
          <div className="space-y-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                className="w-full text-left text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask anything about payroll..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bottom Charts Row ─────────────────────────────────────────────────────

function BottomChartsRow({
  payrollTrend,
  statutoryPayments,
}: {
  payrollTrend: Array<{ month: string; amount: number }>;
  statutoryPayments: Array<{
    name: string;
    dueDate: string;
    amountFormatted: string;
    daysLeft: number;
    status: string;
  }>;
}) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Payroll Trend */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-900">Payroll Trend</h4>
          <select className="text-xs text-slate-500 border border-slate-200 rounded px-2 py-1">
            <option>Last 6 months</option>
          </select>
        </div>

        {/* Simple Line Chart */}
        <div className="h-40 flex items-end gap-2">
          {payrollTrend.map((month, _i) => {
            const maxAmount = Math.max(...payrollTrend.map((m) => m.amount));
            const height = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
            return (
              <div
                key={month.month}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="w-full relative" style={{ height: "100px" }}>
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">
                  {month.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payroll Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-medium text-slate-900 mb-4">
          Payroll Summary (This Month)
        </h4>

        <div className="flex items-center justify-center">
          <div className="relative">
            {/* Donut Chart */}
            <svg className="h-32 w-32" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="12"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#10b981"
                strokeWidth="12"
                strokeDasharray="251.2"
                strokeDashoffset="77.8"
                transform="rotate(-90 50 50)"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="12"
                strokeDasharray="251.2"
                strokeDashoffset="193.4"
                transform="rotate(-90 50 50)"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="12"
                strokeDasharray="251.2"
                strokeDashoffset="231.1"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">GMD 318,750</p>
                <p className="text-[10px] text-slate-500">Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-600">Net Pay</span>
            </div>
            <span className="text-xs text-slate-500">GMD 220,450 (69.1%)</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-600">Taxes & Statutory</span>
            </div>
            <span className="text-xs text-slate-500">GMD 72,840 (22.8%)</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-xs text-slate-600">
                Employer Contributions
              </span>
            </div>
            <span className="text-xs text-slate-500">GMD 25,460 (8.0%)</span>
          </div>
        </div>
      </div>

      {/* Upcoming Statutory Payments */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-900">
            Upcoming Statutory Payments
          </h4>
          <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
            View all →
          </button>
        </div>

        <div className="space-y-3">
          {statutoryPayments.map((payment) => (
            <div
              key={payment.name}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {payment.name}
                </p>
                <p className="text-xs text-slate-500">
                  Due{" "}
                  {new Date(payment.dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {payment.amountFormatted}
                </p>
                <p
                  className={cn(
                    "text-xs font-medium",
                    payment.status === "urgent"
                      ? "text-amber-600"
                      : payment.status === "overdue"
                        ? "text-red-600"
                        : "text-slate-500",
                  )}
                >
                  {payment.daysLeft} days left
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [activeTab, setActiveTab] = useState("Overview");

  const { data: overview } = trpc.payroll.getOverview.useQuery({});

  const { data: employeesData, isLoading: employeesLoading } =
    trpc.payroll.listEmployeesWithPayroll.useQuery({
      search: searchQuery || undefined,
      department: selectedDepartment === "all" ? undefined : selectedDepartment,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

  const { data: departmentBreakdown } =
    trpc.payroll.getDepartmentBreakdown.useQuery({});

  const { data: payrollTrend } = trpc.payroll.getPayrollTrend.useQuery();

  const { data: statutoryData } = trpc.payroll.getStatutoryPayments.useQuery(
    {},
  );

  const { data: insights } = trpc.payroll.getAiInsights.useQuery({});

  const tabs: TabItem[] = [
    { key: "Overview", label: "Overview" },
    { key: "Runs", label: "Runs" },
    { key: "Employees", label: "Employees" },
    { key: "Pay Items", label: "Pay Items" },
    { key: "Deductions", label: "Deductions" },
    { key: "Benefits", label: "Benefits" },
    { key: "Taxes", label: "Taxes" },
    { key: "Compliance", label: "Compliance" },
    { key: "Reports", label: "Reports" },
    { key: "Settings", label: "Settings" },
  ];

  const summaryCards = overview
    ? [
        {
          label: "Total Payroll (This Month)",
          value: `GMD ${overview.totalPayroll.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          change: overview.totalPayrollChange,
          icon: FileText,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50",
        },
        {
          label: "Net Pay",
          value: `GMD ${overview.netPay.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          subtitle: `${overview.netPayPercent}% of total payroll`,
          icon: CheckCircle2,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
        },
        {
          label: "Taxes & Statutory",
          value: `GMD ${overview.totalDeductions.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          subtitle: `${overview.deductionsPercent}% of total payroll`,
          icon: AlertTriangle,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
        },
        {
          label: "Employer Contributions",
          value: `GMD ${overview.employerContributions.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          subtitle: `${overview.employerContribPercent}% of total payroll`,
          icon: TrendingUp,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          label: "Employees",
          value: overview.activeEmployees.toString(),
          subtitle: "Active employees",
          icon: Users,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
        },
      ]
    : [];

  const filters = (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search employees..."
          className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
      <select
        value={selectedDepartment}
        onChange={(e) => setSelectedDepartment(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="all">All Departments</option>
        <option value="Finance">Finance</option>
        <option value="Operations">Operations</option>
        <option value="Sales">Sales</option>
        <option value="IT">IT</option>
        <option value="HR">HR</option>
        <option value="Customer Support">Customer Support</option>
      </select>
      <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <option>All Statuses</option>
        <option>Paid</option>
        <option>Pending</option>
        <option>Draft</option>
      </select>
      <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <option>All Pay Types</option>
        <option>Monthly</option>
        <option>Bi-Weekly</option>
        <option>Weekly</option>
      </select>
      <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <Calendar className="h-4 w-4" />
        May 2025
      </button>
      <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <Filter className="h-4 w-4" />
        Filters
      </button>
    </div>
  );

  const pagination = (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-500">
        Showing {(page - 1) * pageSize + 1} to{" "}
        {Math.min(page * pageSize, employeesData?.totalCount ?? 0)} of{" "}
        {employeesData?.totalCount ?? 0} employees
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded disabled:opacity-50"
        >
          ←
        </button>
        {Array.from(
          { length: Math.min(5, employeesData?.totalPages ?? 1) },
          (_, i) => i + 1,
        ).map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={cn(
              "px-3 py-1.5 text-sm rounded",
              page === p
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() =>
            setPage(Math.min(employeesData?.totalPages ?? 1, page + 1))
          }
          disabled={page === (employeesData?.totalPages ?? 1)}
          className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded disabled:opacity-50"
        >
          →
        </button>
        <select
          value={pageSize}
          onChange={() => setPage(1)}
          className="ml-4 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>
    </div>
  );

  const actions = (
    <>
      <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
        <Plus className="h-4 w-4" />
        Run Payroll
      </button>
      <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <Upload className="h-4 w-4" />
        Import
      </button>
      <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        More
        <ChevronDown className="h-4 w-4" />
      </button>
    </>
  );

  return (
    <ModulePageShell
      title="Payroll"
      description="Run payroll, manage employees and statutory compliance with AI."
      icon={Users}
      iconBgClassName="bg-gradient-to-br from-indigo-500 to-purple-500"
      actions={actions}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      summaryCards={summaryCards}
      filters={filters}
      pagination={pagination}
      bottomCharts={
        <BottomChartsRow
          payrollTrend={payrollTrend ?? []}
          statutoryPayments={statutoryData?.payments ?? []}
        />
      }
    >
      <EmployeeTable
        employees={employeesData?.employees ?? []}
        isLoading={employeesLoading}
      />
    </ModulePageShell>
  );
}
