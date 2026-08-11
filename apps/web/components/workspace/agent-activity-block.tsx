"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  Bot,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
  ArrowRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AGENTS } from "@/lib/ai-ux/types";
import type { ToolTrace } from "@/lib/hooks/use-streaming-chat";

// ─── Agent identity resolution ─────────────────────────────────────────────
//
// The stream names agents in display form ("CFO Agent", "Ledger Agent", …).
// Map those onto the simulation registry so the live chat reuses the exact
// avatar gradients + accent colors the simulations use. Unknown names fall
// back to a neutral spec instead of crashing.

interface ResolvedAgent {
  name: string;
  avatar: string;
  accent: string;
}

const FALLBACK_AGENT: ResolvedAgent = {
  name: "Xenboox Agent",
  avatar: "from-slate-500 to-slate-700",
  accent: "text-slate-600 dark:text-slate-400",
};

function resolveAgent(raw: string): ResolvedAgent {
  const normalized = raw.trim().toLowerCase();
  for (const spec of Object.values(AGENTS)) {
    if (
      spec.id === normalized ||
      spec.name.toLowerCase() === normalized ||
      spec.name.toLowerCase().replace(" agent", "") === normalized
    ) {
      return { name: spec.name, avatar: spec.avatar, accent: spec.accent };
    }
  }
  return { ...FALLBACK_AGENT, name: raw };
}

// ─── Activity type (mirrors the hook's AgentActivityEvent) ────────────────

interface AgentActivity {
  agent: string;
  status: "started" | "completed" | "failed";
  action: string;
  confidence?: number;
  durationMs?: number;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function AgentAvatar({
  agent,
  size = "md",
}: {
  agent: ResolvedAgent;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm",
        agent.avatar,
        size === "md" ? "h-7 w-7" : "h-5 w-5",
      )}
    >
      <Bot className={size === "md" ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
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

function ActivityRow({
  activity,
  isLast,
}: {
  activity: AgentActivity;
  isLast: boolean;
}) {
  const agent = resolveAgent(activity.agent);
  const thinking = activity.status === "started";
  const failed = activity.status === "failed";

  return (
    <div className="flex items-start gap-2.5">
      <AgentAvatar agent={agent} size="sm" />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("text-[11px] font-semibold", agent.accent)}>
            {agent.name}
          </span>
          <span className="text-[9px] text-muted-foreground">—</span>
          <span className="text-[11px] text-muted-foreground">
            {activity.action}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
          {thinking ? (
            <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Thinking
              <ThinkingDots />
            </span>
          ) : (
            <>
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-medium",
                  failed
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {failed ? (
                  <AlertCircle className="h-3 w-3" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {failed ? "Failed" : "Done"}
              </span>
              {activity.confidence !== undefined && (
                <span
                  className={cn(
                    "font-medium",
                    activity.confidence >= 85
                      ? "text-emerald-600 dark:text-emerald-400"
                      : activity.confidence >= 70
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400",
                  )}
                >
                  {activity.confidence}% confidence
                </span>
              )}
              {activity.durationMs !== undefined && (
                <span>{(activity.durationMs / 1000).toFixed(1)}s</span>
              )}
            </>
          )}
        </div>
      </div>
      {!isLast && <div className="hidden" />}
    </div>
  );
}

function ToolRow({ trace }: { trace: ToolTrace }) {
  const running = trace.status === "running";
  const failed = trace.status === "failed";
  const args = trace.args
    ? Object.entries(trace.args)
        .slice(0, 2)
        .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`)
        .join(", ")
    : "";

  return (
    <div className="flex items-start gap-2.5 pl-8">
      <Terminal
        className={cn(
          "mt-0.5 h-3.5 w-3.5 shrink-0",
          failed
            ? "text-red-500"
            : running
              ? "text-indigo-500"
              : "text-slate-400",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {trace.toolName}
          </code>
          {args && (
            <span className="font-mono text-[9px] text-muted-foreground">
              ({args})
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide",
              failed
                ? "text-red-500"
                : running
                  ? "text-indigo-500"
                  : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {running ? (
              <>
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> running
              </>
            ) : failed ? (
              "failed"
            ) : (
              "ok"
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function DelegationRow({
  delegation,
}: {
  delegation: { from: string; to: string; reason: string };
}) {
  return (
    <div className="flex items-start gap-2.5 pl-8">
      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="font-medium text-foreground">{delegation.from}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-medium text-foreground">{delegation.to}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {delegation.reason}
        </span>
      </div>
    </div>
  );
}

// ─── Main block ─────────────────────────────────────────────────────────────

interface AgentActivityBlockProps {
  activities: AgentActivity[];
  delegations?: Array<{ from: string; to: string; reason: string }>;
  toolCalls?: ToolTrace[];
  isStreaming?: boolean;
}

export function AgentActivityBlock({
  activities,
  delegations = [],
  toolCalls = [],
  isStreaming = false,
}: AgentActivityBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest step while streaming.
  useEffect(() => {
    if (!isStreaming) return;
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [activities.length, toolCalls.length, delegations.length, isStreaming]);

  const hasActivity =
    activities.length > 0 || toolCalls.length > 0 || delegations.length > 0;
  const hasInProgress =
    isStreaming &&
    (activities.length > 0 || toolCalls.length > 0 || delegations.length > 0);
  if (!hasActivity && !hasInProgress && !isStreaming) return null;

  // Participating agents in order of first appearance (roster chips).
  const roster = Array.from(
    new Map(
      [
        ...activities.map((a) => a.agent),
        ...delegations.flatMap((d) => [d.from, d.to]),
      ].map((name) => [name, resolveAgent(name)]),
    ).entries(),
  );

  const totalSteps = activities.length + toolCalls.length + delegations.length;
  const hasThinking = activities.some((a) => a.status === "started");

  return (
    <div className="w-full max-w-[80%] overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-transparent dark:border-indigo-500/20 dark:from-indigo-500/5">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2 transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5"
      >
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">
            {hasThinking || (isStreaming && hasActivity)
              ? "Thinking…"
              : "Agent Activity"}
          </span>
          {totalSteps > 0 && (
            <span className="rounded-full bg-indigo-100 px-1.5 py-px text-[9px] font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              {totalSteps} step{totalSteps !== 1 ? "s" : ""}
            </span>
          )}
          {isStreaming && (
            <span className="inline-flex items-center gap-1 text-[10px] text-primary">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> working…
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-indigo-100/60 dark:border-indigo-500/15">
          {/* Roster chips */}
          {roster.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2.5">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Agents
              </span>
              {roster.map(([name, spec]) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-0.5 pl-0.5 pr-2 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <AgentAvatar agent={spec} size="sm" />
                  {spec.name}
                </span>
              ))}
            </div>
          )}

          {/* Steps */}
          <div
            ref={listRef}
            className="max-h-56 space-y-2.5 overflow-y-auto px-3 py-2.5 scrollbar-thin"
          >
            {activities.map((activity, i) => (
              <ActivityRow
                key={`${activity.agent}-${i}`}
                activity={activity}
                isLast={
                  i === activities.length - 1 &&
                  toolCalls.length === 0 &&
                  delegations.length === 0
                }
              />
            ))}
            {toolCalls.map((trace, i) => (
              <ToolRow key={`${trace.toolName}-${i}`} trace={trace} />
            ))}
            {delegations.map((delegation, i) => (
              <DelegationRow key={`del-${i}`} delegation={delegation} />
            ))}
            {isStreaming && totalSteps === 0 && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing your request…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
