"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { AgentActivityItem } from "@/components/dashboard/agent-activity-item";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { formatCurrency, cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Bot,
  Clock,
  FileText,
  CreditCard,
  MessageSquare,
  Send,
  Activity,
} from "lucide-react";

/**
 * Account/Business Owner Dashboard
 *
 * Per Architecture Doc §5:
 * Shows cash position, close status, CFO Agent summary, approvals needing them.
 * Designed for the business owner who needs a quick pulse check on finances.
 */

// ─── Types ──────────────────────────────────────────────────────────────

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

// ─── Health Score ───────────────────────────────────────────────────────

function computeHealthScore(
  totalCashBank: number,
  outstandingReceivables: number,
  outstandingPayables: number,
  totalPendingApprovals: number,
) {
  let score = 100;
  if (outstandingReceivables > 100000) score -= 15;
  if (outstandingPayables > 100000) score -= 15;
  if (totalCashBank < 10000) score -= 20;
  if (totalPendingApprovals > 10) score -= 5;
  score = Math.max(0, Math.min(100, score));

  const label = score >= 80 ? "Good" : score >= 50 ? "Fair" : "Needs attention";
  const trend: "up" | "down" | "neutral" =
    score >= 80 ? "up" : score >= 50 ? "neutral" : "down";
  return { score, label, trend };
}

function HealthScoreBadge({
  score,
  label,
  trend,
}: {
  score: number;
  label: string;
  trend: "up" | "down" | "neutral";
}) {
  const color =
    score >= 80
      ? "text-emerald-500"
      : score >= 50
        ? "text-amber-500"
        : "text-red-500";
  const bg =
    score >= 80
      ? "bg-emerald-500/10"
      : score >= 50
        ? "bg-amber-500/10"
        : "bg-red-500/10";
  return (
    <div className={cn("rounded-xl border p-5", bg)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Financial Health
          </p>
          <div className={cn("text-3xl font-bold", color)}>{score}</div>
          <p className={cn("text-sm font-medium mt-0.5", color)}>{label}</p>
        </div>
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full",
            bg,
          )}
        >
          {trend === "up" && <TrendingUp className={cn("h-7 w-7", color)} />}
          {trend === "down" && (
            <TrendingDown className={cn("h-7 w-7", color)} />
          )}
          {trend === "neutral" && <Minus className={cn("h-7 w-7", color)} />}
        </div>
      </div>
    </div>
  );
}

// ─── Cash Position Bar ─────────────────────────────────────────────────

