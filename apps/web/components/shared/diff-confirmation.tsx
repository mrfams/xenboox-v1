"use client";

import { useState } from "react";
import {
  Brain,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@xenboox/ui";

import { cn } from "@/lib/utils";

export interface DiffField {
  label: string;
  before: string;
  after: string;
}

export interface DiffConfirmationItem {
  id: string;
  title: string;
  fields: DiffField[];
  reason?: string;
  confidence?: number;
}

interface DiffConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: DiffConfirmationItem[];
  confirmLabel?: string;
  rejectLabel?: string;
  /** Called with the ids of the items the user approved. */
  onConfirm: (ids: string[]) => Promise<void> | void;
  /** Called with the ids of the items the user rejected. */
  onReject?: (ids: string[]) => Promise<void> | void;
  /** Optional per-item edit handler — renders an Edit button when provided. */
  onEdit?: (id: string) => void;
}

/**
 * Interactive diff confirmation — approve AI-proposed changes on a
 * before/after diff card so the user sees exactly what would change before
 * it posts. Shared by the review queues and the journal review flow.
 *
 * The dialog is fully controlled: `open` drives visibility, `onConfirm` /
 * `onReject` receive the approved/rejected ids after the user acts, and
 * per-item loading/error states make the mutation feel honest.
 */
export function DiffConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
  confirmLabel = "Approve",
  rejectLabel = "Reject",
  onConfirm,
  onReject,
  onEdit,
}: DiffConfirmationDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const run = async (
    ids: string[],
    fn?: (ids: string[]) => Promise<void> | void,
  ) => {
    if (!fn) return;
    setBusy(true);
    setError(null);
    try {
      await fn(ids);
      setReviewed((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = (ids: string[]) => run(ids, onConfirm);
  const handleReject = (ids: string[]) => run(ids, onReject);

  const pendingItems = items.filter((i) => !reviewed.has(i.id));
  const allReviewed = items.length > 0 && reviewed.size === items.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-error-clay/30 bg-error-clay/5 px-3 py-2 text-xs text-error-clay">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {allReviewed ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-balanced-green mb-3" />
            <p className="text-sm font-medium text-foreground">
              All changes reviewed
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {items.length} change{items.length !== 1 ? "s" : ""} processed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border/60 bg-card p-4"
              >
                <p className="text-sm font-medium text-foreground mb-3">
                  {item.title}
                </p>

                {/* Before/after diff rows */}
                <div className="space-y-2">
                  {item.fields.map((field, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[90px_1fr_auto_1fr] items-center gap-2 text-xs"
                    >
                      <span className="text-muted-foreground">
                        {field.label}:
                      </span>
                      <span className="rounded bg-muted px-2 py-1 line-through text-muted-foreground/70 min-w-0 truncate">
                        {field.before || "—"}
                      </span>
                      <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                      <span className="rounded bg-balanced-green/10 px-2 py-1 font-medium text-balanced-green min-w-0 truncate">
                        {field.after || "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Reason + confidence */}
                <div className="mt-3 space-y-2">
                  {item.reason && (
                    <div className="rounded-lg bg-accent/40 px-3 py-2">
                      <p className="text-[10px] leading-relaxed text-muted-foreground">
                        {item.reason}
                      </p>
                    </div>
                  )}
                  {typeof item.confidence === "number" && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground">
                        Confidence
                      </span>
                      <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            item.confidence >= 95
                              ? "bg-balanced-green"
                              : item.confidence >= 70
                                ? "bg-attention-amber"
                                : "bg-error-clay",
                          )}
                          style={{ width: `${item.confidence}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold tabular-nums text-muted-foreground">
                        {item.confidence}%
                      </span>
                      {item.confidence < 70 && (
                        <span className="text-[9px] text-attention-amber">
                          Low confidence — review carefully
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Per-item actions */}
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove([item.id])}
                    disabled={busy}
                    className="bg-balanced-green hover:bg-balanced-green/90 text-white"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {confirmLabel}
                  </Button>
                  {onReject && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject([item.id])}
                      disabled={busy}
                      className="text-error-clay border-error-clay/30 hover:bg-error-clay/5"
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {rejectLabel}
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(item.id)}
                      disabled={busy}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
