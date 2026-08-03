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
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Filter,
  Download,
  TrendingUp,
  AlertTriangle,
  Info,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  delta,
  inverted,
}: {
  label: string;
  value: string;
  delta: number;
  inverted?: boolean;
}) {
  const isPositive = delta >= 0;
  const color = inverted
    ? isPositive
      ? "text-red-500"
      : "text-emerald-500"
    : isPositive
      ? "text-emerald-500"
      : "text-red-500";

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
        <p className="text-xl font-bold tracking-tight mt-1">{value}</p>
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <ArrowUpRight className={cn("h-3 w-3", color)} />
          ) : (
            <ArrowDownRight className={cn("h-3 w-3", color)} />
          )}
          <span className={cn("text-xs font-medium", color)}>
            {isPositive ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-[10px] text-muted-foreground">
            vs prior 7 days
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Line Chart ─────────────────────────────────────────────────────────────

function TokenLineChart({
  data,
}: {
  data: { date: string; inputTokens: number; outputTokens: number }[];
}) {
  if (data.length === 0) return null;
  const width = 650,
    height = 220,
    pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const cw = width - pad.left - pad.right,
    ch = height - pad.top - pad.bottom;
  const maxVal = Math.max(
    ...data.map((d) => d.inputTokens + d.outputTokens),
    1,
  );
  const yScale = (v: number) => ch - (v / maxVal) * ch;
  const xScale = (i: number) => (i / (data.length - 1 || 1)) * cw;

  function makePath(key: "inputTokens" | "outputTokens") {
    return data
      .map((d, i) => `${pad.left + xScale(i)},${pad.top + yScale(d[key])}`)
      .join(" L");
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
    >
      {[0, 0.25, 0.5, 0.75, 1].map((p) => {
        const y = pad.top + yScale(maxVal * p);
        return (
          <g key={p}>
            <line
              x1={pad.left}
              y1={y}
              x2={width - pad.right}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.05}
            />
            <text
              x={pad.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[9px]"
            >
              {((maxVal * p) / 1000000000).toFixed(1)}B
            </text>
          </g>
        );
      })}
      {data.map((d, i) => (
        <text
          key={d.date}
          x={pad.left + xScale(i)}
          y={height - 8}
          textAnchor="middle"
          className="fill-muted-foreground text-[9px]"
        >
          {new Date(d.date).toLocaleDateString("en", {
            month: "short",
            day: "numeric",
          })}
        </text>
      ))}
      <polyline
        fill="none"
        stroke="#8b5cf6"
        strokeWidth={2}
        points={makePath("inputTokens")}
      />
      <polyline
        fill="none"
        stroke="#10b981"
        strokeWidth={2}
        points={makePath("outputTokens")}
      />
    </svg>
  );
}

// ─── Donut Chart ────────────────────────────────────────────────────────────

function DonutChart({
  segments,
  total,
  totalLabel,
}: {
  segments: { name: string; percentage: string; tokens: string }[];
  total: string;
  totalLabel: string;
}) {
  const colors = [
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#3b82f6",
    "#ef4444",
    "#94a3b8",
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Tokens by Model (7d)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              {segments.map((s, i) => {
                const offset = segments
                  .slice(0, i)
                  .reduce((sum, x) => sum + parseFloat(x.percentage), 0);
                const circ = 2 * Math.PI * 15.9155;
                const dash = (parseFloat(s.percentage) / 100) * circ;
                return (
                  <circle
                    key={s.name}
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke={colors[i % colors.length]}
                    strokeWidth="3.5"
                    strokeDasharray={`${dash} ${circ - dash}`}
                    strokeDashoffset={-(offset / 100) * circ}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold">{total}</span>
              <span className="text-[10px] text-muted-foreground">
                {totalLabel}
              </span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            {segments.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colors[i % colors.length] }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {s.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{s.percentage}%</span>
                  <span className="text-[10px] text-muted-foreground w-12 text-right">
                    {s.tokens}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 mt-3">
          View all models <ChevronRight className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Horizontal Bar List ────────────────────────────────────────────────────

function HorizontalBarList({
  title,
  items,
  maxTokens,
}: {
  title: string;
  items: { name: string; tokens: string; percentage: string; runs?: number }[];
  maxTokens: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <button className="text-xs font-medium text-primary hover:text-primary/80">
          View all
        </button>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                {item.name}
              </span>
              <div className="flex items-center gap-2">
                {item.runs !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {item.runs}
                  </span>
                )}
                <span className="text-xs font-medium">{item.tokens}</span>
                <span className="text-[10px] text-muted-foreground w-10 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Insights Card ──────────────────────────────────────────────────────────

function InsightsCard({
  insights,
}: {
  insights: {
    type: string;
    title: string;
    description: string;
    badge: string;
  }[];
}) {
  const icons: Record<string, React.ReactNode> = {
    increase: <TrendingUp className="h-4 w-4 text-emerald-500" />,
    attention: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    info: <Info className="h-4 w-4 text-blue-500" />,
  };
  const badgeStyles: Record<string, string> = {
    Increase: "bg-emerald-100 text-emerald-700",
    Attention: "bg-amber-100 text-amber-700",
    Info: "bg-blue-100 text-blue-700",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">
          Token Usage Insights
        </CardTitle>
        <button className="text-xs font-medium text-primary hover:text-primary/80">
          View all insights →
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5">
              {icons[insight.type] ?? <Info className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{insight.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {insight.description}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={cn("text-[10px]", badgeStyles[insight.badge])}
            >
              {insight.badge}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function TokenUsagePage() {
  const [timeRange] = useState(7);
  const { data, isLoading } = trpc.tokenUsage.getOverview.useQuery({
    days: timeRange,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-80" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 text-sm font-bold">
              5
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Token Usage Dashboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor token consumption across models, organizations, and time.
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

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Total Tokens (7d)"
          value={data?.kpis.totalTokens.display ?? "0"}
          delta={data?.kpis.totalTokens.delta ?? 0}
        />
        <KpiCard
          label="Input Tokens (7d)"
          value={data?.kpis.inputTokens.display ?? "0"}
          delta={data?.kpis.inputTokens.delta ?? 0}
        />
        <KpiCard
          label="Output Tokens (7d)"
          value={data?.kpis.outputTokens.display ?? "0"}
          delta={data?.kpis.outputTokens.delta ?? 0}
        />
        <KpiCard
          label="Total Cost (7d)"
          value={data?.kpis.totalCost.display ?? "$0"}
          delta={data?.kpis.totalCost.delta ?? 0}
        />
        <KpiCard
          label="Avg. Tokens / Run"
          value={data?.kpis.avgTokensPerRun.display ?? "0"}
          delta={data?.kpis.avgTokensPerRun.delta ?? 0}
          inverted
        />
        <KpiCard
          label="Context Window Used (Avg)"
          value={data?.kpis.contextWindowUsed.display ?? "0%"}
          delta={data?.kpis.contextWindowUsed.delta ?? 0}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              Token Usage Over Time
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              Daily
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                <span className="text-[10px] text-muted-foreground">
                  Input Tokens
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-muted-foreground">
                  Output Tokens
                </span>
              </div>
            </div>
            <TokenLineChart data={data?.tokenOverTime ?? []} />
          </CardContent>
        </Card>
        <DonutChart
          segments={data?.modelBreakdown ?? []}
          total={data?.kpis.totalTokens.display ?? "0"}
          totalLabel="Total Tokens"
        />
        <HorizontalBarList
          title="Tokens by Organization (7d)"
          items={data?.orgBreakdown ?? []}
          maxTokens={data?.kpis.totalTokens.value ?? 0}
        />
      </div>

      {/* Tables Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Model Usage Details */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Model Usage Details (7d)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    {[
                      "Model",
                      "Provider",
                      "Runs",
                      "Input Tokens",
                      "Output Tokens",
                      "Total Tokens",
                      "Cost",
                      "Avg. Tokens / Run",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left text-[10px] font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.modelDetails.map((m) => (
                    <tr
                      key={m.modelName}
                      className="border-b border-border/50 hover:bg-muted/50"
                    >
                      <td className="px-3 py-2.5 text-xs font-medium">
                        {m.modelName}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {m.provider}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right">
                        {m.runs.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right">
                        {m.inputTokens}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right">
                        {m.outputTokens}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right font-medium">
                        {m.totalTokens}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right">
                        {m.costUsd}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right text-muted-foreground">
                        {m.avgTokensPerRun}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border/50">
              <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
                View all models <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Top Token Consumers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              Top Token Consumers (Agents) (7d)
            </CardTitle>
            <button className="text-xs font-medium text-primary hover:text-primary/80">
              View all agents →
            </button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.agentBreakdown.map((a) => (
              <div key={a.name} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {a.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {a.runs}
                  </span>
                  <span className="text-xs font-medium">{a.tokensDisplay}</span>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">
                    {a.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Context Window + Insights */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Token Usage by Context Window (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {(data?.contextBreakdown ?? []).map((c, i) => {
                    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];
                    const offset = (data?.contextBreakdown ?? [])
                      .slice(0, i)
                      .reduce((sum, x) => sum + parseFloat(x.percentage), 0);
                    const circ = 2 * Math.PI * 15.9155;
                    const dash = (parseFloat(c.percentage) / 100) * circ;
                    return (
                      <circle
                        key={c.bucket}
                        cx="18"
                        cy="18"
                        r="15.9155"
                        fill="none"
                        stroke={colors[i % colors.length]}
                        strokeWidth="3.5"
                        strokeDasharray={`${dash} ${circ - dash}`}
                        strokeDashoffset={-(offset / 100) * circ}
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">
                    {data?.kpis.totalTokens.display}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Total Tokens
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {data?.contextBreakdown.map((c, i) => {
                  const colors = [
                    "bg-emerald-500",
                    "bg-blue-500",
                    "bg-amber-500",
                    "bg-red-500",
                  ];
                  return (
                    <div
                      key={c.bucket}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            colors[i % colors.length],
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {c.bucket}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">
                          {c.tokensDisplay}
                        </span>
                        <span className="text-[10px] text-muted-foreground w-10 text-right">
                          {c.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
        <InsightsCard insights={data?.insights ?? []} />
      </div>

      {/* Footer Note */}
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
        <Info className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Token usage is updated every 15 minutes. Costs are estimated based on
          provider pricing and may not reflect final invoices.
        </span>
      </div>
    </div>
  );
}
