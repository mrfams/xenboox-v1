"use client";

import { useMemo } from "react";
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
import { formatCurrency, cn } from "@/lib/utils";
import {
  FileText,
  FileSearch,
  Eye,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Clock,
  Receipt,
  Sparkles,
  Send,
  Bot,
  ArrowUpRight,
  Search,
  BookOpen,
  Ban,
} from "lucide-react";

/**
 * Accountant / Bookkeeper Dashboard
 *
 * Per Architecture Doc §5:
 * Shows exception queue, document inbox, and transaction feed.
 * Designed for the accountant who reviews transactions, manages documents,
 * and keeps the books up to date.
 */

// ─── Types ──────────────────────────────────────────────────────────────

type Document = {
  id: string;
  name: string;
  type: string;
  status: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string | Date;
};

type JournalEntry = {
  id: string;
  entryNumber: number | null;
  description: string;
  date: string;
  status: string;
  source: string | null;
  confidence: string | null;
  postedAt: string | Date | null;
};

// ─── Exception Queue ──────────────────────────────────────────────────

function ExceptionQueue() {
  const { data: stats, isLoading: statsLoading } =
    trpc.ingestion.getStats.useQuery(undefined, { refetchInterval: 60000 });
  const { data: pendingReviewsData, isLoading: reviewsLoading } =
    trpc.ingestion.listPendingReviews.useQuery(undefined);

  const isLoading = statsLoading || reviewsLoading;
  const reviewCount = stats?.pendingReview ?? 0;
  const failedCount = stats?.failed ?? 0;
  const pendingReviews = pendingReviewsData?.items ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Exception Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Exception Queue
            </CardTitle>
          </div>
          {reviewCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {reviewCount} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {reviewCount === 0 && failedCount === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
            title="No exceptions"
            description="All transactions have been processed. No items need review."
            className="py-2"
          />
        ) : (
          <div className="space-y-2">
            {/* Pending ingestion reviews */}
            {reviewCount > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10">
                    <FileSearch className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Documents Pending Review
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {reviewCount} document{reviewCount !== 1 ? "s" : ""} need
                      {reviewCount === 1 ? "s" : ""} your verification
                      {pendingReviews.length > 0 &&
                        ` · ${pendingReviews[0].name}${pendingReviews.length > 1 ? ` +${pendingReviews.length - 1} more` : ""}`}
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/review-queue">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs shrink-0"
                  >
                    Review <Eye className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Failed items */}
            {failedCount > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/20 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10">
                    <Ban className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Failed Items</p>
                    <p className="text-xs text-muted-foreground">
                      {failedCount} item{failedCount !== 1 ? "s" : ""} failed
                      processing — may need manual handling
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/review-queue?status=failed">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs shrink-0"
                  >
                    View <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Agent escalations */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10">
                  <Bot className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Agent Escalations</p>
                  <p className="text-xs text-muted-foreground">
                    Items flagged by AI agents needing human judgment
                  </p>
                </div>
              </div>
              <Link href="/dashboard/review-queue?tab=agents">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-xs shrink-0"
                >
                  View <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            <Link href="/dashboard/review-queue">
              <Button
                variant="default"
                size="sm"
                className="w-full mt-1 gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                Open Review Queue
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Document Inbox ───────────────────────────────────────────────────

function DocumentInbox() {
  const { data: documents, isLoading } =
    trpc.document.listDocuments.useQuery(undefined);

  const grouped = useMemo(() => {
    if (!documents?.length) return null;

    const sorted = [...documents].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const recent = sorted.slice(0, 6);
    const total = sorted.length;

    const statusCounts: Record<string, number> = {};
    for (const doc of sorted) {
      statusCounts[doc.status] = (statusCounts[doc.status] ?? 0) + 1;
    }

    const typeCounts: Record<string, number> = {};
    for (const doc of sorted) {
      typeCounts[doc.type] = (typeCounts[doc.type] ?? 0) + 1;
    }

    return { recent, total, statusCounts, typeCounts };
  }, [documents]);

  const statusConfig: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    detected: {
      label: "Detected",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    processing: {
      label: "Processing",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    extracted: {
      label: "Extracted",
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    synced: {
      label: "Synced",
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    agent_processing: {
      label: "Agent Processing",
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    done: {
      label: "Done",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    failed: {
      label: "Failed",
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  };

  const typeLabels: Record<string, string> = {
    invoice: "Invoice",
    receipt: "Receipt",
    bank_statement: "Bank Statement",
    contract: "Contract",
    voucher: "Voucher",
    tax_return: "Tax Return",
    payroll_report: "Payroll Report",
    journal_entry: "Journal Entry",
    po: "Purchase Order",
    supporting: "Supporting Doc",
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Document Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!grouped) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Document Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<FileText className="h-8 w-8 text-muted-foreground" />}
            title="No documents yet"
            description="Upload a document to get started — drag & drop or use the upload button."
            action={
              <Link href="/dashboard/documents">
                <Button size="sm" className="gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  Upload Document
                </Button>
              </Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Document Inbox
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {grouped.total} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Status summary chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(statusConfig)
            .filter(([key]) => (grouped.statusCounts[key] ?? 0) > 0)
            .map(([key, config]) => (
              <Badge
                key={key}
                variant="secondary"
                className={cn("gap-1 text-[10px]", config.bg)}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    config.color.replace("text-", "bg-"),
                  )}
                />
                {config.label}: {grouped.statusCounts[key]}
              </Badge>
            ))}
        </div>

        {/* Recent documents list */}
        <div className="space-y-1.5">
          {grouped.recent.map((doc) => {
            const status = statusConfig[doc.status] ?? {
              label: doc.status,
              color: "text-muted-foreground",
              bg: "bg-muted",
            };
            return (
              <Link
                key={doc.id}
                href={`/dashboard/documents/${doc.id}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/50 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                      status.bg,
                    )}
                  >
                    <Receipt className={cn("h-3.5 w-3.5", status.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabels[doc.type] ?? doc.type}
                      {doc.createdAt &&
                        ` · ${new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-[10px] font-medium", status.color)}>
                    {status.label}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            );
          })}
        </div>

        {grouped.total > 6 && (
          <Link href="/dashboard/documents">
            <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
              View all {grouped.total} documents{" "}
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Recent Transaction Feed ──────────────────────────────────────────

function TransactionFeed() {
  const { data: entries, isLoading } = trpc.journal.list.useQuery({
    limit: 8,
  });

  const { data: arInvoices } = trpc.ar.listInvoices.useQuery({});
  const { data: apInvoices } = trpc.ap.listInvoices.useQuery(undefined);

  const feed = useMemo(() => {
    const items: Array<{
      id: string;
      type: "journal" | "ar_invoice" | "ap_invoice";
      label: string;
      reference: string;
      timestamp: string;
      status: string;
      amount?: number;
    }> = [];

    // Add journal entries
    const journalItems = (entries ?? []) as JournalEntry[];
    for (const entry of journalItems.slice(0, 5)) {
      items.push({
        id: entry.id,
        type: "journal",
        label: entry.description,
        reference: entry.entryNumber ? `JE #${entry.entryNumber}` : "New entry",
        timestamp: entry.date,
        status: entry.status,
      });
    }

    // Add recent AR invoices
    const arItems = (arInvoices ?? []) as Array<{
      id: string;
      invoiceNumber: string;
      totalAmount: string;
      status: string;
      invoiceDate: string;
    }>;
    for (const inv of arItems.slice(0, 4)) {
      items.push({
        id: inv.id,
        type: "ar_invoice",
        label: `Invoice ${inv.invoiceNumber}`,
        reference: inv.invoiceNumber,
        timestamp: inv.invoiceDate,
        status: inv.status,
        amount: parseFloat(inv.totalAmount),
      });
    }

    // Add recent AP invoices
    const apItems = (apInvoices ?? []) as Array<{
      id: string;
      invoiceNumber: string;
      totalAmount: string;
      status: string;
      invoiceDate: string;
    }>;
    for (const inv of apItems.slice(0, 4)) {
      items.push({
        id: inv.id,
        type: "ap_invoice",
        label: `Bill ${inv.invoiceNumber}`,
        reference: inv.invoiceNumber,
        timestamp: inv.invoiceDate,
        status: inv.status,
        amount: parseFloat(inv.totalAmount),
      });
    }

    // Sort by timestamp descending
    items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return items.slice(0, 10);
  }, [entries, arInvoices, apInvoices]);

  const statusBadge = (
    status: string,
  ): {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  } => {
    switch (status) {
      case "posted":
      case "paid":
        return { label: "Posted", variant: "outline" };
      case "pending":
      case "draft":
        return { label: "Draft", variant: "secondary" };
      case "partial":
        return { label: "Partial", variant: "secondary" };
      case "overdue":
        return { label: "Overdue", variant: "destructive" };
      case "reversed":
      case "voided":
        return { label: "Voided", variant: "outline" };
      default:
        return { label: status, variant: "secondary" };
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "journal":
        return <BookOpen className="h-3.5 w-3.5 text-blue-500" />;
      case "ar_invoice":
        return <Receipt className="h-3.5 w-3.5 text-emerald-500" />;
      case "ap_invoice":
        return <Receipt className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return <FileText className="h-3.5 w-3.5" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (feed.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Search className="h-8 w-8 text-muted-foreground" />}
            title="No transactions yet"
            description="Transactions will appear here once you upload documents or create entries."
            className="py-2"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent Transactions
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {feed.map((item) => {
            const badge = statusBadge(item.status);
            return (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-accent/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    {typeIcon(item.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type === "journal"
                        ? "Journal Entry"
                        : item.type === "ar_invoice"
                          ? "Sales Invoice"
                          : "Bill"}
                      {item.timestamp &&
                        ` · ${new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.amount !== undefined && (
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {formatCurrency(item.amount)}
                    </span>
                  )}
                  <Badge
                    variant={badge.variant}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {badge.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Link href="/dashboard/journal" className="flex-1">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              All Journal Entries <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
          <Link href="/dashboard/reports" className="flex-1">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              Trial Balance <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Quick Stats Row ──────────────────────────────────────────────────

function AccountantQuickStats({
  documentCount,
  reviewCount,
  postedCount,
  auditEntries,
}: {
  documentCount: number;
  reviewCount: number;
  postedCount: number;
  auditEntries: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<FileText className="h-4 w-4" />}
        label="Total Documents"
        value={documentCount.toString()}
        changeLabel="In your document inbox"
        href="/dashboard/documents"
      />
      <StatCard
        icon={<AlertCircle className="h-4 w-4" />}
        label="Pending Review"
        value={reviewCount.toString()}
        changeLabel={reviewCount > 0 ? "Needs attention" : "All clear"}
        href="/dashboard/review-queue"
      />
      <StatCard
        icon={<BookOpen className="h-4 w-4" />}
        label="Posted Entries"
        value={postedCount.toString()}
        changeLabel="Journal entries this period"
        href="/dashboard/journal"
      />
      <StatCard
        icon={<Search className="h-4 w-4" />}
        label="Audit Trail"
        value={auditEntries.toString()}
        changeLabel="Recent activity records"
        href="/dashboard/audit-log"
      />
    </div>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────

export function AccountantDashboard() {
  const { data: documents, isLoading: docLoading } =
    trpc.document.listDocuments.useQuery(undefined);
  const { data: stats, isLoading: statsLoading } =
    trpc.ingestion.getStats.useQuery(undefined, { refetchInterval: 60000 });
  const { data: entries, isLoading: entriesLoading } =
    trpc.journal.list.useQuery({ limit: 50 });
  const { data: auditLog } = trpc.document.listAuditLog.useQuery(undefined);

  const isLoading = docLoading || statsLoading || entriesLoading;

  const metrics = useMemo(() => {
    const journalEntries = (entries ?? []) as JournalEntry[];
    const postedCount = journalEntries.filter(
      (e) => e.status === "posted",
    ).length;
    return {
      documentCount: (documents ?? []).length,
      reviewCount: stats?.pendingReview ?? 0,
      postedCount,
      auditEntries: (auditLog ?? []).length,
    };
  }, [documents, stats, entries, auditLog]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-1 rounded-xl" />
          <Skeleton className="h-72 lg:col-span-2 rounded-xl" />
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
            Accountant Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review exceptions, manage documents, and keep the books current.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <BookOpen className="h-3 w-3" />
            Accountant
          </Badge>
        </div>
      </div>

      {/* KPI Metrics */}
      <AccountantQuickStats
        documentCount={metrics.documentCount}
        reviewCount={metrics.reviewCount}
        postedCount={metrics.postedCount}
        auditEntries={metrics.auditEntries}
      />

      {/* Main Content: 3-column layout */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Exception Queue — takes 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <ExceptionQueue />
        </div>

        {/* Document Inbox + Transaction Feed — takes 3 cols */}
        <div className="lg:col-span-3 space-y-4">
          <DocumentInbox />
          <TransactionFeed />
        </div>
      </div>
    </div>
  );
}
