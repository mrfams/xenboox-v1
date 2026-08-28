"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronRight, Send, Sparkles, X } from "lucide-react";

import type { FocusRequest } from "./module-ai-context";

import { Button } from "@/components/ui";
import { useEntity } from "@/lib/entity-context";
import { useStreamingChat } from "@/lib/hooks/use-streaming-chat";
import { StreamingMessage } from "@/components/workspace/streaming-message";
import type { PageContextPayload, PageFocus } from "@/lib/chat/page-context";

type Suggestion = { label: string; prompt: string };

type CopilotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "completed" | "error";
};

const COMPOSER_MAX_HEIGHT = 120;

/**
 * Build default suggestion chips from the page name — keeps every module
 * page coherent without hand-writing prompts per page. Pages can override
 * via the `suggestions` prop.
 */
function defaultSuggestions(page: string, view?: string): Suggestion[] {
  const pageName = page || "this page";
  const base: Suggestion[] = [
    {
      label: "Summarize what I'm seeing",
      prompt: `Summarize what's on the ${pageName} page and flag anything that needs attention.`,
    },
    {
      label: "Find anomalies",
      prompt: `Scan the ${pageName} data for anomalies or anything unusual.`,
    },
  ];
  if (view) {
    base.unshift({
      label: `Explain the ${view} view`,
      prompt: `Explain what the ${view} view shows and what stands out.`,
    });
  }
  return base;
}

