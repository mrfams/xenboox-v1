"use client";

import { useState } from "react";
import {
  Search,
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
  Receipt,
  Gift,
  BarChart3,
  Settings,
  ShieldCheck,
  Calculator,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { DocumentUploadButton } from "@/components/module/document-upload-button";
import { RowAiAction } from "@/components/module/row-ai-action";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";
import type { TabItem } from "@/components/module/module-page-shell.types";
import { CreatePayrollRunDialog } from "@/components/dashboard/create-payroll-run-dialog";
import { CreateEmployeeDialog } from "@/components/dashboard/create-employee-dialog";
import {
  ModulePanel,
  ModulePanelEmpty,
  ModulePanelLoading,
} from "@/components/module/module-tab-panel";

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
              className="group relative border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <RowAiAction
                focus={{
                  kind: "Employee",
                  name: emp.name,
                  id: emp.id,
                  fields: [
                    { label: "Employee ID", value: emp.employeeNumber },
                    { label: "Department", value: emp.department },
                    { label: "Pay type", value: emp.payType },
                    { label: "Gross pay", value: emp.grossPayFormatted },
                    { label: "Deductions", value: emp.deductionsFormatted },
                    { label: "Net pay", value: emp.netPayFormatted },
                    { label: "Status", value: emp.status },
                  ],
                }}
              />
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

// ─── Payroll Runs Table ───────────────────────────────────────────────────

function PayrollRunsTable({
  runs,
  isLoading,
}: {
  runs: Array<{
    id: string;
    period: string;
    status: string;
    employeeCount: number;
    grossPay: string;
    totalDeductions: string;
    netPay: string;
    processedBy: string | null;
    createdAt: string | null;
  }>;
  isLoading: boolean;
}) {
  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    validated: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    paid: "bg-indigo-100 text-indigo-700",
    closed: "bg-purple-100 text-purple-700",
  };

  if (isLoading) {
    return <ModulePanelLoading rows={5} />;
  }

  if (runs.length === 0) {
    return (
      <ModulePanelEmpty
        icon={FileText}
        title="No payroll runs yet"
        description="Run payroll for a period and the run history will appear here — with gross pay, deductions and net pay per run."
      />
    );
  }

  const fmt = (v: string) =>
    Number(v).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Period
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Employees
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
              Created
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.id}
              className="group relative border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <RowAiAction
                focus={{
                  kind: "Payroll Run",
                  name: run.period,
                  id: run.id,
                  fields: [
                    { label: "Status", value: run.status },
                    { label: "Employees", value: String(run.employeeCount) },
                    { label: "Gross pay", value: run.grossPay },
                    { label: "Deductions", value: run.totalDeductions },
                    { label: "Net pay", value: run.netPay },
                  ],
                }}
              />
              <td className="py-3 px-4 text-sm font-medium text-slate-900">
                {run.period}
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize",
                    statusColors[run.status] ?? statusColors.draft,
                  )}
                >
                  {run.status}
                </span>
              </td>
              <td className="py-3 px-4 text-right text-sm tabular-nums text-slate-700">
                {run.employeeCount}
              </td>
              <td className="py-3 px-4 text-right text-sm font-medium tabular-nums text-slate-900">
                GMD {fmt(run.grossPay)}
              </td>
              <td className="py-3 px-4 text-right text-sm tabular-nums text-slate-600">
                GMD {fmt(run.totalDeductions)}
              </td>
              <td className="py-3 px-4 text-right text-sm font-medium tabular-nums text-slate-900">
                GMD {fmt(run.netPay)}
              </td>
              <td className="py-3 px-4 text-sm text-slate-500 whitespace-nowrap">
                {run.createdAt
                  ? new Date(run.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Deduction Types Table ─────────────────────────────────────────────────

function DeductionTypesTable({
  deductionTypes,
  isLoading,
}: {
  deductionTypes: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    rateType: string;
    rate: string;
    ceiling: string | null;
    isStatutory: boolean;
    isActive: boolean;
  }>;
  isLoading: boolean;
}) {
  const typeColors: Record<string, string> = {
    tax: "bg-red-100 text-red-700",
    social_security: "bg-blue-100 text-blue-700",
    benefit: "bg-emerald-100 text-emerald-700",
    loan: "bg-purple-100 text-purple-700",
    other: "bg-slate-100 text-slate-600",
  };

  if (isLoading) {
    return <ModulePanelLoading rows={4} />;
  }

  if (deductionTypes.length === 0) {
    return (
      <ModulePanelEmpty
        icon={Calculator}
        title="No deduction types configured"
        description="Deduction types — PAYE, NASSIT, SDL and loans — are configured when payroll is set up."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Deduction
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Type
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Rate
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Ceiling
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Statutory
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {deductionTypes.map((d) => (
            <tr
              key={d.id}
              className="group relative border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <RowAiAction
                focus={{
                  kind: "Deduction",
                  name: d.name,
                  id: d.id,
                  fields: [
                    { label: "Code", value: d.code },
                    { label: "Type", value: d.type },
                    { label: "Rate", value: d.rate },
                    { label: "Ceiling", value: d.ceiling ?? "None" },
                    {
                      label: "Status",
                      value: d.isActive ? "Active" : "Inactive",
                    },
                  ],
                }}
              />
              <td className="py-3 px-4">
                <p className="text-sm font-medium text-slate-900">{d.name}</p>
                <p className="text-xs text-slate-400 uppercase">{d.code}</p>
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize",
                    typeColors[d.type] ?? typeColors.other,
                  )}
                >
                  {d.type.replace("_", " ")}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-slate-700">
                {d.rateType === "fixed"
                  ? `GMD ${Number(d.rate).toLocaleString()}`
                  : `${Number(d.rate)}%`}
              </td>
              <td className="py-3 px-4 text-right text-sm tabular-nums text-slate-600">
                {d.ceiling ? `GMD ${Number(d.ceiling).toLocaleString()}` : "—"}
              </td>
              <td className="py-3 px-4">
                {d.isStatutory ? (
                  <span className="text-sm font-medium text-indigo-600">
                    Statutory
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs",
                    d.isActive ? "text-emerald-600" : "text-slate-400",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      d.isActive ? "bg-emerald-500" : "bg-slate-300",
                    )}
                  />
                  {d.isActive ? "Active" : "Inactive"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Statutory Payments Table ──────────────────────────────────────────────

function StatutoryPaymentsTable({
  payments,
  isLoading,
}: {
  payments: Array<{
    name: string;
    dueDate: string;
    amountFormatted: string;
    daysLeft: number;
    status: string;
  }>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <ModulePanelLoading rows={3} />;
  }

  if (payments.length === 0) {
    return (
      <ModulePanelEmpty
        icon={ShieldCheck}
        title="No statutory payments due"
        description="NASSIT, PAYE and SDL obligations for the current payroll period will appear here once payroll runs."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Obligation
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
              Due Date
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Amount
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
              Days Left
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr
              key={p.name}
              className="group relative border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <RowAiAction
                focus={{
                  kind: "Statutory Payment",
                  name: p.name,
                  fields: [
                    { label: "Due date", value: p.dueDate },
                    { label: "Amount", value: p.amountFormatted },
                    { label: "Days left", value: String(p.daysLeft) },
                    { label: "Status", value: p.status },
                  ],
                }}
              />
              <td className="py-3 px-4">
                <p className="text-sm font-medium text-slate-900">{p.name}</p>
                {p.status && (
                  <span
                    className={cn(
                      "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                      p.status === "overdue"
                        ? "bg-red-100 text-red-700"
                        : p.status === "urgent"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {p.status}
                  </span>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                {new Date(p.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className="py-3 px-4 text-right text-sm font-medium tabular-nums text-slate-900">
                {p.amountFormatted}
              </td>
              <td className="py-3 px-4 text-right">
                <span
                  className={cn(
                    "text-sm font-medium tabular-nums",
                    p.daysLeft < 0
                      ? "text-red-600"
                      : p.daysLeft <= 7
                        ? "text-amber-600"
                        : "text-slate-700",
                  )}
                >
                  {p.daysLeft < 0 ? "Overdue" : `${p.daysLeft} days`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Compliance Panel ──────────────────────────────────────────────────────

function CompliancePanel({
  status,
  isLoading,
}: {
  status: {
    currentPeriod: string | null;
    recentRuns: Array<{
      id: string;
      period: string;
      status: string;
      employeeCount: number;
      grossPay: string;
      netPay: string;
      createdAt: string;
    }>;
    totalPayslipsGenerated: number;
    upcomingDeadlines: Array<unknown>;
  } | null;
  isLoading: boolean;
}) {
  const runStatusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    validated: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    paid: "bg-indigo-100 text-indigo-700",
    closed: "bg-purple-100 text-purple-700",
  };

  if (isLoading) {
    return <ModulePanelLoading rows={4} />;
  }

  if (!status) {
    return (
      <ModulePanelEmpty
        icon={ShieldCheck}
        title="No compliance data yet"
        description="Payroll compliance status — statutory obligations, payslips and deadlines — will appear here after your first payroll run."
      />
    );
  }

  return (
    <div className="p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Current Period
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
            {status.currentPeriod ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Payslips Generated
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
            {status.totalPayslipsGenerated.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Recent Runs
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
            {status.recentRuns.length.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-2.5 px-4 text-sm font-medium text-slate-600">
                Period
              </th>
              <th className="text-left py-2.5 px-4 text-sm font-medium text-slate-600">
                Status
              </th>
              <th className="text-right py-2.5 px-4 text-sm font-medium text-slate-600">
                Employees
              </th>
              <th className="text-right py-2.5 px-4 text-sm font-medium text-slate-600">
                Gross Pay
              </th>
              <th className="text-right py-2.5 px-4 text-sm font-medium text-slate-600">
                Net Pay
              </th>
            </tr>
          </thead>
          <tbody>
            {status.recentRuns.map((run) => (
              <tr
                key={run.id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="py-2.5 px-4 text-sm text-slate-700">
                  {run.period}
                </td>
                <td className="py-2.5 px-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                      runStatusColors[run.status] ?? runStatusColors.draft,
                    )}
                  >
                    {run.status}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right text-sm tabular-nums text-slate-700">
                  {run.employeeCount}
                </td>
                <td className="py-2.5 px-4 text-right text-sm tabular-nums text-slate-600">
                  GMD {Number(run.grossPay).toLocaleString()}
                </td>
                <td className="py-2.5 px-4 text-right text-sm font-medium tabular-nums text-slate-900">
                  GMD {Number(run.netPay).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  overview,
}: {
  payrollTrend: Array<{ month: string; amount: number }>;
  statutoryPayments: Array<{
    name: string;
    dueDate: string;
    amountFormatted: string;
    daysLeft: number;
    status: string;
  }>;
  overview: {
    totalPayroll: number;
    netPay: number;
    totalDeductions: number;
    employerContributions: number;
  } | null;
}) {
  const total = overview?.totalPayroll ?? 0;
  const netPct = total > 0 ? (overview!.netPay / total) * 100 : 0;
  const taxPct = total > 0 ? (overview!.totalDeductions / total) * 100 : 0;
  const employerPct =
    total > 0 ? (overview!.employerContributions / total) * 100 : 0;
  const CIRC = 251.2;
  const fmtGmd = (v: number) =>
    v.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
            {/* Donut Chart — real split of total payroll */}
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
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - netPct / 100)}
                transform="rotate(-90 50 50)"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="12"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - (netPct + taxPct) / 100)}
                transform="rotate(-90 50 50)"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="12"
                strokeDasharray={CIRC}
                strokeDashoffset={
                  CIRC * (1 - (netPct + taxPct + employerPct) / 100)
                }
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-base font-bold tabular-nums text-slate-900">
                  GMD {total.toLocaleString()}
                </p>
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
            <span className="text-xs tabular-nums text-slate-500">
              GMD {fmtGmd(overview?.netPay ?? 0)} ({netPct.toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-600">Taxes & Statutory</span>
            </div>
            <span className="text-xs tabular-nums text-slate-500">
              GMD {fmtGmd(overview?.totalDeductions ?? 0)} ({taxPct.toFixed(1)}
              %)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-xs text-slate-600">
                Employer Contributions
              </span>
            </div>
            <span className="text-xs tabular-nums text-slate-500">
              GMD {fmtGmd(overview?.employerContributions ?? 0)} (
              {employerPct.toFixed(1)}%)
            </span>
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
  const [showRun, setShowRun] = useState(false);
  const [showEmployee, setShowEmployee] = useState(false);

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

  const { data: runs, isLoading: runsLoading } =
    trpc.payroll.listPayrollRuns.useQuery(undefined, {
      enabled:
        activeTab === "Overview" ||
        activeTab === "Runs" ||
        activeTab === "Compliance",
    });

  const { data: deductionTypes, isLoading: deductionsLoading } =
    trpc.payroll.listDeductionTypes.useQuery(undefined, {
      enabled: activeTab === "Deductions",
    });

  const { data: pipelineStatus, isLoading: pipelineLoading } =
    trpc.payroll.getPayrollPipelineStatus.useQuery(
      {},
      {
        enabled: activeTab === "Compliance",
      },
    );

  const tabs: TabItem[] = [
    { key: "Overview", label: "Overview" },
    {
      key: "Runs",
      label: "Runs",
      count: runs?.length || undefined,
    },
    {
      key: "Employees",
      label: "Employees",
      count: overview?.activeEmployees,
    },
    { key: "Pay Items", label: "Pay Items" },
    { key: "Deductions", label: "Deductions" },
    { key: "Benefits", label: "Benefits" },
    { key: "Taxes", label: "Taxes" },
    { key: "Compliance", label: "Compliance" },
    { key: "Reports", label: "Reports" },
    { key: "Settings", label: "Settings" },
  ];

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);
  };

  const renderPanel = () => {
    switch (activeTab) {
      case "Runs":
        return (
          <ModulePanel
            title="Payroll Runs"
            description="History of payroll runs with gross, deductions and net totals."
          >
            <PayrollRunsTable
              runs={
                runs?.map((run) => ({
                  id: run.id,
                  period: run.period,
                  status: run.status,
                  employeeCount: run.employeeCount,
                  grossPay: run.grossPay,
                  totalDeductions: run.totalDeductions,
                  netPay: run.netPay,
                  processedBy: run.processedBy ?? null,
                  createdAt: run.createdAt,
                })) ?? []
              }
              isLoading={runsLoading}
            />
          </ModulePanel>
        );
      case "Employees":
        return (
          <ModulePanel
            title="Employees"
            description="Your payroll register with gross, deductions and net pay."
            action={
              <button
                onClick={() => setShowEmployee(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Employee
              </button>
            }
          >
            <EmployeeTable
              employees={employeesData?.employees ?? []}
              isLoading={employeesLoading}
            />
          </ModulePanel>
        );
      case "Pay Items":
        return (
          <ModulePanel
            title="Pay Items"
            description="Earnings components used when building payroll runs."
          >
            <ModulePanelEmpty
              icon={Receipt}
              title="Pay items are not set up yet"
              description="Pay items — basic salary, allowances, overtime — are configured during payroll setup. Runs are built from employee contracts today."
            />
          </ModulePanel>
        );
      case "Deductions":
        return (
          <ModulePanel
            title="Deduction Types"
            description="Statutory and voluntary deductions applied to payroll."
          >
            <DeductionTypesTable
              deductionTypes={
                deductionTypes?.map((d) => ({
                  id: d.id,
                  name: d.name,
                  code: d.code,
                  type: d.type,
                  rateType: d.rateType,
                  rate: d.rate,
                  ceiling: d.ceiling ?? null,
                  isStatutory: d.isStatutory,
                  isActive: d.isActive,
                })) ?? []
              }
              isLoading={deductionsLoading}
            />
          </ModulePanel>
        );
      case "Benefits":
        return (
          <ModulePanel
            title="Benefits"
            description="Employee benefits and non-cash compensation."
          >
            <ModulePanelEmpty
              icon={Gift}
              title="Benefits administration is coming"
              description="Health, transport and other benefits will be managed here. Benefits-related deductions already flow through payroll runs."
            />
          </ModulePanel>
        );
      case "Taxes":
        return (
          <ModulePanel
            title="Statutory Payments"
            description="NASSIT, PAYE and SDL obligations for the current period."
          >
            <StatutoryPaymentsTable
              payments={statutoryData?.payments ?? []}
              isLoading={!statutoryData}
            />
          </ModulePanel>
        );
      case "Compliance":
        return (
          <ModulePanel
            title="Compliance"
            description="Payroll compliance status and filing readiness."
          >
            <CompliancePanel
              status={pipelineStatus ?? null}
              isLoading={pipelineLoading}
            />
          </ModulePanel>
        );
      case "Reports":
        return (
          <ModulePanel
            title="Payroll Reports"
            description="Payslips and statutory reports."
          >
            <ModulePanelEmpty
              icon={BarChart3}
              title="Payroll reports are coming"
              description="Payslips, P10/P11 summaries and statutory filing reports will be generated from this tab."
            />
          </ModulePanel>
        );
      case "Settings":
        return (
          <ModulePanel
            title="Payroll Settings"
            description="Company payroll configuration."
          >
            <ModulePanelEmpty
              icon={Settings}
              title="Payroll settings are coming"
              description="Company tax IDs, statutory rates and payroll preferences will be configured here."
            />
          </ModulePanel>
        );
      default:
        // Overview — summary dashboard with recent runs, department breakdown, and statutory overview.
        return (
          <div className="p-4 space-y-6">
            {/* Recent Payroll Runs */}
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <div>
                  <h3 className="font-medium text-slate-900">
                    Recent Payroll Runs
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Latest processed payroll periods.
                  </p>
                </div>
                <button
                  onClick={() => handleTabChange("Runs")}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View all →
                </button>
              </div>
              {runsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
              ) : !runs || runs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-900">
                    No payroll runs yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Run your first payroll to see it here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500">
                          Period
                        </th>
                        <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500">
                          Status
                        </th>
                        <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500">
                          Employees
                        </th>
                        <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500">
                          Net Pay
                        </th>
                        <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500">
                          Processed
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.slice(0, 5).map((run) => (
                        <tr
                          key={run.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >
                          <td className="py-2.5 px-4 text-sm font-medium text-slate-900">
                            {run.period}
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                                run.status === "paid"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : run.status === "approved"
                                    ? "bg-blue-100 text-blue-700"
                                    : run.status === "draft"
                                      ? "bg-slate-100 text-slate-600"
                                      : "bg-amber-100 text-amber-700",
                              )}
                            >
                              {run.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right text-sm tabular-nums text-slate-700">
                            {run.employeeCount}
                          </td>
                          <td className="py-2.5 px-4 text-right text-sm font-medium tabular-nums text-slate-900">
                            GMD {Number(run.netPay).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-sm text-slate-500">
                            {run.createdAt
                              ? new Date(run.createdAt).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" },
                                )
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Department Breakdown + Statutory Overview */}
            <div className="grid grid-cols-2 gap-6">
              {/* Department Breakdown */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-medium text-slate-900 mb-4">
                  Department Breakdown
                </h3>
                {departmentBreakdown?.departments &&
                departmentBreakdown.departments.length > 0 ? (
                  <div className="space-y-3">
                    {departmentBreakdown.departments.map((dept, i) => {
                      const colors = [
                        "bg-indigo-500",
                        "bg-emerald-500",
                        "bg-amber-500",
                        "bg-blue-500",
                        "bg-purple-500",
                        "bg-pink-500",
                      ];
                      return (
                        <div key={dept.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-700">
                              {dept.name}
                            </span>
                            <span className="text-sm font-medium tabular-nums text-slate-900">
                              {dept.amountFormatted}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                colors[i % colors.length],
                              )}
                              style={{ width: `${dept.percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No department data available.
                  </p>
                )}
              </div>

              {/* Upcoming Statutory */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-slate-900">
                    Upcoming Statutory
                  </h3>
                  <button
                    onClick={() => handleTabChange("Taxes")}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View all →
                  </button>
                </div>
                {statutoryData?.payments &&
                statutoryData.payments.length > 0 ? (
                  <div className="space-y-3">
                    {statutoryData.payments.slice(0, 4).map((payment) => (
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
                            {new Date(payment.dueDate).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-900">
                            {payment.amountFormatted}
                          </p>
                          <p
                            className={cn(
                              "text-xs font-medium",
                              payment.status === "overdue"
                                ? "text-red-600"
                                : payment.status === "urgent"
                                  ? "text-amber-600"
                                  : "text-slate-500",
                            )}
                          >
                            {payment.daysLeft} days
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No upcoming obligations.
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Charts */}
            <BottomChartsRow
              payrollTrend={payrollTrend ?? []}
              statutoryPayments={statutoryData?.payments ?? []}
              overview={overview ?? null}
            />
          </div>
        );
    }
  };

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

  const showEmployeesList = activeTab === "Employees";

  const filters = showEmployeesList ? (
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
      {searchQuery && (
        <button
          onClick={() => setSearchQuery("")}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Clear search
        </button>
      )}
    </div>
  ) : undefined;

  const pagination = showEmployeesList ? (
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
  ) : undefined;

  const actions = (
    <>
      <AiSimulationTrigger
        traceId="payroll-run"
        label="Run with AI"
        variant="outline"
      />
      <AiSimulationTrigger
        traceId="payroll-filing"
        label="AI File Returns"
        variant="outline"
      />
      <button
        onClick={() => setShowRun(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" />
        Run Payroll
      </button>
      <DocumentUploadButton
        docType="payroll_report"
        label="Import"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      />
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
      onTabChange={handleTabChange}
      summaryCards={summaryCards}
      filters={filters}
      pagination={pagination}
    >
      {renderPanel()}
      <CreatePayrollRunDialog
        open={showRun}
        onClose={() => setShowRun(false)}
      />
      <CreateEmployeeDialog
        open={showEmployee}
        onClose={() => setShowEmployee(false)}
      />
    </ModulePageShell>
  );
}
