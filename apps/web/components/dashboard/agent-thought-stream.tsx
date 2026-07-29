"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AgentPipelineProgress,
  type PipelineStage,
  getPipelineForAction,
} from "./agent-pipeline-progress";
import { Bot, ChevronDown, ChevronRight, Clock, Sparkles } from "lucide-react";

export type ThoughtStep = {
  id: string;
  action: string;
  detail?: string;
  status: "running" | "completed" | "failed";
  confidence?: number;
  duration?: number;
  timestamp?: string;
};

type AgentThoughtStreamProps = {
  agent: string;
  thoughtSteps: ThoughtStep[];
  isActive: boolean;
  className?: string;
};

const AGENT_ICONS: Record<string, string> = {
  cfo: "CFO",
  controller: "CTR",
  treasury: "TRS",
  compliance: "CMP",
  ledger: "LDG",
  ap: "AP",
  ar: "AR",
  cash: "CSH",
  reconciliation: "REC",
};

function getAgentLabel(agent: string): string {
  const key = agent.toLowerCase().replace(/-agent$/, "");
  return AGENT_ICONS[key] ?? agent.slice(0, 3).toUpperCase();
}

function getAgentColor(agent: string): string {
  const key = agent.toLowerCase().replace(/-agent$/, "");
  const colors: Record<string, string> = {
    cfo: "bg-indigo-500/10 text-indigo-600",
    controller: "bg-blue-500/10 text-blue-600",
    treasury: "bg-emerald-500/10 text-emerald-600",
    ledger: "bg-sky-500/10 text-sky-600",
    ap: "bg-rose-500/10 text-rose-600",
    ar: "bg-teal-500/10 text-teal-600",
    cash: "bg-orange-500/10 text-orange-600",
    reconciliation: "bg-cyan-500/10 text-cyan-600",
  };
  return colors[key] ?? "bg-primary/10 text-primary";
}

export function AgentThoughtStream({
  agent,
  thoughtSteps,
  isActive,
  className,
}: AgentThoughtStreamProps) {
  const [expanded, setExpanded] = useState(true);
  const pipelineStages = useMemo(() => {
    if (thoughtSteps.length === 0) return [];
    const lastAction = thoughtSteps[thoughtSteps.length - 1]?.action ?? "";
    const template = getPipelineForAction(lastAction);
    return template.map((stage, i) => {
      const matchingStep = thoughtSteps.find((s) =>
        s.action.toLowerCase().includes(stage.label.toLowerCase()),
      );
      if (matchingStep) {
        return {
          ...stage,
          status: matchingStep.status,
          detail: matchingStep.detail,
          duration: matchingStep.duration,
        } as PipelineStage;
      }
      if (
        i < template.length - 1 &&
        thoughtSteps.some((s) => s.status === "completed")
      ) {
        return { ...stage, status: "completed" } as PipelineStage;
      }
      return stage;
    });
  }, [thoughtSteps]);

  const hasActiveStep = thoughtSteps.some((s) => s.status === "running");
  const agentLabel = getAgentLabel(agent);
  const agentColor = getAgentColor(agent);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-all duration-300",
        isActive && "ring-1 ring-primary/20 shadow-sm",
        className,
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50",
          isActive && "bg-primary/[0.02]",
        )}
      >
        {/* Agent avatar */}
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
            agentColor,
            isActive && "ring-2 ring-primary/30 motion-safe:animate-pulse",
          )}
        >
          {agentLabel}
        </span>

        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold capitalize">
              {agent.replace(/-/g, " ")}
            </span>
            {isActive && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {hasActiveStep
              ? "Processing..."
              : `${thoughtSteps.length} step${thoughtSteps.length !== 1 ? "s" : ""} completed`}
          </p>
        </div>

        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3">
          {/* Pipeline progress */}
          {pipelineStages.length > 0 && (
            <AgentPipelineProgress stages={pipelineStages} />
          )}

          {/* Thought steps */}
          {thoughtSteps.length > 0 && (
            <div className="space-y-1.5">
              {thoughtSteps.map((step, i) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300",
                    step.status === "running" &&
                      "motion-safe:animate-pulse bg-primary/5",
                    step.status === "completed" && "bg-emerald-500/5",
                    step.status === "failed" && "bg-red-500/5",
                  )}
                >
                  {/* Status indicator */}
                  <span className="mt-0.5 shrink-0">
                    {step.status === "running" && (
                      <span className="relative flex h-3.5 w-3.5">
                        <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-primary" />
                      </span>
                    )}
                    {step.status === "completed" && (
                      <span className="flex h-3.5 w-3.5 items-center justify-center">
                        <Sparkles className="h-3 w-3 text-emerald-500" />
                      </span>
                    )}
                    {step.status === "failed" && (
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500">
                        <span className="text-[8px] text-white font-bold">
                          !
                        </span>
                      </span>
                    )}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-xs font-medium",
                        step.status === "completed" &&
                          "text-emerald-700 dark:text-emerald-400",
                        step.status === "failed" && "text-red-600",
                        step.status === "running" && "text-primary",
                      )}
                    >
                      {step.action.replace(/_/g, " ")}
                    </p>
                    {step.detail && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                        {step.detail}
                      </p>
                    )}
                    {/* Confidence + Duration */}
                    <div className="flex items-center gap-3 mt-1">
                      {step.confidence != null && (
                        <div className="flex items-center gap-1">
                          <div className="h-1 w-10 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                step.confidence >= 0.9
                                  ? "bg-emerald-400"
                                  : step.confidence >= 0.7
                                    ? "bg-amber-400"
                                    : "bg-red-400",
                              )}
                              style={{
                                width: `${Math.round(step.confidence * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {(step.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                      {step.duration != null && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
                          <Clock className="h-2.5 w-2.5" />
                          {(step.duration / 1000).toFixed(1)}s
                        </span>
                      )}
                      {step.timestamp && (
                        <span className="text-[10px] text-muted-foreground/60">
                          {step.timestamp}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Active thinking indicator */}
              {isActive && !hasActiveStep && (
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      Thinking
                    </span>
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1 w-1 rounded-full bg-muted-foreground/40 motion-safe:animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
