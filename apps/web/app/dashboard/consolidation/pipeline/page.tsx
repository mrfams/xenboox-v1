"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
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
  Building2,
  GitBranch,
  Shuffle,
  Globe,
  Percent,
  FileSpreadsheet,
  CheckCircle2,
  Eye,
  ShieldCheck,
  ScrollText,
  PlayCircle,
  RefreshCw,
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  Link2,
  Network,
} from "lucide-react";
import { cn, formatDate, formatCurrency } from "@/lib/utils";

const STEP_ICONS: Record<string, typeof Building2> = {
  entity_hierarchy: Building2,
  ic_tagging: ArrowRightLeft,
  elimination: Shuffle,
  translation: Globe,
  minority_interest: Percent,
  statement_assembly: FileSpreadsheet,
  confidence_gate: CheckCircle2,
  view_delivery: Eye,
  integrity_check: ShieldCheck,
  audit_trail: ScrollText,
};

const STEP_LABELS: Record<string, string> = {
  entity_hierarchy: "Entity Hierarchy",
  ic_tagging: "IC Tagging",
  elimination: "Elimination",
  translation: "Translation",
  minority_interest: "Minority Interest",
  statement_assembly: "Statement Assembly",
  confidence_gate: "Confidence Gate",
  view_delivery: "View Delivery",
  integrity_check: "Integrity Check",
  audit_trail: "Audit Trail",
};

const STEP_AGENTS: Record<string, string> = {
  entity_hierarchy: "Controller Agent",
  ic_tagging: "Controller Agent",
  elimination: "Controller Agent",
  translation: "Controller Agent",
  minority_interest: "Controller Agent",
  statement_assembly: "Controller → Reporting Engine",
  confidence_gate: "Controller Agent",
  view_delivery: "Controller Agent",
  integrity_check: "Controller Agent",
  audit_trail: "Controller Agent",
};

function stepStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500/20 text-emerald-700 border-emerald-200";
    case "in_progress":
      return "bg-blue-500/20 text-blue-700 border-blue-200";
    case "skipped":
      return "bg-muted text-muted-foreground border-border";
    case "flagged":
      return "bg-amber-500/20 text-amber-700 border-amber-200";
    case "failed":
      return "bg-red-500/20 text-red-700 border-red-200";
    default:
      return "bg-muted/50 text-muted-foreground border-border";
  }
}

