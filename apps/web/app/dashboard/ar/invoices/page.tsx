"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { ArLiveness } from "@/components/agents/ar-liveness";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { CreateInvoiceDialog } from "./create-dialog";
import { Badge } from "@/components/ui";
import { FileText, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/badge-variants";
import type { FilterState } from "@/components/dashboard/filter-bar";

export default function ARInvoicesPage() {
  const router = useRouter();
  const { data: invoices, isLoading } = trpc.ar.listInvoices.useQuery({});
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    dateFrom: "",
    dateTo: "",
    status: "",
    sort: "date-desc",
  });

  const filtered = useMemo(() => {
    if (!invoices) return [];
    let result = [...invoices];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((i) => i.invoiceNumber.toLowerCase().includes(q));
    }
    if (filters.status) {
      result = result.filter((i) => i.status === filters.status);
    }
    if (filters.sort === "date-asc") {
      result.sort(
        (a, b) =>
          new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime(),
      );
    } else if (filters.sort === "amount-desc") {
      result.sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));
    } else if (filters.sort === "amount-asc") {
      result.sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount));
    } else {
      result.sort(
        (a, b) =>
          new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
      );
    }
    return result;
  }, [invoices, filters]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Invoices"
        description="Create and track customer invoices"
        action={{
          label: "New Invoice",
          onClick: () => setCreateOpen(true),
          icon: <Plus className="mr-2 h-4 w-4" />,
        }}
      />

      <ArLiveness />

      <FilterBar
        onFilterChange={setFilters}
        statusOptions={[
          { value: "pending", label: "Pending" },
          { value: "partial", label: "Partial" },
          { value: "paid", label: "Paid" },
          { value: "overdue", label: "Overdue" },
          { value: "voided", label: "Voided" },
        ]}
        showDateRange
        sortOptions={[
          { value: "date-desc", label: "Date (newest first)" },
          { value: "date-asc", label: "Date (oldest first)" },
          { value: "amount-desc", label: "Amount (highest)" },
          { value: "amount-asc", label: "Amount (lowest)" },
        ]}
      />

      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No sales invoices"
          description="Create your first invoice to start billing customers."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Invoice #
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Date
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Due Date
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                  Total
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
              {filtered.map((inv) => (
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
                    {formatDate(inv.invoiceDate)}
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
                      className={statusBadgeClass(inv.status)}
                    >
                      {inv.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateInvoiceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
