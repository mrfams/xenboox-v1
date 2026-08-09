"use client";

import { useState } from "react";
import { FileText, Loader2, AlertCircle } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";
import { InvoiceLinesEditor, type InvoiceLine } from "./invoice-lines-editor";

interface CreateInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const defaultInvoiceNumber = () =>
  `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

export function CreateInvoiceDialog({
  open,
  onClose,
}: CreateInvoiceDialogProps) {
  const utils = trpc.useUtils();

  const { data: customers } = trpc.invoicing.getCustomers.useQuery(undefined, {
    enabled: open,
  });
  const { data: accounts } = trpc.coa.list.useQuery(undefined, {
    enabled: open,
  });

  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(defaultInvoiceNumber());
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState(inDays(30));
  const [currency, setCurrency] = useState("GMD");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createInvoice = trpc.ar.createInvoice.useMutation({
    onSuccess: () => {
      utils.invoicing.invalidate();
      utils.ar.invalidate();
      utils.dashboard.invalidate();
      setCustomerId("");
      setInvoiceNumber(defaultInvoiceNumber());
      setInvoiceDate(today());
      setDueDate(inDays(30));
      setNotes("");
      setLines([]);
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const revenueAccounts = (accounts ?? []).filter(
    (a) => a.type === "revenue" || a.type === "asset",
  );
  const validLines = lines.filter(
    (l) =>
      l.description.trim() &&
      l.accountId &&
      parseFloat(l.quantity) > 0 &&
      parseFloat(l.unitPrice) >= 0,
  );
  const total = validLines.reduce(
    (sum, l) => sum + parseFloat(l.quantity) * parseFloat(l.unitPrice),
    0,
  );
  const canSubmit = customerId && invoiceNumber.trim() && validLines.length > 0;

  const handleSubmit = () => {
    setError(null);
    createInvoice.mutate({
      customerId,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate,
      currency,
      notes: notes.trim() || undefined,
      lines: validLines.map((l) => ({
        description: l.description.trim(),
        accountId: l.accountId,
        quantity: parseFloat(l.quantity),
        unitPrice: parseFloat(l.unitPrice).toFixed(2),
      })),
    });
  };

  return (
    <CreateRecordModal
      title="New invoice"
      subtitle="Bill a customer for goods or services"
      icon={<FileText className="h-4 w-4 text-indigo-600" />}
      onClose={onClose}
      maxWidth="max-w-3xl"
      footer={
        <>
          <p className="mr-auto text-sm font-medium text-slate-900">
            Total:{" "}
            <span className="tabular-nums">
              {total.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {currency}
            </span>
          </p>
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
            disabled={!canSubmit || createInvoice.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {createInvoice.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Create invoice
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {customers && customers.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No customers yet. Add a customer from the{" "}
            <span className="font-medium">Customers</span> module first, then
            create invoices for them.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={modalLabelCls} htmlFor="inv-customer">
                Customer
              </label>
              <select
                id="inv-customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={modalSelectCls}
              >
                <option value="">Select customer</option>
                {customers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={modalLabelCls} htmlFor="inv-number">
                Invoice number
              </label>
              <input
                id="inv-number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className={modalInputCls}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="inv-date">
              Invoice date
            </label>
            <input
              id="inv-date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="inv-due">
              Due date
            </label>
            <input
              id="inv-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="inv-currency">
              Currency
            </label>
            <select
              id="inv-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={modalSelectCls}
            >
              {["GMD", "USD", "EUR", "GBP", "NGN"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <InvoiceLinesEditor
          lines={lines}
          onChange={setLines}
          accounts={revenueAccounts}
        />

        <div>
          <label className={modalLabelCls} htmlFor="inv-notes">
            Notes (optional)
          </label>
          <textarea
            id="inv-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Terms, references, or a thank-you note"
            className={modalInputCls}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </CreateRecordModal>
  );
}
