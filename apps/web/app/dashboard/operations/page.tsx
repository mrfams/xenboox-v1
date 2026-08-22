"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Users,
  Calendar,
  FileText,
  RefreshCw,
  Landmark,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Bot,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";

import Link from "next/link";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { useModuleAi } from "@/components/module/module-ai-context";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { TransactionDetailDrawer } from "@/components/operations/transaction-detail-drawer";
import { CashFlowChart } from "@/components/finance/cash-flow-chart";

// ─── Operations ───────────────────────────────────────────────────────────
//
// AI handles the money. You approve.
// Organized by money flow direction, not by accounting module.

// ─── AI Money Flow Summary ─────────────────────────────────────────────────

function MoneyFlowSummary() {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data: dashboardData } = trpc.dashboard.getDashboardData.useQuery(
    {},
    { enabled: !!entityId },
  );
  const { data: cashPosition } = trpc.banking.getCashPosition.useQuery(
    {},
    { enabled: !!entityId },
  );

  const businessHealth = dashboardData?.businessHealth;
  const cashBalance = businessHealth?.cashBalance ?? 0;
  const ar = businessHealth?.arOutstanding ?? 0;
  const ap = businessHealth?.apOutstanding ?? 0;
  const runway = businessHealth?.runwayMonths;
  const incoming = cashPosition?.incoming ?? 0;
  const outgoing = cashPosition?.outgoing ?? 0;
  const netChange = cashPosition?.netChange ?? 0;

  return (
    <div className="rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/8"
          aria-hidden="true"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Money Flow
        </h2>
        <span
          className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-500/70"
          aria-hidden="true"
        >
          <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* AI summary */}
      <button
        type="button"
        onClick={() =>
          openWithFocus(
            {
              kind: "Money Flow",
              name: "Cash Position",
              fields: [
                { label: "Cash Balance", value: formatCurrency(cashBalance) },
                { label: "Incoming", value: formatCurrency(incoming) },
                { label: "Outgoing", value: formatCurrency(outgoing) },
                { label: "Net Change", value: formatCurrency(netChange) },
                {
                  label: "Runway",
                  value:
                    runway !== null && runway !== undefined
                      ? `${runway.toFixed(1)} months`
                      : "Sustainable",
                },
              ],
            },
            "Explain my cash position. What's the trend and what should I watch out for?",
          )
        }
        className="mb-4 w-full text-left flex items-start gap-2 rounded-lg bg-primary/[0.03] p-3 hover:bg-primary/[0.06] transition-colors"
      >
        <Sparkles
          className="h-4 w-4 text-primary shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="text-xs text-foreground/80 leading-relaxed">
            {businessHealth
              ? `Cash balance is ${formatCurrency(cashBalance)}. You have ${formatCurrency(incoming)} coming in and ${formatCurrency(outgoing)} going out this month. Net: ${formatCurrency(netChange)}.`
              : "Loading money flow summary..."}
          </p>
          <p className="mt-1 text-[10px] text-primary/70 font-medium">
            Click to ask AI for analysis →
          </p>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-[10px] font-medium text-muted-foreground/70">
            Cash Balance
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {formatCurrency(cashBalance)}
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-[10px] font-medium text-muted-foreground/70">
            Coming In
          </p>
          <p className="mt-1 text-lg font-bold text-emerald-500">
            {formatCurrency(incoming)}
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-[10px] font-medium text-muted-foreground/70">
            Going Out
          </p>
          <p className="mt-1 text-lg font-bold text-red-500">
            {formatCurrency(outgoing)}
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-[10px] font-medium text-muted-foreground/70">
            Runway
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {runway !== null && runway !== undefined
              ? `${runway.toFixed(1)} mo`
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Banking Cards ─────────────────────────────────────────────────────────

function BankingCards() {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();
  const { data: bankData } = trpc.banking.getOverview.useQuery(undefined, {
    enabled: !!entityId,
  });
  const accounts = bankData?.accounts ?? [];

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Banking & Cash
          </h3>
          {bankData?.summary?.unreconciledAccounts != null &&
            bankData.summary.unreconciledAccounts > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-500">
                {bankData.summary.unreconciledAccounts} unreconciled
              </span>
            )}
        </div>
        <button
          type="button"
          onClick={() =>
            openWithFocus(
              {
                kind: "Banking",
                name: "Bank Accounts",
                fields: [
                  {
                    label: "Total Balance",
                    value: formatCurrency(bankData?.summary?.totalBalance ?? 0),
                  },
                  { label: "Accounts", value: String(accounts.length) },
                  {
                    label: "Unreconciled",
                    value: String(bankData?.summary?.unreconciledAccounts ?? 0),
                  },
                ],
              },
              "Show me my bank account overview. Which accounts need attention?",
            )
          }
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Ask AI
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {accounts && accounts.length > 0 ? (
          accounts.slice(0, 3).map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() =>
                openWithFocus(
                  {
                    kind: "Bank Account",
                    name: account.name,
                    id: account.id,
                    fields: [
                      { label: "Bank", value: account.bankName ?? "—" },
                      {
                        label: "Balance",
                        value: formatCurrency(
                          parseFloat(account.currentBalance ?? "0"),
                        ),
                      },
                      {
                        label: "Status",
                        value: account.isActive ? "Active" : "Inactive",
                      },
                    ],
                  },
                  `Show me the recent transactions for ${account.name}. Any anomalies?`,
                )
              }
              className="w-full text-left rounded-lg border border-border/50 bg-background/50 p-3 transition-all hover:border-border/80 hover:shadow-sm group"
            >
              <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {account.name}
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {formatCurrency(parseFloat(account.currentBalance ?? "0"))}
              </p>
              <div className="mt-1 flex items-center gap-1">
                {account.isActive ? (
                  <CheckCircle2
                    className="h-3 w-3 text-emerald-500"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertTriangle
                    className="h-3 w-3 text-amber-500"
                    aria-hidden="true"
                  />
                )}
                <span className="text-[10px] text-muted-foreground">
                  {account.bankName ?? "Connected"} ·{" "}
                  {account.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="col-span-3 rounded-lg border border-dashed border-border/50 py-6 text-center">
            <Wallet
              className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2"
              aria-hidden="true"
            />
            <p className="text-xs text-muted-foreground mb-2">
              No bank accounts connected
            </p>
            <button
              type="button"
              onClick={() =>
                openWithFocus(
                  { kind: "Banking", name: "Bank Setup" },
                  "Help me connect my first bank account",
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Connect with AI
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Recent Transactions ───────────────────────────────────────────────────

function RecentTransactions({
  onTransactionClick,
}: {
  onTransactionClick: (id: string) => void;
}) {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data: activity, isLoading } = trpc.banking.getRecentActivity.useQuery(
    undefined,
    { enabled: !!entityId },
  );

  const { data: txData } = trpc.banking.listTransactions.useQuery(
    { status: "all", limit: 5 },
    { enabled: !!entityId },
  );

  const transactions = txData?.transactions ?? [];

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Recent Transactions
        </h3>
        <button
          type="button"
          onClick={() =>
            openWithFocus(
              {
                kind: "Transactions",
                name: "Bank Transactions",
                fields: [
                  { label: "Total", value: String(transactions.length) },
                ],
              },
              "Show me all recent bank transactions. Categorize them and flag anything unusual.",
            )
          }
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-muted/30"
            />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-6 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {transactions.map((tx) => {
            const amount = tx.amount;
            const isPositive = amount > 0;
            return (
              <button
                key={tx.id}
                type="button"
                onClick={() => onTransactionClick(tx.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      isPositive ? "bg-emerald-500/10" : "bg-red-500/10",
                    )}
                  >
                    {isPositive ? (
                      <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {tx.description ?? tx.reference ?? "Transaction"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {tx.transactionDate
                        ? new Date(tx.transactionDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )
                        : ""}
                      {!tx.isReconciled && (
                        <span className="ml-1.5 text-amber-500 font-medium">
                          Unreconciled
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums shrink-0",
                    isPositive ? "text-emerald-500" : "text-foreground",
                  )}
                >
                  {isPositive ? "+" : ""}
                  {formatCurrency(amount)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Compliance & Close ────────────────────────────────────────────────────

function ComplianceClose() {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data: closeStatus } = trpc.fiscal.getCloseStatus.useQuery(undefined, {
    enabled: !!entityId,
  });

  const completedSteps =
    closeStatus?.steps.filter((s) => s.status === "completed").length ?? 0;
  const totalSteps = closeStatus?.steps.length ?? 0;
  const progress =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Compliance & Close
        </h3>
        <button
          type="button"
          onClick={() =>
            openWithFocus(
              {
                kind: "Month-End Close",
                name: "Close Status",
                fields: [
                  {
                    label: "Progress",
                    value: closeStatus?.isClosed
                      ? "Closed"
                      : `${progress}% complete`,
                  },
                  { label: "Period", value: closeStatus?.currentPeriod ?? "—" },
                ],
              },
              "Show me the month-end close checklist. What's done and what's left?",
            )
          }
          className="text-[10px] font-medium text-primary"
        >
          Ask AI
        </button>
      </div>
      <div className="space-y-2">
        {closeStatus ? (
          <div className="flex items-center gap-3 rounded-lg bg-background/50 px-3 py-2">
            <Calendar
              className="h-4 w-4 text-muted-foreground/60"
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">
                Month-end close
              </p>
              <p className="text-[10px] text-muted-foreground">
                {closeStatus.isClosed
                  ? `Closed through ${closeStatus.currentPeriod ?? "last month"}`
                  : closeStatus.currentPeriod
                    ? `In progress — ${progress}% complete`
                    : "Not started"}
              </p>
              {!closeStatus.isClosed && totalSteps > 0 && (
                <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-background/50 px-3 py-2">
            <Calendar
              className="h-4 w-4 text-muted-foreground/60"
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">
                Month-end close
              </p>
              <p className="text-[10px] text-muted-foreground">Loading...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── People Grid ───────────────────────────────────────────────────────────

function PeopleGrid() {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();

  const { data: customers } = trpc.customers.listCustomers.useQuery(
    { status: "all", limit: 1 },
    { enabled: !!entityId },
  );
  const { data: billsOverview } = trpc.bills.getOverview.useQuery(undefined, {
    enabled: !!entityId,
  });

  const people = [
    {
      label: "Customers",
      count: customers?.totalCount ?? 0,
      icon: Users,
      color: "text-blue-500",
      prompt: "Show me my customer list. Who has outstanding invoices?",
    },
    {
      label: "Vendors",
      count: billsOverview?.statusCounts.all ?? 0,
      icon: CreditCard,
      color: "text-amber-500",
      prompt: "Show me my vendors. Who do I owe money to?",
    },
    {
      label: "Employees",
      count: 0,
      icon: Users,
      color: "text-emerald-500",
      prompt: "Show me my employee list and payroll status",
    },
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">People</h3>
      <div className="grid grid-cols-3 gap-3">
        {people.map((person) => (
          <button
            key={person.label}
            type="button"
            onClick={() =>
              openWithFocus(
                { kind: person.label, name: person.label },
                person.prompt,
              )
            }
            className="w-full text-left flex items-center gap-2 rounded-lg bg-background/50 p-3 transition-all hover:bg-accent group"
          >
            <person.icon
              className={cn("h-4 w-4", person.color)}
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                {person.label}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {person.count} total
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── AI Quick Actions ──────────────────────────────────────────────────────

function AiQuickActions() {
  const { openWithFocus } = useModuleAi();

  const actions = [
    {
      label: "Upload document",
      icon: FileText,
      prompt: "Help me upload and process a document",
    },
    {
      label: "Generate payment link",
      icon: ArrowUpRight,
      prompt: "Generate a payment link for an outstanding invoice",
    },
    {
      label: "Set up recurring",
      icon: RefreshCw,
      prompt: "Help me set up a recurring transaction or invoice",
    },
    {
      label: "Reconcile accounts",
      icon: RefreshCw,
      prompt: "Help me reconcile my bank transactions",
    },
    {
      label: "Run payroll",
      icon: Users,
      prompt: "Help me run payroll for this period",
    },
    {
      label: "Close month-end",
      icon: Calendar,
      prompt: "Start the month-end close process",
    },
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        AI Quick Actions
      </h3>
      <p className="text-xs text-muted-foreground/70 mb-3">
        Click to ask the AI to handle these for you.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() =>
              openWithFocus(
                { kind: "Operations", name: action.label },
                action.prompt,
              )
            }
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs text-foreground transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-primary group"
          >
            <action.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);

  // ── Cross-surface sync ────────────────────────────────────────────────
  // Listen for data_changed events from other surfaces and refetch
  useSurfaceSync({ entityId, surfaces: ["operations"] });

  const { data: billsOverview } = trpc.bills.getOverview.useQuery(undefined, {
    enabled: !!entityId,
  });
  const { data: dashboardData } = trpc.dashboard.getDashboardData.useQuery(
    {},
    { enabled: !!entityId },
  );

  const overdueBills = billsOverview?.statusCounts.overdue ?? 0;
  const pendingBills =
    (billsOverview?.statusCounts.pending_approval ?? 0) +
    (billsOverview?.statusCounts.draft ?? 0);

  return (
    <>
      <ModulePageShell
        title="Operations"
        description="Money in, money out. AI handles it, you approve."
        icon={ArrowLeftRight}
        aiSuggestions={[
          { label: "Show overdue invoices", prompt: "Show overdue invoices" },
          {
            label: "What bills need paying?",
            prompt: "What bills need paying?",
          },
          { label: "Run payroll", prompt: "Run payroll" },
        ]}
      >
        <div
          className="space-y-4 p-3 pb-20 sm:p-6 md:pb-6"
          aria-busy={!billsOverview && !dashboardData}
        >
          {/* Money Flow Summary */}
          <MoneyFlowSummary />

          {/* Cash Flow Visualization */}
          <CashFlowChart data={cashPosition} isLoading={!cashPosition} />

          {/* Money Out / Money In side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Money Out */}
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Money Out
                  </h3>
                  {overdueBills > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500/10 px-1.5 text-[10px] font-bold text-red-500">
                      {overdueBills}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Link
                  href="/dashboard/operations/bills"
                  className="w-full flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-left transition-colors hover:bg-accent group"
                >
                  <div className="flex items-center gap-2">
                    {pendingBills > 0 ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                    <span className="text-xs text-foreground group-hover:text-primary transition-colors">
                      Bills to Pay
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {pendingBills} pending
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    openWithFocus(
                      { kind: "Expenses", name: "Expenses" },
                      "Show me recent expenses. Any anomalies or duplicates?",
                    )
                  }
                  className="w-full flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-left transition-colors hover:bg-accent group"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-foreground group-hover:text-primary transition-colors">
                      Expenses
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    AI-tracked
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openWithFocus(
                      { kind: "Payroll", name: "Payroll" },
                      "Help me run payroll for this period. Show me the pending run.",
                    )
                  }
                  className="w-full flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-left transition-colors hover:bg-accent group"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-foreground group-hover:text-primary transition-colors">
                      Payroll
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">Period</span>
                </button>
              </div>
            </div>

            {/* Money In */}
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Money In
                  </h3>
                </div>
              </div>
              <div className="space-y-2">
                <Link
                  href="/dashboard/operations/invoices"
                  className="w-full flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-left transition-colors hover:bg-accent group"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs text-foreground group-hover:text-primary transition-colors">
                      Invoices Outstanding
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">AR</span>
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    openWithFocus(
                      { kind: "Estimates", name: "Estimates" },
                      "Show me pending estimates and quotes. Which ones should I follow up on?",
                    )
                  }
                  className="w-full flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-left transition-colors hover:bg-accent group"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-foreground group-hover:text-primary transition-colors">
                      Estimates
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">Pending</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openWithFocus(
                      { kind: "Reconciliation", name: "Bank Reconciliation" },
                      "Show me unmatched bank transactions. Help me reconcile.",
                    )
                  }
                  className="w-full flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-left transition-colors hover:bg-accent group"
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-foreground group-hover:text-primary transition-colors">
                      Reconcile
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">Match</span>
                </button>
              </div>
            </div>
          </div>

          {/* Banking Cards */}
          <BankingCards />

          {/* Recent Transactions */}
          <RecentTransactions onTransactionClick={setSelectedTransactionId} />

          {/* Compliance & Close */}
          <ComplianceClose />

          {/* People Grid */}
          <PeopleGrid />

          {/* AI Quick Actions */}
          <AiQuickActions />
        </div>
      </ModulePageShell>

      {/* Transaction Detail Drawer */}
      {selectedTransactionId && (
        <TransactionDetailDrawer
          transactionId={selectedTransactionId}
          onClose={() => setSelectedTransactionId(null)}
        />
      )}
    </>
  );
}
