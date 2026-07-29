"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, CheckCircle2, Loader2, Download } from "lucide-react";

type AuditDoc = {
  label: string;
  ready: boolean;
};

const DEFAULT_DOCS: AuditDoc[] = [
  { label: "Trial Balance", ready: true },
  { label: "General Ledger", ready: true },
  { label: "Bank Reconciliations", ready: true },
  { label: "Invoice Samples", ready: true },
  { label: "Expense Support", ready: true },
  { label: "Fixed Asset Register", ready: true },
  { label: "Tax Filings", ready: true },
  { label: "Journal Explanations", ready: true },
  { label: "Management Representation Notes", ready: true },
];

export function ComplianceAuditPackage() {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 2500);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Audit Package</h3>
        </div>
        {!generating && (
          <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-medium text-balanced-green">
            Ready for Auditor
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className={cn(
            "w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 mb-4",
            generating
              ? "bg-muted-foreground/30 cursor-not-allowed"
              : "bg-gradient-to-r from-signal-indigo to-indigo-600 hover:shadow-md hover:from-indigo-600 hover:to-indigo-700",
          )}
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
              Generating Audit Package...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Download className="h-4 w-4" />
              Prepare Audit Package
            </span>
          )}
        </button>

        {/* Document list */}
        <div className="space-y-1.5">
          {DEFAULT_DOCS.map((doc) => (
            <div key={doc.label} className="flex items-center gap-2">
              <CheckCircle2
                className={cn(
                  "h-3 w-3 shrink-0",
                  doc.ready
                    ? "text-balanced-green"
                    : "text-muted-foreground/30",
                )}
              />
              <span
                className={cn(
                  "text-xs",
                  doc.ready ? "text-foreground" : "text-muted-foreground/50",
                )}
              >
                {doc.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
