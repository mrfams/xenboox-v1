"use client";

import { useState } from "react";
import { CreditCard, Plus, Bot, ChevronRight, Mail, Phone } from "lucide-react";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useModuleAi } from "@/components/module/module-ai-context";
import { CreateVendorDialog } from "@/components/dashboard/create-vendor-dialog";

// ─── Types ─────────────────────────────────────────────────────────────────

type Vendor = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalBilled?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  billCount?: number;
  status?: string;
  is1099?: boolean;
};

// ─── Vendors View ──────────────────────────────────────────────────────────
//
// Rendered as the "Vendors" tab of the Operations surface.
// The /dashboard/operations/vendors route wraps this in ModulePageShell.

export function VendorsView() {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();
  const [search] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data, isLoading } = trpc.ap.listSuppliers.useQuery(
    {
      search: search || undefined,
      limit: 50,
      offset: 0,
    },
    { enabled: !!entityId },
  );

  const vendors = (data?.suppliers ?? []) as Vendor[];
  const totalCount = data?.totalCount ?? vendors.length;

  const columns: Column<Vendor>[] = [
    {
      key: "name",
      label: "Vendor",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold">
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
      key: "totalBilled",
      label: "Total Billed",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="text-sm font-medium tabular-nums">
          {formatCurrency(row.totalBilled ?? 0)}
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
      key: "billCount",
      label: "Bills",
      sortable: true,
      align: "center",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.billCount ?? 0}
        </span>
      ),
    },
    {
      key: "is1099",
      label: "1099",
      align: "center",
      render: (row) =>
        row.is1099 ? (
          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-500">
            1099
          </span>
        ) : null,
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

  const handleRowClick = (row: Vendor) => {
    openWithFocus(
      {
        kind: "Vendor",
        name: row.name ?? "Vendor",
        id: row.id,
        fields: [
          { label: "Email", value: row.email ?? "—" },
          { label: "Phone", value: row.phone ?? "—" },
          {
            label: "Total Billed",
            value: formatCurrency(row.totalBilled ?? 0),
          },
          {
            label: "Outstanding",
            value: formatCurrency(row.outstandingBalance ?? 0),
          },
          { label: "1099", value: row.is1099 ? "Yes" : "No" },
        ],
      },
      `Show me details for vendor ${row.name}. What's their payment history and outstanding balance?`,
    );
  };

  return (
    <>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." : `${totalCount} vendors`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                openWithFocus(
                  { kind: "Vendors", name: "All Vendors" },
                  "Analyze my vendor spending. Who am I paying the most and are there any unusual patterns?",
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
              Add Vendor
            </button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable<Vendor>
          columns={columns}
          data={vendors}
          isLoading={isLoading}
          searchPlaceholder="Search vendors by name or email..."
          emptyIcon={CreditCard}
          emptyTitle="No vendors added"
          emptyDescription="Add vendors to track bills, manage payments, and handle 1099 reporting."
          onRowClick={handleRowClick}
          filters={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Overdue", value: "overdue" },
            { label: "1099", value: "1099" },
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
        <CreateVendorDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={() => setShowCreateDialog(false)}
        />
      )}
    </>
  );
}
