"use client";

import { useState } from "react";
import { Building2, Loader2, AlertCircle } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";

interface CreateBankAccountDialogProps {
  open: boolean;
  onClose: () => void;
}

const ACCOUNT_TYPES = ["checking", "savings", "fixed_deposit"] as const;

export function CreateBankAccountDialog({
  open,
  onClose,
}: CreateBankAccountDialogProps) {
  const utils = trpc.useUtils();
  const { entityCurrency } = useEntity();

  const [name, setName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [currency, setCurrency] = useState(entityCurrency ?? "GMD");
  const [type, setType] = useState<(typeof ACCOUNT_TYPES)[number]>("checking");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createAccount = trpc.treasury.createBankAccount.useMutation({
    onSuccess: () => {
      utils.banking.invalidate();
      utils.transactions.invalidate();
      utils.treasury.invalidate();
      utils.dashboard.invalidate();
      setName("");
      setBankName("");
      setAccountNumber("");
      setOpeningBalance("0");
      setNotes("");
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const canSubmit =
    name.trim().length >= 1 &&
    bankName.trim().length >= 1 &&
    accountNumber.trim().length >= 1;

  const handleSubmit = () => {
    setError(null);
    createAccount.mutate({
      name: name.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      currency,
      type,
      openingBalance,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <CreateRecordModal
      title="New bank account"
      subtitle="Add a manual account — balances are tracked from here"
      icon={<Building2 className="h-4 w-4 text-indigo-600" />}
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
            disabled={!canSubmit || createAccount.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {createAccount.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Create account
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="ba-name">
              Account name
            </label>
            <input
              id="ba-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GTBank Main Account"
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="ba-bank">
              Bank / institution
            </label>
            <input
              id="ba-bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. GTBank Gambia Ltd"
              className={modalInputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="ba-number">
              Account number
            </label>
            <input
              id="ba-number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 0098765432"
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="ba-type">
              Account type
            </label>
            <select
              id="ba-type"
              value={type}
              onChange={(e) =>
                setType(e.target.value as (typeof ACCOUNT_TYPES)[number])
              }
              className={modalSelectCls}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="ba-currency">
              Currency
            </label>
            <select
              id="ba-currency"
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

        <div>
          <label className={modalLabelCls} htmlFor="ba-balance">
            Opening balance ({currency})
          </label>
          <input
            id="ba-balance"
            type="number"
            step="any"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            className={modalInputCls}
          />
          <p className="mt-1 text-xs text-slate-400">
            The account balance when you start tracking it in Xenboox.
          </p>
        </div>

        <div>
          <label className={modalLabelCls} htmlFor="ba-notes">
            Notes (optional)
          </label>
          <textarea
            id="ba-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
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
