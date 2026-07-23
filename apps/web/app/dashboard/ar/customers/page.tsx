"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { CreateCustomerDialog } from "./create-dialog";
import { Badge } from "@/components/ui";
import { Users, Plus } from "lucide-react";
import type { FilterState } from "@/components/dashboard/filter-bar";

export default function CustomersPage() {
  const router = useRouter();
  const { data: customers, isLoading } = trpc.ar.listCustomers.useQuery({});
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    dateFrom: "",
    dateTo: "",
    status: "",
    sort: "name-asc",
  });

  const filtered = useMemo(() => {
    if (!customers) return [];
    let result = [...customers];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.contactEmail ?? "").toLowerCase().includes(q),
      );
    }
    if (filters.status === "active") {
      result = result.filter((c) => c.isActive);
    } else if (filters.status === "inactive") {
      result = result.filter((c) => !c.isActive);
    }
    if (filters.sort === "name-desc") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [customers, filters]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage your customer directory"
        action={{
          label: "New Customer",
          onClick: () => setCreateOpen(true),
          icon: <Plus className="mr-2 h-4 w-4" />,
        }}
      />

      <FilterBar
        onFilterChange={setFilters}
        statusOptions={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
        sortOptions={[
          { value: "name-asc", label: "Name (A–Z)" },
          { value: "name-desc", label: "Name (Z–A)" },
        ]}
      />

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No customers"
          description="Add your first customer to start creating sales invoices."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Name
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Contact
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Payment Terms
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">
                  Credit Limit
                </th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() =>
                    router.push(`/dashboard/ar/customers/${customer.id}`)
                  }
                >
                  <td className="py-3 px-4 text-sm font-medium">
                    {customer.name}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {customer.contactEmail || "—"}
                  </td>
                  <td className="py-3 px-4 text-sm">{customer.paymentTerms}</td>
                  <td className="py-3 px-4 text-sm text-right font-mono">
                    {customer.creditLimit
                      ? parseFloat(customer.creditLimit).toLocaleString(
                          "en-GM",
                          { minimumFractionDigits: 2 },
                        )
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={customer.isActive ? "success" : "secondary"}
                    >
                      {customer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateCustomerDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
