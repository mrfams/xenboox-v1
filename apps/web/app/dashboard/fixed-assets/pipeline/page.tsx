"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SubPageTabs } from "@/components/shared/sub-page-tabs";
import { MODULE_TABS } from "@/components/shared/module-tabs";
import { AssetLiveness } from "@/components/agents/asset-liveness";
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
  Landmark,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
  Search,
  Clock,
  DollarSign,
  TrendingDown,
  ClipboardCheck,
  Gavel,
} from "lucide-react";
import { cn, formatDate, formatCurrency } from "@/lib/utils";

// ─── Helpers ────────────────────────────────────────────────────────────────

const STEP_ICONS: Record<string, typeof Calculator> = {
  inventory_scan: Search,
  depreciation_calc: Calculator,
  verification_check: ClipboardCheck,
  disposal_detection: AlertTriangle,
  adjustment_intake: FileText,
  journal_posting: TrendingDown,
  confidence_gate: ShieldCheck,
  audit_trail: Gavel,
};

const STEP_LABELS: Record<string, string> = {
  inventory_scan: "Inventory Scan",
  depreciation_calc: "Depreciation",
  verification_check: "Verification",
  disposal_detection: "Disposal Check",
  adjustment_intake: "Adjustments",
  journal_posting: "Journal Posting",
  confidence_gate: "Confidence Gate",
  audit_trail: "Audit Trail",
};

const STEP_AGENTS: Record<string, string> = {
  inventory_scan: "Asset Agent",
  depreciation_calc: "Asset Agent",
  verification_check: "Asset Agent",
  disposal_detection: "Asset Agent",
  adjustment_intake: "Asset Agent",
  journal_posting: "Controller → Ledger",
  confidence_gate: "Asset Agent",
  audit_trail: "Asset Agent",
};

function stepStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900";
    case "in_progress":
      return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900";
    case "skipped":
      return "bg-muted text-muted-foreground border-border";
    case "flagged":
      return "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900";
    case "failed":
      return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900";
    default:
      return "bg-muted/50 text-muted-foreground border-border";
  }
}

// ─── AssetPipelinePage ───────────────────────────────────────────────────

