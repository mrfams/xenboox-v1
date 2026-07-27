"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { Badge, Button, Card, CardContent, Checkbox } from "@/components/ui";
import {
  CalendarDays,
  CreditCard,
  AlertCircle,
  ChevronRight,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

export default function PaymentSchedulePage() {
  const router = useRouter();
  const { data: invoices, isLoading } = trpc.ap.listInvoices.useQuery();
  const { data: bankAccounts } = trpc.treasury.listBankAccounts.useQuery();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");

  const upcoming = useMemo(() => {
    if (!invoices) return [];
    return invoices
      .filter((inv) => inv.status === "pending" || inv.status === "partial")
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
  }, [invoices]);

  const totalCash = useMemo(() => {
    return (bankAccounts ?? []).reduce(
      (s, a) => s + Number(a.currentBalance),
      0,
    );
  }, [bankAccounts]);

  const totalDue = useMemo(() => {
    return upcoming.reduce((s, inv) => s + Number(inv.balance), 0);
  }, [upcoming]);

  const insufficientFunds = totalCash < totalDue;
  const overdueCount = upcoming.filter(
    (inv) => new Date(inv.dueDate) < new Date(),
  ).length;
  const next7Days = upcoming.filter((inv) => {
    const due = new Date(inv.dueDate);
    const week = new Date();
    week.setDate(week.getDate() + 7);
    return due <= week;
  });

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === upcoming.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(upcoming.map((inv) => inv.id)));
    }
  }

  const selectedTotal = upcoming
    .filter((inv) => selectedIds.has(inv.id))
    .reduce((s, inv) => s + Number(inv.balance), 0);

  function handlePayNow() {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setSelectedIds(new Set());
    }, 1500);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Payment Schedule"
          description="Upcoming payment due dates"
        />
        <TableSkeleton rows={6} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Schedule"
        description={`${upcoming.length} upcoming payments · ${formatCurrency(totalDue)} total due`}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
          className="gap-2"
        >
          <CalendarDays className="h-4 w-4" />
          {viewMode === "list" ? "Calendar" : "List"}
        </Button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Total Due
                </p>
                <p className="text-2xl font-bold">{formatCurrency(totalDue)}</p>
              </div>
              <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {upcoming.length} unpaid bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Available Cash
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalCash)}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {bankAccounts?.length ?? 0} bank accounts
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            insufficientFunds ? "bg-red-50 dark:bg-red-950/20" : "",
          )}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Cash Position
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    insufficientFunds ? "text-red-600" : "text-emerald-600",
                  )}
                >
                  {insufficientFunds ? "Shortfall" : "Sufficient"}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-lg p-2.5",
                  insufficientFunds
                    ? "bg-red-100 dark:bg-red-900/30"
                    : "bg-emerald-100 dark:bg-emerald-900/30",
                )}
              >
                <AlertCircle
                  className={cn(
                    "h-5 w-5",
                    insufficientFunds ? "text-red-600" : "text-emerald-600",
                  )}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {insufficientFunds
                ? `Short by ${formatCurrency(totalDue - totalCash)}`
                : `Surplus of ${formatCurrency(totalCash - totalDue)}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Due This Week
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    next7Days.length > 0
                      ? "text-amber-600"
                      : "text-emerald-600",
                  )}
                >
                  {next7Days.length}
                </p>
              </div>
              <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
                <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {overdueCount > 0 ? `${overdueCount} overdue` : "All on time"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insufficient funds warning */}
      {insufficientFunds && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">Cash shortfall detected</span>
          <span>
            — available cash ({formatCurrency(totalCash)}) is less than total
            due ({formatCurrency(totalDue)}).
          </span>
          <span className="text-xs opacity-70">
            Cash Agent advised: prioritize critical payments
          </span>
        </div>
      )}

      {/* Payment list */}
      {upcoming.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-12 w-12" />}
          title="No upcoming payments"
          description="All bills are paid. Your AP schedule is clear."
        />
      ) : (
        <div className="space-y-4">
          {/* Bulk actions */}
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedIds.size === upcoming.length}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} selected (${formatCurrency(selectedTotal)})`
                : `${upcoming.length} upcoming payments`}
            </span>
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                onClick={handlePayNow}
                disabled={paying}
                className="ml-auto gap-2"
              >
                {paying ? (
                  <>Processing...</>
                ) : (
                  <>
                    <ArrowRight className="h-3.5 w-3.5" />
                    Pay Selected ({formatCurrency(selectedTotal)})
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Invoice #
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Supplier
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                    Due Date
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                    Balance
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((inv) => {
                  const isOverdue = new Date(inv.dueDate) < new Date();
                  const dueSoon =
                    !isOverdue &&
                    new Date(inv.dueDate) <=
                      new Date(Date.now() + 7 * 86400000);
                  return (
                    <tr
                      key={inv.id}
                      className={cn(
                        "border-b hover:bg-muted/50 transition-colors",
                        isOverdue && "bg-red-50/50 dark:bg-red-950/10",
                      )}
                    >
                      <td className="py-3 px-4">
                        <Checkbox
                          checked={selectedIds.has(inv.id)}
                          onCheckedChange={() => toggleSelect(inv.id)}
                        />
                      </td>
                      <td
                        className="py-3 px-4 text-sm font-mono font-medium cursor-pointer"
                        onClick={() =>
                          router.push(`/dashboard/ap/invoices/${inv.id}`)
                        }
                      >
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {(inv as any).supplierName ?? "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {formatDate(inv.dueDate)}
                          </span>
                          {isOverdue && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] px-1"
                            >
                              Overdue
                            </Badge>
                          )}
                          {dueSoon && !isOverdue && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1 bg-amber-100 text-amber-700"
                            >
                              Soon
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(Number(inv.totalAmount))}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(Number(inv.balance))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            inv.status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : isOverdue
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700",
                          )}
                        >
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
