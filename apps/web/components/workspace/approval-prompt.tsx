"use client";

import { AlertTriangle, CheckCircle2, XCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApprovalPromptProps {
  title: string;
  description: string;
  amount?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onReview?: () => void;
  isApproved?: boolean;
  isRejected?: boolean;
}

export function ApprovalPrompt({
  title,
  description,
  amount,
  onApprove,
  onReject,
  onReview,
  isApproved = false,
  isRejected = false,
}: ApprovalPromptProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-3",
        isApproved
          ? "border-emerald-200 bg-emerald-50"
          : isRejected
            ? "border-red-200 bg-red-50"
            : "border-amber-200 bg-amber-50",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
            isApproved
              ? "bg-emerald-100"
              : isRejected
                ? "bg-red-100"
                : "bg-amber-100",
          )}
        >
          {isApproved ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : isRejected ? (
            <XCircle className="h-4 w-4 text-red-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          {amount && (
            <p className="text-sm font-semibold text-foreground mt-1">
              {amount}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isApproved && !isRejected && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApprove}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
          <button
            type="button"
            onClick={onReview}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Review Details
          </button>
        </div>
      )}

      {/* Status */}
      {isApproved && (
        <p className="text-xs text-emerald-600 font-medium">✓ Approved</p>
      )}
      {isRejected && (
        <p className="text-xs text-red-600 font-medium">✗ Rejected</p>
      )}
    </div>
  );
}
