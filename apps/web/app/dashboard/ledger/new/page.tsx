"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileText,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { ProvenanceDot } from "@/components/ai-native-v2/provenance";

// ─── The Book (/ledger/new) ───────────────────────────────────────────────
//
// The record of truth, AI-native edition: you ask in plain language, the
// register answers. Every entry carries provenance — a colored dot says
// who posted it and how confident the agent was.
//
// AI-native features:
// - Trial balance status card (balanced / out of balance with AI narrative)
// - Journal entry detail drawer (slide-over with full lines)
// - Keyboard shortcuts: j/k navigate, Enter opens detail, Esc closes

type Entry = {
  id: string;
  entryNumber?: number | null;
  description?: string | null;
  date?: string | null;
  status?: string;
  statusColor?: string;
  debit: number;
  credit: number;
  isAiGenerated?: boolean;
  createdBy?: string | null;
  source?: string | null;
};

export default function TheBookPage() {
  const { entityId } = useEntity();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cursor, setCursor] = useState(0);
  const [drawerEntryId, setDrawerEntryId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Debounced natural-language-ish search.
  const onQuery = useCallback((v: string) => {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(v), 300);
  }, []);

  const { data, isLoading, isFetching } = trpc.journal.listWithDetails.useQuery(
    { search: debounced || undefined, limit: 40, offset: 0 },
    { enabled: !!entityId },
  );
  const { data: counts } = trpc.journal.getTabCounts.useQuery(undefined, {
    enabled: !!entityId,
  });

  const entries = (data?.entries ?? []) as unknown as Entry[];

  // Trial balance
  const { data: currentPeriod } = trpc.fiscal.getCurrent.useQuery(undefined, {
    enabled: !!entityId,
  });
  const { data: tb } = trpc.journal.getTrialBalance.useQuery(
    { periodId: currentPeriod?.id ?? "" },
    { enabled: !!entityId && !!currentPeriod },
  );

  const selected = entries[Math.min(cursor, entries.length - 1)] ?? null;

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName.match(/INPUT|TEXTAREA|SELECT/))
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (drawerEntryId) {
        if (e.key === "Escape") {
          e.preventDefault();
          setDrawerEntryId(null);
        }
        return;
      }

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setCursor((c) => Math.min(c + 1, entries.length - 1));
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setCursor((c) => Math.max(c - 1, 0));
          break;
        case "Enter":
          if (selected) {
            e.preventDefault();
            setDrawerEntryId(selected.id);
          }
          break;
        case "/":
          e.preventDefault();
          document.getElementById("book-search")?.focus();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entries.length, selected, drawerEntryId]);

  // Scroll cursor into view
  useEffect(() => {
    const items = listRef.current?.querySelectorAll("[data-entry]");
    items?.[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pb-20 sm:p-6 md:pb-6">
      <header>
        <h1 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
          The Book
        </h1>
        {/* Search IS the interface */}
        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
            aria-hidden="true"
          />
          <label htmlFor="book-search" className="sr-only">
            Search the book in plain language
          </label>
          <input
            id="book-search"
            type="text"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder='Ask the book… e.g. "rent payments", "office supplies over $500"'
            className="w-full rounded-xl border border-border/60 bg-card py-3 pl-10 pr-10 text-sm text-foreground shadow-sm placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Counts strip */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 font-mono text-[11px] tabular-nums text-muted-foreground">
          <span>{data?.totalCount ?? 0} entries</span>
          {counts && (
            <>
              <span className="text-attention-amber">
                {counts.pending ?? 0} pending
              </span>
              <span className="text-primary">{counts.posted ?? 0} posted</span>
              {(counts.draft ?? 0) > 0 && (
                <span className="text-muted-foreground/60">
                  {counts.draft} drafts
                </span>
              )}
            </>
          )}
          {isFetching && !isLoading && (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          )}
          <span className="text-muted-foreground/40">
            j/k navigate · Enter detail · / search
          </span>
        </div>
      </header>

      {/* Trial Balance Status Card */}
      <TrialBalanceCard />

      {/* Register */}
      <section
        aria-label="Journal register"
        className="overflow-hidden rounded-xl border border-border/50 bg-card"
      >
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-lg bg-muted/30"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-14 text-center">
            <BookOpen
              className="mb-1 h-8 w-8 text-muted-foreground/30"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground">
              {debounced ? "Nothing matches that" : "The book is empty"}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {debounced
                ? "Try different words — agent descriptions are searchable too."
                : "As agents post entries, every one lands here with its full history."}
            </p>
          </div>
        ) : (
          <ul ref={listRef} className="divide-y divide-border/30">
            {entries.map((e, idx) => (
              <RegisterRow
                key={e.id}
                entry={e}
                isFocused={idx === cursor}
                onOpen={() => setDrawerEntryId(e.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Detail Drawer — portal to body so it's always in viewport */}
      {drawerEntryId &&
        createPortal(
          <EntryDetailDrawer
            entryId={drawerEntryId}
            onClose={() => setDrawerEntryId(null)}
          />,
          document.body,
        )}
    </div>
  );
}

// ─── Trial Balance Status Card ─────────────────────────────────────────────
//
// AI-native: shows balance status with a narrative, not a raw table.
// The AI explains what the numbers mean.

function TrialBalanceCard() {
  const { entityId } = useEntity();
  const { data: currentPeriod, isSuccess: periodLoaded } =
    trpc.fiscal.getCurrent.useQuery(undefined, { enabled: !!entityId });
  const { data: tb, isLoading } = trpc.journal.getTrialBalance.useQuery(
    { periodId: currentPeriod?.id ?? "" },
    { enabled: !!entityId && !!currentPeriod },
  );

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-xl border border-border/50 bg-card p-4">
        <div className="h-4 w-48 rounded bg-muted/30" />
      </div>
    );
  }

  if (periodLoaded && !currentPeriod) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          No open fiscal period — trial balance unavailable
        </div>
      </div>
    );
  }

  if (!tb) return null;

  const isBalanced = tb.isBalanced ?? true;
  const totalDebit = tb.totalDebit ?? 0;
  const totalCredit = tb.totalCredit ?? 0;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isBalanced
          ? "border-balanced-green/20 bg-balanced-green/[0.03]"
          : "border-error-clay/20 bg-error-clay/[0.03]",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isBalanced ? (
            <CheckCircle2
              className="h-5 w-5 text-balanced-green"
              aria-hidden="true"
            />
          ) : (
            <AlertTriangle
              className="h-5 w-5 text-error-clay"
              aria-hidden="true"
            />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {isBalanced
                ? "Trial balance is balanced"
                : "Trial balance is out of balance"}
            </p>
            <p className="text-xs text-muted-foreground">
              Debits {formatCurrency(totalDebit)} · Credits{" "}
              {formatCurrency(totalCredit)}
            </p>
          </div>
        </div>
        <Sparkles
          className="h-4 w-4 text-muted-foreground/30"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

// ─── Register Row ──────────────────────────────────────────────────────────

function RegisterRow({
  entry,
  isFocused,
  onOpen,
}: {
  entry: Entry;
  isFocused: boolean;
  onOpen: () => void;
}) {
  const { entityId } = useEntity();

  const statusTone =
    entry.statusColor === "emerald"
      ? "bg-balanced-green"
      : entry.statusColor === "blue"
        ? "bg-primary"
        : entry.statusColor === "amber"
          ? "bg-attention-amber"
          : entry.statusColor === "red"
            ? "bg-error-clay"
            : "bg-muted-foreground/30";

  return (
    <li data-entry>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
          isFocused ? "bg-accent/60" : "hover:bg-accent/40",
        )}
      >
        <ProvenanceDot actor={entry.isAiGenerated ? "agent" : "human"} />
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusTone)}
          title={entry.status}
          aria-label={`Status: ${entry.status}`}
        />
        <span className="w-14 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground/60">
          #{String(entry.entryNumber ?? 0).padStart(4, "0")}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-foreground">
          {entry.description ?? "Untitled entry"}
        </span>
        <span className="hidden shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/60 sm:block">
          {entry.date
            ? new Date(entry.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : ""}
        </span>
        <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
          {formatCurrency(entry.debit)}
        </span>
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40"
          aria-hidden="true"
        />
      </button>
    </li>
  );
}

// ─── Entry Detail Drawer ───────────────────────────────────────────────────
//
// AI-native: slide-over panel with full entry details, lines, and AI
// narrative explaining what the entry does.

function EntryDetailDrawer({
  entryId,
  onClose,
}: {
  entryId: string;
  onClose: () => void;
}) {
  const { entityId } = useEntity();
  const { data: entry, isLoading } = trpc.journal.getById.useQuery(
    { id: entryId },
    { enabled: !!entityId && !!entryId },
  );

  // Close on Escape + lock body scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-foreground/10 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Journal entry details"
        className="flex h-full w-full max-w-[480px] flex-col border-l border-border/60 bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              ) : (
                <p className="truncate text-sm font-semibold text-foreground">
                  {entry?.entryNumber
                    ? `JE-${String(entry.entryNumber).padStart(4, "0")}`
                    : "Loading..."}
                </p>
              )}
              <p className="truncate text-[11px] text-muted-foreground">
                Journal Entry Details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-muted/30"
                />
              ))}
            </div>
          ) : !entry ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Entry not found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Metadata */}
              <div className="space-y-2 rounded-xl border border-border/50 bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Date</span>
                  <span className="text-xs font-medium text-foreground">
                    {entry.date
                      ? new Date(entry.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      entry.status === "posted"
                        ? "bg-primary/10 text-primary"
                        : entry.status === "pending_review"
                          ? "bg-attention-amber/10 text-attention-amber"
                          : entry.status === "reversed"
                            ? "bg-error-clay/10 text-error-clay"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {entry.status === "posted"
                      ? "Posted"
                      : entry.status === "pending_review"
                        ? "Pending"
                        : entry.status === "reversed"
                          ? "Reversed"
                          : entry.status}
                  </span>
                </div>
                {entry.description && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Description
                    </span>
                    <span className="text-right text-xs text-foreground">
                      {entry.description}
                    </span>
                  </div>
                )}
                {entry.source && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Source
                    </span>
                    <span className="text-xs font-medium text-foreground capitalize">
                      {entry.source.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
              </div>

              {/* Lines */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Entry Lines
                </h4>
                {entry.lines && entry.lines.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-border/50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            Account
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Debit
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Credit
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.lines.map(
                          (line: {
                            id: string;
                            debit: string | null;
                            credit: string | null;
                            accountName?: string | null;
                            accountCode?: string | null;
                          }) => (
                            <tr
                              key={line.id}
                              className="border-b last:border-0"
                            >
                              <td className="px-3 py-2">
                                <span className="font-medium text-foreground">
                                  {line.accountName ?? "—"}
                                </span>
                                {line.accountCode && (
                                  <span className="ml-1.5 text-muted-foreground/60">
                                    {line.accountCode}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground/70">
                                {parseFloat(line.debit ?? "0") > 0
                                  ? formatCurrency(parseFloat(line.debit!))
                                  : ""}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground/70">
                                {parseFloat(line.credit ?? "0") > 0
                                  ? formatCurrency(parseFloat(line.credit!))
                                  : ""}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                    {(() => {
                      const dr = entry.lines.reduce(
                        (s: number, l: { debit: string | null }) =>
                          s + parseFloat(l.debit ?? "0"),
                        0,
                      );
                      const cr = entry.lines.reduce(
                        (s: number, l: { credit: string | null }) =>
                          s + parseFloat(l.credit ?? "0"),
                        0,
                      );
                      const balanced = Math.abs(dr - cr) < 0.01;
                      return (
                        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2">
                          <span className="text-[10px] text-muted-foreground">
                            {entry.lines.length} line
                            {entry.lines.length !== 1 ? "s" : ""}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-semibold",
                              balanced ? "text-emerald-600" : "text-red-600",
                            )}
                          >
                            <CheckCircle2
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                            {balanced
                              ? "Balanced"
                              : `Out of balance by ${formatCurrency(Math.abs(dr - cr))}`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    This entry has no line items yet.
                  </p>
                )}
              </div>

              {/* Provenance footer */}
              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                {entry.isAiGenerated
                  ? "Posted by an agent"
                  : entry.createdBy
                    ? `Posted by ${entry.createdBy}`
                    : "Posted manually"}
                {entry.source && entry.source !== "Manual" && (
                  <> · source: {entry.source}</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
