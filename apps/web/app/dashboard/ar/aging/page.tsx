"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SubPageTabs } from "@/components/shared/sub-page-tabs";
import { MODULE_TABS } from "@/components/shared/module-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  AlertCircle,
  FileText,
  Calendar,
  Download,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "91-plus";

const BUCKET_LABELS: Record<AgingBucket, string> = {
  current: "Current (not due)",
  "1-30": "1–30 Days",
  "31-60": "31–60 Days",
  "61-90": "61–90 Days",
  "91-plus": "91+ Days",
};

const BUCKET_COLORS: Record<AgingBucket, string> = {
  current:
    "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400",
  "1-30": "text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400",
  "31-60":
    "text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400",
  "61-90":
    "text-orange-600 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400",
  "91-plus": "text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400",
};

function computeBucket(dueDate: string, balance: number): AgingBucket | null {
  if (balance <= 0) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays <= 0) return "current";
  if (diffDays <= 30) return "1-30";
  if (diffDays <= 60) return "31-60";
  if (diffDays <= 90) return "61-90";
  return "91-plus";
}

export default function ARAgingPage() {
  const router = useRouter();
  const { data: invoices, isLoading } = trpc.ar.listInvoices.useQuery({});
  const [selectedBucket, setSelectedBucket] = useState<AgingBucket | null>(
    null,
  );

  const agingData = useMemo(() => {
    if (!invoices)
      return {
        buckets: {} as Record<
          AgingBucket,
          { count: number; total: number; invoices: typeof invoices }
        >,
        totalOutstanding: 0,
      };

    const buckets: Record<
      string,
      { count: number; total: number; invoices: typeof invoices }
    > = {
      current: { count: 0, total: 0, invoices: [] },
      "1-30": { count: 0, total: 0, invoices: [] },
      "31-60": { count: 0, total: 0, invoices: [] },
      "61-90": { count: 0, total: 0, invoices: [] },
      "91-plus": { count: 0, total: 0, invoices: [] },
    };
    let totalOutstanding = 0;

    for (const inv of invoices) {
      const balance = Number(inv.balance);
      if (balance <= 0) continue;
      totalOutstanding += balance;
      const bucket = computeBucket(inv.dueDate, balance);
      if (bucket && buckets[bucket]) {
        buckets[bucket].count++;
        buckets[bucket].total += balance;
        buckets[bucket].invoices.push(inv);
      }
    }

    return {
      buckets: buckets as Record<
        AgingBucket,
        { count: number; total: number; invoices: typeof invoices }
      >,
      totalOutstanding,
    };
  }, [invoices]);

  const selectedInvoices = selectedBucket
    ? (agingData.buckets[selectedBucket]?.invoices ?? [])
    : [];

  const handleExport = useCallback(() => {
    const rows = [
      [
        "Customer",
        "Invoice #",
        "Due Date",
        "Amount",
        "Balance",
        "Days Overdue",
      ],
    ];
    const now = new Date();
    for (const inv of invoices ?? []) {
      const balance = Number(inv.balance);
      if (balance <= 0) continue;
      const due = new Date(inv.dueDate);
      const days = Math.floor(
        (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
      );
      rows.push([
        (inv as any).customerName ?? (inv as any).customerId ?? "",
        inv.invoiceNumber,
        formatDate(inv.dueDate),
        String(Number(inv.totalAmount)),
        String(balance),
        String(Math.max(0, days)),
      ]);
    }
    const csv = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ar-aging-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [invoices]);

  const criticalCount =
    (agingData.buckets["91-plus"]?.count ?? 0) +
    (agingData.buckets["61-90"]?.count ?? 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AR Aging"
          description="Accounts receivable aging report"
        />
        <SubPageTabs tabs={MODULE_TABS.sales} />
        <TableSkeleton rows={6} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AR Aging Report"
        description="Outstanding receivables by age — 30/60/90+ day buckets"
        action={{
          label: "Export CSV",
          onClick: handleExport,
          icon: <Download className="mr-2 h-4 w-4" />,
        }}
      />

      <SubPageTabs tabs={MODULE_TABS.sales} />

      {criticalCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{criticalCount} invoices</span>
          <span>are more than 60 days overdue — review immediately</span>
        </div>
      )}

      {agingData.totalOutstanding === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-12 w-12" />}
          title="No outstanding receivables"
          description="All invoices are paid. Your AR is fully current."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {(Object.keys(BUCKET_LABELS) as AgingBucket[]).map((bucket) => {
              const data = agingData.buckets[bucket];
              const pct =
                agingData.totalOutstanding > 0
                  ? (data.total / agingData.totalOutstanding) * 100
                  : 0;
              return (
                <button
                  key={bucket}
                  onClick={() =>
                    setSelectedBucket(selectedBucket === bucket ? null : bucket)
                  }
                  className={cn(
                    "rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md",
                    selectedBucket === bucket && "ring-2 ring-primary",
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-semibold mb-2",
                      BUCKET_COLORS[bucket].split(" ")[0],
                    )}
                  >
                    {BUCKET_LABELS[bucket]}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(data.total)}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {data.count} invoice{data.count !== 1 ? "s" : ""}
                    </span>
                    <span>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        bucket === "current"
                          ? "bg-emerald-500"
                          : bucket === "1-30"
                            ? "bg-blue-500"
                            : bucket === "31-60"
                              ? "bg-amber-500"
                              : bucket === "61-90"
                                ? "bg-orange-500"
                                : "bg-red-500",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Total bar */}
          <Card className="bg-gradient-to-br from-primary/5 to-background">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Total Outstanding
                  </p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(agingData.totalOutstanding)}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{invoices?.length ?? 0} total invoices</p>
                  <p>
                    {agingData.buckets["91-plus"].count > 0
                      ? `${agingData.buckets["91-plus"].count} severely overdue`
                      : "All accounts current"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detail table for selected bucket */}
          {selectedBucket && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {BUCKET_LABELS[selectedBucket]} — {selectedInvoices.length}{" "}
                invoice{selectedInvoices.length !== 1 ? "s" : ""}
              </h3>
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                        Invoice #
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                        Customer
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
                    {selectedInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() =>
                          router.push(`/dashboard/ar/invoices/${inv.id}`)
                        }
                      >
                        <td className="py-3 px-4 text-sm font-mono font-medium">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {(inv as any).customerName ??
                            (inv as any).customerId ??
                            "—"}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {formatDate(inv.dueDate)}
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
                              Number(inv.balance) <= 0
                                ? "bg-emerald-100 text-emerald-700"
                                : inv.status === "overdue"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700",
                            )}
                          >
                            {inv.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
