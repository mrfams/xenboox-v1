"use client";

import { useState } from "react";
import {
  X,
  FileText,
  Image,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { ConfidenceBadge } from "@/components/dashboard/confidence-badge";
import { cn } from "@/lib/utils";

type ExtractedField = {
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
};

type DocumentViewerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  type?: "invoice" | "receipt" | "bank_statement" | "payslip";
  previewUrl?: string;
  fields?: ExtractedField[];
};

function DocumentPreview({ url, type }: { url?: string; type?: string }) {
  if (!url) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <Image className="mx-auto h-12 w-12 mb-2" />
          <p className="text-sm">No preview available</p>
          {type && (
            <p className="text-xs mt-1 capitalize">{type.replace("_", " ")}</p>
          )}
        </div>
      </div>
    );
  }

  const isPdf = url.endsWith(".pdf");
  if (isPdf) {
    return (
      <iframe src={url} className="h-full w-full" title="Document preview" />
    );
  }

  return (
    <img
      src={url}
      alt="Document preview"
      className="h-full w-full object-contain"
    />
  );
}

export function DocumentViewer({
  open,
  onClose,
  title = "Untitled Document",
  type,
  previewUrl,
  fields = [],
}: DocumentViewerProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());

  if (!open) return null;

  function handleEdit(label: string, currentValue: string) {
    setEditingField(label);
    setEditValues((prev) => ({ ...prev, [label]: currentValue }));
  }

  function handleSave(label: string) {
    setSavedFields((prev) => new Set(prev).add(label));
    setEditingField(null);
  }

  const typeLabel = type?.replace(/_/g, " ") ?? "document";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-4xl bg-background shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {typeLabel}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body: side-by-side */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Document preview */}
          <div className="flex-1 border-r bg-muted/10 overflow-auto">
            <DocumentPreview url={previewUrl} type={type} />
          </div>

          {/* Right: Extracted fields */}
          <div className="w-80 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            <div>
              <h3 className="text-sm font-semibold mb-3">Extracted Fields</h3>
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">No fields extracted yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((field) => {
                    const isEditing = editingField === field.label;
                    const isSaved = savedFields.has(field.label);
                    const displayValue = editValues[field.label] ?? field.value;

                    return (
                      <div
                        key={field.label}
                        className={cn(
                          "rounded-lg border p-3 transition-colors",
                          isSaved &&
                            "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800",
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            {field.label}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <ConfidenceBadge
                              level={field.confidence}
                              showLabel={false}
                            />
                            {isSaved && (
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={displayValue}
                              onChange={(e) =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  [field.label]: e.target.value,
                                }))
                              }
                              className="flex-1 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleSave(field.label)}
                            >
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {displayValue}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                              onClick={() =>
                                handleEdit(field.label, displayValue)
                              }
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
