"use client";

import { useMemo } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/shared/loading";
import { Badge, Card, CardContent } from "@/components/ui";
import {
  Landmark,
  Smartphone,
  Wallet,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

type RailTileProps = {
  icon: React.ReactNode;
  label: string;
  balance: number;
  lastReconciled: string | null;
  unresolvedCount: number;
  href: string;
  count: number;
  color: string;
  bgColor: string;
};

function RailTile({
  icon,
  label,
  balance,
  lastReconciled,
  unresolvedCount,
  href,
  count,
  color,
  bgColor,
}: RailTileProps) {
  return (
    <Link href={href}>
      <Card className="transition-all hover:shadow-md cursor-pointer h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                bgColor,
              )}
            >
              <div className={color}>{icon}</div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {count} account{count !== 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold mb-3">{formatCurrency(balance)}</p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Last reconciled</span>
              <span>{lastReconciled ?? "Never"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Unresolved items</span>
              {unresolvedCount > 0 ? (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <AlertCircle className="h-3 w-3" />
                  {unresolvedCount}
                </span>
              ) : (
                <span className="text-emerald-600">None</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function CashOverviewPage() {
  const { data: bankAccounts, isLoading: bankLoading } =
    trpc.treasury.listBankAccounts.useQuery();
  const { data: mobileAccounts, isLoading: mobileLoading } =
    trpc.mobileMoney.listAccounts.useQuery();
  const { data: cashAccounts, isLoading: cashLoading } =
    trpc.cash.listCashAccounts.useQuery();
  const { data: floats } = trpc.cash.listImprestFloats.useQuery();

  const isLoading = bankLoading || mobileLoading || cashLoading;

  const summary = useMemo(() => {
    const bankBalance = (bankAccounts ?? []).reduce(
      (s, a) => s + Number(a.currentBalance),
      0,
    );
    const mobileBalance = (mobileAccounts ?? []).reduce(
      (s, a) => s + Number(a.currentBalance ?? 0),
      0,
    );
    const cashBalance = (cashAccounts ?? []).reduce(
      (s, a) => s + Number(a.currentBalance),
      0,
    );
    const floatTotal = (floats ?? [])
      .filter((f) => f.status === "active")
      .reduce((s, f) => s + Number(f.remainingBalance), 0);
    return {
      total: bankBalance + mobileBalance + cashBalance,
      bankBalance,
      mobileBalance,
      cashBalance,
      floatTotal,
    };
  }, [bankAccounts, mobileAccounts, cashAccounts, floats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Cash Overview"
          description="Cash position across all rails"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Overview"
        description="Consolidated cash position across all rails"
      />

      {/* Total cash bar */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background border-primary/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Cash Position
              </p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(summary.total)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-xs text-muted-foreground">
                <p>Outstanding floats</p>
                <p className="font-medium text-foreground">
                  {formatCurrency(summary.floatTotal)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex h-3 gap-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{
                width: `${summary.total > 0 ? (summary.bankBalance / summary.total) * 100 : 0}%`,
              }}
            />
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${summary.total > 0 ? (summary.mobileBalance / summary.total) * 100 : 0}%`,
              }}
            />
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{
                width: `${summary.total > 0 ? (summary.cashBalance / summary.total) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              Bank: {formatCurrency(summary.bankBalance)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Mobile: {formatCurrency(summary.mobileBalance)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Cash: {formatCurrency(summary.cashBalance)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tiles per rail */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RailTile
          icon={<Landmark className="h-6 w-6" />}
          label="Bank Accounts"
          balance={summary.bankBalance}
          lastReconciled={null}
          unresolvedCount={0}
          href="/dashboard/treasury"
          count={bankAccounts?.length ?? 0}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-950/30"
        />
        <RailTile
          icon={<Smartphone className="h-6 w-6" />}
          label="Mobile Money"
          balance={summary.mobileBalance}
          lastReconciled={null}
          unresolvedCount={0}
          href="/dashboard/mobile-money"
          count={mobileAccounts?.length ?? 0}
          color="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-50 dark:bg-emerald-950/30"
        />
        <RailTile
          icon={<Wallet className="h-6 w-6" />}
          label="Cash & Imprest"
          balance={summary.cashBalance}
          lastReconciled={null}
          unresolvedCount={
            (floats ?? []).filter((f) => f.status === "active").length
          }
          href="/dashboard/cash"
          count={cashAccounts?.length ?? 0}
          color="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-50 dark:bg-amber-950/30"
        />
      </div>
    </div>
  );
}
