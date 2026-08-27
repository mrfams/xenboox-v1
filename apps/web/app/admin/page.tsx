"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Skeleton,
} from "@xenboox/ui";
import {
  Users,
  DollarSign,
  Bot,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Settings,
  ArrowRight,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── Mini Sparkline Chart ───────────────────────────────────────────────────

function Sparkline({
  data,
  color = "rgb(139, 92, 246)",
  height = 40,
  width = 120,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient
          id={`gradient-${color.replace(/[^a-z0-9]/gi, "")}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polygon
        fill={`url(#gradient-${color.replace(/[^a-z0-9]/gi, "")})`}
        points={`0,${height} ${points} ${width},${height}`}
      />
    </svg>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  iconColor,
  iconBg,
  label,
  tooltip,
  value,
  delta,
  deltaLabel,
  chartData,
  chartColor,
  href,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  tooltip?: string;
  value: string | number;
  delta: number;
  deltaLabel?: string;
  chartData?: number[];
  chartColor?: string;
  href?: string;
}) {
  const isPositive = delta >= 0;
  const deltaColor = label.includes("Cost")
    ? isPositive
      ? "text-error-clay"
      : "text-balanced-green"
    : isPositive
      ? "text-balanced-green"
      : "text-error-clay";

  return (
    <Card className="relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              iconBg,
            )}
          >
            <div className={iconColor}>{icon}</div>
          </div>
          <span
            className="text-xs font-medium text-muted-foreground"
            title={tooltip}
          >
            {label}
            {tooltip && (
              <span className="ml-1 inline-block h-3 w-3 rounded-full bg-muted/50 text-[8px] leading-3 text-muted-foreground/60 cursor-help">
                ?
              </span>
            )}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <div className="flex items-center gap-1 mt-1">
              {isPositive ? (
                <TrendingUp className={cn("h-3 w-3", deltaColor)} />
              ) : (
                <TrendingDown className={cn("h-3 w-3", deltaColor)} />
              )}
              <span className={cn("text-xs font-medium", deltaColor)}>
                {isPositive ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">
                {deltaLabel || "vs last week"}
              </span>
            </div>
          </div>
          {chartData && chartData.length > 1 && (
            <Sparkline data={chartData} color={chartColor} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── System Health Card ─────────────────────────────────────────────────────

function SystemHealthCard({
  allOperational,
  uptimePercent,
  services,
}: {
  allOperational: boolean;
  uptimePercent: string;
  services: { name: string; status: string }[];
}) {
  return (
    <Card className="h-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">System Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-3 w-3 rounded-full",
                allOperational ? "bg-balanced-green" : "bg-attention-amber",
              )}
            />
            <span className="text-sm font-medium text-balanced-green">
              All Systems Operational
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {uptimePercent}% uptime
          </span>
        </div>

        <div className="space-y-2">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between py-1"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    service.status === "operational"
                      ? "bg-balanced-green"
                      : service.status === "degraded"
                        ? "bg-attention-amber"
                        : "bg-error-clay",
                  )}
                />
                <span className="text-sm text-muted-foreground">
                  {service.name}
                </span>
              </div>
              <span
                className={cn(
                  "text-xs font-medium capitalize",
                  service.status === "operational"
                    ? "text-balanced-green"
                    : service.status === "degraded"
                      ? "text-attention-amber"
                      : "text-error-clay",
                )}
              >
                {service.status === "operational"
                  ? "Operational"
                  : service.status}
              </span>
            </div>
          ))}
        </div>

        <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-all duration-300 group">
          View incident history
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
        </button>
      </CardContent>
    </Card>
  );
}

// ─── AI Metric Card ─────────────────────────────────────────────────────────

