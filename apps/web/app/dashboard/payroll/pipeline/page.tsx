"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SubPageTabs } from "@/components/shared/sub-page-tabs";
import { PayrollManagerLiveness } from "@/components/agents/payroll-manager-liveness";
import { PayrollWorkerLiveness } from "@/components/agents/payroll-worker-liveness";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Progress,
} from "@/components/ui";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  PlayCircle,
  Users,
  DollarSign,
  TrendingUp,
  CalendarDays,
  FileText,
  Receipt,
  UserCheck,
  Banknote,
  Calculator,
  Shield,
  BookOpen,
  ScrollText,
  ClipboardList,
  Download,
  Plus,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/badge-variants";
import { RunPayrollDialog } from "./run-payroll-dialog";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PipelineStep {
  id: string;
  label: string;
  agent: string;
  status: "done" | "pending" | "warning" | "skipped";
  description: string;
  icon: typeof CheckCircle2;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "staff_master_data",
    label: "Staff Master Data",
    agent: "System",
    status: "pending",
    description:
      "Load salary, allowances, bank details, jurisdiction for active staff",
    icon: Users,
  },
  {
    id: "payroll_trigger",
    label: "Payroll Run Trigger",
    agent: "Payroll Manager Agent",
    status: "pending",
    description: "Initiate payroll run via CFO Agent or scheduled trigger",
    icon: PlayCircle,
  },
  {
    id: "exception_intake",
    label: "Exception Intake",
    agent: "Payroll Worker Agent",
    status: "pending",
    description:
      "Apply new starters, leavers, salary changes, bonuses BEFORE calculation",
    icon: UserCheck,
  },
  {
    id: "gross_pay_calc",
    label: "Gross Pay Calculation",
    agent: "Payroll Worker Agent",
    status: "pending",
    description:
      "Salary + allowances + bonuses − loan deductions, per staff member",
    icon: Calculator,
  },
  {
    id: "statutory_deductions",
    label: "Statutory Deductions",
    agent: "Payroll Worker Agent",
    status: "pending",
    description: "Jurisdiction-specific PAYE and social security calculation",
    icon: Banknote,
  },
  {
    id: "contractor_withholding",
    label: "Contractor Withholding",
    agent: "Payroll Worker Agent",
    status: "pending",
    description: "Separate track: withholding tax for contractors, not PAYE",
    icon: Receipt,
  },
  {
    id: "confidence_gate",
    label: "Confidence Gate & Review",
    agent: "Payroll Manager Agent",
    status: "pending",
    description:
      "Mandatory review by Payroll Manager before any approval or posting",
    icon: Shield,
  },
  {
    id: "approval_posting",
    label: "Approval → Journal Posting",
    agent: "Controller → Ledger Agent",
    status: "pending",
    description: "Payroll Manager approves → Controller → Ledger Agent posts",
    icon: BookOpen,
  },
  {
    id: "payslip_generation",
    label: "Payslip Generation",
    agent: "System",
    status: "pending",
    description:
      "Per employee payslip, encrypted delivery, access-scoped to individual",
    icon: FileText,
  },
  {
    id: "compliance_calendar",
    label: "Compliance Calendar",
    agent: "Payroll Manager Agent",
    status: "pending",
    description: "Filing/payment deadlines per jurisdiction",
    icon: CalendarDays,
  },
  {
    id: "annual_docs",
    label: "Annual Documentation",
    agent: "System",
    status: "pending",
    description: "Year-end P60-equivalent documents per jurisdiction",
    icon: Download,
  },
  {
    id: "monthly_summary",
    label: "Monthly Summary & Audit",
    agent: "System",
    status: "pending",
    description: "Summary to CFO Agent + full audit trail logging",
    icon: ScrollText,
  },
];

// ─── PayrollPipelinePage ────────────────────────────────────────────────────

