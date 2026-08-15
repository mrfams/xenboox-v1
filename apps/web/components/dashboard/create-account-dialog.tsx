"use client";

import { useState } from "react";
import { ListPlus, Loader2, AlertCircle } from "lucide-react";

import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";

import { trpc } from "@/lib/trpc/client";

interface CreateAccountDialogProps {
  open: boolean;
  onClose: () => void;
}

const ACCOUNT_TYPES = [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
] as const;

const SUBTYPES_BY_TYPE = {
  asset: [
    "current_asset",
    "fixed_asset",
    "bank_account",
    "cash",
    "accounts_receivable",
    "inventory",
    "prepaid",
  ],
  liability: [
    "current_liability",
    "long_term_liability",
    "accounts_payable",
    "tax_liability",
    "accrued_liability",
  ],
  equity: ["owner_equity", "retained_earnings", "current_year_earnings"],
  revenue: [
    "sales_revenue",
    "service_revenue",
    "other_income",
    "interest_income",
  ],
  expense: [
    "cost_of_goods_sold",
    "operating_expense",
    "payroll_expense",
    "tax_expense",
    "depreciation",
    "interest_expense",
    "other_expense",
  ],
} as const;

type AccountSubtype =
  (typeof SUBTYPES_BY_TYPE)[keyof typeof SUBTYPES_BY_TYPE][number];

const prettyLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function CreateAccountDialog({
  open,
  onClose,
}: CreateAccountDialogProps) {
  const utils = trpc.useUtils();

  const { data: accounts } = trpc.coa.list.useQuery(undefined, {
    enabled: open,
  });

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof ACCOUNT_TYPES)[number]>("expense");
  const [subtype, setSubtype] = useState<AccountSubtype>("operating_expense");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createAccount = trpc.coa.create.useMutation({
    onSuccess: () => {
      utils.chartOfAccounts.invalidate();
      utils.coa.invalidate();
      utils.journal.invalidate();
      setCode("");
      setName("");
      setDescription("");
      setParentId("");
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const subtypes = SUBTYPES_BY_TYPE[type] ?? [];
  const canSubmit =
    code.trim().length >= 1 && name.trim().length >= 1 && subtype;

  const handleSubmit = () => {
    setError(null);
    createAccount.mutate({
      code: code.trim(),
      name: name.trim(),
      type,
      subtype: subtype as AccountSubtype,
      description: description.trim() || undefined,
      parentId: parentId || undefined,
    });
  };

  return (
    <CreateRecordModal
      title="New account"
      subtitle="Add an account to your chart of accounts"
      icon={<ListPlus className="h-4 w-4 text-indigo-600" />}
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
            <label className={modalLabelCls} htmlFor="ac-code">
              Account code
            </label>
            <input
              id="ac-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 6200"
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="ac-name">
              Account name
            </label>
            <input
              id="ac-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Travel Expenses"
              className={modalInputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="ac-type">
              Account type
            </label>
            <select
              id="ac-type"
              value={type}
              onChange={(e) => {
                const nextType = e.target
                  .value as (typeof ACCOUNT_TYPES)[number];
                setType(nextType);
                setSubtype(
                  (SUBTYPES_BY_TYPE[nextType]?.[0] ??
                    "operating_expense") as AccountSubtype,
                );
              }}
              className={modalSelectCls}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {prettyLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="ac-subtype">
              Subtype
            </label>
            <select
              id="ac-subtype"
              value={subtype}
              onChange={(e) => setSubtype(e.target.value as AccountSubtype)}
              className={modalSelectCls}
            >
              {subtypes.map((s) => (
                <option key={s} value={s}>
                  {prettyLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={modalLabelCls} htmlFor="ac-parent">
            Parent account (optional)
          </label>
          <select
            id="ac-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className={modalSelectCls}
          >
            <option value="">None — top level</option>
            {accounts?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={modalLabelCls} htmlFor="ac-description">
            Description (optional)
          </label>
          <textarea
            id="ac-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
