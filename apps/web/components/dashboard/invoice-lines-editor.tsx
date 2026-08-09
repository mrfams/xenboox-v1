"use client";

import { Plus, Trash2 } from "lucide-react";

import { modalInputCls } from "./create-record-modal";

export interface InvoiceLine {
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
}

interface InvoiceLinesEditorProps {
  lines: InvoiceLine[];
  onChange: (lines: InvoiceLine[]) => void;
  accounts: Array<{ id: string; code: string; name: string }>;
}

/**
 * Line-items editor shared by the invoice, bill and expense create dialogs.
 * Emits the same shape the AR/AP createInvoice mutations expect.
 */
export function InvoiceLinesEditor({
  lines,
  onChange,
  accounts,
}: InvoiceLinesEditorProps) {
  const updateLine = (index: number, patch: Partial<InvoiceLine>) => {
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  const addLine = () => {
    onChange([
      ...lines,
      {
        description: "",
        accountId: accounts[0]?.id ?? "",
        quantity: "1",
        unitPrice: "",
      },
    ]);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Line items</p>
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
          Add at least one line item to this document.
        </p>
      ) : (
        <div className="space-y-2">
          {lines.map((line, i) => {
            const qty = parseFloat(line.quantity) || 0;
            const price = parseFloat(line.unitPrice) || 0;
            const total = qty * price;
            return (
              <div
                key={i}
                className="rounded-lg border border-slate-200 p-2.5 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    value={line.description}
                    onChange={(e) =>
                      updateLine(i, { description: e.target.value })
                    }
                    placeholder="Description"
                    aria-label={`Line ${i + 1} description`}
                    className={modalInputCls}
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
                <div className="grid grid-cols-4 gap-2">
                  <select
                    value={line.accountId}
                    onChange={(e) =>
                      updateLine(i, { accountId: e.target.value })
                    }
                    aria-label={`Line ${i + 1} account`}
                    className={`${modalInputCls} col-span-2`}
                  >
                    <option value="">Select account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(i, { quantity: e.target.value })
                    }
                    placeholder="Qty"
                    aria-label={`Line ${i + 1} quantity`}
                    className={modalInputCls}
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.unitPrice}
                    onChange={(e) =>
                      updateLine(i, { unitPrice: e.target.value })
                    }
                    placeholder="Unit price"
                    aria-label={`Line ${i + 1} unit price`}
                    className={modalInputCls}
                  />
                </div>
                <p className="text-right text-xs font-medium tabular-nums text-slate-600">
                  Total:{" "}
                  {total.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
