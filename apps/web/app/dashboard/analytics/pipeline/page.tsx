"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { AnalyticsLiveness } from "@/components/agents/analytics-liveness";
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
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  PlayCircle,
  Shield,
  LineChart,
  Eye,
  Fingerprint,
  Zap,
  Gauge,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

// ─── Helpers ────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const TREND_ICONS: Record<string, typeof TrendingUp> = {
  upward: TrendingUp,
  downward: TrendingDown,
  stable: Activity,
  volatile: AlertTriangle,
  cyclical: Activity,
  seasonal: Activity,
};

const TREND_COLORS: Record<string, string> = {
  upward: "text-emerald-600",
  downward: "text-red-600",
  stable: "text-blue-600",
  volatile: "text-amber-600",
  cyclical: "text-purple-600",
  seasonal: "text-cyan-600",
};

const TREND_BG: Record<string, string> = {
  upward: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50",
  downward: "bg-red-50 dark:bg-red-950/20 border-red-200/50",
  stable: "bg-blue-50 dark:bg-blue-950/20 border-blue-200/50",
  volatile: "bg-amber-50 dark:bg-amber-950/20 border-amber-200/50",
  cyclical: "bg-purple-50 dark:bg-purple-950/20 border-purple-200/50",
  seasonal: "bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200/50",
};

const ALERT_ROUTING_LABELS: Record<string, string> = {
  cfo_agent: "CFO Agent",
  compliance_agent: "Compliance Agent",
  audit_agent: "Audit Agent",
};

function healthScoreColor(score: number): string {
  if (score >= 0.8) return "text-emerald-600";
  if (score >= 0.6) return "text-amber-600";
  if (score >= 0.4) return "text-orange-600";
  return "text-red-600";
}

function healthScoreBg(score: number): string {
  if (score >= 0.8) return "bg-emerald-500";
  if (score >= 0.6) return "bg-amber-500";
  if (score >= 0.4) return "bg-orange-500";
  return "bg-red-500";
}

function healthScoreLabel(score: number): string {
  if (score >= 0.8) return "Excellent";
  if (score >= 0.6) return "Good";
  if (score >= 0.4) return "Fair";
  return "Poor";
}

// ─── AnalyticsDashboardPage ────────────────────────────────────────────────

