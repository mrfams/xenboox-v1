"use client";

import Link from "next/link";
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
  ArrowUpRight,
  Package,
  ChevronRight,
} from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";

// ─── Operations ───────────────────────────────────────────────────────────
//
// AI handles the money. You approve.
// Organized by money flow direction, not by accounting module.
//
// Replaces: invoicing, estimates, bills, expenses, banking, money,
//           payroll, reconciliation, tax-compliance, close, documents,
//           customers, vendors, inventory

// ─── AI Money Flow Summary ─────────────────────────────────────────────────

function MoneyFlowSummary() {
  const { entityId } = useEntity();
  const { data: overview } = trpc.dashboard.getOverview.useQuery(undefined, {
    enabled: !!entityId,
  });

  return (
    <div className="rounded-2xl border border-border/40 bg-card/30 p-4 sm:p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/8">
          <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Money Flow
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-500/70">
          <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-[10px] font-medium text-muted-foreground/70">
            Cash Balance
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {formatCurrency(overview?.cashBalance ?? 0)}
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-[10px] font-medium text-muted-foreground/70">
            Accounts Receivable
          </p>
          <p className="mt-1 text-lg font-bold text-emerald-500">
            {formatCurrency(overview?.accountsReceivable ?? 0)}
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-[10px] font-medium text-muted-foreground/70">
            Accounts Payable
          </p>
          <p className="mt-1 text-lg font-bold text-red-500">
            {formatCurrency(overview?.accountsPayable ?? 0)}
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-[10px] font-medium text-muted-foreground/70">
            Runway
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {overview?.runway !== null && overview?.runway !== undefined
              ? `${overview.runway.toFixed(1)} mo`
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────

function OperationSection({
  title,
  icon: Icon,
  iconColor,
  items,
  actionLabel,
  actionHref,
  alertCount,
}: {
  title: string;
  icon: typeof Wallet;
  iconColor: string;
  items: Array<{
    label: string;
    detail: string;
    status?: "ok" | "warning" | "error";
    href?: string;
  }>;
  actionLabel: string;
  actionHref: string;
  alertCount?: number;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              iconColor,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {alertCount !== undefined && alertCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500/10 px-1.5 text-[10px] font-bold text-red-500">
              {alertCount}
            </span>
          )}
        </div>
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {actionLabel}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 py-2">
          Nothing here right now
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={`${item.label}-${i}`}
              className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.status === "warning" && (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
                {item.status === "error" && (
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                )}
                {item.status === "ok" && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                )}
                <span className="text-xs text-foreground truncate">
                  {item.label}
                </span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {item.detail}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Banking Cards ─────────────────────────────────────────────────────────

function BankingCards() {
  const { entityId } = useEntity();
  const { data: accounts } = trpc.banking.listAccounts.useQuery(undefined, {
    enabled: !!entityId,
  });

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Banking & Cash
        </h3>
        <Link
          href="/dashboard/banking"
          className="text-xs font-medium text-primary hover:text-primary/80"
        >
          Manage
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {accounts && accounts.length > 0 ? (
          accounts.slice(0, 3).map((account) => (
            <div
              key={account.id}
              className="rounded-lg border border-border/50 bg-background/50 p-3"
            >
              <p className="text-xs font-medium text-foreground truncate">
                {account.name}
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {formatCurrency(Number(account.balance ?? 0))}
              </p>
              <div className="mt-1 flex items-center gap-1">
                {account.isReconciled ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                )}
                <span className="text-[10px] text-muted-foreground">
                  {account.isReconciled ? "Reconciled" : "Needs reconciliation"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 rounded-lg border border-dashed border-border/50 py-6 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              No bank accounts connected
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compliance Timeline ───────────────────────────────────────────────────

function ComplianceTimeline() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          Compliance & Close
        </h3>
        <Link
          href="/dashboard/tax-compliance"
          className="text-xs font-medium text-primary hover:text-primary/80"
        >
          Calendar
        </Link>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-lg bg-background/50 px-3 py-2">
          <Calendar className="h-4 w-4 text-muted-foreground/60" />
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground">
              Month-end close
            </p>
            <p className="text-[10px] text-muted-foreground">Due in 12 days</p>
          </div>
          <Link
            href="/dashboard/close"
            className="text-[10px] font-medium text-primary"
          >
            View
          </Link>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-background/50 px-3 py-2">
          <FileText className="h-4 w-4 text-muted-foreground/60" />
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground">VAT return</p>
            <p className="text-[10px] text-muted-foreground">Due in 26 days</p>
          </div>
          <Link
            href="/dashboard/tax-compliance"
            className="text-[10px] font-medium text-primary"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── People Grid ───────────────────────────────────────────────────────────

function PeopleGrid() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">People</h3>
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/dashboard/customers"
          className="flex items-center gap-2 rounded-lg bg-background/50 p-3 transition-colors hover:bg-accent"
        >
          <Users className="h-4 w-4 text-blue-500" />
          <div>
            <p className="text-xs font-medium text-foreground">Customers</p>
            <p className="text-[10px] text-muted-foreground">View all</p>
          </div>
        </Link>
        <Link
          href="/dashboard/vendors"
          className="flex items-center gap-2 rounded-lg bg-background/50 p-3 transition-colors hover:bg-accent"
        >
          <CreditCard className="h-4 w-4 text-amber-500" />
          <div>
            <p className="text-xs font-medium text-foreground">Vendors</p>
            <p className="text-[10px] text-muted-foreground">View all</p>
          </div>
        </Link>
        <Link
          href="/dashboard/payroll"
          className="flex items-center gap-2 rounded-lg bg-background/50 p-3 transition-colors hover:bg-accent"
        >
          <Users className="h-4 w-4 text-emerald-500" />
          <div>
            <p className="text-xs font-medium text-foreground">Employees</p>
            <p className="text-[10px] text-muted-foreground">Payroll</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const { entityId } = useEntity();

  const { data: overview } = trpc.dashboard.getOverview.useQuery(undefined, {
    enabled: !!entityId,
  });

  return (
    <ModulePageShell
      title="Operations"
      description="Money in, money out. AI handles it, you approve."
      icon={ArrowLeftRight}
    >
      <div className="space-y-4 p-4 sm:p-6">
        {/* Money Flow Summary */}
        <MoneyFlowSummary />

        {/* Money Out Section */}
        <OperationSection
          title="Money Out"
          icon={TrendingDown}
          iconColor="bg-red-500/10 text-red-500"
          alertCount={overview?.overdueBills ?? 0}
          actionLabel="View all"
          actionHref="/dashboard/bills"
          items={[
            {
              label: "Bills to Pay",
              detail: `${overview?.pendingBills ?? 0} pending`,
              status: (overview?.pendingBills ?? 0) > 0 ? "warning" : "ok",
              href: "/dashboard/bills",
            },
            {
              label: "Expenses",
              detail: `${overview?.pendingExpenses ?? 0} pending`,
              status: (overview?.pendingExpenses ?? 0) > 0 ? "warning" : "ok",
              href: "/dashboard/expenses",
            },
            {
              label: "Payroll",
              detail: overview?.nextPayrollDate
                ? `Due ${new Date(overview.nextPayrollDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : "No upcoming",
              href: "/dashboard/payroll",
            },
          ]}
        />

        {/* Money In Section */}
        <OperationSection
          title="Money In"
          icon={TrendingUp}
          iconColor="bg-emerald-500/10 text-emerald-500"
          alertCount={overview?.overdueInvoices ?? 0}
          actionLabel="View all"
          actionHref="/dashboard/invoicing"
          items={[
            {
              label: "Invoices Outstanding",
              detail: `${overview?.outstandingInvoices ?? 0} pending`,
              status:
                (overview?.outstandingInvoices ?? 0) > 0 ? "warning" : "ok",
              href: "/dashboard/invoicing",
            },
            {
              label: "Estimates",
              detail: `${overview?.pendingEstimates ?? 0} pending`,
              href: "/dashboard/estimates",
            },
          ]}
        />

        {/* Banking Cards */}
        <BankingCards />

        {/* Compliance Timeline */}
        <ComplianceTimeline />

        {/* People Grid */}
        <PeopleGrid />

        {/* Quick Access */}
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Quick Access
          </h3>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/documents"
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Documents
            </Link>
            <Link
              href="/dashboard/inventory"
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
            >
              <Package className="h-3.5 w-3.5" />
              Inventory
            </Link>
            <Link
              href="/dashboard/reconciliation/center"
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reconciliation
            </Link>
          </div>
        </div>
      </div>
    </ModulePageShell>
  );
}
