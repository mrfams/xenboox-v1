"use client";

import { useState } from "react";
import { Building, Loader2, AlertCircle } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";

interface CreateVendorDialogProps {
  open: boolean;
  onClose: () => void;
}

const PAYMENT_TERMS = ["net15", "net30", "net45", "net60", "due_on_receipt"];

export function CreateVendorDialog({ open, onClose }: CreateVendorDialogProps) {
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("net30");
  const [error, setError] = useState<string | null>(null);

  const createVendor = trpc.ap.createSupplier.useMutation({
    onSuccess: () => {
      utils.ap.invalidate();
      utils.expenses.invalidate();
      setName("");
      setContactEmail("");
      setContactPhone("");
      setTaxId("");
      setAddress("");
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const canSubmit = name.trim().length >= 1;

  const handleSubmit = () => {
    setError(null);
    createVendor.mutate({
      name: name.trim(),
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      taxId: taxId.trim() || undefined,
      address: address.trim() || undefined,
      paymentTerms,
    });
  };

  return (
    <CreateRecordModal
      title="New vendor"
      subtitle="Add a supplier to pay bills and track payables"
      icon={<Building className="h-4 w-4 text-indigo-600" />}
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
            disabled={!canSubmit || createVendor.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {createVendor.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Create vendor
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={modalLabelCls} htmlFor="ve-name">
            Vendor name
          </label>
          <input
            id="ve-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Global Supplies Co"
            className={modalInputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="ve-email">
              Email
            </label>
            <input
              id="ve-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="accounts@supplier.com"
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="ve-phone">
              Phone
            </label>
            <input
              id="ve-phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+220 ..."
              className={modalInputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="ve-terms">
              Payment terms
            </label>
            <select
              id="ve-terms"
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
            <label className={modalLabelCls} htmlFor="ve-tax">
              Tax ID (optional)
            </label>
            <input
              id="ve-tax"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="TIN"
              className={modalInputCls}
            />
          </div>
        </div>

        <div>
          <label className={modalLabelCls} htmlFor="ve-address">
            Address (optional)
          </label>
          <input
            id="ve-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, city"
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
