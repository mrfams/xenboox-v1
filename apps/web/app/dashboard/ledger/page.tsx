"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileText,
  Landmark,
  Loader2,
  Search,
  Sparkles,
  X,
  Plus,
  Download,
  Upload,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { ProvenanceDot } from "@/components/ai-native-v2/provenance";
import { useModuleAi } from "@/components/module/module-ai-context";
import { usePermission } from "@/lib/permissions";
import { CreateJournalEntryForm } from "@/components/ledger/create-journal-entry-form";
import { CoaImportWizard } from "@/components/ledger/coa-import-wizard";
import { BulkExportButton } from "@/components/shared/bulk-csv";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

// ─── The Book — AI-Native Ledger (/ledger/new) ─────────────────────────────
//
// Three views the AI absorbs:
//   1. Journal — search-first register with detail drawer
//   2. COA — grouped accounts, each clickable → AI explains
//   3. Trial Balance — balance status + full account table
//
// Fixed Assets and Reconciliation are agent workflows — not manual views.
//
// Keyboard:
//   1/2/3  Switch tabs
//   j/k    Navigate list
//   Enter  Open detail
//   Esc    Close detail / unfocus search
//   /      Focus search

type Tab = "journal" | "coa" | "trial-balance";

const TABS: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: "journal", label: "Journal", icon: FileText },
  { key: "coa", label: "Chart of Accounts", icon: Landmark },
  { key: "trial-balance", label: "Trial Balance", icon: BookOpen },
];

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

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TheBookPage() {
  const { format } = useFormatCurrency();
  const { entityId } = useEntity();
  const [tab, setTab] = useState<Tab>("journal");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [cursor, setCursor] = useState(0);
  const [drawerEntryId, setDrawerEntryId] = useState<string | null>(null);
  const [drawerAccountId, setDrawerAccountId] = useState<string | null>(null);
  const [drawerAccountName, setDrawerAccountName] = useState<string | null>(
    null,
  );
  const [showJournalForm, setShowJournalForm] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openWithFocus } = useModuleAi();

  const canCreateEntry = usePermission("ledger.journal.create");
  const canImportCoa = usePermission("ledger.coa.import");
  const canExport = usePermission("ledger.export");
  const utils = trpc.useUtils();

  // Debounced search
  const onQuery = useCallback((v: string) => {
    setQuery(v);
    setCursor(0);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(v), 300);
  }, []);

  // Reset cursor when tab changes
  useEffect(() => {
    setCursor(0);
  }, [tab]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag?.match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Drawer open → only Esc
      if (drawerEntryId || drawerAccountId) {
        if (e.key === "Escape") {
          e.preventDefault();
          setDrawerEntryId(null);
          setDrawerAccountId(null);
        }
        return;
      }

      switch (e.key) {
        case "1":
          e.preventDefault();
          setTab("journal");
          break;
        case "2":
          e.preventDefault();
          setTab("coa");
          break;
        case "3":
          e.preventDefault();
          setTab("trial-balance");
          break;
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setCursor((c) => c + 1);
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setCursor((c) => Math.max(c - 1, 0));
          break;
        case "/":
          e.preventDefault();
          document.getElementById("book-search")?.focus();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerEntryId, drawerAccountId, tab]);

  // Scroll cursor into view
  useEffect(() => {
    const items = listRef.current?.querySelectorAll("[data-row]");
    const el = items?.[cursor];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  return (
    <div className="flex h-full flex-col p-4 pb-6 sm:p-6">
      {/* ── Header + Search ─────────────────────────────────────────── */}
      <header className="mb-3">
        <h1 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
          The Book
        </h1>
        <div className="relative mt-2">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
            aria-hidden="true"
          />
          <label htmlFor="book-search" className="sr-only">
            Search the book
          </label>
          <input
            id="book-search"
            type="text"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder='Ask the book… e.g. "rent payments", "office supplies over $500"'
            className="w-full rounded-xl border border-border/60 bg-card py-2.5 pl-10 pr-10 text-sm text-foreground shadow-sm placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
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

        {/* Tab bar + actions */}
        <div className="mt-3 flex items-center justify-between">
          <div
            className="flex items-center gap-1"
            role="tablist"
            aria-label="Ledger views"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            {/* Action buttons per tab */}
            {tab === "journal" && canCreateEntry && (
              <button
                type="button"
                onClick={() => setShowJournalForm(true)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="h-3 w-3" />
                New Entry
              </button>
            )}
            {tab === "coa" && canImportCoa && <CoaImportWizard />}
            {canExport && tab === "journal" && (
              <BulkExportButton
                rows={[]}
                filename={`journal-${new Date().toISOString().split("T")[0]}.csv`}
                label="Export"
              />
            )}
            <span className="hidden text-[10px] text-muted-foreground/50 sm:inline">
              1/2/3 tabs · j/k navigate · Enter open · / search
            </span>
          </div>
        </div>
      </header>

      {/* Journal Entry Form Modal */}
      {showJournalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
            <CreateJournalEntryForm
              onClose={() => setShowJournalForm(false)}
              onCreated={() => {
                setShowJournalForm(false);
                utils.journal.list.invalidate();
              }}
            />
          </div>
        </div>
      )}

      {/* ── Tab Panels ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "journal" && (
          <JournalPanel
            listRef={listRef}
            query={debounced}
            cursor={cursor}
            setCursor={setCursor}
            onOpenEntry={(id) => setDrawerEntryId(id)}
          />
        )}
        {tab === "coa" && (
          <COAPanel
            listRef={listRef}
            query={debounced}
            cursor={cursor}
            setCursor={setCursor}
            onOpenAccount={(id, name) => {
              setDrawerAccountId(id);
              setDrawerAccountName(name);
            }}
          />
        )}
        {tab === "trial-balance" && (
          <TrialBalancePanel
            listRef={listRef}
            cursor={cursor}
            setCursor={setCursor}
            onOpenAccount={(id, name) => {
              setDrawerAccountId(id);
              setDrawerAccountName(name);
            }}
          />
        )}
      </div>

      {/* ── Drawers ─────────────────────────────────────────────────── */}
      {drawerEntryId &&
        createPortal(
          <EntryDetailDrawer
            entryId={drawerEntryId}
            onClose={() => setDrawerEntryId(null)}
          />,
          document.body,
        )}
      {drawerAccountId &&
        createPortal(
          <AccountDetailDrawer
            accountId={drawerAccountId}
            accountName={drawerAccountName ?? ""}
            onClose={() => {
              setDrawerAccountId(null);
              setDrawerAccountName(null);
            }}
          />,
          document.body,
        )}
    </div>
  );
}

// ─── Journal Panel ──────────────────────────────────────────────────────────

function JournalPanel({
  listRef,
  query,
  cursor,
  setCursor,
  onOpenEntry,
}: {
  listRef: React.RefObject<HTMLUListElement | null>;
  query: string;
  cursor: number;
  setCursor: (n: number) => void;
  onOpenEntry: (id: string) => void;
}) {
  const { entityId } = useEntity();

  const { data, isLoading, isFetching } = trpc.journal.listWithDetails.useQuery(
    { search: query || undefined, limit: 50, offset: 0 },
    { enabled: !!entityId },
  );

  const { data: counts } = trpc.journal.getTabCounts.useQuery(undefined, {
    enabled: !!entityId,
  });

  const entries = (data?.entries ?? []) as unknown as Entry[];

  // Clamp cursor
  useEffect(() => {
    if (cursor >= entries.length && entries.length > 0) {
      setCursor(entries.length - 1);
    }
  }, [entries.length, cursor, setCursor]);

  const selected = entries[Math.min(cursor, entries.length - 1)] ?? null;

  // On Enter → open detail
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag?.match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.key === "Enter" && selected) {
        e.preventDefault();
        onOpenEntry(selected.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onOpenEntry]);

  return (
    <div className="space-y-2">
      {/* Counts strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 font-mono text-[11px] tabular-nums text-muted-foreground">
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
              {query ? "Nothing matches that" : "The book is empty"}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {query
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
                onOpen={() => onOpenEntry(e.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ─── COA Panel ──────────────────────────────────────────────────────────────

function COAPanel({
  listRef,
  query,
  cursor,
  setCursor,
  onOpenAccount,
}: {
  listRef: React.RefObject<HTMLUListElement | null>;
  query: string;
  cursor: number;
  setCursor: (n: number) => void;
  onOpenAccount: (id: string, name: string) => void;
}) {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data: accounts, isLoading } = trpc.coa.listHierarchy.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  // Group by type
  const grouped = useMemo(() => {
    if (!accounts) return {};
    const filtered = query
      ? accounts.filter(
          (a) =>
            a.name?.toLowerCase().includes(query.toLowerCase()) ||
            a.code?.toLowerCase().includes(query.toLowerCase()),
        )
      : accounts;
    return filtered.reduce(
      (acc, account) => {
        const type = account.type ?? "other";
        if (!acc[type]) acc[type] = [];
        acc[type].push(account);
        return acc;
      },
      {} as Record<string, typeof accounts>,
    );
  }, [accounts, query]);

  // Flatten for cursor
  const flat = useMemo(() => {
    return Object.values(grouped).flat();
  }, [grouped]);

  // Clamp cursor
  useEffect(() => {
    if (cursor >= flat.length && flat.length > 0) {
      setCursor(flat.length - 1);
    }
  }, [flat.length, cursor, setCursor]);

  // On Enter → open account drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag?.match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.key === "Enter") {
        const account = flat[Math.min(cursor, flat.length - 1)];
        if (account) {
          e.preventDefault();
          onOpenAccount(account.id, account.name);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, flat, onOpenAccount]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-mono tabular-nums text-muted-foreground">
          {flat.length} accounts
          {Object.keys(grouped).length > 0 &&
            ` · ${Object.keys(grouped).length} groups`}
        </p>
        {query && (
          <p className="text-[10px] text-muted-foreground/60">
            Filtered by &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      <section
        aria-label="Chart of accounts"
        className="overflow-hidden rounded-xl border border-border/50 bg-card"
      >
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-muted/30"
              />
            ))}
          </div>
        ) : flat.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-14 text-center">
            <Landmark
              className="mb-1 h-8 w-8 text-muted-foreground/30"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground">
              {query ? "No accounts match" : "No accounts configured"}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {query
                ? "Try different words."
                : "Ask the AI to set up your chart of accounts."}
            </p>
            {!query && (
              <button
                type="button"
                onClick={() =>
                  openWithFocus(
                    { kind: "Chart of Accounts", name: "All Accounts" },
                    "Help me set up my chart of accounts",
                  )
                }
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Set up with AI
              </button>
            )}
          </div>
        ) : (
          <ul ref={listRef} className="divide-y divide-border/30">
            {Object.entries(grouped).map(([type, typeAccounts]) => {
              let runningIndex = 0;
              // Calculate the starting index for this group
              for (const [t, accs] of Object.entries(grouped)) {
                if (t === type) break;
                runningIndex += accs.length;
              }

              return (
                <li key={type}>
                  <div className="bg-muted/30 px-4 py-1.5">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {type.replace(/_/g, " ")}
                    </h4>
                  </div>
                  <ul>
                    {typeAccounts.map((account, i) => {
                      const globalIdx = runningIndex + i;
                      return (
                        <li key={account.id} data-row>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenAccount(account.id, account.name)
                            }
                            className={cn(
                              "flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors",
                              globalIdx === cursor
                                ? "bg-accent/60"
                                : "hover:bg-accent/40",
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-12 shrink-0 font-mono text-[11px] text-muted-foreground/60">
                                {account.code}
                              </span>
                              <span className="text-sm text-foreground">
                                {account.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground/60">
                                {account.subtype?.replace(/_/g, " ") ?? ""}
                              </span>
                              <Sparkles className="h-3 w-3 text-primary/0 transition-colors group-hover:text-primary/50" />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ─── Trial Balance Panel ────────────────────────────────────────────────────

function TrialBalancePanel({
  listRef,
  cursor,
  setCursor,
  onOpenAccount,
}: {
  listRef: React.RefObject<HTMLUListElement | null>;
  cursor: number;
  setCursor: (n: number) => void;
  onOpenAccount: (id: string, name: string) => void;
}) {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data: currentPeriod, isSuccess: periodLoaded } =
    trpc.fiscal.getCurrent.useQuery(undefined, { enabled: !!entityId });

  const { data: tb, isLoading } = trpc.journal.getTrialBalance.useQuery(
    { periodId: currentPeriod?.id ?? "" },
    { enabled: !!entityId && !!currentPeriod },
  );

  const accounts = tb?.accounts ?? [];
  const totalDebit = tb?.totalDebit ?? 0;
  const totalCredit = tb?.totalCredit ?? 0;
  const isBalanced = tb?.isBalanced ?? true;

  // Clamp cursor
  useEffect(() => {
    if (cursor >= accounts.length && accounts.length > 0) {
      setCursor(accounts.length - 1);
    }
  }, [accounts.length, cursor, setCursor]);

  // On Enter → open account drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag?.match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.key === "Enter") {
        const account = accounts[Math.min(cursor, accounts.length - 1)];
        if (account) {
          e.preventDefault();
          onOpenAccount(account.id, account.name);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, accounts, onOpenAccount]);

  // No fiscal period
  if (periodLoaded && !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-14 text-center">
        <BookOpen
          className="mb-2 h-8 w-8 text-muted-foreground/30"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-foreground">
          No accounting period is open
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Ask the AI to open a fiscal period, or set your calendar in Settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Balance status */}
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
                Debits {format(totalDebit)} · Credits {format(totalCredit)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              openWithFocus(
                {
                  kind: "Trial Balance",
                  name: "Current Period",
                  fields: [
                    {
                      label: "Total Debits",
                      value: format(totalDebit),
                    },
                    {
                      label: "Total Credits",
                      value: format(totalCredit),
                    },
                    {
                      label: "Balanced",
                      value: isBalanced ? "Yes" : "No",
                    },
                  ],
                },
                "Explain my trial balance. Are there any accounts that look unusual?",
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            Ask AI
          </button>
        </div>
      </div>

      {/* Account table */}
      <section
        aria-label="Trial balance"
        className="overflow-hidden rounded-xl border border-border/50 bg-card"
      >
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-muted/30"
              />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <BookOpen
              className="mb-2 h-8 w-8 text-muted-foreground/30"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground">
              No accounts yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Accounts will appear as agents post entries.
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[80px_1fr_100px_100px] border-b bg-muted/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              <span>Code</span>
              <span>Account</span>
              <span className="text-right">Debit</span>
              <span className="text-right">Credit</span>
            </div>

            <ul ref={listRef} className="divide-y divide-border/30">
              {accounts.map(
                (
                  account: {
                    id: string;
                    code: string;
                    name: string;
                    balance: number | string | null;
                  },
                  idx: number,
                ) => {
                  const balance = Number(account.balance ?? 0);
                  return (
                    <li key={account.id} data-row>
                      <button
                        type="button"
                        onClick={() => onOpenAccount(account.id, account.name)}
                        className={cn(
                          "grid w-full grid-cols-[80px_1fr_100px_100px] items-center px-4 py-2.5 text-left transition-colors",
                          idx === cursor
                            ? "bg-accent/60"
                            : "hover:bg-accent/40",
                        )}
                      >
                        <span className="font-mono text-[11px] text-muted-foreground/60">
                          {account.code}
                        </span>
                        <span className="text-sm text-foreground truncate">
                          {account.name}
                        </span>
                        <span className="text-right font-mono text-xs tabular-nums text-foreground/70">
                          {balance > 0 ? format(balance) : ""}
                        </span>
                        <span className="text-right font-mono text-xs tabular-nums text-foreground/70">
                          {balance < 0 ? format(Math.abs(balance)) : ""}
                        </span>
                      </button>
                    </li>
                  );
                },
              )}
            </ul>

            {/* Totals */}
            <div className="flex items-center justify-between border-t-2 bg-muted/30 px-4 py-2.5 text-xs font-semibold text-foreground">
              <span>Total</span>
              <span className="font-mono tabular-nums">
                {format(totalDebit)} / {format(totalCredit)}
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ─── Register Row ───────────────────────────────────────────────────────────

function RegisterRow({
  entry,
  isFocused,
  onOpen,
}: {
  entry: Entry;
  isFocused: boolean;
  onOpen: () => void;
}) {
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
    <li data-row>
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
          {format(entry.debit)}
        </span>
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40"
          aria-hidden="true"
        />
      </button>
    </li>
  );
}

// ─── Entry Detail Drawer ────────────────────────────────────────────────────

function EntryDetailDrawer({
  entryId,
  onClose,
}: {
  entryId: string;
  onClose: () => void;
}) {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();
  const { data: entry, isLoading } = trpc.journal.getById.useQuery(
    { id: entryId },
    { enabled: !!entityId && !!entryId },
  );

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
                <MetaRow label="Date">
                  {entry.date
                    ? new Date(entry.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"}
                </MetaRow>
                <MetaRow label="Status">
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
                </MetaRow>
                {entry.description && (
                  <MetaRow label="Description">{entry.description}</MetaRow>
                )}
                {entry.source && (
                  <MetaRow label="Source">
                    <span className="capitalize">
                      {entry.source.replace(/_/g, " ")}
                    </span>
                  </MetaRow>
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
                                  ? format(parseFloat(line.debit!))
                                  : ""}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground/70">
                                {parseFloat(line.credit ?? "0") > 0
                                  ? format(parseFloat(line.credit!))
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
                              : `Out of balance by ${format(Math.abs(dr - cr))}`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    No line items yet.
                  </p>
                )}
              </div>

              {/* AI Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    openWithFocus(
                      {
                        kind: "Journal Entry",
                        name: entry.entryNumber
                          ? `JE-${String(entry.entryNumber).padStart(4, "0")}`
                          : "this entry",
                        id: entry.id,
                        fields: [
                          { label: "Date", value: entry.date ?? "—" },
                          { label: "Status", value: entry.status ?? "" },
                          {
                            label: "Description",
                            value: entry.description ?? "—",
                          },
                          { label: "Source", value: entry.source ?? "—" },
                        ],
                      },
                      "Explain this journal entry. Why was it created, what accounts are affected, and is it correct?",
                    )
                  }
                  className="flex w-full items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Explain this entry
                </button>
                <a
                  href="/dashboard/audit-trail"
                  className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  Show audit trail
                </a>
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

// ─── Account Detail Drawer ──────────────────────────────────────────────────

function AccountDetailDrawer({
  accountId,
  accountName,
  onClose,
}: {
  accountId: string;
  accountName: string;
  onClose: () => void;
}) {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

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
        aria-label={`Account: ${accountName}`}
        className="flex h-full w-full max-w-[480px] flex-col border-l border-border/60 bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Landmark className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {accountName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Account Details
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
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Ask the AI about this account to see its balance, recent activity,
              and any anomalies.
            </p>
            <button
              type="button"
              onClick={() =>
                openWithFocus(
                  {
                    kind: "Account",
                    name: accountName,
                    id: accountId,
                  },
                  `Explain this account: ${accountName}. What's the balance and recent activity?`,
                )
              }
              className="flex w-full items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI about this account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">
        {children}
      </span>
    </div>
  );
}
