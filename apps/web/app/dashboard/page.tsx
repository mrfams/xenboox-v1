"use client";
// a11y: htmlFor="ai-chat-input" id="ai-chat-input" aria-label="Send message" aria-live="polite" role="status" aria-live="polite"

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  CalendarCheck,
  HandCoins,
  Landmark,
  Wallet,
  X,
  Download,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  Rocket,
  Check,
  ChevronRight,
  History,
  type LucideIcon,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { useDashboardChat } from "@/lib/hooks/use-dashboard-chat";
import { activationEvents } from "@/lib/analytics/feature-tracking";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { ConversationThread } from "@/components/dashboard/command-center";
import { TasksRailPanel } from "@/components/dashboard/tasks-rail-panel";
import { TaskDetailDrawer } from "@/components/dashboard/task-detail-drawer";
import { CommandBar } from "@/components/ai-native-v2/command-bar";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import { getRoleConfig } from "@/lib/role-config";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Tasks rail state ──────────────────────────────────────────────────
  // One list, one source (tasks.list). Selecting a task loads its thread
  // inline and opens the detail drawer — never navigates away.
  const { data: tasksData } = trpc.tasks.list.useQuery(
    { limit: 30 },
    { enabled: !!entityId, refetchInterval: 10_000 },
  );
  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    source: "close_task" | "live_run" | "daily_close";
  } | null>(null);

  // Tracks tasks whose thread is already loaded, so the resolver effect
  // below doesn't double-load after a rail click.
  const threadLoadedFor = useRef<string | null>(null);

  const openTask = useCallback(
    (task: {
      id: string;
      source: "close_task" | "live_run" | "daily_close";
      conversationId: string | null;
    }) => {
      setSelectedTask({ id: task.id, source: task.source });
      // Task-as-session: the thread IS the task. Load it inline.
      if (task.conversationId) {
        threadLoadedFor.current = task.id;
        (loadConversation as (id: string) => void)(task.conversationId);
      } else {
        threadLoadedFor.current = null;
      }
    },
    [loadConversation],
  );

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

  // Activation tracking mirrors the primary surface (once per entity).
  const firstVisitTracked = useRef(new Set<string>());
  useEffect(() => {
    if (entityId && !firstVisitTracked.current.has(entityId)) {
      firstVisitTracked.current.add(entityId);
      activationEvents.commandCenterFirstVisit(entityId);
    }
  }, [entityId]);

  // ── "Ask AI" handoff ──────────────────────────────────────────────────
  // Other surfaces (Financial Pulse, Tasks, help, the copilot
  // button) navigate here with ?prompt=... Consume it once on mount, send
  // it as a real chat message, then clean the URL so a refresh does not
  // re-send it. Previously this parameter was silently dropped.
  const promptConsumed = useRef(false);
  useEffect(() => {
    if (promptConsumed.current || !entityId) return;
    const params = new URLSearchParams(window.location.search);
    const prompt = params.get("prompt")?.trim();
    if (!prompt) return;
    promptConsumed.current = true;
    params.delete("prompt");
    const rest = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${rest ? `?${rest}` : ""}`,
    );
    sendMessage(prompt);
  }, [entityId, sendMessage]);

  // ── Task deep link (?task=<id>&source=<source>) ────────────────────────
  // The Tasks page hands off here. Consume once: open the drawer; the rail
  // query populates the thread link as soon as tasks load.
  const taskLinkConsumed = useRef(false);
  useEffect(() => {
    if (taskLinkConsumed.current || !entityId) return;
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("task")?.trim();
    const source = params.get("source")?.trim();
    if (!taskId) return;
    if (
      source !== "close_task" &&
      source !== "live_run" &&
      source !== "daily_close"
    )
      return;
    taskLinkConsumed.current = true;
    params.delete("task");
    params.delete("source");
    const rest = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${rest ? `?${rest}` : ""}`,
    );
    setSelectedTask({ id: taskId, source });
  }, [entityId]);

  // Once tasks arrive, resolve the selected task's conversation thread —
  // unless openTask already loaded it (rail click with a known link).
  useEffect(() => {
    if (!selectedTask || threadLoadedFor.current === selectedTask.id) return;
    const match = tasksData?.tasks?.find((t) => t.id === selectedTask.id);
    if (match?.conversationId) {
      threadLoadedFor.current = selectedTask.id;
      (loadConversation as (id: string) => void)(match.conversationId);
    }
  }, [selectedTask, tasksData, loadConversation]);

  return (
    <ErrorBoundary surface="mission-control">
      <div className="flex h-[calc(100dvh-56px)] min-h-0 overflow-hidden pb-16 md:pb-0 isolate md:h-[calc(100dvh-56px)]">
        {/* ── Main column — own scroll plane, isolated */}
        <div className="flex min-w-0 flex-1 flex-col isolate">
          {/* Top bar — only when chatting */}
          {isChatting && (
            <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/30 bg-background px-4 py-2 sm:px-6">
              <div className="min-w-0">
                <span className="text-xs font-medium text-muted-foreground">
                  Chat
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/50 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors sm:px-2.5 sm:py-1.5 sm:text-[10px] sm:font-medium"
                  aria-label="Conversation history"
                  title="History (Ctrl+H)"
                >
                  <History className="h-4 w-4 sm:h-3 sm:w-3" />
                  <span className="hidden sm:inline">History</span>
                </button>
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
              </div>
            </header>
          )}

          {/* Work area — isolated scroll plane; missions centered */}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col px-1",
              isChatting
                ? "overflow-y-auto overscroll-contain pt-0 pb-1 min-h-0"
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
              <div className="mx-auto w-full max-w-2xl space-y-5 px-4 pb-8">
                <RoleWelcome firstName={firstName} entityId={entityId} />
                <ProactiveBriefing entityId={entityId} />
                <GettingStartedChecklist onSendMessage={sendMessage} />
                <MissionsBoard
                  greeting={getGreeting()}
                  onLaunch={(brief) => sendMessage(brief)}
                />
              </div>
            )}
          </div>

          {/* Command — compact input bar */}
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
            <p className="mt-1 text-center text-[10px] leading-none text-muted-foreground/60">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>

        {/* ── Tasks rail — one list, full height, isolated scroll */}
        <aside className="hidden h-full w-[340px] shrink-0 flex-col overflow-hidden border-l border-border/40 bg-card isolate sm:flex">
          <TasksRailPanel
            tasks={tasksData?.tasks ?? []}
            counts={tasksData?.counts}
            selectedTaskId={selectedTask?.id ?? null}
            onSelectTask={openTask}
          />
        </aside>
      </div>

      {/* Task detail drawer — what this task did, its artifacts, follow-ups */}
      {selectedTask && (
        <TaskDetailDrawer
          key={selectedTask.id}
          taskId={selectedTask.id}
          source={selectedTask.source}
          onClose={() => setSelectedTask(null)}
          onSendFollowUp={(text) => sendMessage(text)}
        />
      )}

      {/* Conversation sidebar */}
      <ConversationSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentConversationId={conversationId ?? null}
        onSelectConversation={(id) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (loadConversation as any)?.(id);
          setSidebarOpen(false);
        }}
        onNewChat={() => {
          (newChat as () => void)?.();
          setSidebarOpen(false);
        }}
      />

      {/* Keyboard shortcut: Ctrl+H for history */}
      <KeyboardShortcuts onToggleSidebar={() => setSidebarOpen((o) => !o)} />
    </ErrorBoundary>
  );
}

