"use client";

import { useState } from "react";
import {
  Link2,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useFormatCurrency } from "@/lib/hooks/use-currency";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CreatePaymentLinkDialogProps {
  invoiceId: string;
  balance: number;
  currency: string;
  onClose: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function CreatePaymentLinkDialog({
  invoiceId,
  balance,
  currency,
  onClose,
}: CreatePaymentLinkDialogProps) {
  const { format } = useFormatCurrency();
  const { entityId } = useEntity();
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([
    "card",
    "bank_transfer",
    "mobile_money",
  ]);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] = useState<{
    token: string;
    link: string;
  } | null>(null);

  const createLink = trpc.paymentLinks.create.useMutation({
    onSuccess: (data) => {
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      const link = `${baseUrl}/pay/${data.token}`;
      setGenerated({ token: data.token, link });
      toast.success("Payment link created");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleGenerate = () => {
    createLink.mutate({
      invoiceId,
      expiresInDays,
      paymentMethods: paymentMethods.join(","),
      note: note.trim() || undefined,
    });
  };

  const handleCopy = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.link);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const toggleMethod = (method: string) => {
    setPaymentMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method],
    );
  };

  // Success state — show the generated link
  if (generated) {
    return (
      <CreateRecordModal
        title="Payment Link Created"
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        onClose={onClose}
        maxWidth="max-w-lg"
        footer={
          <>
            <a
              href={generated.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              Preview
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Done
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-center text-sm text-slate-500">
            Share this link with your customer to collect payment.
          </p>

          {/* Link display */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-xs font-medium text-slate-500">
              Payment Link
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate font-mono text-sm text-slate-700">
                {generated.link}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-lg bg-white border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold text-slate-900">
                {currency} {format(balance)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-slate-500">Expires in</span>
              <span className="text-slate-700">{expiresInDays} days</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-slate-500">Payment methods</span>
              <span className="text-slate-700">
                {paymentMethods.map((m) => m.replace("_", " ")).join(", ")}
              </span>
            </div>
          </div>
        </div>
      </CreateRecordModal>
    );
  }

  // Form state — configure the link
  return (
    <CreateRecordModal
      title="Create Payment Link"
      subtitle={`Generate a secure payment link for ${format(balance)}`}
      icon={<Link2 className="h-4 w-4 text-primary" />}
      onClose={onClose}
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={createLink.isPending || paymentMethods.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {createLink.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Generate Link
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Amount (read-only) */}
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Payment Amount</p>
          <p className="text-lg font-bold text-slate-900">
            {currency} {format(balance)}
          </p>
        </div>

        {/* Expiry */}
        <div>
          <label className={modalLabelCls} htmlFor="link-expiry">
            Link Expires In
          </label>
          <select
            id="link-expiry"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
            className={modalSelectCls}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>

        {/* Payment Methods */}
        <div>
          <label className={modalLabelCls}>Payment Methods</label>
          <div className="mt-2 space-y-2">
            {[
              { id: "card", label: "Credit / Debit Card" },
              { id: "bank_transfer", label: "Bank Transfer" },
              { id: "mobile_money", label: "Mobile Money" },
            ].map((method) => (
              <label
                key={method.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={paymentMethods.includes(method.id)}
                  onChange={() => toggleMethod(method.id)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-slate-700">{method.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <label className={modalLabelCls} htmlFor="link-note">
            Note (optional)
          </label>
          <input
            id="link-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Internal note about this payment"
            className={modalInputCls}
          />
        </div>
      </div>
    </CreateRecordModal>
  );
}