export default function AssetPipelinePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [currentPeriod, setCurrentPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Data fetching
  const { data: status, isLoading: statusLoading } =
    trpc.assetPipeline.getStatus.useQuery();
  const { data: pipelineRuns, isLoading: runsLoading } =
    trpc.assetPipeline.listPipelineRuns.useQuery({ limit: 5 });
  const { data: verifications } = trpc.assetPipeline.listVerifications.useQuery(
    { limit: 10 },
  );
  const { data: disposalRecords } =
    trpc.assetPipeline.listDisposalRecords.useQuery({ limit: 10 });
  const { data: depreciationSchedule } =
    trpc.assetPipeline.listDepreciationSchedule.useQuery({ limit: 20 });

  // Pipeline execution
  const runPipeline = trpc.assetPipeline.runPipeline.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  // ── Derived State ───────────────────────────────────────────────────

  const latestRun = status?.latestRun;
  const assetSummary = status?.assetSummary;
  const verificationSummary = status?.verificationSummary;
  const disposalFlags = status?.disposalFlags ?? [];
  const depreciationSummary = status?.depreciationSummary;

  // ── Loading State ───────────────────────────────────────────────────

  if (statusLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Fixed Assets Pipeline"
          description="Depreciation engine, lifecycle management, and verification tracking"
        />
        <SubPageTabs tabs={MODULE_TABS.assets} />
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
        <TableSkeleton rows={4} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fixed Assets Pipeline"
        description={`Autonomous asset management · Period: ${currentPeriod}`}
        action={{
          label: "Run Asset Pipeline",
          icon: <PlayCircle className="mr-2 h-4 w-4" />,
          onClick: () =>
            runPipeline.mutate({
              period: currentPeriod,
              triggerSource: "manual",
            }),
        }}
      />

      <SubPageTabs tabs={MODULE_TABS.assets} />

      <AssetLiveness />

      {/* ── Summary Stat Cards ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Assets */}
        <Card className="bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Total Assets
                </p>
                <p className="text-2xl font-bold">{assetSummary?.total ?? 0}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Landmark className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <span>
                {assetSummary?.active ?? 0} active ·{" "}
                {assetSummary?.disposed ?? 0} disposed
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Net Book Value */}
        <Card className="bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Net Book Value
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(assetSummary?.totalNBV ?? 0)}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3" />
              <span>
                Accum. depr:{" "}
                {formatCurrency(
                  depreciationSummary?.totalAccumulatedDepreciation ?? 0,
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Depreciation */}
        <Card className="bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Depreciation
                </p>
                <p className="text-2xl font-bold">
                  {depreciationSummary?.totalDepreciated ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
                <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Last run: {depreciationSummary?.lastRunPeriod ?? "Never"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Verifications */}
        <Card className="bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Verifications
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold">
                    {verificationSummary?.pending ?? 0}
                  </p>
                  {(verificationSummary?.overdue ?? 0) > 0 && (
                    <p className="text-lg font-bold text-red-500">
                      ({verificationSummary?.overdue} overdue)
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
                <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              <span>{verificationSummary?.verified ?? 0} completed</span>
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
            <Landmark className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="steps"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <RefreshCw className="h-4 w-4" />
            Pipeline Steps
          </TabsTrigger>
          <TabsTrigger
            value="verifications"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <ShieldCheck className="h-4 w-4" />
            Verifications{" "}
            {(verificationSummary?.pending ?? 0) > 0 &&
              `(${verificationSummary?.pending})`}
          </TabsTrigger>
          <TabsTrigger
            value="disposals"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <Gavel className="h-4 w-4" />
            Disposals
          </TabsTrigger>
          <TabsTrigger
            value="depreciation"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <Calculator className="h-4 w-4" />
            Depreciation
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Overview ────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          {/* Asset Summary Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Asset Portfolio Summary
              </CardTitle>
              <CardDescription className="text-xs">
                Total value: {formatCurrency(assetSummary?.totalValue ?? 0)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1 text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {assetSummary?.active ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Active</p>
                </div>
                <div className="space-y-1 text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {assetSummary?.fullyDepreciated ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Fully Depr.
                  </p>
                </div>
                <div className="space-y-1 text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {assetSummary?.underMaintenance ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Maintenance
                  </p>
                </div>
                <div className="space-y-1 text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-950/20">
                  <p className="text-lg font-bold text-slate-600 dark:text-slate-400">
                    {assetSummary?.disposed ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Disposed</p>
                </div>
              </div>

              {/* NBV Distribution Bar */}
              {assetSummary && assetSummary.total > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] text-muted-foreground mb-1.5">
                    Status Distribution
                  </p>
                  <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                    {assetSummary.active > 0 && (
                      <div
                        className="bg-emerald-400 dark:bg-emerald-600 h-full transition-all"
                        style={{
                          width: `${(assetSummary.active / assetSummary.total) * 100}%`,
                        }}
                        title={`Active: ${assetSummary.active}`}
                      />
                    )}
                    {assetSummary.fullyDepreciated > 0 && (
                      <div
                        className="bg-blue-400 dark:bg-blue-600 h-full transition-all"
                        style={{
                          width: `${(assetSummary.fullyDepreciated / assetSummary.total) * 100}%`,
                        }}
                        title={`Fully Depreciated: ${assetSummary.fullyDepreciated}`}
                      />
                    )}
                    {assetSummary.underMaintenance > 0 && (
                      <div
                        className="bg-amber-400 dark:bg-amber-600 h-full transition-all"
                        style={{
                          width: `${(assetSummary.underMaintenance / assetSummary.total) * 100}%`,
                        }}
                        title={`Under Maintenance: ${assetSummary.underMaintenance}`}
                      />
                    )}
                    {assetSummary.disposed > 0 && (
                      <div
                        className="bg-slate-400 dark:bg-slate-600 h-full transition-all"
                        style={{
                          width: `${(assetSummary.disposed / assetSummary.total) * 100}%`,
                        }}
                        title={`Disposed: ${assetSummary.disposed}`}
                      />
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-[8px] text-muted-foreground">
                    {assetSummary.active > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    )}
                    {assetSummary.fullyDepreciated > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        Fully Depr.
                      </span>
                    )}
                    {assetSummary.underMaintenance > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Maint.
                      </span>
                    )}
                    {assetSummary.disposed > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Disposed
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Disposal Flags Warning */}
          {disposalFlags.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {disposalFlags.length} Asset(s) Past Useful Life
                    </p>
                    <p className="text-xs text-muted-foreground">
                      These assets have exceeded their useful life and should be
                      reviewed for disposal. Go to the Disposals tab to manage.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Last Pipeline Run Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Latest Pipeline Run
              </CardTitle>
              <CardDescription className="text-xs">
                {latestRun
                  ? `Period: ${latestRun.period} · ${latestRun.status}`
                  : "No pipeline runs yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latestRun ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">
                        {latestRun.assetsScanned}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Assets Scanned
                      </p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">
                        {latestRun.depreciationCount}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Depr. Entries
                      </p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">
                        {formatCurrency(Number(latestRun.depreciationTotal))}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Total Depr.
                      </p>
                    </div>
                  </div>
                  {latestRun.errors && latestRun.errors.length > 0 && (
                    <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-950/20 text-xs text-red-700 dark:text-red-300">
                      {latestRun.errors.join("; ")}
                    </div>
                  )}
                  {latestRun.warnings && latestRun.warnings.length > 0 && (
                    <div className="mt-1 p-2 rounded bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700 dark:text-amber-300">
                      {latestRun.warnings.join("; ")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <RefreshCw className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No pipeline runs yet
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Click "Run Asset Pipeline" to start
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Pipeline Steps ──────────────────────────────────── */}
        <TabsContent value="steps" className="space-y-4 pt-4">
          {runsLoading ? (
            <TableSkeleton rows={8} columns={4} />
          ) : (
            <div className="space-y-3">
              {STEP_LABELS &&
                Object.entries(STEP_LABELS).map(([stepId, label]) => {
                  const IconComponent = STEP_ICONS[stepId] ?? RefreshCw;
                  const agent = STEP_AGENTS[stepId] ?? "Asset Agent";
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
          )}
        </TabsContent>

        {/* ── Tab: Verifications ───────────────────────────────────── */}
        <TabsContent value="verifications" className="space-y-4 pt-4">
          {verifications && verifications.length > 0 ? (
            <div className="space-y-2">
              {verifications.map((v) => (
                <div
                  key={v.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4",
                    v.status === "pending" &&
                      "border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10",
                    v.status === "verified" &&
                      "border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10 opacity-70",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        v.status === "verified"
                          ? "text-emerald-500"
                          : "text-amber-500",
                      )}
                    />
                    <div>
                      <p className="text-xs font-medium">
                        {v.fixedAsset?.name ?? "Unknown Asset"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Scheduled: {formatDate(v.scheduledDate)} · {v.status}
                      </p>
                      {v.verifiedDate && (
                        <p className="text-[10px] text-muted-foreground">
                          Verified: {formatDate(v.verifiedDate)} by{" "}
                          {v.verifiedBy}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "text-[9px]",
                      v.status === "verified"
                        ? "bg-emerald-500/20 text-emerald-700"
                        : "bg-amber-500/20 text-amber-700",
                    )}
                  >
                    {v.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ShieldCheck className="h-12 w-12" />}
              title="No verifications scheduled"
              description="Run the asset pipeline to generate physical verification records."
            />
          )}
        </TabsContent>

        {/* ── Tab: Disposals ───────────────────────────────────────── */}
        <TabsContent value="disposals" className="space-y-4 pt-4">
          {/* Disposal Flags */}
          {disposalFlags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Assets Past Useful Life — Flagged for Disposal
              </p>
              {disposalFlags.map((f, i) => (
                <div
                  key={f.fixedAssetId}
                  className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10 p-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{f.assetName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        NBV: {formatCurrency(f.netBookValue)} · Cost:{" "}
                        {formatCurrency(f.cost)} · {f.monthsInService}mo in
                        service / {f.usefulLifeMonths}mo useful life
                      </p>
                    </div>
                  </div>
                  <Badge className="text-[9px] bg-red-500/20 text-red-700">
                    {f.recommendation}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Disposal Records */}
          {disposalRecords && disposalRecords.length > 0 ? (
            <div className="space-y-2 mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Completed Disposals
              </p>
              {disposalRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border p-4 opacity-70"
                >
                  <div className="flex items-start gap-3">
                    <Gavel className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">
                        {r.fixedAsset?.name ?? "Unknown Asset"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {r.disposalMethod} · {r.disposalDate} · Gain/Loss:{" "}
                        {formatCurrency(Number(r.gainOrLoss))}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[9px] bg-slate-500/20 text-slate-700"
                  >
                    {r.disposalMethod}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Gavel className="h-12 w-12" />}
              title="No disposal records"
              description="Assets past useful life will be flagged here for disposal review."
            />
          )}
        </TabsContent>

        {/* ── Tab: Depreciation ────────────────────────────────────── */}
        <TabsContent value="depreciation" className="space-y-4 pt-4">
          {depreciationSchedule && depreciationSchedule.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Asset
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Accum. Depr.
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      NBV
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Source
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {depreciationSchedule.slice(0, 20).map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm font-medium">
                        {entry.fixedAsset?.name ?? "Unknown"}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(Number(entry.depreciationAmount))}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(Number(entry.accumulatedDepreciation))}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(Number(entry.netBookValue))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="secondary" className="text-[9px]">
                          {entry.calculatedBy ?? "manual"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-muted-foreground">
                        {entry.createdAt ? formatDate(entry.createdAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<Calculator className="h-12 w-12" />}
              title="No depreciation entries"
              description="Run the asset pipeline to calculate and post depreciation."
              action={
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    runPipeline.mutate({
                      period: currentPeriod,
                      triggerSource: "manual",
                    })
                  }
                  disabled={runPipeline.isPending}
                >
                  <PlayCircle className="h-4 w-4" />
                  Run Pipeline
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
