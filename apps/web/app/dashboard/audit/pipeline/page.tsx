"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { AuditLiveness } from "@/components/agents/audit-liveness";
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
} from "@/components/ui";
import {
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Shield,
  ScrollText,
  ClipboardList,
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Gavel,
  Eye,
  MessageSquare,
  Download,
  Fingerprint,
  AlertTriangle,
  BarChart3,
  ArrowUpDown,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { RunAuditDialog } from "./run-audit-dialog";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PipelineStep {
  id: string;
  label: string;
  agent: string;
  status: "done" | "pending" | "warning" | "escalated" | "active";
  description: string;
  icon: typeof Shield;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "continuous_sampling",
    label: "Continuous Sampling Engine",
    agent: "Audit Agent",
    status: "active",
    description:
      "Sampling transactions across entities and agents on a rolling basis",
    icon: Search,
  },
  {
    id: "golden_dataset_comparison",
    label: "Golden Dataset Comparison",
    agent: "Audit Agent",
    status: "active",
    description:
      "Comparing agent decisions against verified-correct accounting scenarios",
    icon: BarChart3,
  },
  {
    id: "independent_recomputation",
    label: "Independent Ledger Recomputation",
    agent: "Audit Agent",
    status: "active",
    description: "Recomputed using own logic path — never reuses agent code",
    icon: Fingerprint,
  },
  {
    id: "anomaly_detection",
    label: "Anomaly & Suspicious Pattern Detection",
    agent: "Audit Agent / Analytics Agent",
    status: "active",
    description: "Flagging inconsistencies — coordinates with Analytics Agent",
    icon: AlertTriangle,
  },
  {
    id: "regression_gate",
    label: "Regression Gate Before Deployment",
    agent: "Audit Agent",
    status: "active",
    description:
      "Agent logic changes must pass golden dataset tests (CI/CD gate)",
    icon: Shield,
  },
  {
    id: "confidence_escalation",
    label: "Confidence Gate & Compliance Escalation",
    agent: "Audit Agent / Compliance Agent",
    status: "active",
    description: "Drift/anomaly above threshold escalates immediately",
    icon: Gavel,
  },
  {
    id: "audit_package_assembly",
    label: "Audit Package Assembly",
    agent: "Audit Agent",
    status: "active",
    description: "Schedules, vouchers, comparisons — compiled on demand",
    icon: Download,
  },
  {
    id: "auditor_portal",
    label: "External Auditor Portal",
    agent: "Audit Agent",
    status: "active",
    description: "Read-only, period-locked — zero exceptions",
    icon: Eye,
  },
  {
    id: "auditor_query_flow",
    label: "Auditor Query Response Flow",
    agent: "Audit Agent",
    status: "active",
    description: "Questions → evidence retrieval → response logged",
    icon: MessageSquare,
  },
  {
    id: "meta_audit_trail",
    label: "Meta Audit Trail Logging",
    agent: "Audit Agent",
    status: "active",
    description: "Audit Agent's own actions logged with same rigor",
    icon: ScrollText,
  },
];

// ─── Agent color map for drift scores ──────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  controller: "bg-blue-500",
  treasury: "bg-emerald-500",
  payroll_manager: "bg-purple-500",
  compliance: "bg-amber-500",
  ledger: "bg-cyan-500",
  ap: "bg-rose-500",
  ar: "bg-indigo-500",
  asset: "bg-orange-500",
  inventory: "bg-teal-500",
  reconciliation: "bg-pink-500",
  cash: "bg-lime-500",
  mobile_money: "bg-violet-500",
  payroll_worker: "bg-sky-500",
};

const AGENT_LABELS: Record<string, string> = {
  controller: "Controller",
  treasury: "Treasury",
  payroll_manager: "Payroll Mgr",
  compliance: "Compliance",
  ledger: "Ledger",
  ap: "AP",
  ar: "AR",
  asset: "Assets",
  inventory: "Inventory",
  reconciliation: "Recon",
  cash: "Cash",
  mobile_money: "Mobile Money",
  payroll_worker: "Payroll Worker",
};

