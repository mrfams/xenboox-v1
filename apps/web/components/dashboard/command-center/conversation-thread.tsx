"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  Bot,
  RefreshCw,
  Send,
  AlertTriangle,
  Eye,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { ConfidenceBadge } from "@/components/shared/ai-native";
import { ActorBadge } from "@/components/shared/ai-native";
import {
  ConversationThinkingSteps,
  ToolCallTraceCard,
} from "@/components/chat/thinking-steps";
import { InlineDocumentViewer } from "@/components/chat/inline-document-viewer";
import {
  MessageActions,
  PinnedMessagesPanel,
  type PinnedMessage,
} from "@/components/chat/message-actions";
import { KnowledgeCitations } from "@/components/chat/knowledge-citations";
import { BatchProgressInline } from "@/components/chat/batch-progress-inline";
import {
  MessageReactions,
  type Reaction,
} from "@/components/chat/message-reactions";
import { DataTableInline } from "@/components/chat/data-table-inline";
import { ChartInline } from "@/components/chat/chart-inline";
import { DocumentGenerating } from "@/components/chat/document-generating";
import type {
  NeedsInputEvent,
  DataTableEvent,
  ChartEvent,
} from "@/lib/hooks/use-streaming-chat";
import type { useDashboardChat } from "@/lib/hooks/use-dashboard-chat";

// ─── Types ────────────────────────────────────────────────────────────────

type Message = ReturnType<typeof useDashboardChat>["messages"][number];

// ─── Inline Input Form ────────────────────────────────────────────────────
//
// When the AI needs more information to complete an action, it sends
// a NeedsInputEvent with fields the user must fill in. This component
// renders those fields inline in the conversation.

