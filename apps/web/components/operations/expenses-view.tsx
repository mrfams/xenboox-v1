/**
 * Expenses View — AI-native expense management.
 *
 * Features:
 * - DataTable with sortable columns (matching BillsView pattern)
 * - AI expense insights (duplicate detection, missing receipts)
 * - Summary cards with design tokens
 * - Status badges with icon + design token colors
 * - Filter tabs with counts
 * - Search by vendor or description
 * - Actions: view details, approve/reject, record payment
 */

"use client";

import { useState } from "react";
import {
  ReceiptText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Bot,
  ChevronRight,
  DollarSign,
  Eye,
  Send,
  XCircle,
  UserRound,
  HandCoins,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useModuleAi } from "@/components/module/module-ai-context";
import { CreateExpenseDialog } from "@/components/dashboard/create-expense-dialog";
import { ExpenseDetailPanel } from "@/components/finance/expense-detail-panel";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

// ─── Types ────────────────────────────────────────────────────────────────

type ExpenseStatus = "all" | "pending" | "approved" | "reimbursed";

type Expense = {
  id: string;
  date: string;
  description: string;
  category: string;
  vendor: string;
  amount: number;
  amountFormatted: string;
  paymentMethod: string;
  status: string;
  statusColor: string;
  hasReceipt: boolean;
  dueDate: string | null;
};

// ─── Status Badge ──────────────────────────────────────────────────────────

function ExpenseStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: LucideIcon; className: string }> = {
    paid: {
      icon: CheckCircle2,
      className: "bg-balanced-green/10 text-balanced-green",
    },
    Draft: {
      icon: Clock,
      className: "bg-muted text-muted-foreground",
    },
    "Pending Approval": {
      icon: Clock,
      className: "bg-attention-amber/10 text-attention-amber",
    },
    overdue: {
      icon: AlertCircle,
      className: "bg-error-clay/10 text-error-clay",
    },
    Partial: {
      icon: Clock,
      className: "bg-blue-500/10 text-blue-500",
    },
    voided: {
      icon: XCircle,
      className: "bg-muted text-muted-foreground line-through",
    },
  };

  const { icon: Icon, className } = config[status] ?? {
    icon: Clock,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {status}
    </span>
  );
}

// ─── AI Insights Strip ────────────────────────────────────────────────────

