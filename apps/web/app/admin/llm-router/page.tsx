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
  Zap,
  Box,
  Activity,
  Database,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Plus,
  TestTube,
  Route,
  ChevronRight,
  CheckCircle2,
  Info,
  Settings,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    healthy:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    degraded:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    offline: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    active:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    inactive:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        styles[status] ?? styles.inactive,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "healthy" || status === "active"
            ? "bg-emerald-500"
            : status === "degraded"
              ? "bg-amber-500"
              : status === "offline"
                ? "bg-red-500"
                : "bg-slate-400",
        )}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Policy Badge ───────────────────────────────────────────────────────────

function PolicyBadge({ policy }: { policy: string }) {
  const styles: Record<string, string> = {
    "High Quality":
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    "Cost Optimized":
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "Latency Optimized":
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "Default Policy":
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        styles[policy] ?? styles["Default Policy"],
      )}
    >
      {policy}
    </span>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  delta,
  deltaLabel,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  delta: number;
  deltaLabel?: string;
}) {
  const isPositive = delta >= 0;
  const isLatency = label.includes("Latency") || label.includes("Error");
  const deltaColor = isLatency
    ? isPositive
      ? "text-red-500"
      : "text-emerald-500"
    : isPositive
      ? "text-emerald-500"
      : "text-red-500";

  return (
    <Card className="transition-all hover:shadow-md">
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
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <ArrowUpRight className={cn("h-3 w-3", deltaColor)} />
          ) : (
            <ArrowDownRight className={cn("h-3 w-3", deltaColor)} />
          )}
          <span className={cn("text-xs font-medium", deltaColor)}>
            {isLatency
              ? `${isPositive ? "↑" : "↓"} ${Math.abs(delta).toFixed(2)}s`
              : `${isPositive ? "↑" : "↓"} ${Math.abs(delta).toFixed(1)}%`}
          </span>
          <span className="text-xs text-muted-foreground">
            {deltaLabel || "vs yesterday"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Traffic Distribution Donut ─────────────────────────────────────────────

function TrafficDistribution({
  distribution,
  total,
}: {
  distribution: { name: string; requests: number; percentage: string }[];
  total: number;
}) {
  const colors = [
    "#8b5cf6",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#6366f1",
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">
          Traffic Distribution (24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Donut */}
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              {distribution.map((item, i) => {
                const offset = distribution
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
                    className="transition-all"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold">
                {formatLargeNumber(total)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Requests
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {distribution.map((item, i) => (
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
                <span className="text-xs font-medium">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
        <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors mt-4">
          View detailed analytics
          <ChevronRight className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Routing Policies Card ──────────────────────────────────────────────────

function RoutingPoliciesCard({
  policies,
}: {
  policies: {
    name: string;
    displayName: string;
    description: string | null;
    status: string;
  }[];
}) {
  const icons: Record<string, React.ReactNode> = {
    default: <Settings className="h-4 w-4 text-violet-500" />,
    cost: <Zap className="h-4 w-4 text-emerald-500" />,
    latency: <Clock className="h-4 w-4 text-blue-500" />,
    quality: <Box className="h-4 w-4 text-violet-500" />,
    fallback: <Activity className="h-4 w-4 text-amber-500" />,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">
          Routing Overview
        </CardTitle>
        <button className="text-xs font-medium text-primary hover:text-primary/80">
          Edit Policies
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        {policies.map((policy) => (
          <div
            key={policy.name}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              {icons[policy.name] ?? <Settings className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{policy.displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {policy.description}
              </p>
            </div>
            <StatusBadge status={policy.status} />
          </div>
        ))}
        <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          View all routing policies
          <ChevronRight className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
}

// ─── Recent Changes Card ────────────────────────────────────────────────────

function RecentChangesCard({
  changes,
}: {
  changes: {
    id: string;
    changeType: string;
    title: string;
    actorName: string;
    actorType: string;
    createdAt: Date | string;
  }[];
}) {
  const icons: Record<
    string,
    { icon: React.ReactNode; color: string; bg: string }
  > = {
    model_added: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    routing_updated: {
      icon: <Info className="h-4 w-4" />,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    fallback_enabled: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    provider_degraded: {
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  };

  function timeAgo(date: Date | string): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">Recent Changes</CardTitle>
        <button className="text-xs font-medium text-primary hover:text-primary/80">
          View all
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        {changes.map((change) => {
          const style = icons[change.changeType] ?? {
            icon: <Info className="h-4 w-4" />,
            color: "text-muted-foreground",
            bg: "bg-muted",
          };
          return (
            <div key={change.id} className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  style.bg,
                  style.color,
                )}
              >
                {style.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{change.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  by {change.actorName} · {timeAgo(change.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function LlmRouterPage() {
  const { data, isLoading } = trpc.llmRouter.getOverview.useQuery();

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
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              LLM Provider & Model Router
            </h1>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage LLM providers, models, and routing policies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <TestTube className="h-4 w-4 mr-1" />
            Test Connection
          </Button>
          <Button variant="outline" size="sm">
            <Route className="h-4 w-4 mr-1" />
            Routing Simulator
          </Button>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4 mr-1" />
            Add Provider
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={<Zap className="h-4 w-4" />}
          iconBg="bg-violet-500/10"
          iconColor="text-violet-500"
          label="Active Providers"
          value={data?.summary.activeProviders ?? 0}
          delta={1}
          deltaLabel="vs last 30 days"
        />
        <KpiCard
          icon={<Box className="h-4 w-4" />}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
          label="Active Models"
          value={data?.summary.activeModels ?? 0}
          delta={3}
          deltaLabel="vs last 30 days"
        />
        <KpiCard
          icon={<Activity className="h-4 w-4" />}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
          label="Total Requests (24h)"
          value={data?.summary.totalRequestsDisplay ?? "0"}
          delta={23.6}
          deltaLabel="vs yesterday"
        />
        <KpiCard
          icon={<Database className="h-4 w-4" />}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500"
          label="Total Tokens (24h)"
          value={data?.summary.totalTokensDisplay ?? "0"}
          delta={18.4}
          deltaLabel="vs yesterday"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
          label="Avg. Latency (24h)"
          value={`${data?.summary.avgLatency ?? "0"}s`}
          delta={-0.18}
          deltaLabel="vs yesterday"
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4" />}
          iconBg="bg-red-500/10"
          iconColor="text-red-500"
          label="Error Rate (24h)"
          value={`${data?.summary.avgErrorRate ?? "0"}%`}
          delta={-0.21}
          deltaLabel="vs yesterday"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Left: Providers Table + Routing Rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Providers Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold">
                  Providers & Models
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {data?.providers.length ?? 0} providers
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Provider
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Models
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Requests (24h)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Tokens (24h)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Avg. Latency
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Error Rate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Cost / 1M Tokens
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.providers.map((provider) => (
                      <tr
                        key={provider.id}
                        className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                              {provider.displayName.charAt(0)}
                            </div>
                            <span className="text-sm font-medium">
                              {provider.displayName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={provider.status} />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {provider.modelCount}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {provider.requestsDisplay}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {provider.tokensDisplay}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {provider.avgLatency}s
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {provider.errorRate}%
                        </td>
                        <td className="px-4 py-3 text-sm">
                          ${provider.costPerMillionTokens}
                        </td>
                        <td className="px-4 py-3">
                          <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-border/50">
                <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                  View all providers & models
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Routing Rules */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Routing Rules (Top 5)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Priority
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Rule Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Conditions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Target
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Policy
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Hit Rate (24h)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.rules.map((rule) => (
                      <tr
                        key={rule.id}
                        className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          {rule.priority}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {rule.ruleName}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {rule.conditions}
                        </td>
                        <td className="px-4 py-3 text-sm">{rule.target}</td>
                        <td className="px-4 py-3">
                          <PolicyBadge policy={rule.policyName} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={rule.status} />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {rule.hitRate24h}%
                        </td>
                        <td className="px-4 py-3">
                          <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-border/50">
                <button className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                  View all routing rules
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Policies, Traffic, Changes */}
        <div className="space-y-6">
          <RoutingPoliciesCard policies={data?.policies ?? []} />
          <TrafficDistribution
            distribution={data?.trafficDistribution ?? []}
            total={data?.summary.totalRequests24h ?? 0}
          />
          <RecentChangesCard changes={data?.recentChanges ?? []} />
        </div>
      </div>
    </div>
  );
}
