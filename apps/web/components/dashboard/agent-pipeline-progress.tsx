"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, XCircle, Circle } from "lucide-react";

export type PipelineStage = {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  detail?: string;
  duration?: number;
};

type AgentPipelineProgressProps = {
  stages: PipelineStage[];
  className?: string;
};

const STAGE_ICONS = {
  pending: Circle,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
};

const STAGE_COLORS = {
  pending: "text-muted-foreground/40",
  running: "text-primary",
  completed: "text-emerald-500",
  failed: "text-red-500",
};

const STAGE_BG = {
  pending: "bg-muted/30",
  running: "bg-primary/10",
  completed: "bg-emerald-500/10",
  failed: "bg-red-500/10",
};

const STAGE_BORDER = {
  pending: "border-muted/20",
  running: "border-primary/20",
  completed: "border-emerald-500/20",
  failed: "border-red-500/20",
};

export function AgentPipelineProgress({
  stages,
  className,
}: AgentPipelineProgressProps) {
  const currentIndex = useMemo(() => {
    const running = stages.findIndex((s) => s.status === "running");
    if (running >= 0) return running;
    const failed = stages.findIndex((s) => s.status === "failed");
    if (failed >= 0) return failed;
    return stages.length - 1;
  }, [stages]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Pipeline visualization */}
      <div className="flex items-center gap-1.5">
        {stages.map((stage, i) => {
          const isLast = i === stages.length - 1;
          const Icon = STAGE_ICONS[stage.status];

          return (
            <div key={stage.id} className="flex items-center gap-1.5 flex-1">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all duration-300",
                  STAGE_BG[stage.status],
                  STAGE_BORDER[stage.status],
                  stage.status === "running" &&
                    "motion-safe:animate-pulse shadow-sm",
                  i === currentIndex &&
                    stage.status === "running" &&
                    "ring-1 ring-primary/30",
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    STAGE_COLORS[stage.status],
                    stage.status === "running" && "motion-safe:animate-spin",
                  )}
                />
                <span
                  className={cn(
                    "text-[11px] font-medium whitespace-nowrap",
                    stage.status === "pending" && "text-muted-foreground/50",
                    stage.status === "running" && "text-primary",
                    stage.status === "completed" && "text-emerald-600",
                    stage.status === "failed" && "text-red-600",
                  )}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "h-px flex-1 min-w-[8px] transition-all duration-500",
                    stage.status === "completed"
                      ? "bg-emerald-300"
                      : "bg-muted-300/30",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current stage detail */}
      {stages[currentIndex]?.detail && (
        <div className="pl-1">
          <p className="text-[11px] text-muted-foreground/70 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-1 duration-300">
            {stages[currentIndex].status === "running" && (
              <span className="inline-block mr-1.5 h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
            )}
            {stages[currentIndex].detail}
            {stages[currentIndex].duration != null && (
              <span className="ml-2 tabular-nums text-muted-foreground/50">
                ({(stages[currentIndex].duration! / 1000).toFixed(1)}s)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Common Pipeline Templates ─────────────────────────────────────────────────

export const INGESTION_PIPELINE: PipelineStage[] = [
  { id: "detect", label: "Detect", status: "pending" },
  { id: "extract", label: "Extract", status: "pending" },
  { id: "classify", label: "Classify", status: "pending" },
  { id: "match", label: "Match", status: "pending" },
  { id: "post", label: "Post", status: "pending" },
];

export const RECONCILIATION_PIPELINE: PipelineStage[] = [
  { id: "fetch", label: "Fetch Statement", status: "pending" },
  { id: "match", label: "Match Transactions", status: "pending" },
  { id: "flag", label: "Flag Exceptions", status: "pending" },
  { id: "review", label: "Review", status: "pending" },
  { id: "close", label: "Close", status: "pending" },
];

export const PAYMENT_PIPELINE: PipelineStage[] = [
  { id: "validate", label: "Validate", status: "pending" },
  { id: "approve", label: "Approve", status: "pending" },
  { id: "process", label: "Process", status: "pending" },
  { id: "confirm", label: "Confirm", status: "pending" },
];

export function getPipelineForAction(action: string): PipelineStage[] {
  const lower = action.toLowerCase();
  if (lower.includes("reconcil")) return RECONCILIATION_PIPELINE;
  if (lower.includes("payment") || lower.includes("pay"))
    return PAYMENT_PIPELINE;
  return INGESTION_PIPELINE;
}
