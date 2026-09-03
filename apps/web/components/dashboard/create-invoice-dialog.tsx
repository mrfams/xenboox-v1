"use client";

import { useState, useEffect } from "react";
import { FileText, Loader2, AlertCircle } from "lucide-react";

import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";
import { InvoiceLinesEditor, type InvoiceLine } from "./invoice-lines-editor";
import { CustomerCombobox } from "@/components/shared/customer-combobox";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { SUPPORTED_CURRENCIES } from "@/lib/config";
import { dispatchActivationEvent } from "@/lib/hooks/use-activation-tracking";

interface CreateInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export function CreateInvoiceDialog({
  open,
  onClose,
}: CreateInvoiceDialogProps) {
  const utils = trpc.useUtils();
  const { entityCurrency } = useEntity();

  const { data: customers } = trpc.invoicing.getCustomers.useQuery(undefined, {
    enabled: open,
  });
  const { data: accounts } = trpc.coa.list.useQuery(undefined, {
    enabled: open,
  });
  const { data: nextNumberData } = trpc.invoicing.getNextInvoiceNumber.useQuery(
    undefined,
    { enabled: open },
  );

  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState(inDays(30));
  const [currency, setCurrency] = useState(entityCurrency ?? "USD");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createCustomer = trpc.ar.createCustomer.useMutation();

  // Pre-fill invoice number when server responds
  useEffect(() => {
    if (nextNumberData?.invoiceNumber && !invoiceNumber) {
      setInvoiceNumber(nextNumberData.invoiceNumber);
    }
  }, [nextNumberData, invoiceNumber]);

  const handleCreateCustomer = async (name: string) => {
    const result = await createCustomer.mutateAsync({ name });
    if (!result) throw new Error("Failed to create customer");
    utils.customers.invalidate();
    utils.ar.invalidate();
    return { id: result.id, name: result.name };
  };

  const createInvoice = trpc.ar.createInvoice.useMutation({
    onSuccess: () => {
      utils.invoicing.invalidate();
      utils.ar.invalidate();
      utils.dashboard.invalidate();
      dispatchActivationEvent("first_invoice", {
        type: "sales",
        amount: total,
        currency,
      });
      setCustomerId("");
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="inv-customer">
              Customer
            </label>
            <CustomerCombobox
              value={customerId}
              onChange={setCustomerId}
              items={customers ?? []}
              onCreate={handleCreateCustomer}
              placeholder="Search or type a new customer name..."
            />
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
          accounts={revenueAccounts}
          currency={currency}
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