function AiMetricCard({
  title,
  value,
  unit,
  delta,
  deltaLabel,
  chartData,
  chartColor,
  children,
}: {
  title: string;
  value: string | number;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  chartData?: number[];
  chartColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="h-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-3xl font-bold tracking-tight">
              {value}
              {unit && (
                <span className="text-lg font-medium text-muted-foreground ml-1">
                  {unit}
                </span>
              )}
            </p>
            {delta !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                {delta >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-balanced-green" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-error-clay" />
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    delta >= 0 ? "text-balanced-green" : "text-error-clay",
                  )}
                >
                  {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {deltaLabel || "vs last week"}
                </span>
              </div>
            )}
          </div>
          {chartData && chartData.length > 1 && (
            <Sparkline data={chartData} color={chartColor} width={100} />
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// ─── Support Tickets Card ───────────────────────────────────────────────────

function SupportTicketsCard({
  total,
  bySeverity,
}: {
  total: number;
  bySeverity: Record<string, number>;
}) {
  const maxSeverity = Math.max(
    bySeverity.high ?? 0,
    bySeverity.medium ?? 0,
    bySeverity.low ?? 0,
    1,
  );

  return (
    <Card className="h-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Open Support Tickets
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight mb-4">{total}</p>

        <div className="space-y-3">
          {[
            {
              label: "High",
              value: bySeverity.high ?? 0,
              color: "bg-error-clay",
            },
            {
              label: "Medium",
              value: bySeverity.medium ?? 0,
              color: "bg-attention-amber",
            },
            {
              label: "Low",
              value: bySeverity.low ?? 0,
              color: "bg-balanced-green",
            },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
                <span className="text-xs font-medium">{item.value}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    item.color,
                  )}
                  style={{
                    width: `${maxSeverity > 0 ? (item.value / maxSeverity) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-all duration-300 mt-4 group">
          View all tickets
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Top Models Card ────────────────────────────────────────────────────────

function TopModelsCard({
  models,
}: {
  models: { modelName: string; percentage: number; runs: number }[];
}) {
  const maxRuns = Math.max(...models.map((m) => m.runs), 1);

  return (
    <Card className="h-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">
          Top AI Models by Usage
        </CardTitle>
        <Badge variant="secondary" className="text-[10px]">
          Last 7 days
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {models.map((model) => (
            <div key={model.modelName} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {model.modelName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {model.percentage.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {model.runs.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-signal-indigo transition-all"
                  style={{
                    width: `${maxRuns > 0 ? (model.runs / maxRuns) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-all duration-300 mt-4 group">
          View model analytics
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Activity Feed Card ─────────────────────────────────────────────────────

function ActivityFeedCard({
  activities,
}: {
  activities: {
    id: string;
    activityType: string;
    title: string;
    entityName: string | null;
    createdAt: Date | string;
  }[];
}) {
  const activityIcons: Record<
    string,
    { icon: React.ReactNode; color: string; bg: string }
  > = {
    bank_reconciliation: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-balanced-green",
      bg: "bg-balanced-green/10",
    },
    ai_model_updated: {
      icon: <Bot className="h-4 w-4" />,
      color: "text-signal-indigo",
      bg: "bg-signal-indigo/10",
    },
    organization_created: {
      icon: <Users className="h-4 w-4" />,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    error_detected: {
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-attention-amber",
      bg: "bg-attention-amber/10",
    },
    invoice_processed: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-balanced-green",
      bg: "bg-balanced-green/10",
    },
  };

  function timeAgo(date: Date | string): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  return (
    <Card className="transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
        <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-all duration-300 group">
          View all activity
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {activities.map((activity) => {
            const style = activityIcons[activity.activityType] ?? {
              icon: <Activity className="h-4 w-4" />,
              color: "text-muted-foreground",
              bg: "bg-muted",
            };

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 min-w-[200px] p-3 rounded-lg border border-border/50 bg-muted/30"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    style.bg,
                    style.color,
                  )}
                >
                  {style.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.title}
                  </p>
                  {activity.entityName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.entityName}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {timeAgo(activity.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Page ────────────────────────────────────────────────────

export default function OpsDashboardPage() {
  const [timeRange, _setTimeRange] = useState(7);

  // Fetch all dashboard data
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = trpc.opsConsole.getDashboardOverview.useQuery({ days: timeRange });

  const { data: aiRunsData, error: aiRunsError } =
    trpc.opsConsole.getAiRunsOverTime.useQuery({
      days: timeRange,
    });

  const { data: costData, error: costError } =
    trpc.opsConsole.getCostOverTime.useQuery({
      days: timeRange,
    });

  const { data: topModels, error: topModelsError } =
    trpc.opsConsole.getTopModels.useQuery({
      days: timeRange,
    });

  const { data: activityFeed, error: activityFeedError } =
    trpc.opsConsole.getActivityFeed.useQuery({
      limit: 10,
    });

  // Chart data for KPI sparklines
  const sparklineData = useMemo(() => {
    if (!overview?.chartData)
      return { orgs: [], mrr: [], aiRuns: [], cost: [], margin: [] };
    return {
      orgs: overview.chartData.map((d) => d.activeOrgs),
      mrr: overview.chartData.map((d) => d.mrr),
      aiRuns: overview.chartData.map((d) => d.aiRuns),
      cost: overview.chartData.map((d) => d.totalCost),
      margin: overview.chartData.map((d) => d.grossMargin),
    };
  }, [overview?.chartData]);

  if (overviewLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-56 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (overviewError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-error-clay mb-4" />
        <h2 className="text-lg font-semibold mb-2">Failed to load dashboard</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          We couldn't load the dashboard data. Check your connection and try
          again.
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="transition-all duration-300 hover:shadow-md active:scale-[0.98]"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Operations Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time overview of Xenboox platform health and business metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {(() => {
                const end = new Date();
                const start = new Date(end.getTime() - timeRange * 86400000);
                const fmt = (d: Date) =>
                  d.toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  });
                return `${fmt(start)} – ${fmt(end)}`;
              })()}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="transition-all duration-300 hover:shadow-md active:scale-[0.98]"
          >
            <Settings className="h-4 w-4 mr-1" />
            Customize
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          iconColor="text-signal-indigo"
          iconBg="bg-signal-indigo/10"
          label="Active Organizations"
          value={
            overview?.kpis.activeOrganizations.value?.toLocaleString() ?? "0"
          }
          delta={overview?.kpis.activeOrganizations.delta ?? 0}
          chartData={sparklineData.orgs}
          chartColor="rgb(139, 92, 246)"
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          iconColor="text-balanced-green"
          iconBg="bg-balanced-green/10"
          label="MRR"
          tooltip="Monthly Recurring Revenue — predictable revenue from subscriptions"
          value={overview?.kpis.mrr.displayValue ?? "GMD 0"}
          delta={overview?.kpis.mrr.delta ?? 0}
          chartData={sparklineData.mrr}
          chartColor="rgb(16, 185, 129)"
        />
        <KpiCard
          icon={<Bot className="h-4 w-4" />}
          iconColor="text-signal-indigo"
          iconBg="bg-signal-indigo/10"
          label="AI Runs"
          value={overview?.kpis.aiRuns.value?.toLocaleString() ?? "0"}
          delta={overview?.kpis.aiRuns.delta ?? 0}
          chartData={sparklineData.aiRuns}
          chartColor="rgb(139, 92, 246)"
        />
        <KpiCard
          icon={<CreditCard className="h-4 w-4" />}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          label="Total Cost"
          value={overview?.kpis.totalCost.displayValue ?? "GMD 0"}
          delta={overview?.kpis.totalCost.delta ?? 0}
          chartData={sparklineData.cost}
          chartColor="rgb(59, 130, 246)"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          iconColor="text-signal-indigo"
          iconBg="bg-signal-indigo/10"
          label="Gross Margin"
          tooltip="Revenue minus operating costs, shown as a percentage"
          value={overview?.kpis.grossMargin.displayValue ?? "0%"}
          delta={overview?.kpis.grossMargin.delta ?? 0}
          chartData={sparklineData.margin}
          chartColor="rgb(139, 92, 246)"
        />
      </div>

      {/* Second Row: System Health + AI Metrics */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
        {/* System Health */}
        <SystemHealthCard
          allOperational={overview?.systemHealth.allOperational ?? true}
          uptimePercent={overview?.systemHealth.uptimePercent ?? "100"}
          services={overview?.systemHealth.services ?? []}
        />

        {/* AI Non-Success Rate */}
        <AiMetricCard
          title="AI Non-Success Rate"
          value={
            overview?.aiMetrics.successRate
              ? (100 - parseFloat(overview.aiMetrics.successRate)).toFixed(1)
              : "0"
          }
          unit="%"
          delta={1.3}
          chartData={overview?.chartData.map((d) => 100 - d.aiSuccessRate)}
          chartColor="rgb(16, 185, 129)"
        >
          <div className="text-xs text-muted-foreground">
            {overview?.aiMetrics.successRate ?? "0"}% success rate
          </div>
        </AiMetricCard>

        {/* Avg Response Time */}
        <AiMetricCard
          title="Avg. Response Time"
          value={
            overview?.aiMetrics.avgResponseTime
              ? (
                  parseFloat(String(overview.aiMetrics.avgResponseTime)) / 1000
                ).toFixed(2)
              : "0"
          }
          unit="s"
          delta={0.3}
          chartData={overview?.chartData.map((d) => d.avgResponseTimeMs / 1000)}
          chartColor="rgb(59, 130, 246)"
        />

        {/* Support Tickets */}
        <SupportTicketsCard
          total={overview?.supportTickets.total ?? 0}
          bySeverity={overview?.supportTickets.bySeverity ?? {}}
        />
      </div>

      {/* Third Row: Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* AI Runs Over Time */}
        <Card className="transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              AI Runs Over Time
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              Last 7 days
            </Badge>
          </CardHeader>
          <CardContent>
            {(aiRunsData ?? []).length > 0 ? (
              <div className="h-48 flex items-end gap-1">
                {(aiRunsData ?? []).map((d, _i) => {
                  const maxRuns = Math.max(
                    ...(aiRunsData ?? []).map((r) => r.runs),
                    1,
                  );
                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-full bg-signal-indigo/20 rounded-t transition-all hover:bg-signal-indigo/30"
                        style={{
                          height: `${(d.runs / maxRuns) * 160}px`,
                          minHeight: "4px",
                        }}
                      />
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(d.date).toLocaleDateString("en", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                <Bot className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No AI runs yet</p>
                <p className="text-xs">
                  Data will appear here once agents start processing.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">0</span>
              <span className="text-xs text-muted-foreground">
                {Math.max(
                  ...(aiRunsData ?? []).map((r) => r.runs),
                  0,
                ).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cost Over Time */}
        <Card className="transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              Cost Over Time (GMD)
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              Last 7 days
            </Badge>
          </CardHeader>
          <CardContent>
            {(costData ?? []).length > 0 ? (
              <div className="h-48 flex items-end gap-1">
                {(costData ?? []).map((d) => {
                  const maxCost = Math.max(
                    ...(costData ?? []).map((c) => c.cost),
                    1,
                  );
                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-full bg-gradient-to-t from-balanced-green/30 to-balanced-green/10 rounded-t transition-all hover:from-balanced-green/40 hover:to-balanced-green/20"
                        style={{
                          height: `${(d.cost / maxCost) * 160}px`,
                          minHeight: "4px",
                        }}
                      />
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(d.date).toLocaleDateString("en", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                <DollarSign className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No cost data yet</p>
                <p className="text-xs">
                  Cost tracking will appear here once AI processes transactions.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">0</span>
              <span className="text-xs text-muted-foreground">
                GMD{" "}
                {Math.max(
                  ...(costData ?? []).map((c) => c.cost),
                  0,
                ).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top AI Models */}
        <TopModelsCard models={topModels ?? []} />
      </div>

      {/* Activity Feed */}
      <ActivityFeedCard activities={activityFeed?.items ?? []} />
    </div>
  );
}
