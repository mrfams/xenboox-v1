"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  CreditCard,
  FileText,
  Landmark,
  ReceiptText,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Building2,
  type LucideIcon,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { MetricNarrative } from "@/components/ai-native-v2/metric-narrative";
import { InvoicesView } from "@/components/operations/invoices-view";
import { BillsView } from "@/components/finance/bills-view";
import { CustomersView } from "@/components/operations/customers-view";
import { VendorsView } from "@/components/operations/vendors-view";
import { BankingView } from "@/components/operations/banking-view";
import { ExpensesView } from "@/components/operations/expenses-view";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

// ─── Money Flows — AI-Native Operations (/operations/new) ─────────────────
//
// Tabs absorb navigation:
//   1. Cash Position — runway hero + inflow/outflow streams
//   2. Invoices — invoice management
//   3. Bills — bill management
//   4. Expenses — expense tracking + approval
//   5. Customers — customer management
//   6. Vendors — vendor management
//   7. Banking — bank accounts + reconciliation
//
// Keyboard: 1-7 switch tabs, j/k navigate, Enter open detail

type Tab =
  | "cash"
  | "invoices"
  | "bills"
  | "expenses"
  | "customers"
  | "vendors"
  | "banking";

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "cash", label: "Cash Position", icon: TrendingUp },
  { key: "invoices", label: "Invoices", icon: FileText },
  { key: "bills", label: "Bills", icon: CreditCard },
  { key: "expenses", label: "Expenses", icon: ReceiptText },
  { key: "customers", label: "Customers", icon: Users },
  { key: "vendors", label: "Vendors", icon: Building2 },
  { key: "banking", label: "Banking", icon: Landmark },
];

export default function MoneyFlowsPage() {
  const { format } = useFormatCurrency();
  const { entityId } = useEntity();
  const [tab, setTab] = useState<Tab>("cash");

  useSurfaceSync({ entityId, surfaces: ["operations"] });

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag?.match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "1":
          e.preventDefault();
          setTab("cash");
          break;
        case "2":
          e.preventDefault();
          setTab("invoices");
          break;
        case "3":
          e.preventDefault();
          setTab("bills");
          break;
        case "4":
          e.preventDefault();
          setTab("expenses");
          break;
        case "5":
          e.preventDefault();
          setTab("customers");
          break;
        case "6":
          e.preventDefault();
          setTab("vendors");
          break;
        case "7":
          e.preventDefault();
          setTab("banking");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-full flex-col p-4 pb-6 sm:p-6">
      {/* ── Header + Tabs ─────────────────────────────────────────── */}
      <header className="mb-3">
        <h1 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          Money Flows
        </h1>

        <div className="mt-3 flex items-center justify-between">
          <div
            className="flex items-center gap-1"
            role="tablist"
            aria-label="Operations views"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <span className="hidden text-[10px] text-muted-foreground/50 sm:inline">
            1-7 switch tabs
          </span>
        </div>
      </header>

      {/* ── Tab Panels ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "cash" && <CashPositionPanel />}
        {tab === "invoices" && <InvoicesView />}
        {tab === "bills" && <BillsView />}
        {tab === "expenses" && <ExpensesView />}
        {tab === "customers" && <CustomersView />}
        {tab === "vendors" && <VendorsView />}
        {tab === "banking" && <BankingView />}
      </div>
    </div>
  );
}

// ─── Cash Position Panel ────────────────────────────────────────────────────

function CashPositionPanel() {
  const { entityId } = useEntity();
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
  const inflows = (txData?.transactions ?? [])
    .filter((t) => t.amount > 0)
    .slice(0, 8);
  const outflows = (txData?.transactions ?? [])
    .filter((t) => t.amount <= 0)
    .slice(0, 8);

  const overdueBills = billsOverview?.statusCounts.overdue ?? 0;
  const netChange = cashPos?.netChange ?? 0;
  const pendingInvoices = invoiceStats?.pendingCount ?? 0;
  const pendingBills = billsOverview?.statusCounts.pending ?? 0;

  return (
    <div className="space-y-5">
      {/* Status strip */}
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

      {/* Runway hero */}
      <section
        aria-labelledby="runway-heading"
        className="rounded-2xl border border-border/50 bg-card p-5"
      >
        <h2 id="runway-heading" className="sr-only">
          Cash position
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <MetricNarrative
            label="Cash on hand"
            value={format(health?.cashBalance ?? 0)}
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
            value={format(netChange)}
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
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Ask the AI to draft a payment plan.
                </p>
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

        {cashPos && (
          <p className="mt-4 border-t border-border/30 pt-3 text-xs leading-relaxed text-muted-foreground">
            {netChange >= 0
              ? "Net positive month so far"
              : "Spending ahead of intake"}{" "}
            — {format(Math.abs(cashPos.incoming ?? 0))} came in,{" "}
            {format(Math.abs(cashPos.outgoing ?? 0))} went out.
          </p>
        )}
      </section>

      {/* Streams */}
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
            amount: format(t.amount),
            state: t.isReconciled
              ? { label: "reconciled", tone: "ok" as const }
              : { label: "unreconciled", tone: "warn" as const },
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
            amount: format(Math.abs(t.amount)),
            state: t.isReconciled
              ? { label: "reconciled", tone: "ok" as const }
              : { label: "unreconciled", tone: "warn" as const },
          }))}
        />
      </div>
    </div>
  );
}

// ─── People Panel (Customers + Vendors side by side) ───────────────────────

function PeoplePanel() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          Customers
        </h2>
        <CustomersView />
      </div>
      <div>
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          Vendors
        </h2>
        <VendorsView />
      </div>
    </div>
  );
}

// ─── Flow Stream ───────────────────────────────────────────────────────────

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
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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
