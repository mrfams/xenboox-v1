"use client";

import { useState } from "react";
import { Scale, Loader2, AlertCircle } from "lucide-react";

import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";

import { trpc } from "@/lib/trpc/client";

interface CreateReconciliationDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateReconciliationDialog({
  open,
  onClose,
}: CreateReconciliationDialogProps) {
  const utils = trpc.useUtils();

  const { data: accounts } = trpc.treasury.listBankAccounts.useQuery(
    undefined,
    {
      enabled: open,
    },
  );

  const [bankAccountId, setBankAccountId] = useState("");
  const [statementDate, setStatementDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [statementBalance, setStatementBalance] = useState("");
  const [bookBalance, setBookBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createRecon = trpc.treasury.createReconciliation.useMutation({
    onSuccess: () => {
      utils.reconciliation.invalidate();
      utils.treasury.invalidate();
      setBankAccountId("");
      setStatementBalance("");
      setBookBalance("");
      setNotes("");
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const canSubmit =
    bankAccountId &&
    statementDate &&
    statementBalance.trim() !== "" &&
    bookBalance.trim() !== "";

  const handleSubmit = () => {
    setError(null);
    createRecon.mutate({
      bankAccountId,
      statementDate,
      statementBalance: parseFloat(statementBalance).toFixed(2),
      bookBalance: parseFloat(bookBalance).toFixed(2),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <CreateRecordModal
      title="New reconciliation"
      subtitle="Start reconciling a bank statement against your books"
      icon={<Scale className="h-4 w-4 text-indigo-600" />}
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
            disabled={!canSubmit || createRecon.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {createRecon.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Start reconciliation
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {accounts && accounts.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No bank accounts yet. Create one from the{" "}
            <span className="font-medium">Banking</span> module first, then
            start a reconciliation.
          </div>
        ) : (
          <div>
            <label className={modalLabelCls} htmlFor="rec-account">
              Bank account
            </label>
            <select
              id="rec-account"
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className={modalSelectCls}
            >
              <option value="">Select account</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.accountNumber}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={modalLabelCls} htmlFor="rec-date">
            Statement date
          </label>
          <input
            id="rec-date"
            type="date"
            value={statementDate}
            onChange={(e) => setStatementDate(e.target.value)}
            className={modalInputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="rec-statement">
              Statement balance (GMD)
            </label>
            <input
              id="rec-statement"
              type="number"
              step="any"
              value={statementBalance}
              onChange={(e) => setStatementBalance(e.target.value)}
              placeholder="0.00"
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="rec-book">
              Book balance (GMD)
            </label>
            <input
              id="rec-book"
              type="number"
              step="any"
              value={bookBalance}
              onChange={(e) => setBookBalance(e.target.value)}
              placeholder="0.00"
              className={modalInputCls}
            />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          The difference between these two balances is what you will reconcile
          line by line.
        </p>

        <div>
          <label className={modalLabelCls} htmlFor="rec-notes">
            Notes (optional)
          </label>
          <textarea
            id="rec-notes"
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