export default function ConsolidationPipelinePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();

  const { data: status, isLoading: statusLoading } =
    trpc.consolidation.getStatus.useQuery();
  const { data: relationships } =
    trpc.consolidation.listRelationships.useQuery();
  const { data: runs } = trpc.consolidation.listRuns.useQuery({ limit: 5 });
  const { data: eliminations } = trpc.consolidation.listEliminations.useQuery({
    limit: 10,
  });
  const { data: icTags } = trpc.consolidation.listICTags.useQuery({
    limit: 10,
  });

  const runPipeline = trpc.consolidation.runPipeline.useMutation({
    onSuccess: () => router.refresh(),
  });

  const approveRun = trpc.consolidation.approveRun.useMutation({
    onSuccess: () => router.refresh(),
  });

  const subsidiaries = status?.subsidiaries ?? [];
  const latestRun = status?.latestRun;

  if (statusLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Consolidation Pipeline"
          description="Multi-entity consolidation and inter-company elimination"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="h-5 w-24 animate-pulse rounded bg-muted mb-2" />
                <div className="h-8 w-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <TableSkeleton rows={4} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consolidation Pipeline"
        description={`Multi-entity consolidation · ${subsidiaries.length} subsidiaries · Inter-company elimination`}
        action={{
          label: "Run Consolidation",
          icon: <PlayCircle className="mr-2 h-4 w-4" />,
          onClick: () => runPipeline.mutate({ period: currentPeriod }),
        }}
      />

      {/* ── Summary Stat Cards ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Subsidiaries
                </p>
                <p className="text-2xl font-bold">{subsidiaries.length}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              <span>
                {subsidiaries.filter((s) => s.ownershipPct < 100).length}{" "}
                minority interests
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  IC Transactions
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {status?.icTransactionCount ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
                <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Link2 className="h-3 w-3" />
              <span>Cross-entity transactions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Eliminations
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {status?.eliminationCount ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/30">
                <Shuffle className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <span>IC entries eliminated</span>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "bg-gradient-to-br",
            status?.integrityCheckPassed === false
              ? "from-red-50 to-background dark:from-red-950/20"
              : "from-emerald-50 to-background dark:from-emerald-950/20",
          )}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Integrity Check
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    status?.integrityCheckPassed === true
                      ? "text-emerald-600"
                      : "text-muted-foreground",
                  )}
                >
                  {status?.integrityCheckPassed === true
                    ? "✅ Pass"
                    : status?.integrityCheckPassed === false
                      ? "❌ Failed"
                      : "—"}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-lg p-2.5",
                  status?.integrityCheckPassed === false
                    ? "bg-red-100 dark:bg-red-900/30"
                    : "bg-emerald-100 dark:bg-emerald-900/30",
                )}
              >
                <ShieldCheck
                  className={cn(
                    "h-5 w-5",
                    status?.integrityCheckPassed === true
                      ? "text-emerald-600"
                      : status?.integrityCheckPassed === false
                        ? "text-red-600"
                        : "text-muted-foreground",
                  )}
                />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <span>{subsidiaries.length} subsidiaries checked</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Tabs ─────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start border-b rounded-none h-auto pb-0 bg-transparent gap-0">
          <TabsTrigger
            value="overview"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger
            value="subsidiaries"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <Building2 className="h-4 w-4" /> Subsidiaries
            {subsidiaries.length > 0 && ` (${subsidiaries.length})`}
          </TabsTrigger>
          <TabsTrigger
            value="eliminations"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <Shuffle className="h-4 w-4" /> Eliminations
          </TabsTrigger>
          <TabsTrigger
            value="ic"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <ArrowRightLeft className="h-4 w-4" /> IC Tags
          </TabsTrigger>
          <TabsTrigger
            value="steps"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <RefreshCw className="h-4 w-4" /> Pipeline Steps
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Overview ────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          {/* Controller Review Required Banner */}
          {latestRun?.status === "reviewing" && (
            <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Controller Review Required
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Consolidation for {latestRun.period} is pending Controller
                      Agent review. Mandatory sign-off required before
                      consolidated statements can be delivered.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => approveRun.mutate({ runId: latestRun.id })}
                      disabled={approveRun.isPending}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Approve & Sign Off
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Integrity Check Warning */}
          {status?.integrityCheckPassed === false && (
            <Card className="border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      Entity-Level Integrity Check Failed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Consolidation may have affected subsidiary entity-level
                      data. Immediate investigation required. The affected
                      subsidiary ledgers must be verified against backups.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Consolidated Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Network className="h-4 w-4" /> Group Structure Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Subsidiary Portfolio
                  </p>
                  <div className="space-y-1.5">
                    {subsidiaries.length > 0 ? (
                      subsidiaries.slice(0, 5).map((sub) => (
                        <div
                          key={sub.subsidiaryId}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span>{sub.subsidiaryName}</span>
                          </div>
                          <Badge className="text-[9px] bg-primary/10 text-primary">
                            {sub.ownershipPct}% · {sub.consolidationMethod}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No subsidiaries configured
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Latest Run
                  </p>
                  {latestRun ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span>Period</span>
                        <span className="font-medium">{latestRun.period}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Status</span>
                        <Badge
                          className={cn(
                            "text-[9px]",
                            latestRun.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-700"
                              : latestRun.status === "reviewing"
                                ? "bg-amber-500/20 text-amber-700"
                                : "bg-muted/50 text-muted-foreground",
                          )}
                        >
                          {latestRun.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Eliminations</span>
                        <span className="font-medium">
                          {latestRun.eliminationCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Minority Interests</span>
                        <span className="font-medium">
                          {latestRun.minorityInterestCount}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <RefreshCw className="h-6 w-6 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground">
                        No runs yet
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Runs History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Recent Consolidation Runs
              </CardTitle>
              <CardDescription className="text-xs">
                Last {runs?.length ?? 0} runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {runs && runs.length > 0 ? (
                <div className="space-y-2">
                  {runs.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border p-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-muted p-1.5">
                          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{r.period}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {r.totalSubsidiaries} subsidiaries ·{" "}
                            {r.eliminationCount} eliminations ·{" "}
                            {r.minorityInterestCount} minority
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "text-[9px]",
                          r.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-700"
                            : r.status === "reviewing"
                              ? "bg-amber-500/20 text-amber-700"
                              : r.status === "failed"
                                ? "bg-red-500/20 text-red-700"
                                : "bg-muted/50 text-muted-foreground",
                        )}
                      >
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <RefreshCw className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No consolidation runs yet
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Click &quot;Run Consolidation&quot; to start
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Subsidiaries ─────────────────────────────────────── */}
        <TabsContent value="subsidiaries" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Entity Relationships
              </CardTitle>
              <CardDescription className="text-xs">
                Ownership structure and consolidation methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subsidiaries.length > 0 ? (
                <div className="space-y-2">
                  {subsidiaries.map((sub) => (
                    <div
                      key={sub.subsidiaryId}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-start gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium">
                            {sub.subsidiaryName}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Currency: {sub.currency} · Method:{" "}
                            {sub.consolidationMethod}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="text-[9px] bg-blue-500/20 text-blue-700">
                          {sub.ownershipPct}% owned
                        </Badge>
                        {sub.ownershipPct < 100 && (
                          <Badge className="text-[9px] bg-amber-500/20 text-amber-700">
                            {100 - sub.ownershipPct}% minority
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Building2 className="h-12 w-12" />}
                  title="No subsidiaries configured"
                  description="Add subsidiaries within your organization to enable consolidation. Navigate to Settings > Entities to create subsidiaries."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Eliminations ────────────────────────────────────── */}
        <TabsContent value="eliminations" className="space-y-4 pt-4">
          {eliminations && eliminations.length > 0 ? (
            <div className="space-y-2">
              {eliminations.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-start gap-3">
                    <Shuffle className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">
                        {e.eliminationType.replace("_", " ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {e.description}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Entity: {e.entityId.slice(0, 8)} · Counterparty:{" "}
                        {e.counterpartyEntityId.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">
                      {formatCurrency(Number(e.amount))}
                    </p>
                    <Badge
                      className={cn(
                        "text-[9px] mt-1",
                        e.debitCredit === "debit"
                          ? "bg-red-500/20 text-red-700"
                          : "bg-emerald-500/20 text-emerald-700",
                      )}
                    >
                      {e.debitCredit}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Shuffle className="h-12 w-12" />}
              title="No eliminations"
              description="Elimination entries are created during pipeline execution by matching inter-company transactions."
            />
          )}
        </TabsContent>

        {/* ── Tab: IC Tags ─────────────────────────────────────────── */}
        <TabsContent value="ic" className="space-y-4 pt-4">
          {icTags && icTags.length > 0 ? (
            <div className="space-y-2">
              {icTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-start gap-3">
                    <ArrowRightLeft className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">
                        {tag.transactionType} —{" "}
                        {tag.description ?? "No description"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Counterparty: {tag.counterparty?.name ?? "Unknown"} ·{" "}
                        {tag.currency}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Tagged: {formatDate(tag.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-medium">
                    {formatCurrency(Number(tag.amount))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ArrowRightLeft className="h-12 w-12" />}
              title="No inter-company tags"
              description="IC tags are created at posting time by the Ledger Agent when a transaction involves another entity."
            />
          )}
        </TabsContent>

        {/* ── Tab: Pipeline Steps ──────────────────────────────────── */}
        <TabsContent value="steps" className="space-y-4 pt-4">
          <div className="space-y-3">
            {Object.entries(STEP_LABELS).map(([stepId, label]) => {
              const IconComponent = STEP_ICONS[stepId] ?? RefreshCw;
              const agent = STEP_AGENTS[stepId] ?? "Controller Agent";
              return (
                <div
                  key={stepId}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {agent}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[9px] bg-muted/50 text-muted-foreground"
                  >
                    Pending
                  </Badge>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
