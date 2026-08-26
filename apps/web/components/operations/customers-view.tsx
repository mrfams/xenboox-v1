"use client";

import { useState } from "react";
import { Users, Plus, Bot, ChevronRight, Mail, Phone } from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useModuleAi } from "@/components/module/module-ai-context";
import { CreateCustomerDialog } from "@/components/dashboard/create-customer-dialog";

// ─── Types ─────────────────────────────────────────────────────────────────

type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalInvoiced?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  invoiceCount?: number;
  status?: string;
  createdAt?: string;
};

// ─── Customer Status Badge ─────────────────────────────────────────────────

function CustomerStatusBadge({ status }: { status?: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-500",
    inactive: "bg-muted text-muted-foreground",
    overdue: "bg-red-500/10 text-red-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold",
        styles[status ?? "active"] ?? styles.active,
      )}
    >
      {status ?? "Active"}
    </span>
  );
}

// ─── Customers View ────────────────────────────────────────────────────────
//
// Rendered as the "Customers" tab of the Operations surface.
// The /dashboard/operations/customers route wraps this in ModulePageShell.

export function CustomersView() {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();
  const [search] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data, isLoading } = trpc.ar.listCustomers.useQuery(
    {
      search: search || undefined,
      limit: 50,
      offset: 0,
    },
    { enabled: !!entityId },
  );

  const customers = (data?.customers ?? []) as Customer[];
  const totalCount = data?.totalCount ?? customers.length;

  const columns: Column<Customer>[] = [
    {
      key: "name",
      label: "Customer",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
            {(row.name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{row.name}</p>
            {row.email && (
              <p className="text-[10px] text-muted-foreground">{row.email}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Contact",
      render: (row) => (
        <div className="space-y-0.5">
          {row.email && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {row.email}
            </div>
          )}
          {row.phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {row.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "totalInvoiced",
      label: "Total Invoiced",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="text-sm font-medium tabular-nums">
          {formatCurrency(row.totalInvoiced ?? 0)}
        </span>
      ),
    },
    {
      key: "outstandingBalance",
      label: "Outstanding",
      sortable: true,
      align: "right",
      render: (row) => {
        const balance = row.outstandingBalance ?? 0;
        return (
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              balance > 0 ? "text-amber-500" : "text-muted-foreground",
            )}
          >
            {formatCurrency(balance)}
          </span>
        );
      },
    },
    {
      key: "invoiceCount",
      label: "Invoices",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.invoiceCount ?? 0}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <CustomerStatusBadge status={row.status} />,
    },
    {
      key: "id",
      label: "",
      width: "40px",
      render: () => (
        <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
      ),
    },
  ];

  const handleRowClick = (row: Customer) => {
    openWithFocus(
      {
        kind: "Customer",
        name: row.name ?? "Customer",
        id: row.id,
        fields: [
          { label: "Email", value: row.email ?? "—" },
          { label: "Phone", value: row.phone ?? "—" },
          {
            label: "Total Invoiced",
            value: formatCurrency(row.totalInvoiced ?? 0),
          },
          {
            label: "Outstanding",
            value: formatCurrency(row.outstandingBalance ?? 0),
          },
        ],
      },
      `Show me details for ${row.name}. What's their payment history and outstanding balance?`,
    );
  };

  return (
    <>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." : `${totalCount} customers`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                openWithFocus(
                  { kind: "Customers", name: "All Customers" },
                  "Analyze my customer base. Who are my best customers and who needs attention?",
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Bot className="h-3.5 w-3.5" />
              Ask AI
            </button>
            <button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Customer
            </button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable<Customer>
          columns={columns}
          data={customers}
          isLoading={isLoading}
          searchPlaceholder="Search customers by name or email..."
          emptyIcon={Users}
          emptyTitle="Your customer list is empty"
          emptyDescription="Add customers to create invoices, track payments, and manage relationships."
          onRowClick={handleRowClick}
          filters={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Overdue", value: "overdue" },
          ]}
          activeFilter={filter}
          onFilterChange={setFilter}
          showSearch={true}
          showPagination={true}
          showExport={true}
          pageSize={20}
        />
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <CreateCustomerDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={() => setShowCreateDialog(false)}
        />
      )}
    </>
  );
}
