"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { TaxLiveness } from "@/components/agents/tax-liveness";
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
  FileText,
  Receipt,
  Shield,
  ScrollText,
  ClipboardList,
  Calculator,
  TrendingUp,
  CalendarDays,
  Landmark,
  FileSearch,
  Gavel,
  Download,
  Globe,
  ArrowUpDown,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/badge-variants";
import { RunTaxComplianceDialog } from "./run-tax-compliance-dialog";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PipelineStep {
  id: string;
  label: string;
  agent: string;
  status: "done" | "pending" | "warning" | "skipped" | "escalated";
  description: string;
  icon: typeof CheckCircle2;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "jurisdiction_rule_registry",
    label: "Jurisdiction Rule Registry",
    agent: "Tax Agent",
    status: "pending",
    description:
      "VAT rates, PAYE bands, withholding rates, filing deadlines — versioned per country",
    icon: Globe,
  },
  {
    id: "vat_calculation",
    label: "VAT Calculation Engine",
    agent: "Tax Agent",
    status: "pending",
    description: "Input VAT (AP), output VAT (AR), net position per period",
    icon: Calculator,
  },
  {
    id: "withholding_tax",
    label: "Withholding Tax Calculation",
    agent: "Tax Agent",
    status: "pending",
    description: "On contractor payments — linked to AP and Payroll Pipeline",
    icon: ArrowUpDown,
  },
  {
    id: "paye_filing_prep",
    label: "PAYE Filing Preparation",
    agent: "Tax Agent",
    status: "pending",
    description:
      "Pulls from Payroll Pipeline — never recalculates independently",
    icon: FileText,
  },
  {
    id: "corporate_tax_package",
    label: "Corporate Tax Package Assembly",
    agent: "Compliance Agent",
    status: "pending",
    description: "Pulls from Financial Reporting Pipeline (annual)",
    icon: Landmark,
  },
  {
    id: "confidence_gate_review",
    label: "Confidence Gate & Compliance Review",
    agent: "Compliance Agent",
    status: "pending",
    description:
      "Mandatory review — not confidence-skippable — given regulatory exposure",
    icon: Shield,
  },
  {
    id: "format_export",
    label: "Local Authority Format Export",
    agent: "Tax Agent",
    status: "pending",
    description: "Pluggable exporters: GRA, FIRS, KRA, GRA-GH formats",
    icon: Download,
  },
  {
    id: "filing_deadline_calendar",
    label: "Filing Deadline Calendar & Alerts",
    agent: "Compliance Agent",
    status: "pending",
    description: "Per jurisdiction deadlines with escalating alert cadence",
    icon: CalendarDays,
  },
  {
    id: "regulatory_risk_escalation",
    label: "Regulatory Risk Escalation",
    agent: "Compliance Agent",
    status: "pending",
    description:
      "Regulatory risk always surfaces to CFO + human — never auto-resolved",
    icon: Gavel,
  },
  {
    id: "tax_rule_update_workflow",
    label: "Tax Rule Update Workflow",
    agent: "Compliance Agent",
    status: "pending",
    description:
      "Rule changes NEVER auto-apply — require explicit human sign-off",
    icon: FileSearch,
  },
  {
    id: "tax_position_summary",
    label: "Tax Position Summary & Audit",
    agent: "System",
    status: "pending",
    description: "Summary to CFO Agent + full audit trail logging",
    icon: ScrollText,
  },
];

// ─── Jurisdiction metadata ──────────────────────────────────────────────────

const JURISDICTION_INFO = [
  {
    code: "GM",
    name: "The Gambia",
    authority: "GRA",
    vatRate: "15%",
    corpTax: "27%",
    color: "emerald",
  },
  {
    code: "NG",
    name: "Nigeria",
    authority: "FIRS",
    vatRate: "7.5%",
    corpTax: "30%",
    color: "blue",
  },
  {
    code: "KE",
    name: "Kenya",
    authority: "KRA",
    vatRate: "16%",
    corpTax: "30%",
    color: "amber",
  },
  {
    code: "GH",
    name: "Ghana",
    authority: "GRA-GH",
    vatRate: "15%",
    corpTax: "25%",
    color: "purple",
  },
] as const;

// ─── TaxCompliancePage ────────────────────────────────────────────────────