function CashPositionBar({
  bankBalance,
  mobileMoney,
  cashTills,
}: {
  bankBalance: number;
  mobileMoney: number;
  cashTills: number;
}) {
  const total = bankBalance + mobileMoney + cashTills;
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Cash Position
      </p>
      <div className="flex items-end justify-between mb-3">
        <p className="text-2xl font-bold">{formatCurrency(total)}</p>
        <Badge variant="outline" className="text-xs">
          Total across all accounts
        </Badge>
      </div>
      <div className="flex h-2.5 gap-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{
            width: `${total > 0 ? (bankBalance / total) * 100 : 0}%`,
          }}
        />
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{
            width: `${total > 0 ? (mobileMoney / total) * 100 : 0}%`,
          }}
        />
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{
            width: `${total > 0 ? (cashTills / total) * 100 : 0}%`,
          }}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Bank</span>
          <span className="ml-auto font-medium tabular-nums">
            {formatCurrency(bankBalance)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Mobile</span>
          <span className="ml-auto font-medium tabular-nums">
            {formatCurrency(mobileMoney)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Cash</span>
          <span className="ml-auto font-medium tabular-nums">
            {formatCurrency(cashTills)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Approvals Widget ────────────────────────────────────────────

function QuickApprovalsWidget() {
  const { data: pendingCount } = trpc.ingestion.getStats.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const reviewCount = pendingCount?.pendingReview ?? 0;
  const failedCount = pendingCount?.failed ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pending Your Review
          </CardTitle>
          <Link href="/dashboard/review-queue">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              View all <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {reviewCount > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {reviewCount} items pending review
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {failedCount > 0
                      ? `${failedCount} flagged as critical`
                      : "No critical items"}
                  </p>
                </div>
              </div>
              <Badge variant={reviewCount > 5 ? "destructive" : "secondary"}>
                {reviewCount}
              </Badge>
            </div>

            {failedCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/20 px-3 py-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-medium">{failedCount} critical</span>
                <span className="text-red-500/70">
                  need immediate attention
                </span>
              </div>
            )}

            <Link href="/dashboard/review-queue">
              <Button size="sm" className="w-full gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Review Items
              </Button>
            </Link>
          </div>
        ) : (
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
            title="All caught up"
            description="No items need your review right now."
            className="py-4"
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Close Status Widget ───────────────────────────────────────────────

function CloseStatusWidget() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Close Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Books current</p>
            <p className="text-xs text-muted-foreground">
              Next close due in 12 days
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress this period</span>
            <span>June completed</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-[85%] rounded-full bg-emerald-500" />
          </div>
        </div>
        <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />{" "}
            Controller confirmed
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />{" "}
            Treasury confirmed
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-amber-500 shrink-0" />{" "}
            Compliance pending
          </div>
        </div>
        <Link href="/dashboard/close">
          <Button variant="outline" size="sm" className="w-full mt-4">
            Open Close Center
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── CFO Agent Summary ─────────────────────────────────────────────────

function CfoAgentSummary() {
  const router = useRouter();
  const [input, setInput] = useState("");

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-primary/[0.03] to-background border-primary/10">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">Ask your CFO Agent</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Get a quick pulse on cash flow, outstanding invoices, or any
              question about your business.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) {
                  router.push(
                    `/dashboard/chat?initial=${encodeURIComponent(input.trim())}`,
                  );
                }
              }}
              className="relative mt-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your finances..."
                className="w-full rounded-lg border bg-background px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md"
                disabled={!input.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                "What's my cash position?",
                "Any pending approvals?",
                "Summarize this month",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/dashboard/chat?initial=${encodeURIComponent(prompt)}`,
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────

export function OwnerDashboard() {
  const { entityId } = useEntity();

  const { data: arInvoices, isLoading: arLoading } =
    trpc.ar.listInvoices.useQuery({});
  const { data: apInvoices, isLoading: apLoading } =
    trpc.ap.listInvoices.useQuery(undefined);
  const { data: bankAccounts, isLoading: bankLoading } =
    trpc.treasury.listBankAccounts.useQuery(undefined);
  const { data: cashAccounts, isLoading: cashLoading } =
    trpc.cash.listCashAccounts.useQuery(undefined);

  const isLoading = arLoading || apLoading || bankLoading || cashLoading;

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

    const outstandingPayables = ap
      .filter((inv) => inv.status === "pending" || inv.status === "partial")
      .reduce((s, inv) => s + parseFloat(inv.balance), 0);

    return {
      totalRevenue,
      outstandingReceivables,
      outstandingPayables,
      bankBalance,
      cashBalance,
      totalCashBank: bankBalance + cashBalance,
      totalPendingApprovals: 0,
    };
  }, [arInvoices, apInvoices, bankAccounts, cashAccounts]);

  const health = computeHealthScore(
    metrics.totalCashBank,
    metrics.outstandingReceivables,
    metrics.outstandingPayables,
    metrics.totalPendingApprovals,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Business Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s your financial pulse at a glance.
        </p>
      </div>

      {/* Row 1: Health Score + Cash Position + Close Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <HealthScoreBadge
          score={health.score}
          label={health.label}
          trend={health.trend}
        />
        <CashPositionBar
          bankBalance={metrics.bankBalance}
          mobileMoney={0}
          cashTills={metrics.cashBalance}
        />
        <CloseStatusWidget />
      </div>

      {/* Row 2: Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Revenue (MTD)"
          value={formatCurrency(metrics.totalRevenue)}
          changeLabel="This month"
          href="/dashboard/reports"
        />
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Outstanding Receivables"
          value={formatCurrency(metrics.outstandingReceivables)}
          changeLabel="Money owed to you"
          href="/dashboard/ar/invoices"
        />
        <StatCard
          icon={<CreditCard className="h-4 w-4" />}
          label="Outstanding Payables"
          value={formatCurrency(metrics.outstandingPayables)}
          changeLabel="Bills to pay"
          href="/dashboard/ap/invoices"
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Total Cash & Bank"
          value={formatCurrency(metrics.totalCashBank)}
          changeLabel="Liquid assets"
          href="/dashboard/treasury"
        />
      </div>

      {/* Row 3: Approvals + CFO Agent */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <QuickApprovalsWidget />
        </div>
        <div className="lg:col-span-3">
          <CfoAgentSummary />
        </div>
      </div>

      {/* Row 4: Agent Activity Feed */}
      <AgentActivityFeed />
    </div>
  );
}

// ─── Agent Activity Feed ────────────────────────────────────────────────

function AgentActivityFeed() {
  const { data: activities, isLoading } =
    trpc.ingestion.listRecentActivity.useQuery({ limit: 20 });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Agent Activity Feed
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : !activities || activities.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-8 w-8" />}
            title="No agent activity yet"
            description="Agent actions will appear here as your AI workforce processes documents and transactions."
            className="py-4"
          />
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {activities.map((item) => (
              <AgentActivityItem
                key={item.id}
                agent={item.agent}
                action={item.description || item.action}
                timestamp={formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                })}
                entity={item.entityId?.slice(0, 8)}
                confidence={
                  item.confidence === null
                    ? undefined
                    : item.confidence >= 0.9
                      ? "high"
                      : item.confidence >= 0.7
                        ? "medium"
                        : "low"
                }
                source={(item.metadata?.sourceDocument as string) ?? undefined}
                reasoning={(item.metadata?.reasoning as string) ?? undefined}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
