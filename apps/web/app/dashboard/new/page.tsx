"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarCheck,
  HandCoins,
  Landmark,
  Sparkles,
  Wallet,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils";
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
      <div className="flex h-full min-h-0 gap-4 pb-16 md:pb-0">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Context strip */}
          <header className="px-4 pt-5 sm:px-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                {firstName
                  ? `Good to see you, ${firstName}`
                  : "Mission Control"}
              </h1>
              <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {closeStatus
                  ? `${closeStatus.year}·${String(closeStatus.month).padStart(2, "0")}`
                  : "FY open"}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4 rounded-xl border border-border/50 bg-card/60 px-4 py-3 sm:grid-cols-4">
              <MetricNarrative
                label="Cash"
                value={formatCurrency(health?.cashBalance ?? 0)}
                loading={dashLoading && !health}
                size="sm"
              />
              <MetricNarrative
                label="Runway"
                value={
                  health?.runwayMonths != null
                    ? `${health.runwayMonths.toFixed(1)} mo`
                    : "—"
                }
                narrative={
                  health?.runwayMonths != null && health.runwayMonths < 6
                    ? "Under six months — worth a look."
                    : undefined
                }
                size="sm"
              />
              <MetricNarrative
                label="Owed to you"
                value={formatCurrency(health?.arOutstanding ?? 0)}
                loading={dashLoading && !health}
                size="sm"
              />
              <MetricNarrative
                label="You owe"
                value={formatCurrency(health?.apOutstanding ?? 0)}
                loading={dashLoading && !health}
                size="sm"
              />
            </div>
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

          {/* Command */}
          <div className="sticky bottom-0 border-t border-border/30 bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-6">
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

        {/* ── Workforce rail ──────────────────────────────────────────── */}
        <aside className="hidden w-[320px] shrink-0 px-0 py-5 pr-4 sm:block sm:pr-6">
          <AgentStream entityId={entityId ?? ""} className="max-h-full" />
        </aside>
      </div>
    </ErrorBoundary>
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
