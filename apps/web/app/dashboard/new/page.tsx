"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarCheck,
  HandCoins,
  Landmark,
  Sparkles,
  Wallet,
  Bot,
  MessageSquare,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { useDashboardChat } from "@/lib/hooks/use-dashboard-chat";
import { activationEvents } from "@/lib/analytics/feature-tracking";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { ConversationThread } from "@/components/dashboard/command-center";
import { AgentStream } from "@/components/ai-native-v2/stream-feed";
import { CommandBar } from "@/components/ai-native-v2/command-bar";
import { MetricNarrative } from "@/components/ai-native-v2/metric-narrative";

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
    sendMessage,
    cancelStream,
    loadConversation,
  } = chat;

  // ── Context strip data ────────────────────────────────────────────────
  const { data: dash, isLoading: dashLoading } =
    trpc.dashboard.getDashboardData.useQuery({}, { enabled: !!entityId });
  const { data: closeStatus } = trpc.fiscal.getCurrent.useQuery(undefined, {
    enabled: !!entityId,
  });

  const health = dash?.businessHealth;
  const hasMessages = messages.length > 0;

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
          {/* Greeting — compact, professional */}
          <header className="px-4 pt-3 sm:px-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                {firstName ? `Good morning, ${firstName}` : "Good morning"}
              </h1>
              <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {closeStatus
                  ? `${closeStatus.year}·${String(closeStatus.month).padStart(2, "0")}`
                  : "FY open"}
              </p>
            </div>
            {/* Cash/runway strip — commented for now
            <div className="mt-2 grid grid-cols-2 gap-3 rounded-xl border border-border/50 bg-card/60 px-4 py-3 sm:grid-cols-4">
              <MetricNarrative label="Cash" value={formatCurrency(health?.cashBalance ?? 0)} loading={dashLoading && !health} size="sm" />
              <MetricNarrative label="Runway" value={health?.runwayMonths != null ? `${health.runwayMonths.toFixed(1)} mo` : "—"} narrative={health?.runwayMonths != null && health.runwayMonths < 6 ? "Under six months — worth a look." : undefined} size="sm" />
              <MetricNarrative label="Owed to you" value={formatCurrency(health?.arOutstanding ?? 0)} loading={dashLoading && !health} size="sm" />
              <MetricNarrative label="You owe" value={formatCurrency(health?.apOutstanding ?? 0)} loading={dashLoading && !health} size="sm" />
            </div>
            */}
          </header>

          {/* Work area */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 sm:px-6">
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

          {/* Command — compact */}
          <div className="sticky bottom-0 border-t border-border/30 bg-background/80 px-4 py-2 backdrop-blur-sm sm:px-6">
            <CommandBar
              onSubmit={(v) => sendMessage(v)}
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
            />
          </div>
        </div>

        {/* ── Workforce rail — switchable Agents / Conversations ───── */}
        <aside className="hidden w-[340px] shrink-0 flex-col border-l border-border/40 bg-card/30 sm:flex">
          <AgentConversationsRail
            entityId={entityId ?? ""}
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
  onSelectConversation,
}: {
  entityId: string;
  onSelectConversation: (id: string) => void;
}) {
  const [active, setActive] = useState<"agents" | "conversations">("agents");

  const { data: conversations } = trpc.chat.listConversations.useQuery(
    undefined,
    { enabled: active === "conversations" },
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Tabs — fixed, never scroll */}
      <div
        role="tablist"
        aria-label="Agents and conversations"
        className="sticky top-0 z-10 flex items-center gap-1 border-b border-border/40 bg-card/80 px-2 py-2 backdrop-blur-sm"
      >
        <button
          type="button"
          role="tab"
          aria-selected={active === "agents"}
          onClick={() => setActive("agents")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            active === "agents"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
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
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            active === "conversations"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Conversations
        </button>
      </div>

      {/* Content — scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {active === "agents" ? (
          <AgentStream
            entityId={entityId}
            className="h-full rounded-none border-0"
          />
        ) : (
          <div className="p-2">
            {!conversations || conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">
                  No conversations yet
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {conversations.slice(0, 30).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectConversation(c.id)}
                    className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {c.title || "Untitled"}
                      </span>
                      {c.summary && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {c.summary}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
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
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2
          id="missions-heading"
          className="text-sm font-semibold text-foreground"
        >
          Give your finance team a mission
        </h2>
      </div>
      <p className="mb-5 max-w-md text-xs leading-relaxed text-muted-foreground">
        Agents do the work end to end and stop for your call when it matters.
        Pick a mission or type your own below.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {MISSIONS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onLaunch(m.brief)}
            className="group rounded-xl border border-border/50 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <m.icon
                className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary"
                aria-hidden="true"
              />
              <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                {m.tag}
              </span>
            </div>
            <p className="mt-2.5 text-sm font-medium text-foreground group-hover:text-primary">
              {m.title}
            </p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {m.brief}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
