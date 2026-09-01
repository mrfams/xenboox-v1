"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  BookOpen,
  FileText,
  Landmark,
  Building2,
  RefreshCw,
  Search,
  Bot,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Sparkles,
  Plus,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { usePermission } from "@/lib/permissions";
import { CreateJournalEntryForm } from "@/components/ledger/create-journal-entry-form";
import { FixedAssetsView } from "@/components/finance/fixed-assets-view";
import { ReconciliationView } from "@/components/finance/reconciliation-view";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { useModuleAi } from "@/components/module/module-ai-context";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { toast } from "sonner";
import { CoaImportWizard } from "@/components/ledger/coa-import-wizard";
import { BulkExportButton } from "@/components/shared/bulk-csv";

// ─── Ledger ───────────────────────────────────────────────────────────────
//
// The accounting records. For when you need to look at specific entries,
// verify the books, or trace a transaction.
//
// Replaces: journal, chart-of-accounts, trial-balance, fixed-assets, transactions

type LedgerTab =
  "journal" | "coa" | "trial-balance" | "fixed-assets" | "reconciliation";

const TABS: { key: LedgerTab; label: string; icon: LucideIcon }[] = [
  { key: "journal", label: "Journal", icon: FileText },
  { key: "coa", label: "Chart of Accounts", icon: Landmark },
  { key: "trial-balance", label: "Trial Balance", icon: BookOpen },
  { key: "fixed-assets", label: "Fixed Assets", icon: Building2 },
  { key: "reconciliation", label: "Reconciliation", icon: RefreshCw },
];

// ─── Journal Entry Detail Drawer ──────────────────────────────────────────

