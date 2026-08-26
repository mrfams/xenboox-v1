"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileCheck,
  Inbox,
  Clock,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { emitDataChanged } from "@/lib/hooks/use-surface-sync";
import { useSrAnnounce } from "@/lib/hooks/use-sr-announce";
import { ProvenanceBadge } from "@/components/ai-native-v2/provenance";

// ─── Decisions (/activity-hub/new) ────────────────────────────────────────
//
// The AI-native approval surface. Every item is a decision brief: what will
// change, why the agent recommends it, the evidence behind it, and how
// confident the agent is. Triage is keyboard-first: j/k to move, a/r to
// decide, s to snooze.

type DecisionItem = {
  id: string;
  itemType: "agent_activity" | "ingestion" | "notification";
  severity: "urgent" | "approval" | "review" | "info";
  title: string;
  summary: string;
  rationale?: string;
  agentName?: string;
  confidence?: number;
  sourceDoc?: string;
  amount?: string;
  createdAt?: string | Date;
  evidence?: Record<string, unknown>;
};

function timeAgo(d: string | Date | undefined): string {
  if (!d) return "";
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days < 7
    ? `${days}d`
    : new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
}

const SEVERITY_META = {
  urgent: { icon: AlertTriangle, tone: "text-red-500", label: "Urgent" },
  approval: { icon: FileCheck, tone: "text-amber-500", label: "Approval" },
  review: { icon: Clock, tone: "text-primary", label: "Review" },
  info: { icon: Bell, tone: "text-muted-foreground", label: "FYI" },
} as const;

