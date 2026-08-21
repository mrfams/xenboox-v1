"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Bot, CheckCircle2, Loader2, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { AGENTS, type AgentId } from "@/lib/ai-ux/types";
import { getAiUxTrace } from "@/lib/ai-ux/traces";
import { useSimulation } from "@/lib/ai-ux/simulation-provider";

function MiniAvatar({ agent }: { agent: AgentId }) {
  const spec = AGENTS[agent];
  return (
    <div
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white ring-2 ring-white dark:ring-slate-950",
        spec.avatar,
      )}
      title={`${spec.name} — ${spec.title}`}
    >
      <Bot className="h-3 w-3" />
    </div>
  );
}

/**
 * Global "Agents at work" pill rendered by the dashboard layout's
 * SimulationProvider. Visible while a simulation is running (or freshly done)
 * with the overlay hidden — the always-available confirmation that the agent
 * workforce is still at it while you navigate. Clicking re-opens the overlay;
 * the × dismisses (stops) the run entirely.
 */
export function AgentsAtWorkPill() {
  const sim = useSimulation();
  const pathname = usePathname();
  const trace = useMemo(
    () => (sim?.activeTraceId ? getAiUxTrace(sim.activeTraceId) : null),
    [sim?.activeTraceId],
  );

  // Nothing running, or the overlay itself is visible — no need for the pill.
  if (!sim || !trace || sim.status === "idle" || sim.overlayOpen) {
    return null;
  }

  // On the AI Command Center the composer occupies the bottom center of the
  // viewport — float the pill above it so it never covers what you're typing.
  const onChatPage = pathname === "/dashboard";

  const running = sim.status === "running";
  const done = sim.status === "done";

  // Roster chips: first 3 agents + overflow count.
  const roster = trace.agents.slice(0, 3);
  const overflow = trace.agents.length - roster.length;

  // Live status line: the current step's agent + action while running,
  // otherwise a completion summary.
  const currentStep = sim.current?.step;
  const activeAgent = currentStep ? AGENTS[currentStep.agent] : null;
  const actionText = running
    ? currentStep?.kind === "tool"
      ? `Invoking ${currentStep.tool}…`
      : currentStep?.kind === "complete"
        ? currentStep.text
        : currentStep?.text
    : done
      ? `${trace.steps.length} steps · ${trace.agents.length} agents`
      : "";

  const stepLabel = running
    ? `${sim.settledCount}/${trace.steps.length}`
    : done
      ? `${trace.steps.length}/${trace.steps.length}`
      : "";

  return (
    <div
      className={cn(
        "fixed left-1/2 z-40 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-3 duration-300",
        onChatPage ? "bottom-24" : "bottom-5",
      )}
    >
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 py-1.5 pl-2 pr-1.5 shadow-lg shadow-slate-900/10 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95 dark:shadow-black/40"
      >
        {/* Agent avatars */}
        <div className="flex items-center -space-x-2 pl-0.5">
          {roster.map((agentId) => (
            <MiniAvatar key={agentId} agent={agentId} />
          ))}
          {overflow > 0 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500 ring-2 ring-white dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-950">
              +{overflow}
            </div>
          )}
        </div>

        {/* Status text */}
        <button
          type="button"
          onClick={sim.reopenSimulation}
          title="Open simulation"
          className="group flex min-w-0 items-center gap-2.5 rounded-full px-1.5 py-0.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-100">
              {running ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                  Agents at work
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Workflow complete
                </>
              )}
            </span>
            <span className="block max-w-[260px] truncate text-[10px] text-slate-500 dark:text-slate-400">
              {running && activeAgent ? (
                <>
                  <span className={cn("font-semibold", activeAgent.accent)}>
                    {activeAgent.name}
                  </span>{" "}
                  · {actionText}
                </>
              ) : (
                actionText
              )}
            </span>
          </span>

          {/* Progress */}
          <span className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-[9px] font-semibold tabular-nums text-slate-400">
              {stepLabel}
            </span>
            <span className="h-1 w-14 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <span
                className={cn(
                  "block h-full rounded-full transition-all duration-300",
                  done
                    ? "bg-emerald-500"
                    : "bg-gradient-to-r from-indigo-500 to-violet-500",
                )}
                style={{ width: `${Math.round(sim.progress * 100)}%` }}
              />
            </span>
          </span>
        </button>

        {/* Dismiss (stop the run entirely) */}
        <button
          type="button"
          onClick={sim.dismissSimulation}
          title="Stop and dismiss"
          aria-label="Stop agents and dismiss"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X className="h-3 w-3" />
        </button>

        {/* Simulation badge */}
        <Sparkles className="mr-1 h-3 w-3 shrink-0 text-indigo-400" />
      </div>
    </div>
  );
}
