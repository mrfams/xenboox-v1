"use client";

import { useState } from "react";
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
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Filter,
  Download,
  AlertTriangle,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── KPI Card with Sparkline ────────────────────────────────────────────────

function KpiCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  delta,
  deltaLabel,
  inverted,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  delta: number;
  deltaLabel?: string;
  inverted?: boolean;
}) {
  const isPositive = delta >= 0;
  const deltaColor = inverted
    ? isPositive
      ? "text-red-500"
      : "text-emerald-500"
    : isPositive
      ? "text-emerald-500"
      : "text-red-500";

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg",
              iconBg,
            )}
          >
            <div className={iconColor}>{icon}</div>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        <p className="text-xl font-bold tracking-tight">{value}</p>
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <ArrowUpRight className={cn("h-3 w-3", deltaColor)} />
          ) : (
            <ArrowDownRight className={cn("h-3 w-3", deltaColor)} />
          )}
          <span className={cn("text-xs font-medium", deltaColor)}>
            {isPositive ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-[10px] text-muted-foreground">
            {deltaLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Stacked Area Chart ─────────────────────────────────────────────────────

function StackedAreaChart({
  data,
  height = 280,
}: {
  data: {
    date: string;
    anthropic: number;
    openai: number;
    google: number;
    azure: number;
    other: number;
  }[];
  height?: number;
}) {
  if (data.length === 0) return null;

  const width = 700;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate totals per day
  const totals = data.map(
    (d) => d.anthropic + d.openai + d.google + d.azure + d.other,
  );
  const maxTotal = Math.max(...totals, 1);

  // Y-axis scale
  const yScale = (value: number) =>
    chartHeight - (value / maxTotal) * chartHeight;

  // X-axis scale
  const xScale = (i: number) => (i / (data.length - 1 || 1)) * chartWidth;

  const providers = [
    { key: "other" as const, color: "#94a3b8" },
    { key: "azure" as const, color: "#3b82f6" },
    { key: "google" as const, color: "#f59e0b" },
    { key: "openai" as const, color: "#10b981" },
    { key: "anthropic" as const, color: "#8b5cf6" },
  ];

  // Build stacked paths
  function buildAreaPath(
    providerKey: keyof (typeof data)[0],
    prevKey?: string,
  ) {
    const points: string[] = [];
    const bottomPoints: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const x = padding.left + xScale(i);
      let cumulativeTop = 0;
      let cumulativeBottom = 0;
      for (const p of providers) {
        const val = (data[i] as unknown as Record<string, number>)[p.key] ?? 0;
        if (p.key === providerKey) {
          cumulativeTop += val;
          break;
        }
        cumulativeBottom += val;
        cumulativeTop += val;
      }

      points.push(`${x},${padding.top + yScale(cumulativeTop)}`);
      bottomPoints.unshift(`${x},${padding.top + yScale(cumulativeBottom)}`);
    }

    return `M${points.join(" L")} L${bottomPoints.join(" L")} Z`;
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
      >
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const value = maxTotal * pct;
          const y = padding.top + yScale(value);
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.05}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                ${(value / 1000).toFixed(1)}K
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={d.date}
            x={padding.left + xScale(i)}
            y={height - 10}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {new Date(d.date).toLocaleDateString("en", {
              month: "short",
              day: "numeric",
            })}
          </text>
        ))}

        {/* Areas */}
        {providers.map((p) => (
          <path
            key={p.key}
            d={buildAreaPath(p.key)}
            fill={p.color}
            fillOpacity={0.3}
            stroke={p.color}
            strokeWidth={2}
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {providers.map((p) => (
          <div key={p.key} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-[10px] text-muted-foreground capitalize">
              {p.key === "google"
                ? "Google Vertex AI"
                : p.key === "azure"
                  ? "Azure OpenAI"
                  : p.key}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cost Breakdown Donut ───────────────────────────────────────────────────

function CostBreakdownDonut({
  breakdown,
  total,
}: {
  breakdown: { name: string; cost: number; percentage: string }[];
  total: number;
}) {
  const colors = ["#8b5cf6", "#10b981", "#f59e0b", "#3b82f6", "#94a3b8"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">
          Cost Breakdown (7d)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              {breakdown.map((item, i) => {
                const offset = breakdown
                  .slice(0, i)
                  .reduce((sum, d) => sum + parseFloat(d.percentage), 0);
                const circumference = 2 * Math.PI * 15.9155;
                const dashArray =
                  (parseFloat(item.percentage) / 100) * circumference;
                const dashOffset = -(offset / 100) * circumference;
                return (
                  <circle
                    key={item.name}
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke={colors[i % colors.length]}
                    strokeWidth="3.5"
                    strokeDasharray={`${dashArray} ${circumference - dashArray}`}
                    strokeDashoffset={dashOffset}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold">
                $
                {total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-[10px] text-muted-foreground">Total</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {breakdown.map((item, i) => (
              <div
                key={item.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colors[i % colors.length] }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium">
                    $
                    {item.cost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors mt-4">
          View full cost breakdown
          <ChevronRight className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Cost by Organization Card ──────────────────────────────────────────────

function CostByOrgCard({
  orgs,
}: {
  orgs: {
    name: string;
    runs: number;
    costUsdDisplay: string;
    percentage: string;
  }[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">
          Cost by Organization (7d)
        </CardTitle>
        <button className="text-xs font-medium text-primary hover:text-primary/80">
          View all
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        {orgs.map((org) => (
          <div key={org.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{org.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {org.runs}
                </span>
                <span className="text-xs font-medium">
                  {org.costUsdDisplay}
                </span>
                <span className="text-[10px] text-muted-foreground w-10 text-right">
                  {org.percentage}%
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500"
                style={{ width: `${org.percentage}%` }}
              />
            </div>
          </div>
        ))}
        <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          View all organizations
          <ChevronRight className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Cost Drivers Card ──────────────────────────────────────────────────────

function CostDriversCard({
  drivers,
}: {
  drivers: { name: string; percentage: string | number }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Top Cost Drivers (7d)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {drivers.map((d) => (
          <div key={d.name} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{d.name}</span>
            <span className="text-xs font-medium">{d.percentage}%</span>
          </div>
        ))}
        <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          View analysis
          <ChevronRight className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Optimization Card ──────────────────────────────────────────────────────

function OptimizationCard({
  optimizations,
}: {
  optimizations: { recommendation: string; savings: string; period: string }[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">
          Cost Optimization Opportunities
        </CardTitle>
        <Badge
          variant="secondary"
          className="text-[10px] bg-emerald-100 text-emerald-700"
        >
          Potential Savings
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {optimizations.map((o) => (
          <div
            key={o.recommendation}
            className="flex items-center justify-between"
          >
            <span className="text-xs text-muted-foreground">
              {o.recommendation}
            </span>
            <span className="text-xs font-medium text-emerald-600">
              {o.savings} / {o.period}
            </span>
          </div>
        ))}
        <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          View all recommendations
          <ChevronRight className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AiCostAnalyticsPage() {
  const [timeRange, _setTimeRange] = useState(7);
  const [chartView, setChartView] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );

  const { data, isLoading } = trpc.costAnalytics.getOverview.useQuery({
    days: timeRange,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-80" />
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            AI Cost Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track, analyze, and optimize AI spend across your platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
            <span className="text-sm text-muted-foreground">
              May 10 – May 16, 2025
            </span>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          iconBg="bg-violet-500/10"
          iconColor="text-violet-500"
          label="Total AI Cost (7d)"
          value={data?.kpis.totalCost7d.display ?? "$0"}
          delta={data?.kpis.totalCost7d.delta ?? 0}
          deltaLabel="vs prior 7 days"
          inverted
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
          label="Total Cost (30d)"
          value={data?.kpis.totalCost30d.display ?? "$0"}
          delta={data?.kpis.totalCost30d.delta ?? 0}
          deltaLabel="vs prior 30 days"
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
          label="Total Cost (MTD)"
          value={data?.kpis.totalCostMtd.display ?? "$0"}
          delta={data?.kpis.totalCostMtd.delta ?? 0}
          deltaLabel="vs prior MTD"
          inverted
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500"
          label="Cost / 1M Tokens"
          value={data?.kpis.costPerMillionTokens.display ?? "$0"}
          delta={data?.kpis.costPerMillionTokens.delta ?? 0}
          deltaLabel="vs prior 7 days"
          inverted
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
          label="Total Tokens (7d)"
          value={data?.kpis.totalTokens7d.display ?? "0"}
          delta={data?.kpis.totalTokens7d.delta ?? 0}
          deltaLabel="vs prior 7 days"
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          iconBg="bg-violet-500/10"
          iconColor="text-violet-500"
          label="Avg. Cost / Run"
          value={data?.kpis.avgCostPerRun.display ?? "$0"}
          delta={data?.kpis.avgCostPerRun.delta ?? 0}
          deltaLabel="vs prior 7 days"
          inverted
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Cost Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              AI Cost Over Time
            </CardTitle>
            <div className="flex gap-1 rounded-lg bg-muted p-0.5">
              {(["daily", "weekly", "monthly"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setChartView(view)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize",
                    chartView === view
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {view}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <StackedAreaChart data={data?.costOverTime ?? []} />
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <CostBreakdownDonut
          breakdown={data?.costBreakdown ?? []}
          total={data?.kpis.totalCost7d.value ?? 0}
        />
      </div>

      {/* Cost by Model + Cost by Org */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Cost by Model Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Cost by Model (7d)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Model
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                      Requests
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                      Input Tokens
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                      Output Tokens
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                      Total Tokens
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                      Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                      Cost / 1M Tokens
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.costByModel.map((m) => (
                    <tr
                      key={m.modelName}
                      className="border-b border-border/50 hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {m.modelName}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {m.provider}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {m.requests.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {m.inputTokens}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {m.outputTokens}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {m.totalTokens}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {m.costUsdDisplay}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                        {m.costPerMillionTokens}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border/50">
              <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                View all models
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Cost by Organization */}
        <CostByOrgCard orgs={data?.costByOrganization ?? []} />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <CostDriversCard drivers={data?.costDrivers ?? []} />
        <OptimizationCard optimizations={data?.optimizations ?? []} />
      </div>

      {/* Footer Note */}
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Costs are estimated based on provider pricing and may not reflect
          final invoices.
        </span>
        <button className="ml-auto text-xs font-medium text-primary hover:text-primary/80">
          Learn more about cost calculations →
        </button>
      </div>
    </div>
  );
}