export function ModulePageCopilot({
  title,
  pageContext,
  suggestions,
  focusRequest,
}: {
  title: string;
  pageContext?: Partial<PageContextPayload>;
  suggestions?: Suggestion[];
  /** Row AI action request — open the panel targeted at a specific record. */
  focusRequest?: FocusRequest | null;
}) {
  const { entityId, isLoaded } = useEntity();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [focus, setFocus] = useState<PageFocus | null>(null);
  const conversationId = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusNonce = useRef(0);

  const {
    sendMessage,
    cancelStream,
    isStreaming,
    streamedContent,
    agentActivities,
    delegations,
    documents,
    approvals,
    toolTraces,
  } = useStreamingChat({
    entityId: entityId ?? "",
    onConversationCreated: (id) => {
      conversationId.current = id;
    },
    onComplete: (fullResponse) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: fullResponse,
          status: "completed",
        },
      ]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: `Sorry, I ran into a problem: ${error}. Please try again.`,
          status: "error",
        },
      ]);
    },
  });

  // Row AI action → open the panel targeted at that record. A fresh nonce
  // re-fires even when the same row is re-picked (so clicking twice still
  // re-opens), and the thread resets so the new target starts clean.
  // If the request carries an initialPrompt (right-click menu command), it is
  // stashed and auto-sent by `autoSendRef` once the focus is in context.
  const autoSendRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusRequest || focusRequest.nonce === lastFocusNonce.current) return;
    lastFocusNonce.current = focusRequest.nonce;
    autoSendRef.current = focusRequest.initialPrompt ?? null;
    setFocus(focusRequest.focus);
    setMessages([]);
    conversationId.current = null;
    setOpen(true);
  }, [focusRequest]);

  // Once the focus is applied, fire any pending initial command from a
  // right-click menu action. The context override is passed explicitly so the
  // command always carries the focused record — even if the effect runs with
  // a stale handleSend closure from a previous render.
  useEffect(() => {
    if (!focus || !autoSendRef.current) return;
    const prompt = autoSendRef.current;
    autoSendRef.current = null;
    handleSendRef.current?.(prompt, {
      ...(pageContext ?? {}),
      focus,
    } as PageContextPayload);
  }, [focus, pageContext]);

  // Merge the focused record into the page context sent to the pipeline — the
  // AI sees "Focused: Employee Dylan Cooper (id) | Tax rate: 5% | …" closest
  // to the user's ask, so a bare "why is the tax 5%?" is unambiguous.
  const effectiveContext = useMemo<
    Partial<PageContextPayload> | undefined
  >(() => {
    if (!focus) return pageContext;
    return { ...(pageContext ?? {}), focus };
  }, [pageContext, focus]);

  // Focus-aware suggestions — the row is already in context, so the prompts
  // lean on that instead of repeating the record's name.
  const chips = useMemo(() => {
    if (suggestions) return suggestions;
    if (focus) {
      return [
        {
          label: "Why is this the case?",
          prompt: `Explain why this ${focus.kind.toLowerCase()} looks the way it does — break down the figures and flag anything unusual.`,
        },
        {
          label: "Change something",
          prompt: `What should change here? Review this ${focus.kind.toLowerCase()} and tell me the impact before I commit to it.`,
        },
        {
          label: "Summarize this row",
          prompt: `Summarize this ${focus.kind.toLowerCase()} — the key facts, current state and anything I should know.`,
        },
        ...defaultSuggestions(title, pageContext?.view),
      ];
    }
    return defaultSuggestions(title, pageContext?.view);
  }, [suggestions, focus, title, pageContext?.view]);

  // Keep the newest content in view while streaming.
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, streamedContent, isStreaming]);

  const close = useCallback(() => {
    if (isStreaming) cancelStream();
    setOpen(false);
  }, [isStreaming, cancelStream]);

  // Auto-grow the composer (mirrors the dashboard composer behavior).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }, [input]);

  // Focus the composer when the panel opens; close on Escape.
  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const handleSend = useCallback(
    (text?: string, contextOverride?: PageContextPayload) => {
      const trimmed = (text ?? input).trim();
      if (!trimmed || !entityId || isStreaming) return;

      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: trimmed,
          status: "completed",
        },
      ]);
      setInput("");

      void sendMessage(
        trimmed,
        conversationId.current ?? undefined,
        undefined,
        contextOverride ?? (effectiveContext as PageContextPayload | undefined),
      );
    },
    [entityId, input, isStreaming, sendMessage, effectiveContext],
  );

  // Latest handleSend for the auto-send effect (avoids stale closure).
  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  // Reset the thread when the panel is reopened after a close, so each visit
  // starts clean but follow-ups within a visit stay in one conversation.
  const openPanel = useCallback(() => {
    setOpen(true);
  }, []);

  const clearFocus = useCallback(() => {
    autoSendRef.current = null;
    setFocus(null);
    setMessages([]);
    conversationId.current = null;
  }, []);

  if (!isLoaded) return null;

  return (
    <>
      {/* Trigger */}
      <Button
        type="button"
        variant="outline"
        onClick={openPanel}
        className="h-9 shrink-0 gap-1.5 border-border/60 bg-card px-3 text-xs font-medium text-muted-foreground shadow-sm transition-all hover:border-primary/30 hover:text-primary"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Ask Xenboox
        <ChevronRight className="h-3 w-3 opacity-50" />
      </Button>

      {/* Panel */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/10 backdrop-blur-[2px] animate-in fade-in-0 duration-200"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Ask Xenboox about ${title}`}
            className="flex h-full w-full max-w-[400px] flex-col border-l border-border/60 bg-card shadow-2xl animate-in slide-in-from-right-2 duration-300"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    Ask Xenboox
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    About this page · {title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                title="Close"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Page context chip — transparency about what the AI can see */}
            <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-4 py-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <p className="truncate text-[11px] text-muted-foreground">
                Viewing:{" "}
                <span className="font-medium text-foreground">
                  {title}
                  {pageContext?.view ? ` · ${pageContext.view}` : ""}
                </span>
                {pageContext?.count !== undefined && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {pageContext.count.toLocaleString()} records
                  </span>
                )}
              </p>
            </div>

            {/* Focused record chip — the row the user picked up */}
            {focus && (
              <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2">
                <Sparkles className="h-3 w-3 shrink-0 text-primary" />
                <p className="min-w-0 flex-1 truncate text-[11px] text-foreground">
                  <span className="font-medium">
                    {focus.kind} · {focus.name}
                  </span>
                  {focus.fields && focus.fields.length > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      —{" "}
                      {focus.fields
                        .map((f) => `${f.label}: ${f.value}`)
                        .join(" · ")}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={clearFocus}
                  title="Ask about the whole page instead"
                  aria-label="Clear focused record"
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Messages */}
            <div
              role="log"
              aria-live="polite"
              aria-label={`Conversation with Xenboox about ${title}`}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 && !isStreaming && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {focus
                      ? `Ask about this ${focus.kind.toLowerCase()}`
                      : "Ask about the data on this page"}
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    {focus
                      ? "No need to name it — this row is already in context. Ask why, ask to change it, or task the agent."
                      : "Question it, task it, or ask for a change — the CFO agent answers with live, entity-scoped data."}
                  </p>
                </div>
              )}

              {messages.map((message) => {
                if (message.role === "user") {
                  return (
                    <div
                      key={message.id}
                      className="flex animate-in flex-col items-end gap-1 fade-in-0 slide-in-from-bottom-2 duration-300"
                    >
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-xs leading-relaxed text-primary-foreground">
                        {message.content}
                      </div>
                    </div>
                  );
                }

                if (message.status === "error") {
                  return (
                    <div
                      key={message.id}
                      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                    >
                      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-error-clay/30 bg-error-clay-bg px-4 py-2.5 text-xs leading-relaxed text-error-clay">
                        {message.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <StreamingMessage
                    key={message.id}
                    content={message.content}
                    isStreaming={false}
                  />
                );
              })}

              {/* In-flight assistant response */}
              {isStreaming && (
                <StreamingMessage
                  content={streamedContent}
                  isStreaming
                  agentActivities={agentActivities}
                  toolCalls={toolTraces}
                  delegations={delegations}
                  documents={documents}
                  approvals={approvals}
                />
              )}

              <div ref={bottomRef} />
            </div>

            {/* Suggestions when empty */}
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      setInput(chip.prompt);
                      textareaRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    {chip.label}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            <div className="border-t border-border/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    focus
                      ? `Ask about this ${focus.kind.toLowerCase()}...`
                      : "Ask about this page..."
                  }
                  aria-label={
                    focus
                      ? `Ask about this ${focus.kind.toLowerCase()}`
                      : "Ask about this page"
                  }
                  className="max-h-[120px] min-h-[24px] flex-1 resize-none overflow-y-auto rounded-lg border border-border/60 bg-muted/40 px-3 py-[5px] text-sm leading-normal text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isStreaming}
                  aria-label="Send"
                  title="Send message"
                  className="h-9 w-9 shrink-0 rounded-lg"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Enter to send · Shift+Enter for a new line
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
