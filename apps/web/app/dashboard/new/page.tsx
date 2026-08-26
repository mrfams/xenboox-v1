"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarCheck,
  HandCoins,
  Landmark,
  Wallet,
  Bot,
  MessageSquare,
  X,
  Download,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useDashboardChat } from "@/lib/hooks/use-dashboard-chat";
import { activationEvents } from "@/lib/analytics/feature-tracking";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { ConversationThread } from "@/components/dashboard/command-center";
import { AgentStream } from "@/components/ai-native-v2/stream-feed";
import { CommandBar } from "@/components/ai-native-v2/command-bar";

// ─── Mission Control (/dashboard/new) ─────────────────────────────────────
//
// The AI-native home surface. Three ideas, none of them a dashboard:
//
//   1. Context strip — where the business stands, narrated.
//   2. The work — a conversation that renders artifacts, or the mission
//      board when there's no conversation yet.
//   3. The workforce — a live rail of your agents actually working,
//      pulled from ops_live_runs (real runs, entity-scoped).

const MISSIONS = [
  {
    id: "close",
    icon: CalendarCheck,
    title: "Run the close",
    brief:
      "Walk the month-end close checklist, finish what's safe, and bring me anything that needs my call.",
    tag: "Close",
  },
  {
    id: "chase",
    icon: HandCoins,
    title: "Chase what's owed",
    brief:
      "List every overdue invoice with amount and age, then draft a payment reminder for each customer.",
    tag: "Receivables",
  },
  {
    id: "categorize",
    icon: Landmark,
    title: "Clean up the bank feed",
    brief:
      "Categorize all uncategorized bank transactions, flag anything unusual, and summarize what you did.",
    tag: "Banking",
  },
  {
    id: "cash",
    icon: Wallet,
    title: "Where did the cash go?",
    brief:
      "Explain this month's cash movement: biggest inflows, biggest outflows, and what changes vs last month.",
    tag: "Treasury",
  },
] as const;

export default function MissionControlPage() {
  const { entityId } = useEntity();
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0];

  const chat = useDashboardChat({ entityId });
  const {
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
    conversationId,
    sendMessage,
    cancelStream,
    loadConversation,
    newChat,
  } = chat as ReturnType<typeof useDashboardChat> & {
    newChat: () => void;
    loadConversation: (id: string) => void;
    conversationId: string | null;
  };

  const [uploadedFiles, setUploadedFiles] = useState<
    import("@/components/chat/chat-file-upload").UploadedFile[]
  >([]);

  // ── Context strip data ────────────────────────────────────────────────
  const { data: closeStatus } = trpc.fiscal.getCurrent.useQuery(undefined, {
    enabled: !!entityId,
  });

  const hasMessages = messages.length > 0;
  const isChatting = hasMessages || isStreaming;

  function getGreeting() {
    const hour = new Date().getHours();
    const base =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";
    return firstName ? `${base}, ${firstName}` : base;
  }

  const handleExport = () => {
    const lines = messages.map((m) => {
      const role = m.role === "user" ? "You" : "AI";
      return `**${role}:** ${m.content}`;
    });
    const md = `# Conversation Export\n\nDate: ${new Date().toLocaleDateString()}\n\n---\n\n${lines.join("\n\n")}`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Activation tracking mirrors the primary surface.
  useEffect(() => {
    if (entityId) {
      activationEvents.commandCenterFirstVisit(entityId);
    }
  }, [entityId]);

  return (
    <ErrorBoundary surface="mission-control">
      <div className="flex h-full min-h-0 pb-16 md:pb-0">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar — fixed, no blurry backdrop */}
          <header className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2 sm:px-6">
            {/* Blurry strip behind export/close — commented out
            <div className="absolute inset-0 -z-10 bg-background/80 backdrop-blur-sm border-b border-border/30" />
            */}
            <div className="min-w-0">
              {!isChatting ? (
                <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {getGreeting()}
                </h1>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">
                  Chat
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {isChatting && (
                <>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/50 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors sm:px-2.5 sm:py-1.5 sm:text-[10px] sm:font-medium"
                    aria-label="Export chat"
                    title="Export chat"
                  >
                    <Download className="h-4 w-4 sm:h-3 sm:w-3" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => (newChat as () => void)?.()}
                    className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/50 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    aria-label="Close chat"
                    title="Close chat"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </header>

          {/* Work area — isolated scroll plane; missions centered */}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col px-4 sm:px-6",
              isChatting
                ? "overflow-y-auto overscroll-contain pt-4"
                : "items-center justify-center overflow-hidden py-8",
            )}
          >
            {hasMessages || isStreaming ? (
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
            ) : (
              <MissionsBoard onLaunch={(brief) => sendMessage(brief)} />
            )}
          </div>

          {/* Command — compact with file support */}
          <div className="sticky bottom-0 border-t border-border/30 bg-background/80 px-4 py-2 backdrop-blur-sm sm:px-6">
            <CommandBar
              onSubmit={(v, files) => {
                const filePayload = files?.map((f) => ({
                  documentId: f.documentId,
                  name: f.name,
                  type: f.type,
                }));
                // Send with page context if needed
                sendMessage(v, undefined, filePayload);
                setUploadedFiles([]);
              }}
              busy={isStreaming}
              onCancel={cancelStream}
              suggestions={
                hasMessages
                  ? [
                      "What changed this week?",
                      "Show unpaid bills",
                      "How's runway?",
                    ]
                  : undefined
              }
              placeholder="Ask anything, or hand off a job…"
              autoFocus
              entityId={entityId ?? ""}
              uploadedFiles={uploadedFiles}
              onFilesUploaded={(files) =>
                setUploadedFiles((prev) => [...prev, ...files])
              }
              onRemoveFile={(idx) =>
                setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))
              }
              onClearFiles={() => setUploadedFiles([])}
            />
            <p className="mt-1.5 text-center text-[10px] leading-none text-muted-foreground/60">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>

        {/* ── Workforce rail — switchable Agents / Conversations ───── */}
        <aside className="hidden h-full w-[340px] shrink-0 flex-col border-l border-border/40 bg-card sm:flex">
          <AgentConversationsRail
            entityId={entityId ?? ""}
            currentConversationId={conversationId ?? null}
            onSelectConversation={(id) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (loadConversation as any)?.(id);
            }}
          />
        </aside>
      </div>
    </ErrorBoundary>
  );
}

