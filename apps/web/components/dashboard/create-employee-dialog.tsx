"use client";

import { useState } from "react";
import { UserRoundPlus, Loader2, AlertCircle } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import {
  CreateRecordModal,
  modalInputCls,
  modalLabelCls,
  modalSelectCls,
} from "./create-record-modal";

interface CreateEmployeeDialogProps {
  open: boolean;
  onClose: () => void;
}

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contractor", "intern"];

const defaultEmployeeNumber = () =>
  `EMP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

export function CreateEmployeeDialog({
  open,
  onClose,
}: CreateEmployeeDialogProps) {
  const utils = trpc.useUtils();

  const [employeeNumber, setEmployeeNumber] = useState(defaultEmployeeNumber());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hireDate, setHireDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [basicSalary, setBasicSalary] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createEmployee = trpc.payroll.createEmployee.useMutation({
    onSuccess: () => {
      utils.payroll.invalidate();
      setName("");
      setEmail("");
      setPhone("");
      setDepartment("");
      setJobTitle("");
      setBankName("");
      setBankAccountNumber("");
      setTaxId("");
      setBasicSalary("");
      setEmployeeNumber(defaultEmployeeNumber());
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  if (!open) return null;

  const canSubmit =
    name.trim().length >= 1 &&
    employeeNumber.trim().length >= 1 &&
    hireDate &&
    parseFloat(basicSalary) >= 0;

  const handleSubmit = () => {
    setError(null);
    createEmployee.mutate({
      employeeNumber: employeeNumber.trim(),
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      hireDate,
      department: department.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      employmentType: employmentType as "full_time",
      bankName: bankName.trim() || undefined,
      bankAccountNumber: bankAccountNumber.trim() || undefined,
      taxId: taxId.trim() || undefined,
      basicSalary: parseFloat(basicSalary || "0").toFixed(2),
    });
  };

  return (
    <CreateRecordModal
      title="Add employee"
      subtitle="Add a team member to run payroll"
      icon={<UserRoundPlus className="h-4 w-4 text-indigo-600" />}
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
            disabled={!canSubmit || createEmployee.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {createEmployee.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Add employee
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="emp-name">
              Full name
            </label>
            <input
              id="emp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Awa Jallow"
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="emp-number">
              Employee number
            </label>
            <input
              id="emp-number"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              className={modalInputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="emp-email">
              Email
            </label>
            <input
              id="emp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="awa@company.com"
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="emp-phone">
              Phone
            </label>
            <input
              id="emp-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+220 ..."
              className={modalInputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="emp-hire">
              Hire date
            </label>
            <input
              id="emp-hire"
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="emp-type">
              Employment type
            </label>
            <select
              id="emp-type"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className={modalSelectCls}
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="emp-department">
              Department
            </label>
            <input
              id="emp-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Sales"
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="emp-title">
              Job title
            </label>
            <input
              id="emp-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Accountant"
              className={modalInputCls}
            />
          </div>
        </div>

        <div>
          <label className={modalLabelCls} htmlFor="emp-salary">
            Basic salary (GMD / month)
          </label>
          <input
            id="emp-salary"
            type="number"
            min={0}
            step="any"
            value={basicSalary}
            onChange={(e) => setBasicSalary(e.target.value)}
            placeholder="0.00"
            className={modalInputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={modalLabelCls} htmlFor="emp-bank">
              Bank name
            </label>
            <input
              id="emp-bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. GTBank"
              className={modalInputCls}
            />
          </div>
          <div>
            <label className={modalLabelCls} htmlFor="emp-account">
              Bank account number
            </label>
            <input
              id="emp-account"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="e.g. 0098765432"
              className={modalInputCls}
            />
          </div>
        </div>

        <div>
          <label className={modalLabelCls} htmlFor="emp-tax">
            Tax ID (optional)
          </label>
          <input
            id="emp-tax"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder="NIN / TIN"
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
