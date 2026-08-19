"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  Landmark,
  Building2,
  RefreshCw,
  Search,
  Bot,
  Filter,
  ChevronDown,
  User,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { ConfidenceBadge } from "@/components/shared/ai-native";
import { ActorBadge } from "@/components/shared/ai-native";

// ─── Ledger ───────────────────────────────────────────────────────────────
//
// The accounting records. For when you need to look at specific entries,
// verify the books, or trace a transaction. Not for daily use — for
// investigation and verification.
//
// Replaces: journal, chart-of-accounts, trial-balance, fixed-assets, transactions

type LedgerTab =
  | "journal"
  | "coa"
  | "trial-balance"
  | "fixed-assets"
  | "reconciliation";

const TABS: { key: LedgerTab; label: string; icon: typeof BookOpen }[] = [
  { key: "journal", label: "Journal", icon: FileText },
  { key: "coa", label: "Chart of Accounts", icon: Landmark },
  { key: "trial-balance", label: "Trial Balance", icon: BookOpen },
  { key: "fixed-assets", label: "Fixed Assets", icon: Building2 },
  { key: "reconciliation", label: "Reconciliation", icon: RefreshCw },
];

// ─── Journal View ──────────────────────────────────────────────────────────

function JournalView() {
  const { entityId } = useEntity();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const { data: journalEntries, isLoading } =
    trpc.journal.getRecentActivity.useQuery(
      { limit: 20 },
      { enabled: !!entityId },
    );

  const filters = ["All", "Today", "This Week", "Unposted", "AI-Posted", "Manual"];

  return (
    <div className="space-y-4">
      {/* AI-enhanced search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" aria-hidden="true" />
        <label htmlFor="journal-search" className="sr-only">Search journal entries</label>
        <input
          id="journal-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Search entries — try "Trust Bank invoice" or "rent expense"...'
          className="w-full rounded-xl border border-border/50 bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[9px] font-bold text-muted-foreground/50" aria-hidden="true">
            <Bot className="h-2.5 w-2.5" />
            AI
          </span>
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter.toLowerCase())}
            className={cn(
              "inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
              activeFilter === filter.toLowerCase()
                ? "border-primary/25 bg-primary/10 text-primary"
                : "border-border/40 bg-background/50 text-muted-foreground/70 hover:border-primary/25 hover:text-primary/80",
            )}
          >
            {filter}
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
      ) : !journalEntries || journalEntries.length === 0 ? (              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">
            No journal entries yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Entries will appear here as agents post them
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {journalEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {entry.description ??
                        `Journal Entry ${entry.entryNumber}`}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                        entry.status === "posted"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : entry.status === "draft"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.entryNumber} ·{" "}
                    {entry.createdAt
                      ? new Date(entry.createdAt).toLocaleDateString("en-US")
                      : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(Number(entry.totalDebit ?? 0))}
                  </p>
                </div>
              </div>

              {/* Actor + confidence row */}
              <div className="mt-2 flex items-center gap-3">
                <ActorBadge actor={entry.postedBy === "ai" ? "ai" : "human"} />
                {entry.confidence && (
                  <ConfidenceBadge score={entry.confidence} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COA View ──────────────────────────────────────────────────────────────

function COAView() {
  const { entityId } = useEntity();

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
          <Landmark className="h-12 w-12 text-muted-foreground/30 mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">
            No accounts configured
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Your chart of accounts will appear here
          </p>
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
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-border/50 hover:bg-card/60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground/60 w-12">
                        {account.code}
                      </span>
                      <span className="text-sm text-foreground">
                        {account.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground tabular-nums">
                      {formatCurrency(Number(account.balance ?? 0))}
                    </span>
                  </div>
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
  const { entityId } = useEntity();

  const { data: accounts, isLoading } = trpc.coa.listHierarchy.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  const totalDebit =
    accounts?.reduce((sum, a) => {
      const balance = Number(a.balance ?? 0);
      return sum + (balance > 0 ? balance : 0);
    }, 0) ?? 0;

  const totalCredit =
    accounts?.reduce((sum, a) => {
      const balance = Number(a.balance ?? 0);
      return sum + (balance < 0 ? Math.abs(balance) : 0);
    }, 0) ?? 0;

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="space-y-4">
      {/* Balance check */}
      <div
        className={cn(
          "rounded-xl border p-4",
          isBalanced
            ? "border-emerald-500/20 bg-emerald-500/[0.03]"
            : "border-red-500/20 bg-red-500/[0.03]",
        )}
      >
        <div className="flex items-center gap-3">
          {isBalanced ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {isBalanced ? "Trial Balance is balanced" : "Trial Balance is out of balance"}
            </p>
            <p className="text-xs text-muted-foreground">
              Total Debits: {formatCurrency(totalDebit)} · Total Credits:{" "}
              {formatCurrency(totalCredit)}
            </p>
          </div>
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
      ) : !accounts || accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">No data yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-xs" aria-label="Trial Balance">
            <caption className="sr-only">Trial balance showing debits and credits for all accounts</caption>
            <thead>
              <tr className="border-b bg-muted/50">
                <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Code
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Account
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">
                  Debit
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">
                  Credit
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const balance = Number(account.balance ?? 0);
                return (
                  <tr
                    key={account.id}
                    className="border-b last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-3 py-1.5 font-mono text-muted-foreground/60">
                      {account.code}
                    </td>
                    <td className="px-3 py-1.5 text-foreground">
                      {account.name}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {balance > 0 ? formatCurrency(balance) : ""}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {balance < 0 ? formatCurrency(Math.abs(balance)) : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-semibold">
                <td colSpan={2} className="px-3 py-2 text-foreground">
                  Total
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {formatCurrency(totalDebit)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {formatCurrency(totalCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Fixed Assets View ─────────────────────────────────────────────────────

function FixedAssetsView() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
      <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">Fixed Assets</p>
      <p className="text-xs text-muted-foreground mt-1">
        Asset register, depreciation schedules, and disposal tracking coming soon
      </p>
      <button
        type="button"
        aria-label="Ask AI about fixed assets"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <Bot className="h-3.5 w-3.5" aria-hidden="true" />
        Ask AI about fixed assets
      </button>
    </div>
  );
}

// ─── Reconciliation View ───────────────────────────────────────────────────

function ReconciliationView() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
      <RefreshCw className="h-12 w-12 text-muted-foreground/30 mb-3" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">Reconciliation</p>
      <p className="text-xs text-muted-foreground mt-1">
        Bank statement matching and reconciliation — AI-powered, drag-to-match
      </p>
      <button
        type="button"
        aria-label="Ask AI to reconcile"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <Bot className="h-3.5 w-3.5" aria-hidden="true" />
        Ask AI to reconcile
      </button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function LedgerPage() {
  const [activeTab, setActiveTab] = useState<LedgerTab>("journal");

  const tabContent = {
    journal: <JournalView />,
    coa: <COAView />,
    "trial-balance": <TrialBalanceView />,
    "fixed-assets": <FixedAssetsView />,
    reconciliation: <ReconciliationView />,
  };

  return (
    <ModulePageShell
      title="Ledger"
      description="The accounting records. AI-enhanced search and context."
      icon={BookOpen}
      tabs={TABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
      }))}
      activeTab={activeTab}
      onTabChange={(key) => setActiveTab(key as LedgerTab)}
      aiSuggestions={[
        "Search for Trust Bank entries",
        "Show me unposted entries",
        "Explain this journal entry",
      ]}
    >
      <div className="p-3 pb-20 sm:p-6 md:pb-6">
        {tabContent[activeTab]}
      </div>
    </ModulePageShell>
  );
}
