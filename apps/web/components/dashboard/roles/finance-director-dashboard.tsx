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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import { StatCard } from "@/components/dashboard/stat-card";
import { AgentActivityItem } from "@/components/dashboard/agent-activity-item";
import { Skeleton } from "@/components/shared/loading";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Wallet,
  Landmark,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Bot,
  Clock,
  FileText,
  CreditCard,
  ArrowUpRight,
  RefreshCw,
  CalendarDays,
  Building2,
  Shield,
  GitBranch,
  Network,
  PlayCircle,
  Smartphone,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

type BankAccount = {
  id: string;
  name: string;
  currentBalance: string;
  isActive: boolean;
};

type CashAccount = {
  id: string;
  name: string;
  currentBalance: string;
  isActive: boolean;
};

type SalesInvoice = {
  id: string;
  status: string;
  totalAmount: string;
  paidAmount: string;
  balance: string;
  invoiceDate: string;
  invoiceNumber: string;
};

type ApInvoice = {
  id: string;
  status: string;
  totalAmount: string;
  balance: string;
  invoiceDate: string;
  invoiceNumber: string;
};

// ─── Key Metrics Grid ─────────────────────────────────────────────────

function KeyMetricsGrid({
  totalRevenue,
  outstandingReceivables,
  arCount,
  outstandingPayables,
  apCount,
  totalCashBank,
  accountCount,
}: {
  totalRevenue: number;
  outstandingReceivables: number;
  arCount: number;
  outstandingPayables: number;
  apCount: number;
  totalCashBank: number;
  accountCount: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<TrendingUp className="h-4 w-4" />}
        label="Total Revenue (MTD)"
        value={formatCurrency(totalRevenue)}
        change={12}
        changeLabel="vs last month"
        href="/dashboard/reports"
      />
      <StatCard
        icon={<FileText className="h-4 w-4" />}
        label="Outstanding AR"
        value={formatCurrency(outstandingReceivables)}
        change={-5}
        changeLabel={`${arCount} invoices`}
        href="/dashboard/ar/invoices"
      />
      <StatCard
        icon={<CreditCard className="h-4 w-4" />}
        label="Outstanding AP"
        value={formatCurrency(outstandingPayables)}
        change={8}
        changeLabel={`${apCount} bills`}
        href="/dashboard/ap/invoices"
      />
      <StatCard
        icon={<Landmark className="h-4 w-4" />}
        label="Cash & Bank"
        value={formatCurrency(totalCashBank)}
        change={3}
        changeLabel={`${accountCount} accounts`}
        href="/dashboard/treasury"
      />
    </div>
  );
}

// ─── Agent Activity Feed ───────────────────────────────────────────────

function AgentActivityFeed() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agent Activity Feed
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <AgentActivityItem
            agent="AP"
            action="processed 3 supplier invoices from Basiq Trading"
            timestamp="2 min ago"
            entity="Acme Corp"
            confidence="high"
          />
          <AgentActivityItem
            agent="Ledger"
            action="posted journal entry #1042 — Depreciation for June"
            timestamp="15 min ago"
            confidence="high"
          />
          <AgentActivityItem
            agent="Cash"
            action="flagged unreconciled transaction in MTN MoMo"
            timestamp="1 hour ago"
            confidence="medium"
            source="MTN Mobile Money Statement"
            reasoning="Transaction amount GHS 450.00 appears on mobile statement but no matching ledger entry found."
          />
          <AgentActivityItem
            agent="Reconciliation"
            action="matched 42 of 45 bank transactions for Main Operating account"
            timestamp="2 hours ago"
            confidence="high"
          />
          <AgentActivityItem
            agent="AR"
            action="sent payment reminders to 5 overdue customers"
            timestamp="5 hours ago"
            entity="Acme Corp"
            confidence="high"
          />
          <AgentActivityItem
            agent="Compliance"
            action="verified PAYE filing for Q2 2026"
            timestamp="3 hours ago"
            confidence="high"
          />
        </div>
        <Link href="/dashboard/audit-log">
          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
            View full audit trail <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── All Approvals Queue ───────────────────────────────────────────────

