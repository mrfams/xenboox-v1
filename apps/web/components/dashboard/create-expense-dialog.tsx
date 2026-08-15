"use client";

import { useState } from "react";
import { ReceiptText, Loader2, AlertCircle } from "lucide-react";

import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";

import { trpc } from "@/lib/trpc/client";

interface CreateExpenseDialogProps {
  open: boolean;
  onClose: () => void;
}

const EXPENSE_CATEGORIES = [
  "Office Supplies",
  "Travel",
  "Software",
  "Marketing",
  "Meals & Entertainment",
  "Utilities",
  "Maintenance",
  "Rent",
  "Salaries",
  "Other",
];

const PAYMENT_METHODS = [
  "bank_transfer",
  "cash",
  "mobile_money",
  "card",
  "cheque",
];

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export function CreateExpenseDialog({
  open,
  onClose,
}: CreateExpenseDialogProps) {
  const utils = trpc.useUtils();

  const { data: suppliers } = trpc.ap.listSuppliers.useQuery(undefined, {
    enabled: open,
  });

  const [supplierId, setSupplierId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(today());
  const [dueDate, setDueDate] = useState(inDays(30));
  const [category, setCategory] = useState("Other");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [error, setError] = useState<string | null>(null);

  const createExpense = trpc.expenses.createExpense.useMutation({
    onSuccess: () => {
      utils.expenses.invalidate();
      utils.ap.invalidate();
      utils.dashboard.invalidate();
      setSupplierId("");
      setDescription("");
      setAmount("");
      setExpenseDate(today());
      setDueDate(inDays(30));
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const canSubmit =
    supplierId && description.trim().length >= 1 && parseFloat(amount) > 0;

  const handleSubmit = () => {
    setError(null);
    createExpense.mutate({
      supplierId,
      description: description.trim(),
      amount: parseFloat(amount).toFixed(2),
      expenseDate,
      dueDate,
      category,
      paymentMethod,
    });
  };

  return (
    <CreateRecordModal
      title="New expense"
      subtitle="Record a business expense for approval"
      icon={<ReceiptText className="h-4 w-4 text-indigo-600" />}
      onClose={onClose}
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
            disabled={!canSubmit || createExpense.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {createExpense.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Create expense
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {suppliers && suppliers.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No vendors yet. Add a vendor from the{" "}
            <span className="font-medium">Vendors</span> module first, then
            record expenses paid to them.
          </div>
        ) : (
          <div>
            <label className={modalLabelCls} htmlFor="ex-payee">
              Paid to (vendor)
            </label>
            <select
              id="ex-payee"
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
        )}

        <div>
          <label className={modalLabelCls} htmlFor="ex-description">
            Description
          </label>
          <input
            id="ex-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this expense for?"
            className={modalInputCls}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="ex-amount">
              Amount (GMD)
            </label>
            <input
              id="ex-amount"
              type="number"
              min={0}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="ex-category">
              Category
            </label>
            <select
              id="ex-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={modalSelectCls}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="ex-method">
              Payment method
            </label>
            <select
              id="ex-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={modalSelectCls}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="ex-date">
              Expense date
            </label>
            <input
              id="ex-date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="ex-due">
              Due date
            </label>
            <input
              id="ex-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={modalInputCls}
            />
          </div>
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
