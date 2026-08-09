"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

// ─── Shared field styles ──────────────────────────────────────────────────
// Kept in one place so every create dialog on the dashboard looks identical.

export const modalInputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

export const modalLabelCls = "block text-sm font-medium text-slate-700 mb-1";

export const modalSelectCls = modalInputCls;

// ─── Shared modal shell ────────────────────────────────────────────────────

interface CreateRecordModalProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

/**
 * Consistent dialog shell for the manual "create a record" flows across the
 * dashboard module pages (transactions, banking, invoicing, bills, vendors,
 * customers, payroll, expenses, journal, assets, chart of accounts...).
 * Matches the visual language of the existing estimates modal.
 */
export function CreateRecordModal({
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  maxWidth = "max-w-2xl",
}: CreateRecordModalProps) {
  // Escape closes; body scroll locks while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div
        className={`w-full ${maxWidth} rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
              {icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-4 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
