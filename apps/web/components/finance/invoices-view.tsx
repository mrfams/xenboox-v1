/**
 * Invoices View — Real invoice management with AI insights.
 *
 * Features:
 * - List of AR invoices with status
 * - Filter by status (sent, overdue, paid)
 * - Search by invoice number
 * - AI payment forecast
 * - Actions (view, remind, create)
 */

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { Card, CardContent } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import { Input } from "@xenboox/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@xenboox/ui";
import {
  Search,
  DollarSign,
  Clock,
  AlertTriangle,
  Send,
  Eye,
  Loader2,
  FileText,
  Plus,
  Link2,
  Download,
} from "lucide-react";
import { cn } from "@xenboox/ui";
import { formatCurrency } from "@/lib/utils";
import { InvoiceDetailPanel } from "@/components/finance/invoice-detail-panel";
import { CreatePaymentLinkDialog } from "@/components/dashboard/create-payment-link-dialog";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────

type InvoiceStatus = "all" | "sent" | "overdue" | "paid";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  balance: number;
  status: string;
  customerName: string | null;
  customerId: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────

function exportCsv(invoices: Invoice[]) {
  const headers = [
    "Invoice #",
    "Date",
    "Due Date",
    "Customer",
    "Amount",
    "Balance",
    "Status",
  ];
  const rows = invoices.map((inv) => [
    inv.invoiceNumber,
    inv.invoiceDate,
    inv.dueDate ?? "",
    inv.customerName ?? "",
    inv.totalAmount.toFixed(2),
    inv.balance.toFixed(2),
    inv.status,
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${c}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function InvoicesView() {
  const { entityId } = useEntity();
  const [status, setStatus] = useState<InvoiceStatus>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  // Fetch invoices
  const { data, isLoading, refetch } = trpc.invoicing.listInvoices.useQuery(
    {
      status,
      search: search || undefined,
      limit,
      offset: page * limit,
    },
    { enabled: !!entityId },
  );

  const invoices = data?.invoices ?? [];
  const totalCount = data?.totalCount ?? 0;

  // Calculate summary
  const totalOutstanding = invoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + (inv.balance ?? inv.totalAmount), 0);

  const overdueCount = invoices.filter(
    (inv) => inv.status === "overdue",
  ).length;
  const sentCount = invoices.filter((inv) => inv.status === "sent").length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalOutstanding)}
                </div>
                <div className="text-xs text-muted-foreground">Outstanding</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{overdueCount}</div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{sentCount}</div>
                <div className="text-xs text-muted-foreground">
                  Awaiting Payment
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
        <Tabs
          value={status}
          onValueChange={(v) => {
            setStatus(v as InvoiceStatus);
            setPage(0);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="sent">
              Sent
              {sentCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] px-1.5 py-0"
                >
                  {sentCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue
              {overdueCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 text-[10px] px-1.5 py-0"
                >
                  {overdueCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={() => exportCsv(invoices)}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Create Invoice
        </Button>
      </div>

      {/* Invoices List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
            </div>
          ) : (
            <div className="divide-y">
              {invoices.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  onRefresh={refetch}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * limit + 1}–
            {Math.min((page + 1) * limit, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * limit >= totalCount}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Invoice Row ──────────────────────────────────────────────────────────

function InvoiceRow({
  invoice,
  onRefresh,
}: {
  invoice: Invoice;
  onRefresh: () => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showPaymentLink, setShowPaymentLink] = useState(false);

  const sendEmail = trpc.invoicing.sendInvoiceEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Invoice sent to ${data.sentTo}`);
      onRefresh();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSend = () => {
    setIsProcessing(true);
    sendEmail.mutate(
      { invoiceId: invoice.id },
      { onSettled: () => setIsProcessing(false) },
    );
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800">Sent</Badge>;
      case "partial":
        return <Badge className="bg-amber-100 text-amber-800">Partial</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Days until due
  const getDaysUntilDue = () => {
    if (!invoice.dueDate) return null;
    const due = new Date(invoice.dueDate);
    const now = new Date();
    const diff = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
  };

  const daysUntilDue = getDaysUntilDue();

  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">
              {invoice.invoiceNumber}
            </p>
            {getStatusBadge(invoice.status)}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {invoice.customerName ?? "Unknown customer"} • {invoice.invoiceDate}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Amount */}
        <div className="text-right">
          <p className="font-medium text-sm">
            {formatCurrency(invoice.totalAmount)}
          </p>
          {invoice.balance !== invoice.totalAmount && (
            <p className="text-xs text-muted-foreground">
              Balance: {formatCurrency(invoice.balance)}
            </p>
          )}
        </div>

        {/* Due date */}
        {daysUntilDue !== null && (
          <div className="text-right w-20">
            <p
              className={cn(
                "text-sm",
                daysUntilDue < 0
                  ? "text-red-600 font-medium"
                  : daysUntilDue <= 7
                    ? "text-amber-600"
                    : "text-muted-foreground",
              )}
            >
              {daysUntilDue < 0
                ? `${Math.abs(daysUntilDue)}d overdue`
                : daysUntilDue === 0
                  ? "Due today"
                  : `${daysUntilDue}d`}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowDetail(true)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {invoice.status !== "paid" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleSend}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          )}
          {invoice.status !== "paid" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowPaymentLink(true)}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {showDetail && (
        <InvoiceDetailPanel
          invoiceId={invoice.id}
          onClose={() => setShowDetail(false)}
        />
      )}

      {/* Payment Link Dialog */}
      {showPaymentLink && (
        <CreatePaymentLinkDialog
          invoiceId={invoice.id}
          balance={invoice.balance}
          currency="GMD"
          onClose={() => setShowPaymentLink(false)}
        />
      )}
    </div>
  );
}
