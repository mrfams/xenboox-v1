"use client";

import { useState } from "react";
import {
  Landmark,
  RefreshCw,
  Link2,
  Search,
  Download,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  Plus,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { TransactionRow } from "@/components/banking/transaction-row";
import { BankConnectionCard } from "@/components/banking/bank-connection-card";
import { BankConnectionDialog } from "@/components/banking/bank-connection-dialog";
import { BankRulesManager } from "@/components/banking/bank-rules-manager";
import { StatementUploadZone } from "@/components/banking/statement-upload-zone";
import { useUndo } from "@/lib/hooks/use-undo";

// ─── Banking View ──────────────────────────────────────────────────────────
//
// Rendered as the "Banking" tab of the Operations surface.
// The /dashboard/operations/banking route wraps this in ModulePageShell.
// AI categorizes transactions. You review and approve.

type Tab = "transactions" | "connections" | "rules";

export function BankingView() {
  const { entityId } = useEntity();
  const [activeTab, setActiveTab] = useState<Tab>("transactions");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "reconciled" | "unreconciled"
  >("all");
  const [accountFilter, setAccountFilter] = useState<string | undefined>(
    undefined,
  );
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const tabs: { id: Tab; label: string; icon: typeof Landmark }[] = [
    { id: "transactions", label: "Transactions", icon: ArrowUpRight },
    { id: "connections", label: "Connections", icon: Link2 },
    { id: "rules", label: "Rules", icon: Zap },
  ];

  return (
    <>
      <div className="space-y-4">
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
            onConnect={() => setShowConnectionDialog(true)}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
          />
        )}
        {activeTab === "connections" && (
          <ConnectionsTab
            entityId={entityId}
            onConnect={() => setShowConnectionDialog(true)}
          />
        )}
        {activeTab === "rules" && <RulesTab entityId={entityId} />}
      </div>

      {/* Bank Connection Dialog */}
      <BankConnectionDialog
        open={showConnectionDialog}
        onClose={() => setShowConnectionDialog(false)}
      />
    </>
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
  onConnect,
  selectedIds,
  setSelectedIds,
}: {
  entityId: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: "all" | "reconciled" | "unreconciled";
  setStatusFilter: (s: "all" | "reconciled" | "unreconciled") => void;
  accountFilter: string | undefined;
  setAccountFilter: (a: string | undefined) => void;
  onConnect: () => void;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
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

  // Batch operations — Undo now calls a REAL revert mutation that restores
  // the prior category/GL account/confidence captured at categorize time.
  const revertCategorization = trpc.banking.revertCategorization.useMutation();
  const undoBatch = useUndo<{
    restorations: Array<{
      id: string;
      category: string | null;
      glAccountId: string | null;
      categorizedBy: string | null;
      confidence: string | null;
    }>;
  }>({
    message: "Categorized transactions",
    onUndo: async ({ restorations }) => {
      await revertCategorization.mutateAsync({ restorations });
      toast.success(
        `Categorization reverted for ${restorations.length} transactions`,
      );
      refetch();
    },
  });
  const batchCategorize = trpc.banking.batchCategorize.useMutation({
    onSuccess: (data, vars) => {
      const ids =
        (vars as { transactionIds: string[] })?.transactionIds ??
        Array.from(selectedIds);
      undoBatch.pushUndo({
        restorations:
          (
            data as {
              previousState?: Array<{
                id: string;
                category: string | null;
                glAccountId: string | null;
                categorizedBy: string | null;
                confidence: string | null;
              }>;
            }
          ).previousState ?? [],
      });
      setSelectedIds(new Set());
      refetch();
    },
  });

  const allSelected =
    transactions.length > 0 &&
    transactions.every((tx) => selectedIds.has(tx.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((tx) => tx.id)));
    }
  };

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
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-attention-amber/5 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-attention-amber" />
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
          <button
            onClick={() => {
              const rows = transactions.map((t) => ({
                date: t.date ?? t.transactionDate,
                description: t.description,
                amount: t.amount,
                status: t.status,
              }));
              const headers = Object.keys(
                rows[0] ?? {
                  date: "",
                  description: "",
                  amount: "",
                  status: "",
                },
              );
              // Sanitize CSV cells to prevent CSV injection
              const sanitizeCell = (val: unknown): string => {
                const str = String(val ?? "");
                const escaped = str.replace(/"/g, '""');
                // Prefix formula-triggering characters to prevent CSV injection
                if (/^[=+\-@\t\r]/.test(str)) {
                  return "'" + escaped;
                }
                return '"' + escaped + '"';
              };
              const csv = [
                headers.join(","),
                ...rows.map((r) =>
                  Object.values(r).map(sanitizeCell).join(","),
                ),
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `banking-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success(`Exported ${rows.length} transactions`);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
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
          aria-label="Filter by reconciliation status"
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
          aria-label="Filter by account"
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

      {/* Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
          <span className="text-xs font-medium text-primary">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => {
              const uncategorized = transactions
                .filter(
                  (tx) =>
                    selectedIds.has(tx.id) &&
                    (!tx.category || tx.category === "Uncategorized"),
                )
                .map((tx) => tx.id);
              batchCategorize.mutate({ transactionIds: uncategorized });
            }}
            disabled={batchCategorize.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {batchCategorize.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Categorize Selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear Selection
          </button>
        </div>
      )}

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
            <button
              onClick={onConnect}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
            >
              <Link2 className="h-3.5 w-3.5" />
              Connect Bank Account
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          {/* Select All Header */}
          <div className="flex items-center gap-3 border-b border-border/30 bg-muted/20 px-4 py-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              aria-label="Select all transactions"
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
            />
            <span className="text-xs font-medium text-muted-foreground">
              Select all
            </span>
          </div>
          <div className="divide-y divide-border/30">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                onUpdate={refetch}
                selected={selectedIds.has(tx.id)}
                onSelect={() => {
                  const next = new Set(selectedIds);
                  if (next.has(tx.id)) {
                    next.delete(tx.id);
                  } else {
                    next.add(tx.id);
                  }
                  setSelectedIds(next);
                }}
              />
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

function ConnectionsTab({
  entityId,
  onConnect,
}: {
  entityId: string;
  onConnect: () => void;
}) {
  const { data: connections, isLoading } =
    trpc.banking.listConnections.useQuery(undefined, { enabled: !!entityId });
  const utils = trpc.useUtils();

  return (
    <div className="space-y-4">
      {/* Statement Upload Zone */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          Import Statement
        </p>
        <StatementUploadZone
          onUploadComplete={() => {
            utils.banking.listTransactions.invalidate();
            utils.banking.getOverview.invalidate();
          }}
        />
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/30" />
        </div>
        <div className="relative flex justify-center text-[10px]">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {/* Connected Accounts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Connected Accounts
          </p>
          <button
            onClick={onConnect}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
          >
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
            <button
              onClick={onConnect}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
            >
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
    </div>
  );
}

// ─── Rules Tab ─────────────────────────────────────────────────────────────

function RulesTab({ entityId }: { entityId: string }) {
  return <BankRulesManager entityId={entityId} />;
}
