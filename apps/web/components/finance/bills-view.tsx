/**
 * Bills View — AI-native accounts payable management.
 *
 * Features:
 * - DataTable with sortable columns (matching InvoicesView pattern)
 * - AI payment priority recommendations (which bills to pay first)
 * - Summary cards with design tokens
 * - Status badges with icon + design token colors
 * - Filter tabs with counts
 * - Search by vendor or invoice number
 * - Actions: view details, record payment
 */

"use client";

import { useState } from "react";
import {
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  Plus,
  Bot,
  ChevronRight,
  DollarSign,
  type LucideIcon,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useModuleAi } from "@/components/module/module-ai-context";
import { CreateBillDialog } from "@/components/dashboard/create-bill-dialog";
import { BillDetailPanel } from "@/components/finance/bill-detail-panel";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

// ─── Types ────────────────────────────────────────────────────────────────

type BillStatus = "all" | "pending" | "overdue" | "paid";

type Bill = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  balance: number;
  status: string;
  supplierName: string | null;
  supplierId: string | null;
};

// ─── Status Badge ──────────────────────────────────────────────────────────
// Matches InvoicesView pattern: icon + label + design token colors.

function BillStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: LucideIcon; className: string }> = {
    paid: {
      icon: CheckCircle2,
      className: "bg-balanced-green/10 text-balanced-green",
    },
    overdue: {
      icon: AlertCircle,
      className: "bg-error-clay/10 text-error-clay",
    },
    pending: {
      icon: Clock,
      className: "bg-attention-amber/10 text-attention-amber",
    },
    partial: {
      icon: Clock,
      className: "bg-attention-amber/10 text-attention-amber",
    },
    approved: {
      icon: Send,
      className: "bg-primary/10 text-primary",
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
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── AI Payment Priority Strip ────────────────────────────────────────────
// Shows AI-recommended payment order based on urgency and amount.

function AiPaymentPriority({
  bills,
  format,
  entityCurrency,
}: {
  bills: Bill[];
  format: (n: number, c?: string) => string;
  entityCurrency?: string;
}) {
  const { openWithFocus } = useModuleAi();

  // Compute priority: overdue first, then by days-to-due ascending
  const unpaid = bills
    .filter((b) => b.status !== "paid" && b.balance > 0)
    .map((b) => {
      const daysUntilDue = b.dueDate
        ? Math.ceil(
            (new Date(b.dueDate).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          )
        : 999;
      return { ...b, daysUntilDue };
    })
    .sort((a, b) => {
      // Overdue first (negative days = more urgent)
      if (a.daysUntilDue < 0 && b.daysUntilDue >= 0) return -1;
      if (a.daysUntilDue >= 0 && b.daysUntilDue < 0) return 1;
      // Then by days-to-due ascending
      return a.daysUntilDue - b.daysUntilDue;
    })
    .slice(0, 3);

  if (unpaid.length === 0) return null;

  const totalDue = unpaid.reduce((s, b) => s + b.balance, 0);

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
        <p className="text-xs font-semibold text-foreground">
          AI Payment Priority
        </p>
        <span className="text-[10px] text-muted-foreground">
          Recommended payment order
        </span>
      </div>

      <div className="space-y-2">
        {unpaid.map((bill, i) => (
          <div
            key={bill.id}
            className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {bill.supplierName ?? bill.invoiceNumber}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {bill.daysUntilDue < 0
                    ? `${Math.abs(bill.daysUntilDue)}d overdue`
                    : bill.daysUntilDue === 0
                      ? "Due today"
                      : `Due in ${bill.daysUntilDue}d`}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold tabular-nums text-foreground">
                {format(bill.balance, entityCurrency ?? "USD")}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          Total recommended: {format(totalDue, entityCurrency ?? "USD")}
        </p>
        <button
          type="button"
          onClick={() =>
            openWithFocus("Help me schedule payments for these bills")
          }
          className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Ask AI to schedule
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Summary Cards ─────────────────────────────────────────────────────────
// Design-token based cards with clear hierarchy.

function SummaryCards({
  totalOutstanding,
  overdueCount,
  pendingCount,
  format,
  entityCurrency,
}: {
  totalOutstanding: number;
  overdueCount: number;
  pendingCount: number;
  format: (n: number, c?: string) => string;
  entityCurrency?: string;
}) {
  const cards = [
    {
      label: "Outstanding",
      value: format(totalOutstanding, entityCurrency ?? "USD"),
      sub: "Total owed",
      icon: DollarSign,
      iconBg: "bg-attention-amber/10",
      iconColor: "text-attention-amber",
    },
    {
      label: "Overdue",
      value: overdueCount,
      sub: "Past due date",
      icon: AlertCircle,
      iconBg: "bg-error-clay/10",
      iconColor: "text-error-clay",
    },
    {
      label: "Pending",
      value: pendingCount,
      sub: "Awaiting payment",
      icon: Clock,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
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

// ─── Component ────────────────────────────────────────────────────────────

export function BillsView() {
  const { format } = useFormatCurrency();
  const { entityId, entityCurrency } = useEntity();
  const { openWithFocus } = useModuleAi();
  const [status, setStatus] = useState<BillStatus>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const limit = 20;

  const { data, isLoading, isError, error, refetch } =
    trpc.bills.listBills.useQuery(
      {
        status,
        search: search || undefined,
        limit,
        offset: page * limit,
      },
      { enabled: !!entityId },
    );

  const { data: overview, isError: overviewError } =
    trpc.bills.getOverview.useQuery(undefined, {
      enabled: !!entityId,
    });

  const bills = data?.bills ?? [];
  const totalCount = data?.totalCount ?? 0;

  const totalOutstanding = overview?.summary.totalOutstanding ?? 0;
  const overdueCount = overview?.summary.overdueCount ?? 0;
  const pendingCount = overview?.statusCounts?.approved ?? 0;

  // ── Columns (DataTable pattern, matching InvoicesView) ──────────────
  const columns: Column<Bill>[] = [
    {
      key: "invoiceNumber",
      label: "Bill",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {row.invoiceNumber || "—"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {row.supplierName ?? "Unknown vendor"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "invoiceDate",
      label: "Date",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.invoiceDate
            ? new Date(row.invoiceDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </span>
      ),
    },
    {
      key: "dueDate",
      label: "Due Date",
      sortable: true,
      render: (row) => {
        const isOverdue =
          row.status !== "paid" &&
          row.dueDate &&
          new Date(row.dueDate) < new Date();
        const daysUntilDue = row.dueDate
          ? Math.ceil(
              (new Date(row.dueDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            )
          : null;

        return (
          <div className="text-right">
            <span
              className={cn(
                "text-xs",
                isOverdue
                  ? "text-error-clay font-medium"
                  : "text-muted-foreground",
              )}
            >
              {row.dueDate
                ? new Date(row.dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </span>
            {daysUntilDue !== null && row.status !== "paid" && (
              <p
                className={cn(
                  "text-[10px] mt-0.5",
                  daysUntilDue < 0
                    ? "text-error-clay"
                    : daysUntilDue <= 7
                      ? "text-attention-amber"
                      : "text-muted-foreground",
                )}
              >
                {daysUntilDue < 0
                  ? `${Math.abs(daysUntilDue)}d overdue`
                  : daysUntilDue === 0
                    ? "Due today"
                    : `${daysUntilDue}d left`}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "totalAmount",
      label: "Amount",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="text-sm font-semibold tabular-nums">
          {format(row.totalAmount, entityCurrency ?? "USD")}
        </span>
      ),
    },
    {
      key: "balance",
      label: "Balance",
      sortable: true,
      align: "right",
      render: (row) => (
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            row.balance > 0 ? "text-attention-amber" : "text-balanced-green",
          )}
        >
          {format(row.balance, entityCurrency ?? "USD")}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <BillStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      label: "",
      width: "40px",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedBillId(row.id)}
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
        totalOutstanding={totalOutstanding}
        overdueCount={overdueCount}
        pendingCount={pendingCount}
        format={format}
        entityCurrency={entityCurrency}
      />

      {/* AI Payment Priority */}
      <AiPaymentPriority
        bills={bills}
        format={format}
        entityCurrency={entityCurrency}
      />

      {/* Filters + Create */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by vendor or invoice..."
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
              { key: "overdue", label: "Overdue", count: overdueCount },
              { key: "paid", label: "Paid" },
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
            onClick={() => openWithFocus("Create a new bill for me")}
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
            <span className="hidden sm:inline">Create</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {(isError || overviewError) && (
        <div className="rounded-xl border border-error-clay/20 bg-error-clay/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-error-clay mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Failed to load bills
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(error as Error | undefined)?.message ??
                  "An error occurred while loading bills. Please try again."}
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

      {/* Bills DataTable */}
      <div className="rounded-xl border border-border/50 bg-card">
        <DataTable
          columns={columns}
          data={bills}
          isLoading={isLoading}
          emptyState={
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mb-3">
                <CreditCard className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No bills found
              </p>
              <p className="mt-1 max-w-sm text-center text-xs text-muted-foreground">
                {search || status !== "all"
                  ? "Try adjusting your filters or search query. Bills are entity-scoped."
                  : "No bills have been recorded yet. AI will track and prioritize payments once bills are added."}
              </p>
              {!search && status === "all" && (
                <button
                  type="button"
                  onClick={() => openWithFocus("Create a new bill for me")}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create first bill
                </button>
              )}
            </div>
          }
          onRowClick={(row) => setSelectedBillId(row.id)}
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
      <CreateBillDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      {/* Bill Detail Panel */}
      {selectedBillId && (
        <BillDetailPanel
          billId={selectedBillId}
          onClose={() => setSelectedBillId(null)}
        />
      )}
    </div>
  );
}
