"use client";

// ─── §8.2 / §16.2 — Tenant-facing agent execution monitor ──────────────────
//
// Shows the caller's ENTITY-SCOPED agent executions in real time:
//   1. Active runs — SSE live updates (Redis-backed, reconnect + DB poll
//      backstop per §16.2 degraded modes) seeded by the initial DB fetch.
//   2. Recent runs — execution history for this entity (listEntityRuns).
//   3. Run detail — steps + event log for any of this entity's runs
//      (getEntityRunDetail — cross-entity runIds resolve to null).
//   4. Cost/success header — per-entity spend over 30 days.

import { useState, useCallback, useEffect, type ReactNode } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock,
  RefreshCw,
  TriangleAlert,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { useRealtimeAgentEvents } from "@/lib/hooks/use-realtime-agent-events";
import { trpc } from "@/lib/trpc/client";
import { Progress } from "@/components/shared/progress";
import { PageEmptyState } from "@/components/shared/page-empty-state";
import { Button } from "@/components/ui";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    in_progress: "bg-blue-100 text-blue-700",
    queued: "bg-slate-100 text-slate-600",
    waiting: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
  };
  const label = status.replace("_", " ");
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status === "in_progress" && (
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
      )}
      {label}
    </span>
  );
}

function formatClock(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AgentMonitorPage() {
  const { entityId, isLoaded } = useEntity();
  const enabled = isLoaded && !!entityId;

  // ── Live SSE feed (entity-scoped; reconnect + DB backstop per §16.2) ──
  const {
    isConnected,
    activeRunCount: sseActiveCount,
    lastEvent,
  } = useRealtimeAgentEvents({ entityId: entityId ?? "", enabled });

  // ── Initial + polling data ────────────────────────────────────────────
  const active = trpc.liveRuns.getActiveEntityRuns.useQuery(undefined, {
    enabled,
    refetchInterval: 10_000, // DB poll backstop when SSE is down
  });
  const recent = trpc.liveRuns.listEntityRuns.useQuery(
    { limit: 10 },
    { enabled, refetchInterval: 30_000 },
  );
  const cost = trpc.liveRuns.getEntityCostSummary.useQuery(
    { days: 30 },
    { enabled },
  );

  // Merge SSE-driven lifecycle changes into the active list without waiting
  // for the next poll: a completed/failed run leaves the active section
  // immediately, a new run appears at the top.
  const [localActive, setLocalActive] = useState<
    { runId: string; agentName: string; status: string }[]
  >([]);
  useEffect(() => {
    if (!lastEvent?.runId) return;
    if (lastEvent.type === "run_completed" || lastEvent.type === "run_failed") {
      setLocalActive((prev) => prev.filter((r) => r.runId !== lastEvent.runId));
    } else if (lastEvent.type === "run_started") {
      setLocalActive((prev) => [
        ...prev.filter((r) => r.runId !== lastEvent.runId),
        {
          runId: lastEvent.runId!,
          agentName: lastEvent.agentName ?? "Agent",
          status: "in_progress",
        },
      ]);
    }
  }, [lastEvent]);

  const activeRuns = active.data ?? [];
  const liveActiveCount = Math.max(
    activeRuns.filter((r) =>
      ["queued", "in_progress", "waiting"].includes(r.status),
    ).length,
    sseActiveCount,
  );

  // ── Run detail drawer ─────────────────────────────────────────────────
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const detail = trpc.liveRuns.getEntityRunDetail.useQuery(
    { runId: selectedRunId ?? "" },
    { enabled: !!selectedRunId && enabled, refetchInterval: 8_000 },
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = useCallback((runId: string) => {
    setSelectedRunId(runId);
    setDetailOpen(true);
  }, []);

  const refresh = useCallback(() => {
    void active.refetch();
    void recent.refetch();
    void cost.refetch();
  }, [active, recent, cost]);

  const totalCost = cost.data?.totalCostUsd ?? 0;
  const successRate = cost.data
    ? Math.round(cost.data.successRate * 100)
    : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* ── Header ── */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-600" />
              Agent Monitor
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Live status of your AI accounting team — this entity&apos;s
              executions only.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
                isConnected
                  ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                  : "text-amber-700 border-amber-200 bg-amber-50"
              }`}
            >
              {isConnected ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              {isConnected ? "Live" : "Reconnecting…"}
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stat chips */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatChip
            icon={<Activity className="h-4 w-4 text-blue-600" />}
            label="Active runs"
            value={String(liveActiveCount)}
          />
          <StatChip
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            label="Success rate (30d)"
            value={successRate === null ? "—" : `${successRate}%`}
          />
          <StatChip
            icon={<CircleDollarSign className="h-4 w-4 text-indigo-600" />}
            label="Cost (30d)"
            value={`$${totalCost.toFixed(4)}`}
          />
          <StatChip
            icon={<Bot className="h-4 w-4 text-slate-600" />}
            label="Agents active"
            value={String(new Set(activeRuns.map((r) => r.agentName)).size)}
          />
        </div>
      </div>

      <div className="px-6 py-5 max-w-6xl mx-auto space-y-6">
        {/* ── Active runs ── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Running now
          </h2>
          {active.isLoading && !active.data ? (
            <div className="text-sm text-slate-400 py-6 text-center">
              Loading…
            </div>
          ) : activeRuns.length === 0 && localActive.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              No agents running right now. Tasks you start — journal posting,
              reconciliation, invoice processing — appear here in real time.
            </div>
          ) : (
            <div className="space-y-2">
              {[...activeRuns, ...localActive]
                .filter(
                  (r, i, arr) =>
                    arr.findIndex((x) => x.runId === r.runId) === i,
                )
                .slice(0, 6)
                .map((run) => (
                  <button
                    key={run.runId}
                    onClick={() => openDetail(run.runId)}
                    className="w-full text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                        <span className="font-medium text-slate-900 truncate">
                          {run.agentDisplayName ?? run.agentName}
                        </span>
                        <StatusBadge status={run.status} />
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {formatClock(run.startedAt)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Progress
                        value={run.progress ?? 0}
                        className="flex-1 h-1.5"
                        indicatorClassName="bg-blue-500"
                      />
                      <span className="text-xs text-slate-500 w-8 text-right">
                        {run.progress ?? 0}%
                      </span>
                    </div>
                    {run.currentStep && (
                      <p className="mt-1.5 text-xs text-slate-500 truncate">
                        {run.currentStep}
                      </p>
                    )}
                  </button>
                ))}
            </div>
          )}
        </section>

        {/* ── Recent runs ── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Recent executions
          </h2>
          {recent.data && recent.data.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
              <PageEmptyState
                icon={Activity}
                iconColor="text-slate-300"
                iconBg="bg-transparent"
                title="No agent runs yet"
                description="Agent executions for this entity will appear here."
              />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5 font-medium">Agent</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Progress</th>
                    <th className="px-4 py-2.5 font-medium">Duration</th>
                    <th className="px-4 py-2.5 font-medium">Started</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {recent.data?.items.map((run) => (
                    <tr
                      key={run.id}
                      onClick={() => openDetail(run.runId)}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {run.agentDisplayName ?? run.agentName}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={run.progress ?? 0}
                            className="w-20 h-1.5"
                          />
                          <span className="text-xs text-slate-500">
                            {run.progress ?? 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {run.duration}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatClock(run.startedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="h-4 w-4 text-slate-300 inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ── Run detail drawer ── */}
      {detailOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40"
          onClick={() => setDetailOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-xl transition-transform ${
          detailOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {detailOpen && (
          <div className="h-full flex flex-col">
            <div className="border-b border-slate-200 px-5 py-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {detail.data?.agentDisplayName ?? detail.data?.agentName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {detail.data?.runId}
                </p>
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {!detail.data ? (
              <div className="p-6 text-sm text-slate-500">
                {detail.isLoading ? "Loading…" : "Run not found."}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-3">
                  <MetaItem label="Status" value={detail.data.status} />
                  <MetaItem label="Duration" value={detail.data.duration} />
                  <MetaItem label="Model" value={detail.data.model ?? "—"} />
                  <MetaItem
                    label="Cost"
                    value={`$${Number(detail.data.costUsd ?? 0).toFixed(6)}`}
                  />
                  <MetaItem
                    label="Progress"
                    value={`${detail.data.progress ?? 0}%`}
                  />
                  <MetaItem
                    label="Started"
                    value={formatClock(detail.data.startedAt)}
                  />
                </div>

                {detail.data.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex gap-2">
                    <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    {detail.data.error}
                  </div>
                )}

                {/* Steps */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Steps ({detail.data.steps.length})
                  </h4>
                  {detail.data.steps.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Step tracking is not recorded for this run.
                    </p>
                  ) : (
                    <ol className="space-y-1.5">
                      {detail.data.steps.map((s) => (
                        <li
                          key={s.stepNumber}
                          className="flex items-center gap-2 text-sm"
                        >
                          <StepIcon status={s.status} />
                          <span className="text-slate-800 flex-1">
                            {s.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {s.duration}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* Events */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Event log ({detail.data.events.length})
                  </h4>
                  {detail.data.events.length === 0 ? (
                    <p className="text-xs text-slate-400">No events logged.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {detail.data.events.map((e, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <Clock className="h-3.5 w-3.5 text-slate-300 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-slate-700">
                              {e.message ?? e.eventType}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatClock(e.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-slate-900 leading-tight truncate">
          {value}
        </p>
        <p className="text-xs text-slate-500 truncate">{label}</p>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
        {label}
      </p>
      <p className="text-sm font-medium text-slate-800 capitalize truncate">
        {value}
      </p>
    </div>
  );
}

function StepIcon({ status }: { status: string }) {
  if (status === "completed")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (status === "failed")
    return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
  if (status === "in_progress")
    return (
      <span className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
    );
  if (status === "skipped")
    return <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />;
  return <ChevronDown className="h-4 w-4 text-slate-300 shrink-0" />;
}