// ─── Agent / Conversations Rail ─────────────────────────────────────────
//
// Right rail with fixed tabs (Agents · Conversations). Tabs stay pinned,
// contents scroll. Agents shows live runs; Conversations mirrors the
// history from /dashboard for quick switching.

function AgentConversationsRail({
  entityId,
  currentConversationId,
  onSelectConversation,
}: {
  entityId: string;
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
}) {
  const [active, setActive] = useState<"agents" | "conversations">("agents");

  const { data: conversations } = trpc.chat.listConversations.useQuery(
    undefined,
    { enabled: active === "conversations" },
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-card">
      {/* Tabs — fixed, never scroll, full width bg same as panel */}
      <div
        role="tablist"
        aria-label="Agents and conversations"
        className="flex w-full items-center gap-1 border-b border-border/40 bg-card p-1.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={active === "agents"}
          onClick={() => setActive("agents")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
            active === "agents"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <Bot className="h-3.5 w-3.5" />
          Agents
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "conversations"}
          onClick={() => setActive("conversations")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
            active === "conversations"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Conversations
        </button>
      </div>

      {/* Content — each tab is its own scroll plane */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
        {active === "agents" ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <AgentStream
              entityId={entityId}
              className="h-full w-full rounded-none border-0 bg-card"
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {!conversations || conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">
                  No conversations yet
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {conversations.slice(0, 30).map((c) => {
                  const isActive = c.id === currentConversationId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectConversation(c.id)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent",
                      )}
                    >
                      <MessageSquare
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 mt-0.5",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground/50",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-xs font-medium",
                            isActive ? "text-primary" : "text-foreground",
                          )}
                        >
                          {c.title || "Untitled"}
                        </span>
                        {c.summary && (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {c.summary}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Missions Board ───────────────────────────────────────────────────────
//
// Empty state as launchpad: goal-shaped cards, not prompt examples.
// Launching one hands the agent a full brief, not a keyword.

function MissionsBoard({ onLaunch }: { onLaunch: (brief: string) => void }) {
  return (
    <section
      aria-labelledby="missions-heading"
      className="mx-auto max-w-2xl pb-8"
    >
      <h2
        id="missions-heading"
        className="mb-6 text-center text-sm font-bold tracking-tight text-foreground"
      >
        What would you like to handle today?
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {MISSIONS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onLaunch(m.brief)}
            className="group rounded-xl border border-border/50 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <m.icon
                className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                aria-hidden="true"
              />
              <span className="flex-1 truncate text-sm font-medium text-foreground group-hover:text-primary">
                {m.title}
              </span>
              <span className="shrink-0 rounded-full bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                {m.tag}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {m.brief}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
