"use client";

import { useState } from "react";
import {
  Link2,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  MousePointerClick,
  DollarSign,
  BarChart3,
  QrCode,
  Send,
  Trash2,
  RefreshCw,
  Eye,
  Bot,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ModulePageShell } from "@/components/module/module-page-shell";
import type { SummaryCardItem } from "@/components/module/module-page-shell.types";
import { RowActionsMenu } from "@/components/module/row-actions-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@xenboox/ui/dialog";
import { Button } from "@xenboox/ui/button";
import { Input } from "@xenboox/ui/input";
import { Label } from "@xenboox/ui/label";
import { Badge } from "@xenboox/ui/badge";
import { toast } from "sonner";

// ─── Summary Cards ─────────────────────────────────────────────────────

function buildSummaryCards(summary: {
  active: number;
  paid: number;
  expired: number;
  totalAmount: number;
  paidAmount: number;
  totalClicks: number;
  conversionRate: number;
}): SummaryCardItem[] {
  return [
    {
      label: "Active Links",
      value: summary.active.toString(),
      icon: Link2,
      color: "text-blue-600",
    },
    {
      label: "Paid via Links",
      value: summary.paid.toString(),
      icon: CheckCircle2,
      color: "text-green-600",
    },
    {
      label: "Total Revenue",
      value: `GMD ${summary.paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-emerald-600",
    },
    {
      label: "Conversion Rate",
      value: `${summary.conversionRate}%`,
      icon: BarChart3,
      color: "text-violet-600",
    },
  ];
}

// ─── Status Badge ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: { label: "Active", className: "bg-blue-100 text-blue-800" },
    paid: { label: "Paid", className: "bg-green-100 text-green-800" },
    expired: { label: "Expired", className: "bg-gray-100 text-gray-600" },
    cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
  }[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 transition-colors"
      title="Copy link"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-600" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  );
}

// ─── Create Payment Link Dialog ───────────────────────────────────────

function CreatePaymentLinkDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [invoiceId, setInvoiceId] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [note, setNote] = useState("");

  const utils = trpc.useUtils();
  const createLink = trpc.paymentLinks.create.useMutation({
    onSuccess: () => {
      toast.success("Payment link created");
      utils.paymentLinks.list.invalidate();
      utils.paymentLinks.getSummary.invalidate();
      onSuccess();
      onOpenChange(false);
      setInvoiceId("");
      setExpiresInDays("30");
      setNote("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    if (!invoiceId.trim()) {
      toast.error("Invoice ID is required");
      return;
    }
    createLink.mutate({
      invoiceId: invoiceId.trim(),
      expiresInDays: parseInt(expiresInDays) || 30,
      note: note || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Payment Link</DialogTitle>
          <DialogDescription>
            Generate a shareable payment link for an invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="invoice-id">Invoice ID</Label>
            <Input
              id="invoice-id"
              placeholder="Paste invoice UUID"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="expires">Expires in (days)</Label>
            <Input
              id="expires"
              type="number"
              min={1}
              max={365}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="note">Note (optional)</Label>
            <Input
              id="note"
              placeholder="Internal note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createLink.isPending || !invoiceId.trim()}
          >
            {createLink.isPending ? "Creating..." : "Create Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function PaymentLinksPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: summary, isLoading: summaryLoading } =
    trpc.paymentLinks.getSummary.useQuery();

  const { data, isLoading, refetch } = trpc.paymentLinks.list.useQuery({
    status: statusFilter as "all" | "active" | "expired" | "paid" | "cancelled",
    limit: 50,
  });

  const cancelMutation = trpc.paymentLinks.cancel.useMutation({
    onSuccess: () => {
      toast.success("Payment link cancelled");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const reactivateMutation = trpc.paymentLinks.reactivate.useMutation({
    onSuccess: () => {
      toast.success("Payment link reactivated");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://xenboox.com";

  const summaryCards = summary ? buildSummaryCards(summary) : [];

  const filters = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "paid", label: "Paid" },
    { key: "expired", label: "Expired" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <ModulePageShell
      title="Payment Links"
      description="Create and manage shareable payment links for your invoices"
      summaryCards={summaryCards}
      summaryLoading={summaryLoading}
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Link
        </Button>
      }
    >
      {/* Filters */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
              statusFilter === f.key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Links Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      ) : !data?.links.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16">
          <Link2 className="mb-4 h-10 w-10 text-slate-400" />
          <h3 className="text-lg font-medium text-slate-900">
            No payment links
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Create a payment link to let customers pay invoices online.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Payment Link
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {data.links.map((link) => {
            const paymentUrl = `${baseUrl}/pay/${link.token}`;
            const isExpired =
              link.expiresAt && new Date(link.expiresAt) < new Date();

            return (
              <div
                key={link.id}
                className={cn(
                  "rounded-lg border bg-white p-4 transition-all hover:shadow-sm",
                  link.status === "paid" && "border-green-200 bg-green-50/30",
                  link.status === "expired" && "border-slate-200 opacity-70",
                  link.status === "cancelled" && "border-red-200 bg-red-50/30",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900">
                        {link.invoiceNumber}
                      </h3>
                      <StatusBadge status={link.status} />
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {link.customerName && `${link.customerName} • `}
                      {link.currency}{" "}
                      {parseFloat(link.amount).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <MousePointerClick className="h-3 w-3" />
                        {link.clickCount} clicks
                      </span>
                      {link.expiresAt && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {isExpired
                            ? "Expired"
                            : `Expires ${new Date(link.expiresAt).toLocaleDateString()}`}
                        </span>
                      )}
                      {link.paidAt && (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid {new Date(link.paidAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {link.status === "active" && (
                      <>
                        <CopyButton text={paymentUrl} />
                        <button
                          onClick={() => window.open(paymentUrl, "_blank")}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 transition-colors"
                          title="Open link"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </button>
                      </>
                    )}

                    <RowActionsMenu
                      actions={[
                        ...(link.status === "active"
                          ? [
                              {
                                label: "Cancel Link",
                                icon: Ban,
                                onClick: () =>
                                  cancelMutation.mutate({ linkId: link.id }),
                                destructive: true,
                              },
                            ]
                          : []),
                        ...(link.status === "cancelled" ||
                        link.status === "expired"
                          ? [
                              {
                                label: "Reactivate",
                                icon: RefreshCw,
                                onClick: () =>
                                  reactivateMutation.mutate({
                                    linkId: link.id,
                                  }),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreatePaymentLinkDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => refetch()}
      />
    </ModulePageShell>
  );
}