function JournalEntryDrawer({
  entryId,
  onClose,
}: {
  entryId: string;
  onClose: () => void;
}) {
  const { entityId, entityCurrency } = useEntity();
  const { openWithFocus } = useModuleAi();
  const utils = trpc.useUtils();
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [reverseReason, setReverseReason] = useState("");

  const reverseMutation = trpc.journal.reverse.useMutation({
    onSuccess: () => {
      toast.success("Journal entry reversed successfully");
      void utils.journal.listWithDetails.invalidate();
      void utils.journal.getTabCounts.invalidate();
      void utils.journal.getById.invalidate({ id: entryId });
      setShowReverseDialog(false);
      setReverseReason("");
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reverse entry");
    },
  });

  const { data: entry, isLoading } = trpc.journal.getById.useQuery(
    { id: entryId },
    { enabled: !!entityId && !!entryId },
  );

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!entryId) return null;

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
              <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Entry not found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Metadata */}
              <div className="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-2">
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
                    <span className="text-xs text-muted-foreground shrink-0">
                      Description
                    </span>
                    <span className="text-xs text-foreground text-right">
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
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
                  Entry Lines
                </h4>
                {entry.lines && entry.lines.length > 0 ? (
                  <div className="rounded-xl border border-border/50 overflow-hidden">
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
                            accountId: string;
                            debit: string | null;
                            credit: string | null;
                            description?: string | null;
                            accountName?: string | null;
                            accountCode?: string | null;
                          }) => {
                            const debit = parseFloat(line.debit ?? "0");
                            const credit = parseFloat(line.credit ?? "0");
                            return (
                              <tr
                                key={line.id}
                                className="border-b last:border-0 hover:bg-muted/20"
                              >
                                <td className="px-3 py-1.5">
                                  <p className="text-foreground font-medium">
                                    {line.accountName ??
                                      line.description ??
                                      "—"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/60 font-mono">
                                    {line.accountCode ??
                                      line.accountId.slice(0, 8)}
                                  </p>
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">
                                  {debit > 0 ? (
                                    <span className="text-foreground">
                                      {formatCurrency(
                                        debit,
                                        entityCurrency ?? "USD",
                                      )}
                                    </span>
                                  ) : (
                                    ""
                                  )}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">
                                  {credit > 0 ? (
                                    <span className="text-foreground">
                                      {formatCurrency(
                                        credit,
                                        entityCurrency ?? "USD",
                                      )}
                                    </span>
                                  ) : (
                                    ""
                                  )}
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-semibold">
                          <td className="px-3 py-2 text-foreground">Total</td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground">
                            {formatCurrency(
                              entry.lines.reduce(
                                (sum: number, l: { debit: string | null }) =>
                                  sum + parseFloat(l.debit ?? "0"),
                                0,
                              ),
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground">
                            {formatCurrency(
                              entry.lines.reduce(
                                (sum: number, l: { credit: string | null }) =>
                                  sum + parseFloat(l.credit ?? "0"),
                                0,
                              ),
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    This entry has no line items yet.
                  </p>
                )}
              </div>

              {/* Balance Check */}
              {entry.lines && entry.lines.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                  {(() => {
                    const totalDebit = entry.lines.reduce(
                      (sum: number, l: { debit: string | null }) =>
                        sum + parseFloat(l.debit ?? "0"),
                      0,
                    );
                    const totalCredit = entry.lines.reduce(
                      (sum: number, l: { credit: string | null }) =>
                        sum + parseFloat(l.credit ?? "0"),
                      0,
                    );
                    const isBalanced =
                      Math.abs(totalDebit - totalCredit) < 0.01;
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isBalanced ? (
                            <CheckCircle2
                              className="h-4 w-4 text-balanced-green"
                              aria-hidden="true"
                            />
                          ) : (
                            <AlertTriangle
                              className="h-4 w-4 text-error-clay"
                              aria-hidden="true"
                            />
                          )}
                          <span
                            className={cn(
                              "text-xs font-medium",
                              isBalanced
                                ? "text-balanced-green"
                                : "text-error-clay",
                            )}
                          >
                            {isBalanced
                              ? "Debits = Credits — Balanced"
                              : `Out of balance by ${formatCurrency(Math.abs(totalDebit - totalCredit), entityCurrency ?? "USD")}`}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {entry.lines.length} line
                          {entry.lines.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Agent vs Human indicator */}
              {entry.source && (
                <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-3">
                  <Bot className="h-4 w-4 text-primary/60" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {entry.source === "agent" ||
                      entry.source === "ai" ||
                      entry.source === "system"
                        ? "Created by AI Agent"
                        : "Created by Human"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Source: {entry.source.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              )}

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
                          { label: "Status", value: entry.status },
                          {
                            label: "Description",
                            value: entry.description ?? "—",
                          },
                          { label: "Source", value: entry.source ?? "—" },
                        ],
                      },
                      `Explain this journal entry. Why was it created, what accounts are affected, and is it correct?`,
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

                {/* Reverse Entry Button — only for posted entries */}
                {entry.status === "posted" && canDeleteJournal && (
                  <button
                    type="button"
                    onClick={() => setShowReverseDialog(true)}
                    className="flex w-full items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reverse this entry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reverse Confirmation Dialog */}
      {showReverseDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/20 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowReverseDialog(false);
              setReverseReason("");
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-clay/10">
                <RotateCcw className="h-5 w-5 text-error-clay" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Reverse Journal Entry
                </h3>
                <p className="text-xs text-muted-foreground">
                  This will create a new entry that cancels out this one.
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-foreground">
                {entry?.entryNumber
                  ? `JE-${String(entry.entryNumber).padStart(4, "0")}`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry?.description ?? "No description"}
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-foreground">
                Reason for reversal <span className="text-error-clay">*</span>
              </span>
              <input
                type="text"
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="e.g., Incorrect amounts, duplicate entry"
                className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </label>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowReverseDialog(false);
                  setReverseReason("");
                }}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (entry && reverseReason.trim()) {
                    reverseMutation.mutate({
                      id: entry.id,
                      reason: reverseReason.trim(),
                    });
                  }
                }}
                disabled={!reverseReason.trim() || reverseMutation.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-error-clay px-3 py-2 text-sm font-medium text-white hover:bg-error-clay/90 transition-colors disabled:opacity-50"
              >
                {reverseMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {reverseMutation.isPending ? "Reversing..." : "Reverse Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Journal View ──────────────────────────────────────────────────────────

function JournalView() {
  const { entityId, entityCurrency } = useEntity();
  const { openWithFocus } = useModuleAi();
  const { hasPermission } = usePermission();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canCreateJournal = hasPermission("general_ledger", "create");
  const canDeleteJournal = hasPermission("general_ledger", "delete");

  // Debounce search input (300ms)
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0); // Reset to first page on new search
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const utils = trpc.useUtils();

  const { data: journalData, isLoading } =
    trpc.journal.listWithDetails.useQuery(
      {
        status: activeFilter as
          "all" | "draft" | "pending" | "approved" | "posted" | "voided",
        search: debouncedSearch || undefined,
        limit: pageSize,
        offset: page * pageSize,
      },
      { enabled: !!entityId },
    );

  const { data: tabCounts } = trpc.journal.getTabCounts.useQuery(undefined, {
    enabled: !!entityId,
  });

  const journalEntries = journalData?.entries ?? [];
  const totalPages = journalData?.totalPages ?? 1;

  const filters = [
    { label: "All", value: "all", count: tabCounts?.all },
    { label: "Draft", value: "draft", count: tabCounts?.draft },
    { label: "Pending", value: "pending", count: tabCounts?.pending },
    { label: "Posted", value: "posted", count: tabCounts?.posted },
    { label: "Voided", value: "voided", count: tabCounts?.voided },
  ];

  return (
    <div className="space-y-4">
      {/* Create Entry Button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {journalData?.totalCount ?? 0} entries total
        </p>
        <div className="flex items-center gap-2">
          <BulkExportButton
            rows={journalEntries.map((e) => ({
              entryNumber: e.entryNumber,
              description: e.description,
              status: e.status,
              debit: e.debit,
              credit: e.credit,
            }))}
            filename={`journal-${new Date().toISOString().slice(0, 10)}.csv`}
            label="Export"
          />
          {canCreateJournal && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Entry
            </button>
          )}
        </div>
      </div>

      {/* AI-enhanced search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
          aria-hidden="true"
        />
        <label htmlFor="journal-search" className="sr-only">
          Search journal entries
        </label>
        <input
          id="journal-search"
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder='Search entries by keyword (e.g. "rent", "invoice", "payroll")...'
          className="w-full rounded-xl border border-border/50 bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setPage(0);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Quick filters */}
      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => {
              setActiveFilter(filter.value);
              setPage(0);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
              activeFilter === filter.value
                ? "border-primary/25 bg-primary/10 text-primary"
                : "border-border/40 bg-background/50 text-muted-foreground/70 hover:border-primary/25 hover:text-primary/80",
            )}
          >
            {filter.label}
            {filter.count !== undefined && filter.count > 0 && (
              <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] font-bold tabular-nums">
                {filter.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Journal entries */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-muted/30"
            />
          ))}
        </div>
      ) : journalEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
          <FileText
            className="h-12 w-12 text-muted-foreground/30 mb-3"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">
            {searchQuery
              ? "No entries match your search"
              : "No journal entries yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery
              ? "Try a different search term"
              : "Entries will appear here as agents post them"}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
            <div className="divide-y divide-border/40">
              {journalEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedEntryId(entry.id)}
                  className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      entry.statusColor === "emerald"
                        ? "bg-balanced-green"
                        : entry.statusColor === "blue"
                          ? "bg-primary"
                          : entry.statusColor === "amber"
                            ? "bg-attention-amber"
                            : entry.statusColor === "red"
                              ? "bg-error-clay"
                              : "bg-muted-foreground/30",
                    )}
                  />
                  <span className="w-14 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground/70">
                    #{String(entry.entryNumber).padStart(4, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground transition-colors group-hover:text-primary">
                    {entry.description ?? entry.entryNumber}
                  </span>

                  <span className="hidden shrink-0 items-center gap-2 sm:flex">
                    {entry.isAiGenerated && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                        <Bot className="h-2.5 w-2.5" aria-hidden="true" />
                        AI
                      </span>
                    )}
                    <span className="text-[10px] tabular-nums text-muted-foreground/60">
                      {entry.date
                        ? new Date(entry.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                        entry.statusColor === "emerald"
                          ? "bg-balanced-green/10 text-balanced-green"
                          : entry.statusColor === "blue"
                            ? "bg-primary/10 text-primary"
                            : entry.statusColor === "amber"
                              ? "bg-attention-amber/10 text-attention-amber"
                              : entry.statusColor === "red"
                                ? "bg-error-clay/10 text-error-clay"
                                : "bg-muted text-muted-foreground",
                      )}
                    >
                      {entry.status}
                    </span>
                  </span>

                  <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                    {formatCurrency(entry.debit)}
                  </span>
                  <ChevronRight
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-primary/50"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
                {journalData?.totalCount !== undefined && (
                  <span className="ml-1">
                    ({journalData.totalCount} entries)
                  </span>
                )}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-border/50 bg-background px-2.5 py-1 text-xs text-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-border/50 bg-background px-2.5 py-1 text-xs text-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail drawer */}
      {selectedEntryId && (
        <JournalEntryDrawer
          entryId={selectedEntryId}
          onClose={() => setSelectedEntryId(null)}
        />
      )}

      {/* Create entry form */}
      {showCreateForm && (
        <CreateJournalEntryForm
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            void utils.journal.listWithDetails.invalidate();
            void utils.journal.getTabCounts.invalidate();
            setShowCreateForm(false);
          }}
        />
      )}
    </div>
  );
}

