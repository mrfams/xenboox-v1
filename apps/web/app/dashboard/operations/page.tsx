"use client";

// ─── Money Flows ────────────────────────────────────────────────────────────
//
// Cash hero up top, Money-needing-you decisions next, record tables last as
// expandable sections (mounted only when opened). Work happens through Ask
// and inline decisions — never tab-hopping. Legacy ?tab= links open the
// matching records section.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  CreditCard,
  FileText,
  Landmark,
  ReceiptText,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { useSearchParams } from "next/navigation";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { MetricNarrative } from "@/components/ai-native-v2/metric-narrative";
import { AskDrawer, type AskFn } from "@/components/chat/ask-drawer";
import type { PageFocus } from "@/lib/chat/page-context";
import { MoneyNeedsYou } from "@/components/operations/money-needs-you";
import { InvoicesView } from "@/components/operations/invoices-view";
import { BillsView } from "@/components/finance/bills-view";
import { CustomersView } from "@/components/operations/customers-view";
import { VendorsView } from "@/components/operations/vendors-view";
import { BankingView } from "@/components/operations/banking-view";
import { ExpensesView } from "@/components/operations/expenses-view";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

type SectionKey =
  | "invoices"
  | "bills"
  | "expenses"
  | "customers"
  | "vendors"
  | "banking";

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: "invoices", label: "Invoices", icon: FileText },
  { key: "bills", label: "Bills", icon: CreditCard },
  { key: "expenses", label: "Expenses", icon: ReceiptText },
  { key: "customers", label: "Customers", icon: Users },
  { key: "vendors", label: "Vendors", icon: Building2 },
  { key: "banking", label: "Banking", icon: Landmark },
];

export default function MoneyFlowsPage() {
  const { entityId } = useEntity();
  const searchParams = useSearchParams();
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set());
  const sectionRefs = useRef<Partial<Record<SectionKey, HTMLDivElement | null>>>(
    {},
  );

  useSurfaceSync({ entityId, surfaces: ["operations"] });

  // ── Inline Ask ────────────────────────────────────────────────────
  const [askState, setAskState] = useState<{
    prompt: string;
    title: string;
    subject?: string;
    focus?: PageFocus;
  } | null>(null);

  const ask: AskFn = useCallback((prompt, focus) => {
    setAskState({
      prompt,
      title: "Ask about money flows",
      subject: focus?.name,
      focus,
    });
  }, []);

  const openSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => new Set(prev).add(key));
    // Scroll after the section mounts.
    requestAnimationFrame(() => {
      setTimeout(() => {
        sectionRefs.current[key]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 60);
    });
  }, []);

  // Legacy ?tab= links (sub-route redirects) open the matching section.
  const tabConsumed = useRef(false);
  useEffect(() => {
    if (tabConsumed.current) return;
    const t = searchParams.get("tab") as SectionKey | null;
    if (t && SECTIONS.some((s) => s.key === t)) {
      tabConsumed.current = true;
      openSection(t);
    }
  }, [searchParams, openSection]);

  function toggleSection(key: SectionKey) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col p-4 pb-6 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          Money Flows
        </h1>
        <button
          type="button"
          onClick={() =>
            ask("Where did the cash go this month? Biggest inflows, biggest outflows, and what changed vs last month.")
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          Where did the cash go?
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        <CashPositionPanel ask={ask} />

        <MoneyNeedsYou ask={ask} onOpenSection={openSection} />

        {/* ── Records: expandable, mounted on open ─────────────────── */}
        <section aria-label="Records">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Records
          </h2>
          <div className="space-y-2">
            {SECTIONS.map((section) => {
              const open = openSections.has(section.key);
              const Icon = section.icon;
              return (
                <div
                  key={section.key}
                  ref={(el) => {
                    sectionRefs.current[section.key] = el;
                  }}
                  className="overflow-hidden rounded-xl border border-border/50 bg-card"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.key)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {section.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  {open && (
                    <div className="border-t border-border/30 p-3 sm:p-4">
                      {section.key === "invoices" && <InvoicesView />}
                      {section.key === "bills" && <BillsView />}
                      {section.key === "expenses" && <ExpensesView />}
                      {section.key === "customers" && <CustomersView />}
                      {section.key === "vendors" && <VendorsView />}
                      {section.key === "banking" && <BankingView />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {askState && (
        <AskDrawer
          key={`${askState.prompt}-${askState.focus?.name ?? "page"}`}
          entityId={entityId ?? ""}
          title={askState.title}
          subject={askState.subject}
          initialPrompt={askState.prompt}
          pageContext={{ page: "Operations", focus: askState.focus }}
          onClose={() => setAskState(null)}
        />
      )}
    </div>
  );
}

// ─── Cash Position Panel ────────────────────────────────────────────────────

function CashPositionPanel({ ask }: { ask: AskFn }) {
  const { format } = useFormatCurrency();
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
                ? "Tight — watching spend."
                : "Comfortable at current burn."
            }
            size="sm"
          />
          <button
            type="button"
            onClick={() =>
              ask("Explain this month's net change. What's driving it?", {
                kind: "Metric",
                name: "Monthly net",
                fields: [
                  { label: "Net", value: format(netChange) },
                  { label: "Cash", value: format(health?.cashBalance ?? 0) },
                ],
              })
            }
            className="text-left"
            aria-label="Ask about this month's net change"
          >
            <MetricNarrative
              label="This month, net"
              value={format(netChange)}
              size="sm"
            />
          </button>
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
                    ask(
                      "Draft a payment plan for my overdue bills: who gets paid first, how much, and when.",
                    )
                  }
                  className="mt-0.5 text-left text-[11px] font-medium text-primary hover:text-primary/80"
                >
                  Draft a payment plan →
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
          emptyCta={{
            label: "Record income with AI",
            prompt: "Help me record income I received.",
          }}
          ask={ask}
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
          emptyCta={{
            label: "Record spending with AI",
            prompt: "Help me record money we spent.",
          }}
          ask={ask}
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
  emptyCta,
  ask,
}: {
  title: string;
  icon: typeof TrendingUp;
  tone: "emerald" | "red";
  rows: FlowRow[];
  loading?: boolean;
  emptyLabel: string;
  emptyCta: { label: string; prompt: string };
  ask: AskFn;
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
        <div className="p-6 text-center">
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
          <button
            type="button"
            onClick={() => ask(emptyCta.prompt)}
            className="mt-2 text-[11px] font-medium text-primary hover:text-primary/80"
          >
            {emptyCta.label} →
          </button>
        </div>
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
