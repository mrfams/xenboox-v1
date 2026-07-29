"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { ConfidenceBar } from "./confidence-bar";

export type AgentActivityItemData = {
  id: string;
  agent: string;
  action: string;
  description?: string;
  status: string;
  confidence?: number | null;
  duration?: number | null;
  entityId?: string;
  createdAt: string | Date;
  reasoning?: string;
  source?: string;
};

type AgentActivityItemProps = {
  activity: AgentActivityItemData;
  isLatest?: boolean;
  className?: string;
};

const AGENT_COLORS: Record<string, string> = {
  cfo: "bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800",
  controller:
    "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
  treasury:
    "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
  compliance:
    "bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800",
  ledger: "bg-sky-500/10 text-sky-600 border-sky-200 dark:border-sky-800",
  ap: "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800",
  ar: "bg-teal-500/10 text-teal-600 border-teal-200 dark:border-teal-800",
  cash: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800",
  reconciliation:
    "bg-cyan-500/10 text-cyan-600 border-cyan-200 dark:border-cyan-800",
  document:
    "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800",
};

function getAgentKey(agent: string): string {
  return agent
    .toLowerCase()
    .replace(/-agent$/, "")
    .replace(/-/g, "_");
}

function getAgentBadge(agent: string): string {
  const key = getAgentKey(agent);
  const short: Record<string, string> = {
    cfo: "CFO",
    controller: "CTR",
    treasury: "TRS",
    compliance: "CMP",
    ledger: "LDG",
    ap: "AP",
    ar: "AR",
    cash: "CSH",
    reconciliation: "REC",
    document: "DOC",
  };
  return short[key] ?? agent.slice(0, 3).toUpperCase();
}

function getAgentLabel(agent: string): string {
  const key = getAgentKey(agent);
  const labels: Record<string, string> = {
    cfo: "CFO Agent",
    controller: "Controller Agent",
    treasury: "Treasury Agent",
    compliance: "Compliance Agent",
    ledger: "Ledger Agent",
    ap: "AP Agent",
    ar: "AR Agent",
    cash: "Cash Agent",
    reconciliation: "Reconciliation Agent",
    document: "Document Agent",
  };
  return labels[agent.toLowerCase()] ?? agent.replace(/-/g, " ");
}

export function AgentActivityItem({
  activity,
  isLatest,
  className,
}: AgentActivityItemProps) {
  const agentKey = getAgentKey(activity.agent);
  const colorClass =
    AGENT_COLORS[agentKey] ?? "bg-primary/10 text-primary border-primary/20";
  const agentLabel = getAgentLabel(activity.agent);
  const badge = getAgentBadge(activity.agent);
  const isRunning =
    activity.status === "running" || activity.status === "processing";
  const isFailed = activity.status === "failed" || activity.status === "error";
  const isCompleted =
    activity.status === "completed" || activity.status === "done";

  const timeAgo = useMemo(() => {
    const date =
      activity.createdAt instanceof Date
        ? activity.createdAt
        : new Date(activity.createdAt);
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "recently";
    }
  }, [activity.createdAt]);

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card px-3 py-2.5 transition-all duration-200",
        isRunning && "border-primary/30 bg-primary/[0.02]",
        isFailed &&
          "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20",
        isLatest && !isRunning && "border-emerald-200 dark:border-emerald-900",
        className,
      )}
    >
      {/* Left accent bar for running items */}
      {isRunning && (
        <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary motion-safe:animate-pulse" />
      )}
      {isFailed && (
        <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-red-500" />
      )}
      {isCompleted && isLatest && (
        <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-emerald-500" />
      )}

      <div className="flex items-start gap-3 pl-2">
        {/* Agent icon */}
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold",
            colorClass,
            isRunning && "ring-2 ring-primary/30",
          )}
        >
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
          ) : isFailed ? (
            <XCircle className="h-3.5 w-3.5" />
          ) : (
            badge
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "text-xs font-semibold",
                isRunning && "text-primary",
                isFailed && "text-red-600",
              )}
            >
              {agentLabel}
            </span>
            {isRunning && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                <span className="h-1 w-1 rounded-full bg-primary motion-safe:animate-ping" />
                Running
              </span>
            )}
          </div>
          <p
            className={cn(
              "text-xs mt-0.5 capitalize",
              isRunning ? "text-primary/80" : "text-muted-foreground",
            )}
          >
            {activity.action.replace(/_/g, " ")}
            {activity.description && (
              <span className="text-muted-foreground/70 ml-1">
                — {activity.description}
              </span>
            )}
          </p>

          {/* Bottom row: time + confidence + duration */}
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Clock className="h-2.5 w-2.5" />
              {timeAgo}
            </span>

            {activity.confidence != null && (
              <ConfidenceBar
                confidence={activity.confidence}
                size="sm"
                showLabel
              />
            )}

            {activity.duration != null && (
              <span className="text-[10px] tabular-nums text-muted-foreground/50">
                {(activity.duration / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </div>

        {/* Status icon */}
        {isCompleted && (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
        )}
        {isFailed && (
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
        )}
      </div>
    </div>
  );
}
