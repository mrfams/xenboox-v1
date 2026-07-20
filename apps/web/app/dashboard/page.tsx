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
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/loading";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ConfidenceBadge } from "@/components/dashboard/confidence-badge";
import { AgentActivityItem } from "@/components/dashboard/agent-activity-item";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DollarSign,
  FileText,
  CreditCard,
  Landmark,
  Wallet,
  BookOpen,
  Upload,
  Send,
  ArrowUpRight,
  Bot,
  Clock,
  MessageSquare,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
type JournalEntry = {
  id: string;
  entryNumber: number;
  description: string;
  date: string;
  status: string;
};
type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: string;
  totalAmount: string;
  orderDate: string;
};

// ─── Health Score ──────────────────────────────────────────────────────────────

function computeHealthScore(metrics: ReturnType<typeof computeMetrics>) {
  if (!metrics)
    return { score: 0, label: "No data", trend: "neutral" as const };
  let score = 100;
  if (metrics.outstandingReceivables > 100000) score -= 15;
  if (metrics.outstandingPayables > 100000) score -= 15;
  if (metrics.totalCashBank < 10000) score -= 20;
  if (metrics.outstandingReceivables > 0 && metrics.totalRevenue === 0)
    score -= 10;
  if (metrics.totalPendingApprovals > 10) score -= 5;
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
    <div className={cn("flex items-center gap-3 rounded-xl border p-4", bg)}>
      <div className={cn("text-3xl font-bold", color)}>{score}</div>
      <div>
        <p className={cn("text-sm font-semibold", color)}>{label}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {trend === "up" && (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          )}
          {trend === "down" && (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          Financial Health
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding View ──────────────────────────────────────────────────────────

function OnboardingView() {
  const router = useRouter();
  const [chatMessage, setChatMessage] = useState("");

  const suggestedPrompts = [
    {
      text: "Set up my chart of accounts for a trading business",
      icon: BookOpen,
    },
    { text: "I want to connect my bank account", icon: Landmark },
    { text: "I have invoices to upload", icon: FileText },
    {
      text: "What accounting software can you import from?",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Welcome to Xenboox</h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Your AI accounting team is ready. Tell your agent what to do —
              connect your bank, upload documents, or ask anything about your
              finances.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  router.push(
                    `/dashboard/chat?initial=${encodeURIComponent(chatMessage.trim())}`,
                  )
                }
                placeholder="Ask your AI anything — or start by describing your business..."
                className="w-full rounded-xl border bg-background px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
              />
              <Button
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
                onClick={() =>
                  router.push(
                    `/dashboard/chat?initial=${encodeURIComponent(chatMessage.trim())}`,
                  )
                }
                disabled={!chatMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt) => {
              const Icon = prompt.icon;
              return (
                <button
                  key={prompt.text}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/dashboard/chat?initial=${encodeURIComponent(prompt.text)}`,
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-background/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  <Icon className="h-3 w-3" />
                  {prompt.text}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Get Started
          </h2>
          <QuickActions
            onAction={(id: string) => {
              if (id === "connect-bank" || id === "email-forwarding")
                router.push("/dashboard/integrations");
              else if (id === "document-uploaded")
                router.push("/dashboard/documents");
            }}
          />
        </div>
        <OnboardingChecklist onAction={() => {}} />
      </div>
    </div>
  );
}

// ─── Metrics ───────────────────────────────────────────────────────────────────

function computeMetrics(
  arInvoices: SalesInvoice[],
  apInvoices: ApInvoice[],
  bankAccounts: BankAccount[],
  cashAccounts: CashAccount[],
  journalEntries: JournalEntry[],
  poList: PurchaseOrder[],
) {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const totalRevenue = arInvoices
    .filter(
      (inv) => inv.status === "paid" && inv.invoiceDate.startsWith(thisMonth),
    )
    .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

  const outstandingReceivables = arInvoices
    .filter((inv) => inv.status === "pending" || inv.status === "partial")
    .reduce((sum, inv) => sum + parseFloat(inv.balance), 0);
  const arCount = arInvoices.filter(
    (inv) => inv.status === "pending" || inv.status === "partial",
  ).length;

  const outstandingPayables = apInvoices
    .filter((inv) => inv.status === "pending" || inv.status === "partial")
    .reduce((sum, inv) => sum + parseFloat(inv.balance), 0);
  const apCount = apInvoices.filter(
    (inv) => inv.status === "pending" || inv.status === "partial",
  ).length;

  const bankBalance = bankAccounts
    .filter((b) => b.isActive)
    .reduce((sum, b) => sum + parseFloat(b.currentBalance), 0);
  const cashBalance = cashAccounts
    .filter((c) => c.isActive)
    .reduce((sum, c) => sum + parseFloat(c.currentBalance), 0);
  const totalCashBank = bankBalance + cashBalance;
  const accountCount =
    bankAccounts.filter((b) => b.isActive).length +
    cashAccounts.filter((c) => c.isActive).length;

  const pendingPOs = poList.filter((po) => po.status === "submitted");
  const pendingApInvoices = apInvoices.filter(
    (inv) => inv.status === "pending",
  );
  const totalPendingApprovals = pendingPOs.length + pendingApInvoices.length;

  return {
    totalRevenue,
    outstandingReceivables,
    arCount,
    outstandingPayables,
    apCount,
    totalCashBank,
    accountCount,
    totalPendingApprovals,
    pendingPOs,
    pendingApInvoices,
  };
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { entityId } = useEntity();
  const router = useRouter();

  const {
    data: arInvoices,
    isLoading: arLoading,
    error: arError,
  } = trpc.ar.listInvoices.useQuery();
  const {
    data: apInvoices,
    isLoading: apLoading,
    error: apError,
  } = trpc.ap.listInvoices.useQuery();
  const {
    data: poList,
    isLoading: poLoading,
    error: poError,
  } = trpc.ap.listPOs.useQuery();
  const {
    data: bankAccounts,
    isLoading: bankLoading,
    error: bankError,
  } = trpc.treasury.listBankAccounts.useQuery();
  const {
    data: cashAccounts,
    isLoading: cashLoading,
    error: cashError,
  } = trpc.cash.listCashAccounts.useQuery();

  if (arError) toast.error("Failed to load receivables");
  if (apError) toast.error("Failed to load payables");
  if (poError) toast.error("Failed to load purchase orders");
  if (bankError) toast.error("Failed to load bank accounts");
  if (cashError) toast.error("Failed to load cash accounts");

  const isLoading =
    arLoading || apLoading || poLoading || bankLoading || cashLoading;

  const hasData = useMemo(() => {
    if (isLoading) return null;
    return (
      (arInvoices ?? []).length > 0 ||
      (apInvoices ?? []).length > 0 ||
      (bankAccounts ?? []).length > 0 ||
      (cashAccounts ?? []).length > 0 ||
      (poList ?? []).length > 0
    );
  }, [arInvoices, apInvoices, bankAccounts, cashAccounts, poList, isLoading]);

  const metrics = useMemo(
    () =>
      computeMetrics(
        (arInvoices ?? []) as SalesInvoice[],
        (apInvoices ?? []) as ApInvoice[],
        (bankAccounts ?? []) as BankAccount[],
        (cashAccounts ?? []) as CashAccount[],
        [] as JournalEntry[],
        (poList ?? []) as PurchaseOrder[],
      ),
    [arInvoices, apInvoices, bankAccounts, cashAccounts, poList],
  );

  const health = computeHealthScore(metrics);

  if (hasData === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!hasData) return <OnboardingView />;

  return (
    <div className="space-y-6">
      {/* Row 1: Financial Health + Cash Position */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Financial Health Score */}
        <div className="md:col-span-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Financial Health
          </p>
          <HealthScoreBadge
            score={health.score}
            label={health.label}
            trend={health.trend}
          />
        </div>

        {/* Cash Position Strip */}
        <div className="md:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cash Position
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Bank Accounts</p>
              <p className="text-xl font-bold mt-1">
                {formatCurrency(
                  (bankAccounts ?? [])
                    .filter((b: BankAccount) => b.isActive)
                    .reduce(
                      (s: number, b: BankAccount) =>
                        s + parseFloat(b.currentBalance),
                      0,
                    ),
                )}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Mobile Money</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(0)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Cash Tills</p>
              <p className="text-xl font-bold mt-1">
                {formatCurrency(
                  (cashAccounts ?? [])
                    .filter((c: CashAccount) => c.isActive)
                    .reduce(
                      (s: number, c: CashAccount) =>
                        s + parseFloat(c.currentBalance),
                      0,
                    ),
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          changeLabel="This month"
          href="/dashboard/ar/invoices"
        />
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Outstanding Receivables"
          value={formatCurrency(metrics.outstandingReceivables)}
          changeLabel={`${metrics.arCount} invoices`}
          href="/dashboard/ar/invoices"
        />
        <StatCard
          icon={<CreditCard className="h-4 w-4" />}
          label="Outstanding Payables"
          value={formatCurrency(metrics.outstandingPayables)}
          changeLabel={`${metrics.apCount} bills`}
          href="/dashboard/ap/invoices"
        />
        <StatCard
          icon={<Landmark className="h-4 w-4" />}
          label="Cash & Bank"
          value={formatCurrency(metrics.totalCashBank)}
          changeLabel={`${metrics.accountCount} accounts`}
          href="/dashboard/treasury"
        />
      </div>

      {/* Row 3: Approval Queue Preview + Close Status */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Approval Queue Preview */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approval Queue
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {metrics.totalPendingApprovals}
                </Badge>
                <Link href="/dashboard/approvals">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                  >
                    View all <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {metrics.totalPendingApprovals === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
                title="All clear"
                description="No pending approvals."
                className="py-6"
              />
            ) : (
              <div className="space-y-2">
                {metrics.pendingPOs.slice(0, 3).map((po: PurchaseOrder) => (
                  <Link
                    key={po.id}
                    href={`/dashboard/ap/pos/${po.id}`}
                    className="flex items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">PO {po.poNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {po.orderDate} ·{" "}
                        {formatCurrency(parseFloat(po.totalAmount))}
                      </p>
                    </div>
                    <Badge variant="secondary">{po.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Close Status Card */}
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
                <p className="text-sm font-medium">Books closed through June</p>
                <p className="text-xs text-muted-foreground">
                  Closing July in 12 days
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>June completed</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[85%] rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Controller
                confirmed
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Treasury
                confirmed
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border-2 border-amber-500" />{" "}
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
      </div>

      {/* Row 4: Agent Activity Feed */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agent Activity
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {entityId ? (
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
                agent="Compliance"
                action="verified PAYE filing for Q2 2026"
                timestamp="3 hours ago"
                confidence="high"
              />
              <AgentActivityItem
                agent="AR"
                action="sent payment reminders to 5 overdue customers"
                timestamp="5 hours ago"
                entity="Acme Corp"
                confidence="high"
              />
            </div>
          ) : (
            <EmptyState
              icon={<Bot className="h-8 w-8" />}
              title="No entity selected"
              description="Select an organization to see agent activity."
              className="py-6"
            />
          )}
        </CardContent>
      </Card>

      {/* Row 5: CFO Chat Entry */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/[0.03] to-background border-primary/10">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Ask your CFO Agent anything</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Get insights on cash flow, anomalies, pending approvals, or any
                financial question.
              </p>
              <div className="mt-3 flex gap-2">
                <Link href="/dashboard/chat?initial=What%27s%20my%20cash%20position%3F">
                  <Button variant="outline" size="sm" className="text-xs">
                    What&apos;s my cash position?
                  </Button>
                </Link>
                <Link href="/dashboard/chat?initial=Any%20pending%20approvals%3F">
                  <Button variant="outline" size="sm" className="text-xs">
                    Any pending approvals?
                  </Button>
                </Link>
                <Link href="/dashboard/chat?initial=Summarize%20this%20month%27s%20P%26L">
                  <Button variant="outline" size="sm" className="text-xs">
                    Summarize P&amp;L
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
