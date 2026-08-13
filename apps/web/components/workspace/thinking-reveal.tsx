"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Brain,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AGENTS } from "@/lib/ai-ux/types";
import type { ThinkingEvent } from "@/lib/hooks/use-streaming-chat";

// ─── Agent identity resolution (same registry the simulations use) ─────────

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

// ─── Sub-components ─────────────────────────────────────────────────────────

function AgentAvatar({
  agent,
  size = "sm",
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

/** A reasoning line fully revealed (settled), mirroring the simulation feed. */
function SettledLine({ event }: { event: ThinkingEvent }) {
  const agent = resolveAgent(event.agent);
  return (
    <div className="flex items-start gap-2.5">
      <AgentAvatar agent={agent} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("text-[11px] font-semibold", agent.accent)}>
            {agent.name}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-1.5 py-px text-[9px] font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/30">
            <Brain className="h-2.5 w-2.5" />
            Thinking
          </span>
          {event.durationMs !== undefined && (
            <span className="text-[9px] text-muted-foreground">
              {(event.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12px] leading-5 text-slate-700 dark:text-slate-300">
          {event.text}
        </p>
      </div>
      <CheckCircle2 className="mt-1.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
    </div>
  );
}

/** The active reasoning line — shimmer then typewriter, exactly like the
 *  simulation's think steps. */
function ActiveLine({
  event,
  visible,
}: {
  event: ThinkingEvent;
  visible: number;
}) {
  const agent = resolveAgent(event.agent);
  const typed = event.text.slice(0, visible);
  const waiting = visible === 0;

  return (
    <div className="flex items-start gap-2.5">
      <AgentAvatar agent={agent} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("text-[11px] font-semibold", agent.accent)}>
            {agent.name}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-1.5 py-px text-[9px] font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/30">
            <Brain className="h-2.5 w-2.5" />
            Thinking
          </span>
        </div>
        {waiting ? (
          <p className="mt-1 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="opacity-70">{event.text}</span>
            <ThinkingDots />
          </p>
        ) : (
          <p className="mt-0.5 text-[12px] leading-5 text-slate-700 dark:text-slate-300">
            {typed}
            <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-indigo-500 align-middle" />
            <ThinkingDots />
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main block ─────────────────────────────────────────────────────────────

export interface ThinkingRevealProps {
  events: ThinkingEvent[];
  isStreaming?: boolean;
  /** True once the answer text has started streaming. */
  hasContent?: boolean;
}

const TYPING_INTERVAL_MS = 14;
const CHARS_PER_TICK = 2;

export function ThinkingReveal({
  events,
  isStreaming = false,
  hasContent = false,
}: ThinkingRevealProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  // Lines fully revealed. The line at `settledCount` is the one typing now.
  const [settledCount, setSettledCount] = useState(0);
  const [visible, setVisible] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const activeEvent = !hasContent ? events[settledCount] : undefined;

  // Typewriter: reveal the active line gradually (pure — no side effects
  // inside updaters, so StrictMode double-invocation is safe).
  useEffect(() => {
    if (!isStreaming || hasContent || !activeEvent) return;
    const timer = setInterval(() => {
      setVisible((v) => Math.min(v + CHARS_PER_TICK, activeEvent.text.length));
    }, TYPING_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isStreaming, hasContent, activeEvent]);

  // Settle a line the moment it finishes typing.
  useEffect(() => {
    if (!isStreaming || hasContent) return;
    const active = events[settledCount];
    if (active && visible >= active.text.length) {
      setSettledCount((s) => s + 1);
      setVisible(0);
    }
  }, [visible, settledCount, events, isStreaming, hasContent]);

  // The moment the answer starts, every reasoning line settles instantly.
  useEffect(() => {
    if (hasContent) {
      setSettledCount(events.length);
      setVisible(0);
    }
  }, [hasContent, events.length]);

  // Auto-scroll to the newest reasoning line.
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events.length, visible, settledCount]);

  const thinking = isStreaming && !hasContent;
  const showShimmer = thinking && events.length === 0;
  const settledLines = useMemo(
    () => events.slice(0, settledCount),
    [events, settledCount],
  );

  // Participating agents in order of first appearance.
  const roster = useMemo(
    () =>
      Array.from(
        new Map(events.map((e) => [e.agent, resolveAgent(e.agent)])).entries(),
      ),
    [events],
  );

  // Nothing to reveal (idle message or history replay) — render nothing.
  if (!thinking && events.length === 0) return null;

  return (
    <div className="w-full max-w-[80%] overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-transparent dark:border-indigo-500/20 dark:from-indigo-500/5">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2 transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">
            {thinking ? "Thinking…" : "Thought process"}
          </span>
          {events.length > 0 && (
            <span className="rounded-full bg-indigo-100 px-1.5 py-px text-[9px] font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              {events.length} step{events.length !== 1 ? "s" : ""}
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
                  <AgentAvatar agent={spec} />
                  {spec.name}
                </span>
              ))}
            </div>
          )}

          {/* Reasoning feed */}
          <div
            ref={listRef}
            className="max-h-56 space-y-2.5 overflow-y-auto px-3 py-2.5 scrollbar-thin"
          >
            {showShimmer && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Thinking…</span>
                <ThinkingDots />
              </div>
            )}
            {settledLines.map((event, i) => (
              <SettledLine
                key={`${event.step ?? "think"}-${i}`}
                event={event}
              />
            ))}
            {activeEvent && (
              <ActiveLine event={activeEvent} visible={visible} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
