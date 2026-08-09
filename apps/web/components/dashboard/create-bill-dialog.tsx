"use client";

import { useState } from "react";
import { Receipt, Loader2, AlertCircle } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";
import { InvoiceLinesEditor, type InvoiceLine } from "./invoice-lines-editor";

interface CreateBillDialogProps {
  open: boolean;
  onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const defaultBillNumber = () =>
  `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

export function CreateBillDialog({ open, onClose }: CreateBillDialogProps) {
  const utils = trpc.useUtils();

  const { data: suppliers } = trpc.ap.listSuppliers.useQuery(undefined, {
    enabled: open,
  });
  const { data: accounts } = trpc.coa.list.useQuery(undefined, {
    enabled: open,
  });

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(defaultBillNumber());
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState(inDays(30));
  const [currency, setCurrency] = useState("GMD");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createBill = trpc.ap.createInvoice.useMutation({
    onSuccess: () => {
      utils.bills.invalidate();
      utils.ap.invalidate();
      utils.expenses.invalidate();
      utils.dashboard.invalidate();
      setSupplierId("");
      setInvoiceNumber(defaultBillNumber());
      setInvoiceDate(today());
      setDueDate(inDays(30));
      setNotes("");
      setLines([]);
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const expenseAccounts = (accounts ?? []).filter(
    (a) => a.type === "expense" || a.type === "asset",
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
  const canSubmit = supplierId && invoiceNumber.trim() && validLines.length > 0;

  const handleSubmit = () => {
    setError(null);
    createBill.mutate({
      supplierId,
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
      title="New bill"
      subtitle="Record a bill you owe a vendor"
      icon={<Receipt className="h-4 w-4 text-indigo-600" />}
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
            disabled={!canSubmit || createBill.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {createBill.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Create bill
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {suppliers && suppliers.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No vendors yet. Add a vendor from the{" "}
            <span className="font-medium">Vendors</span> module first, then
            record bills from them.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={modalLabelCls} htmlFor="bill-vendor">
                Vendor
              </label>
              <select
                id="bill-vendor"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className={modalSelectCls}
              >
                <option value="">Select vendor</option>
                {suppliers?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={modalLabelCls} htmlFor="bill-number">
                Bill number
              </label>
              <input
                id="bill-number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className={modalInputCls}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="bill-date">
              Bill date
            </label>
            <input
              id="bill-date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="bill-due">
              Due date
            </label>
            <input
              id="bill-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="bill-currency">
              Currency
            </label>
            <select
              id="bill-currency"
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
          accounts={expenseAccounts}
        />

        <div>
          <label className={modalLabelCls} htmlFor="bill-notes">
            Notes (optional)
          </label>
          <textarea
            id="bill-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Reference, PO number, or payment terms"
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
