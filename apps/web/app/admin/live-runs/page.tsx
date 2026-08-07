"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, Button, Skeleton } from "@xenboox/ui";
import {
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Filter,
  Download,
  X,
  ChevronRight,
  Loader2,
  Pause,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    in_progress:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    queued: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
    waiting:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    completed:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    cancelled:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  };

  const labels: Record<string, string> = {
    in_progress: "In Progress",
    queued: "Queued",
    waiting: "Waiting",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        styles[status] ?? styles.queued,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─── Progress Bar ───────────────────────────────────────────────────────────

function ProgressBar({
  progress,
  showLabel = true,
}: {
  progress: number;
  showLabel?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground w-8">{progress}%</span>
      )}
    </div>
  );
}

// ─── Step Progress ──────────────────────────────────────────────────────────

function StepProgress({
  steps,
}: {
  steps: {
    stepNumber: number;
    name: string;
    status: string;
    duration: string;
  }[];
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Step Progress</h4>
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.stepNumber} className="flex items-center gap-3">
            <div className="flex items-center justify-center w-5">
              {step.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : step.status === "in_progress" ? (
                <div className="h-4 w-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted" />
              )}
            </div>
            <span
              className={cn(
                "flex-1 text-sm",
                step.status === "completed"
                  ? "text-muted-foreground"
                  : step.status === "in_progress"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
              )}
            >
              {step.name}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                step.status === "completed"
                  ? "text-emerald-600"
                  : step.status === "in_progress"
                    ? "text-violet-600"
                    : "text-muted-foreground",
              )}
            >
              {step.status === "completed"
                ? "✓ Completed"
                : step.status === "in_progress"
                  ? "In Progress"
                  : "Pending"}
            </span>
            <span className="text-xs text-muted-foreground w-10 text-right">
              {step.duration}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live Output ────────────────────────────────────────────────────────────