// ─── AuditDashboardPage ─────────────────────────────────────────────────────

export default function AuditDashboardPage() {
  const router = useRouter();
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Data fetching
  const { data: status, isLoading: statusLoading } =
    trpc.auditPipeline.getStatus.useQuery();
  const { data: samples, isLoading: samplesLoading } =
    trpc.auditPipeline.listSamples.useQuery({ limit: 25 });
  const { data: driftScores } = trpc.auditPipeline.listDriftScores.useQuery();

  // ── Derived state ────────────────────────────────────────────────────

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // Pipeline status
  const pipelineState = useMemo((): "active" | "escalated" | "idle" => {
    if (!status) return "active"; // Audit always runs
    if (status.escalated) return "escalated";
    return "active";
  }, [status]);

  const stepStatuses = useMemo((): PipelineStep[] => {
    if (pipelineState === "escalated") {
      return PIPELINE_STEPS.map((s) => {
        if (s.id === "confidence_escalation" || s.id === "anomaly_detection") {
          return { ...s, status: "escalated" as const };
        }
        return { ...s, status: "active" as const };
      });
    }
    return PIPELINE_STEPS.map((s) => ({ ...s, status: "active" as const }));
  }, [pipelineState]);

  // Drift scores data
  const driftItems = useMemo(() => {
    return (driftScores ?? []).slice(0, 15).map((d) => ({
      agentId: d.agentId,
      score: Number(d.score),
      trend: d.trend as string,
      sampleSize: Number(d.sampleSize),
    }));
  }, [driftScores]);

  const avgDriftScore = useMemo(() => {
    if (driftItems.length === 0) return 1.0;
    return driftItems.reduce((s, d) => s + d.score, 0) / driftItems.length;
  }, [driftItems]);

  const agentsChecked = useMemo(() => {
    if (!status) return [];
    return status.agentsChecked ?? [];
  }, [status]);

  // Anomaly detection
  const anomalies = useMemo(() => {
    const items: Array<{
      id: string;
      type: string;
      severity: string;
      description: string;
      detectedAt: string;
    }> = [];

    // Derive from drift scores
    for (const d of driftItems) {
      if (d.score < 0.7) {
        items.push({
          id: `drift-${d.agentId}`,
          type: "Drift",
          severity: d.score < 0.5 ? "critical" : "high",
          description: `Agent ${AGENT_LABELS[d.agentId] ?? d.agentId} drift score ${(d.score * 100).toFixed(0)}% (${d.trend})`,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Derive from status discrepancies
    if (status && status.discrepanciesFound > 0) {
      items.push({
        id: "discrepancies",
        type: "Computation",
        severity: status.discrepanciesFound > 5 ? "critical" : "medium",
        description: `${status.discrepanciesFound} independent recomputation mismatch(es) found across ${agentsChecked.length} agent(s)`,
        detectedAt: new Date().toISOString(),
      });
    }

    return items.sort((a, b) => {
      const sev = { critical: 0, high: 1, medium: 2, low: 3 };
      return (
        (sev[a.severity as keyof typeof sev] ?? 3) -
        (sev[b.severity as keyof typeof sev] ?? 3)
      );
    });
  }, [driftItems, status, agentsChecked]);

  const handleRunComplete = useCallback(() => {
    setRunDialogOpen(false);
    router.refresh();
  }, [router]);

  // ── Loading state ────────────────────────────────────────────────────

  if (statusLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Audit Center"
          description="Continuous independent audit — 24/7"
        />
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
        title="Audit Center"
        description={`Continuous independent audit · ${agentsChecked.length} agents monitored · ${status?.samplesCollected ?? 0} samples`}
        action={{
          label: "Run Audit Cycle",
          icon: <PlayCircle className="mr-2 h-4 w-4" />,
          onClick: () => setRunDialogOpen(true),
        }}
      />

      <AuditLiveness />

      {/* ── Summary Stat Cards ────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Overall Drift Score */}
        <Card className="bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Avg Drift Score
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    avgDriftScore >= 0.9
                      ? "text-emerald-600"
                      : avgDriftScore >= 0.7
                        ? "text-amber-600"
                        : "text-red-600",
                  )}
                >
                  {(avgDriftScore * 100).toFixed(0)}%
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Activity className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              <span>{driftItems.length} agent(s) scored</span>
            </div>
          </CardContent>
        </Card>

        {/* Samples */}
        <Card className="bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Samples Collected
                </p>
                <p className="text-2xl font-bold">
                  {status?.samplesCollected ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
                <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle
                className={cn(
                  "h-3 w-3",
                  (status?.discrepanciesFound ?? 0) > 0
                    ? "text-red-500"
                    : "text-emerald-500",
                )}
              />
              <span>
                {(status?.discrepanciesFound ?? 0) > 0
                  ? `${status?.discrepanciesFound} discrepancy(ies) found`
                  : "All verified"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Anomalies */}
        <Card className="bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Anomalies
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold">{anomalies.length}</p>
                  {anomalies.filter((a) => a.severity === "critical").length >
                    0 && (
                    <p className="text-lg font-bold text-red-500">
                      (
                      {
                        anomalies.filter((a) => a.severity === "critical")
                          .length
                      }{" "}
                      critical)
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{agentsChecked.length} agents monitored</span>
            </div>
          </CardContent>
        </Card>

        {/* Portal Sessions */}
        <Card className="bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Portal Sessions
                </p>
                <p className="text-2xl font-bold">
                  {status?.activePortalSessions ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/30">
                <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>{status?.openQueries ?? 0} open query(ies)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Tabs ─────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="drift" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Drift Scores
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Anomalies {anomalies.length > 0 && `(${anomalies.length})`}
          </TabsTrigger>
          <TabsTrigger value="portal" className="gap-2">
            <Eye className="h-4 w-4" />
            Auditor Portal
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Overview ──────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Continuous Status Banner */}
          <Card className="bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background border-primary/20">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2">
                  <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    Audit Running — Continuous
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pipelineState === "escalated"
                      ? `${anomalies.length} issue(s) flagged — ${status?.escalationReason ?? "see anomalies tab"}`
                      : `All systems nominal · ${driftItems.length} agents scoring · ${status?.samplesCollected ?? 0} total samples`}
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  pipelineState === "escalated" ? "destructive" : "default"
                }
                className={cn(
                  "text-[10px]",
                  pipelineState !== "escalated" &&
                    "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                )}
              >
                {pipelineState === "escalated" ? "Escalated" : "Active"}
              </Badge>
            </CardContent>
          </Card>

          {/* Key Guardrails */}
          <div className="grid gap-2 sm:grid-cols-3">
            <Card className="bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/10 border-blue-200/50 dark:border-blue-900/50">
              <CardContent className="p-3 flex items-start gap-2">
                <Fingerprint className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    Independent
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Never reuses agent computation paths
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50/50 to-background dark:from-purple-950/10 border-purple-200/50 dark:border-purple-900/50">
              <CardContent className="p-3 flex items-start gap-2">
                <Eye className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                    Read-Only Portal
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Period-locked, zero exceptions
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/10 border-amber-200/50 dark:border-amber-900/50">
              <CardContent className="p-3 flex items-start gap-2">
                <ScrollText className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Meta Audit
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Every action logged with same rigor
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Drift Score Mini Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Agent Drift Scores
              </CardTitle>
              <CardDescription className="text-xs">
                Per-agent accuracy vs golden dataset — higher is better. Hover
                for details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {driftItems.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No drift scores yet
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Run an audit cycle to generate scores
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {driftItems.map((d) => {
                    const pct = Math.round(d.score * 100);
                    const colorClass =
                      d.score >= 0.9
                        ? "bg-emerald-500"
                        : d.score >= 0.7
                          ? "bg-amber-500"
                          : "bg-red-500";
                    return (
                      <div key={d.agentId} className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-24 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-white text-center truncate",
                            AGENT_COLORS[d.agentId] ?? "bg-gray-500",
                          )}
                        >
                          {AGENT_LABELS[d.agentId] ?? d.agentId}
                        </div>
                        <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              colorClass,
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="w-16 text-right shrink-0">
                          <span
                            className={cn(
                              "text-xs font-mono font-semibold",
                              d.score >= 0.9
                                ? "text-emerald-600"
                                : d.score >= 0.7
                                  ? "text-amber-600"
                                  : "text-red-600",
                            )}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="w-14 shrink-0">
                          {d.trend === "improving" ? (
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          ) : d.trend === "declining" ? (
                            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                          ) : d.trend === "critical" ? (
                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Steps Pipeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Audit Pipeline — 10 Steps (Continuous)
              </CardTitle>
              <CardDescription className="text-xs">
                All steps run continuously — never stop. Each sample passes
                through every gate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {stepStatuses.map((step) => (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 transition-all duration-200",
                      step.status === "escalated" &&
                        "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20",
                      step.status === "active" &&
                        "border-emerald-200/50 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10",
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {step.status === "escalated" ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{step.label}</p>
                        <Badge
                          variant={
                            step.status === "escalated"
                              ? "destructive"
                              : "default"
                          }
                          className={cn(
                            "text-[10px]",
                            step.status === "active" &&
                              "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                          )}
                        >
                          {step.status === "escalated" ? "Escalated" : "Active"}
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
            </CardContent>
          </Card>

          {/* Run Audit CTA */}
          <div className="flex justify-center pt-2">
            <Button
              size="lg"
              onClick={() => setRunDialogOpen(true)}
              className="gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <PlayCircle className="h-5 w-5" />
              Run Audit Cycle
            </Button>
          </div>
        </TabsContent>

        {/* ── Tab: Drift Scores ───────────────────────────────────────── */}
        <TabsContent value="drift" className="space-y-4">
          {/* Summary */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Average Drift Score
              </p>
              <p
                className={cn(
                  "text-xl font-bold",
                  avgDriftScore >= 0.9
                    ? "text-emerald-600"
                    : avgDriftScore >= 0.7
                      ? "text-amber-600"
                      : "text-red-600",
                )}
              >
                {(avgDriftScore * 100).toFixed(0)}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {avgDriftScore * 100 >= 90
                  ? "Excellent"
                  : avgDriftScore * 100 >= 70
                    ? "Acceptable"
                    : "Needs attention"}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Agents Scored
              </p>
              <p className="text-xl font-bold">{driftItems.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Independence Verified
              </p>
              <p className="text-xl font-bold text-emerald-600">Always</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Own computation path per agent
              </p>
            </div>
          </div>

          {/* Full Drift Scores Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Agent Drift Scores — Detailed
              </CardTitle>
              <CardDescription className="text-xs">
                Per-agent accuracy scores from golden dataset comparison. Score
                = ratio of matching scenarios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {driftItems.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="h-12 w-12" />}
                  title="No drift scores"
                  description="Run an audit cycle to generate drift scores across all agents."
                  action={
                    <Button
                      size="sm"
                      onClick={() => setRunDialogOpen(true)}
                      className="gap-2"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Run Audit
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                          Agent
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                          Score
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                          Trend
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                          Samples
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                          Visual
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {driftItems.map((d) => {
                        const pct = Math.round(d.score * 100);
                        return (
                          <tr
                            key={d.agentId}
                            className="border-b hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "w-2 h-2 rounded-full",
                                    AGENT_COLORS[d.agentId] ?? "bg-gray-500",
                                  )}
                                />
                                <span className="text-sm font-medium">
                                  {AGENT_LABELS[d.agentId] ?? d.agentId}
                                </span>
                              </div>
                            </td>
                            <td
                              className={cn(
                                "py-3 px-4 text-right text-sm font-mono font-semibold",
                                d.score >= 0.9
                                  ? "text-emerald-600"
                                  : d.score >= 0.7
                                    ? "text-amber-600"
                                    : "text-red-600",
                              )}
                            >
                              {pct}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge
                                variant={
                                  d.trend === "improving"
                                    ? "default"
                                    : d.trend === "stable"
                                      ? "secondary"
                                      : d.trend === "declining"
                                        ? "outline"
                                        : "destructive"
                                }
                                className={cn(
                                  "text-[10px]",
                                  d.trend === "improving" &&
                                    "bg-emerald-500/20 text-emerald-700",
                                  d.trend === "stable" &&
                                    "bg-blue-500/20 text-blue-700",
                                )}
                              >
                                {d.trend === "improving"
                                  ? "Improving"
                                  : d.trend === "stable"
                                    ? "Stable"
                                    : d.trend === "declining"
                                      ? "Declining"
                                      : "Critical"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right text-sm text-muted-foreground">
                              {d.sampleSize}
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-3 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    d.score >= 0.9
                                      ? "bg-emerald-500"
                                      : d.score >= 0.7
                                        ? "bg-amber-500"
                                        : "bg-red-500",
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Anomalies ──────────────────────────────────────────── */}
        <TabsContent value="anomalies" className="space-y-4">
          {anomalies.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-12 w-12 text-emerald-500" />}
              title="No Anomalies Detected"
              description="All agents are performing within expected parameters. The independent audit recomputation confirms accuracy across all sampled transactions."
              action={
                <Button
                  size="sm"
                  onClick={() => setRunDialogOpen(true)}
                  className="gap-2"
                >
                  <PlayCircle className="h-4 w-4" />
                  Run Audit
                </Button>
              }
            />
          ) : (
            <>
              {/* Critical banner */}
              {anomalies.filter(
                (a) => a.severity === "critical" || a.severity === "high",
              ).length > 0 && (
                <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        {
                          anomalies.filter((a) => a.severity === "critical")
                            .length
                        }{" "}
                        Critical Anomaly(ies)
                      </p>
                      <p className="text-xs text-red-600/70 dark:text-red-400/70">
                        The confidence gate has flagged issues requiring
                        immediate attention. Escalated to Compliance Agent.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Anomaly List */}
              <div className="space-y-2">
                {anomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-4",
                      anomaly.severity === "critical" &&
                        "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10",
                      anomaly.severity === "high" &&
                        "border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10",
                      anomaly.severity === "medium" &&
                        "border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/10",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 rounded-full p-1.5",
                          anomaly.severity === "critical" &&
                            "bg-red-100 dark:bg-red-900/30",
                          anomaly.severity === "high" &&
                            "bg-amber-100 dark:bg-amber-900/30",
                          anomaly.severity === "medium" &&
                            "bg-blue-100 dark:bg-blue-900/30",
                          anomaly.severity === "low" &&
                            "bg-gray-100 dark:bg-gray-800",
                        )}
                      >
                        {anomaly.severity === "critical" ||
                        anomaly.severity === "high" ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : anomaly.severity === "medium" ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {anomaly.description}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Type: {anomaly.type} · Detected:{" "}
                          {formatDate(anomaly.detectedAt)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        anomaly.severity === "critical"
                          ? "destructive"
                          : anomaly.severity === "high"
                            ? "outline"
                            : anomaly.severity === "medium"
                              ? "secondary"
                              : "default"
                      }
                      className={cn(
                        "text-[10px]",
                        anomaly.severity === "high" &&
                          "text-amber-600 border-amber-300",
                      )}
                    >
                      {anomaly.severity.charAt(0).toUpperCase() +
                        anomaly.severity.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Independence Notice */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-950/10 p-3 flex items-start gap-2">
            <Fingerprint className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Independent Verification Active
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                All flagged anomalies were detected using the Audit Agent's own
                computation path, independent of the originating agent's logic.
                The Analytics Agent is also monitoring for pattern/trend-level
                fraud signals — no duplicate alerting occurs.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Auditor Portal ────────────────────────────────────── */}
        <TabsContent value="portal" className="space-y-4">
          {/* Portal Status */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Active Sessions
              </p>
              <p className="text-xl font-bold">
                {status?.activePortalSessions ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Read-only, period-locked
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">Open Queries</p>
              <p className="text-xl font-bold">{status?.openQueries ?? 0}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Awaiting evidence response
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Audit Packages
              </p>
              <p className="text-xl font-bold">
                {status?.auditPackages?.length ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Available for download
              </p>
            </div>
          </div>

          {/* Portal Rules */}
          <Card className="border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/10">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Portal Access Rules — Enforced
              </p>
              <div className="grid gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>
                    <strong>Read-only:</strong> All sessions are read-only —
                    write actions always blocked, zero exceptions
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>
                    <strong>Period-locked:</strong> Each session locked to a
                    specific period — no cross-period access
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>
                    <strong>No current-period access:</strong> Auditors cannot
                    access current period data when auditing a prior period
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>
                    <strong>Every action logged:</strong> All portal actions
                    recorded in the audit trail
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Active Portal Sessions
              </CardTitle>
              <CardDescription className="text-xs">
                External auditor sessions — all read-only, period-locked, zero
                exceptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(status?.activePortalSessions ?? 0) === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Eye className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No active portal sessions
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Run an audit cycle with portal generation enabled to create
                    sessions
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setRunDialogOpen(true)}
                    className="mt-2 gap-2"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Run Audit with Portal
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Sessions would be listed here from the listPortalSessions endpoint */}
                  <p className="text-xs text-muted-foreground">
                    {status?.activePortalSessions} session(s) active. Use the
                    Run Audit dialog to create new sessions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Samples */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Recent Audit Samples
              </CardTitle>
              <CardDescription className="text-xs">
                Latest transactions sampled and independently verified
              </CardDescription>
            </CardHeader>
            <CardContent>
              {samplesLoading ? (
                <TableSkeleton rows={3} columns={4} />
              ) : !samples || samples.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No samples collected yet
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-2 px-3 text-left text-[10px] font-medium text-muted-foreground">
                          Transaction
                        </th>
                        <th className="py-2 px-3 text-center text-[10px] font-medium text-muted-foreground">
                          Agent
                        </th>
                        <th className="py-2 px-3 text-center text-[10px] font-medium text-muted-foreground">
                          Match
                        </th>
                        <th className="py-2 px-3 text-center text-[10px] font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="py-2 px-3 text-center text-[10px] font-medium text-muted-foreground">
                          Sampled
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {samples.slice(0, 10).map((s) => (
                        <tr
                          key={s.id}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-2 px-3 text-xs font-mono text-muted-foreground">
                            {s.transactionRef.slice(0, 8)}...
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant="secondary" className="text-[9px]">
                              {s.agentChecked}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {s.matchesOriginal ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 text-red-500 mx-auto" />
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge
                              variant={
                                s.matchesOriginal ? "default" : "destructive"
                              }
                              className={cn(
                                "text-[9px]",
                                s.matchesOriginal &&
                                  "bg-emerald-500/20 text-emerald-700",
                              )}
                            >
                              {s.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-center text-[10px] text-muted-foreground">
                            {s.sampledAt ? formatDate(s.sampledAt) : "—"}
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
      </Tabs>

      {/* ── Run Audit Dialog ─────────────────────────────────────────── */}
      <RunAuditDialog
        open={runDialogOpen}
        onOpenChange={setRunDialogOpen}
        onComplete={handleRunComplete}
        currentPeriod={currentPeriod}
      />
    </div>
  );
}
