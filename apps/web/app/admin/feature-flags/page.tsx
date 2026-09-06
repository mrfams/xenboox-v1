"use client";

import { useState } from "react";
import { Card, CardContent, Badge, Button, Input, Skeleton } from "@xenboox/ui";
import {
  Search,
  Download,
  Upload,
  Plus,
  Flag,
  CheckCircle2,
  XCircle,
  Clock,
  FlaskConical,
  FileText,
  ArrowUp,
  ArrowDown,
  X,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Pause,
  Power,
  Copy,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── KPI Card Component ─────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  subtitle,
  icon,
  iconColor,
  iconBg,
}: {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
}) {
  const isPositive = delta !== undefined && delta >= 0;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg ${iconBg}`}>
            <div className={iconColor}>{icon}</div>
          </div>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <div className="flex items-center gap-2 mt-1">
          {delta !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                isPositive ? "text-balanced-green" : "text-error-clay",
              )}
            >
              {isPositive ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {Math.abs(delta)}
            </div>
          )}
          {deltaLabel && (
            <span className="text-xs text-muted-foreground">{deltaLabel}</span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Type Badge Component ───────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    release: "bg-blue-100 text-blue-700",
    experiment: "bg-purple-100 text-purple-700",
    ops: "bg-amber-100 text-amber-700",
    internal: "bg-gray-100 text-gray-700",
  };

  return (
    <Badge variant="secondary" className={colors[type] || colors.internal}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
}

// ─── Status Badge Component ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    on: "bg-emerald-100 text-emerald-700",
    off: "bg-red-100 text-red-700",
    scheduled: "bg-amber-100 text-amber-700",
    archived: "bg-gray-100 text-gray-700",
  };

  return (
    <Badge variant="secondary" className={colors[status] || colors.off}>
      {status === "on"
        ? "On"
        : status === "off"
          ? "Off"
          : status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// ─── Environment Badge Component ────────────────────────────────────────────

function EnvBadge({ env }: { env: string }) {
  const colors: Record<string, string> = {
    prod: "bg-purple-100 text-purple-700",
    stg: "bg-amber-100 text-amber-700",
    dev: "bg-blue-100 text-blue-700",
  };

  return (
    <Badge
      variant="secondary"
      className={cn("text-[10px]", colors[env] || colors.dev)}
    >
      {env === "prod"
        ? "Prod"
        : env === "stg"
          ? "Stg"
          : env === "dev"
            ? "Dev"
            : env}
    </Badge>
  );
}

// ─── Rollout Bar Component ──────────────────────────────────────────────────

function RolloutBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-signal-indigo rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8">{percent}%</span>
    </div>
  );
}

// ─── Line Chart Component ───────────────────────────────────────────────────

function LineChart({ data }: { data: { date: string; value: number }[] }) {
  const width = 280;
  const height = 100;
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map((d) => d.value), 100);
  const ___minX = 0;
  const maxX = data.length - 1;

  const getX = (index: number) => padding.left + (index / maxX) * chartWidth;
  const getY = (value: number) =>
    padding.top + chartHeight - (value / maxValue) * chartHeight;

  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(" ");
  const areaPoints = `${getX(0)},${padding.top + chartHeight} ${points} ${getX(maxX)},${padding.top + chartHeight}`;

  return (
    <svg width={width} height={height} className="w-full">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((value) => (
        <g key={value}>
          <line
            x1={padding.left}
            y1={getY(value)}
            x2={width - padding.right}
            y2={getY(value)}
            stroke="currentColor"
            className="text-border"
            strokeDasharray="2 2"
          />
          <text
            x={padding.left - 5}
            y={getY(value) + 4}
            textAnchor="end"
            className="text-[9px] fill-muted-foreground"
          >
            {value}%
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={getX(i)}
          y={height - 5}
          textAnchor="middle"
          className="text-[8px] fill-muted-foreground"
        >
          {new Date(d.date).toLocaleDateString("en", {
            month: "short",
            day: "numeric",
          })}
        </text>
      ))}

      {/* Area */}
      <polygon fill="url(#rolloutGradient)" points={areaPoints} />

      {/* Line */}
      <polyline
        fill="none"
        stroke="#8b5cf6"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="rolloutGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Flag Detail Panel ──────────────────────────────────────────────────────

function FlagDetailPanel({
  flag,
  onClose,
}: {
  flag: any;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "targeting" | "rollout" | "history" | "audit"
  >("overview");

  if (!flag) return null;

  const rolloutData = [
    { date: "2025-05-10", value: 10 },
    { date: "2025-05-11", value: 25 },
    { date: "2025-05-12", value: 40 },
    { date: "2025-05-13", value: 55 },
    { date: "2025-05-14", value: 65 },
    { date: "2025-05-15", value: 70 },
    { date: "2025-05-16", value: 75 },
  ];

  return (
    <div className="w-[380px] border-l bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Flag className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">{flag.name}</h3>
              <p className="text-xs text-muted-foreground">
                Flag Key: {flag.key}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={cn(
                "w-10 h-5 rounded-full transition-colors",
                flag.status === "on" ? "bg-balanced-green" : "bg-gray-300",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform",
                  flag.status === "on" ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <TypeBadge type={flag.type} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {(
          ["overview", "targeting", "rollout", "history", "audit"] as const
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-xs font-medium border-b-2 transition-colors",
              activeTab === tab
                ? "text-purple-600 border-purple-600"
                : "text-muted-foreground border-transparent hover:text-foreground",
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">
                Description
              </h4>
              <p className="text-sm">{flag.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">
                  Owner
                </h4>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-700">
                    {flag.ownerName?.charAt(0)}
                  </div>
                  <span className="text-sm">{flag.ownerName}</span>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">
                  Environments
                </h4>
                <div className="flex gap-1">
                  {flag.environments?.map((env: string) => (
                    <EnvBadge key={env} env={env} />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">
                  Created
                </h4>
                <p className="text-sm">
                  {flag.createdAt
                    ? new Date(flag.createdAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">
                  Last Updated
                </h4>
                <p className="text-sm">
                  {flag.updatedAt
                    ? new Date(flag.updatedAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>

            {flag.tags && flag.tags.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1">
                  {flag.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">
                Remote Config
              </h4>
              <button className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
                View config <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {activeTab === "rollout" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">Rollout</h4>
                <p className="text-2xl font-bold mt-1">
                  {flag.rolloutPercent}%
                </p>
                <p className="text-xs text-muted-foreground">of all tenants</p>
              </div>
              <button className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
                View rollout analytics <ExternalLink className="h-3 w-3" />
              </button>
            </div>
            <LineChart data={rolloutData} />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t">
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          Quick Actions
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted text-sm">
            <Pencil className="h-4 w-4" /> Edit Flag
          </button>
          <button className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted text-sm">
            <Copy className="h-4 w-4" /> Duplicate Flag
          </button>
          <button className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted text-sm">
            <Pause className="h-4 w-4" /> Pause Rollout
          </button>
          <button className="flex items-center gap-2 p-2 border rounded-lg hover:bg-red-50 text-sm text-red-600 border-red-200">
            <Power className="h-4 w-4" /> Disable Flag
          </button>
        </div>
      </div>

      {/* Evaluations */}
      <div className="p-4 border-t">
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          Evaluations (7d)
        </h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Total Evaluations</p>
            <p className="text-lg font-bold">
              {(flag.totalEvaluations / 1000000).toFixed(2)}M
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">True</p>
            <p className="text-lg font-bold text-emerald-600">
              {(flag.trueEvaluations / 1000).toFixed(1)}K
            </p>
            <p className="text-xs text-emerald-600">
              {flag.totalEvaluations > 0
                ? Math.round(
                    (flag.trueEvaluations / flag.totalEvaluations) * 100,
                  )
                : 0}
              %
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">False</p>
            <p className="text-lg font-bold text-red-600">
              {(flag.falseEvaluations / 1000).toFixed(1)}K
            </p>
            <p className="text-xs text-red-600">
              {flag.totalEvaluations > 0
                ? Math.round(
                    (flag.falseEvaluations / flag.totalEvaluations) * 100,
                  )
                : 0}
              %
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function FeatureFlagsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "release" | "experiment" | "ops" | "internal"
  >("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [envFilter, setEnvFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [selectedFlag, setSelectedFlag] = useState<any>(null);
  const [page, setPage] = useState(1);

  // Fetch KPIs
  const { data: overview, isLoading: overviewLoading } =
    trpc.featureFlags.getOverview.useQuery({
      days: 7,
    });

  // Fetch flags
  const { data: flagsData, isLoading: flagsLoading } =
    trpc.featureFlags.getFlags.useQuery({
      search: searchQuery || undefined,
      tab: activeTab,
      status: statusFilter !== "all" ? statusFilter : undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
      environment: envFilter !== "all" ? envFilter : undefined,
      owner: ownerFilter !== "all" ? ownerFilter : undefined,
      page,
      pageSize: 10,
    });

  // Seed demo data mutation
  if (overviewLoading) {
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
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">11</span>
                <h1 className="text-2xl font-bold tracking-tight">
                  Feature Flags
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Safely release and control features with precision.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search flags by name, key or description..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                  className="pl-9 w-[300px]"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  ⌘K
                </kbd>
              </div>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-1" />
                Create Flag
              </Button>
                          </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-6 gap-4">
            <KpiCard
              label="Total Flags"
              value={overview?.kpis?.totalFlags ?? 0}
              delta={overview?.kpis?.totalFlagsDelta}
              deltaLabel="vs last 7 days"
              icon={<Flag className="h-4 w-4" />}
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
            />
            <KpiCard
              label="Enabled"
              value={overview?.kpis?.enabledFlags ?? 0}
              subtitle={`${overview?.kpis?.enabledPercent ?? 0}% of total`}
              icon={<CheckCircle2 className="h-4 w-4" />}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-100"
            />
            <KpiCard
              label="Disabled"
              value={overview?.kpis?.disabledFlags ?? 0}
              subtitle={`${overview?.kpis?.disabledPercent ?? 0}% of total`}
              icon={<XCircle className="h-4 w-4" />}
              iconColor="text-red-600"
              iconBg="bg-red-100"
            />
            <KpiCard
              label="Scheduled"
              value={overview?.kpis?.scheduledFlags ?? 0}
              delta={overview?.kpis?.scheduledDelta}
              deltaLabel="vs last 7 days"
              icon={<Clock className="h-4 w-4" />}
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
            />
            <KpiCard
              label="Experiments"
              value={overview?.kpis?.experiments ?? 0}
              delta={overview?.kpis?.experimentsDelta}
              deltaLabel="vs last 7 days"
              icon={<FlaskConical className="h-4 w-4" />}
              iconColor="text-amber-600"
              iconBg="bg-amber-100"
            />
            <KpiCard
              label="Audit Events (7d)"
              value={overview?.kpis?.auditEvents ?? 0}
              delta={overview?.kpis?.auditEventsDelta}
              deltaLabel="vs last 7 days"
              icon={<FileText className="h-4 w-4" />}
              iconColor="text-violet-600"
              iconBg="bg-violet-100"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b bg-white">
          <div className="flex gap-6">
            {(["all", "release", "experiment", "ops", "internal"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "py-3 text-sm font-medium border-b-2 transition-colors",
                    activeTab === tab
                      ? "border-purple-600 text-purple-600"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab === "all"
                    ? "All Flags"
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 bg-white border-b flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search flags..." className="pl-9" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="on">On</option>
            <option value="off">Off</option>
            <option value="scheduled">Scheduled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Types</option>
            <option value="release">Release</option>
            <option value="experiment">Experiment</option>
            <option value="ops">Ops</option>
            <option value="internal">Internal</option>
          </select>
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Environments</option>
            <option value="prod">Production</option>
            <option value="stg">Staging</option>
            <option value="dev">Development</option>
          </select>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Owners</option>
            <option value="F. Touray">F. Touray</option>
            <option value="A. Jallow">A. Jallow</option>
            <option value="M. Njie">M. Njie</option>
          </select>
          <button className="text-sm text-muted-foreground hover:text-foreground">
            More Filters
          </button>
          <button
            onClick={() => {
              setStatusFilter("all");
              setTypeFilter("all");
              setEnvFilter("all");
              setOwnerFilter("all");
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Flags Table */}
          <div className="flex-1 overflow-y-auto bg-white">
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Flag
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Environments
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Rollout
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Targeting
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Owner
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    Updated
                  </th>
                  <th className="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {flagsData?.flags?.map((flag: any) => (
                  <tr
                    key={flag.id}
                    className={cn(
                      "hover:bg-muted/50 cursor-pointer",
                      selectedFlag?.id === flag.id && "bg-purple-50",
                    )}
                    onClick={() => setSelectedFlag(flag)}
                  >
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <Flag className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {flag.key}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {flag.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={flag.type} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={flag.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {flag.environments?.map((env: string) => (
                          <EnvBadge key={env} env={env} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RolloutBar percent={flag.rolloutPercent} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {flag.rolloutPercent === 0
                        ? "Internal only"
                        : flag.rolloutPercent === 100
                          ? "All tenants"
                          : `${Math.round(flag.rolloutPercent / 10)}% of tenants`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-700">
                          {flag.ownerName?.charAt(0)}
                        </div>
                        <span className="text-sm">{flag.ownerName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {flag.updatedAt
                        ? new Date(flag.updatedAt).toLocaleString()
                        : ""}
                    </td>
                    <td className="px-4 py-3">
                      {" "}
                      <button
                        aria-label="More options"
                        className="p-1 hover:bg-muted rounded"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="p-4 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 10 + 1} to{" "}
                {Math.min(page * 10, flagsData?.pagination?.total ?? 0)} of{" "}
                {flagsData?.pagination?.total ?? 0} flags
              </p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "w-8 h-8 rounded text-sm",
                      p === page
                        ? "bg-purple-600 text-white"
                        : "hover:bg-muted",
                    )}
                  >
                    {p}
                  </button>
                ))}
                <span className="text-muted-foreground">...</span>
                <button className="text-sm text-purple-600 hover:text-purple-700">
                  Next
                </button>
                <select className="text-xs border rounded px-2 py-1 ml-2">
                  <option>10 / page</option>
                  <option>25 / page</option>
                  <option>50 / page</option>
                </select>
              </div>
            </div>
          </div>

          {/* Flag Detail Panel */}
          {selectedFlag && (
            <FlagDetailPanel
              flag={selectedFlag}
              onClose={() => setSelectedFlag(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
