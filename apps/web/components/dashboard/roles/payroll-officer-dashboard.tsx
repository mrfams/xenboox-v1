"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@/components/ui";
import { StatCard } from "@/components/dashboard/stat-card";
import { Skeleton } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Users,
  UserPlus,
  UserMinus,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  CalendarDays,
  DollarSign,
  FileText,
  Shield,
  Send,
  Banknote,
} from "lucide-react";

/**
 * Payroll Officer Dashboard
 *
 * Per Architecture Doc §5:
 * Shows payroll run status, exceptions (new starters/leavers),
 * and a payroll-specific compliance calendar.
 * Designed for the payroll officer who manages the monthly payroll cycle.
 */

// ─── Types ──────────────────────────────────────────────────────────────

type Employee = {
  id: string;
  name: string;
  employeeNumber: string;
  department: string | null;
  jobTitle: string | null;
  employmentType: string;
  hireDate: string;
  terminationDate: string | null;
  isActive: boolean;
};

type PayrollRun = {
  id: string;
  period: string;
  status: string;
  employeeCount: number;
  grossPay: string;
  netPay: string;
  totalDeductions: string;
  notes: string | null;
  createdAt: string | Date;
};

// ─── Payroll Run Status ───────────────────────────────────────────────

function PayrollRunTimeline({
  runs,
  isLoading,
}: {
  runs: PayrollRun[];
  isLoading: boolean;
}) {
  const latestRun = runs[0];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Payroll Run Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!latestRun) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Payroll Run Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Banknote className="h-8 w-8 text-muted-foreground" />}
            title="No payroll runs yet"
            description="Create your first payroll run to get started."
            action={
              <Link href="/dashboard/payroll/pipeline">
                <Button size="sm" className="gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Run Payroll
                </Button>
              </Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const statusOrder = ["draft", "validated", "approved", "paid", "closed"];
  const currentIdx = statusOrder.indexOf(latestRun.status);

  const statusConfig: Record<
    string,
    { label: string; color: string; bg: string; icon: React.ReactNode }
  > = {
    draft: {
      label: "Draft",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      icon: <Clock className="h-3 w-3" />,
    },
    validated: {
      label: "Validated",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    approved: {
      label: "Approved",
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    paid: {
      label: "Paid",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    closed: {
      label: "Closed",
      color: "text-muted-foreground",
      bg: "bg-muted",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
  };

  const currentStatus = statusConfig[latestRun.status] ?? statusConfig.draft;

  // Format period label
  const periodLabel = latestRun.period.replace(/-/, " ");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Payroll Run Status
          </CardTitle>
          <Link href="/dashboard/payroll/pipeline">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              View all <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold capitalize">{periodLabel}</p>
            <p className="text-xs text-muted-foreground">
              {latestRun.employeeCount} employees ·{" "}
              {formatCurrency(parseFloat(latestRun.netPay))} net pay
            </p>
          </div>
          <Badge variant="secondary" className={cn("gap-1", currentStatus.bg)}>
            <span className={currentStatus.color}>{currentStatus.icon}</span>
            {currentStatus.label}
          </Badge>
        </div>

        {/* Status Progress Steps */}
        <div className="flex items-center gap-1 mb-4">
          {statusOrder.map((status, idx) => {
            const config = statusConfig[status];
            const isCompleted = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={status} className="flex-1 flex items-center">
                <div
                  className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-full text-[10px] font-medium transition-colors shrink-0",
                    isCompleted ? config.bg : "bg-muted",
                    isCurrent && "ring-2 ring-offset-1",
                  )}
                >
                  <span
                    className={
                      isCompleted ? config.color : "text-muted-foreground/50"
                    }
                  >
                    {idx + 1}
                  </span>
                </div>
                {idx < statusOrder.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 mx-1 rounded-full",
                      idx < currentIdx ? "bg-primary/30" : "bg-muted",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Run Details */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
            <span>Gross Pay</span>
            <span className="font-medium tabular-nums">
              {formatCurrency(parseFloat(latestRun.grossPay))}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
            <span>Total Deductions</span>
            <span className="font-medium tabular-nums">
              {formatCurrency(parseFloat(latestRun.totalDeductions))}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/10">
            <span className="font-medium text-foreground">Net Pay</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatCurrency(parseFloat(latestRun.netPay))}
            </span>
          </div>
        </div>

        {latestRun.status === "draft" && (
          <Link href="/dashboard/payroll/pipeline">
            <Button size="sm" className="w-full mt-4 gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Process Payroll Run
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Exceptions Widget ────────────────────────────────────────────────

function ExceptionsWidget({
  employees,
  isLoading,
}: {
  employees: Employee[];
  isLoading: boolean;
}) {
  const exceptions = useMemo(() => {
    if (!employees?.length)
      return { newStarters: [], leavers: [], salaryAnomalies: [] };

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const newStarters = employees.filter((e) => {
      const hire = new Date(e.hireDate);
      return hire >= thirtyDaysAgo && hire <= now && e.isActive;
    });

    const leavers = employees.filter((e) => {
      if (!e.terminationDate) return false;
      const term = new Date(e.terminationDate);
      return term >= thirtyDaysAgo && term <= now && !e.isActive;
    });

    return {
      newStarters,
      leavers,
      salaryAnomalies: [],
    };
  }, [employees]);

  const totalExceptions =
    exceptions.newStarters.length +
    exceptions.leavers.length +
    exceptions.salaryAnomalies.length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Exceptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Exceptions
          </CardTitle>
          <Badge
            variant={totalExceptions > 0 ? "secondary" : "outline"}
            className={cn(
              totalExceptions > 0 && "gap-1 bg-amber-500/10 text-amber-600",
            )}
          >
            {totalExceptions > 0 ? (
              <AlertCircle className="h-3 w-3" />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            )}
            {totalExceptions > 0 ? `${totalExceptions} pending` : "Clear"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {totalExceptions === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
            title="No exceptions"
            description="No new starters, leavers, or salary changes in the last 30 days."
            className="py-2"
          />
        ) : (
          <div className="space-y-2">
            {exceptions.newStarters.length > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10">
                    <UserPlus className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {exceptions.newStarters.length} New Starter
                      {exceptions.newStarters.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exceptions.newStarters
                        .map((e) => e.name)
                        .join(", ")
                        .slice(0, 60)}
                      {exceptions.newStarters.map((e) => e.name).join(", ")
                        .length > 60
                        ? "..."
                        : ""}
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/payroll/pipeline">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs shrink-0"
                  >
                    Review
                  </Button>
                </Link>
              </div>
            )}

            {exceptions.leavers.length > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/20 p-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/10">
                    <UserMinus className="h-3.5 w-3.5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {exceptions.leavers.length} Leaver
                      {exceptions.leavers.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exceptions.leavers
                        .map((e) => e.name)
                        .join(", ")
                        .slice(0, 60)}
                      {exceptions.leavers.map((e) => e.name).join(", ").length >
                      60
                        ? "..."
                        : ""}
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/payroll/pipeline">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs shrink-0"
                  >
                    Review
                  </Button>
                </Link>
              </div>
            )}

            {exceptions.salaryAnomalies.length > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10">
                    <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {exceptions.salaryAnomalies.length} Salary Change
                      {exceptions.salaryAnomalies.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Flagged by Payroll Agent
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/payroll/pipeline">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs shrink-0"
                  >
                    Review
                  </Button>
                </Link>
              </div>
            )}

            <Link href="/dashboard/payroll/pipeline">
              <Button variant="ghost" size="sm" className="w-full mt-1 text-xs">
                Manage all exceptions <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Payroll Compliance Calendar ──────────────────────────────────────

function PayrollComplianceCalendar() {
  const currentYear = new Date().getFullYear();
  const deadlines = useMemo(
    () => [
      {
        id: "paye",
        label: "PAYE Remittance",
        description: "Monthly PAYE & Social Security",
        deadline: new Date(currentYear, 6, 15), // Jul 15
        type: "monthly",
        status: determineStatus(new Date(currentYear, 6, 15)),
      },
      {
        id: "pension",
        label: "Pension Fund Contribution",
        description: "Employer & employee pension remittance",
        deadline: new Date(currentYear, 6, 10), // Jul 10
        type: "monthly",
        status: determineStatus(new Date(currentYear, 6, 10)),
      },
      {
        id: "withholding",
        label: "Withholding Tax Return",
        description: "Contractor WHT remittance",
        deadline: new Date(currentYear, 6, 30), // Jul 30
        type: "monthly",
        status: determineStatus(new Date(currentYear, 6, 30)),
      },
      {
        id: "annual-returns",
        label: "Annual Payroll Returns",
        description: "P60 equivalent & annual summaries",
        deadline: new Date(currentYear, 0, 31), // Jan 31
        type: "annual",
        status: determineStatus(new Date(currentYear, 1, 0)), // Past
      },
    ],
    [currentYear],
  );

  function determineStatus(deadline: Date): {
    label: string;
    color: string;
    bg: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  } {
    const now = new Date();
    const diffDays = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) {
      return {
        label: "Overdue",
        color: "text-red-500",
        bg: "bg-red-500/10",
        variant: "destructive",
      };
    }
    if (diffDays <= 7) {
      return {
        label: `${diffDays}d left`,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        variant: "secondary",
      };
    }
    if (diffDays <= 30) {
      return {
        label: `${diffDays}d left`,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        variant: "secondary",
      };
    }
    return {
      label: "Scheduled",
      color: "text-muted-foreground",
      bg: "bg-muted",
      variant: "outline",
    };
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Payroll Compliance Calendar
          </CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {deadlines.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border p-2.5"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full shrink-0",
                    d.status.bg,
                  )}
                >
                  <CalendarDays className={cn("h-3.5 w-3.5", d.status.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium">{d.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.description} ·{" "}
                    {d.deadline.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <Badge
                variant={d.status.variant}
                className={cn(
                  "text-[10px] shrink-0",
                  d.status.bg,
                  d.status.color,
                )}
              >
                {d.status.label}
              </Badge>
            </div>
          ))}
        </div>
        <Link href="/dashboard/tax-compliance/pipeline">
          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
            View full compliance dashboard{" "}
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────

function PayrollQuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/dashboard/payroll/pipeline">
            <Button
              variant="outline"
              className="w-full h-auto flex-col gap-1 py-3"
            >
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">Run Payroll</span>
            </Button>
          </Link>
          <Link href="/dashboard/payroll/staff">
            <Button
              variant="outline"
              className="w-full h-auto flex-col gap-1 py-3"
            >
              <Users className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">Staff List</span>
            </Button>
          </Link>
          <Link href="/dashboard/payroll/pipeline?tab=exceptions">
            <Button
              variant="outline"
              className="w-full h-auto flex-col gap-1 py-3"
            >
              <UserPlus className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">Add Employee</span>
            </Button>
          </Link>
          <Link href="/dashboard/reports">
            <Button
              variant="outline"
              className="w-full h-auto flex-col gap-1 py-3"
            >
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">Payroll Reports</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────

export function PayrollOfficerDashboard() {
  const { data: employees, isLoading: empLoading } =
    trpc.payroll.listEmployees.useQuery(undefined);
  const { data: payrollRuns, isLoading: runsLoading } =
    trpc.payroll.listPayrollRuns.useQuery(undefined);

  const isLoading = empLoading || runsLoading;

  const metrics = useMemo(() => {
    const empList = (employees ?? []) as Employee[];
    const runs = (payrollRuns ?? []) as PayrollRun[];

    const activeEmployees = empList.filter((e) => e.isActive).length;
    const totalContracts = empList.filter(
      (e) => e.employmentType === "contractor" && e.isActive,
    ).length;

    const latestPaidRun = runs
      .filter((r) => r.status === "paid" || r.status === "closed")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];

    return {
      activeEmployees,
      totalContracts,
      latestNetPay: latestPaidRun ? parseFloat(latestPaidRun.netPay) : 0,
      totalRuns: runs.length,
      payrollCost: latestPaidRun ? parseFloat(latestPaidRun.grossPay) : 0,
    };
  }, [employees, payrollRuns]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Payroll Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage payroll runs, handle exceptions, and stay compliant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Shield className="h-3 w-3" />
            Payroll Officer
          </Badge>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Active Employees"
          value={metrics.activeEmployees.toString()}
          changeLabel={
            metrics.totalContracts > 0
              ? `${metrics.totalContracts} contractors`
              : "No contractors"
          }
          href="/dashboard/payroll/staff"
        />
        <StatCard
          icon={<Banknote className="h-4 w-4" />}
          label="Monthly Payroll Cost"
          value={formatCurrency(metrics.payrollCost)}
          changeLabel="Gross pay this period"
          href="/dashboard/payroll/pipeline"
        />
        <StatCard
          icon={<TrendingDown className="h-4 w-4" />}
          label="Net Payroll"
          value={formatCurrency(metrics.latestNetPay)}
          changeLabel="After deductions"
          href="/dashboard/payroll/pipeline"
        />
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Payroll Runs"
          value={metrics.totalRuns.toString()}
          changeLabel={
            payrollRuns && payrollRuns.length > 0
              ? `Latest: ${payrollRuns[0]?.period ?? "N/A"}`
              : "No runs yet"
          }
          href="/dashboard/payroll/pipeline"
        />
      </div>

      {/* Main Content: 3-column layout */}
      {/* Left + Center: Run Status & Quick Actions / Exceptions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Payroll Run Timeline — takes 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <PayrollRunTimeline
            runs={(payrollRuns ?? []) as PayrollRun[]}
            isLoading={runsLoading}
          />
          <PayrollQuickActions />
        </div>

        {/* Right Column: Exceptions + Compliance */}
        <div className="space-y-4">
          <ExceptionsWidget
            employees={(employees ?? []) as Employee[]}
            isLoading={empLoading}
          />
          <PayrollComplianceCalendar />
        </div>
      </div>
    </div>
  );
}
