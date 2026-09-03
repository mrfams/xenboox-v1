"use client";

import { useState } from "react";
import {
  UserPlus,
  Loader2,
  AlertCircle,
  ChevronDown,
  Sparkles,
} from "lucide-react";

import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface CreateCustomerDialogProps {
  open: boolean;
  onClose: () => void;
}

const PAYMENT_TERMS = ["net15", "net30", "net45", "net60", "due_on_receipt"];

/**
 * AI-native customer creation: name-first, details-later.
 * Only name is required. The AI fills in the rest over time.
 * Optional fields are collapsed behind "Add details" to reduce friction.
 */
export function CreateCustomerDialog({
  open,
  onClose,
}: CreateCustomerDialogProps) {
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("net30");
  const [creditLimit, setCreditLimit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createCustomer = trpc.ar.createCustomer.useMutation({
    onSuccess: () => {
      utils.customers.invalidate();
      utils.ar.invalidate();
      utils.invoicing.invalidate();
      setName("");
      setContactEmail("");
      setContactPhone("");
      setTaxId("");
      setAddress("");
      setCreditLimit("");
      setShowDetails(false);
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const canSubmit = name.trim().length >= 1;

  const handleSubmit = () => {
    setError(null);
    createCustomer.mutate({
      name: name.trim(),
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      taxId: taxId.trim() || undefined,
      address: address.trim() || undefined,
      paymentTerms,
      creditLimit: creditLimit.trim() || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canSubmit && !showDetails) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <CreateRecordModal
      title="New customer"
      subtitle="Add a customer — details can be filled in later"
      icon={<UserPlus className="h-4 w-4 text-indigo-600" />}
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
            disabled={!canSubmit || createCustomer.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {createCustomer.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Create customer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* ── Name field — the only required field ───────────────────── */}
        <div>
          <label className={modalLabelCls} htmlFor="cu-name">
            Customer name
          </label>
          <input
            id="cu-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Acme Trading Ltd"
            className={modalInputCls}
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            Press Enter to create quickly — add email, phone, and other details
            below
          </p>
        </div>

        {/* ── Optional details — progressive disclosure ───────────────── */}
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
            showDetails
              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
              : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {showDetails ? "Hide details" : "Add details (optional)"}
          <ChevronDown
            className={cn(
              "ml-auto h-3.5 w-3.5 transition-transform",
              showDetails && "rotate-180",
            )}
          />
        </button>

        {showDetails && (
          <div className="space-y-4 animate-in fade-in-0 duration-150">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={modalLabelCls} htmlFor="cu-email">
                  Email
                </label>
                <input
                  id="cu-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="billing@acme.com"
                  className={modalInputCls}
                />
              </div>
              <div>
                <label className={modalLabelCls} htmlFor="cu-phone">
                  Phone
                </label>
                <input
                  id="cu-phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+220 ..."
                  className={modalInputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={modalLabelCls} htmlFor="cu-terms">
                  Payment terms
                </label>
                <select
                  id="cu-terms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className={modalSelectCls}
                >
                  {PAYMENT_TERMS.map((t) => (
                    <option key={t} value={t}>
                      {t
                        .replace("_", " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={modalLabelCls} htmlFor="cu-credit">
                  Credit limit (GMD)
                </label>
                <input
                  id="cu-credit"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="0.00"
                  className={modalInputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={modalLabelCls} htmlFor="cu-tax">
                  Tax ID
                </label>
                <input
                  id="cu-tax"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="TIN"
                  className={modalInputCls}
                />
              </div>
              <div>
                <label className={modalLabelCls} htmlFor="cu-address">
                  Address
                </label>
                <input
                  id="cu-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city"
                  className={modalInputCls}
                />
              </div>
            </div>
          </div>
        )}
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
