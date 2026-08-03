"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Skeleton,
} from "@xenboox/ui";
import {
  Server,
  Activity,
  AlertTriangle,
  AlertCircle,
  Clock,
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Calendar,
  Filter,
  Download,
  CheckCircle2,
  Info,
  ChevronRight,
  Search,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── KPI Card Components ────────────────────────────────────────────────────

function OverallStatusCard({ status }: { status: string }) {
  const isHealthy = status === "healthy";
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`p-2 rounded-lg ${isHealthy ? "bg-emerald-100" : "bg-amber-100"}`}
          >
            <CheckCircle2
              className={`h-5 w-5 ${isHealthy ? "text-emerald-600" : "text-amber-600"}`}
            />
          </div>
          <span className="text-sm text-muted-foreground">Overall Status</span>
        </div>
        <p
          className={`text-2xl font-bold ${isHealthy ? "text-emerald-600" : "text-amber-600"}`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          All systems operational
        </p>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  icon,
  iconColor,
  iconBg,
  sparklineData,
  sparklineColor,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  const isPositive = delta !== undefined && delta >= 0;
  const deltaColor = isPositive ? "text-emerald-500" : "text-red-500";

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className={`p-1.5 rounded-lg ${iconBg}`}>
            <div className={iconColor}>{icon}</div>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">
              {value}
              {unit && (
                <span className="text-sm font-medium text-muted-foreground ml-1">
                  {unit}
                </span>
              )}
            </p>
            {delta !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                {isPositive ? (
                  <ArrowUp className={cn("h-3 w-3", deltaColor)} />
                ) : (
                  <ArrowDown className={cn("h-3 w-3", deltaColor)} />
                )}
                <span className={cn("text-xs font-medium", deltaColor)}>
                  {isPositive ? "↑" : "↓"} {Math.abs(delta)}
                  {unit === "%" ? "%" : unit === "ms" ? " ms" : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {deltaLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ResourceCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  sparklineData,
  sparklineColor,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  const isPositive = delta !== undefined && delta >= 0;
  const deltaColor = isPositive ? "text-red-500" : "text-emerald-500";

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold">
          {value}
          {unit && (
            <span className="text-sm font-medium text-muted-foreground ml-1">
              {unit}
            </span>
          )}
        </p>
        {delta !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive ? (
              <ArrowUp className={cn("h-3 w-3", deltaColor)} />
            ) : (
              <ArrowDown className={cn("h-3 w-3", deltaColor)} />
            )}
            <span className={cn("text-xs font-medium", deltaColor)}>
              {Math.abs(delta)}%
            </span>
            <span className="text-xs text-muted-foreground">{deltaLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sparkline Component ────────────────────────────────────────────────────

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
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
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

// ─── Dual Axis Line Chart Component ─────────────────────────────────────────

function DualAxisLineChart({
  data,
  leftLabel,
  rightLabel,
}: {
  data: { date: string; left: number; right: number }[];
  leftLabel: string;
  rightLabel: string;
}) {
  const width = 500;
  const height = 200;
  const padding = { top: 20, right: 50, bottom: 30, left: 50 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const leftValues = data.map((d) => d.left);
  const rightValues = data.map((d) => d.right);

  const leftMin = Math.min(...leftValues) - 0.5;
  const leftMax = Math.max(...leftValues) + 0.5;
  const rightMin = 0;
  const rightMax = Math.max(...rightValues, 1) * 1.2;

  const getX = (index: number) =>
    padding.left + (index / (data.length - 1)) * chartWidth;
  const getLeftY = (value: number) =>
    padding.top +
    chartHeight -
    ((value - leftMin) / (leftMax - leftMin)) * chartHeight;
  const getRightY = (value: number) =>
    padding.top +
    chartHeight -
    ((value - rightMin) / (rightMax - rightMin)) * chartHeight;

  const leftPoints = data
    .map((d, i) => `${getX(i)},${getLeftY(d.left)}`)
    .join(" ");
  const rightPoints = data
    .map((d, i) => `${getX(i)},${getRightY(d.right)}`)
    .join(" ");

  return (
    <div className="relative">
      <svg width={width} height={height} className="w-full">
        {/* Left Y-axis labels */}
        {[98, 98.5, 99, 99.5, 100].map((value) => (
          <g key={`left-${value}`}>
            <text
              x={padding.left - 10}
              y={getLeftY(value) + 4}
              textAnchor="end"
              className="text-[9px] fill-muted-foreground"
            >
              {value}%
            </text>
          </g>
        ))}

        {/* Right Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((value) => (
          <g key={`right-${value}`}>
            <text
              x={width - padding.right + 10}
              y={getRightY(value) + 4}
              textAnchor="start"
              className="text-[9px] fill-muted-foreground"
            >
              {value.toFixed(2)}%
            </text>
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
        <polyline
          fill="none"
          stroke="#22c55e"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={leftPoints}
        />
        <polyline
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={rightPoints}
        />
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">{leftLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-violet-500" />
          <span className="text-xs text-muted-foreground">{rightLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge Component ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-emerald-100 text-emerald-700",
    degraded: "bg-amber-100 text-amber-700",
    unhealthy: "bg-red-100 text-red-700",
    maintenance: "bg-blue-100 text-blue-700",
    unknown: "bg-gray-100 text-gray-700",
  };

  return (
    <Badge variant="secondary" className={colors[status] || colors.unknown}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function AlertSeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    info: "bg-blue-100 text-blue-700",
  };

  return (
    <Badge variant="secondary" className={colors[severity] || colors.info}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function InfrastructureHealthPage() {
  const [timeRange] = useState(7);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [envFilter, setEnvFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Fetch all data
  const { data: overview, isLoading } =
    trpc.infrastructure.getOverview.useQuery({
      days: timeRange,
    });

  // Seed demo data mutation
  const seedMutation = trpc.infrastructure.seedDemoData.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  // Filter services
  const filteredServices = useMemo(() => {
    if (!overview?.services) return [];
    return overview.services.filter((s: any) => {
      if (
        searchQuery &&
        !s.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (envFilter !== "all" && s.environment.toLowerCase() !== envFilter)
        return false;
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      return true;
    });
  }, [overview?.services, searchQuery, statusFilter, envFilter, typeFilter]);

  const infraOverviewSegments = useMemo(() => {
    if (!overview?.infrastructureOverview) return [];
    const { healthy, degraded, unhealthy, maintenance, unknown, total } =
      overview.infrastructureOverview;
    return [
      {
        name: "Healthy",
        count: healthy,
        percentage: total > 0 ? Math.round((healthy / total) * 100) : 0,
        color: "#22c55e",
      },
      {
        name: "Degraded",
        count: degraded,
        percentage: total > 0 ? Math.round((degraded / total) * 100) : 0,
        color: "#f59e0b",
      },
      {
        name: "Unhealthy",
        count: unhealthy,
        percentage: total > 0 ? Math.round((unhealthy / total) * 100) : 0,
        color: "#ef4444",
      },
      {
        name: "Maintenance",
        count: maintenance,
        percentage: total > 0 ? Math.round((maintenance / total) * 100) : 0,
        color: "#3b82f6",
      },
      {
        name: "Unknown",
        count: unknown,
        percentage: total > 0 ? Math.round((unknown / total) * 100) : 0,
        color: "#9ca3af",
      },
    ];
  }, [overview?.infrastructureOverview]);

  const chartData = useMemo(() => {
    if (!overview?.healthOverTime) return [];
    return overview.healthOverTime.map((d: any) => ({
      date: d.date,
      left: d.uptime,
      right: d.errorRate,
    }));
  }, [overview?.healthOverTime]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
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
            <span className="text-2xl font-bold">9</span>
            <h1 className="text-2xl font-bold tracking-tight">
              Infrastructure Health
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time status of your infrastructure, services, and deployments.
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

      {/* KPI Cards Row 1 */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-7">
        <OverallStatusCard
          status={overview?.kpis?.overallStatus ?? "healthy"}
        />
        <MetricCard
          label="Uptime (30d)"
          value={`${overview?.kpis?.uptimePercent ?? 100}%`}
          delta={overview?.kpis?.uptimeDelta}
          deltaLabel="vs prior 30d"
          icon={<Activity className="h-4 w-4" />}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
        />
        <MetricCard
          label="Incidents (30d)"
          value={overview?.kpis?.incidentCount ?? 0}
          delta={overview?.kpis?.incidentsDelta}
          deltaLabel="vs prior 30d"
          icon={<AlertTriangle className="h-4 w-4" />}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
        />
        <MetricCard
          label="Services"
          value={overview?.kpis?.totalServices ?? 0}
          icon={<Server className="h-4 w-4" />}
          iconColor="text-violet-600"
          iconBg="bg-violet-100"
        />
        <MetricCard
          label="Active Alerts"
          value={overview?.kpis?.activeAlerts ?? 0}
          icon={<AlertCircle className="h-4 w-4" />}
          iconColor="text-red-600"
          iconBg="bg-red-100"
        />
        <MetricCard
          label="Avg. Response Time (API)"
          value={overview?.kpis?.avgResponseTimeMs ?? 0}
          unit="ms"
          delta={overview?.kpis?.responseTimeDelta}
          deltaLabel="vs prior 7d"
          icon={<Clock className="h-4 w-4" />}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <MetricCard
          label="Error Rate (API)"
          value={`${overview?.kpis?.errorRatePercent ?? 0}%`}
          delta={overview?.kpis?.errorRateDelta}
          deltaLabel="vs prior 7d"
          icon={<AlertCircle className="h-4 w-4" />}
          iconColor="text-red-600"
          iconBg="bg-red-100"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* System Health Over Time */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              System Health Over Time
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              7D
            </Badge>
          </CardHeader>
          <CardContent>
            <DualAxisLineChart
              data={chartData}
              leftLabel="Uptime (%)"
              rightLabel="Error Rate (%)"
            />
          </CardContent>
        </Card>

        {/* Infrastructure Overview */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              Infrastructure Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              segments={infraOverviewSegments}
              centerValue={String(overview?.infrastructureOverview?.total ?? 0)}
              centerLabel="Services"
            />
            <button className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 mt-4">
              View all services
              <ArrowRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* Current Alerts */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              Current Alerts
            </CardTitle>
            <button className="text-xs font-medium text-purple-600 hover:text-purple-700">
              View all alerts →
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview?.alerts?.slice(0, 5).map((alert: any) => (
                <div key={alert.id} className="flex items-start gap-3">
                  {alert.severity === "critical" ? (
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  ) : alert.severity === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {alert.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {alert.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {alert.createdAt
                        ? `${Math.floor((Date.now() - new Date(alert.createdAt).getTime()) / 60000)}m ago`
                        : "recently"}
                    </p>
                  </div>
                  <AlertSeverityBadge severity={alert.severity} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <ResourceCard
          label="CPU Usage (Avg.)"
          value={`${overview?.kpis?.cpuUsagePercent ?? 0}%`}
          delta={overview?.kpis?.cpuDelta}
          deltaLabel="vs prior 7d"
        />
        <ResourceCard
          label="Memory Usage (Avg.)"
          value={`${overview?.kpis?.memoryUsagePercent ?? 0}%`}
          delta={overview?.kpis?.memoryDelta}
          deltaLabel="vs prior 7d"
        />
        <ResourceCard
          label="Disk Usage (Avg.)"
          value={`${overview?.kpis?.diskUsagePercent ?? 0}%`}
          delta={overview?.kpis?.diskDelta}
          deltaLabel="vs prior 7d"
        />
        <ResourceCard
          label="Network In (Avg.)"
          value={`${overview?.kpis?.networkInMbps ?? 0}`}
          unit="Mbps"
          delta={overview?.kpis?.networkInDelta}
          deltaLabel="vs prior 7d"
        />
        <ResourceCard
          label="Network Out (Avg.)"
          value={`${overview?.kpis?.networkOutMbps ?? 0}`}
          unit="Mbps"
          delta={overview?.kpis?.networkOutDelta}
          deltaLabel="vs prior 7d"
        />
      </div>

      {/* Services Table and Right Sidebar */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Services Health Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">
              Services Health
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredServices.length} services
            </span>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                  className="pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="healthy">Healthy</option>
                <option value="degraded">Degraded</option>
                <option value="unhealthy">Unhealthy</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <select
                value={envFilter}
                onChange={(e) => setEnvFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Environments</option>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="api">API</option>
                <option value="worker">Worker</option>
                <option value="database">Database</option>
                <option value="cache">Cache</option>
                <option value="queue">Queue</option>
              </select>
            </div>

            {/* Table */}
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                    Service
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                    Environment
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                    Uptime (30d)
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                    Response Time (P95)
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                    Error Rate (7d)
                  </th>
                  <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                    Last Check
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredServices.map((service: any) => (
                  <tr key={service.id} className="hover:bg-muted/50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-medium text-violet-700">
                          {service.name.slice(0, 3).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {service.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {service.type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <StatusBadge status={service.status} />
                    </td>
                    <td className="py-3 text-sm">{service.environment}</td>
                    <td className="py-3 text-sm">
                      {service.uptimePercent30d}%
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">
                          {service.responseTimeP95Ms} ms
                        </span>
                        {service.responseTimeDelta !== null && (
                          <span
                            className={cn(
                              "text-xs",
                              service.responseTimeDelta > 0
                                ? "text-red-500"
                                : "text-emerald-500",
                            )}
                          >
                            {service.responseTimeDelta > 0 ? "↑" : "↓"}{" "}
                            {Math.abs(service.responseTimeDelta)}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">
                          {service.errorRatePercent7d ?? "—"}%
                        </span>
                        {service.errorRateDelta !== null &&
                          service.errorRateDelta !== undefined && (
                            <span
                              className={cn(
                                "text-xs",
                                service.errorRateDelta > 0
                                  ? "text-red-500"
                                  : "text-emerald-500",
                              )}
                            >
                              {service.errorRateDelta > 0 ? "↑" : "↓"}{" "}
                              {Math.abs(service.errorRateDelta)}%
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {service.lastCheckedAt ? "10s ago" : "N/A"}
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
              View all services
              <ArrowRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Recent Incidents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">
                Recent Incidents
              </CardTitle>
              <button className="text-xs font-medium text-purple-600 hover:text-purple-700">
                View all incidents →
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview?.incidents?.map((incident: any) => (
                  <div key={incident.id} className="flex items-start gap-3">
                    {incident.severity === "major" ? (
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                    ) : incident.severity === "minor" ? (
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{incident.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {incident.startedAt
                          ? new Date(incident.startedAt).toLocaleDateString()
                          : ""}{" "}
                        • {incident.durationMinutes}m
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        incident.severity === "major"
                          ? "bg-red-100 text-red-700"
                          : incident.severity === "minor"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                      }
                    >
                      {incident.severity.charAt(0).toUpperCase() +
                        incident.severity.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resource Usage by Environment */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">
                Resource Usage by Environment
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                7D
              </Badge>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                      Environment
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                      CPU (Avg.)
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                      Memory (Avg.)
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">
                      Disk (Avg.)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {overview?.resourceUsageByEnvironment?.map((env: any) => (
                    <tr key={env.environment}>
                      <td className="py-2 text-sm font-medium">
                        {env.environment}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{env.cpuAvg}%</span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${env.cpuAvg}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{env.memoryAvg}%</span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-violet-500 rounded-full"
                              style={{ width: `${env.memoryAvg}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{env.diskAvg}%</span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${env.diskAvg}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 mt-4">
                View full infrastructure metrics
                <ArrowRight className="h-3 w-3" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