function AiInsightsStrip() {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data: insights } = trpc.expenses.getAiInsights.useQuery(undefined, {
    enabled: !!entityId,
  });

  if (!insights || insights.length === 0) return null;

  const hasWarnings = insights.some((i) => i.type === "warning");

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        hasWarnings
          ? "border-attention-amber/20 bg-attention-amber/[0.03]"
          : "border-balanced-green/20 bg-balanced-green/[0.03]",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md",
            hasWarnings ? "bg-attention-amber/10" : "bg-balanced-green/10",
          )}
        >
          <Bot
            className={cn(
              "h-3.5 w-3.5",
              hasWarnings ? "text-attention-amber" : "text-balanced-green",
            )}
          />
        </div>
        <p className="text-xs font-semibold text-foreground">AI Insights</p>
      </div>

      <div className="space-y-1.5">
        {insights.slice(0, 3).map((insight) => (
          <div
            key={insight.id}
            className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                {insight.title}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {insight.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                openWithFocus(`Help me with: ${insight.actionLabel}`)
              }
              className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {insight.actionLabel}
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Summary Cards ─────────────────────────────────────────────────────────

function SummaryCards({
  totalExpenses,
  pendingCount,
  reimbursedCount,
}: {
  totalExpenses: number;
  pendingCount: number;
  reimbursedCount: number;
}) {
  const { format } = useFormatCurrency();

  const cards = [
    {
      label: "Total Expenses",
      value: format(totalExpenses),
      sub: "This month",
      icon: DollarSign,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Pending Approval",
      value: pendingCount,
      sub: "Awaiting review",
      icon: Clock,
      iconBg: "bg-attention-amber/10",
      iconColor: "text-attention-amber",
    },
    {
      label: "Reimbursed",
      value: reimbursedCount,
      sub: "Paid out",
      icon: CheckCircle2,
      iconBg: "bg-balanced-green/10",
      iconColor: "text-balanced-green",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-border/50 bg-card p-4"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                card.iconBg,
              )}
            >
              <card.icon className={cn("h-4 w-4", card.iconColor)} />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums tracking-tight text-foreground">
                {card.value}
              </p>
              <p className="text-[10px] text-muted-foreground">{card.sub}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Claims Inbox (employee reimbursement HITL) ──────────────────────────
// Claims are submitted by the AI on the employee's behalf. Humans decide:
// approve (money owed to the employee is recognized) or reject, then
// reimburse (money actually moves out — posts to the ledger). Surfaces here
// so nothing needs a decision stays hidden.

function ClaimsInbox() {
  const { entityId, entityCurrency } = useEntity();
  const { format } = useFormatCurrency();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const { data, isLoading, refetch } = trpc.expenses.listClaims.useQuery(
    { status: "all", limit: 100 },
    { enabled: !!entityId },
  );

  const refresh = () => {
    refetch();
  };

  const decide = trpc.expenses.decideClaim.useMutation({
    onSuccess: () => {
      toast.success("Claim decision recorded");
      setRejectingId(null);
      setRejectNote("");
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const reimburse = trpc.expenses.reimburseClaim.useMutation({
    onSuccess: () => toast.success("Claim marked as reimbursed"),
    onError: (err) => toast.error(err.message),
  });

  const actionable =
    data?.claims?.filter((c) =>
      ["submitted", "flagged", "approved"].includes(c.status),
    ) ?? [];
  const busy = decide.isPending || reimburse.isPending || (isLoading && !data);

  if (!isLoading && data && actionable.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-attention-amber/10">
          <UserRound className="h-3.5 w-3.5 text-attention-amber" />
        </div>
        <p className="text-xs font-semibold text-foreground">Employee Claims</p>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
          {actionable.length} need attention
        </span>
        {busy && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
        )}
      </div>

      <div className="divide-y divide-border/50">
        {actionable.map((claim) => (
          <div key={claim.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {claim.claimantName || "—"}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {claim.claimNumber}
                  </span>
                  {claim.department && (
                    <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                      {claim.department}
                    </span>
                  )}
                  {claim.status === "flagged" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-error-clay/10 px-1.5 py-0.5 text-[9px] font-bold text-error-clay">
                      <AlertCircle className="h-2.5 w-2.5" />
                      Flagged
                    </span>
                  )}
                  {claim.status === "approved" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[9px] font-bold text-balanced-green">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Approved
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                  {claim.description || claim.category || "No description"}
                </p>
                {claim.flaggedReason && (
                  <p className="mt-1 text-[10px] font-medium text-error-clay">
                    {claim.flaggedReason}
                  </p>
                )}
                {claim.lines && claim.lines.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {claim.lines.map((l, i) => (
                      <span
                        key={i}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium",
                          l.isFlagged
                            ? "bg-error-clay/10 text-error-clay"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {l.category}
                        <span className="tabular-nums">
                          {format(Number(l.amount), entityCurrency ?? "USD")}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {format(Number(claim.totalAmount), entityCurrency ?? "USD")}
                </p>

                {rejectingId === claim.id ? (
                  <div className="flex flex-col items-end gap-1.5">
                    <input
                      type="text"
                      placeholder="Reason for rejection (optional)"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      className="h-8 w-56 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={decide.isPending}
                        onClick={() =>
                          decide.mutate({
                            claimId: claim.id,
                            decision: "rejected",
                            note: rejectNote || undefined,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-error-clay px-2.5 py-1 text-[10px] font-medium text-white hover:bg-error-clay/90 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="h-3 w-3" />
                        Confirm reject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectNote("");
                        }}
                        className="inline-flex items-center rounded-lg border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    {claim.status === "approved" ? (
                      <button
                        type="button"
                        disabled={reimburse.isPending}
                        onClick={() =>
                          reimburse.mutate({
                            claimId: claim.id,
                            paymentMethod: "bank_transfer",
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        <HandCoins className="h-3 w-3" />
                        Reimburse
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={decide.isPending}
                          onClick={() =>
                            decide.mutate({
                              claimId: claim.id,
                              decision: "approved",
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-balanced-green px-2.5 py-1 text-[10px] font-medium text-white hover:bg-balanced-green/90 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId(claim.id);
                            setRejectNote("");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-error-clay/30 bg-error-clay/5 px-2.5 py-1 text-[10px] font-medium text-error-clay hover:bg-error-clay/10 transition-colors"
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export function ExpensesView() {
  const { entityId, entityCurrency } = useEntity();
  const { openWithFocus } = useModuleAi();
  const { format } = useFormatCurrency();
  const [status, setStatus] = useState<ExpenseStatus>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(
    null,
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const limit = 20;

  const { data, isLoading, isError, error, refetch } =
    trpc.expenses.listExpenses.useQuery(
      {
        status,
        search: search || undefined,
        limit,
        offset: page * limit,
      },
      { enabled: !!entityId },
    );

  const { data: tabCounts } = trpc.expenses.getTabCounts.useQuery(undefined, {
    enabled: !!entityId,
  });

  const expenses = data?.expenses ?? [];
  const totalCount = data?.totalCount ?? 0;

  const pendingCount = tabCounts?.pending ?? 0;
  const reimbursedCount = tabCounts?.reimbursed ?? 0;

  // ── Columns ──────────────────────────────────────────────────────
  const columns: Column<Expense>[] = [
    {
      key: "description",
      label: "Expense",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <ReceiptText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {row.description || "—"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {row.vendor}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.date
            ? new Date(row.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </span>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {row.category}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="text-sm font-semibold tabular-nums">
          {format(row.amount, entityCurrency ?? "USD")}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <ExpenseStatusBadge status={row.status} />,
    },
    {
      key: "hasReceipt",
      label: "Receipt",
      align: "center",
      render: (row) =>
        row.hasReceipt ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-balanced-green" />
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        ),
    },
    {
      key: "id",
      label: "",
      width: "40px",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedExpenseId(row.id)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <SummaryCards
        totalExpenses={data?.expenses?.reduce((s, e) => s + e.amount, 0) ?? 0}
        pendingCount={pendingCount}
        reimbursedCount={reimbursedCount}
      />

      {/* Employee Claims awaiting human decision */}
      <ClaimsInbox />

      {/* AI Insights */}
      <AiInsightsStrip />

      {/* Filters + Create */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <ReceiptText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by vendor or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="flex h-9 w-full rounded-lg border border-border bg-background px-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
          {(
            [
              { key: "all", label: "All" },
              { key: "pending", label: "Pending", count: pendingCount },
              { key: "approved", label: "Approved" },
              {
                key: "reimbursed",
                label: "Reimbursed",
                count: reimbursedCount,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatus(tab.key);
                setPage(0);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                status === tab.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {"count" in tab && tab.count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1 py-0 text-[9px] font-bold tabular-nums",
                    status === tab.key
                      ? "bg-foreground/10 text-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              openWithFocus("Help me categorize and review my expenses")
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Record Expense</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="rounded-xl border border-error-clay/20 bg-error-clay/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-error-clay mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Failed to load expenses
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(error as Error | undefined)?.message ??
                  "An error occurred while loading expenses. Please try again."}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Retry
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expenses DataTable */}
      <div className="rounded-xl border border-border/50 bg-card">
        <DataTable
          columns={columns}
          data={expenses}
          isLoading={isLoading}
          emptyState={
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mb-3">
                <ReceiptText className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No expenses found
              </p>
              <p className="mt-1 max-w-sm text-center text-xs text-muted-foreground">
                {search || status !== "all"
                  ? "Try adjusting your filters or search query."
                  : "No expenses have been recorded yet. Track business expenses here."}
              </p>
              {!search && status === "all" && (
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Record first expense
                </button>
              )}
            </div>
          }
          onRowClick={(row) => setSelectedExpenseId(row.id)}
        />
      </div>

      {/* Pagination */}
      {totalCount > limit && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {page * limit + 1}–
            {Math.min((page + 1) * limit, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * limit >= totalCount}
              className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <CreateExpenseDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      {/* Expense Detail Panel */}
      {selectedExpenseId && (
        <ExpenseDetailPanel
          expenseId={selectedExpenseId}
          onClose={() => setSelectedExpenseId(null)}
        />
      )}
    </div>
  );
}