export default function AnalyticsDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  // Data fetching
  const { data: status, isLoading: statusLoading } =
    trpc.analytics.getStatus.useQuery();
  const { data: trends, isLoading: trendsLoading } =
    trpc.analytics.listTrends.useQuery({ limit: 20 });
  const { data: anomalies } = trpc.analytics.listAnomalies.useQuery({
    limit: 20,
  });
  const { data: healthScores } = trpc.analytics.listHealthScores.useQuery({
    limit: 12,
  });
  const { data: forecasts } = trpc.analytics.listForecasts.useQuery({
    active: true,
    limit: 1,
  });
  const { data: snapshots } = trpc.analytics.listSnapshots.useQuery({
    limit: 12,
  });

  // ── Derived state ────────────────────────────────────────────────────

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const latestHealthScore = status?.latestHealthScore;
  const latestForecast = status?.latestForecast;
  const latestSnapshot = status?.latestSnapshot;
  const recentAnomalies = useMemo(() => {
    return (anomalies ?? []).filter((a) => !a.acknowledged).slice(0, 5);
  }, [anomalies]);
  const recentTrends = status?.recentTrends ?? [];

  // Snapshot history for mini chart
  const snapshotHistory = useMemo(() => {
    return (snapshots ?? []).slice().reverse(); // chronological order
  }, [snapshots]);

  const anomalyCounts = useMemo(() => {
    const all = anomalies ?? [];
    return {
      critical: all.filter((a) => a.severity === "critical").length,
      high: all.filter((a) => a.severity === "high").length,
      medium: all.filter((a) => a.severity === "medium").length,
      low: all.filter((a) => a.severity === "low").length,
      total: all.length,
    };
  }, [anomalies]);

  // ── Loading state ────────────────────────────────────────────────────

  if (statusLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analytics Center"
          description="Trends, insights, and financial health — surfaced without being asked"
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
        <TableSkeleton rows={4} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics Center"
        description={`Trends, insights, and financial health · Period: ${currentPeriod}`}
        action={{
          label: "Run Analytics Cycle",
          icon: <PlayCircle className="mr-2 h-4 w-4" />,
          onClick: () => router.refresh(),
        }}
      />

      <AnalyticsLiveness />

      {/* ── Summary Stat Cards ────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Health Score */}
        <Card className="bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Health Score
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    healthScoreColor(latestHealthScore?.overallScore ?? 0),
                  )}
                >
                  {latestHealthScore
                    ? `${(latestHealthScore.overallScore * 100).toFixed(0)}%`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              {latestHealthScore ? (
                <>
                  <Activity className="h-3 w-3" />
                  <span className="capitalize">
                    {latestHealthScore.trend} ·{" "}
                    {healthScoreLabel(latestHealthScore.overallScore)}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground/60">
                  No score available
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trends */}
        <Card className="bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Trends Detected
                </p>
                <p className="text-2xl font-bold">{recentTrends.length}</p>
              </div>
              <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
                <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>
                {recentTrends.filter((t) => t.trendType === "upward").length}{" "}
                upward ·{" "}
                {recentTrends.filter((t) => t.trendType === "downward").length}{" "}
                downward
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
                  <p className="text-2xl font-bold">{anomalyCounts.total}</p>
                  {anomalyCounts.critical > 0 && (
                    <p className="text-lg font-bold text-red-500">
                      ({anomalyCounts.critical} critical)
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              <span>{recentAnomalies.length} unacknowledged</span>
            </div>
          </CardContent>
        </Card>

        {/* Cash Runway */}
        <Card className="bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Cash Runway
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    (latestForecast?.runwayMonths ?? 0) >= 12
                      ? "text-emerald-600"
                      : (latestForecast?.runwayMonths ?? 0) >= 6
                        ? "text-amber-600"
                        : "text-red-600",
                  )}
                >
                  {latestForecast ? `${latestForecast.runwayMonths}mo` : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>
                {latestForecast
                  ? `Confidence: ${(latestForecast.confidence * 100).toFixed(0)}%`
                  : "No forecast"}
              </span>
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
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="health"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <Gauge className="h-4 w-4" />
            Health Score
          </TabsTrigger>
          <TabsTrigger
            value="trends"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <LineChart className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger
            value="anomalies"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <AlertTriangle className="h-4 w-4" />
            Anomalies {anomalyCounts.total > 0 && `(${anomalyCounts.total})`}
          </TabsTrigger>
          <TabsTrigger
            value="forecast"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3"
          >
            <DollarSign className="h-4 w-4" />
            Forecast
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Overview ────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          {/* Continuous Banner */}
          <Card className="bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background border-primary/20">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2">
                  <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    Analytics Running — Continuous
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {recentTrends.length > 0 || anomalyCounts.total > 0
                      ? `${recentTrends.length} active trends · ${anomalyCounts.total} anomalies · ${latestForecast ? `${latestForecast.runwayMonths}mo runway` : "no forecast"}`
                      : "No data yet — run an analytics cycle to generate insights"}
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px]">
                Active
              </Badge>
            </CardContent>
          </Card>

          {/* Guardrails */}
          <div className="grid gap-2 sm:grid-cols-3">
            <Card className="bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/10 border-blue-200/50 dark:border-blue-900/50">
              <CardContent className="p-3 flex items-start gap-2">
                <Fingerprint className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    Read-Only
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Never writes to the ledger
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50/50 to-background dark:from-purple-950/10 border-purple-200/50 dark:border-purple-900/50">
              <CardContent className="p-3 flex items-start gap-2">
                <Eye className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                    CFO Routed
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Alerts → CFO Agent, never direct
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/10 border-amber-200/50 dark:border-amber-900/50">
              <CardContent className="p-3 flex items-start gap-2">
                <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Explainable
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Every score has a reason
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Health Score Gauge + Recent Trends mini view */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Health Score Gauge */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Financial Health
                </CardTitle>
                <CardDescription className="text-xs">
                  Composite score from explainable, weighted components
                </CardDescription>
              </CardHeader>
              <CardContent>
                {latestHealthScore ? (
                  <div className="flex flex-col items-center py-4">
                    <div className="relative w-32 h-32 mb-4">
                      <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                        <div className="w-28 h-28 rounded-full bg-card flex flex-col items-center justify-center">
                          <span
                            className={cn(
                              "text-3xl font-bold",
                              healthScoreColor(latestHealthScore.overallScore),
                            )}
                          >
                            {(latestHealthScore.overallScore * 100).toFixed(0)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            / 100
                          </span>
                        </div>
                      </div>
                      <div
                        className="absolute top-0 left-0 w-32 h-32 rounded-full"
                        style={{
                          background: `conic-gradient(${healthScoreBg(latestHealthScore.overallScore)} ${latestHealthScore.overallScore * 360}deg, transparent 0)`,
                          mask: "radial-gradient(circle, transparent 55%, black 56%)",
                          WebkitMask:
                            "radial-gradient(circle, transparent 55%, black 56%)",
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className={cn(
                          "text-[10px]",
                          latestHealthScore.trend === "improving"
                            ? "bg-emerald-500/20 text-emerald-700"
                            : latestHealthScore.trend === "declining"
                              ? "bg-red-500/20 text-red-700"
                              : "bg-blue-500/20 text-blue-700",
                        )}
                      >
                        {latestHealthScore.trend.charAt(0).toUpperCase() +
                          latestHealthScore.trend.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {healthScoreLabel(latestHealthScore.overallScore)}
                      </span>
                    </div>
                    <div className="w-full space-y-1.5 mt-2">
                      {Object.entries(latestHealthScore.componentBreakdown).map(
                        ([key, comp]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="w-24 text-[10px] text-muted-foreground capitalize">
                              {key}
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  healthScoreBg(comp.score),
                                )}
                                style={{ width: `${comp.score * 100}%` }}
                              />
                            </div>
                            <span
                              className={cn(
                                "w-8 text-right text-[10px] font-mono font-semibold",
                                healthScoreColor(comp.score),
                              )}
                            >
                              {(comp.score * 100).toFixed(0)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <Gauge className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No health score yet
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Run an analytics cycle to generate scores
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Trends */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <LineChart className="h-4 w-4" />
                  Recent Trends
                </CardTitle>
                <CardDescription className="text-xs">
                  Detected trends and patterns across key dimensions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentTrends.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <LineChart className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No trends detected yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentTrends.slice(0, 6).map((t, i) => {
                      const TrendIcon = TREND_ICONS[t.trendType] ?? Activity;
                      return (
                        <div
                          key={`${t.dimension}-${i}`}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-3",
                            TREND_BG[t.trendType] ?? "border-border",
                          )}
                        >
                          <TrendIcon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              TREND_COLORS[t.trendType],
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold capitalize">
                              {t.dimension.replace(/_/g, " ")}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {t.description}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge
                              className={cn(
                                "text-[9px]",
                                TREND_COLORS[t.trendType]
                                  .replace("text-", "bg-")
                                  .replace("600", "100") +
                                  " " +
                                  TREND_COLORS[t.trendType].replace(
                                    "text-",
                                    "text-",
                                  ),
                              )}
                            >
                              {t.trendType}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {t.magnitude >= 0 ? "+" : ""}
                              {(t.magnitude * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Anomalies Preview */}
          {recentAnomalies.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Unacknowledged Anomalies
                </CardTitle>
                <CardDescription className="text-xs">
                  Statistical anomalies requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentAnomalies.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle
                          className={cn(
                            "h-4 w-4 mt-0.5 shrink-0",
                            a.severity === "critical"
                              ? "text-red-500"
                              : a.severity === "high"
                                ? "text-orange-500"
                                : "text-amber-500",
                          )}
                        />
                        <div>
                          <p className="text-xs font-medium">{a.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {a.anomalyType.replace(/_/g, " ")} ·{" "}
                            {formatDate(a.createdAt ?? "")}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "text-[9px]",
                          SEVERITY_COLORS[a.severity] ?? "",
                        )}
                      >
                        {a.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Health Score ─────────────────────────────────────── */}
        <TabsContent value="health" className="space-y-4 pt-4">
          {/* Current Health Score Detail */}
          {latestHealthScore ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Overall Score
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Period: {latestHealthScore.period}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center py-6">
                    <div className="relative w-40 h-40 mb-3">
                      <div className="w-40 h-40 rounded-full bg-muted flex items-center justify-center">
                        <div className="w-36 h-36 rounded-full bg-card flex flex-col items-center justify-center">
                          <span
                            className={cn(
                              "text-4xl font-bold",
                              healthScoreColor(latestHealthScore.overallScore),
                            )}
                          >
                            {(latestHealthScore.overallScore * 100).toFixed(0)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            / 100
                          </span>
                        </div>
                      </div>
                      <div
                        className="absolute top-0 left-0 w-40 h-40 rounded-full"
                        style={{
                          background: `conic-gradient(${healthScoreBg(latestHealthScore.overallScore)} ${latestHealthScore.overallScore * 360}deg, transparent 0)`,
                          mask: "radial-gradient(circle, transparent 55%, black 56%)",
                          WebkitMask:
                            "radial-gradient(circle, transparent 55%, black 56%)",
                        }}
                      />
                    </div>
                    <Badge
                      className={cn(
                        "text-xs",
                        latestHealthScore.trend === "improving"
                          ? "bg-emerald-500/20 text-emerald-700"
                          : latestHealthScore.trend === "declining"
                            ? "bg-red-500/20 text-red-700"
                            : "bg-blue-500/20 text-blue-700",
                      )}
                    >
                      {latestHealthScore.trend.charAt(0).toUpperCase() +
                        latestHealthScore.trend.slice(1)}
                    </Badge>
                    {latestHealthScore.previousScore !== null && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Previous:{" "}
                        {(latestHealthScore.previousScore * 100).toFixed(0)}% (
                        {latestHealthScore.overallScore >=
                        latestHealthScore.previousScore
                          ? "+"
                          : ""}
                        {(
                          (latestHealthScore.overallScore -
                            latestHealthScore.previousScore) *
                          100
                        ).toFixed(1)}
                        pp)
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Component Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Each component has an explanation — never a black box
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(latestHealthScore.componentBreakdown).map(
                      ([key, comp]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold capitalize">
                              {key}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">
                                Weight: {(comp.weight * 100).toFixed(0)}%
                              </span>
                              <span
                                className={cn(
                                  "text-xs font-mono font-bold",
                                  healthScoreColor(comp.score),
                                )}
                              >
                                {(comp.score * 100).toFixed(0)}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                healthScoreBg(comp.score),
                              )}
                              style={{ width: `${comp.score * 100}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-muted-foreground leading-tight">
                            {comp.explanation}
                          </p>
                        </div>
                      ),
                    )}
                  </CardContent>
                </Card>
              </div>
              {/* Score History */}{" "}
              {healthScores && healthScores.length > 1 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Score History
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Health score trend over the last {healthScores.length}{" "}
                      periods
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-1 h-32">
                      {[...healthScores].reverse().map((s) => {
                        const score = Number(s.overallScore);
                        const heightPct = score * 100;
                        return (
                          <div
                            key={s.id}
                            className="flex-1 flex flex-col items-center gap-1"
                          >
                            <span className="text-[8px] text-muted-foreground font-mono">
                              {(score * 100).toFixed(0)}
                            </span>
                            <div
                              className={cn(
                                "w-full rounded-t transition-all duration-300",
                                healthScoreBg(score),
                              )}
                              style={{ height: `${heightPct}%` }}
                              title={`${s.period}: ${(score * 100).toFixed(0)}%`}
                            />
                            <span className="text-[7px] text-muted-foreground">
                              {s.period.slice(-2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <EmptyState
              icon={<Gauge className="h-12 w-12" />}
              title="No health score available"
              description="Run an analytics cycle to generate a financial health score with full component breakdown."
              action={
                <Button size="sm" className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Run Analytics
                </Button>
              }
            />
          )}
        </TabsContent>

        {/* ── Tab: Trends ──────────────────────────────────────────── */}
        <TabsContent value="trends" className="space-y-4 pt-4">
          {trendsLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : !trends || trends.length === 0 ? (
            <EmptyState
              icon={<LineChart className="h-12 w-12" />}
              title="No trends detected"
              description="Run an analytics cycle to detect revenue, expense, and cash flow trends."
              action={
                <Button size="sm" className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Run Analytics
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {trends.map((t, i) => {
                const TrendIcon = TREND_ICONS[t.trendType] ?? Activity;
                return (
                  <div
                    key={t.id ?? i}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-4",
                      TREND_BG[t.trendType] ?? "border-border",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          TREND_COLORS[t.trendType]
                            .replace("text-", "bg-")
                            .replace("600", "100") + " dark:bg-transparent",
                        )}
                      >
                        <TrendIcon
                          className={cn("h-5 w-5", TREND_COLORS[t.trendType])}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-medium capitalize"
                          >
                            {t.dimension.replace(/_/g, " ")}
                          </Badge>
                          <Badge
                            className={cn(
                              "text-[9px]",
                              t.trendType === "upward"
                                ? "bg-emerald-500/20 text-emerald-700"
                                : t.trendType === "downward"
                                  ? "bg-red-500/20 text-red-700"
                                  : "bg-blue-500/20 text-blue-700",
                            )}
                          >
                            {t.trendType}
                          </Badge>
                        </div>
                        <p className="text-sm mt-1">{t.description}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          <span>
                            Confidence:{" "}
                            {(Number(t.confidence) * 100).toFixed(0)}%
                          </span>
                          <span>
                            Magnitude: {Number(t.magnitude) >= 0 ? "+" : ""}
                            {(Number(t.magnitude) * 100).toFixed(1)}%
                          </span>
                          {t.comparisonPeriod && (
                            <span>vs {t.comparisonPeriod}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold font-mono",
                          Math.abs(Number(t.magnitude)) > 0.3
                            ? Number(t.magnitude) >= 0
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {" "}
                        {Number(t.magnitude) >= 0 ? "+" : ""}
                        {(Number(t.magnitude) * 100).toFixed(0)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Anomalies ───────────────────────────────────────── */}
        <TabsContent value="anomalies" className="space-y-4 pt-4">
          {/* Summary */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">Critical</p>
              <p className="text-xl font-bold text-red-600">
                {anomalyCounts.critical}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">High</p>
              <p className="text-xl font-bold text-orange-600">
                {anomalyCounts.high}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">Medium</p>
              <p className="text-xl font-bold text-amber-600">
                {anomalyCounts.medium}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">Low</p>
              <p className="text-xl font-bold text-blue-600">
                {anomalyCounts.low}
              </p>
            </div>
          </div>

          {/* Statistical Method Notice */}
          <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/10">
            <CardContent className="p-3 flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                  Statistical Detection — Not LLM Judgment
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  All anomalies are detected using statistical methods (z-score
                  analysis) and rule-based checks, not AI judgment alone. Each
                  anomaly includes its statistical basis and methodology.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Anomaly List */}
          {!anomalies || anomalies.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-12 w-12 text-emerald-500" />}
              title="No Anomalies Detected"
              description="All financial metrics are within expected statistical parameters."
            />
          ) : (
            <div className="space-y-2">
              {anomalies.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4",
                    a.severity === "critical" &&
                      "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10",
                    a.severity === "high" &&
                      "border-orange-200 dark:border-orange-900 bg-orange-50/30 dark:bg-orange-950/10",
                    a.severity === "medium" &&
                      "border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10",
                    a.acknowledged && "opacity-60",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 rounded-full p-1.5",
                        a.severity === "critical" &&
                          "bg-red-100 dark:bg-red-900/30",
                        a.severity === "high" &&
                          "bg-orange-100 dark:bg-orange-900/30",
                        a.severity === "medium" &&
                          "bg-amber-100 dark:bg-amber-900/30",
                        a.severity === "low" &&
                          "bg-blue-100 dark:bg-blue-900/30",
                      )}
                    >
                      <AlertCircle
                        className={cn(
                          "h-3.5 w-3.5",
                          a.severity === "critical"
                            ? "text-red-500"
                            : a.severity === "high"
                              ? "text-orange-500"
                              : a.severity === "medium"
                                ? "text-amber-500"
                                : "text-blue-500",
                        )}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-medium">{a.description}</p>
                        {a.acknowledged && (
                          <Badge className="text-[9px] bg-blue-500/20 text-blue-700">
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>{a.anomalyType.replace(/_/g, " ")}</span>
                        <span>·</span>
                        <span>
                          Detected:{" "}
                          {a.createdAt ? formatDate(a.createdAt) : "—"}
                        </span>
                        {a.routedTo && (
                          <>
                            <span>·</span>
                            <span>
                              Routed:{" "}
                              {ALERT_ROUTING_LABELS[a.routedTo] ?? a.routedTo}
                            </span>
                          </>
                        )}
                        {a.statisticalBasis &&
                          (a.statisticalBasis as { method?: string })
                            .method && (
                            <>
                              <span>·</span>
                              <span className="font-mono">
                                Method:{" "}
                                {
                                  (a.statisticalBasis as { method?: string })
                                    .method
                                }
                              </span>
                            </>
                          )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "text-[9px] shrink-0 ml-2",
                      SEVERITY_COLORS[a.severity] ?? "",
                    )}
                  >
                    {a.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Forecast ────────────────────────────────────────── */}
        <TabsContent value="forecast" className="space-y-4 pt-4">
          {latestForecast ? (
            <>
              {/* Runway Display */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="bg-gradient-to-br from-emerald-50 to-background dark:from-emerald-950/20">
                  <CardContent className="p-5 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      Cash Runway
                    </p>
                    <p
                      className={cn(
                        "text-3xl font-bold",
                        latestForecast.runwayMonths >= 12
                          ? "text-emerald-600"
                          : latestForecast.runwayMonths >= 6
                            ? "text-amber-600"
                            : "text-red-600",
                      )}
                    >
                      {latestForecast.runwayMonths}mo
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {latestForecast.runwayMonths >= 12
                        ? "Stable runway"
                        : latestForecast.runwayMonths >= 6
                          ? "Adequate runway"
                          : latestForecast.runwayMonths >= 3
                            ? "Limited runway — monitor closely"
                            : "Critical — immediate action needed"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      Projected Revenue
                    </p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {latestForecast.projectedRevenue.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Growth rate:{" "}
                      {(
                        latestForecast.assumptions.revenueGrowthRate * 100
                      ).toFixed(0)}
                      %
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      Projected Cash
                    </p>
                    <p className="text-3xl font-bold text-blue-600">
                      {latestForecast.projectedCashBalance.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Confidence: {(latestForecast.confidence * 100).toFixed(0)}
                      %
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Assumptions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Forecast Assumptions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Every assumption is recorded — never a black box
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Revenue Growth Rate
                        </span>
                        <span className="font-mono font-semibold">
                          {(
                            latestForecast.assumptions.revenueGrowthRate * 100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                      <Progress
                        value={
                          latestForecast.assumptions.revenueGrowthRate * 100
                        }
                        className="h-1.5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Expense Growth Rate
                        </span>
                        <span className="font-mono font-semibold">
                          {(
                            latestForecast.assumptions.expenseGrowthRate * 100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                      <Progress
                        value={
                          latestForecast.assumptions.expenseGrowthRate * 100
                        }
                        className="h-1.5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Inflation Rate
                        </span>
                        <span className="font-mono font-semibold">
                          {(
                            latestForecast.assumptions.inflationRate * 100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                      <Progress
                        value={latestForecast.assumptions.inflationRate * 100}
                        className="h-1.5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Confidence Interval
                        </span>
                        <span className="font-mono font-semibold">
                          {(
                            latestForecast.assumptions.confidenceInterval * 100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                      <Progress
                        value={
                          latestForecast.assumptions.confidenceInterval * 100
                        }
                        className="h-1.5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Projection Months
                        </span>
                        <span className="font-mono font-semibold">
                          {latestForecast.assumptions.projectionMonths}mo
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Methodology
                        </span>
                        <span className="font-mono font-semibold">
                          Linear Regression
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Snapshot History */}
              {snapshotHistory.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Revenue & Expense History
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {snapshotHistory.length} period(s) of aggregated data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-1 h-40">
                      {snapshotHistory.map((s) => {
                        const revenue = Number(
                          (s.snapshotData as { revenue?: unknown })?.revenue ??
                            0,
                        );
                        const expenses = Number(
                          (s.snapshotData as { expenses?: unknown })
                            ?.expenses ?? 0,
                        );
                        const maxVal = Math.max(revenue, expenses, 1);
                        const revHeight = (revenue / maxVal) * 100;
                        const expHeight = (expenses / maxVal) * 100;
                        return (
                          <div
                            key={s.id}
                            className="flex-1 flex flex-col items-center gap-0.5"
                          >
                            <div
                              className="w-full flex gap-0.5"
                              style={{ height: "100%" }}
                            >
                              <div
                                className="flex-1 rounded-t bg-emerald-400 dark:bg-emerald-600 transition-all"
                                style={{ height: `${revHeight}%` }}
                                title={`Revenue: ${revenue}`}
                              />
                              <div
                                className="flex-1 rounded-t bg-red-400 dark:bg-red-600 transition-all"
                                style={{ height: `${expHeight}%` }}
                                title={`Expenses: ${expenses}`}
                              />
                            </div>
                            <span className="text-[7px] text-muted-foreground mt-1">
                              {s.period.slice(-2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm bg-emerald-400 dark:bg-emerald-600" />
                        <span>Revenue</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm bg-red-400 dark:bg-red-600" />
                        <span>Expenses</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <EmptyState
              icon={<DollarSign className="h-12 w-12" />}
              title="No forecast available"
              description="Run an analytics cycle to generate a cash flow forecast and runway projection."
              action={
                <Button size="sm" className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Run Analytics
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