export default function TaxCompliancePage() {
  const router = useRouter();
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");

  // Data fetching
  const { data: status, isLoading: statusLoading } =
    trpc.taxCompliance.getStatus.useQuery();
  const { data: vatRecords, isLoading: vatLoading } =
    trpc.taxCompliance.listVatCalculations.useQuery({ limit: 12 });
  const { data: whtRecords, isLoading: whtLoading } =
    trpc.taxCompliance.listWithholdingRecords.useQuery({ limit: 20 });
  const { data: deadlines, isLoading: deadlinesLoading } =
    trpc.taxCompliance.listFilingDeadlines.useQuery();

  // ── Derived state ────────────────────────────────────────────────────

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const latestVat = useMemo(
    () => (vatRecords && vatRecords.length > 0 ? vatRecords[0] : null),
    [vatRecords],
  );

  const vatSummary = useMemo(() => {
    if (!vatRecords || vatRecords.length === 0) return null;
    return {
      totalInput: vatRecords.reduce((s, r) => s + Number(r.inputVat), 0),
      totalOutput: vatRecords.reduce((s, r) => s + Number(r.outputVat), 0),
      totalNet: vatRecords.reduce((s, r) => s + Number(r.netPosition), 0),
      count: vatRecords.length,
    };
  }, [vatRecords]);

  const whtSummary = useMemo(() => {
    if (!whtRecords || whtRecords.length === 0) return null;
    return {
      totalWithheld: whtRecords.reduce((s, r) => s + Number(r.taxWithheld), 0),
      count: whtRecords.length,
    };
  }, [whtRecords]);

  // Filing deadlines from API or fallback to generated
  const upcomingDeadlines = useMemo(
    () => (deadlines ?? []).filter((d) => d.status === "pending").slice(0, 10),
    [deadlines],
  );
  const overdueDeadlines = useMemo(
    () => (deadlines ?? []).filter((d) => d.status === "overdue"),
    [deadlines],
  );

  // Pipeline state from status API
  const pipelineState = useMemo(():
    | "idle"
    | "in_progress"
    | "completed"
    | "escalated" => {
    if (!status) return "idle";
    if (status.overdueDeadlines.length > 0) return "escalated";
    if (status.vatSummary) return "completed";
    return "idle";
  }, [status]);

  const doneCount = useMemo(() => {
    if (pipelineState === "completed") return PIPELINE_STEPS.length;
    if (pipelineState === "in_progress")
      return Math.floor(PIPELINE_STEPS.length * 0.6);
    return 0;
  }, [pipelineState]);

  const totalSteps = PIPELINE_STEPS.length;
  const progressPct = Math.round((doneCount / totalSteps) * 100);

  const stepStatuses = useMemo((): PipelineStep[] => {
    if (pipelineState === "idle" || pipelineState === "escalated") {
      return PIPELINE_STEPS.map((s) => ({ ...s, status: "pending" as const }));
    }
    if (pipelineState === "completed") {
      return PIPELINE_STEPS.map((s) => ({ ...s, status: "done" as const }));
    }
    return PIPELINE_STEPS.map((s, i) => {
      if (i <= 4) return { ...s, status: "done" as const };
      if (i >= 8) return { ...s, status: "pending" as const };
      return { ...s, status: "warning" as const };
    });
  }, [pipelineState]);

  const handleRunComplete = useCallback(() => {
    setRunDialogOpen(false);
    router.refresh();
  }, [router]);

  // ── Loading state ────────────────────────────────────────────────────

  if (statusLoading && vatLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tax & Compliance Center" description="Loading..." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="bg-gradient-to-br from-primary/5 to-background"
            >
              <CardContent className="p-5">
                <div className="h-5 w-24 animate-pulse rounded bg-muted mb-2" />
                <div className="h-8 w-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax & Compliance Center"
        description={`${JURISDICTION_INFO.length} supported jurisdictions · Period: ${currentPeriod}`}
        action={{
          label: "Run Tax Compliance",
          icon: <PlayCircle className="mr-2 h-4 w-4" />,
          onClick: () => setRunDialogOpen(true),
        }}
      />

      <TaxLiveness />

      {/* ── Summary Stat Cards ────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* VAT Net Position */}
        <Card className="bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  VAT Net Position
                </p>
                {vatLoading ? (
                  <div className="h-7 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      latestVat && Number(latestVat.netPosition) > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {latestVat
                      ? formatCurrency(Number(latestVat.netPosition))
                      : "—"}
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpDown className="h-3 w-3" />
              <span>
                {latestVat
                  ? `${formatCurrency(Number(latestVat.outputVat))} output / ${formatCurrency(Number(latestVat.inputVat))} input`
                  : latestVat
                    ? "No VAT data"
                    : "No data yet"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Withholding Tax */}
        <Card className="bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Withholding Tax
                </p>
                {whtLoading ? (
                  <div className="h-7 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="text-2xl font-bold">
                    {whtSummary
                      ? formatCurrency(whtSummary.totalWithheld)
                      : "—"}
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
                <ArrowUpDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Receipt className="h-3 w-3" />
              <span>
                {whtSummary ? `${whtSummary.count} records` : "No records yet"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Filing Deadlines */}
        <Card className="bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Filing Deadlines
                </p>
                {deadlinesLoading ? (
                  <div className="h-7 w-20 animate-pulse rounded bg-muted" />
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl font-bold">
                      {upcomingDeadlines.length}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      upcoming
                    </span>
                    {overdueDeadlines.length > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <p className="text-lg font-bold text-red-500">
                          {overdueDeadlines.length}
                        </p>
                        <span className="text-xs text-red-500">overdue</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
                <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span>4 jurisdictions tracked</span>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Status */}
        <Card className="bg-gradient-to-br from-primary/5 to-background">
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
                      : pipelineState === "escalated"
                        ? "Attention"
                        : "Complete"}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-lg p-2.5",
                  pipelineState === "idle" && "bg-primary/10",
                  pipelineState === "in_progress" &&
                    "bg-amber-100 dark:bg-amber-900/30",
                  pipelineState === "escalated" &&
                    "bg-red-100 dark:bg-red-900/30",
                  pipelineState === "completed" &&
                    "bg-emerald-100 dark:bg-emerald-900/30",
                )}
              >
                {pipelineState === "idle" ? (
                  <PlayCircle className="h-5 w-5 text-primary" />
                ) : pipelineState === "in_progress" ? (
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                ) : pipelineState === "escalated" ? (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>
                {pipelineState === "escalated"
                  ? `${overdueDeadlines.length} issue(s) require attention`
                  : "Compliance Agent on standby"}
              </span>
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
          <TabsTrigger value="deadlines" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Filing Calendar
          </TabsTrigger>
          <TabsTrigger value="vat" className="gap-2">
            <Calculator className="h-4 w-4" />
            VAT History
          </TabsTrigger>
          <TabsTrigger value="jurisdictions" className="gap-2">
            <Globe className="h-4 w-4" />
            Jurisdictions
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
                    {currentPeriod} Tax & Compliance Pipeline
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pipelineState === "idle"
                      ? "Ready to run — click 'Run Tax Compliance' to start"
                      : pipelineState === "in_progress"
                        ? `${totalSteps - doneCount} steps remaining`
                        : pipelineState === "escalated"
                          ? `${overdueDeadlines.length} regulatory issue(s) — immediate attention required`
                          : `${doneCount}/${totalSteps} steps complete — compliance package ready`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{progressPct}%</p>
                  <p className="text-xs text-muted-foreground">
                    {doneCount}/{totalSteps} steps
                  </p>
                </div>
              </div>
              <Progress
                value={progressPct}
                className={cn(
                  "h-2.5",
                  pipelineState === "escalated" &&
                    "bg-red-100 [&>div]:bg-red-500",
                )}
              />
            </CardContent>
          </Card>

          {/* Critical Rules Banner */}
          {pipelineState === "escalated" && (
            <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Regulatory Risk Detected
                  </p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70">
                    The always-escalate rule has been triggered.{" "}
                    {overdueDeadlines.length} overdue filing(s) require
                    immediate attention.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Policy Reminders */}
          <div className="grid gap-2 sm:grid-cols-2">
            <Card className="bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/10 border-amber-200/50 dark:border-amber-900/50">
              <CardContent className="p-3 flex items-start gap-2">
                <Gavel className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Always-Escalate Rule
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Regulatory risk always surfaces to CFO + human — never
                    auto-resolved
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/10 border-blue-200/50 dark:border-blue-900/50">
              <CardContent className="p-3 flex items-start gap-2">
                <FileSearch className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    No Auto-Apply Rule
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Tax rule changes require explicit human sign-off — never
                    auto-applied
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step-by-Step Checklist */}
          <div className="grid gap-2 sm:grid-cols-2">
            {stepStatuses.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 transition-all duration-200",
                  step.status === "done" &&
                    "border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20",
                  step.status === "escalated" &&
                    "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20",
                  step.status === "warning" &&
                    "border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20",
                  step.status === "pending" && "border-border bg-card",
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {step.status === "done" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : step.status === "escalated" ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
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
                          : step.status === "escalated"
                            ? "destructive"
                            : step.status === "warning"
                              ? "outline"
                              : "secondary"
                      }
                      className={cn(
                        "text-[10px]",
                        step.status === "done" &&
                          "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                        step.status === "escalated" &&
                          "bg-red-500/20 text-red-700 dark:text-red-300",
                      )}
                    >
                      {step.status === "done"
                        ? "Completed"
                        : step.status === "escalated"
                          ? "Escalated"
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

          {/* Run CTA */}
          {pipelineState === "idle" && (
            <div className="flex justify-center pt-2">
              <Button
                size="lg"
                onClick={() => setRunDialogOpen(true)}
                className="gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <PlayCircle className="h-5 w-5" />
                Run Tax Compliance for {currentPeriod}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Filing Calendar ───────────────────────────────────── */}
        <TabsContent value="deadlines" className="space-y-4">
          {/* Overdue Deadlines */}
          {overdueDeadlines.length > 0 && (
            <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Overdue Deadlines
                </CardTitle>
                <CardDescription className="text-xs text-red-500/70">
                  These deadlines have passed. Immediate attention required
                  under the always-escalate rule.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueDeadlines.map((dl) => (
                    <div
                      key={dl.id}
                      className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-red-950/10 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{dl.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {formatDate(dl.dueDate)} · {dl.jurisdiction} ·{" "}
                          {dl.filingType}
                          {dl.estimatedAmount
                            ? ` · Est. ${formatCurrency(Number(dl.estimatedAmount))}`
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
                Upcoming Filing Deadlines
              </CardTitle>
              <CardDescription className="text-xs">
                Filing and payment deadlines by jurisdiction — escalating alerts
                as deadlines approach
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deadlinesLoading ? (
                <TableSkeleton rows={4} columns={4} />
              ) : upcomingDeadlines.length === 0 &&
                overdueDeadlines.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No deadlines yet
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Run the Tax Compliance pipeline to generate filing deadlines
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setRunDialogOpen(true)}
                    className="mt-2 gap-2"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Run Pipeline
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Deadline type legend */}
                  <div className="flex flex-wrap gap-3 mb-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />{" "}
                      VAT
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-blue-500" /> PAYE
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />{" "}
                      Withholding
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />{" "}
                      Corporate Tax
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-gray-500" />{" "}
                      Social Security
                    </span>
                  </div>

                  {upcomingDeadlines.map((dl) => {
                    const daysRemaining = Math.ceil(
                      (new Date(dl.dueDate).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24),
                    );
                    const isUrgent = daysRemaining <= 7;
                    const colorMap: Record<string, string> = {
                      vat: "bg-emerald-100 dark:bg-emerald-900/30",
                      paye: "bg-blue-100 dark:bg-blue-900/30",
                      withholding: "bg-amber-100 dark:bg-amber-900/30",
                      corporate_tax: "bg-purple-100 dark:bg-purple-900/30",
                      social_security: "bg-gray-100 dark:bg-gray-800",
                    };

                    return (
                      <div
                        key={dl.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3 transition-colors",
                          isUrgent
                            ? "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10"
                            : "hover:bg-muted/50",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 rounded-full px-2 py-1",
                              colorMap[dl.filingType] ?? "bg-muted",
                            )}
                          >
                            <span className="text-[9px] font-bold uppercase tracking-wider">
                              {dl.filingType === "corporate_tax"
                                ? "CT"
                                : dl.filingType === "social_security"
                                  ? "SS"
                                  : dl.filingType.slice(0, 3)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{dl.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Due: {formatDate(dl.dueDate)} · {dl.jurisdiction}
                              {dl.estimatedAmount
                                ? ` · Est. ${formatCurrency(Number(dl.estimatedAmount))}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-end">
                            <span
                              className={cn(
                                "text-xs font-medium",
                                isUrgent ? "text-red-500" : "",
                              )}
                            >
                              {daysRemaining > 0 ? `${daysRemaining}d` : "Due"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              remaining
                            </span>
                          </div>
                          <Badge
                            variant={isUrgent ? "destructive" : "outline"}
                            className={cn(
                              "text-[10px]",
                              !isUrgent && "text-amber-600 border-amber-300",
                            )}
                          >
                            {isUrgent ? "Urgent" : "Upcoming"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: VAT History ────────────────────────────────────────── */}
        <TabsContent value="vat" className="space-y-4">
          {/* VAT Summary Cards */}
          {vatSummary && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                  Total Output VAT
                </div>
                <p className="text-xl font-bold">
                  {formatCurrency(vatSummary.totalOutput)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Over {vatSummary.count} period(s)
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500 rotate-180" />
                  Total Input VAT
                </div>
                <p className="text-xl font-bold">
                  {formatCurrency(vatSummary.totalInput)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Claimed from purchases
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calculator className="h-3.5 w-3.5" />
                  Net Position
                </div>
                <p
                  className={cn(
                    "text-xl font-bold",
                    vatSummary.totalNet > 0
                      ? "text-amber-600"
                      : "text-emerald-600",
                  )}
                >
                  {formatCurrency(Math.abs(vatSummary.totalNet))}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {vatSummary.totalNet > 0
                    ? "Payable to authority"
                    : "Refundable"}
                </p>
              </div>
            </div>
          )}

          {/* VAT Records Table */}
          {vatLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : !vatRecords || vatRecords.length === 0 ? (
            <EmptyState
              icon={<Calculator className="h-12 w-12" />}
              title="No VAT calculations"
              description="Run the Tax Compliance pipeline to calculate VAT for this period."
              action={
                <Button
                  size="sm"
                  onClick={() => setRunDialogOpen(true)}
                  className="gap-2"
                >
                  <PlayCircle className="h-4 w-4" />
                  Run Pipeline
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
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Output VAT
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Input VAT
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Net Position
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
                  {vatRecords.map((vat) => {
                    const netPos = Number(vat.netPosition);
                    return (
                      <tr
                        key={vat.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm font-medium">
                          {vat.period}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-mono">
                          {formatCurrency(Number(vat.outputVat))}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-mono">
                          {formatCurrency(Number(vat.inputVat))}
                        </td>
                        <td
                          className={cn(
                            "py-3 px-4 text-sm text-right font-mono font-semibold",
                            netPos > 0
                              ? "text-amber-600"
                              : netPos < 0
                                ? "text-emerald-600"
                                : "",
                          )}
                        >
                          {formatCurrency(netPos)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              statusBadgeClass(vat.status),
                            )}
                          >
                            {vat.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-xs text-muted-foreground">
                          {vat.createdAt ? formatDate(vat.createdAt) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Withholding Records */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Withholding Tax Records
              </CardTitle>
              <CardDescription className="text-xs">
                Withholding tax on contractor and vendor payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {whtLoading ? (
                <TableSkeleton rows={3} columns={4} />
              ) : !whtRecords || whtRecords.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <Receipt className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No withholding records yet
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-2 px-3 text-left text-[10px] font-medium text-muted-foreground">
                          Payee
                        </th>
                        <th className="py-2 px-3 text-center text-[10px] font-medium text-muted-foreground">
                          Type
                        </th>
                        <th className="py-2 px-3 text-right text-[10px] font-medium text-muted-foreground">
                          Amount
                        </th>
                        <th className="py-2 px-3 text-right text-[10px] font-medium text-muted-foreground">
                          Rate
                        </th>
                        <th className="py-2 px-3 text-right text-[10px] font-medium text-muted-foreground">
                          Tax
                        </th>
                        <th className="py-2 px-3 text-center text-[10px] font-medium text-muted-foreground">
                          Period
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {whtRecords.map((rec) => (
                        <tr
                          key={rec.id}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-2 px-3 text-xs">
                            {rec.payeeName ?? rec.payeeId.slice(0, 8)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant="secondary" className="text-[9px]">
                              {rec.payeeType}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-xs text-right font-mono">
                            {formatCurrency(Number(rec.amount))}
                          </td>
                          <td className="py-2 px-3 text-xs text-right font-mono">
                            {(Number(rec.rate) * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-xs text-right font-mono font-semibold">
                            {formatCurrency(Number(rec.taxWithheld))}
                          </td>
                          <td className="py-2 px-3 text-xs text-center text-muted-foreground">
                            {rec.period}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Jurisdictions ────────────────────────────────────── */}
        <TabsContent value="jurisdictions" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Supported Jurisdictions
              </CardTitle>
              <CardDescription className="text-xs">
                Pluggable rule sets per jurisdiction — new jurisdiction = new
                config entry, not a code change
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {JURISDICTION_INFO.map((j) => (
                  <div
                    key={j.code}
                    className="rounded-xl border p-4 space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "rounded-full px-2.5 py-1",
                            j.color === "emerald" &&
                              "bg-emerald-100 dark:bg-emerald-900/30",
                            j.color === "blue" &&
                              "bg-blue-100 dark:bg-blue-900/30",
                            j.color === "amber" &&
                              "bg-amber-100 dark:bg-amber-900/30",
                            j.color === "purple" &&
                              "bg-purple-100 dark:bg-purple-900/30",
                          )}
                        >
                          <span className="text-xs font-bold">{j.code}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{j.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {j.authority}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-muted/30 p-2.5">
                        <p className="text-[10px] text-muted-foreground">
                          VAT Rate
                        </p>
                        <p className="text-sm font-bold">{j.vatRate}</p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-2.5">
                        <p className="text-[10px] text-muted-foreground">
                          Corporate Tax
                        </p>
                        <p className="text-sm font-bold">{j.corpTax}</p>
                      </div>
                    </div>

                    {/* Filing deadline summary for this jurisdiction */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Filing Requirements
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(() => {
                          const configs: Record<
                            string,
                            Array<{ label: string; day: number }>
                          > = {
                            GM: [
                              { label: "VAT (15th)", day: 15 },
                              { label: "PAYE (10th)", day: 10 },
                              { label: "WHT (15th/Q)", day: 15 },
                              { label: "Corp Tax (31 Mar)", day: 31 },
                              { label: "SS (15th)", day: 15 },
                            ],
                            NG: [
                              { label: "VAT (14th)", day: 14 },
                              { label: "PAYE (14th)", day: 14 },
                              { label: "WHT (21st)", day: 21 },
                              { label: "Corp Tax (31 Mar)", day: 31 },
                            ],
                            KE: [
                              { label: "VAT (20th)", day: 20 },
                              { label: "PAYE (9th)", day: 9 },
                              { label: "WHT (20th)", day: 20 },
                              { label: "Corp Tax (30 Jun)", day: 30 },
                              { label: "SS (9th)", day: 9 },
                            ],
                            GH: [
                              { label: "VAT (15th)", day: 15 },
                              { label: "PAYE (15th)", day: 15 },
                              { label: "WHT (15th/Q)", day: 15 },
                              { label: "Corp Tax (30 Apr)", day: 30 },
                              { label: "SS (15th)", day: 15 },
                            ],
                          };
                          return (configs[j.code] ?? []).map((cfg, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[9px]"
                            >
                              {cfg.label}
                            </Badge>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Rules Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Compliance Guardrails
              </CardTitle>
              <CardDescription className="text-xs">
                Critical policies enforced by the Tax & Compliance Pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/10 p-3">
                  <Gavel className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      Always-Escalate Rule
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Anything flagged as a regulatory risk escalates to CFO
                      Agent AND human immediately, regardless of confidence
                      score. This bypasses the normal confidence-gated
                      escalation logic entirely. Regulatory risk never gets
                      "auto-resolved."
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10 p-3">
                  <FileSearch className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      No Auto-Apply Rule
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tax rule changes NEVER auto-apply. The agent may propose a
                      rule-set change when it detects a law has changed, but it
                      requires explicit human review and sign-off before the new
                      rule version becomes effective. Old versions preserved for
                      any period still using them.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10 p-3">
                  <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      Mandatory Compliance Review
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Compliance Agent reviews every submission package before
                      it's marked ready. This is a mandatory review step
                      regardless of confidence score, given the regulatory
                      exposure of tax filings.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Run Tax Compliance Dialog ────────────────────────────────── */}
      <RunTaxComplianceDialog
        open={runDialogOpen}
        onOpenChange={setRunDialogOpen}
        onComplete={handleRunComplete}
        currentPeriod={currentPeriod}
      />
    </div>
  );
}
