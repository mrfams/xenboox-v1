"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Button,
  Badge,
  Card,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Zap,
  BarChart3,
  Activity,
  RefreshCw,
  BrainCircuit,
  ArrowUpRight,
  ArrowDownRight,
  List,
  PieChart,
  Layers,
} from "lucide-react";

// ─── Type Definitions ───────────────────────────────────────────────────────

interface DashboardData {
  stats: {
    total: number;
    autoPosted: number;
    pendingReview: number;
    failed: number;
    processing: number;
    autoPostRate: number;
  };
  confidenceDistribution: {
    excellent: number;
    good: number;
    fair: number;
    low: number;
    unknown: number;
  };
  workflowDistribution: Record<string, number>;
  activityFeed: Array<{
    id: string;
    action: string;
    agentName: string;
    status: string;
    input: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    confidence: number | null;
    durationMs: number | null;
    errorMessage: string | null;
    createdAt: Date;
  }>;
  recentEntries: Array<{
    id: string;
    entryNumber: number;
    description: string;
    date: string;
    reference: string | null;
    confidence: number | null;
    postedAt: string | null;
  }>;
}

// ─── Color Theme ─────────────────────────────────────────────────────────────

const COLORS = {
  excellent: {
    bg: "bg-emerald-500",
    text: "text-emerald-600",
    light: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  good: {
    bg: "bg-blue-500",
    text: "text-blue-600",
    light: "bg-blue-50 dark:bg-blue-950/30",
  },
  fair: {
    bg: "bg-amber-500",
    text: "text-amber-600",
    light: "bg-amber-50 dark:bg-amber-950/30",
  },
  low: {
    bg: "bg-red-500",
    text: "text-red-600",
    light: "bg-red-50 dark:bg-red-950/30",
  },
  unknown: {
    bg: "bg-gray-400",
    text: "text-gray-500",
    light: "bg-gray-50 dark:bg-gray-800/30",
  },
};

const WORKFLOW_COLORS = [
  "bg-violet-500",
  "bg-emerald-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-purple-500",
  "bg-pink-500",
];

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function IngestionDashboardPage() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = trpc.ingestion.getDashboard.useQuery(
    undefined,
    {
      refetchInterval: 30_000, // Auto-refresh every 30s
    },
  );

  const dashboard = data as DashboardData | undefined;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 800);
  };

  const stats = dashboard?.stats;

  // ── Stat Cards ──
  const statCards = [
    {
      label: "Total Documents",
      value: stats?.total ?? 0,
      sub: `${stats?.autoPostRate ?? 0}% auto-post rate`,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Auto-Posted",
      value: stats?.autoPosted ?? 0,
      sub: `${(((stats?.autoPosted ?? 0) / Math.max(stats?.total ?? 1, 1)) * 100).toFixed(1)}% of total`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: "Pending Review",
      value: stats?.pendingReview ?? 0,
      sub: `${stats?.processing ?? 0} still processing`,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      label: "Failed",
      value: stats?.failed ?? 0,
      sub: `${(((stats?.failed ?? 0) / Math.max(stats?.total ?? 1, 1)) * 100).toFixed(1)}% failure rate`,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingestion Dashboard"
        description="Real-time pipeline statistics, confidence metrics, and activity monitoring"
      >
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </PageHeader>

      {/* ── Stats Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="p-4">
            <div className="flex items-start justify-between">
              <div className={`rounded-lg p-2.5 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold tracking-tight">
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  card.value
                )}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {card.sub}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pipeline Status Chart */}
        <Card className="lg:col-span-1 p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Pipeline Status
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <div className="space-y-3">
              <StatusBar
                label="Auto-Posted"
                value={stats?.autoPosted ?? 0}
                total={stats?.total ?? 1}
                color="bg-emerald-500"
              />
              <StatusBar
                label="Pending Review"
                value={stats?.pendingReview ?? 0}
                total={stats?.total ?? 1}
                color="bg-amber-500"
              />
              <StatusBar
                label="Processing"
                value={stats?.processing ?? 0}
                total={stats?.total ?? 1}
                color="bg-blue-500"
              />
              <StatusBar
                label="Failed"
                value={stats?.failed ?? 0}
                total={stats?.total ?? 1}
                color="bg-red-500"
              />

              <div className="pt-3 border-t mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Auto-Post Rate</span>
                  <span
                    className={`font-bold text-lg ${(stats?.autoPostRate ?? 0) >= 80 ? "text-emerald-600" : (stats?.autoPostRate ?? 0) >= 60 ? "text-amber-600" : "text-red-600"}`}
                  >
                    {stats?.autoPostRate ?? 0}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (stats?.autoPostRate ?? 0) >= 80
                        ? "bg-emerald-500"
                        : (stats?.autoPostRate ?? 0) >= 60
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${stats?.autoPostRate ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Confidence Distribution */}
        <Card className="lg:col-span-1 p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-muted-foreground" />
            Confidence Distribution
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <div className="space-y-3">
              <ConfidenceBar
                label="≥ 95% (Excellent)"
                value={dashboard?.confidenceDistribution.excellent ?? 0}
                total={stats?.total ?? 1}
                color={COLORS.excellent}
              />
              <ConfidenceBar
                label="85-94% (Good)"
                value={dashboard?.confidenceDistribution.good ?? 0}
                total={stats?.total ?? 1}
                color={COLORS.good}
              />
              <ConfidenceBar
                label="60-84% (Fair)"
                value={dashboard?.confidenceDistribution.fair ?? 0}
                total={stats?.total ?? 1}
                color={COLORS.fair}
              />
              <ConfidenceBar
                label="&lt; 60% (Low)"
                value={dashboard?.confidenceDistribution.low ?? 0}
                total={stats?.total ?? 1}
                color={COLORS.low}
              />
              <ConfidenceBar
                label="Unknown"
                value={dashboard?.confidenceDistribution.unknown ?? 0}
                total={stats?.total ?? 1}
                color={COLORS.unknown}
              />

              <div className="pt-3 border-t mt-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Auto-Post Eligibility
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                  <span className="text-xs">
                    <strong>
                      {dashboard?.confidenceDistribution.excellent ?? 0}
                    </strong>{" "}
                    documents eligible for auto-post
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Workflow Distribution */}
        <Card className="lg:col-span-1 p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Workflow Distribution
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(dashboard?.workflowDistribution ?? {})
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([workflow, count], idx) => (
                  <div key={workflow} className="flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${WORKFLOW_COLORS[idx % WORKFLOW_COLORS.length]}`}
                    />
                    <span className="text-xs flex-1 capitalize truncate">
                      {workflow.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-medium tabular-nums">
                      {count}
                    </span>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">
                      {((count / Math.max(stats?.total ?? 1, 1)) * 100).toFixed(
                        0,
                      )}
                      %
                    </span>
                  </div>
                ))}
              {Object.keys(dashboard?.workflowDistribution ?? {}).length ===
                0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Layers className="h-6 w-6 text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No workflows processed yet
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    Upload documents to see workflow distribution
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── Bottom Grid: Activity Feed + Recent Entries ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Feed */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Recent Activity
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Live
            </Badge>
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          ) : (dashboard?.activityFeed?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Upload a document to start the ingestion pipeline
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {dashboard!.activityFeed.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </Card>

        {/* Recent Auto-Posted Entries */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <List className="h-4 w-4 text-muted-foreground" />
            Recent Journal Entries
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          ) : (dashboard?.recentEntries?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No entries posted yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Auto-posted entries will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {dashboard!.recentEntries.map((entry) => (
                <RecentEntryItem key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function StatusBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ConfidenceBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: { bg: string; text: string; light: string };
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className={`h-3 w-3 rounded-sm ${color.bg}`} />
      <span className="text-xs flex-1">{label}</span>
      <div className="flex items-center gap-2 w-24">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${color.bg}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-medium tabular-nums w-10 text-right">
          {value}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({
  item,
}: {
  item: DashboardData["activityFeed"][number];
}) {
  const isError = item.status === "failed";
  const isSuccess = item.status === "success";
  const isIngestion = item.agentName === "ingestion-engine";

  const actionLabel = item.action
    .replace(/^ingestion\./, "")
    .replace(/_/g, " ");

  const actionDetail = item.action.includes("auto_post")
    ? `Auto-posted ${item.output?.workflow ?? "entry"}`
    : item.action.includes("pending_review") ||
        item.action.includes("escalated")
      ? `Flagged for ${item.action.includes("escalated") ? "escalation" : "review"}`
      : item.action.includes("rejected")
        ? "Transaction rejected"
        : item.action.includes("complete")
          ? "Pipeline completed"
          : item.action.includes("start")
            ? "Pipeline started"
            : item.action.includes("failed")
              ? "Pipeline failed"
              : actionLabel;

  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
      <div
        className={`mt-0.5 shrink-0 ${
          isError
            ? "text-red-500"
            : isSuccess
              ? "text-emerald-500"
              : "text-amber-500"
        }`}
      >
        {isError ? (
          <XCircle className="h-4 w-4" />
        ) : isSuccess ? (
          item.action.includes("auto_post") ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )
        ) : (
          <Clock className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium capitalize truncate">
            {actionDetail}
          </p>
          {item.confidence !== null && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1 ${
                item.confidence >= 0.85
                  ? "text-emerald-600 border-emerald-200"
                  : item.confidence >= 0.6
                    ? "text-amber-600 border-amber-200"
                    : "text-red-600 border-red-200"
              }`}
            >
              {Math.round(item.confidence * 100)}%
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </span>
          {item.durationMs && (
            <span className="text-[10px] text-muted-foreground">
              {(item.durationMs / 1000).toFixed(1)}s
            </span>
          )}
          {isError && item.errorMessage && (
            <span className="text-[10px] text-red-500 truncate max-w-[150px]">
              {item.errorMessage.slice(0, 60)}
            </span>
          )}
        </div>
      </div>
      {isIngestion && <Zap className="h-3 w-3 text-violet-400 shrink-0 mt-1" />}
    </div>
  );
}

function RecentEntryItem({
  entry,
}: {
  entry: DashboardData["recentEntries"][number];
}) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="mt-0.5 shrink-0">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium truncate">
            #{entry.entryNumber} — {entry.description}
          </p>
          {entry.confidence !== null && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1 ${
                entry.confidence >= 0.95
                  ? "text-emerald-600 border-emerald-200"
                  : "text-amber-600 border-amber-200"
              }`}
            >
              {Math.round(entry.confidence * 100)}%
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {entry.date}
          </span>
          {entry.reference && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {entry.reference}
            </span>
          )}
          {entry.postedAt && (
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(entry.postedAt), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>
      </div>
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-1" />
    </div>
  );
}
