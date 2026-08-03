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
  AlertTriangle,
  Clock,
  HeartHandshake,
  Star,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
  Filter,
  Download,
  Activity,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  delta,
  deltaLabel,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  delta: number;
  deltaLabel?: string;
}) {
  const isPositive = delta >= 0;
  const isGood =
    label.includes("Resolve") || label.includes("Satisfaction")
      ? !isPositive
      : isPositive;
  const deltaColor = isGood ? "text-emerald-500" : "text-red-500";

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
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
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <div className="flex items-center gap-1 mt-1">
            {isPositive ? (
              <TrendingUp className={cn("h-3 w-3", deltaColor)} />
            ) : (
              <TrendingDown className={cn("h-3 w-3", deltaColor)} />
            )}
            <span className={cn("text-xs font-medium", deltaColor)}>
              {isPositive ? "↑" : "↓"} {Math.abs(delta)}%
            </span>
            <span className="text-xs text-muted-foreground">
              {deltaLabel || "vs prior 7 days"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Donut Chart Component ──────────────────────────────────────────────────

function DonutChart({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: {
    name: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  centerValue: string;
  centerLabel: string;
}) {
  const radius = 60;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercentage = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg width={160} height={160}>
          {segments.map((segment, i) => {
            const segmentLength = (segment.percentage / 100) * circumference;
            const dashOffset = -(accumulatedPercentage / 100) * circumference;
            accumulatedPercentage += segment.percentage;

            return (
              <circle
                key={i}
                cx={80}
                cy={80}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 80 80)"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{centerValue}</span>
          <span className="text-xs text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-sm text-muted-foreground">
              {segment.name}
            </span>
            <span className="text-sm font-medium ml-auto">{segment.count}</span>
            <span className="text-xs text-muted-foreground w-12 text-right">
              {segment.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Line Chart Component ───────────────────────────────────────────────────

function LineChart({
  data,
  lines,
}: {
  data: {
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }[];
  lines: { key: string; color: string; label: string }[];
}) {
  const width = 500;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find min/max values
  const allValues = data.flatMap((d) => {
    if (d.date && typeof d.date === "string") {
      return lines.map(
        (l) => ((d as Record<string, number | string>)[l.key] as number) ?? 0,
      );
    }
    return [0];
  });
  const maxValue = Math.max(...allValues, 50);
  const minValue = 0;

  const getX = (index: number) =>
    padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (value: number) =>
    padding.top +
    chartHeight -
    ((value - minValue) / (maxValue - minValue)) * chartHeight;

  return (
    <div className="relative">
      <svg width={width} height={height} className="w-full">
        {/* Y-axis labels */}
        {[0, 10, 20, 30, 40, 50].map((value) => (
          <g key={value}>
            <text
              x={padding.left - 10}
              y={getY(value) + 4}
              textAnchor="end"
              className="text-[10px] fill-muted-foreground"
            >
              {value}
            </text>
            <line
              x1={padding.left}
              y1={getY(value)}
              x2={width - padding.right}
              y2={getY(value)}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="2 2"
            />
          </g>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={getX(i)}
            y={height - 10}
            textAnchor="middle"
            className="text-[9px] fill-muted-foreground"
          >
            {new Date(d.date).toLocaleDateString("en", {
              month: "short",
              day: "numeric",
            })}
          </text>
        ))}

        {/* Lines */}
        {lines.map((line) => {
          const points = data
            .map((d, i) => {
              const value =
                ((d as Record<string, number | string>)[line.key] as number) ??
                0;
              return `${getX(i)},${getY(value)}`;
            })
            .join(" ");
          return (
            <polyline
              key={line.key}
              fill="none"
              stroke={line.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4">
        {lines.map((line) => (
          <div key={line.key} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: line.color }}
            />
            <span className="text-xs text-muted-foreground">{line.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Horizontal Bar Chart Component ─────────────────────────────────────────

function HorizontalBarChart({
  items,
  maxCount,
}: {
  items: { name: string; count: number }[];
  maxCount: number;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{item.name}</span>
            <span className="text-sm font-medium">{item.count}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Status Badge Component ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    investigating: "bg-red-100 text-red-700",
    identified: "bg-amber-100 text-amber-700",
    monitoring: "bg-blue-100 text-blue-700",
    resolved: "bg-emerald-100 text-emerald-700",
    closed: "bg-gray-100 text-gray-700",
  };

  return (
    <Badge
      variant="secondary"
      className={colors[status] || colors.investigating}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function CustomerDiagnosticsPage() {
  const [timeRange] = useState(7);

  // Fetch all data
  const { data: overview, isLoading } =
    trpc.customerDiagnostics.getOverview.useQuery({
      days: timeRange,
    });

  // Seed demo data mutation
  const seedMutation = trpc.customerDiagnostics.seedDemoData.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const categorySegments = useMemo(() => {
    if (!overview?.issuesByCategory) return [];
    const colors = [
      "#6366f1",
      "#3b82f6",
      "#22c55e",
      "#f59e0b",
      "#ef4444",
      "#9ca3af",
    ];
    return overview.issuesByCategory.map(
      (
        c: { category: string; count: number; percentage: number },
        i: number,
      ) => ({
        name: c.category
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase()),
        count: c.count,
        percentage: c.percentage,
        color: colors[i % colors.length],
      }),
    );
  }, [overview?.issuesByCategory]);

  const slaSegments = useMemo(() => {
    if (!overview?.issueResolutionSla) return [];
    return [
      {
        name: "Met SLA",
        count: overview.issueResolutionSla.metSlaCount,
        percentage: overview.issueResolutionSla.metSlaPercentage,
        color: "#22c55e",
      },
      {
        name: "Breached",
        count: overview.issueResolutionSla.breachedSlaCount,
        percentage: 100 - overview.issueResolutionSla.metSlaPercentage,
        color: "#ef4444",
      },
    ];
  }, [overview?.issueResolutionSla]);

  const lineData = useMemo(() => {
    if (!overview?.issuesOverTime) return [];
    return overview.issuesOverTime.map(
      (d: {
        date: string;
        critical: number;
        high: number;
        medium: number;
        low: number;
      }) => ({
        date: d.date,
        critical: d.critical,
        high: d.high,
        medium: d.medium,
        low: d.low,
      }),
    );
  }, [overview?.issuesOverTime]);

  const maxWorkflowCount = Math.max(
    ...(overview?.topImpactedWorkflows?.map(
      (w: { count: number }) => w.count,
    ) ?? [1]),
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">8</span>
            <h1 className="text-2xl font-bold tracking-tight">
              Customer Diagnostics
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor customer issues, agent performance, and system health by
            organization.
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
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button
            onClick={() => seedMutation.mutate()}
            variant="outline"
            size="sm"
          >
            Seed Data
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          iconColor="text-purple-600"
          iconBg="bg-purple-100"
          label="Affected Organizations"
          value={overview?.kpis?.affectedOrganizations ?? 0}
          delta={overview?.kpis?.affectedOrgsDelta ?? 0}
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4" />}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
          label="Active Issues"
          value={overview?.kpis?.activeIssues ?? 0}
          delta={overview?.kpis?.activeIssuesDelta ?? 0}
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4" />}
          iconColor="text-red-600"
          iconBg="bg-red-100"
          label="Critical Issues"
          value={overview?.kpis?.criticalIssues ?? 0}
          delta={overview?.kpis?.criticalIssuesDelta ?? 0}
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
          label="Mean Time to Resolve"
          value={overview?.kpis?.meanTimeToResolve ?? "0h 0m"}
          delta={overview?.kpis?.mttrDelta ?? 0}
        />
        <KpiCard
          icon={<HeartHandshake className="h-4 w-4" />}
          iconColor="text-violet-600"
          iconBg="bg-violet-100"
          label="Customer Impacted"
          value={overview?.kpis?.customerImpacted?.toLocaleString() ?? "0"}
          delta={overview?.kpis?.customerImpactedDelta ?? 0}
        />
        <KpiCard
          icon={<Star className="h-4 w-4" />}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
          label="Satisfaction Score"
          value={`${overview?.kpis?.satisfactionScore ?? 0} / 5`}
          delta={overview?.kpis?.satisfactionDelta ?? 0}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Issues Over Time */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              Issues Over Time
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              7D
            </Badge>
          </CardHeader>
          <CardContent>
            <LineChart
              data={lineData}
              lines={[
                { key: "critical", color: "#ef4444", label: "Critical" },
                { key: "high", color: "#f59e0b", label: "High" },
                { key: "medium", color: "#8b5cf6", label: "Medium" },
                { key: "low", color: "#22c55e", label: "Low" },
              ]}
            />
          </CardContent>
        </Card>

        {/* Issues by Category */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              Issues by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              segments={categorySegments}
              centerValue={String(overview?.kpis?.activeIssues ?? 0)}
              centerLabel="Total Issues"
            />
            <button className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 mt-4">
              View all categories
              <ArrowRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* Recent Critical Issues */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              Recent Critical Issues
            </CardTitle>
            <button className="text-xs font-medium text-purple-600 hover:text-purple-700">
              View all
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview?.recentCriticalIssues?.map((issue: any) => (
                <div key={issue.id} className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {issue.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {issue.organizationName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Started{" "}
                      {issue.createdAt
                        ? new Date(issue.createdAt).toLocaleTimeString()
                        : "recently"}
                    </p>
                  </div>
                  <StatusBadge status={issue.status} />
                </div>
              ))}
            </div>
            <button className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 mt-4">
              View all critical issues
              <ArrowRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold">
            Organizations with Active Issues
          </CardTitle>
          <div className="flex items-center gap-2">
            <select className="px-3 py-1.5 border rounded-md text-sm">
              <option>All Statuses</option>
              <option>Investigating</option>
              <option>Identified</option>
              <option>Monitoring</option>
            </select>
            <select className="px-3 py-1.5 border rounded-md text-sm">
              <option>All Tiers</option>
              <option>Enterprise</option>
              <option>Growth</option>
              <option>Starter</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                  Organization
                </th>
                <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                  Tier
                </th>
                <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                  Active Issues
                </th>
                <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                  Critical
                </th>
                <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                  MTTR
                </th>
                <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                  Last Updated
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {overview?.organizationsWithIssues?.map((org: any) => (
                <tr key={org.id} className="hover:bg-muted/50">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-700">
                        {org.organizationName
                          .split(" ")
                          .map((w: string) => w[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <span className="text-sm font-medium">
                        {org.organizationName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-sm">{org.tier}</td>
                  <td className="py-3 text-sm font-medium">
                    {org.activeIssues}
                  </td>
                  <td className="py-3 text-sm font-medium text-red-600">
                    {org.criticalIssues}
                  </td>
                  <td className="py-3 text-sm">
                    {org.mttrMinutes
                      ? `${Math.floor(org.mttrMinutes / 60)}h ${org.mttrMinutes % 60}m`
                      : "N/A"}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={org.status} />
                  </td>
                  <td className="py-3 text-sm text-muted-foreground">
                    {org.lastUpdated
                      ? `${Math.floor((Date.now() - new Date(org.lastUpdated).getTime()) / 60000)}m ago`
                      : "N/A"}
                  </td>
                  <td className="py-3">
                    <button className="p-1 hover:bg-muted rounded">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 mt-4">
            View all organizations
            <ArrowRight className="h-3 w-3" />
          </button>
        </CardContent>
      </Card>

      {/* Right Sidebar Content */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Issue Resolution SLA */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              Issue Resolution SLA
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              7D
            </Badge>
          </CardHeader>
          <CardContent>
            <DonutChart
              segments={slaSegments}
              centerValue={`${overview?.issueResolutionSla?.metSlaPercentage ?? 0}%`}
              centerLabel="Met SLA"
            />
            <button className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 mt-4">
              View SLA report
              <ArrowRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* Top Impacted Workflows */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              Top Impacted Workflows
            </CardTitle>
            <button className="text-xs font-medium text-purple-600 hover:text-purple-700">
              View all
            </button>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart
              items={
                overview?.topImpactedWorkflows?.map(
                  (w: { name: string; count: number }) => ({
                    name: w.name,
                    count: w.count,
                  }),
                ) ?? []
              }
              maxCount={maxWorkflowCount}
            />
          </CardContent>
        </Card>

        {/* Diagnostics Insights */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              Diagnostics Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview?.insights?.map((insight: any) => (
                <div
                  key={insight.id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  {insight.iconType === "error" ? (
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  ) : insight.iconType === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {insight.description}
                    </p>
                    <button className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 mt-2">
                      View insight
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
