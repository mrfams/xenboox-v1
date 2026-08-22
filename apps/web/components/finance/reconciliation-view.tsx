"use client";

import { useState, useCallback } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Banknote,
  FileText,
  Loader2,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { cn, formatCurrency } from "@/lib/utils";

// ─── Reconciliation View ───────────────────────────────────────────────────
// AI-powered bank reconciliation: matches bank transactions with journal entries.
// Shows unmatched items, AI-suggested matches, and reconciliation history.

type ReconTab = "unmatched" | "ai-matches" | "history";

export function ReconciliationView() {
  const { entityId } = useEntity();
  const [activeTab, setActiveTab] = useState<ReconTab>("unmatched");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<
    string | undefined
  >();
  const [selectedBankTx, setSelectedBankTx] = useState<string[]>([]);
  const [selectedJE, setSelectedJE] = useState<string[]>([]);

  const {
    data: reconData,
    isLoading,
    refetch,
  } = trpc.reconciliation.getReconciliationData.useQuery(
    { bankAccountId: selectedBankAccountId },
    { enabled: !!entityId },
  );

  const { data: aiMatches, isLoading: isMatching } =
    trpc.reconciliation.getAiMatches.useQuery(
      { bankAccountId: selectedBankAccountId },
      { enabled: !!entityId },
    );

  const reconcileMutation =
    trpc.reconciliation.reconcileTransaction.useMutation({
      onSuccess: () => {
        refetch();
        setSelectedBankTx([]);
        setSelectedJE([]);
      },
    });

  const handleReconcile = useCallback(
    (bankTransactionId: string, journalEntryId?: string) => {
      reconcileMutation.mutate({ bankTransactionId, journalEntryId });
    },
    [reconcileMutation],
  );

  const handleBulkReconcile = useCallback(() => {
    // Match selected items (1:1 pairing)
    const pairs = Math.min(selectedBankTx.length, selectedJE.length);
    for (let i = 0; i < pairs; i++) {
      reconcileMutation.mutate({
        bankTransactionId: selectedBankTx[i],
        journalEntryId: selectedJE[i],
      });
    }
  }, [selectedBankTx, selectedJE, reconcileMutation]);

  const tabs: { key: ReconTab; label: string; count?: number }[] = [
    {
      key: "unmatched",
      label: "Unmatched Items",
      count: reconData?.unreconciledBankTransactions.length,
    },
    {
      key: "ai-matches",
      label: "AI Suggestions",
      count: aiMatches?.matches.length,
    },
    {
      key: "history",
      label: "History",
      count: reconData?.recentReconciliations.length,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/30" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Account filter */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label htmlFor="bank-account-filter" className="sr-only">
            Filter by bank account
          </label>
          <select
            id="bank-account-filter"
            value={selectedBankAccountId ?? ""}
            onChange={(e) =>
              setSelectedBankAccountId(e.target.value || undefined)
            }
            className="w-full rounded-xl border border-border/50 bg-card px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
            <option value="">All Bank Accounts</option>
            {reconData?.accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} (
                {formatCurrency(parseFloat(acc.currentBalance ?? "0"))})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">
            Unmatched Bank Tx
          </p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {reconData?.unreconciledBankTransactions.length ?? 0}
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            {formatCurrency(reconData?.bankTotal ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">
            Unmatched Journal Entries
          </p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {reconData?.journalEntryCount ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">
            AI Matched
          </p>
          <p className="text-lg font-semibold text-primary tabular-nums">
            {aiMatches?.matchedCount ?? 0}
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            of {aiMatches?.totalBankTransactions ?? 0}
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              activeTab === tab.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] font-bold tabular-nums">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-border/50 bg-card">
        {activeTab === "unmatched" && (
          <UnmatchedView
            bankTransactions={reconData?.unreconciledBankTransactions ?? []}
            journalEntries={reconData?.unreconciledJournalEntries ?? []}
            selectedBankTx={selectedBankTx}
            selectedJE={selectedJE}
            onSelectBankTx={setSelectedBankTx}
            onSelectJE={setSelectedJE}
            onReconcile={handleReconcile}
            onBulkReconcile={handleBulkReconcile}
            currency={reconData?.currency ?? "GMD"}
          />
        )}

        {activeTab === "ai-matches" && (
          <AiMatchesView
            matches={aiMatches?.matches ?? []}
            isLoading={isMatching}
            onReconcile={handleReconcile}
            currency={reconData?.currency ?? "GMD"}
          />
        )}

        {activeTab === "history" && (
          <HistoryView
            reconciliations={reconData?.recentReconciliations ?? []}
            currency={reconData?.currency ?? "GMD"}
          />
        )}
      </div>
    </div>
  );
}

// ─── Unmatched View ────────────────────────────────────────────────────────

function UnmatchedView({
  bankTransactions,
  journalEntries,
  selectedBankTx,
  selectedJE,
  onSelectBankTx,
  onSelectJE,
  onReconcile,
  onBulkReconcile,
  currency,
}: {
  bankTransactions: Array<{
    id: string;
    transactionDate: string;
    amount: string;
    description: string;
    reference: string | null;
    type: string;
  }>;
  journalEntries: Array<{
    id: string;
    entryNumber: number | null;
    date: string | null;
    description: string | null;
  }>;
  selectedBankTx: string[];
  selectedJE: string[];
  onSelectBankTx: (ids: string[]) => void;
  onSelectJE: (ids: string[]) => void;
  onReconcile: (bankTxId: string, jeId?: string) => void;
  onBulkReconcile: () => void;
  currency: string;
}) {
  const toggleBankTx = (id: string) => {
    onSelectBankTx(
      selectedBankTx.includes(id)
        ? selectedBankTx.filter((i) => i !== id)
        : [...selectedBankTx, id],
    );
  };

  const toggleJE = (id: string) => {
    onSelectJE(
      selectedJE.includes(id)
        ? selectedJE.filter((i) => i !== id)
        : [...selectedJE, id],
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Bulk actions */}
      {selectedBankTx.length > 0 && selectedJE.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs text-primary">
            {Math.min(selectedBankTx.length, selectedJE.length)} items selected
            for matching
          </p>
          <button
            type="button"
            onClick={onBulkReconcile}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Match Selected
          </button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bank Transactions */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2 flex items-center gap-2">
            <Banknote className="h-3.5 w-3.5" />
            Bank Transactions ({bankTransactions.length})
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {bankTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mb-2" />
                <p className="text-sm text-foreground">All reconciled!</p>
                <p className="text-xs text-muted-foreground">
                  No unmatched bank transactions
                </p>
              </div>
            ) : (
              bankTransactions.map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => toggleBankTx(tx.id)}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-all",
                    selectedBankTx.includes(tx.id)
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 hover:border-border/80 hover:bg-card/60",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-4 w-4 rounded border-2 flex items-center justify-center",
                          selectedBankTx.includes(tx.id)
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30",
                        )}
                      >
                        {selectedBankTx.includes(tx.id) && (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                          {tx.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {tx.transactionDate} · {tx.type}
                        </p>
                      </div>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        parseFloat(tx.amount) >= 0
                          ? "text-emerald-500"
                          : "text-red-500",
                      )}
                    >
                      {parseFloat(tx.amount) >= 0 ? "+" : ""}
                      {formatCurrency(
                        Math.abs(parseFloat(tx.amount)),
                        currency,
                      )}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Journal Entries */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            Journal Entries ({journalEntries.length})
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {journalEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mb-2" />
                <p className="text-sm text-foreground">All matched!</p>
                <p className="text-xs text-muted-foreground">
                  No unmatched journal entries
                </p>
              </div>
            ) : (
              journalEntries.map((je) => (
                <button
                  key={je.id}
                  type="button"
                  onClick={() => toggleJE(je.id)}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-all",
                    selectedJE.includes(je.id)
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 hover:border-border/80 hover:bg-card/60",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-4 w-4 rounded border-2 flex items-center justify-center",
                          selectedJE.includes(je.id)
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30",
                        )}
                      >
                        {selectedJE.includes(je.id) && (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                          {je.description ??
                            `JE-${String(je.entryNumber).padStart(4, "0")}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {je.date
                            ? new Date(je.date).toLocaleDateString()
                            : "—"}{" "}
                          · JE-{String(je.entryNumber).padStart(4, "0")}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI Matches View ───────────────────────────────────────────────────────

function AiMatchesView({
  matches,
  isLoading,
  onReconcile,
  currency,
}: {
  matches: Array<{
    bankTransactionId: string;
    journalEntryId: string;
    confidence: number;
    reason: string;
  }>;
  isLoading: boolean;
  onReconcile: (bankTxId: string, jeId: string) => void;
  currency: string;
}) {
  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">
          AI is analyzing transactions...
        </p>
        <p className="text-xs text-muted-foreground/50 mt-1">
          Matching amounts, dates, and descriptions
        </p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-foreground">No matches found</p>
        <p className="text-xs text-muted-foreground mt-1">
          Try importing more data or adjusting bank rules
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h4 className="text-xs font-semibold text-foreground">
          AI-Suggested Matches ({matches.length})
        </h4>
      </div>

      {matches.map((match, i) => (
        <div
          key={`${match.bankTransactionId}-${match.journalEntryId}`}
          className="rounded-lg border border-border/50 bg-card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  match.confidence >= 0.9
                    ? "bg-emerald-500/10 text-emerald-500"
                    : match.confidence >= 0.7
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-red-500/10 text-red-500",
                )}
              >
                {Math.round(match.confidence * 100)}% match
              </span>
              <span className="text-[10px] text-muted-foreground">
                {match.reason}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-lg border border-border/30 bg-muted/20 p-2">
              <p className="text-[10px] text-muted-foreground/60 mb-1">
                Bank Transaction
              </p>
              <p className="text-xs font-medium text-foreground">
                TX-{match.bankTransactionId.slice(0, 8)}
              </p>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground/30" />

            <div className="flex-1 rounded-lg border border-border/30 bg-muted/20 p-2">
              <p className="text-[10px] text-muted-foreground/60 mb-1">
                Journal Entry
              </p>
              <p className="text-xs font-medium text-foreground">
                JE-{match.journalEntryId.slice(0, 8)}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onReconcile(match.bankTransactionId, match.journalEntryId)
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Accept
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── History View ──────────────────────────────────────────────────────────

function HistoryView({
  reconciliations,
  currency,
}: {
  reconciliations: Array<{
    id: string;
    statementDate: string;
    statementBalance: string;
    bookBalance: string;
    difference: string;
    status: string;
    closedAt: Date | null;
  }>;
  currency: string;
}) {
  if (reconciliations.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center">
        <RefreshCw className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-foreground">
          No reconciliation history
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Complete your first reconciliation to see history here
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {reconciliations.map((recon) => (
        <div
          key={recon.id}
          className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-4"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                recon.status === "matched"
                  ? "bg-emerald-500/10"
                  : recon.status === "partial"
                    ? "bg-amber-500/10"
                    : "bg-red-500/10",
              )}
            >
              {recon.status === "matched" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Statement: {recon.statementDate}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Status: {recon.status} ·{" "}
                {recon.closedAt
                  ? `Closed ${new Date(recon.closedAt).toLocaleDateString()}`
                  : "Open"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Difference</p>
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                parseFloat(recon.difference) === 0
                  ? "text-emerald-500"
                  : "text-red-500",
              )}
            >
              {formatCurrency(Math.abs(parseFloat(recon.difference)), currency)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
