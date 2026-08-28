"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  FileText,
  CreditCard,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { MetricNarrative } from "@/components/ai-native-v2/metric-narrative";

// ─── Money Flows (/operations/new) ────────────────────────────────────────
//
// Cash first. One hero question — how long does the money last? — then two
// live streams showing every movement and what your agents did about it.

export default function MoneyFlowsPage() {
  const { entityId } = useEntity();
  const router = useRouter();

  useSurfaceSync({ entityId, surfaces: ["operations"] });

  const { data: dash, isLoading: dashLoading } =
    trpc.dashboard.getDashboardData.useQuery({}, { enabled: !!entityId });
  const { data: cashPos } = trpc.banking.getCashPosition.useQuery(
    {},
    { enabled: !!entityId },
  );
  const { data: txData, isLoading: txLoading } =
    trpc.banking.listTransactions.useQuery(
      { status: "all", limit: 24 },
      { enabled: !!entityId },
    );
  const { data: billsOverview } = trpc.bills.getOverview.useQuery(undefined, {
    enabled: !!entityId,
  });
  const { data: invoiceStats } = trpc.invoices.getStats.useQuery(undefined, {
    enabled: !!entityId,
  });

  const health = dash?.businessHealth;
  const { inflows, outflows } = useMemo(() => {
    const all = txData?.transactions ?? [];
    return {
      inflows: all.filter((t) => t.amount > 0).slice(0, 8),
      outflows: all.filter((t) => t.amount <= 0).slice(0, 8),
    };
  }, [txData]);

  const overdueBills = billsOverview?.statusCounts.overdue ?? 0;
  const netChange = cashPos?.netChange ?? 0;

  const pendingInvoices = invoiceStats?.pendingCount ?? 0;
  const pendingBills = billsOverview?.statusCounts.pending ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-20 sm:p-6 md:pb-6">
      {/* ── Status strip — at-a-glance counts ────────────────────────── */}
      {(pendingInvoices > 0 || pendingBills > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 font-mono text-[11px] tabular-nums text-muted-foreground">
          {pendingInvoices > 0 && (
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3 text-primary" aria-hidden="true" />
              {pendingInvoices} invoice{pendingInvoices !== 1 ? "s" : ""}{" "}
              pending
            </span>
          )}
          {pendingBills > 0 && (
            <span className="inline-flex items-center gap-1">
              <CreditCard
                className="h-3 w-3 text-attention-amber"
                aria-hidden="true"
              />
              {pendingBills} bill{pendingBills !== 1 ? "s" : ""} pending
            </span>
          )}
        </div>
      )}

      {/* ── Runway hero ───────────────────────────────────────────────── */}
      <section
        aria-labelledby="runway-heading"
        className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6"
      >
        <h1 id="runway-heading" className="sr-only">
          Cash position
        </h1>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <MetricNarrative
            label="Cash on hand"
            value={formatCurrency(health?.cashBalance ?? 0)}
            loading={dashLoading && !health}
            size="lg"
            className="col-span-2 sm:col-span-1"
          />
          <MetricNarrative
            label="Runway"
            value={
              health?.runwayMonths != null
                ? `${health.runwayMonths.toFixed(1)} mo`
                : "—"
            }
            narrative={
              health?.runwayMonths != null && health.runwayMonths < 6
                ? "Tight. Agents are watching spend."
                : "Comfortable at current burn."
            }
            size="sm"
          />
          <MetricNarrative
            label="This month, net"
            value={formatCurrency(netChange)}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Bills past due
            </p>
            {overdueBills > 0 ? (
              <>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-error-clay">
                  {overdueBills}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/dashboard?prompt=${encodeURIComponent(`Show me the ${overdueBills} overdue bills and draft a payment plan.`)}`,
                    )
                  }
                  className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80"
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Have agents handle it
                </button>
              </>
            ) : (
              <>
                <p className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold text-balanced-green">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> None
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  All payables current.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Narrative line */}
        {cashPos && (
          <p className="mt-4 border-t border-border/30 pt-3 text-xs leading-relaxed text-muted-foreground">
            {netChange >= 0
              ? "Net positive month so far"
              : "Spending ahead of intake"}{" "}
            — {formatCurrency(Math.abs(cashPos.incoming ?? 0))} came in,{" "}
            {formatCurrency(Math.abs(cashPos.outgoing ?? 0))} went out.
          </p>
        )}
      </section>

      {/* ── Streams ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <FlowStream
          title="Money in"
          icon={TrendingUp}
          tone="emerald"
          emptyLabel="No income recorded yet."
          loading={txLoading}
          rows={inflows.map((t) => ({
            id: t.id,
            title: t.description ?? t.reference ?? "Income",
            meta: t.date
              ? new Date(t.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "",
            amount: formatCurrency(t.amount),
            state: t.isReconciled
              ? ({ label: "reconciled", tone: "ok" } as const)
              : ({ label: "unreconciled", tone: "warn" } as const),
          }))}
        />
        <FlowStream
          title="Money out"
          icon={TrendingDown}
          tone="red"
          emptyLabel="No spending recorded yet."
          loading={txLoading}
          rows={outflows.map((t) => ({
            id: t.id,
            title: t.description ?? t.reference ?? "Payment",
            meta: t.date
              ? new Date(t.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "",
            amount: formatCurrency(Math.abs(t.amount)),
            state: t.isReconciled
              ? ({ label: "reconciled", tone: "ok" } as const)
              : ({ label: "unreconciled", tone: "warn" } as const),
          }))}
        />
      </div>
    </div>
  );
}

// ─── Flow stream ──────────────────────────────────────────────────────────

type FlowRow = {
  id: string;
  title: string;
  meta: string;
  amount: string;
  state: { label: string; tone: "ok" | "warn" | "agent" };
};

function FlowStream({
  title,
  icon: Icon,
  tone,
  rows,
  loading,
  emptyLabel,
}: {
  title: string;
  icon: typeof TrendingUp;
  tone: "emerald" | "red";
  rows: FlowRow[];
  loading?: boolean;
  emptyLabel: string;
}) {
  return (
    <section
      aria-label={title}
      className="overflow-hidden rounded-xl border border-border/50 bg-card"
    >
      <header className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            tone === "emerald" ? "bg-balanced-green/10" : "bg-error-clay/10",
          )}
          aria-hidden="true"
        >
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              tone === "emerald" ? "text-balanced-green" : "text-error-clay",
            )}
          />
        </span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground/60">
          latest {rows.length || ""}
        </span>
      </header>

      {loading ? (
        <div className="space-y-2 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-muted/30" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="p-6 text-center text-xs text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y divide-border/30">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40"
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                  tone === "emerald"
                    ? "bg-balanced-green/10"
                    : "bg-error-clay/10",
                )}
                aria-hidden="true"
              >
                {tone === "emerald" ? (
                  <ArrowDownLeft className="h-3 w-3 text-balanced-green" />
                ) : (
                  <ArrowUpRight className="h-3 w-3 text-error-clay" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">
                  {r.title}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  {r.meta && (
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
                      {r.meta}
                    </span>
                  )}
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 text-[9px] font-bold uppercase tracking-wide",
                      r.state.tone === "ok"
                        ? "bg-balanced-green/10 text-balanced-green"
                        : r.state.tone === "warn"
                          ? "bg-attention-amber/10 text-attention-amber"
                          : "bg-primary/10 text-primary",
                    )}
                  >
                    {r.state.tone === "ok" ? (
                      <CheckCircle2 className="h-2 w-2" aria-hidden="true" />
                    ) : (
                      <CircleDashed className="h-2 w-2" aria-hidden="true" />
                    )}
                    {r.state.label}
                  </span>
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-xs font-semibold tabular-nums",
                  tone === "emerald"
                    ? "text-balanced-green"
                    : "text-foreground",
                )}
              >
                {tone === "emerald" ? "+" : ""}
                {r.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
