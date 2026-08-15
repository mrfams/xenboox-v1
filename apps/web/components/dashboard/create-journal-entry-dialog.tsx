"use client";

import { useState } from "react";
import { BookOpen, Loader2, Plus, Trash2, AlertCircle } from "lucide-react";

import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";

import { trpc } from "@/lib/trpc/client";

interface CreateJournalEntryDialogProps {
  open: boolean;
  onClose: () => void;
}

interface JournalLine {
  accountId: string;
  debit: string;
  credit: string;
}

const emptyLine = (accounts: Array<{ id: string }>): JournalLine => ({
  accountId: accounts[0]?.id ?? "",
  debit: "",
  credit: "",
});

export function CreateJournalEntryDialog({
  open,
  onClose,
}: CreateJournalEntryDialogProps) {
  const utils = trpc.useUtils();

  const { data: periods } = trpc.fiscal.list.useQuery({}, { enabled: open });
  const { data: accounts } = trpc.coa.list.useQuery(undefined, {
    enabled: open,
  });

  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodId, setPeriodId] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createEntry = trpc.journal.create.useMutation({
    onSuccess: () => {
      utils.journal.invalidate();
      utils.transactions.invalidate();
      utils.dashboard.invalidate();
      setDescription("");
      setReference("");
      setLines([]);
      setPeriodId("");
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const openPeriods =
    periods?.filter((p) => p.status === "open") ?? periods ?? [];
  const defaultPeriodId = periodId || openPeriods[0]?.id || "";
  const activePeriodId = defaultPeriodId;

  const updateLine = (index: number, patch: Partial<JournalLine>) => {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    setLines([...lines, emptyLine(accounts ?? [])]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const totalDebit = lines.reduce(
    (sum, l) => sum + (parseFloat(l.debit) || 0),
    0,
  );
  const totalCredit = lines.reduce(
    (sum, l) => sum + (parseFloat(l.credit) || 0),
    0,
  );
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const validLines = lines.filter(
    (l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0),
  );
  const canSubmit =
    description.trim().length >= 1 &&
    date &&
    activePeriodId &&
    validLines.length >= 2 &&
    balanced &&
    totalDebit > 0;

  const handleSubmit = () => {
    setError(null);
    createEntry.mutate({
      description: description.trim(),
      reference: reference.trim() || undefined,
      date,
      periodId: activePeriodId,
      source: "manual",
      lines: validLines.map((l) => ({
        accountId: l.accountId,
        debit: (parseFloat(l.debit) || 0).toFixed(2),
        credit: (parseFloat(l.credit) || 0).toFixed(2),
      })),
    });
  };

  return (
    <CreateRecordModal
      title="New journal entry"
      subtitle="Post a balanced entry to the general ledger"
      icon={<BookOpen className="h-4 w-4 text-indigo-600" />}
      onClose={onClose}
      maxWidth="max-w-3xl"
      footer={
        <>
          <p className="mr-auto text-xs font-medium text-slate-600 tabular-nums">
            Debits {totalDebit.toFixed(2)} · Credits {totalCredit.toFixed(2)}{" "}
            {!balanced && <span className="text-amber-600">(unbalanced)</span>}
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
            disabled={!canSubmit || createEntry.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {createEntry.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Post entry
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={modalLabelCls} htmlFor="je-description">
            Description
          </label>
          <input
            id="je-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Office rent for the month"
            className={modalInputCls}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="je-date">
              Date
            </label>
            <input
              id="je-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="je-period">
              Fiscal period
            </label>
            <select
              id="je-period"
              value={activePeriodId}
              onChange={(e) => setPeriodId(e.target.value)}
              className={modalSelectCls}
            >
              {openPeriods.length === 0 ? (
                <option value="">No open periods</option>
              ) : (
                openPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.year}-{String(p.month).padStart(2, "0")}
                    {p.status === "open" ? "" : ` (${p.status})`}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="je-reference">
              Reference (optional)
            </label>
            <input
              id="je-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. RENT-07"
              className={modalInputCls}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Lines</p>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
            >
              <Plus className="h-3 w-3" /> Add line
            </button>
          </div>

          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-400">
              Add at least two lines — a balanced debit and credit.
            </p>
          ) : (
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={line.accountId}
                    onChange={(e) =>
                      updateLine(i, { accountId: e.target.value })
                    }
                    aria-label={`Line ${i + 1} account`}
                    className={`${modalSelectCls} flex-1`}
                  >
                    <option value="">Select account</option>
                    {accounts?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.debit}
                    onChange={(e) =>
                      updateLine(i, { debit: e.target.value, credit: "" })
                    }
                    placeholder="Debit"
                    aria-label={`Line ${i + 1} debit`}
                    className={`${modalInputCls} w-28`}
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.credit}
                    onChange={(e) =>
                      updateLine(i, { credit: e.target.value, debit: "" })
                    }
                    placeholder="Credit"
                    aria-label={`Line ${i + 1} credit`}
                    className={`${modalInputCls} w-28`}
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    aria-label={`Remove line ${i + 1}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
