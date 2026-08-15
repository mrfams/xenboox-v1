"use client";

import { useState } from "react";
import { CalendarClock, Loader2, AlertCircle } from "lucide-react";

import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
} from "./create-record-modal";

import { trpc } from "@/lib/trpc/client";

interface CreatePayrollRunDialogProps {
  open: boolean;
  onClose: () => void;
}

const currentPeriod = () => new Date().toISOString().slice(0, 7);

export function CreatePayrollRunDialog({
  open,
  onClose,
}: CreatePayrollRunDialogProps) {
  const utils = trpc.useUtils();

  const [period, setPeriod] = useState(currentPeriod());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createRun = trpc.payroll.createPayrollRun.useMutation({
    onSuccess: () => {
      utils.payroll.invalidate();
      setNotes("");
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const canSubmit = /^\d{4}-\d{2}$/.test(period);

  const handleSubmit = () => {
    setError(null);
    createRun.mutate({ period, notes: notes.trim() || undefined });
  };

  return (
    <CreateRecordModal
      title="New payroll run"
      subtitle="Create a draft payroll for a period"
      icon={<CalendarClock className="h-4 w-4 text-indigo-600" />}
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
            disabled={!canSubmit || createRun.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {createRun.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Create run
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={modalLabelCls} htmlFor="pr-period">
            Payroll period
          </label>
          <input
            id="pr-period"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className={modalInputCls}
          />
          <p className="mt-1 text-xs text-slate-400">
            The run will be created as a draft covering this month.
          </p>
        </div>
        <div>
          <label className={modalLabelCls} htmlFor="pr-notes">
            Notes (optional)
          </label>
          <textarea
            id="pr-notes"
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
