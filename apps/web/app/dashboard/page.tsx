"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { MessageSquare, X } from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { activationEvents } from "@/lib/analytics/feature-tracking";
import { DashboardSkeleton } from "@/components/shared/skeletons";
import { dashboardQueryOptions } from "@/lib/trpc/query-options";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { useDashboardChat } from "@/lib/hooks/use-dashboard-chat";
import { useSrAnnounce } from "@/lib/hooks/use-sr-announce";
import { usePageContext } from "@/lib/hooks/use-page-context";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import type { UploadedFile } from "@/components/chat/chat-file-upload";

import {
  AIGreeting,
  ProactiveBriefing,
  ConversationThread,
  AiInput,
  GettingStartedChecklist,
} from "@/components/dashboard/command-center";

// ─── AI-Native Command Center ─────────────────────────────────────────────
//
// The primary surface. 80% of user time should be spent here.
// NOT a dashboard with a chat widget. IS a conversational interface
// with contextual dashboards.
//
// Layout:
//   1. ProactiveBriefing (top) — AI tells you what matters
//   2. ConversationThread (middle) — Chat with your AI CFO
//   3. AiInput (bottom) — Ask anything
//
// Components are extracted to:
//   components/dashboard/command-center/ai-greeting.tsx
//   components/dashboard/command-center/proactive-briefing.tsx
//   components/dashboard/command-center/conversation-thread.tsx
//   components/dashboard/command-center/ai-input.tsx

export default function CommandCenterPage() {
  return (
    <Suspense>
      <CommandCenterInner />
    </Suspense>
  );
}

function CommandCenterInner() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0];
  const { entityId } = useEntity();
  const { announce } = useSrAnnounce();
  const searchParams = useSearchParams();
  const router = useRouter();
  const promptSentRef = useRef(false);

  // ── Track first Command Center visit ─────────────────────────────────
  useEffect(() => {
    if (entityId) {
      activationEvents.commandCenterFirstVisit(entityId);
    }
  }, [entityId]);

  // ── Cross-surface sync ────────────────────────────────────────────────
  // Listen for data_changed events from other surfaces and refetch
  useSurfaceSync({ entityId, surfaces: ["command-center"] });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const {
    messages,
    isStreaming,
    streamedContent,
    thinkingEvents,
    conversationId,
    approvals,
    documents,
    toolTraces,
    pendingInput,
    dataTables,
    charts,
    sendMessage,
    loadConversation,
    newChat,
    cancelStream,
  } = useDashboardChat({ entityId });

  // Announce streaming status to screen readers
  useEffect(() => {
    if (isStreaming && !streamedContent) {
      announce("AI is thinking...");
    } else if (isStreaming && streamedContent) {
      announce("AI is responding...");
    }
  }, [isStreaming, streamedContent, announce]);

  // ── Auto-send prompt from URL param ──────────────────────────────────
  // Other surfaces (context menu, command palette, help page) navigate to
  // /dashboard?prompt=... expecting auto-send. Read once, send, strip param.
  useEffect(() => {
    const prompt = searchParams?.get("prompt");
    if (prompt && entityId && !promptSentRef.current) {
      promptSentRef.current = true;
      // Strip param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("prompt");
      router.replace(url.pathname + url.search, { scroll: false });
      // Send after a tick so chat state is initialized
      setTimeout(() => {
        sendMessage(prompt);
      }, 100);
    }
  }, [searchParams, entityId, sendMessage, router]);

  const pageContext = usePageContext();

  const handleSubmit = useCallback(
    (value: string, files?: UploadedFile[]) => {
      const filePayload = files?.map((f) => ({
        documentId: f.documentId,
        name: f.name,
        type: f.type,
      }));
      sendMessage(value, pageContext, filePayload);
    },
    [sendMessage, pageContext],
  );

  const isChatting = messages.length > 0 || isStreaming;

  return (
    <ErrorBoundary surface="command-center">
      <div className="flex h-full pb-16 md:pb-0" aria-busy={isStreaming}>
        {/* Conversation Sidebar — now hosts related conversations */}
        <ConversationSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentConversationId={conversationId}
          onSelectConversation={(id, title) => {
            loadConversation(id, title);
            setSidebarOpen(false);
          }}
          onNewChat={() => {
            newChat();
            setSidebarOpen(false);
          }}
          currentQuery={messages[messages.length - 1]?.content ?? ""}
        />

        {/* Main Content */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Top bar: greeting + controls */}
          <div className="px-4 pt-6 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <AIGreeting firstName={firstName} />
              <div className="flex items-center gap-1.5">
                {isChatting && (
                  <button
                    type="button"
                    onClick={() => newChat()}
                    className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/50 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    aria-label="Close chat and return to briefing"
                    title="Close chat"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/50 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label={
                    sidebarOpen
                      ? "Close conversation list"
                      : "Open conversation list"
                  }
                >
                  <MessageSquare className="h-3 w-3" />
                  {sidebarOpen ? "Hide list" : "Conversations"}
                </button>
              </div>
            </div>
          </div>

          {/* Content area: briefing OR thread — never both */}
          {isChatting ? (
            <div className="flex flex-1 min-h-0 flex-col pt-4">
              <ConversationThread
                messages={messages}
                isStreaming={isStreaming}
                streamedContent={streamedContent}
                thinkingEvents={thinkingEvents}
                toolTraces={toolTraces}
                approvals={approvals}
                documents={documents}
                dataTables={dataTables}
                charts={charts}
                pendingInput={pendingInput}
                onSendMessage={sendMessage}
              />
            </div>
          ) : (
            <div className="flex-1 space-y-4 px-4 pt-4 sm:px-6 overflow-y-auto">
              <ProactiveBriefing />
              <GettingStartedChecklist onSendMessage={sendMessage} />
            </div>
          )}

          {/* AI Input — fixed at bottom */}
          <div className="sticky bottom-0 border-t border-border/30 bg-background/80 backdrop-blur-sm">
            <AiInput
              onSubmit={handleSubmit}
              isResponding={isStreaming}
              onStop={cancelStream}
              entityId={entityId ?? ""}
              uploadedFiles={uploadedFiles}
              onFilesUploaded={(files) =>
                setUploadedFiles((prev) => [...prev, ...files])
              }
              onClearFiles={() => setUploadedFiles([])}
              messages={messages}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