// ─── COA View ──────────────────────────────────────────────────────────────

function COAView() {
  const { entityId, entityCurrency } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data: accounts, isLoading } = trpc.coa.listHierarchy.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  // Group accounts by type
  const grouped = accounts
    ? accounts.reduce(
        (acc, account) => {
          const type = account.type ?? "other";
          if (!acc[type]) acc[type] = [];
          acc[type].push(account);
          return acc;
        },
        {} as Record<string, typeof accounts>,
      )
    : {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {accounts?.length ?? 0} accounts
          {(accounts?.length ?? 0) > 0 &&
            ` · ${Object.keys(grouped).length} groups`}
        </p>
        <div className="flex items-center gap-2">
          <CoaImportWizard />
          <BulkExportButton
            rows={(accounts ?? []).map((a) => ({
              code: a.code,
              name: a.name,
              type: a.type,
              subtype: a.subtype,
            }))}
            filename={`coa-${new Date().toISOString().slice(0, 10)}.csv`}
            label="Export"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-muted/30"
            />
          ))}
        </div>
      ) : !accounts || accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
          <Landmark
            className="h-12 w-12 text-muted-foreground/30 mb-3"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">
            No accounts configured
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Your chart of accounts will appear here
          </p>
          <button
            type="button"
            onClick={() =>
              openWithFocus(
                { kind: "Chart of Accounts", name: "All Accounts" },
                "Help me set up my chart of accounts",
              )
            }
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Set up with AI
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, typeAccounts]) => (
            <div key={type}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2 px-1">
                {type.replace(/_/g, " ")}
              </h4>
              <div className="space-y-1">
                {typeAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() =>
                      openWithFocus(
                        {
                          kind: "Account",
                          name: account.name,
                          id: account.id,
                          fields: [
                            { label: "Code", value: account.code ?? "—" },
                            { label: "Type", value: account.type ?? "—" },
                            {
                              label: "Subtype",
                              value: account.subtype?.replace(/_/g, " ") ?? "—",
                            },
                          ],
                        },
                        `Explain this account: ${account.name}. What's the balance and recent activity?`,
                      )
                    }
                    className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left transition-all hover:border-border/50 hover:bg-card/60 group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground/60 w-12">
                        {account.code}
                      </span>
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                        {account.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/60">
                        {account.subtype?.replace(/_/g, " ")}
                      </span>
                      <Sparkles className="h-3 w-3 text-primary/0 group-hover:text-primary/50 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Trial Balance View ────────────────────────────────────────────────────

function TrialBalanceView() {
  const { entityId, entityCurrency } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data: currentPeriod, isSuccess: periodLoaded } =
    trpc.fiscal.getCurrent.useQuery(undefined, {
      enabled: !!entityId,
    });
  const { data: tb, isLoading } = trpc.journal.getTrialBalance.useQuery(
    { periodId: currentPeriod?.id ?? "" },
    { enabled: !!entityId && !!currentPeriod },
  );

  // No open fiscal period → say so instead of showing a misleading
  // "no accounts" empty state over an eternal skeleton.
  if (periodLoaded && !currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
        <BookOpen
          className="h-12 w-12 text-muted-foreground/30 mb-3"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-foreground">
          No accounting period is open
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          A trial balance needs an open fiscal period. Ask the AI to open one,
          or set your fiscal calendar in Settings.
        </p>
      </div>
    );
  }

  const accounts = tb?.accounts ?? [];
  const totalDebit = tb?.totalDebit ?? 0;
  const totalCredit = tb?.totalCredit ?? 0;
  const isBalanced = tb?.isBalanced ?? true;

  return (
    <div className="space-y-4">
      {/* Balance check */}
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
                  ? "Trial Balance is balanced"
                  : "Trial Balance is out of balance"}
              </p>
              <p className="text-xs text-muted-foreground">
                Total Debits:{" "}
                {formatCurrency(totalDebit, entityCurrency ?? "USD")} · Total
                Credits: {formatCurrency(totalCredit, entityCurrency ?? "USD")}
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
                      value: formatCurrency(
                        totalDebit,
                        entityCurrency ?? "USD",
                      ),
                    },
                    {
                      label: "Total Credits",
                      value: formatCurrency(
                        totalCredit,
                        entityCurrency ?? "USD",
                      ),
                    },
                    { label: "Balanced", value: isBalanced ? "Yes" : "No" },
                  ],
                },
                "Explain my trial balance. Are there any accounts that look unusual or need attention?",
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            Ask AI
          </button>
        </div>
      </div>

      {/* Accounts */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-muted/30"
            />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
          <BookOpen
            className="h-12 w-12 text-muted-foreground/30 mb-3"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">No accounts yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add accounts to start tracking transactions.
          </p>
        </div>
      ) : (
        <>
          <ResponsiveTable
            caption="Trial balance showing debits and credits for all accounts"
            columns={[
              { key: "code", header: "Code" },
              { key: "account", header: "Account" },
              {
                key: "debit",
                header: "Debit",
                className: "text-right tabular-nums",
              },
              {
                key: "credit",
                header: "Credit",
                className: "text-right tabular-nums",
              },
            ]}
            rows={accounts.map((account) => {
              const balance = Number(account.balance ?? 0);
              return {
                code: (
                  <span className="font-mono text-muted-foreground/60">
                    {account.code}
                  </span>
                ),
                account: (
                  <span className="text-foreground">{account.name}</span>
                ),
                debit:
                  balance > 0
                    ? formatCurrency(balance, entityCurrency ?? "USD")
                    : "",
                credit:
                  balance < 0
                    ? formatCurrency(Math.abs(balance), entityCurrency ?? "USD")
                    : "",
              };
            })}
          />
          {/* Keep tfoot totals visible on both views */}
          <div className="mt-2 flex justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs font-semibold">
            <span>Total</span>
            <span className="tabular-nums">
              {formatCurrency(totalDebit, entityCurrency ?? "USD")} /{" "}
              {formatCurrency(totalCredit, entityCurrency ?? "USD")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function FixedAssetsViewWrapper() {
  return <FixedAssetsView />;
}

// ─── Reconciliation View ───────────────────────────────────────────────────

function ReconciliationViewWrapper() {
  return <ReconciliationView />;
}

// ─── Keyboard-Navigable Tab List ──────────────────────────────────────────

function LedgerTabList({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: typeof TABS;
  activeTab: LedgerTab;
  onTabChange: (key: LedgerTab) => void;
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabIndex = tabs.findIndex((t) => t.key === activeTab);

  const focusTab = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, tabs.length - 1));
      tabRefs.current[clamped]?.focus();
    },
    [tabs.length],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          focusTab(tabIndex + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          focusTab(tabIndex - 1);
          break;
        case "Home":
          e.preventDefault();
          focusTab(0);
          break;
        case "End":
          e.preventDefault();
          focusTab(tabs.length - 1);
          break;
      }
    },
    [tabIndex, tabs.length, focusTab],
  );

  return (
    <div
      role="tablist"
      aria-label="Ledger sections"
      className="flex items-center gap-1 overflow-x-auto border-b border-border/50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab, i) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`ledger-tab-${tab.key}`}
            aria-selected={isActive}
            aria-controls={`ledger-panel-${tab.key}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.key)}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex items-center gap-1.5 border-b-2 -mb-px px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function LedgerPage() {
  const { entityId, entityCurrency } = useEntity();
  const [activeTab, setActiveTab] = useState<LedgerTab>("journal");

  // ── Cross-surface sync ────────────────────────────────────────────────
  // Listen for data_changed events from other surfaces and refetch
  useSurfaceSync({ entityId, surfaces: ["ledger"] });

  const tabContent = {
    journal: <JournalView />,
    coa: <COAView />,
    "trial-balance": <TrialBalanceView />,
    "fixed-assets": <FixedAssetsViewWrapper />,
    reconciliation: <ReconciliationViewWrapper />,
  };

  return (
    <ModulePageShell
      title="Ledger"
      description="The record of truth. Search, verify, and trace every entry."
      icon={BookOpen}
      disableAiCopilot={false}
      aiSuggestions={[
        {
          label: "Search for Trust Bank entries",
          prompt: "Search for Trust Bank entries",
        },
        {
          label: "Show me unposted entries",
          prompt: "Show me unposted entries",
        },
        {
          label: "Explain this journal entry",
          prompt: "Explain this journal entry",
        },
      ]}
      tabs={[]}
    >
      <div className="p-3 pb-20 sm:p-6 md:pb-6">
        {/* Custom keyboard-navigable tab list */}
        <LedgerTabList
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab panel */}
        <div
          role="tabpanel"
          id={`ledger-panel-${activeTab}`}
          aria-labelledby={`ledger-tab-${activeTab}`}
          tabIndex={0}
          className="mt-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:rounded-lg"
        >
          {tabContent[activeTab]}
        </div>
      </div>
    </ModulePageShell>
  );
}
