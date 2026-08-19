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
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";

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

  const { data: journalEntries, isLoading } =
    trpc.journal.getRecentActivity.useQuery(
      { limit: 20 },
      { enabled: !!entityId },
    );

  return (
    <div className="space-y-4">
      {/* AI-enhanced search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Search entries — try "Trust Bank invoice" or "rent expense"...'
          className="w-full rounded-xl border border-border/50 bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
        />
      </div>

      {/* Quick filters */}
      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {["Today", "This Week", "Unposted", "AI-Posted", "Manual"].map(
          (filter) => (
            <button
              key={filter}
              type="button"
              className="inline-flex items-center rounded-lg border border-border/40 bg-background/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground/70 transition-colors hover:border-primary/25 hover:text-primary/80 whitespace-nowrap"
            >
              {filter}
            </button>
          ),
        )}
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
      ) : !journalEntries || journalEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
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
              {/* AI agent badge */}
              {entry.postedBy === "ai" && (
                <div className="mt-2 flex items-center gap-1.5">
                  <Bot className="h-3 w-3 text-primary/60" />
                  <span className="text-[10px] text-muted-foreground/60">
                    Posted by AI Agent
                  </span>
                </div>
              )}
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
          <Landmark className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">
            No accounts configured
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Your chart of accounts will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-border/50 hover:bg-card/60"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground/60 w-12">
                  {account.code}
                </span>
                <span className="text-sm text-foreground">{account.name}</span>
              </div>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {formatCurrency(Number(account.balance ?? 0))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Placeholder Views ─────────────────────────────────────────────────────

function TrialBalanceView() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
      <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <p className="text-sm font-medium text-foreground">Trial Balance</p>
      <p className="text-xs text-muted-foreground mt-1">
        Coming soon — AI-verified debit/credit verification
      </p>
    </div>
  );
}

function FixedAssetsView() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
      <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <p className="text-sm font-medium text-foreground">Fixed Assets</p>
      <p className="text-xs text-muted-foreground mt-1">
        Coming soon — Asset register, depreciation, disposal
      </p>
    </div>
  );
}

function ReconciliationView() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
      <RefreshCw className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <p className="text-sm font-medium text-foreground">Reconciliation</p>
      <p className="text-xs text-muted-foreground mt-1">
        Coming soon — Bank statement matching and reconciliation
      </p>
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
    >
      <div className="space-y-4 p-4 sm:p-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border/50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 -mb-px px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {tabContent[activeTab]}
      </div>
    </ModulePageShell>
  );
}
