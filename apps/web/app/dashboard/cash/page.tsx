"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SubPageTabs } from "@/components/shared/sub-page-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { CashLiveness } from "@/components/agents/cash-liveness";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { CreateImprestFloatDialog } from "./create-float-dialog";
import { CreatePettyCashDialog } from "./create-entry-dialog";
import { Badge } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { Wallet, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/badge-variants";
import type { FilterState } from "@/components/dashboard/filter-bar";

export default function CashPage() {
  const router = useRouter();
  const { data: floats, isLoading: floatsLoading } =
    trpc.cash.listImprestFloats.useQuery();
  const { data: pettyCash, isLoading: pettyLoading } =
    trpc.cash.listPettyCash.useQuery();
  const [floatOpen, setFloatOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [floatFilters, setFloatFilters] = useState<FilterState>({
    search: "",
    dateFrom: "",
    dateTo: "",
    status: "",
    sort: "date-desc",
  });
  const [pettyFilters, setPettyFilters] = useState<FilterState>({
    search: "",
    dateFrom: "",
    dateTo: "",
    status: "",
    sort: "date-desc",
  });

  const filteredFloats = useMemo(() => {
    if (!floats) return [];
    let result = [...floats];
    if (floatFilters.search) {
      const q = floatFilters.search.toLowerCase();
      result = result.filter(
        (f) =>
          f.assigneeName.toLowerCase().includes(q) ||
          (f.purpose ?? "").toLowerCase().includes(q),
      );
    }
    if (floatFilters.status) {
      result = result.filter((f) => f.status === floatFilters.status);
    }
    if (floatFilters.sort === "amount-desc") {
      result.sort((a, b) => Number(b.amount) - Number(a.amount));
    } else if (floatFilters.sort === "amount-asc") {
      result.sort((a, b) => Number(a.amount) - Number(b.amount));
    } else if (floatFilters.sort === "name-asc") {
      result.sort((a, b) => a.assigneeName.localeCompare(b.assigneeName));
    } else if (floatFilters.sort === "name-desc") {
      result.sort((a, b) => b.assigneeName.localeCompare(a.assigneeName));
    } else if (floatFilters.sort === "date-asc") {
      result.sort(
        (a, b) =>
          new Date(a.issuedDate ?? 0).getTime() -
          new Date(b.issuedDate ?? 0).getTime(),
      );
    } else {
      result.sort(
        (a, b) =>
          new Date(b.issuedDate ?? 0).getTime() -
          new Date(a.issuedDate ?? 0).getTime(),
      );
    }
    return result;
  }, [floats, floatFilters]);

  const filteredPetty = useMemo(() => {
    if (!pettyCash) return [];
    let result = [...pettyCash];
    if (pettyFilters.search) {
      const q = pettyFilters.search.toLowerCase();
      result = result.filter((e) =>
        (e.description ?? "").toLowerCase().includes(q),
      );
    }
    if (pettyFilters.sort === "amount-desc") {
      result.sort((a, b) => Number(b.balance) - Number(a.balance));
    } else if (pettyFilters.sort === "amount-asc") {
      result.sort((a, b) => Number(a.balance) - Number(b.balance));
    } else if (pettyFilters.sort === "date-asc") {
      result.sort(
        (a, b) =>
          new Date(a.transactionDate).getTime() -
          new Date(b.transactionDate).getTime(),
      );
    } else {
      result.sort(
        (a, b) =>
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime(),
      );
    }
    return result;
  }, [pettyCash, pettyFilters]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash & Imprest"
        description="Manage imprest advances, petty cash, and receipts"
      />

      <SubPageTabs
        tabs={[
          { label: "Cash", href: "/dashboard/cash" },
          { label: "Bank & Recon", href: "/dashboard/treasury" },
          { label: "Mobile Money", href: "/dashboard/mobile-money" },
        ]}
      />

      <CashLiveness />

      <Tabs defaultValue="floats">
        <TabsList>
          <TabsTrigger value="floats">Imprest Floats</TabsTrigger>
          <TabsTrigger value="petty">Petty Cash</TabsTrigger>
        </TabsList>

        <TabsContent value="floats" className="space-y-6">
          <FilterBar
            onFilterChange={setFloatFilters}
            statusOptions={[
              { value: "active", label: "Active" },
              { value: "settled", label: "Settled" },
              { value: "expired", label: "Expired" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            showDateRange
            sortOptions={[
              { value: "date-desc", label: "Date (newest first)" },
              { value: "date-asc", label: "Date (oldest first)" },
              { value: "name-asc", label: "Assignee (A–Z)" },
              { value: "name-desc", label: "Assignee (Z–A)" },
              { value: "amount-desc", label: "Amount (highest)" },
              { value: "amount-asc", label: "Amount (lowest)" },
            ]}
          />

          {floatsLoading ? (
            <TableSkeleton rows={4} columns={6} />
          ) : filteredFloats.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-12 w-12" />}
              title="No imprest floats"
              description="Create your first imprest float to advance funds."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Assignee
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Purpose
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Issued
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Remaining
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFloats.map((float) => (
                    <tr
                      key={float.id}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/cash/floats/${float.id}`)
                      }
                    >
                      <td className="py-3 px-4 text-sm font-medium">
                        {float.assigneeName}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {float.purpose ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {formatDate(float.issuedDate!)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(Number(float.amount))}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(Number(float.remainingBalance))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className={statusBadgeClass(float.status)}
                        >
                          {float.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setFloatOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Float
            </button>
          </div>
        </TabsContent>

        <TabsContent value="petty" className="space-y-6">
          <FilterBar
            onFilterChange={setPettyFilters}
            showDateRange
            sortOptions={[
              { value: "date-desc", label: "Date (newest first)" },
              { value: "date-asc", label: "Date (oldest first)" },
              { value: "amount-desc", label: "Balance (highest)" },
              { value: "amount-asc", label: "Balance (lowest)" },
            ]}
          />

          {pettyLoading ? (
            <TableSkeleton rows={4} columns={5} />
          ) : filteredPetty.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-12 w-12" />}
              title="No petty cash entries"
              description="Record your first petty cash transaction."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Debit
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Credit
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPetty.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm">
                        {formatDate(entry.transactionDate)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {entry.description ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {entry.category ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {Number(entry.debit ?? 0) > 0
                          ? formatCurrency(Number(entry.debit))
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {Number(entry.credit ?? 0) > 0
                          ? formatCurrency(Number(entry.credit))
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono">
                        {formatCurrency(Number(entry.balance))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setEntryOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Entry
            </button>
          </div>
        </TabsContent>
      </Tabs>

      <CreateImprestFloatDialog open={floatOpen} onOpenChange={setFloatOpen} />
      <CreatePettyCashDialog open={entryOpen} onOpenChange={setEntryOpen} />
    </div>
  );
}
