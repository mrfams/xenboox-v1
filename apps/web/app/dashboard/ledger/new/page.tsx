"use client";

import { useCallback, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
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

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 pb-20 sm:p-6 md:pb-6">
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
        </div>
      </header>

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
          <ul className="divide-y divide-border/30">
            {entries.map((e) => (
              <RegisterRow key={e.id} entry={e} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── One register row, expanding to its lines ──────────────────────────────

function RegisterRow({ entry }: { entry: Entry }) {
  const [open, setOpen] = useState(false);
  const { entityId } = useEntity();
  const { data: detail, isLoading: detailLoading } =
    trpc.journal.getById.useQuery(
      { id: entry.id },
      { enabled: open && !!entityId },
    );

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
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/40"
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
        {open ? (
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40"
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div className="border-t border-border/30 bg-muted/10 px-4 py-3 sm:pl-24">
          {detailLoading ? (
            <Loader2
              className="h-4 w-4 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          ) : detail?.lines && detail.lines.length > 0 ? (
            <>
              <table className="w-full max-w-md text-[11px]">
                <thead>
                  <tr className="text-left text-muted-foreground/60">
                    <th className="pb-1 pr-3 font-medium">Account</th>
                    <th className="pb-1 pr-3 text-right font-medium">Dr</th>
                    <th className="pb-1 text-right font-medium">Cr</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {detail.lines.map(
                    (l: {
                      id: string;
                      debit: string | null;
                      credit: string | null;
                      accountName?: string | null;
                    }) => (
                      <tr key={l.id}>
                        <td className="py-0.5 pr-3 font-sans text-foreground/80">
                          {l.accountName ?? "—"}
                        </td>
                        <td className="py-0.5 pr-3 text-right text-foreground/70">
                          {parseFloat(l.debit ?? "0") > 0
                            ? formatCurrency(parseFloat(l.debit!))
                            : ""}
                        </td>
                        <td className="py-0.5 text-right text-foreground/70">
                          {parseFloat(l.credit ?? "0") > 0
                            ? formatCurrency(parseFloat(l.credit!))
                            : ""}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
              {(() => {
                const dr = detail.lines.reduce(
                  (s: number, l: { debit: string | null }) =>
                    s + parseFloat(l.debit ?? "0"),
                  0,
                );
                const cr = detail.lines.reduce(
                  (s: number, l: { credit: string | null }) =>
                    s + parseFloat(l.credit ?? "0"),
                  0,
                );
                const balanced = Math.abs(dr - cr) < 0.01;
                return (
                  <p
                    className={cn(
                      "mt-2 inline-flex items-center gap-1 text-[10px] font-semibold",
                      balanced ? "text-emerald-600" : "text-red-600",
                    )}
                  >
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    {balanced
                      ? "Balanced"
                      : `Out of balance by ${formatCurrency(Math.abs(dr - cr))}`}
                  </p>
                );
              })()}
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              This entry has no line items yet.
            </p>
          )}

          {/* Provenance footer */}
          <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
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
    </li>
  );
}
