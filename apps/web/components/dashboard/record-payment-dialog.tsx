"use client";

import { useState } from "react";
import { DollarSign, Loader2, CheckCircle2 } from "lucide-react";

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

interface RecordPaymentDialogProps {
  invoiceId: string;
  balance: number;
  onClose: () => void;
  onPaymentRecorded: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "check", label: "Check" },
  { value: "card", label: "Card" },
];

// ─── Component ─────────────────────────────────────────────────────────────

export function RecordPaymentDialog({
  invoiceId,
  balance,
  onClose,
  onPaymentRecorded,
}: RecordPaymentDialogProps) {
  const { format } = useFormatCurrency();
  const utils = trpc.useUtils();

  const [amount, setAmount] = useState(balance.toFixed(2));
  const [method, setMethod] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(today());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);

  const createPayment = trpc.ar.createPayment.useMutation({
    onSuccess: () => {
      utils.invoicing.invalidate();
      utils.ar.invalidate();
      setSuccess(true);
      toast.success("Payment recorded successfully");
      setTimeout(() => {
        onPaymentRecorded();
      }, 1500);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (paymentAmount > balance * 1.01) {
      toast.error("Payment amount exceeds invoice balance");
      return;
    }

    createPayment.mutate({
      salesInvoiceId: invoiceId,
      amount: paymentAmount.toFixed(2),
      paymentDate,
      method: method as
        | "bank_transfer"
        | "cash"
        | "mobile_money"
        | "check"
        | "card",
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onPaymentRecorded}
        />
        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Payment Recorded
            </h2>
            <p className="text-sm text-slate-500">
              {format(parseFloat(amount))} has been applied to this invoice.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CreateRecordModal
      title="Record Payment"
      subtitle={`Record a payment for invoice — balance: ${format(balance)}`}
      icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
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
            onClick={handleSubmit}
            disabled={createPayment.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {createPayment.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Record Payment
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Amount */}
        <div>
          <label className={modalLabelCls} htmlFor="pay-amount">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              GMD
            </span>
            <input
              id="pay-amount"
              type="number"
              step="0.01"
              min="0"
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${modalInputCls} pl-12 font-mono`}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Balance due: {format(balance)}
          </p>
        </div>

        {/* Quick amount buttons */}
        <div className="flex gap-2">
          {[
            { label: "Full", value: balance },
            { label: "50%", value: balance * 0.5 },
            { label: "25%", value: balance * 0.25 },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setAmount(opt.value.toFixed(2))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Method & Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="pay-method">
              Payment Method
            </label>
            <select
              id="pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={modalSelectCls}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="pay-date">
              Payment Date
            </label>
            <input
              id="pay-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={modalInputCls}
            />
          </div>
        </div>

        {/* Reference */}
        <div>
          <label className={modalLabelCls} htmlFor="pay-reference">
            Reference (optional)
          </label>
          <input
            id="pay-reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Transaction ID, check number, etc."
            className={modalInputCls}
          />
        </div>

        {/* Notes */}
        <div>
          <label className={modalLabelCls} htmlFor="pay-notes">
            Notes (optional)
          </label>
          <textarea
            id="pay-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional notes about this payment"
            className={modalInputCls}
          />
        </div>
      </div>
    </CreateRecordModal>
  );
}
