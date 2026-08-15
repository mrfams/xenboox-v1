"use client";

import { useState } from "react";
import { UserPlus, Loader2, AlertCircle } from "lucide-react";

import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";

import { trpc } from "@/lib/trpc/client";

interface CreateCustomerDialogProps {
  open: boolean;
  onClose: () => void;
}

const PAYMENT_TERMS = ["net15", "net30", "net45", "net60", "due_on_receipt"];

export function CreateCustomerDialog({
  open,
  onClose,
}: CreateCustomerDialogProps) {
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
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

  return (
    <CreateRecordModal
      title="New customer"
      subtitle="Add a customer to invoice and track receivables"
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
        <div>
          <label className={modalLabelCls} htmlFor="cu-name">
            Customer name
          </label>
          <input
            id="cu-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Trading Ltd"
            className={modalInputCls}
          />
        </div>

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
                  {t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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
              Tax ID (optional)
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
              Address (optional)
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

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </CreateRecordModal>
  );
}
