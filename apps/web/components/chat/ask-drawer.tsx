"use client";

// ─── Ask Drawer ─────────────────────────────────────────────────────────────
//
// Inline "ask about this" thread for data pages (Financial Pulse, Ledger,
// …). Slides from the right, carries the page + focused-record context
// (Cursor-style @-mention via PageContextPayload.focus), renders Thought +
// answers + follow-ups without leaving the page. Answers never eject to
// Command Center; escalations surface in Tasks, where decisions live.

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  useStreamingChat,
  type ThinkingEvent,
} from "@/lib/hooks/use-streaming-chat";
import type { PageContextPayload, PageFocus } from "@/lib/chat/page-context";
import { ThinkingReveal } from "@/components/workspace/thinking-reveal";
import { RichMessageRenderer } from "@/components/workspace/rich-message-renderer";

/**
 * Ask entrypoint for data pages. Same single-arg call shape as before —
 * the optional focus is the Cursor-style @-mention of the row/card asked
 * about, so "why is the tax 5%?" needs no naming.
 */
export type AskFn = (prompt: string, focus?: PageFocus) => void;

interface AskTurn {
  id: string;
  question: string;
  answer: string;
  thinking: ThinkingEvent[];
}

export interface AskDrawerProps {
  entityId: string;
  /** Drawer title, e.g. "Ask about March P&L". */
  title: string;
  /** What the user asked about, e.g. "Revenue dipped 12%". Shown as context. */
  subject?: string;
  /** Sent once on open. Follow-ups reuse the same conversation. */
  initialPrompt: string;
  /** Page + focused record context, woven into the pipeline input. */
  pageContext?: PageContextPayload;
  onClose: () => void;
}

export function AskDrawer({
  entityId,
  title,
  subject,
  initialPrompt,
  pageContext,
  onClose,
}: AskDrawerProps) {
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [draft, setDraft] = useState("");
  const conversationIdRef = useRef<string | undefined>(undefined);
  const thinkingRef = useRef<ThinkingEvent[]>([]);
  const pendingQuestionRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const {
    sendMessage,
    cancelStream,
    isStreaming,
    streamedContent,
    thinkingEvents,
  } = useStreamingChat({
    entityId,
    onConversationCreated: (id) => {
      conversationIdRef.current = id;
    },
    onThinking: (event) => {
      thinkingRef.current = [...thinkingRef.current, event];
    },
    onComplete: (fullResponse) => {
      const done: AskTurn = {
        id: `turn-${Date.now()}`,
        question: pendingQuestionRef.current,
        answer: fullResponse,
        thinking: thinkingRef.current,
      };
      thinkingRef.current = [];
      setTurns((prev) => [...prev, done]);
    },
  });

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    pendingQuestionRef.current = trimmed;
    thinkingRef.current = [];
    void sendMessage(
      trimmed,
      conversationIdRef.current,
      undefined,
      pageContext,
    );
  }

  // Fire the initial prompt once on open.
  useEffect(() => {
    if (startedRef.current || !entityId) return;
    startedRef.current = true;
    ask(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  // Keep the latest turn in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, streamedContent, thinkingEvents.length]);

  // Abort the stream if the drawer closes mid-answer.
  useEffect(() => () => cancelStream(), [cancelStream]);

  function submit() {
    if (!draft.trim()) return;
    setDraft("");
    ask(draft);
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={title}
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border/50 bg-background shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            {subject && (
              <p className="truncate text-[11px] text-muted-foreground">{subject}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="space-y-4">
          {turns.map((turn) => (
            <div key={turn.id} className="space-y-2">
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[13px] leading-relaxed text-primary-foreground">
                  {turn.question}
                </p>
              </div>
              {turn.thinking.length > 0 && (
                <ThinkingReveal
                  events={turn.thinking}
                  isStreaming={false}
                  hasContent
                />
              )}
              <div className="max-w-[95%] rounded-2xl rounded-bl-md bg-accent px-4 py-2.5 text-[13px] leading-relaxed text-foreground">
                <RichMessageRenderer content={turn.answer} />
              </div>
            </div>
          ))}

          {/* Live turn */}
          {isStreaming && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[13px] leading-relaxed text-primary-foreground">
                  {pendingQuestionRef.current}
                </p>
              </div>
              {(thinkingEvents.length > 0 || !streamedContent) && (
                <ThinkingReveal
                  events={thinkingEvents}
                  isStreaming
                  hasContent={streamedContent.length > 0}
                />
              )}
              {streamedContent ? (
                <div className="max-w-[95%] rounded-2xl rounded-bl-md bg-accent px-4 py-2.5 text-[13px] leading-relaxed text-foreground">
                  <RichMessageRenderer content={streamedContent} />
                  <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-primary/60 align-middle" />
                </div>
              ) : (
                <div className="flex items-center gap-2 px-1 py-1 text-xs text-muted-foreground/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span role="status" aria-live="polite">
                    Thinking…
                  </span>
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border/40 bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask a follow-up…"
            aria-label="Ask a follow-up"
            disabled={isStreaming}
            className={cn(
              "h-9 min-w-0 flex-1 rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground",
              "placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary",
              "disabled:opacity-50",
            )}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim() || isStreaming}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] leading-none text-muted-foreground/60">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
