"use client";

import { useState, useEffect } from "react";
import { Receipt, Loader2, AlertCircle } from "lucide-react";

import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";
import { InvoiceLinesEditor, type InvoiceLine } from "./invoice-lines-editor";
import { CreatableCombobox } from "@/components/shared/customer-combobox";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { SUPPORTED_CURRENCIES } from "@/lib/config";
import { isValidMoney } from "../../server/ar-validation";

interface CreateBillDialogProps {
  open: boolean;
  onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export function CreateBillDialog({ open, onClose }: CreateBillDialogProps) {
  const utils = trpc.useUtils();
  const { entityCurrency } = useEntity();

  const { data: suppliers } = trpc.ap.listSuppliers.useQuery(undefined, {
    enabled: open,
  });
  const { data: accounts } = trpc.coa.list.useQuery(undefined, {
    enabled: open,
  });
  const { data: nextNumberData } = trpc.bills.getNextBillNumber.useQuery(
    undefined,
    { enabled: open },
  );

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState(inDays(30));
  const [currency, setCurrency] = useState(entityCurrency ?? "USD");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createSupplier = trpc.ap.createSupplier.useMutation();

  const handleCreateSupplier = async (name: string) => {
    const result = await createSupplier.mutateAsync({ name });
    if (!result) throw new Error("Failed to create vendor");
    utils.ap.invalidate();
    return { id: result.id, name: result.name };
  };

  // Pre-fill bill number when server responds
  useEffect(() => {
    if (nextNumberData?.billNumber && !invoiceNumber) {
      setInvoiceNumber(nextNumberData.billNumber);
    }
  }, [nextNumberData, invoiceNumber]);

  const createBill = trpc.ap.createInvoice.useMutation({
    onSuccess: () => {
      utils.bills.invalidate();
      utils.ap.invalidate();
      utils.expenses.invalidate();
      utils.dashboard.invalidate();
      setSupplierId("");
      setInvoiceNumber("");
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

  // B10: validate every line and tell the user — never silently drop an
  // invalid line from the submitted bill (parity with the invoice dialog).
  const lineErrors = lines.map((l) => {
    if (!l.description.trim()) return "Description is required";
    if (!l.accountId) return "Choose an account for this line";
    if (!(parseFloat(l.quantity) > 0)) {
      return "Quantity must be greater than 0";
    }
    if (!isValidMoney(l.unitPrice)) {
      return "Enter a valid price, e.g. 25.00";
    }
    return null;
  });
  const invalidLineCount = lineErrors.filter(Boolean).length;
  const total = lines.reduce((sum, l) => {
    if (!isValidMoney(l.unitPrice)) return sum;
    const qty = parseFloat(l.quantity);
    if (!(qty > 0)) return sum;
    return sum + qty * parseFloat(l.unitPrice);
  }, 0);
  const canSubmit =
    supplierId &&
    invoiceNumber.trim() &&
    lines.length > 0 &&
    invalidLineCount === 0;

  const handleSubmit = () => {
    setError(null);
    if (invalidLineCount > 0) {
      const firstErrors = [
        ...new Set(lineErrors.filter((e): e is string => !!e)),
      ]
        .slice(0, 3)
        .join("; ");
      setError(
        `Fix ${invalidLineCount} line item${invalidLineCount > 1 ? "s" : ""} first — ${firstErrors}`,
      );
      return;
    }
    createBill.mutate({
      supplierId,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate,
      currency,
      notes: notes.trim() || undefined,
      lines: lines.map((l) => ({
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="bill-vendor">
              Vendor
            </label>
            <CreatableCombobox
              value={supplierId}
              onChange={setSupplierId}
              items={(suppliers ?? []).map((s) => ({ id: s.id, name: s.name }))}
              onCreate={handleCreateSupplier}
              entityLabel="vendor"
              emptyMessage="No vendors yet"
              placeholder="Search or type a new vendor name..."
            />
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
              {SUPPORTED_CURRENCIES.map((c) => (
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
          currency={currency}
        />

        {invalidLineCount > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {invalidLineCount} line item{invalidLineCount > 1 ? "s" : ""} need
              {invalidLineCount > 1 ? "" : "s"} attention before this bill can
              be created — fix the highlighted fields or remove the line.
            </span>
          </div>
        )}

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
