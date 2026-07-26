"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@/components/ui";
import { StatCard } from "@/components/dashboard/stat-card";
import { Skeleton } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Camera,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Receipt,
  Clock,
  Hand,
  Smartphone,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

type CashAccount = {
  id: string;
  name: string;
  currentBalance: string;
  isActive: boolean;
};

type ImprestFloat = {
  id: string;
  assigneeName: string;
  amount: string;
  remainingBalance: string;
  status: string;
  purpose?: string;
  issuedDate: string;
  settleByDate?: string;
};

// ─── Daily Cash Position ──────────────────────────────────────────────

function DailyCashPosition({
  cashAccounts,
  isLoading,
}: {
  cashAccounts: CashAccount[];
  isLoading: boolean;
}) {
  const totalCash = cashAccounts
    .filter((a) => a.isActive)
    .reduce((s, a) => s + parseFloat(a.currentBalance), 0);

  return (
    <Card className="bg-gradient-to-br from-emerald-500/5 via-emerald-500/[0.02] to-background border-emerald-500/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Today&apos;s Cash Position
          </CardTitle>
          <Badge variant="outline" className="text-[10px] gap-1">
            <RefreshCw className="h-3 w-3" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-12 w-48" />
        ) : (
          <>
            <p className="text-3xl font-bold">{formatCurrency(totalCash)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {cashAccounts.filter((a) => a.isActive).length} active till
              {cashAccounts.filter((a) => a.isActive).length !== 1 ? "s" : ""}
            </p>
            <div className="mt-4 space-y-2">
              {cashAccounts
                .filter((a) => a.isActive)
                .slice(0, 3)
                .map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-lg border bg-background/50 px-3 py-2"
                  >
                    <span className="text-sm font-medium">{account.name}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(parseFloat(account.currentBalance))}
                    </span>
                  </div>
                ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────

function CashierQuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/cash/imprest/issue">
            <Button
              variant="outline"
              className="w-full h-20 flex-col gap-1.5 text-xs"
            >
              <Plus className="h-5 w-5 text-emerald-500" />
              <span>Issue Imprest</span>
            </Button>
          </Link>
          <Link href="/dashboard/cash/imprest/retire">
            <Button
              variant="outline"
              className="w-full h-20 flex-col gap-1.5 text-xs"
            >
              <Receipt className="h-5 w-5 text-amber-500" />
              <span>Retire Imprest</span>
            </Button>
          </Link>
          <Link href="/dashboard/cash/scan">
            <Button
              variant="outline"
              className="w-full h-20 flex-col gap-1.5 text-xs"
            >
              <Camera className="h-5 w-5 text-blue-500" />
              <span>Scan Receipt</span>
            </Button>
          </Link>
          <Link href="/dashboard/cash/petty-cash">
            <Button
              variant="outline"
              className="w-full h-20 flex-col gap-1.5 text-xs"
            >
              <Wallet className="h-5 w-5 text-violet-500" />
              <span>Petty Cash</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Active Imprests Widget ──────────────────────────────────────────

function ActiveImprestsWidget({
  imprests,
  isLoading,
}: {
  imprests: ImprestFloat[];
  isLoading: boolean;
}) {
  const active = imprests.filter((f) => f.status === "active");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Imprests
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {active.length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : active.length > 0 ? (
          <div className="space-y-2">
            {active.slice(0, 5).map((float) => {
              const issued = parseFloat(float.amount);
              const remaining = parseFloat(float.remainingBalance);
              const spent = issued - remaining;
              const spentPct = issued > 0 ? (spent / issued) * 100 : 0;

              return (
                <Link
                  key={float.id}
                  href={`/dashboard/cash/imprest/${float.id}`}
                  className="block rounded-lg border p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {float.assigneeName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {float.purpose ?? "No purpose"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(remaining)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        of {formatCurrency(issued)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        spentPct > 80
                          ? "bg-red-500"
                          : spentPct > 50
                            ? "bg-amber-500"
                            : "bg-emerald-500",
                      )}
                      style={{ width: `${Math.min(spentPct, 100)}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Hand className="h-8 w-8" />}
            title="No active imprests"
            description="Issue an imprest to get started."
            className="py-4"
          />
        )}
        <Link href="/dashboard/cash/imprest">
          <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
            View all imprests <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Today's Transactions ──────────────────────────────────────────────

function TodaysTransactionFeed({
  cashAccounts,
}: {
  cashAccounts: CashAccount[];
}) {
  const totalIn = 0;
  const totalOut = 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Today&apos;s Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 text-center">
            <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-emerald-600">
              {formatCurrency(totalIn)}
            </p>
            <p className="text-xs text-muted-foreground">Cash In</p>
          </div>
          <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 text-center">
            <TrendingDown className="h-4 w-4 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(totalOut)}
            </p>
            <p className="text-xs text-muted-foreground">Cash Out</p>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Connect bank feeds or record transactions to see daily activity.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────

export function CashierDashboard() {
  const { entityId } = useEntity();
  const [mobileView, setMobileView] = useState<
    "position" | "actions" | "imprests"
  >("position");

  const { data: cashAccounts, isLoading: cashLoading } =
    trpc.cash.listCashAccounts.useQuery(undefined, { enabled: !!entityId });
  const { data: imprestFloats, isLoading: imprestLoading } =
    trpc.cash.listImprestFloats.useQuery(undefined, { enabled: !!entityId });

  const isLoading = cashLoading || imprestLoading;

  // Stats
  const cashAccountsArr = (cashAccounts ?? []) as unknown as CashAccount[];
  const imprestFloatsArr = (imprestFloats ?? []) as unknown as ImprestFloat[];

  const totalCash = useMemo(
    () =>
      cashAccountsArr
        .filter((a) => a.isActive)
        .reduce((s, a) => s + parseFloat(a.currentBalance), 0),
    [cashAccounts],
  );
  const activeImprests = imprestFloatsArr.filter(
    (f) => f.status === "active",
  ).length;
  const totalOutstanding = imprestFloatsArr
    .filter((f) => f.status === "active")
    .reduce((s, f) => s + parseFloat(f.remainingBalance), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cash Desk</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily cash position, imprests, and receipt capture —
            mobile-optimized.
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <Smartphone className="h-3 w-3" />
          Cashier
        </Badge>
      </div>

      {/* Mobile Tab Nav */}
      <div className="flex gap-2 sm:hidden">
        {[
          { id: "position" as const, label: "Position", icon: Wallet },
          { id: "actions" as const, label: "Actions", icon: Plus },
          { id: "imprests" as const, label: "Imprests", icon: Receipt },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileView(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                mobileView === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Desktop: Full layout / Mobile: Tabbed */}
      <div className="sm:hidden">
        {mobileView === "position" && (
          <div className="space-y-4">
            <DailyCashPosition
              cashAccounts={(cashAccounts ?? []) as CashAccount[]}
              isLoading={cashLoading}
            />
            <TodaysTransactionFeed
              cashAccounts={(cashAccounts ?? []) as CashAccount[]}
            />
          </div>
        )}
        {mobileView === "actions" && <CashierQuickActions />}
        {mobileView === "imprests" && (
          <ActiveImprestsWidget
            imprests={(imprestFloats ?? []) as ImprestFloat[]}
            isLoading={imprestLoading}
          />
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:block">
        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Wallet className="h-4 w-4" />}
            label="Total Cash on Hand"
            value={formatCurrency(totalCash)}
            changeLabel="All active tills"
            href="/dashboard/cash"
          />
          <StatCard
            icon={<Hand className="h-4 w-4" />}
            label="Active Imprests"
            value={String(activeImprests)}
            changeLabel="Outstanding floats"
            href="/dashboard/cash/imprest"
          />
          <StatCard
            icon={<Receipt className="h-4 w-4" />}
            label="Outstanding Amount"
            value={formatCurrency(totalOutstanding)}
            changeLabel="Yet to be retired"
            href="/dashboard/cash/imprest"
          />
          <StatCard
            icon={<Camera className="h-4 w-4" />}
            label="Receipts Today"
            value="0"
            changeLabel="Scan to add"
            href="/dashboard/cash/scan"
          />
        </div>

        {/* Main Content */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <DailyCashPosition
              cashAccounts={(cashAccounts ?? []) as CashAccount[]}
              isLoading={cashLoading}
            />
            <ActiveImprestsWidget
              imprests={(imprestFloats ?? []) as ImprestFloat[]}
              isLoading={imprestLoading}
            />
          </div>
          <div className="space-y-4">
            <CashierQuickActions />
            <TodaysTransactionFeed
              cashAccounts={(cashAccounts ?? []) as CashAccount[]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
