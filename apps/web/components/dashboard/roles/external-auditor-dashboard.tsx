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
import { Skeleton } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Scale,
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Lock,
  Unlock,
  CalendarDays,
  BookOpen,
  Receipt,
  MessageSquare,
  Shield,
  Clock,
} from "lucide-react";

/**
 * External Auditor Dashboard
 *
 * Per Architecture Doc §5:
 * Shows period-locked trial balance, schedules (vouchers/supporting docs),
 * and an audit query log.
 *
 * Designed for external auditors reviewing period-locked financial data.
 * All views are read-only — the auditor portal never writes to the ledgers.
 */

// ─── Types ──────────────────────────────────────────────────────────────

type FiscalPeriod = {
  id: string;
  year: number;
  month: number;
  status: string;
  startDate: string;
  endDate: string;
};

type JournalEntry = {
  id: string;
  entryNumber: number | null;
  description: string;
  date: string;
  status: string;
  source: string | null;
  postedAt: string | Date | null;
};

type Document = {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string | Date;
};

type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityIdRef: string | null;
  userId: string | null;
  newValues: Record<string, unknown> | null;
  oldValues: Record<string, unknown> | null;
  createdAt: string;
};

// ─── Period Selector ───────────────────────────────────────────────────

function PeriodSelector({
  periods,
  selectedPeriodId,
  onSelect,
  isLoading,
}: {
  periods: FiscalPeriod[];
  selectedPeriodId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  const statusConfig: Record<
    string,
    { label: string; color: string; bg: string; icon: React.ReactNode }
  > = {
    open: {
      label: "Open",
      color: "text-green-500",
      bg: "bg-green-500/10",
      icon: <Unlock className="h-3 w-3" />,
    },
    closed: {
      label: "Closed",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      icon: <Lock className="h-3 w-3" />,
    },
    locked: {
      label: "Locked",
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      icon: <Lock className="h-3 w-3" />,
    },
  };

  const sortedPeriods = useMemo(
    () => [...periods].sort((a, b) => b.year - a.year || b.month - a.month),
    [periods],
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Audit Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-8 mt-2 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (sortedPeriods.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Audit Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<CalendarDays className="h-8 w-8 text-muted-foreground" />}
            title="No periods found"
            description="Fiscal periods need to be created before an audit can begin."
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
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Audit Period
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {sortedPeriods.length} periods
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {sortedPeriods.map((period) => {
            const cfg = statusConfig[period.status] ?? {
              label: period.status,
              color: "text-muted-foreground",
              bg: "bg-muted",
              icon: <Clock className="h-3 w-3" />,
            };
            const isSelected = selectedPeriodId === period.id;
            const monthLabel = new Date(
              period.year,
              period.month - 1,
            ).toLocaleString("en-US", { month: "short", year: "numeric" });

            return (
              <button
                key={period.id}
                type="button"
                onClick={() => onSelect(period.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors text-left",
                  isSelected
                    ? "border-primary/50 bg-primary/5"
                    : "hover:bg-accent/50",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      cfg.bg,
                    )}
                  >
                    {cfg.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{monthLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {period.startDate} — {period.endDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] gap-1", cfg.bg)}
                  >
                    <span className={cfg.color}>{cfg.icon}</span>
                    {cfg.label}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Period-Locked Trial Balance ──────────────────────────────────────

function TrialBalanceView({
  periodId,
  period,
}: {
  periodId: string;
  period?: FiscalPeriod | null;
}) {
  const { data: tb, isLoading } = trpc.journal.getTrialBalance.useQuery(
    { periodId },
    { enabled: !!periodId },
  );

  if (!periodId) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Trial Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Scale className="h-8 w-8 text-muted-foreground" />}
            title="Select a period"
            description="Choose a fiscal period from the sidebar to view its trial balance."
            className="py-4"
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Trial Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 rounded-lg w-1/3" />
            <Skeleton className="h-6 rounded-lg" />
            <Skeleton className="h-6 rounded-lg" />
            <Skeleton className="h-6 rounded-lg" />
            <Skeleton className="h-6 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const periodLabel = period
    ? new Date(period.year, period.month - 1).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Selected Period";

  const isPeriodLocked =
    period?.status === "closed" || period?.status === "locked";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Trial Balance</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isPeriodLocked && (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 text-violet-600 border-violet-200"
              >
                <Lock className="h-3 w-3" />
                Period-Locked
              </Badge>
            )}
            {tb?.isBalanced && (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 text-emerald-600 border-emerald-200"
              >
                <CheckCircle2 className="h-3 w-3" />
                Balanced
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Trial balance for <span className="font-medium">{periodLabel}</span>
          {isPeriodLocked
            ? " — data is locked and cannot be modified."
            : " — data is read-only for audit purposes."}
        </p>

        {!tb || tb.accounts.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8 text-muted-foreground" />}
            title="No entries"
            description="No posted journal entries found for this period."
            className="py-2"
          />
        ) : (
          <>
            {/* TB Table */}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium px-3 py-2">Account</th>
                    <th className="text-left font-medium px-3 py-2">Code</th>
                    <th className="text-right font-medium px-3 py-2">Debit</th>
                    <th className="text-right font-medium px-3 py-2">Credit</th>
                    <th className="text-right font-medium px-3 py-2">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tb.accounts.map((acc) => (
                    <tr
                      key={acc.accountId}
                      className="border-b last:border-0 hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-3 py-2 font-medium">
                        {acc.name ?? acc.accountId.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                          {acc.code ?? "—"}
                        </code>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {acc.debit > 0 ? formatCurrency(acc.debit) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {acc.credit > 0 ? formatCurrency(acc.credit) : "—"}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums font-medium",
                          acc.balance > 0
                            ? "text-emerald-600"
                            : acc.balance < 0
                              ? "text-red-600"
                              : "",
                        )}
                      >
                        {formatCurrency(Math.abs(acc.balance))}
                        <span className="text-[9px] text-muted-foreground ml-0.5">
                          {acc.balance > 0 ? "Dr" : acc.balance < 0 ? "Cr" : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-medium">
                    <td colSpan={2} className="px-3 py-2 text-xs">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(tb.totalDebit)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(tb.totalCredit)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums",
                        tb.isBalanced ? "text-emerald-600" : "text-red-600",
                      )}
                    >
                      {tb.isBalanced
                        ? "Balanced ✓"
                        : formatCurrency(
                            Math.abs(tb.totalDebit - tb.totalCredit),
                          )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Status Bar */}
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {tb.accounts.length} accounts
              </span>
              <span>·</span>
              <Link
                href={`/dashboard/journal?period=${periodId}`}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                View journal entries <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Schedules & Vouchers ────────────────────────────────────────────────

function Schedules({ periodId }: { periodId: string | null }) {
  const { data: entries, isLoading: entriesLoading } =
    trpc.journal.list.useQuery(
      { limit: 20, status: "posted" },
      { enabled: !!periodId },
    );
  const { data: documents, isLoading: docsLoading } =
    trpc.document.listDocuments.useQuery(undefined);

  const isLoading = entriesLoading || docsLoading;

  if (!periodId) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Schedules & Vouchers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<FileText className="h-8 w-8 text-muted-foreground" />}
            title="Select a period"
            description="Choose a fiscal period to view its supporting schedules."
            className="py-4"
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Schedules & Vouchers
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

  const journalEntries = (entries ?? []) as JournalEntry[];
  const docs = (documents ?? []) as Document[];
  const postedDocs = docs.filter(
    (d) =>
      d.status === "done" ||
      d.status === "synced" ||
      d.status === "agent_processing",
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Schedules & Vouchers
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {journalEntries.length + postedDocs.length} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="journal">
          <TabsList className="mb-3">
            <TabsTrigger value="journal" className="gap-1.5 text-xs">
              <BookOpen className="h-3 w-3" />
              Journal Entries ({journalEntries.length})
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="gap-1.5 text-xs">
              <Receipt className="h-3 w-3" />
              Vouchers ({postedDocs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="journal">
            {journalEntries.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
                title="No posted entries"
                description="No journal entries have been posted for this period."
                className="py-2"
              />
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {journalEntries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/dashboard/journal?entry=${entry.id}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/50 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                        <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {entry.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.entryNumber
                            ? `JE #${entry.entryNumber}`
                            : "New entry"}
                          {entry.date &&
                            ` · ${new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="vouchers">
            {postedDocs.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
                title="No vouchers"
                description="No processed documents found to support as vouchers."
                className="py-2"
              />
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {postedDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/dashboard/documents/${doc.id}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/50 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10">
                        <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.type.replace(/_/g, " ")}
                          {doc.createdAt &&
                            ` · ${new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ─── Audit Query Log ─────────────────────────────────────────────────

function AuditQueryLog() {
  const { data: auditData, isLoading } = trpc.audit.list.useQuery({
    limit: 15,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const logs = (auditData?.logs as AuditLogEntry[]) ?? [];
  const total = auditData?.total ?? 0;

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Search className="h-8 w-8 text-muted-foreground" />}
            title="No audit records"
            description="Activity records will appear here as actions are performed."
            className="py-2"
          />
        </CardContent>
      </Card>
    );
  }

  const actionIcon = (action: string) => {
    if (action.includes("create") || action.includes("upload"))
      return <FileText className="h-3 w-3" />;
    if (action.includes("approve") || action.includes("post"))
      return <CheckCircle2 className="h-3 w-3" />;
    if (action.includes("reject") || action.includes("delete"))
      return <AlertCircle className="h-3 w-3" />;
    if (action.includes("close") || action.includes("lock"))
      return <Lock className="h-3 w-3" />;
    return <MessageSquare className="h-3 w-3" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Audit Trail
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {total} records
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                {actionIcon(log.action)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {log.action.replace(/_/g, " ").replace(/\./g, " → ")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {log.entityType?.replace(/_/g, " ")}
                  {log.createdAt &&
                    ` · ${new Date(log.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
                </p>
              </div>
            </div>
          ))}
        </div>
        {total > 15 && (
          <Link href="/dashboard/audit-log">
            <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
              View all {total} records <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────

export function ExternalAuditorDashboard() {
  const { entityId } = useEntity();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  const { data: periods, isLoading: periodsLoading } =
    trpc.fiscal.list.useQuery({});

  const selectedPeriod = useMemo(() => {
    if (!periods?.length || !selectedPeriodId) return null;
    return (periods as FiscalPeriod[]).find((p) => p.id === selectedPeriodId);
  }, [periods, selectedPeriodId]);

  const lockedPeriods = useMemo(() => {
    if (!periods?.length) return 0;
    return (periods as FiscalPeriod[]).filter(
      (p) => p.status === "closed" || p.status === "locked",
    ).length;
  }, [periods]);

  const { data: journalEntries } = trpc.journal.list.useQuery({
    limit: 50,
    status: "posted",
  });
  const { data: auditData } = trpc.audit.list.useQuery({ limit: 50 });

  const metrics = useMemo(() => {
    const entries = (journalEntries ?? []) as JournalEntry[];
    const auditTotal = auditData?.total ?? 0;
    return {
      totalPeriods: (periods ?? []).length,
      lockedPeriods,
      postedEntries: entries.length,
      auditRecords: auditTotal,
    };
  }, [periods, lockedPeriods, journalEntries, auditData]);

  const isLoading = periodsLoading;

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
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-96 lg:col-span-3 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditor Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only access to period-locked trial balances, schedules, and
            audit trails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Shield className="h-3 w-3" />
            External Auditor
          </Badge>
          {selectedPeriod?.status === "locked" && (
            <Badge
              variant="secondary"
              className="text-xs gap-1 bg-violet-500/10 text-violet-600"
            >
              <Lock className="h-3 w-3" />
              Read-Only
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Fiscal Periods"
          value={metrics.totalPeriods.toString()}
          changeLabel={
            metrics.lockedPeriods > 0
              ? `${metrics.lockedPeriods} closed/locked`
              : "All open"
          }
          href="/dashboard/fiscal"
        />
        <StatCard
          icon={<Lock className="h-4 w-4" />}
          label="Locked Periods"
          value={metrics.lockedPeriods.toString()}
          changeLabel={
            metrics.lockedPeriods > 0
              ? "Available for audit"
              : "No periods locked"
          }
          href="/dashboard/fiscal"
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Posted Entries"
          value={metrics.postedEntries.toString()}
          changeLabel="Journal entries to review"
          href="/dashboard/journal"
        />
        <StatCard
          icon={<Search className="h-4 w-4" />}
          label="Audit Trail Records"
          value={metrics.auditRecords.toString()}
          changeLabel="Tracked activities"
          href="/dashboard/audit-log"
        />
      </div>

      {/* Main Content: 5-column layout */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Left: Period Selector + Audit Trail */}
        <div className="lg:col-span-2 space-y-4">
          <PeriodSelector
            periods={(periods ?? []) as FiscalPeriod[]}
            selectedPeriodId={selectedPeriodId}
            onSelect={setSelectedPeriodId}
            isLoading={periodsLoading}
          />
          <AuditQueryLog />
        </div>

        {/* Right: Trial Balance + Schedules */}
        <div className="lg:col-span-3 space-y-4">
          <TrialBalanceView
            periodId={selectedPeriodId ?? ""}
            period={selectedPeriod}
          />
          <Schedules periodId={selectedPeriodId} />
        </div>
      </div>
    </div>
  );
}