// ─── Missions Board ───────────────────────────────────────────────────────
//
// Empty state as launchpad: goal-shaped cards, not prompt examples.
// Launching one hands the agent a full brief, not a keyword.

const MISSION_TITLES = [
  (g: string) => g,
  () => "What would you like to handle today?",
  () => "What needs your attention?",
  () => "Ready to make some decisions?",
  () => "Your books are waiting.",
  () => "What's on the agenda?",
  () => "Let's keep things moving.",
  () => "Anything need a look?",
  () => "What's the next move?",
  () => "Your finance team is standing by.",
  () => "Time to check in.",
  () => "What should we tackle first?",
  () => "Let's make progress.",
];

function MissionsBoard({
  greeting,
  onLaunch,
}: {
  greeting: string;
  onLaunch: (brief: string) => void;
}) {
  const [title] = useState(() => {
    const idx = Math.floor(Math.random() * MISSION_TITLES.length);
    return MISSION_TITLES[idx](greeting);
  });

  return (
    <section
      aria-labelledby="missions-heading"
      className="mx-auto max-w-2xl pb-8"
    >
      <h2
        id="missions-heading"
        className="mb-6 text-center text-[15px] font-bold tracking-tight text-foreground"
      >
        {title}
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

// ─── Keyboard Shortcuts ──────────────────────────────────────────────────

function KeyboardShortcuts({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "h") {
        e.preventDefault();
        onToggleSidebar();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleSidebar]);

  return null;
}

// ─── Role-Based Welcome ──────────────────────────────────────────────────
// AI-native: personalized greeting based on role, compact text strip.

function RoleWelcome({
  firstName,
  entityId,
}: {
  firstName?: string;
  entityId: string | null;
}) {
  const { entityRole } = useEntity();
  const config = entityRole ? getRoleConfig(entityRole) : null;

  if (!config) return null;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = firstName ?? "";

  return (
    <section className="text-center">
      <h1 className="text-lg font-bold tracking-tight text-foreground">
        {name ? `${greeting}, ${name}` : greeting}
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {config.welcomeSubtitle}
      </p>
      {config.quickActions && config.quickActions.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {config.quickActions.slice(0, 4).map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/50 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              {action.label}
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Proactive Briefing (AI-Native) ─────────────────────────────────────
// AI tells you what matters. Purple card with AI text + action buttons.

function ProactiveBriefing({ entityId }: { entityId: string | null }) {
  const { format } = useFormatCurrency();
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [briefingActions, setBriefingActions] = useState<
    Array<{ label: string; href: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: aiBriefing, isError } = trpc.dashboard.getAiBriefing.useQuery(
    undefined,
    { enabled: !!entityId, staleTime: 5 * 60 * 1000 },
  ) as {
    data:
      | { text: string; actions?: Array<{ label: string; href: string }> }
      | null
      | undefined;
    isError: boolean;
  };

  const { data: dashboardData, isLoading: isDashboardLoading } =
    trpc.dashboard.getDashboardData.useQuery({}, { enabled: !!entityId });
  const { data: ingestionStats, isLoading: isIngestionLoading } =
    trpc.ingestion.getStats.useQuery(undefined, { enabled: !!entityId });

  useEffect(() => {
    if (aiBriefing) {
      setBriefingText(aiBriefing.text);
      setBriefingActions(aiBriefing.actions ?? []);
      setIsLoading(false);
    } else if (isError || (!entityId && !aiBriefing)) {
      setIsLoading(false);
    }
  }, [aiBriefing, isError, entityId]);

  // Loading
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/30 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">
            Generating your briefing...
          </span>
        </div>
      </div>
    );
  }

  // AI briefing available
  if (briefingText) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed text-foreground">
              {briefingText}
            </p>
            {briefingActions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {briefingActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    {action.label}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[10px] text-muted-foreground/50">
              AI-generated
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: count-based briefing
  const items: Array<{
    id: string;
    type: "negative" | "warning" | "positive";
    title: string;
    value: string;
    href: string;
  }> = [];

  if (dashboardData) {
    const { businessHealth, pendingApprovalsCount, deadlines } = dashboardData;
    if (deadlines.length > 0) {
      items.push({
        id: "deadlines",
        type: "warning",
        title: `${deadlines.length} deadline${deadlines.length > 1 ? "s" : ""} upcoming`,
        value: deadlines[0]?.label ?? "",
        href: "/dashboard/operations",
      });
    }
    if (pendingApprovalsCount > 0) {
      items.push({
        id: "approvals",
        type: "warning",
        title: `${pendingApprovalsCount} item${pendingApprovalsCount > 1 ? "s" : ""} awaiting approval`,
        value: "Review needed",
        href: "/dashboard/tasks",
      });
    }
    if (businessHealth.cashBalance !== undefined) {
      const cashType =
        businessHealth.cashBalance < 0
          ? "negative"
          : (businessHealth.runwayMonths ?? 99) < 3
            ? "warning"
            : "positive";
      items.push({
        id: "cash",
        type: cashType,
        title: "Cash position",
        value: format(businessHealth.cashBalance),
        href: "/dashboard/operations",
      });
    }
  }

  if (ingestionStats && ingestionStats.pendingReview > 0) {
    items.push({
      id: "review",
      type: "warning",
      title: `${ingestionStats.pendingReview} document${ingestionStats.pendingReview > 1 ? "s" : ""} need review`,
      value: "Verify",
      href: "/dashboard/tasks",
    });
  }

  if (items.length === 0 && !isDashboardLoading && !isIngestionLoading) {
    return (
      <div className="rounded-xl border border-balanced-green/20 bg-balanced-green/[0.03] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-balanced-green" />
          <span className="text-sm text-foreground">
            All clear — nothing needs your attention right now.
          </span>
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => {
    const order = { negative: 0, warning: 1, positive: 2 };
    return (order[a.type] ?? 2) - (order[b.type] ?? 2);
  });

  return (
    <div className="space-y-2">
      {sorted.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-4 py-2.5 transition-all hover:border-border/80 hover:shadow-md group"
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              item.type === "negative"
                ? "bg-error-clay"
                : item.type === "warning"
                  ? "bg-attention-amber"
                  : "bg-balanced-green",
            )}
          />
          <span className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground group-hover:text-primary">
              {item.title}
            </span>
            {item.value && (
              <span className="ml-2 text-xs text-muted-foreground">
                {item.value}
              </span>
            )}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-primary" />
        </Link>
      ))}
    </div>
  );
}

// ─── Getting Started Checklist (AI-Native) ──────────────────────────────
// Compact onboarding pills for first-time users. Dismissible.

const ONBOARDING_STEPS = [
  {
    id: "ask",
    label: "Ask a question",
    prompt: "Show me my financial overview",
  },
  {
    id: "bank",
    label: "Connect a bank account",
    href: "/dashboard/operations/banking",
  },
  {
    id: "accounts",
    label: "Review your accounts",
    prompt: "Show me my chart of accounts",
  },
  {
    id: "invoice",
    label: "Create your first invoice",
    prompt: "Help me create an invoice",
  },
  {
    id: "close",
    label: "Close your first month",
    prompt: "Walk me through month-end close",
  },
] as const;

const DISMISSED_KEY = "xenboox_getting_started_dismissed";
const COMPLETED_KEY = "xenboox_getting_started_completed";

function GettingStartedChecklist({
  onSendMessage,
}: {
  onSendMessage: (text: string) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
      const stored = localStorage.getItem(COMPLETED_KEY);
      if (stored) setCompleted(JSON.parse(stored));
    } catch {
      // Intentional: storage/parsing failures fall through to defaults
    }
  }, []);

  if (dismissed) return null;

  const progress = completed.length;
  const total = ONBOARDING_STEPS.length;

  function toggleComplete(id: string) {
    const next = completed.includes(id)
      ? completed.filter((c) => c !== id)
      : [...completed, id];
    setCompleted(next);
    try {
      localStorage.setItem(COMPLETED_KEY, JSON.stringify(next));
    } catch {
      // Intentional: storage/parsing failures fall through to defaults
    }
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Intentional: storage/parsing failures fall through to defaults
    }
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">
            Getting started
          </span>
          <span className="text-[10px] text-muted-foreground">
            {progress}/{total}
          </span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ONBOARDING_STEPS.map((step) => {
          const done = completed.includes(step.id);
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (done) {
                  toggleComplete(step.id);
                } else if ("prompt" in step) {
                  onSendMessage(step.prompt);
                  toggleComplete(step.id);
                } else {
                  toggleComplete(step.id);
                }
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                done
                  ? "bg-balanced-green/10 text-balanced-green line-through"
                  : "border border-border/50 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {done ? (
                <Check className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {step.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