function InlineInputForm({
  spec,
  onSubmit,
}: {
  spec: NeedsInputEvent;
  onSubmit: (text: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill with known context
  useEffect(() => {
    if (spec.context) {
      const prefill: Record<string, string> = {};
      for (const [key, val] of Object.entries(spec.context)) {
        if (val != null) prefill[key] = String(val);
      }
      setValues(prefill);
    }
  }, [spec.context]);

  const handleSubmit = () => {
    // Build a natural language message from the form values
    const parts: string[] = [];
    for (const field of spec.missing) {
      const val = values[field.field];
      if (val) {
        parts.push(`${field.label}: ${val}`);
      } else if (field.required) {
        return; // Don't submit if required field is empty
      }
    }
    if (parts.length === 0) return;
    setIsSubmitting(true);
    onSubmit(`For the ${spec.action.replace(/_/g, " ")}: ${parts.join(". ")}`);
  };

  const allRequiredFilled = spec.missing
    .filter((f) => f.required)
    .every((f) => values[f.field]?.trim());

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
        <Bot className="h-4 w-4 text-primary/70" />
      </div>
      <div className="max-w-[85%] rounded-2xl border border-primary/20 bg-primary/[0.03] px-4 py-3">
        <p className="text-sm font-medium text-foreground mb-3">
          I need a few details to {spec.action.replace(/_/g, " ")}:
        </p>
        <div className="space-y-3">
          {spec.missing.map((field) => (
            <div key={field.field}>
              <label
                htmlFor={`needs-input-${field.field}`}
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                {field.label}
                {field.required && (
                  <span className="text-red-500 ml-0.5">*</span>
                )}
              </label>
              {field.type === "select" && field.options ? (
                <select
                  id={`needs-input-${field.field}`}
                  value={values[field.field] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.field]: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">Select...</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={`needs-input-${field.field}`}
                  value={values[field.field] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.field]: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              ) : (
                <input
                  id={`needs-input-${field.field}`}
                  type={
                    field.type === "number"
                      ? "number"
                      : field.type === "date"
                        ? "date"
                        : "text"
                  }
                  value={values[field.field] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.field]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allRequiredFilled || isSubmitting}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              allRequiredFilled && !isSubmitting
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {isSubmitting ? (
              <RefreshCw
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isSubmitting ? "Sending..." : "Submit"}
          </button>
          <span className="text-[10px] text-muted-foreground/50">
            Press Enter to submit
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Conversation Thread ──────────────────────────────────────────────────
//
// The main chat interface. Uses the real streaming chat hook.
// Rich messages with inline actions — approve, reject, recode — directly
// in the conversation. No page navigation needed.

export function ConversationThread({
  messages,
  isStreaming,
  streamedContent,
  thinkingEvents,
  toolTraces,
  approvals,
  documents,
  dataTables,
  charts,
  pendingInput,
  onSendMessage,
}: {
  messages: Message[];
  isStreaming: boolean;
  streamedContent: string;
  thinkingEvents: ReturnType<typeof useDashboardChat>["thinkingEvents"];
  toolTraces: ReturnType<typeof useDashboardChat>["toolTraces"];
  approvals: ReturnType<typeof useDashboardChat>["approvals"];
  documents: ReturnType<typeof useDashboardChat>["documents"];
  dataTables: DataTableEvent[];
  charts: ChartEvent[];
  pendingInput: NeedsInputEvent | null;
  onSendMessage: (text: string) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [processingApprovalIdx, setProcessingApprovalIdx] = useState<
    number | null
  >(null);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [messageReactions, setMessageReactions] = useState<
    Record<string, Reaction[]>
  >({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, streamedContent]);

  const utils = trpc.useUtils();

  const resolveApproval = trpc.approvals.resolve.useMutation({
    onSuccess: () => {
      setProcessingApprovalIdx(null);
      void utils.approvals.getPendingCount.invalidate();
    },
    onError: () => {
      setProcessingApprovalIdx(null);
    },
  });

  const handleApprovalAction = useCallback(
    (
      action: "approve" | "reject" | "review",
      approvalTitle: string,
      idx: number,
      itemId?: string,
      itemType?: string,
    ) => {
      setProcessingApprovalIdx(idx);
      // If we have a real item ID, use the server mutation (secure path)
      if (itemId && itemType) {
        resolveApproval.mutate({
          itemId,
          itemType: itemType as
            | "agent_escalation"
            | "journal_entry"
            | "ingestion_review"
            | "bank_reconciliation"
            | "payroll_run"
            | "imprest_retirement",
          action:
            action === "review"
              ? "approved"
              : action === "approve"
                ? "approved"
                : "rejected",
          reason:
            action === "review"
              ? `User requested explanation for: ${approvalTitle}`
              : undefined,
        });
      } else {
        // Fallback: send as chat message (legacy path — less secure)
        const message =
          action === "approve"
            ? `Approved: ${approvalTitle}`
            : action === "reject"
              ? `Rejected: ${approvalTitle}`
              : `Please review: ${approvalTitle}`;
        onSendMessage(message);
      }
    },
    [onSendMessage, resolveApproval],
  );

  // Reaction handler
  const handleReact = useCallback((messageId: string, emoji: string) => {
    setMessageReactions((prev) => {
      const existing = prev[messageId] ?? [];
      const reactionIndex = existing.findIndex((r) => r.emoji === emoji);

      if (reactionIndex >= 0) {
        // Toggle existing reaction
        const updated = [...existing];
        const reaction = updated[reactionIndex];
        if (reaction.userReacted) {
          // Remove user's reaction
          updated[reactionIndex] = {
            ...reaction,
            count: reaction.count - 1,
            userReacted: false,
          };
          // Remove if count is 0
          if (updated[reactionIndex].count === 0) {
            updated.splice(reactionIndex, 1);
          }
        } else {
          // Add user's reaction
          updated[reactionIndex] = {
            ...reaction,
            count: reaction.count + 1,
            userReacted: true,
          };
        }
        return { ...prev, [messageId]: updated };
      } else {
        // Add new reaction
        return {
          ...prev,
          [messageId]: [...existing, { emoji, count: 1, userReacted: true }],
        };
      }
    });
  }, []);

  // Pin/unpin message handler
  const handlePin = useCallback(
    (messageId: string) => {
      setPinnedMessages((prev) => {
        const existing = prev.find((m) => m.id === messageId);
        if (existing) {
          // Unpin
          return prev.filter((m) => m.id !== messageId);
        }
        // Pin
        const msg = messages.find((m) => m.id === messageId);
        if (!msg) return prev;
        return [
          ...prev,
          {
            id: msg.id,
            content: msg.content,
            role: msg.role as "user" | "assistant",
            pinnedAt: new Date(),
            sender: msg.role === "assistant" ? "AI" : "You",
          },
        ];
      });
    },
    [messages],
  );

  // Unpin handler
  const handleUnpin = useCallback((messageId: string) => {
    setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  // Jump to pinned message
  const handleJumpTo = useCallback((messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-2", "ring-primary/50");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-primary/50");
      }, 2000);
    }
  }, []);

  // Regenerate handler (placeholder — would call API to regenerate)
  const handleRegenerate = useCallback(
    (messageId: string) => {
      // Find the user message before this assistant message
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex > 0) {
        const prevMsg = messages[msgIndex - 1];
        if (prevMsg.role === "user") {
          onSendMessage(prevMsg.content);
        }
      }
    },
    [messages, onSendMessage],
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      {/* Pinned Messages Panel */}
      <PinnedMessagesPanel
        messages={pinnedMessages}
        onUnpin={handleUnpin}
        onJumpTo={handleJumpTo}
      />
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            id={`message-${msg.id}`}
            className={cn(
              "flex gap-3 group relative",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                <Bot className="h-4 w-4 text-primary/70" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative",
                msg.role === "assistant"
                  ? "bg-card border border-border/50 text-foreground"
                  : "bg-primary text-primary-foreground",
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Retry button for error messages */}
              {msg.role === "assistant" && msg.status === "error" && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => handleRegenerate(msg.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Retry
                  </button>
                </div>
              )}

              {/* Confidence badge on assistant messages */}
              {msg.role === "assistant" && msg.confidence !== undefined && (
                <div className="mt-2">
                  <ConfidenceBadge score={msg.confidence / 100} />
                </div>
              )}

              {/* Actor badge */}
              {msg.role === "assistant" && (
                <div className="mt-1">
                  <ActorBadge actor="ai" />
                </div>
              )}

              {/* Knowledge citations */}
              {msg.role === "assistant" &&
                msg.citations &&
                msg.citations.length > 0 && (
                  <KnowledgeCitations
                    citations={msg.citations.flatMap((event) =>
                      event.citations.map((c) => ({
                        index: c.index,
                        content: c.content,
                        sourceType: c.sourceType,
                        documentId: c.documentId,
                        score: c.score,
                        method: c.method,
                      })),
                    )}
                  />
                )}

              {/* Batch ingestion results */}
              {msg.role === "assistant" &&
                msg.batchResults &&
                msg.batchResults.length > 0 && (
                  <>
                    {msg.batchResults.map((result) => (
                      <BatchProgressInline
                        key={result.batchId}
                        batchId={result.batchId}
                        totalDocuments={result.totalDocuments}
                        completedDocuments={result.completedDocuments}
                        failedDocuments={result.failedDocuments}
                        documents={result.documents}
                        message={result.message}
                      />
                    ))}
                  </>
                )}
            </div>

            {/* Committed data tables (from completed messages) */}
            {msg.role === "assistant" &&
              msg.dataTables &&
              msg.dataTables.length > 0 && (
                <div className="mt-3 space-y-3">
                  {msg.dataTables.map((table, i) => (
                    <DataTableInline
                      key={`committed-table-${msg.id}-${i}`}
                      title={table.title}
                      columns={table.columns}
                      rows={table.rows}
                      summary={table.summary}
                      currency={table.currency}
                      selectable={table.rows.length > 1}
                      expandable={table.rows.some((r) => r.detail)}
                    />
                  ))}
                </div>
              )}

            {/* Committed charts (from completed messages) */}
            {msg.role === "assistant" &&
              msg.charts &&
              msg.charts.length > 0 && (
                <div className="mt-3 space-y-3">
                  {msg.charts.map((chart, i) => (
                    <ChartInline
                      key={`committed-chart-${msg.id}-${i}`}
                      type={chart.chartType}
                      title={chart.title}
                      data={chart.data}
                      xKey={chart.xKey}
                      yKey={chart.yKey}
                      series={chart.series}
                      currency={chart.currency}
                      summary={chart.summary}
                    />
                  ))}
                </div>
              )}

            {/* Message Reactions */}
            <div className="flex items-center gap-2 mt-1">
              <MessageReactions
                reactions={messageReactions[msg.id] ?? []}
                onReact={(emoji) => handleReact(msg.id, emoji)}
              />
            </div>

            {/* Message Actions (on hover) */}
            <MessageActions
              content={msg.content}
              messageId={msg.id}
              role={msg.role as "user" | "assistant"}
              isPinned={pinnedMessages.some((p) => p.id === msg.id)}
              onPin={handlePin}
              onRegenerate={
                msg.role === "assistant" ? handleRegenerate : undefined
              }
            />
          </div>
        ))}
        {/* Thinking steps — shown while AI is processing */}
        {isStreaming && thinkingEvents.length > 0 && (
          <ConversationThinkingSteps
            events={thinkingEvents}
            isStreaming={isStreaming}
          />
        )}
        {/* Tool call traces — shown when AI calls tools */}
        {toolTraces.map((trace, i) => (
          <ToolCallTraceCard
            key={`tool-${i}-${trace.toolName}`}
            trace={trace}
          />
        ))}
        {/* Streaming response */}
        {isStreaming && streamedContent && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
              <Bot className="h-4 w-4 text-primary/70" />
            </div>
            <div className="max-w-[85%] rounded-2xl bg-card border border-border/50 px-4 py-3 text-sm leading-relaxed text-foreground">
              <p className="whitespace-pre-wrap" aria-live="polite">
                {streamedContent}
              </p>
              <span
                className="inline-block h-4 w-0.5 animate-pulse bg-primary/60 ml-0.5"
                aria-hidden="true"
              />
            </div>
          </div>
        )}
        {/* Thinking indicator */}
        {isStreaming && !streamedContent && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
              <Bot className="h-4 w-4 text-primary/70" />
            </div>
            <div className="rounded-2xl bg-card border border-border/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:300ms]" />
                </div>
                <span
                  className="text-xs text-muted-foreground/60"
                  role="status"
                  aria-live="polite"
                >
                  Thinking...
                </span>
              </div>
            </div>
          </div>
        )}{" "}
        {/* Inline approval cards from streaming */}
        {approvals.map((approval, i) => (
          <div key={`approval-${i}`} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
              <Bot className="h-4 w-4 text-primary/70" />
            </div>
            <div className="max-w-[85%] rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] px-4 py-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {approval.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {approval.description}
                  </p>
                  {approval.amount && (
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {approval.amount}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-label="Approve"
                  disabled={processingApprovalIdx === i}
                  onClick={() =>
                    handleApprovalAction(
                      "approve",
                      approval.title,
                      i,
                      approval.itemId,
                      approval.itemType,
                    )
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    processingApprovalIdx === i
                      ? "bg-emerald-500/20 text-emerald-700 cursor-wait"
                      : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
                  )}
                >
                  {processingApprovalIdx === i ? (
                    <RefreshCw
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {processingApprovalIdx === i
                    ? "Processing..."
                    : "Approve & post"}
                </button>
                <button
                  type="button"
                  aria-label="Explain first"
                  disabled={processingApprovalIdx === i}
                  onClick={() =>
                    handleApprovalAction(
                      "review",
                      approval.title,
                      i,
                      approval.itemId,
                      approval.itemType,
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Explain first
                </button>
                <button
                  type="button"
                  aria-label="Reject"
                  disabled={processingApprovalIdx === i}
                  onClick={() =>
                    handleApprovalAction(
                      "reject",
                      approval.title,
                      i,
                      approval.itemId,
                      approval.itemType,
                    )
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    processingApprovalIdx === i
                      ? "bg-red-500/20 text-red-700 cursor-wait"
                      : "bg-red-500/10 text-red-600 hover:bg-red-500/20",
                  )}
                >
                  {processingApprovalIdx === i ? (
                    <RefreshCw
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {processingApprovalIdx === i ? "Processing..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        ))}
        {/* Data tables from AI (streaming and committed) — rendered once */}
        {dataTables.map((table, i) => (
          <div key={`table-${i}`} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
              <Bot className="h-4 w-4 text-primary/70" />
            </div>
            <div className="max-w-[90%]">
              <DataTableInline
                title={table.title}
                columns={table.columns}
                rows={table.rows}
                summary={table.summary}
                currency={table.currency}
                selectable={table.rows.length > 1}
                expandable={table.rows.some((r) => r.detail)}
              />
            </div>
          </div>
        ))}
        {/* Streaming charts (shown while AI is still responding) */}
        {isStreaming &&
          charts.map((chart, i) => (
            <div key={`streaming-chart-${i}`} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                <Bot className="h-4 w-4 text-primary/70" />
              </div>
              <div className="max-w-[90%]">
                <ChartInline
                  type={chart.chartType}
                  title={chart.title}
                  data={chart.data}
                  xKey={chart.xKey}
                  yKey={chart.yKey}
                  series={chart.series}
                  currency={chart.currency}
                  summary={chart.summary}
                />
              </div>
            </div>
          ))}
        {/* Inline input form from AI */}
        {pendingInput && !isStreaming && (
          <InlineInputForm
            spec={pendingInput}
            onSubmit={(text) => {
              onSendMessage(text);
            }}
          />
        )}
        {/* Document generation indicator — shown while AI is creating documents */}
        {isStreaming && streamedContent && documents.length === 0 && (
          <DocumentGeneratingIndicator content={streamedContent} />
        )}
        {/* Document artifacts — Inline Document Viewer */}
        {documents.map((doc, i) => (
          <div key={`doc-${i}`} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
              <Bot className="h-4 w-4 text-primary/70" />
            </div>
            <div className="max-w-[85%]">
              <InlineDocumentViewer
                artifactId={doc.artifactId}
                name={doc.name}
                docType={doc.docType}
                mimeType={doc.mimeType}
                sizeBytes={doc.sizeBytes}
                defaultExpanded={true}
              />
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

// ─── Document Generation Indicator ─────────────────────────────────────────
//
// Detects when the AI is talking about generating a document and shows
// a generating indicator. This bridges the gap between the AI's text
// response and the actual artifact creation (which happens server-side
// after the text is done streaming).

const DOC_GENERATION_PATTERNS =
  /generat|creat(?:ing|e) (?:a |the )?(?:report|document|pdf|excel|word|spreadsheet|export|file)|prepar(?:ing|e) (?:a |the )?(?:report|document)|export(?:ing|s)? (?:to|as) (?:pdf|excel|word|csv)|build(?:ing)? (?:a |the )?(?:report|document)/i;

function DocumentGeneratingIndicator({ content }: { content: string }) {
  const isGenerating = DOC_GENERATION_PATTERNS.test(content);

  if (!isGenerating) return null;

  // Extract document type from the text
  const docTypeMatch = content.match(
    /(report|document|pdf|excel|word|spreadsheet|export)/i,
  );
  const docType = docTypeMatch
    ? docTypeMatch[1].charAt(0).toUpperCase() + docTypeMatch[1].slice(1)
    : "Document";

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
        <Bot className="h-4 w-4 text-primary/70" />
      </div>
      <div className="max-w-[85%]">
        <DocumentGenerating docType={docType} />
      </div>
    </div>
  );
}
