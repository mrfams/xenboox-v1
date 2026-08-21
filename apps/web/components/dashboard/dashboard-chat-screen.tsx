"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Bot, Plus, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { StreamingMessage } from "@/components/workspace/streaming-message";
import { ArtifactViewer } from "@/components/workspace/artifact-viewer";
import type { ChatArtifactRef } from "@/lib/chat/artifact-types";
import type { DashboardChatMessage } from "@/lib/hooks/use-dashboard-chat";
import type {
  AgentActivityEvent,
  ApprovalEvent,
  DelegationEvent,
  DocumentCreatedEvent,
} from "@/lib/hooks/use-streaming-chat";

// ─── Props ─────────────────────────────────────────────────────────────────

interface DashboardChatScreenProps {
  messages: DashboardChatMessage[];
  streamedContent: string;
  isStreaming: boolean;
  agentActivities: AgentActivityEvent[];
  delegations: DelegationEvent[];
  documents: DocumentCreatedEvent[];
  approvals: ApprovalEvent[];
  conversationId: string | null;
  /** Server-generated readable name for this conversation, if known. */
  title?: string | null;
  onExit: () => void;
  onNewChat: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────

export function DashboardChatScreen({
  messages,
  streamedContent,
  isStreaming,
  agentActivities,
  delegations,
  documents,
  approvals,
  conversationId,
  title,
  onExit,
  onNewChat,
}: DashboardChatScreenProps) {
  const endRef = useRef<HTMLDivElement>(null);
  // Currently open generated document in the inline viewer.
  const [viewingArtifact, setViewingArtifact] =
    useState<ChatArtifactRef | null>(null);

  // Keep the newest message in view as content streams in.
  useEffect(() => {
    endRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, streamedContent, isStreaming]);

  // Prefer the server-generated readable name; fall back to a preview of the
  // first user message until the conversation event arrives.
  const firstUserMessage = messages.find((m) => m.role === "user");
  const firstMessagePreview = firstUserMessage
    ? firstUserMessage.content.length > 48
      ? `${firstUserMessage.content.slice(0, 48)}…`
      : firstUserMessage.content
    : null;
  const displayTitle = title ?? firstMessagePreview;

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="flex h-full animate-[fade-in-up_0.25s_ease-out] flex-col">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-500 text-white shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">
                  Xenboox AI
                </p>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    isStreaming
                      ? "bg-primary/10 text-primary"
                      : "bg-emerald-50 text-emerald-700",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isStreaming
                        ? "animate-pulse bg-primary"
                        : "bg-emerald-500",
                    )}
                  />
                  {isStreaming ? "Working..." : "Online"}
                </span>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {displayTitle
                  ? `“${displayTitle}”`
                  : "Your AI CFO — every action is logged, entity-scoped & auditable"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onNewChat}
              disabled={isStreaming}
              title="Start a new conversation"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5",
                "text-xs font-medium text-muted-foreground transition-all",
                "hover:border-primary/30 hover:text-primary",
                "active:scale-95 disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New chat</span>
            </button>
            <button
              type="button"
              onClick={onExit}
              title="Return to the dashboard overview"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5",
                "text-xs font-medium text-primary-foreground shadow-sm transition-all",
                "hover:bg-primary-hover active:scale-95",
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Back to dashboard</span>
              <span className="sm:hidden">Exit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation with Xenboox AI"
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        <div className="mx-auto w-full max-w-3xl space-y-6">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                New conversation
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Ask anything about your books — your AI CFO answers with live
                data. Or pick a suggestion below to get started.
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
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-xs leading-relaxed text-primary-foreground">
                    {message.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              );
            }

            if (message.status === "error") {
              return (
                <div
                  key={message.id}
                  className="flex animate-in flex-col items-start gap-1 fade-in-0 slide-in-from-bottom-2 duration-300"
                >
                  <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-error-clay/30 bg-error-clay-bg px-4 py-2.5 text-xs leading-relaxed text-error-clay">
                    {message.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className="flex animate-in flex-col items-start fade-in-0 slide-in-from-bottom-2 duration-300"
              >
                <StreamingMessage
                  content={message.content}
                  isStreaming={false}
                  agentActivities={message.activities}
                  delegations={message.delegations}
                  documents={message.documents}
                  approvals={message.approvals}
                  confidence={message.confidence}
                  durationMs={message.durationMs}
                  onOpenDocument={(doc) => setViewingArtifact(doc)}
                />
              </div>
            );
          })}

          {/* In-flight assistant response */}
          {isStreaming && (
            <StreamingMessage
              content={streamedContent}
              isStreaming
              agentActivities={agentActivities}
              delegations={delegations}
              documents={documents}
              approvals={approvals}
              onOpenDocument={(doc) => setViewingArtifact(doc)}
            />
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-center gap-3 border-t border-border/50 px-6 py-2">
        {conversationId && (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-card px-2.5 py-1 text-[10px] font-medium text-primary transition-all hover:border-primary/30 hover:bg-primary/5"
            title="Open this conversation in the full chat workspace"
          >
            <ArrowUpRight className="h-3 w-3" />
            Open in Chat
          </Link>
        )}
        <p className="text-[10px] text-muted-foreground/70">
          {conversationId
            ? "Saved — continue it anytime in your conversations."
            : "Your messages are saved to this entity's audit trail."}
        </p>
      </div>

      {/* Inline document viewer for generated artifacts */}
      {viewingArtifact && (
        <ArtifactViewer
          artifact={viewingArtifact}
          onClose={() => setViewingArtifact(null)}
        />
      )}
    </div>
  );
}
