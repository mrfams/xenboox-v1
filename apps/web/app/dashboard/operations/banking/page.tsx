"use client";

import { useState } from "react";
import {
  Landmark,
  RefreshCw,
  Link2,
  Unlink,
  Search,
  Filter,
  Download,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Loader2,
  Plus,
  Settings,
  Zap,
} from "lucide-react";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { TransactionRow } from "@/components/banking/transaction-row";
import { BankConnectionCard } from "@/components/banking/bank-connection-card";
import { BankRulesManager } from "@/components/banking/bank-rules-manager";

// ─── Banking Page ──────────────────────────────────────────────────────────
// AI-native banking: agents categorize, humans review.

type Tab = "transactions" | "connections" | "rules";

export default function BankingPage() {
  const { entityId } = useEntity();
  const [activeTab, setActiveTab] = useState<Tab>("transactions");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "reconciled" | "unreconciled"
  >("all");
  const [accountFilter, setAccountFilter] = useState<string | undefined>(
    undefined,
  );

  const tabs: { id: Tab; label: string; icon: typeof Landmark }[] = [
    { id: "transactions", label: "Transactions", icon: ArrowUpRight },
    { id: "connections", label: "Connections", icon: Link2 },
    { id: "rules", label: "Rules", icon: Zap },
  ];

  return (
    <ModulePageShell
      title="Banking"
      description="AI categorizes transactions. You review and approve."
      icon={Landmark}
      aiSuggestions={[
        {
          label: "Categorize uncategorized",
          prompt: "Categorize all uncategorized bank transactions",
        },
        {
          label: "Show anomalies",
          prompt: "Show unusual bank transactions from this month",
        },
        { label: "Reconcile", prompt: "Help me reconcile my bank accounts" },
      ]}
    >
      <div className="space-y-4 p-3 pb-20 sm:p-6 md:pb-6">
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-card p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "transactions" && (
          <TransactionsTab
            entityId={entityId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            accountFilter={accountFilter}
            setAccountFilter={setAccountFilter}
          />
        )}
        {activeTab === "connections" && <ConnectionsTab entityId={entityId} />}
        {activeTab === "rules" && <RulesTab entityId={entityId} />}
      </div>
    </ModulePageShell>
  );
}

// ─── Transactions Tab ──────────────────────────────────────────────────────

function TransactionsTab({
  entityId,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  accountFilter,
  setAccountFilter,
}: {
  entityId: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: "all" | "reconciled" | "unreconciled";
  setStatusFilter: (s: "all" | "reconciled" | "unreconciled") => void;
  accountFilter: string | undefined;
  setAccountFilter: (a: string | undefined) => void;
}) {
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, refetch } = trpc.banking.listTransactions.useQuery(
    {
      status: statusFilter,
      search: searchQuery || undefined,
      accountId: accountFilter,
      limit,
      offset: page * limit,
    },
    { enabled: !!entityId },
  );

  const { data: accounts } = trpc.banking.getOverview.useQuery(undefined, {
    enabled: !!entityId,
  });

  const { data: connections } = trpc.banking.listConnections.useQuery(
    undefined,
    {
      enabled: !!entityId,
    },
  );

  const transactions = data?.transactions ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const hasConnections = (connections?.length ?? 0) > 0;

  // Count uncategorized
  const uncategorizedCount = transactions.filter(
    (tx) => !tx.category || tx.category === "Uncategorized",
  ).length;

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-2">
          <Landmark className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">
            {totalCount} transactions
          </span>
        </div>
        {uncategorizedCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-600">
              {uncategorizedCount} uncategorized
            </span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-lg border border-border/50 bg-card pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter);
            setPage(0);
          }}
          className="rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          <option value="all">All</option>
          <option value="unreconciled">Unreconciled</option>
          <option value="reconciled">Reconciled</option>
        </select>

        {/* Account Filter */}
        <select
          value={accountFilter ?? ""}
          onChange={(e) => {
            setAccountFilter(e.target.value || undefined);
            setPage(0);
          }}
          className="rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          <option value="">All accounts</option>
          {accounts?.accounts?.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Transaction List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg bg-muted/30"
            />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 py-12 text-center">
          <Landmark className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            {searchQuery
              ? "No transactions match your search"
              : "No transactions yet"}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {hasConnections
              ? "Sync your bank account to import transactions"
              : "Connect a bank account to get started"}
          </p>
          {!hasConnections && (
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/15 transition-colors">
              <Link2 className="h-3.5 w-3.5" />
              Connect Bank Account
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="divide-y divide-border/30">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} onUpdate={refetch} />
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Connections Tab ───────────────────────────────────────────────────────

function ConnectionsTab({ entityId }: { entityId: string }) {
  const { data: connections, isLoading } =
    trpc.banking.listConnections.useQuery(undefined, { enabled: !!entityId });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {connections?.length ?? 0} connected accounts
        </p>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 transition-colors">
          <Plus className="h-3.5 w-3.5" />
          Connect Account
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-muted/30"
            />
          ))}
        </div>
      ) : connections?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 py-12 text-center">
          <Link2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            No bank connections
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Connect your bank to automatically import and categorize
            transactions
          </p>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/15 transition-colors">
            <Sparkles className="h-3.5 w-3.5" />
            Connect with AI
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {connections?.map((conn) => (
            <BankConnectionCard key={conn.id} connection={conn} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Rules Tab ─────────────────────────────────────────────────────────────

function RulesTab({ entityId }: { entityId: string }) {
  return <BankRulesManager entityId={entityId} />;
}
