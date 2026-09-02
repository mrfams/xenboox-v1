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
  MoreHorizontal,
  Eye,
  Link2,
  DollarSign,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useModuleAi } from "@/components/module/module-ai-context";
import { CreateInvoiceDialog } from "@/components/dashboard/create-invoice-dialog";
import { CreatePaymentLinkDialog } from "@/components/dashboard/create-payment-link-dialog";
import { RecordPaymentDialog } from "@/components/dashboard/record-payment-dialog";
import { InvoiceDetailPanel } from "@/components/finance/invoice-detail-panel";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

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
      className: "bg-primary/10 text-primary",
    },
    paid: {
      icon: CheckCircle2,
      className: "bg-balanced-green/10 text-balanced-green",
    },
    overdue: {
      icon: AlertCircle,
      className: "bg-error-clay/10 text-error-clay",
    },
    partial: {
      icon: Clock,
      className: "bg-attention-amber/10 text-attention-amber",
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

// ─── Invoices View ─────────────────────────────────────────────────────────
//
// Rendered as the "Invoices" tab of the Operations surface.
// The /dashboard/operations/invoices route wraps this in ModulePageShell.

export function InvoicesView() {
  const { format } = useFormatCurrency();
  const { entityId, entityCurrency } = useEntity();
  const { openWithFocus } = useModuleAi();
  const trpcUtils = trpc.useUtils();
  const [search] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  );
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [paymentLinkInvoiceId, setPaymentLinkInvoiceId] = useState<
    string | null
  >(null);
  const [recordPaymentTarget, setRecordPaymentTarget] = useState<{
    id: string;
    balance: number;
  } | null>(null);

  const { data, isLoading } = trpc.invoicing.listInvoices.useQuery(
    {
      status: filter === "all" ? undefined : filter,
      search: search || undefined,
      limit: 500,
      offset: 0,
    },
    { enabled: !!entityId },
  );

  const invoices = (data?.invoices ?? []) as Invoice[];
  const totalCount = data?.totalCount ?? invoices.length;

  const sendInvoiceEmail = trpc.invoicing.sendInvoiceEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Invoice sent to ${data.sentTo}`);
      trpcUtils.invoicing.listInvoices.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSendInvoice = (invoiceId: string) => {
    sendInvoiceEmail.mutate({ invoiceId });
    setActionMenuId(null);
  };

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNumber",
      label: "Invoice",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
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
              isOverdue
                ? "text-error-clay font-medium"
                : "text-muted-foreground",
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
          {format(row.total ?? 0, entityCurrency ?? "USD")}
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
              balance > 0 ? "text-attention-amber" : "text-balanced-green",
            )}
          >
            {format(balance, entityCurrency ?? "USD")}
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
      key: "actions",
      label: "",
      width: "40px",
      render: (row) => (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActionMenuId(actionMenuId === row.id ? null : row.id);
            }}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {actionMenuId === row.id && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setActionMenuId(null)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-card p-1 shadow-lg">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedInvoiceId(row.id);
                    setActionMenuId(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  View Details
                </button>
                {row.status !== "paid" &&
                  row.status !== "voided" &&
                  row.status !== "draft" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendInvoice(row.id);
                      }}
                      disabled={sendInvoiceEmail.isPending}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <Send className="h-4 w-4 text-muted-foreground" />
                      Send Invoice
                    </button>
                  )}
                {row.status !== "paid" && row.status !== "voided" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaymentLinkInvoiceId(row.id);
                      setActionMenuId(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    Payment Link
                  </button>
                )}
                {row.status !== "paid" && row.status !== "voided" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecordPaymentTarget({
                        id: row.id,
                        balance: row.balance ?? 0,
                      });
                      setActionMenuId(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Record Payment
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ),
    },
    {
      key: "chevron",
      label: "",
      width: "40px",
      render: () => (
        <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
      ),
    },
  ];

  const handleRowClick = (row: Invoice) => {
    setSelectedInvoiceId(row.id);
  };

  return (
    <>
      <div>
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
      <CreateInvoiceDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      {/* Payment Link Dialog */}
      {paymentLinkInvoiceId && (
        <CreatePaymentLinkDialog
          invoiceId={paymentLinkInvoiceId}
          onClose={() => setPaymentLinkInvoiceId(null)}
        />
      )}

      {/* Record Payment Dialog */}
      {recordPaymentTarget && (
        <RecordPaymentDialog
          invoiceId={recordPaymentTarget.id}
          balance={recordPaymentTarget.balance}
          onClose={() => setRecordPaymentTarget(null)}
          onPaymentRecorded={() => {
            setRecordPaymentTarget(null);
            trpcUtils.invoicing.listInvoices.invalidate();
          }}
        />
      )}

      {/* Detail Panel */}
      {selectedInvoiceId && (
        <InvoiceDetailPanel
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </>
  );
}