function LiveOutput({ output }: { output: Record<string, unknown> | null }) {
  if (!output) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Live Output</h4>
        <button className="text-xs font-medium text-primary hover:text-primary/80">
          View full
        </button>
      </div>
      <div className="rounded-lg bg-slate-900 p-4 font-mono text-xs text-slate-300 overflow-x-auto">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(output, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// ─── Detail Panel ───────────────────────────────────────────────────────────

function DetailPanel({
  run,
  onClose,
}: {
  run: {
    runId: string;
    status: string;
    agentDisplayName: string;
    organizationName: string | null;
    startedAt: Date | string;
    duration: string;
    currentStep: string | null;
    progress: number;
    model: string | null;
    userName: string | null;
    liveOutput: Record<string, unknown> | null;
    steps: {
      stepNumber: number;
      name: string;
      status: string;
      duration: string;
    }[];
  };
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "steps" | "events" | "logs" | "cost"
  >("overview");

  return (
    <div className="w-96 border-l border-border/50 bg-card overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-primary">
            {run.runId}
          </span>
          <StatusBadge status={run.status} />
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50 px-4">
        {(["overview", "steps", "events", "logs", "cost"] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ),
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {activeTab === "overview" && (
          <>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Agent</span>
                <span className="text-xs font-medium">
                  {run.agentDisplayName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">
                  Organization
                </span>
                <span className="text-xs font-medium">
                  {run.organizationName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">
                  Started At
                </span>
                <span className="text-xs font-medium">
                  {new Date(run.startedAt).toLocaleString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Duration</span>
                <span className="text-xs font-medium">{run.duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">
                  Current Step
                </span>
                <span className="text-xs font-medium">{run.currentStep}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Progress</span>
                <div className="flex items-center gap-2">
                  <ProgressBar progress={run.progress} />
                  <span className="text-xs text-muted-foreground w-8">
                    {100 - run.progress}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Model</span>
                <span className="text-xs font-medium">{run.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">User</span>
                <span className="text-xs font-medium">{run.userName}</span>
              </div>
            </div>

            <StepProgress steps={run.steps} />
            <LiveOutput output={run.liveOutput} />
          </>
        )}

        {activeTab === "steps" && <StepProgress steps={run.steps} />}
        {activeTab === "events" && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No events recorded yet
          </div>
        )}
        {activeTab === "logs" && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No logs available
          </div>
        )}
        {activeTab === "cost" && (
          <div className="text-sm text-muted-foreground text-center py-8">
            Cost data not available
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-0 border-t border-border/50 bg-card p-4 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          View in AI Workspace
        </Button>
        <Button size="sm" className="flex-1 bg-violet-600 hover:bg-violet-700">
          Take Over
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function LiveAgentRunsPage() {
  const [activeTab, setActiveTab] = useState<
    "live" | "recent" | "completed" | "failed"
  >("live");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Fetch data
  const { data: summary, isLoading: summaryLoading } =
    trpc.liveRuns.getSummary.useQuery(undefined, {
      refetchInterval: autoRefresh ? 10000 : false,
    });

  const statusFilter = useMemo(() => {
    switch (activeTab) {
      case "live":
        return undefined;
      case "recent":
        return undefined;
      case "completed":
        return "completed" as const;
      case "failed":
        return "failed" as const;
    }
  }, [activeTab]);

  const { data: runsData, isLoading: runsLoading } =
    trpc.liveRuns.list.useQuery(
      { status: statusFilter, limit: pageSize, offset: page * pageSize },
      { refetchInterval: autoRefresh ? 10000 : false },
    );

  const { data: selectedRun, isLoading: detailLoading } =
    trpc.liveRuns.getDetail.useQuery(
      { runId: selectedRunId ?? "" },
      { enabled: !!selectedRunId },
    );

  const formatDelta = useCallback((delta: number, suffix = "") => {
    if (delta > 0)
      return { text: `↑ ${delta}${suffix}`, color: "text-emerald-600" };
    if (delta < 0)
      return { text: `↓ ${Math.abs(delta)}${suffix}`, color: "text-red-600" };
    return { text: `→ 0${suffix}`, color: "text-muted-foreground" };
  }, []);

  if (summaryLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
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

  const totalPages = runsData ? Math.ceil(runsData.total / pageSize) : 1;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  Live Agent Runs
                </h1>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Real-time
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor and inspect live AI agent runs as they happen.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-1.5">
                <span className="text-xs text-muted-foreground">
                  Auto-refresh
                </span>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    autoRefresh ? "bg-violet-600" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
                      autoRefresh ? "translate-x-4.5" : "translate-x-0.5",
                    )}
                  />
                </button>
                <span className="text-xs text-muted-foreground">10s</span>
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
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-violet-500" />
                  <span className="text-xs text-muted-foreground">
                    Live Runs
                  </span>
                </div>
                <p className="text-2xl font-bold">{summary?.liveRuns ?? 0}</p>
                <p
                  className={cn(
                    "text-xs",
                    formatDelta(summary?.liveRunsDelta ?? 0).color,
                  )}
                >
                  {formatDelta(summary?.liveRunsDelta ?? 0).text} vs 1h ago
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span className="text-xs text-muted-foreground">Queued</span>
                </div>
                <p className="text-2xl font-bold">{summary?.queued ?? 0}</p>
                <p
                  className={cn(
                    "text-xs",
                    formatDelta(summary?.queuedDelta ?? 0).color,
                  )}
                >
                  {formatDelta(summary?.queuedDelta ?? 0).text} vs 1h ago
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Loader2 className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">
                    In Progress
                  </span>
                </div>
                <p className="text-2xl font-bold">
                  {(summary?.inProgress ?? 0).toLocaleString()}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    formatDelta(summary?.inProgressDelta ?? 0, "%").color,
                  )}
                >
                  {formatDelta(summary?.inProgressDelta ?? 0, "%").text} vs 1h
                  ago
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Pause className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">
                    Waiting for Input
                  </span>
                </div>
                <p className="text-2xl font-bold">{summary?.waiting ?? 0}</p>
                <p
                  className={cn(
                    "text-xs",
                    formatDelta(summary?.waitingDelta ?? 0).color,
                  )}
                >
                  {formatDelta(summary?.waitingDelta ?? 0).text} vs 1h ago
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">
                    Completed (1h)
                  </span>
                </div>
                <p className="text-2xl font-bold">
                  {(summary?.completed1h ?? 0).toLocaleString()}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    formatDelta(summary?.completed1hDelta ?? 0, "%").color,
                  )}
                >
                  {formatDelta(summary?.completed1hDelta ?? 0, "%").text} vs 1h
                  ago
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">
                    Failed (1h)
                  </span>
                </div>
                <p className="text-2xl font-bold">{summary?.failed1h ?? 0}</p>
                <p
                  className={cn(
                    "text-xs",
                    formatDelta(summary?.failed1hDelta ?? 0).color,
                  )}
                >
                  {formatDelta(summary?.failed1hDelta ?? 0).text} vs 1h ago
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
            {(["live", "recent", "completed", "failed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setPage(0);
                }}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                  activeTab === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === "live" ? "Live Runs" : tab}
              </button>
            ))}
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Run ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Agent
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Organization
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Progress
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Current Step
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Started At
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {runsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td colSpan={9} className="px-4 py-3">
                            <Skeleton className="h-8 w-full" />
                          </td>
                        </tr>
                      ))
                    ) : runsData?.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-12 text-center text-muted-foreground"
                        >
                          No runs found
                        </td>
                      </tr>
                    ) : (
                      runsData?.items.map((run) => (
                        <tr
                          key={run.id}
                          onClick={() => setSelectedRunId(run.runId)}
                          className={cn(
                            "border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/50",
                            selectedRunId === run.runId && "bg-muted/50",
                          )}
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-bold text-primary">
                              {run.runId}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 text-[10px] font-bold">
                                {run.agentDisplayName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {run.agentDisplayName}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {run.agentCategory}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {run.organizationName}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={run.status} />
                          </td>
                          <td className="px-4 py-3">
                            <ProgressBar progress={run.progress} />
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {run.currentStep}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                            {run.duration}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {new Date(run.startedAt).toLocaleTimeString("en", {
                              hour: "numeric",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  Showing {page * pageSize + 1} to{" "}
                  {Math.min((page + 1) * pageSize, runsData?.total ?? 0)} of{" "}
                  {runsData?.total ?? 0} live runs
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 6) }).map(
                    (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={cn(
                          "h-7 w-7 flex items-center justify-center rounded text-xs font-medium transition-colors",
                          page === i
                            ? "bg-violet-600 text-white"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {i + 1}
                      </button>
                    ),
                  )}
                  {totalPages > 6 && (
                    <span className="text-muted-foreground">...</span>
                  )}
                  <button
                    onClick={() => setPage(Math.min(page + 1, totalPages - 1))}
                    disabled={page >= totalPages - 1}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border/50 px-2 py-1">
                  <span className="text-xs text-muted-foreground">
                    10 / page
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedRunId && selectedRun && (
        <DetailPanel run={selectedRun} onClose={() => setSelectedRunId(null)} />
      )}
    </div>
  );
}
