"use client";

import { useEffect, useState } from "react";
import { Bell, AlertCircle, Clock, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";

// ─── Types ─────────────────────────────────────────────────────────────────

type ApprovalBadgeCounts = {
  pendingApprovals: number;
  overdueInvoices: number;
  pendingExpenseClaims: number;
  unreconciledTransactions: number;
};

// ─── Badge Dot ─────────────────────────────────────────────────────────────

export function ApprovalDot({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count === 0) return null;

  return (
    <span
      className={cn(
        "absolute -right-1 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

// ─── Approval Badge Hook ───────────────────────────────────────────────────

export function useApprovalBadges() {
  const { entityId } = useEntity();
  const [counts, setCounts] = useState<ApprovalBadgeCounts>({
    pendingApprovals: 0,
    overdueInvoices: 0,
    pendingExpenseClaims: 0,
    unreconciledTransactions: 0,
  });

  // Fetch approval counts
  const { data: approvalData } = trpc.approvals.getCounts.useQuery(undefined, {
    enabled: !!entityId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch overdue invoices
  const { data: invoiceData } = trpc.ar.getOverdueCount.useQuery(undefined, {
    enabled: !!entityId,
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch pending expense claims
  const { data: expenseData } = trpc.expenses.getPendingCount.useQuery(
    undefined,
    {
      enabled: !!entityId,
      refetchInterval: 60000,
    },
  );

  useEffect(() => {
    setCounts({
      pendingApprovals: approvalData?.count ?? 0,
      overdueInvoices: invoiceData?.count ?? 0,
      pendingExpenseClaims: expenseData?.count ?? 0,
      unreconciledTransactions: 0, // Will be filled by reconciliation agent
    });
  }, [approvalData, invoiceData, expenseData]);

  const total =
    counts.pendingApprovals +
    counts.overdueInvoices +
    counts.pendingExpenseClaims +
    counts.unreconciledTransactions;

  return {
    counts,
    total,
    hasItems: total > 0,
  };
}

// ─── Approval Badge Component ──────────────────────────────────────────────

export function ApprovalBadge({
  surface,
  className,
}: {
  surface:
    | "activity-hub"
    | "operations"
    | "financial-pulse"
    | "ledger"
    | "command-center";
  className?: string;
}) {
  const { counts, total } = useApprovalBadges();

  // Map surface to relevant counts
  const surfaceCounts: Record<string, number> = {
    "activity-hub": total,
    operations: counts.overdueInvoices + counts.unreconciledTransactions,
    "financial-pulse": counts.pendingExpenseClaims,
    ledger: counts.unreconciledTransactions,
    "command-center": counts.pendingApprovals,
  };

  const count = surfaceCounts[surface] ?? 0;

  if (count === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive px-1 text-[9px] font-bold text-destruct-foreground",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ─── Approval Summary Card ─────────────────────────────────────────────────

export function ApprovalSummaryCard() {
  const { counts, total } = useApprovalBadges();
  const { entityId } = useEntity();

  if (total === 0) return null;

  const items = [
    {
      label: "Pending Approvals",
      count: counts.pendingApprovals,
      icon: FileCheck,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Overdue Invoices",
      count: counts.overdueInvoices,
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      label: "Expense Claims",
      count: counts.pendingExpenseClaims,
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Unreconciled",
      count: counts.unreconciledTransactions,
      icon: Bell,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-destructive/10">
          <Bell className="h-3.5 w-3.5 text-destructive" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          Needs Your Attention
        </h3>
        <span className="inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
          {total}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md",
                  item.bg,
                )}
              >
                <item.icon className={cn("h-3.5 w-3.5", item.color)} />
              </div>
              <span className="text-xs text-foreground">{item.label}</span>
            </div>
            <span className={cn("text-sm font-bold tabular-nums", item.color)}>
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
