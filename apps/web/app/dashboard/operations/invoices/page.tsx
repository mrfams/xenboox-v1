"use client";

import { useState } from "react";
import {
  FileText,
  Plus,
  Bot,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ModulePageShell } from "@/components/module/module-page-shell";
import { useModuleAi } from "@/components/module/module-ai-context";
import { CreateInvoiceDialog } from "@/components/dashboard/create-invoice-dialog";

// ─── Types ─────────────────────────────────────────────────────────────────

type Invoice = {
  id: string;
  invoiceNumber?: string;
  customerName?: string;
  customerId?: string;
  date?: string;
  dueDate?: string;
  total?: number;
  amountPaid?: number;
  balance?: number;
  status?: string;
  currency?: string;
  items?: { description: string; amount: number }[];
  attachmentCount?: number;
};

// ─── Status Badge ──────────────────────────────────────────────────────────

function InvoiceStatusBadge({ status }: { status?: string }) {
  const config: Record<string, { icon: LucideIcon; className: string }> = {
    draft: {
      icon: Clock,
      className: "bg-muted text-muted-foreground",
    },
    sent: {
      icon: Send,
      className: "bg-blue-500/10 text-blue-500",
    },
    paid: {
      icon: CheckCircle2,
      className: "bg-emerald-500/10 text-emerald-500",
    },
    overdue: {
      icon: AlertCircle,
      className: "bg-red-500/10 text-red-500",
    },
    partial: {
      icon: Clock,
      className: "bg-amber-500/10 text-amber-500",
    },
    voided: {
      icon: AlertCircle,
      className: "bg-muted text-muted-foreground line-through",
    },
  };

  const { icon: Icon, className } = config[status ?? "draft"] ?? config.draft;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {status ?? "Draft"}
    </span>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { entityId } = useEntity();
  const { openWithFocus } = useModuleAi();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data, isLoading } = trpc.invoicing.listInvoices.useQuery(
    {
      status: filter === "all" ? undefined : filter,
      search: search || undefined,
      limit: 50,
      offset: 0,
    },
    { enabled: !!entityId },
  );

  const invoices = (data?.invoices ?? []) as Invoice[];
  const totalCount = data?.totalCount ?? invoices.length;

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNumber",
      label: "Invoice",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {row.invoiceNumber ?? "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {row.customerName ?? "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.date
            ? new Date(row.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </span>
      ),
    },
    {
      key: "dueDate",
      label: "Due Date",
      sortable: true,
      render: (row) => {
        const isOverdue =
          row.status !== "paid" &&
          row.dueDate &&
          new Date(row.dueDate) < new Date();
        return (
          <span
            className={cn(
              "text-xs",
              isOverdue ? "text-red-500 font-medium" : "text-muted-foreground",
            )}
          >
            {row.dueDate
              ? new Date(row.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </span>
        );
      },
    },
    {
      key: "total",
      label: "Amount",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="text-sm font-semibold tabular-nums">
          {formatCurrency(row.total ?? 0)}
        </span>
      ),
    },
    {
      key: "balance",
      label: "Balance",
      sortable: true,
      align: "right",
      render: (row) => {
        const balance = row.balance ?? 0;
        return (
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              balance > 0 ? "text-amber-500" : "text-emerald-500",
            )}
          >
            {formatCurrency(balance)}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <InvoiceStatusBadge status={row.status} />,
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

  const handleRowClick = (row: Invoice) => {
    openWithFocus(
      {
        kind: "Invoice",
        name: row.invoiceNumber ?? "Invoice",
        id: row.id,
        fields: [
          { label: "Customer", value: row.customerName ?? "—" },
          { label: "Date", value: row.date ?? "—" },
          { label: "Due Date", value: row.dueDate ?? "—" },
          { label: "Total", value: formatCurrency(row.total ?? 0) },
          { label: "Balance", value: formatCurrency(row.balance ?? 0) },
          { label: "Status", value: row.status ?? "—" },
        ],
      },
      `Show me invoice ${row.invoiceNumber}. What's the payment status and history?`,
    );
  };

  return (
    <ModulePageShell
      title="Invoices"
      description="Your invoices. AI tracks payments and flags overdue balances."
      icon={FileText}
      aiSuggestions={[
        {
          label: "Overdue invoices",
          prompt:
            "Which invoices are overdue? Show me amounts and how many days overdue.",
        },
        {
          label: "Invoice summary",
          prompt:
            "Give me a summary of all invoices this month. Total invoiced, paid, and outstanding.",
        },
        {
          label: "Send payment reminders",
          prompt:
            "Send payment reminders to all customers with overdue invoices.",
        },
      ]}
    >
      <div className="p-3 pb-20 sm:p-6 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." : `${totalCount} invoices`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                openWithFocus(
                  { kind: "Invoices", name: "All Invoices" },
                  "Analyze my invoicing. What's the trend and who owes me money?",
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
              Create Invoice
            </button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable<Invoice>
          columns={columns}
          data={invoices}
          isLoading={isLoading}
          searchPlaceholder="Search by invoice number or customer..."
          emptyIcon={FileText}
          emptyTitle="No invoices created"
          emptyDescription="Create invoices to bill customers and track who owes you money."
          onRowClick={handleRowClick}
          filters={[
            { label: "All", value: "all" },
            { label: "Draft", value: "draft" },
            { label: "Sent", value: "sent" },
            { label: "Paid", value: "paid" },
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
        <CreateInvoiceDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={() => setShowCreateDialog(false)}
        />
      )}
    </ModulePageShell>
  );
}