function AllApprovalsQueue() {
  const { data: stats } = trpc.ingestion.getStats.useQuery(undefined, {
    refetchInterval: 60000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Approval Queues
          </CardTitle>
          <Link href="/dashboard/review-queue">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              View all <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10">
                <FileText className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Ingestion Reviews</p>
                <p className="text-xs text-muted-foreground">
                  Documents needing verification
                </p>
              </div>
            </div>
            <Badge variant="secondary">{stats?.pendingReview ?? 0}</Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                <Bot className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Agent Proposals</p>
                <p className="text-xs text-muted-foreground">
                  AI-suggested actions awaiting approval
                </p>
              </div>
            </div>
            <Badge variant="secondary">0</Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Exceptions & Flags</p>
                <p className="text-xs text-muted-foreground">
                  Items flagged by agent workforce
                </p>
              </div>
            </div>
            <Badge
              variant={(stats?.failed ?? 0) > 0 ? "destructive" : "secondary"}
            >
              {stats?.failed ?? 0}
            </Badge>
          </div>

          {(stats?.failed ?? 0) > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>
                {stats?.failed} critical item{stats?.failed !== 1 ? "s" : ""}{" "}
                require immediate attention
              </span>
            </div>
          )}

          <Link href="/dashboard/review-queue">
            <Button variant="default" size="sm" className="w-full gap-1.5">
              Open Unified Approval Queue
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Compliance Calendar ───────────────────────────────────────────────

function ComplianceCalendar() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Compliance Calendar
          </CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Q2 PAYE Filing</p>
                <p className="text-xs text-muted-foreground">Filed Jul 14</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-emerald-600 border-emerald-200"
            >
              Complete
            </Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium">VAT Return</p>
                <p className="text-xs text-muted-foreground">
                  Due Aug 15 · 20 days away
                </p>
              </div>
            </div>
            <Badge variant="secondary">Pending</Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                <CalendarDays className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium">WHT Certificate</p>
                <p className="text-xs text-muted-foreground">
                  Due Sep 30 · 66 days away
                </p>
              </div>
            </div>
            <Badge variant="outline">Scheduled</Badge>
          </div>
        </div>
        <Link href="/dashboard/tax-compliance/pipeline">
          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
            View compliance dashboard <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Cash Position Deep Dive ──────────────────────────────────────────

function CashPositionDeepDive({
  bankBalance,
  mobileMoney,
  cashTills,
  lastSync,
}: {
  bankBalance: number;
  mobileMoney: number;
  cashTills: number;
  lastSync?: { status: string; lastSyncAt?: string; recordCount?: number };
}) {
  const total = bankBalance + mobileMoney + cashTills;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Cash Position Detail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Liquidity</p>
            <p className="text-3xl font-bold">{formatCurrency(total)}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {bankBalance > 0 && mobileMoney > 0 && cashTills > 0
              ? "Diversified"
              : "Concentrated"}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="flex items-center gap-3">
              <Landmark className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Bank Accounts</p>
                <p className="text-xs text-muted-foreground">
                  2 active accounts
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {formatCurrency(bankBalance)}
            </p>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">Mobile Money</p>
                <p className="text-xs text-muted-foreground">
                  Wave, MTN, Orange
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {formatCurrency(mobileMoney)}
            </p>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Cash Tills</p>
                <p className="text-xs text-muted-foreground">
                  Petty cash & registers
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {formatCurrency(cashTills)}
            </p>
          </div>
        </div>

        {lastSync && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            <span>
              Last sync:{" "}
              {lastSync.lastSyncAt
                ? new Date(lastSync.lastSyncAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "N/A"}
            </span>
            <span>· {lastSync.status}</span>
            <span>· {lastSync.recordCount ?? 0} records</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Consolidation Status Widget ───────────────────────────────────────

function ConsolidationStatusWidget() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Consolidation
          </CardTitle>
          <GitBranch className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10">
            <Network className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Group Structure</p>
            <p className="text-xs text-muted-foreground">
              3 entities · 1 parent + 2 subsidiaries
            </p>
          </div>
        </div>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3" />
              <span>Subsidiaries</span>
            </div>
            <span className="font-medium">2</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Network className="h-3 w-3" />
              <span>IC Transactions</span>
            </div>
            <span className="font-medium">12</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <PlayCircle className="h-3 w-3" />
              <span>Eliminations</span>
            </div>
            <span className="font-medium">8</span>
          </div>
        </div>
        <Link href="/dashboard/consolidation/pipeline">
          <Button variant="outline" size="sm" className="w-full mt-4">
            Open Consolidation
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────

export function FinanceDirectorDashboard() {
  const { entityId } = useEntity();

  const { data: arInvoices, isLoading: arLoading } =
    trpc.ar.listInvoices.useQuery({});
  const { data: apInvoices, isLoading: apLoading } =
    trpc.ap.listInvoices.useQuery(undefined);
  const { data: bankAccounts, isLoading: bankLoading } =
    trpc.treasury.listBankAccounts.useQuery(undefined);
  const { data: cashAccounts, isLoading: cashLoading } =
    trpc.cash.listCashAccounts.useQuery(undefined);
  const { data: consolidationStatus, isLoading: consLoading } =
    trpc.consolidation.getStatus.useQuery(undefined, { enabled: !!entityId });
  const { data: bankSyncStatus } = trpc.treasury.getLastSync.useQuery(
    undefined,
    { enabled: !!entityId, refetchInterval: 120000 },
  );

  const isLoading =
    arLoading || apLoading || bankLoading || cashLoading || consLoading;

  const metrics = useMemo(() => {
    const ar = (arInvoices ?? []) as SalesInvoice[];
    const ap = (apInvoices ?? []) as ApInvoice[];
    const bank = (bankAccounts ?? []) as BankAccount[];
    const cash = (cashAccounts ?? []) as CashAccount[];

    const bankBalance = bank
      .filter((b) => b.isActive)
      .reduce((s, b) => s + parseFloat(b.currentBalance), 0);
    const cashBalance = cash
      .filter((c) => c.isActive)
      .reduce((s, c) => s + parseFloat(c.currentBalance), 0);

    const totalRevenue = ar
      .filter((inv) => inv.status === "paid")
      .reduce((s, inv) => s + parseFloat(inv.totalAmount), 0);

    const outstandingReceivables = ar
      .filter((inv) => inv.status === "pending" || inv.status === "partial")
      .reduce((s, inv) => s + parseFloat(inv.balance), 0);
    const arCount = ar.filter(
      (inv) => inv.status === "pending" || inv.status === "partial",
    ).length;

    const outstandingPayables = ap
      .filter((inv) => inv.status === "pending" || inv.status === "partial")
      .reduce((s, inv) => s + parseFloat(inv.balance), 0);
    const apCount = ap.filter(
      (inv) => inv.status === "pending" || inv.status === "partial",
    ).length;

    return {
      totalRevenue,
      outstandingReceivables,
      arCount,
      outstandingPayables,
      apCount,
      bankBalance,
      cashBalance,
      totalCashBank: bankBalance + cashBalance,
      accountCount:
        bank.filter((b) => b.isActive).length +
        cash.filter((c) => c.isActive).length,
    };
  }, [arInvoices, apInvoices, bankAccounts, cashAccounts]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Finance Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full financial oversight — agent activity, approvals, compliance,
            and group consolidation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Shield className="h-3 w-3" />
            Finance Director
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <KeyMetricsGrid
        totalRevenue={metrics.totalRevenue}
        outstandingReceivables={metrics.outstandingReceivables}
        arCount={metrics.arCount}
        outstandingPayables={metrics.outstandingPayables}
        apCount={metrics.apCount}
        totalCashBank={metrics.totalCashBank}
        accountCount={metrics.accountCount}
      />

      {/* Main Content: 3-column layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Agent Activity Feed */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity" className="gap-1.5">
                <Bot className="h-3.5 w-3.5" />
                Agent Activity
              </TabsTrigger>
              <TabsTrigger value="cash" className="gap-1.5">
                <Wallet className="h-3.5 w-3.5" />
                Cash Position
              </TabsTrigger>
            </TabsList>
            <TabsContent value="activity" className="mt-4">
              <AgentActivityFeed />
            </TabsContent>
            <TabsContent value="cash" className="mt-4">
              <CashPositionDeepDive
                bankBalance={metrics.bankBalance}
                mobileMoney={0}
                cashTills={metrics.cashBalance}
                lastSync={
                  bankSyncStatus
                    ? {
                        status: bankSyncStatus.status,
                        lastSyncAt: bankSyncStatus.lastSyncAt ?? undefined,
                        recordCount: bankSyncStatus.recordCount ?? 0,
                      }
                    : undefined
                }
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Approvals + Compliance + Consolidation */}
        <div className="space-y-4">
          <AllApprovalsQueue />
          <ComplianceCalendar />
          <ConsolidationStatusWidget />
        </div>
      </div>
    </div>
  );
}