export default function PayrollPipelinePage() {
  const router = useRouter();
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");

  // Data fetching
  const { data: employees, isLoading: employeesLoading } =
    trpc.payroll.listEmployees.useQuery();
  const { data: runs, isLoading: runsLoading } =
    trpc.payroll.listPayrollRuns.useQuery();
  const { data: pipelineStatus } =
    trpc.payroll.getPayrollPipelineStatus.useQuery();

  // Compute derived data
  const activeEmployees = useMemo(
    () => (employees ?? []).filter((e) => e.isActive),
    [employees],
  );
  const contractorCount = useMemo(
    () =>
      activeEmployees.filter((e) => e.employmentType === "contractor").length,
    [activeEmployees],
  );

  const latestRun = useMemo(
    () => (runs && runs.length > 0 ? runs[0] : null),
    [runs],
  );
  const validatedRuns = useMemo(
    () =>
      (runs ?? []).filter(
        (r) =>
          r.status === "validated" ||
          r.status === "approved" ||
          r.status === "paid" ||
          r.status === "closed",
      ),
    [runs],
  );

  const totalGrossPay = useMemo(
    () => validatedRuns.reduce((s, r) => s + Number(r.grossPay), 0),
    [validatedRuns],
  );
  const totalNetPay = useMemo(
    () => validatedRuns.reduce((s, r) => s + Number(r.netPay), 0),
    [validatedRuns],
  );

  // Current period
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // Determine pipeline status based on latest run
  const pipelineState = useMemo(() => {
    if (!latestRun) return "idle";
    if (latestRun.status === "draft") return "in_progress";
    if (latestRun.status === "validated") return "completed";
    if (latestRun.status === "approved") return "completed";
    if (latestRun.status === "paid") return "completed";
    if (latestRun.status === "closed") return "completed";
    return "idle";
  }, [latestRun]);

  // Step statuses derived from latest run
  const stepStatuses = useMemo((): PipelineStep[] => {
    if (pipelineState === "idle") {
      return PIPELINE_STEPS.map((s) => ({ ...s, status: "pending" as const }));
    }
    if (pipelineState === "completed") {
      return PIPELINE_STEPS.map((s) => ({ ...s, status: "done" as const }));
    }
    // In progress — mark first ~7 as done, rest as pending
    return PIPELINE_STEPS.map((s, i) => {
      if (i <= 5) return { ...s, status: "done" as const };
      if (i >= 8) return { ...s, status: "pending" as const };
      return { ...s, status: "warning" as const };
    });
  }, [pipelineState]);

  const doneCount = stepStatuses.filter((s) => s.status === "done").length;
  const totalSteps = stepStatuses.length;
  const progressPct = Math.round((doneCount / totalSteps) * 100);

  // Derive active jurisdictions from employees
  const activeJurisdictions = useMemo(() => {
    const jurSet = new Set<string>();
    for (const emp of activeEmployees) {
      const meta = emp.metadata as Record<string, unknown> | null;
      if (meta?.jurisdiction) jurSet.add(String(meta.jurisdiction));
    }
    if (jurSet.size === 0) jurSet.add("GM");
    return Array.from(jurSet) as Array<"GM" | "NG" | "KE" | "GH">;
  }, [activeEmployees]);

  // Compliance deadlines derived from actual employee jurisdictions
  const JURISDICTION_CONFIG: Record<
    string,
    Array<{
      deadlineType: "filing" | "payment" | "return";
      name: string;
      day: number;
      multiplier?: number;
    }>
  > = {
    GM: [
      {
        deadlineType: "filing",
        name: "GRA PAYE Filing — Monthly Return",
        day: 10,
        multiplier: 0.15,
      },
      {
        deadlineType: "payment",
        name: "SSHFC Contributions — Monthly Remittance",
        day: 15,
        multiplier: 0.05,
      },
    ],
    NG: [
      {
        deadlineType: "filing",
        name: "FIRS PAYE Filing — Monthly Schedule",
        day: 14,
        multiplier: 0.1,
      },
    ],
    KE: [
      {
        deadlineType: "filing",
        name: "KRA PAYE Filing — Monthly Return",
        day: 9,
        multiplier: 0.15,
      },
    ],
    GH: [
      {
        deadlineType: "filing",
        name: "GRA-GH PAYE Filing — Monthly Return",
        day: 15,
        multiplier: 0.1,
      },
    ],
  };

  const complianceDeadlines = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const deadlines: Array<{
      jurisdiction: string;
      deadlineType: "filing" | "payment" | "return";
      name: string;
      dueDate: string;
      amount?: number;
      status: "overdue" | "upcoming";
    }> = [];

    for (const jur of activeJurisdictions) {
      const configs = JURISDICTION_CONFIG[jur] ?? [];
      for (const cfg of configs) {
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const year = currentMonth === 12 ? currentYear + 1 : currentYear;
        const dueDate = `${year}-${String(nextMonth).padStart(2, "0")}-${String(cfg.day).padStart(2, "0")}`;
        deadlines.push({
          jurisdiction: jur,
          deadlineType: cfg.deadlineType,
          name: cfg.name,
          dueDate,
          amount:
            cfg.multiplier && latestRun
              ? Number(latestRun.grossPay) * cfg.multiplier
              : undefined,
          status: (new Date(dueDate) < now ? "overdue" : "upcoming") as
            | "overdue"
            | "upcoming",
        });
      }
    }

    return deadlines;
  }, [activeJurisdictions, latestRun]);

  const upcomingDeadlines = complianceDeadlines.filter(
    (d) => d.status === "upcoming",
  );
  const overdueDeadlines = complianceDeadlines.filter(
    (d) => d.status === "overdue",
  );

  const handleRunComplete = useCallback(() => {
    setRunDialogOpen(false);
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Center"
        description={`${activeEmployees.length} active employees · ${contractorCount} contractors · Period: ${currentPeriod}`}
        action={{
          label: "Run Payroll",
          icon: <PlayCircle className="mr-2 h-4 w-4" />,
          onClick: () => setRunDialogOpen(true),
        }}
      />

      <SubPageTabs
        tabs={[
          { label: "Payroll", href: "/dashboard/payroll/pipeline" },
          { label: "Expenses", href: "/dashboard/expense/pipeline" },
        ]}
      />

      <PayrollManagerLiveness />
      <PayrollWorkerLiveness />

      {/* ── Summary Stat Cards ────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Active Employees
                </p>
                {employeesLoading ? (
                  <div className="h-7 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="text-2xl font-bold">{activeEmployees.length}</p>
                )}
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <UserCheck className="h-3 w-3" />
              <span>{contractorCount} contractors</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Total Gross Pay
                </p>
                {runsLoading ? (
                  <div className="h-7 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="text-2xl font-bold">
                    {formatCurrency(totalGrossPay)}
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>{validatedRuns.length} validated runs</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Total Net Pay
                </p>
                {runsLoading ? (
                  <div className="h-7 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="text-2xl font-bold">
                    {formatCurrency(totalNetPay)}
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
                <Banknote className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Calculator className="h-3 w-3" />
              <span>
                {totalGrossPay > 0
                  ? `${Math.round(((totalGrossPay - totalNetPay) / totalGrossPay) * 100)}% avg deduction rate`
                  : "No runs yet"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Pipeline Status
                </p>
                <p className="text-2xl font-bold capitalize">
                  {pipelineState === "idle"
                    ? "Ready"
                    : pipelineState === "in_progress"
                      ? "Running"
                      : "Complete"}
                </p>
              </div>
              <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
                {pipelineState === "idle" ? (
                  <PlayCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                ) : pipelineState === "in_progress" ? (
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              <span>{currentPeriod}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Tabs ─────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pipeline" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Pipeline Progress
          </TabsTrigger>
          <TabsTrigger value="runs" className="gap-2">
            <Receipt className="h-4 w-4" />
            Payroll Runs
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Compliance Calendar
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-4 w-4" />
            Employee Breakdown
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Pipeline Progress ────────────────────────────────── */}
        <TabsContent value="pipeline" className="space-y-6">
          {/* Progress Card */}
          <Card className="bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold">
                    {currentPeriod} Payroll Pipeline
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pipelineState === "idle"
                      ? "Ready to run payroll — click 'Run Payroll' to start"
                      : pipelineState === "in_progress"
                        ? `${totalSteps - doneCount} steps remaining`
                        : `${doneCount}/${totalSteps} steps complete — all agents confirmed`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{progressPct}%</p>
                  <p className="text-xs text-muted-foreground">
                    {doneCount}/{totalSteps} steps
                  </p>
                </div>
              </div>
              <Progress value={progressPct} className="h-2.5" />
            </CardContent>
          </Card>

          {/* Step-by-Step Checklist */}
          <div className="grid gap-2 sm:grid-cols-2">
            {stepStatuses.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 transition-all duration-200",
                  step.status === "done" &&
                    "border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20",
                  step.status === "warning" &&
                    "border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20",
                  step.status === "pending" && "border-border bg-card",
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {step.status === "done" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : step.status === "warning" ? (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/30">
                      <step.icon className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{step.label}</p>
                    <Badge
                      variant={
                        step.status === "done"
                          ? "default"
                          : step.status === "warning"
                            ? "outline"
                            : "secondary"
                      }
                      className={cn(
                        "text-[10px]",
                        step.status === "done" &&
                          "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                      )}
                    >
                      {step.status === "done"
                        ? "Completed"
                        : step.status === "warning"
                          ? "In Progress"
                          : "Pending"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-medium">{step.agent}</span> —{" "}
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Run Payroll CTA */}
          {pipelineState === "idle" && (
            <div className="flex justify-center pt-2">
              <Button
                size="lg"
                onClick={() => setRunDialogOpen(true)}
                className="gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <PlayCircle className="h-5 w-5" />
                Run Payroll for {currentPeriod}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Payroll Runs ──────────────────────────────────────── */}
        <TabsContent value="runs" className="space-y-4">
          {runsLoading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : !runs || runs.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-12 w-12" />}
              title="No payroll runs"
              description="Run your first payroll to see processed runs here."
              action={
                <Button
                  size="sm"
                  onClick={() => setRunDialogOpen(true)}
                  className="gap-2"
                >
                  <PlayCircle className="h-4 w-4" />
                  Run Payroll
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Period
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Employees
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Gross Pay
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Deductions
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Net Pay
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Journal
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(`/dashboard/payroll/runs/${run.id}`)
                      }
                    >
                      <td className="py-3 px-4 text-sm font-medium">
                        {run.period}
                      </td>
                      <td className="py-3 px-4 text-sm text-center">
                        {run.employeeCount}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(Number(run.grossPay))}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(Number(run.totalDeductions))}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono font-semibold">
                        {formatCurrency(Number(run.netPay))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {run.journalEntryId ? (
                          <Badge
                            variant="outline"
                            className="text-emerald-600 border-emerald-300 text-[10px]"
                          >
                            Posted
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            statusBadgeClass(run.status),
                          )}
                        >
                          {run.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-muted-foreground">
                        {run.createdAt ? formatDate(run.createdAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Compliance Calendar ───────────────────────────────── */}
        <TabsContent value="compliance" className="space-y-4">
          {/* Overdue Deadlines */}
          {overdueDeadlines.length > 0 && (
            <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Overdue Deadlines
                </CardTitle>
                <CardDescription className="text-xs text-red-500/70">
                  These deadlines have passed. Immediate attention required.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueDeadlines.map((dl, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-red-950/10 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{dl.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {formatDate(dl.dueDate)} · {dl.jurisdiction}
                          {dl.amount
                            ? ` · Est. ${formatCurrency(dl.amount)}`
                            : ""}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-red-600 border-red-300 text-[10px]"
                      >
                        Overdue
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Upcoming Compliance Deadlines
              </CardTitle>
              <CardDescription className="text-xs">
                Filing and payment deadlines by jurisdiction for {currentPeriod}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingDeadlines.length === 0 &&
              overdueDeadlines.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No compliance deadlines active
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingDeadlines.map((dl, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 rounded-full p-1.5",
                            dl.jurisdiction === "GM"
                              ? "bg-emerald-100 dark:bg-emerald-900/30"
                              : dl.jurisdiction === "NG"
                                ? "bg-blue-100 dark:bg-blue-900/30"
                                : dl.jurisdiction === "KE"
                                  ? "bg-amber-100 dark:bg-amber-900/30"
                                  : "bg-purple-100 dark:bg-purple-900/30",
                          )}
                        >
                          <span className="text-[10px] font-bold uppercase">
                            {dl.jurisdiction}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{dl.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {formatDate(dl.dueDate)} ·{" "}
                            {dl.deadlineType === "filing"
                              ? "Filing"
                              : dl.deadlineType === "payment"
                                ? "Payment"
                                : "Return"}
                            {dl.amount
                              ? ` · Est. ${formatCurrency(dl.amount)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-medium">
                            {Math.ceil(
                              (new Date(dl.dueDate).getTime() - Date.now()) /
                                (1000 * 60 * 60 * 24),
                            )}{" "}
                            days
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            remaining
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-amber-600 border-amber-300 text-[10px]"
                        >
                          Upcoming
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Jurisdiction Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Supported Jurisdictions
              </CardTitle>
              <CardDescription className="text-xs">
                Pluggable rule sets — new jurisdiction = new config entry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    code: "GM",
                    name: "The Gambia",
                    authority: "GRA (Gambia Revenue Authority)",
                    ss: "SSHFC (5% EE / 10% ER)",
                    payeBands: "5 bands, 0-30%",
                  },
                  {
                    code: "NG",
                    name: "Nigeria",
                    authority: "FIRS (Federal Inland Revenue Service)",
                    ss: "NSITF/NHF (2.5% EE / 2.5% ER)",
                    payeBands: "6 bands, 0-24%",
                  },
                  {
                    code: "KE",
                    name: "Kenya",
                    authority: "KRA (Kenya Revenue Authority)",
                    ss: "NSSF (6% EE / 6% ER)",
                    payeBands: "6 bands, 0-30%",
                  },
                  {
                    code: "GH",
                    name: "Ghana",
                    authority: "GRA (Ghana Revenue Authority)",
                    ss: "SSNIT (5.5% EE / 13% ER)",
                    payeBands: "6 bands, 0-30%",
                  },
                ].map((j) => (
                  <div
                    key={j.code}
                    className="rounded-lg border p-3 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold"
                      >
                        {j.code}
                      </Badge>
                      <span className="text-sm font-medium">{j.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {j.authority}
                    </p>
                    <div className="space-y-0.5 text-[11px] text-muted-foreground">
                      <p>PAYE: {j.payeBands}</p>
                      <p>Social Security: {j.ss}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Employee Breakdown ──────────────────────────────── */}
        <TabsContent value="employees" className="space-y-4">
          {employeesLoading ? (
            <TableSkeleton rows={8} columns={7} />
          ) : activeEmployees.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="No active employees"
              description="Add employees to see payroll breakdown."
              action={
                <Button
                  size="sm"
                  onClick={() => router.push("/dashboard/payroll")}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Employee
                </Button>
              }
            />
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Active</p>
                  <p className="text-xl font-bold">{activeEmployees.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Full-Time</p>
                  <p className="text-xl font-bold">
                    {
                      activeEmployees.filter(
                        (e) => e.employmentType === "full_time",
                      ).length
                    }
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Contractors</p>
                  <p className="text-xl font-bold">{contractorCount}</p>
                </div>
              </div>

              {/* Employee table */}
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                        Name
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                        Department
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                        Jurisdiction
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                        Bank
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
                    {activeEmployees.map((emp) => (
                      <tr
                        key={emp.id}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() =>
                          router.push(`/dashboard/payroll/employees/${emp.id}`)
                        }
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">
                              #{emp.employeeNumber}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {emp.department ?? "—"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className="text-[10px]">
                            {emp.employmentType === "full_time"
                              ? "FT"
                              : emp.employmentType === "part_time"
                                ? "PT"
                                : emp.employmentType === "contractor"
                                  ? "CTR"
                                  : "INT"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px]">
                            {((emp.metadata as Record<string, unknown> | null)
                              ?.jurisdiction as string) ?? "GM"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {emp.bankName ? `${emp.bankName}` : "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              statusBadgeClass(
                                emp.isActive ? "active" : "inactive",
                              ),
                            )}
                          >
                            {emp.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/dashboard/payroll/employees/${emp.id}`,
                              );
                            }}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Run Payroll Dialog ───────────────────────────────────────── */}
      <RunPayrollDialog
        open={runDialogOpen}
        onOpenChange={setRunDialogOpen}
        onComplete={handleRunComplete}
        currentPeriod={currentPeriod}
      />
    </div>
  );
}
