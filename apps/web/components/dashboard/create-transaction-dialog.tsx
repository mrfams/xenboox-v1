"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";

import { trpc } from "@/lib/trpc/client";

interface CreateTransactionDialogProps {
  open: boolean;
  onClose: () => void;
}

const TX_TYPES = [
  { value: "deposit", label: "Deposit", icon: ArrowDownLeft },
  { value: "withdrawal", label: "Withdrawal", icon: ArrowUpRight },
  { value: "transfer", label: "Transfer", icon: ArrowUpRight },
  { value: "fee", label: "Fee", icon: ArrowUpRight },
  { value: "interest", label: "Interest", icon: ArrowDownLeft },
] as const;

export function CreateTransactionDialog({
  open,
  onClose,
}: CreateTransactionDialogProps) {
  const utils = trpc.useUtils();
  const { data: accounts } = trpc.transactions.getAccounts.useQuery(undefined, {
    enabled: open,
  });

  const [bankAccountId, setBankAccountId] = useState("");
  const [type, setType] =
    useState<(typeof TX_TYPES)[number]["value"]>("withdrawal");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createTransaction = trpc.transactions.createTransaction.useMutation({
    onSuccess: () => {
      utils.transactions.invalidate();
      utils.banking.invalidate();
      utils.dashboard.invalidate();
      setBankAccountId("");
      setAmount("");
      setDescription("");
      setReference("");
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const canSubmit =
    bankAccountId &&
    description.trim().length >= 1 &&
    amount.trim() !== "" &&
    parseFloat(amount) > 0;

  const handleSubmit = () => {
    setError(null);
    createTransaction.mutate({
      bankAccountId,
      type,
      amount: parseFloat(amount).toFixed(2),
      description: description.trim(),
      transactionDate,
      reference: reference.trim() || undefined,
    });
  };

  const SelectedIcon =
    TX_TYPES.find((t) => t.value === type)?.icon ?? ArrowUpRight;

  return (
    <CreateRecordModal
      title="New transaction"
      subtitle="Record a manual transaction against a bank account"
      icon={<SelectedIcon className="h-4 w-4 text-indigo-600" />}
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
            disabled={!canSubmit || createTransaction.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {createTransaction.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Create transaction
          </button>
        </>
      }
    >
      {accounts && accounts.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No bank accounts yet. Create one from the{" "}
          <span className="font-medium">Banking</span> module first, then record
          transactions against it.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={modalLabelCls} htmlFor="tx-account">
                Bank account
              </label>
              <select
                id="tx-account"
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className={modalSelectCls}
              >
                <option value="">Select account</option>
                {accounts?.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} · {acc.bankName} ({acc.accountNumber})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={modalLabelCls} htmlFor="tx-date">
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className={modalInputCls}
              />
            </div>
          </div>

          <div>
            <label className={modalLabelCls}>Type</label>
            <div className="grid grid-cols-3 gap-2">
              {TX_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    type === t.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={modalLabelCls} htmlFor="tx-amount">
                Amount (GMD)
              </label>
              <input
                id="tx-amount"
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
              <label className={modalLabelCls} htmlFor="tx-reference">
                Reference (optional)
              </label>
              <input
                id="tx-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. TRF-00123"
                className={modalInputCls}
              />
            </div>
          </div>

          <div>
            <label className={modalLabelCls} htmlFor="tx-description">
              Description
            </label>
            <input
              id="tx-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this transaction for?"
              className={modalInputCls}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </CreateRecordModal>
  );
}