export default function DecisionsPage() {
  const { entityId } = useEntity();
  const router = useRouter();
  const { announce } = useSrAnnounce();

  useSurfaceSync({ entityId: entityId ?? "", surfaces: ["activity-hub"] });

  // ── Data ──────────────────────────────────────────────────────────────
  const { data: agentApprovals } = trpc.ingestion.listAgentApprovals.useQuery(
    { limit: 50 },
    { enabled: !!entityId, refetchInterval: 15_000 },
  );
  const { data: alerts } = trpc.notifications.listAgentAlerts.useQuery(
    { limit: 20, unreadOnly: false },
    { enabled: !!entityId, refetchInterval: 15_000 },
  );

  const resolveApproval = trpc.approvals.resolve.useMutation();
  const rejectIngestion = trpc.ingestion.rejectReview.useMutation();
  const markNotificationRead = trpc.notifications.markAsRead.useMutation();

  // ── Build decision briefs ────────────────────────────────────────────
  const items: DecisionItem[] = useMemo(() => {
    const out: DecisionItem[] = [];
    const seen = new Set<string>();

    if (agentApprovals?.items) {
      for (const a of agentApprovals.items) {
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        const meta = (a.metadata ?? {}) as Record<string, unknown>;
        out.push({
          id: a.id,
          itemType: "agent_activity",
          severity: "approval",
          title: a.title ?? "Agent action pending",
          summary: a.description ?? "Requires your review",
          rationale:
            (meta.recommendation as string) ?? a.description ?? undefined,
          agentName: a.workflow ?? "AI Agent",
          confidence: a.confidence ?? undefined,
          sourceDoc: a.documentName ?? undefined,
          createdAt: a.createdAt,
          evidence: (meta.inputData ?? {}) as Record<string, unknown>,
        });
      }
    }

    if (alerts?.alerts) {
      for (const al of alerts.alerts) {
        if (seen.has(al.id)) continue;
        seen.add(al.id);
        out.push({
          id: al.id,
          itemType: "notification",
          severity:
            al.priority === "critical"
              ? "urgent"
              : al.priority === "high"
                ? "approval"
                : "info",
          title: al.title,
          summary: al.body ?? "",
          agentName: al.agentSource.replace(/-agent$/, "").replace(/_/g, " "),
          createdAt: al.createdAt ?? undefined,
        });
      }
    }

    const order = { urgent: 0, approval: 1, review: 2, info: 3 } as const;
    return out.sort((x, y) => order[x.severity] - order[y.severity]);
  }, [agentApprovals, alerts]);

  // ── Selection + triage state ─────────────────────────────────────────
  const [cursor, setCursor] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const visible = items.filter((i) => !dismissed.has(i.id));
  const selected = visible[Math.min(cursor, visible.length - 1)] ?? null;

  const decide = useCallback(
    async (item: DecisionItem, action: "approve" | "reject") => {
      setPendingIds((p) => new Set(p).add(item.id));
      try {
        if (item.itemType === "agent_activity") {
          await resolveApproval.mutateAsync({
            itemId: item.id,
            itemType: "agent_escalation",
            action: action === "approve" ? "approved" : "rejected",
            reason:
              note.trim() ||
              (action === "approve"
                ? "Approved from Decisions"
                : "Rejected from Decisions"),
          });
        } else if (item.itemType === "notification") {
          await markNotificationRead.mutateAsync({ id: item.id });
        } else if (item.itemType === "ingestion") {
          await rejectIngestion.mutateAsync({
            documentId: item.id,
            reason: note.trim() || "Rejected from Decisions",
          });
        }
        setDismissed((p) => new Set(p).add(item.id));
        toast.success(action === "approve" ? "Approved" : "Rejected", {
          action: {
            label: "Undo",
            onClick: () =>
              setDismissed((p) => {
                const n = new Set(p);
                n.delete(item.id);
                return n;
              }),
          },
        });
        announce(action === "approve" ? "Approved" : "Rejected");
        if (entityId) {
          emitDataChanged(
            "activity-hub",
            `${action}_${item.itemType}`,
            entityId,
          );
        }
      } catch {
        toast.error("That didn't save. Try again.");
      } finally {
        setPendingIds((p) => {
          const n = new Set(p);
          n.delete(item.id);
          return n;
        });
        setNote("");
        setNoteFor(null);
      }
    },
    [
      resolveApproval,
      markNotificationRead,
      rejectIngestion,
      note,
      announce,
      entityId,
    ],
  );

  const snooze = useCallback((item: DecisionItem) => {
    setDismissed((p) => new Set(p).add(item.id));
    toast.info("Snoozed for 1 hour", {
      action: {
        label: "Restore",
        onClick: () =>
          setDismissed((p) => {
            const n = new Set(p);
            n.delete(item.id);
            return n;
          }),
      },
    });
  }, []);

  // ── Keyboard triage ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName.match(/INPUT|TEXTAREA|SELECT/))
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setCursor((c) => Math.min(c + 1, visible.length - 1));
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setCursor((c) => Math.max(c - 1, 0));
          break;
        case "a":
          if (selected) void decide(selected, "approve");
          break;
        case "r":
          if (selected) {
            setNoteFor(selected.id);
            e.preventDefault();
          }
          break;
        case "s":
          if (selected) snooze(selected);
          break;
        case "Escape":
          setNoteFor(null);
          setNote("");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible.length, selected, decide, snooze]);

  const urgentCount = visible.filter((i) => i.severity === "urgent").length;

  // Announce triage movement for screen readers.
  useEffect(() => {
    if (selected) {
      announce(`Selected: ${selected.title}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  return (
    <div className="flex h-full min-h-0 flex-col pb-16 md:pb-0">
      {/* Header strip */}
      <header className="flex items-center justify-between border-b border-border/40 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Inbox className="h-4 w-4 text-primary" aria-hidden="true" />
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Decisions
          </h1>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {visible.length} waiting
          </span>
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-500">
              {urgentCount} urgent
            </span>
          )}
        </div>
        <p className="hidden font-mono text-[10px] text-muted-foreground/60 sm:block">
          j/k move · a approve · r reject · s snooze
        </p>
      </header>

      {visible.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <CheckCircle2
            className="mb-1 h-8 w-8 text-emerald-500"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">Queue clear</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Agents are running your books. Anything that needs your call lands
            here the moment it comes up.
          </p>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[380px_1fr]">
          {/* ── Queue pane ─────────────────────────────────────────────── */}
          <div
            ref={listRef}
            role="listbox"
            aria-label="Decision queue"
            aria-activedescendant={
              selected ? `decision-${selected.id}` : undefined
            }
            className="min-h-0 overflow-y-auto border-b border-border/40 lg:border-b-0 lg:border-r"
          >
            {visible.map((item, idx) => {
              const meta = SEVERITY_META[item.severity];
              const Icon = meta.icon;
              const isSelected = selected?.id === item.id;
              return (
                <button
                  key={item.id}
                  id={`decision-${item.id}`}
                  role="option"
                  aria-selected={isSelected}
                  disabled={pendingIds.has(item.id)}
                  onClick={() => setCursor(idx)}
                  className={cn(
                    "flex w-full items-start gap-2.5 border-b border-border/30 px-4 py-3 text-left transition-colors last:border-0",
                    isSelected ? "bg-primary/[0.06]" : "hover:bg-accent/40",
                  )}
                >
                  <Icon
                    className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", meta.tone)}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      {item.confidence !== undefined && (
                        <span
                          className={cn(
                            "font-mono font-semibold tabular-nums",
                            item.confidence >= 0.8
                              ? "text-emerald-500"
                              : item.confidence >= 0.6
                                ? "text-amber-500"
                                : "text-red-500",
                          )}
                        >
                          {Math.round(item.confidence * 100)}%
                        </span>
                      )}
                      {item.agentName && (
                        <span className="truncate">{item.agentName}</span>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0">
                        {timeAgo(item.createdAt)}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Brief pane ─────────────────────────────────────────────── */}
          <div className="min-h-0 overflow-y-auto">
            {selected ? (
              <DecisionBriefPane
                key={selected.id}
                item={selected}
                busy={pendingIds.has(selected.id)}
                noteOpen={noteFor === selected.id}
                note={note}
                onNoteChange={setNote}
                onToggleNote={() =>
                  setNoteFor((v) => (v === selected.id ? null : selected.id))
                }
                onDecide={(a) => void decide(selected, a)}
                onSnooze={() => snooze(selected)}
                onAskAi={(q) =>
                  router.push(`/dashboard?prompt=${encodeURIComponent(q)}`)
                }
              />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
                Select a decision to see its full brief.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Brief pane ───────────────────────────────────────────────────────────

function DecisionBriefPane({
  item,
  busy,
  noteOpen,
  note,
  onNoteChange,
  onToggleNote,
  onDecide,
  onSnooze,
  onAskAi,
}: {
  item: DecisionItem;
  busy: boolean;
  noteOpen: boolean;
  note: string;
  onNoteChange: (v: string) => void;
  onToggleNote: () => void;
  onDecide: (a: "approve" | "reject") => void;
  onSnooze: () => void;
  onAskAi: (question: string) => void;
}) {
  const meta = SEVERITY_META[item.severity];
  const Icon = meta.icon;
  const evidenceKeys =
    item.evidence && Object.keys(item.evidence).length > 0
      ? Object.entries(item.evidence).slice(0, 6)
      : [];

  return (
    <article className="mx-auto max-w-2xl space-y-5 p-5 sm:p-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", meta.tone)} aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {meta.label}
          </span>
        </div>
        <h2 className="mt-1.5 text-base font-semibold leading-snug text-foreground">
          {item.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ProvenanceBadge
            actor="agent"
            actorName={item.agentName}
            confidence={item.confidence}
            source={item.sourceDoc}
          />
          {item.amount && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-amber-600">
              {item.amount}
            </span>
          )}
        </div>
      </div>

      {/* What */}
      <Section title="What this is">
        <p className="text-sm leading-relaxed text-foreground/85">
          {item.summary}
        </p>
      </Section>

      {/* Why */}
      {item.rationale && (
        <Section title="Why the agent recommends this">
          <p className="rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2.5 text-[13px] leading-relaxed text-foreground/85">
            {item.rationale}
          </p>
        </Section>
      )}

      {/* Evidence */}
      {evidenceKeys.length > 0 && (
        <Section title="Evidence">
          <dl className="divide-y divide-border/30 overflow-hidden rounded-lg border border-border/50">
            {evidenceKeys.map(([k, v]) => (
              <div
                key={k}
                className="flex items-start justify-between gap-4 px-3 py-2"
              >
                <dt className="shrink-0 text-[11px] capitalize text-muted-foreground">
                  {k.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                </dt>
                <dd className="break-words text-right text-xs text-foreground">
                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {/* Note */}
      {noteOpen && (
        <div>
          <label
            htmlFor={`note-${item.id}`}
            className="text-[11px] font-medium text-muted-foreground"
          >
            Reason for rejecting (helps the agent learn)
          </label>
          <textarea
            id={`note-${item.id}`}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={2}
            autoFocus
            placeholder="Tell the agent what it missed…"
            className="mt-1 w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      {/* Actions */}
      <footer className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => onDecide("approve")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => (noteOpen ? onDecide("reject") : onToggleNote())}
          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
        >
          <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
          {noteOpen ? "Confirm rejection" : "Reject"}
        </button>
        <button
          type="button"
          onClick={onSnooze}
          disabled={busy}
          className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          Snooze 1h
        </button>
        <button
          type="button"
          onClick={() =>
            onAskAi(`Explain this decision: "${item.title}". ${item.summary}`)
          }
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Ask the CFO
        </button>
      </footer>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </h3>
      {children}
    </section>
  );
}
