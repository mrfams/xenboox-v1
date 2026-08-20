"use client";

import { useState } from "react";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Filter,
  Sparkles,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Bot,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import type { SummaryCardItem } from "@/components/module/module-page-shell.types";
import { Button } from "@xenboox/ui/button";
import { Badge } from "@xenboox/ui/badge";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────

type CorrectionType =
  | "categorization"
  | "amount"
  | "vendor"
  | "account"
  | "tax"
  | "duplicate"
  | "description";

// ─── Helpers ───────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  CorrectionType,
  { label: string; color: string; bg: string }
> = {
  categorization: {
    label: "Category",
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
  amount: { label: "Amount", color: "text-amber-700", bg: "bg-amber-100" },
  vendor: { label: "Vendor", color: "text-purple-700", bg: "bg-purple-100" },
  account: {
    label: "Account",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
  },
  tax: { label: "Tax", color: "text-red-700", bg: "bg-red-100" },
  duplicate: {
    label: "Duplicate",
    color: "text-slate-700",
    bg: "bg-slate-100",
  },
  description: {
    label: "Description",
    color: "text-indigo-700",
    bg: "bg-indigo-100",
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-100",
    icon: Clock,
  },
  accepted: {
    label: "Accepted",
    color: "text-green-700",
    bg: "bg-green-100",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-700",
    bg: "bg-red-100",
    icon: XCircle,
  },
  applied: {
    label: "Applied",
    color: "text-blue-700",
    bg: "bg-blue-100",
    icon: CheckCircle2,
  },
};

function formatDecision(decision: Record<string, unknown>): string {
  const entries = Object.entries(decision).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  if (entries.length === 0) return "—";
  return entries
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(", ");
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function AiLearningPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } =
    trpc.aiCorrections.getStats.useQuery();

  const { data, isLoading, refetch } = trpc.aiCorrections.list.useQuery({
    status: statusFilter as
      "all" | "pending" | "accepted" | "rejected" | "applied",
    correctionType: typeFilter === "all" ? undefined : typeFilter,
    limit: 50,
  });

  const { data: patterns } = trpc.aiCorrections.getLearnedPatterns.useQuery({
    limit: 20,
  });

  const acceptMutation = trpc.aiCorrections.accept.useMutation({
    onSuccess: () => {
      toast.success("Correction accepted — agent will learn from this");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.aiCorrections.reject.useMutation({
    onSuccess: () => {
      toast.success("Correction rejected");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const summaryCards: SummaryCardItem[] = stats
    ? [
        {
          label: "Total Corrections",
          value: stats.total.toString(),
          icon: Brain,
          color: "text-slate-600",
        },
        {
          label: "Pending Review",
          value: stats.pending.toString(),
          icon: Clock,
          color: "text-amber-600",
        },
        {
          label: "Learned",
          value: stats.learned.toString(),
          icon: TrendingUp,
          color: "text-green-600",
        },
        {
          label: "Learning Rate",
          value: `${stats.learningRate}%`,
          icon: BarChart3,
          color: "text-violet-600",
        },
      ]
    : [];

  const corrections = data?.corrections ?? [];

  return (
    <ModulePageShell
      title="AI Learning"
      description="Review and correct AI decisions — every correction makes the AI smarter"
      summaryCards={summaryCards}
      summaryLoading={statsLoading}
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-1 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {/* AI Learning Banner */}
      <div className="mb-6 flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 p-4">
        <div className="rounded-full bg-violet-100 p-2">
          <Brain className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-violet-900">
            Your corrections improve AI accuracy
          </p>
          <p className="text-xs text-violet-600">
            When you correct an AI decision, the agent learns from it. Over
            time, the AI makes fewer mistakes for your business patterns.
          </p>
        </div>
      </div>

      {/* Learned Patterns */}
      {patterns && patterns.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            <Sparkles className="mr-1 inline h-4 w-4 text-violet-500" />
            Learned Patterns ({patterns.length})
          </h3>
          <div className="space-y-2">
            {patterns.map((p, i) => (
              <div
                key={`${p.patternKey}-${i}`}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      TYPE_CONFIG[p.correctionType as CorrectionType]?.color,
                    )}
                  >
                    {TYPE_CONFIG[p.correctionType as CorrectionType]?.label ??
                      p.correctionType}
                  </Badge>
                  <span className="text-sm text-slate-700">{p.patternKey}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Seen {p.timesSeen}×</span>
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats by Type */}
      {stats && Object.keys(stats.byType).length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(stats.byType)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([type, count]) => {
              const config = TYPE_CONFIG[type as CorrectionType];
              return (
                <div
                  key={type}
                  className="rounded-lg border bg-white p-3 text-center"
                >
                  <p className="text-xs text-slate-500">
                    {config?.label ?? type}
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {count}
                  </p>
                </div>
              );
            })}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto">
          {["all", "pending", "accepted", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                statusFilter === f
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* Corrections List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border bg-white p-4"
            />
          ))}
        </div>
      ) : corrections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16">
          <Brain className="mb-4 h-10 w-10 text-slate-400" />
          <h3 className="text-lg font-medium text-slate-900">
            No corrections yet
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            When you correct AI decisions, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {corrections.map((c) => {
            const typeConfig = TYPE_CONFIG[c.correctionType as CorrectionType];
            const statusConfig = STATUS_CONFIG[c.status];
            const StatusIcon = statusConfig?.icon ?? Clock;
            const isExpanded = expandedId === c.id;

            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-lg border bg-white transition-all hover:shadow-sm",
                  c.status === "accepted" && "border-green-200",
                  c.status === "rejected" && "border-red-200",
                )}
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div
                    className={cn(
                      "rounded-lg p-2",
                      typeConfig?.bg ?? "bg-slate-100",
                    )}
                  >
                    <Bot
                      className={cn(
                        "h-4 w-4",
                        typeConfig?.color ?? "text-slate-600",
                      )}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", typeConfig?.color)}
                      >
                        {typeConfig?.label ?? c.correctionType}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {c.agentName}
                      </span>
                      {c.timesSeen > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          Seen {c.timesSeen}×
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      <span className="text-slate-400">Was:</span>{" "}
                      {formatDecision(
                        c.originalDecision as Record<string, unknown>,
                      )}
                      {" → "}
                      <span className="font-medium text-slate-900">
                        {formatDecision(
                          c.correctedDecision as Record<string, unknown>,
                        )}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        statusConfig?.bg ?? "bg-slate-100",
                        statusConfig?.color ?? "text-slate-600",
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig?.label ?? c.status}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="mb-1 text-xs font-medium text-slate-500 uppercase">
                          AI&apos;s Decision
                        </h4>
                        <pre className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                          {JSON.stringify(c.originalDecision, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="mb-1 text-xs font-medium text-slate-500 uppercase">
                          Your Correction
                        </h4>
                        <pre className="rounded-md bg-green-50 p-3 text-xs text-slate-700">
                          {JSON.stringify(c.correctedDecision, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {c.notes && (
                      <div className="mt-3">
                        <h4 className="mb-1 text-xs font-medium text-slate-500 uppercase">
                          Notes
                        </h4>
                        <p className="text-sm text-slate-700">{c.notes}</p>
                      </div>
                    )}

                    {c.status === "pending" && (
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() =>
                            acceptMutation.mutate({ correctionId: c.id })
                          }
                          disabled={acceptMutation.isPending}
                        >
                          <ThumbsUp className="mr-1 h-3 w-3" />
                          Accept & Learn
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            rejectMutation.mutate({ correctionId: c.id })
                          }
                          disabled={rejectMutation.isPending}
                        >
                          <ThumbsDown className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ModulePageShell>
  );
}
