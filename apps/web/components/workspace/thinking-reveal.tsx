"use client";

// ─── Thought ────────────────────────────────────────────────────────────────
//
// Claude/ChatGPT pattern for the workspace surfaces (copilot, document
// viewer, module chat): one collapsed line while working ("Thinking…"), one
// collapsed line when done ("Thought"). Expanding reveals first-person
// sentences — never agent rosters, step labels, timings, or tool internals.
// Those stay in LangFuse + the audit trail.
//
// Legacy events that carry label/step but no text fall back to a small
// generic map so old threads still read sensibly.

import { useEffect, useRef, useState } from "react";
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { ThinkingEvent } from "@/lib/hooks/use-streaming-chat";

const LEGACY_LINES: Record<string, string> = {
  intent_resolution: "Understanding your request",
  session_load: "Loading your context",
  entity_context: "Gathering your data",
  confidence_gate: "Double-checking before answering",
  tool_selection: "Figuring out the best approach",
  response_generation: "Writing your answer",
  approval_check: "Checking whether you need to weigh in",
  escalation_check: "Checking whether you need to weigh in",
  knowledge_retrieval: "Looking through your records",
  data_validation: "Checking the numbers",
  journal_entry: "Preparing the entry",
  invoice_creation: "Preparing the invoice",
  payment_processing: "Working on the payment",
  reconciliation: "Reconciling",
  report_generation: "Putting the report together",
  input_intake: "Reading your request",
  memory_retrieval: "Recalling our earlier conversation",
};

function thoughtLine(event: ThinkingEvent): string {
  if (event.text && event.text.trim().length > 0) return event.text.trim();
  if (event.step && LEGACY_LINES[event.step]) return LEGACY_LINES[event.step];
  return "Thinking it through";
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

export interface ThinkingRevealProps {
  events: ThinkingEvent[];
  isStreaming?: boolean;
  /** True once the answer text has started streaming. */
  hasContent?: boolean;
}

export function ThinkingReveal({
  events,
  isStreaming = false,
  hasContent = false,
}: ThinkingRevealProps) {
  // Collapsed by default once done. While streaming, open so the user
  // sees progress live, then settle shut when the answer lands. Manual
  // toggles mid-stream are respected — only transitions force a state.
  const [isExpanded, setIsExpanded] = useState(isStreaming && !hasContent);
  const settledRef = useRef(false);

  useEffect(() => {
    if (isStreaming && !hasContent) {
      settledRef.current = false;
      setIsExpanded(true);
    } else if (!settledRef.current) {
      settledRef.current = true;
      setIsExpanded(false);
    }
  }, [isStreaming, hasContent]);

  const thinking = isStreaming && !hasContent;

  // Nothing to reveal (idle message or history replay) — render nothing.
  if (!thinking && events.length === 0) return null;

  const lines = events
    .map(thoughtLine)
    .filter((line, i, all) => line.length > 0 && all.indexOf(line) === i)
    .slice(0, 4);

  return (
    <div className="w-full max-w-[80%] overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-transparent dark:border-indigo-500/20 dark:from-indigo-500/5">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between px-3 py-2 transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">
            {thinking ? "Thinking…" : "Thought"}
          </span>
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
          <div className="space-y-2 px-3 py-2.5">
            {thinking && lines.length === 0 && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Thinking…</span>
                <ThinkingDots />
              </div>
            )}
            {lines.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                {thinking && i === lines.length - 1 ? (
                  <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-indigo-500" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                )}
                <p
                  className={cn(
                    "text-[12px] leading-5",
                    thinking && i === lines.length - 1
                      ? "text-slate-500 dark:text-slate-400"
                      : "text-slate-700 dark:text-slate-300",
                  )}
                >
                  {line}
                  {thinking && i === lines.length - 1 && <ThinkingDots />}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
