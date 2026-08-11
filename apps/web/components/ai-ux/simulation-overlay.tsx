"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  X,
  Sparkles,
  Terminal,
  Brain,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AGENTS, type AgentId, type AiUxStep } from "@/lib/ai-ux/types";
import {
  useAiUxSimulation,
  type UseAiUxSimulationResult,
} from "@/lib/ai-ux/use-ai-ux-simulation";
import { getAiUxTrace } from "@/lib/ai-ux/traces";

// ─── Per-kind metadata ──────────────────────────────────────────────────────

const KIND_META: Record<
  AiUxStep["kind"],
  { label: string; chip: string; Icon: typeof Zap }
> = {
  think: {
    label: "Thinking",
    chip: "bg-indigo-50 text-indigo-600 ring-indigo-200",
    Icon: Brain,
  },
  act: {
    label: "Working",
    chip: "bg-sky-50 text-sky-600 ring-sky-200",
    Icon: Zap,
  },
  tool: {
    label: "Tool",
    chip: "bg-slate-100 text-slate-500 ring-slate-200",
    Icon: Terminal,
  },
  approval: {
    label: "Approval",
    chip: "bg-amber-50 text-amber-600 ring-amber-200",
    Icon: ShieldCheck,
  },
  complete: {
    label: "Done",
    chip: "bg-emerald-50 text-emerald-600 ring-emerald-200",
    Icon: CheckCircle2,
  },
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function AgentAvatar({
  agent,
  size = "md",
}: {
  agent: AgentId;
  size?: "sm" | "md";
}) {
  const spec = AGENTS[agent];
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm",
        spec.avatar,
        size === "md" ? "h-8 w-8" : "h-6 w-6",
      )}
      title={`${spec.name} — ${spec.title}`}
    >
      <Bot className={size === "md" ? "h-4 w-4" : "h-3 w-3"} />
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

function StepRow({
  step,
  phase,
  visible,
  isCurrent,
}: {
  step: AiUxStep;
  phase: "thinking" | "typing" | "settled";
  visible: number;
  isCurrent: boolean;
}) {
  const spec = AGENTS[step.agent];
  const meta = KIND_META[step.kind];

  const text = step.kind === "tool" ? step.tool : step.text;
  const detail = step.kind === "tool" ? step.detail : null;

  return (
    <div className="flex items-start gap-3">
      <AgentAvatar agent={step.agent} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("text-xs font-semibold", spec.accent)}>
            {spec.name}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[9px] font-semibold ring-1 ring-inset",
              meta.chip,
            )}
          >
            <meta.Icon className="h-2.5 w-2.5" />
            {meta.label}
          </span>
          {step.kind === "approval" && step.confidence !== undefined && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-bold ring-1 ring-inset",
                step.confidence >= 90
                  ? "bg-emerald-50 text-emerald-600 ring-emerald-200"
                  : step.confidence >= 80
                    ? "bg-amber-50 text-amber-600 ring-amber-200"
                    : "bg-red-50 text-red-600 ring-red-200",
              )}
            >
              {step.confidence}% confidence
            </span>
          )}
        </div>

        {phase === "thinking" && isCurrent ? (
          <p className="mt-1 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="opacity-70">
              {step.kind === "tool" ? `Invoking ${step.tool}…` : step.text}
            </span>
          </p>
        ) : (
          <p
            className={cn(
              "mt-1 text-[13px] leading-5",
              step.kind === "tool"
                ? "font-mono text-[11.5px] text-slate-500 dark:text-slate-400"
                : "text-slate-700 dark:text-slate-300",
            )}
          >
            {isCurrent && phase === "typing" ? text.slice(0, visible) : text}
            {isCurrent && phase === "typing" && (
              <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-indigo-500 align-middle" />
            )}
            {isCurrent && phase === "thinking" && <ThinkingDots />}
          </p>
        )}

        {detail && (
          <p className="mt-0.5 text-[11px] italic text-slate-400 dark:text-slate-500">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Overlay ────────────────────────────────────────────────────────────────

export function SimulationOverlay({
  open,
  onClose,
  traceId,
  simulation,
}: {
  open: boolean;
  onClose: () => void;
  traceId: string;
  /**
   * Optional controlled playback state. When provided the overlay is purely
   * presentational — the owner (e.g. the global SimulationProvider) runs the
   * simulation so a minimized run keeps playing. Standalone use falls back to
   * an internal hook instance.
   */
  simulation?: UseAiUxSimulationResult;
}) {
  const trace = getAiUxTrace(traceId);
  const internalSimulation = useAiUxSimulation(
    simulation ? null : open ? traceId : null,
    simulation ? false : open,
  );
  const { status, current, settledCount, progress, agents, replay } =
    simulation ?? internalSimulation;

  const feedRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Escape closes the overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Auto-scroll the feed to the newest step.
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [settledCount, current?.index, current?.phase, autoScroll]);

  const settledSteps = useMemo(() => {
    if (!trace) return [];
    const count = status === "done" ? trace.steps.length : settledCount;
    return trace.steps.slice(0, count);
  }, [trace, status, settledCount]);

  if (!trace) return null;

  const activeAgent = current ? AGENTS[current.step.agent] : null;
  const statusLine = activeAgent
    ? `${activeAgent.name} · ${activeAgent.title}`
    : "Xenboox agent workforce";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[70] flex items-center justify-center p-4",
        !open && "pointer-events-none",
      )}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      // `inert` removes the hidden dialog (and its buttons) from the tab order.
      inert={!open || undefined}
      aria-label={trace.title}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 dark:border-slate-800 dark:bg-slate-950",
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {trace.title}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/30">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI Simulation
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {trace.tagline}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close simulation"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Agent roster */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-2.5 dark:border-slate-800/60">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Agents
          </span>
          {agents.map((agentId) => {
            const spec = AGENTS[agentId];
            return (
              <span
                key={agentId}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-2.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <AgentAvatar agent={agentId} size="sm" />
                {spec.name}
              </span>
            );
          })}
          <span className="ml-auto text-[10px] text-slate-400">
            {trace.module} · {trace.durationLabel}
          </span>
        </div>

        {/* Done banner */}
        {status === "done" && (
          <div className="mx-5 mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">
                Workflow complete
              </p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                {trace.steps.length} steps across {agents.length} agents · this
                is what a live run will look like when the agents are wired in.
              </p>
            </div>
          </div>
        )}

        {/* Feed */}
        <div
          ref={feedRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            setAutoScroll(
              el.scrollHeight - el.scrollTop - el.clientHeight < 24,
            );
          }}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
        >
          {settledSteps.map((step, i) => (
            <StepRow
              key={`${trace.id}-${i}`}
              step={step}
              phase="settled"
              visible={
                step.kind === "tool" ? step.tool.length : step.text.length
              }
              isCurrent={false}
            />
          ))}

          {status === "running" && current && (
            <StepRow
              step={current.step}
              phase={current.phase}
              visible={current.visible}
              isCurrent
            />
          )}

          {status === "running" && (
            <div className="flex items-center gap-1.5 pl-11 text-[11px] text-indigo-500">
              <ChevronRight className="h-3 w-3" />
              {activeAgent?.name} is working…
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate">{statusLine}</span>
                <span className="tabular-nums">
                  {status === "done"
                    ? `${trace.steps.length}/${trace.steps.length}`
                    : `${settledCount}/${trace.steps.length}`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>

            {status === "done" ? (
              <button
                type="button"
                onClick={replay}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Replay
              </button>
            ) : status === "running" ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                In progress
              </span>
            ) : (
              <button
                type="button"
                onClick={replay}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Run
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
