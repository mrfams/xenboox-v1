"use client";

import { useState } from "react";
import { Boxes, Loader2, AlertCircle } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";

interface CreateAssetDialogProps {
  open: boolean;
  onClose: () => void;
}

const ASSET_CLASSES = [
  "vehicles",
  "equipment",
  "computers",
  "furniture",
  "buildings",
  "land",
  "machinery",
  "software",
  "other",
];

const DEPRECIATION_METHODS = [
  "straight_line",
  "reducing_balance",
  "units_of_production",
];

export function CreateAssetDialog({ open, onClose }: CreateAssetDialogProps) {
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assetClass, setAssetClass] = useState("equipment");
  const [location, setLocation] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [cost, setCost] = useState("");
  const [salvageValue, setSalvageValue] = useState("0");
  const [usefulLifeMonths, setUsefulLifeMonths] = useState("36");
  const [depreciationMethod, setDepreciationMethod] = useState("straight_line");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createAsset = trpc.fixedAssets.createAsset.useMutation({
    onSuccess: () => {
      utils.fixedAssets.invalidate();
      utils.dashboard.invalidate();
      setName("");
      setDescription("");
      setLocation("");
      setCost("");
      setSalvageValue("0");
      setUsefulLifeMonths("36");
      setResponsiblePerson("");
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const canSubmit =
    name.trim().length >= 1 &&
    assetClass.trim().length >= 1 &&
    purchaseDate &&
    parseFloat(cost) > 0 &&
    parseInt(usefulLifeMonths) > 0;

  const handleSubmit = () => {
    setError(null);
    createAsset.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      assetClass,
      location: location.trim() || undefined,
      purchaseDate,
      cost: parseFloat(cost).toFixed(2),
      salvageValue: parseFloat(salvageValue || "0").toFixed(2),
      usefulLifeMonths: parseInt(usefulLifeMonths, 10),
      depreciationMethod: depreciationMethod as "straight_line",
      responsiblePerson: responsiblePerson.trim() || undefined,
    });
  };

  return (
    <CreateRecordModal
      title="Add asset"
      subtitle="Register a fixed asset for depreciation tracking"
      icon={<Boxes className="h-4 w-4 text-indigo-600" />}
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
            disabled={!canSubmit || createAsset.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {createAsset.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Add asset
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="fa-name">
              Asset name
            </label>
            <input
              id="fa-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Toyota Hilux 2024"
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="fa-class">
              Asset class
            </label>
            <select
              id="fa-class"
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value)}
              className={modalSelectCls}
            >
              {ASSET_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={modalLabelCls} htmlFor="fa-description">
            Description (optional)
          </label>
          <input
            id="fa-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Serial number, condition, notes"
            className={modalInputCls}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="fa-date">
              Purchase date
            </label>
            <input
              id="fa-date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="fa-cost">
              Cost (GMD)
            </label>
            <input
              id="fa-cost"
              type="number"
              min={0}
              step="any"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="fa-salvage">
              Salvage value (GMD)
            </label>
            <input
              id="fa-salvage"
              type="number"
              min={0}
              step="any"
              value={salvageValue}
              onChange={(e) => setSalvageValue(e.target.value)}
              placeholder="0.00"
              className={modalInputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="fa-life">
              Useful life (months)
            </label>
            <input
              id="fa-life"
              type="number"
              min={1}
              value={usefulLifeMonths}
              onChange={(e) => setUsefulLifeMonths(e.target.value)}
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="fa-method">
              Depreciation method
            </label>
            <select
              id="fa-method"
              value={depreciationMethod}
              onChange={(e) => setDepreciationMethod(e.target.value)}
              className={modalSelectCls}
            >
              {DEPRECIATION_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="fa-location">
              Location (optional)
            </label>
            <input
              id="fa-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Office — Serrekunda"
              className={modalInputCls}
            />
          </div>
        </div>

        <div>
          <label className={modalLabelCls} htmlFor="fa-owner">
            Responsible person (optional)
          </label>
          <input
            id="fa-owner"
            value={responsiblePerson}
            onChange={(e) => setResponsiblePerson(e.target.value)}
            placeholder="Who is accountable for this asset?"
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
