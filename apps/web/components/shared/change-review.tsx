"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Brain, CheckCircle2, XCircle, Edit3, ArrowRight } from "lucide-react";

interface ChangeField {
  label: string;
  before: string;
  after: string;
}

interface ChangeReviewItem {
  id: string;
  title: string;
  fields: ChangeField[];
  reason: string;
  confidence: number;
}

interface ChangeReviewProps {
  items?: ChangeReviewItem[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (id: string) => void;
  className?: string;
}

const DEFAULT_ITEMS: ChangeReviewItem[] = [
  {
    id: "c1",
    title: "Uber — $240",
    fields: [
      {
        label: "Account",
        before: "Travel Expense",
        after: "Client Transportation",
      },
      { label: "Department", before: "General", after: "Sales" },
      { label: "Category", before: "Transportation", after: "Client Meeting" },
    ],
    reason:
      "Based on historical classification — 85% of Uber rides on this route are categorized as client transportation.",
    confidence: 96,
  },
  {
    id: "c2",
    title: "AWS — $8,400",
    fields: [
      {
        label: "Account",
        before: "Software",
        after: "Software (Infrastructure)",
      },
      { label: "Department", before: "Engineering", after: "Engineering" },
    ],
    reason:
      "Vendor pattern matches monthly infrastructure subscription. No change needed.",
    confidence: 99,
  },
];

export function ChangeReview({
  items = DEFAULT_ITEMS,
  onApprove,
  onReject,
  onEdit,
  className,
}: ChangeReviewProps) {
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const handleApprove = (id: string) => {
    setReviewed((prev) => new Set(prev).add(id));
    onApprove?.(id);
  };

  const handleReject = (id: string) => {
    setReviewed((prev) => new Set(prev).add(id));
    onReject?.(id);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-balanced-green mb-2" />
        <p className="text-sm font-medium text-foreground">
          All changes reviewed
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          No pending AI changes.
        </p>
      </div>
    );
  }

  const allReviewed = reviewed.size === items.length;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-signal-indigo" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AI Proposed Changes
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {items.length - reviewed.size} pending · {reviewed.size} reviewed
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-signal-indigo to-balanced-green transition-all duration-500"
          style={{ width: `${(reviewed.size / items.length) * 100}%` }}
        />
      </div>

      {/* All reviewed message */}
      {allReviewed && (
        <div className="rounded-lg bg-balanced-green/5 border border-balanced-green/20 p-3 text-center">
          <CheckCircle2 className="h-5 w-5 text-balanced-green mx-auto mb-1" />
          <p className="text-xs font-medium text-foreground">
            All changes reviewed
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {items.length} change{items.length !== 1 ? "s" : ""} processed.
          </p>
        </div>
      )}

      {/* Change items */}
      {items.map((item) => {
        const isReviewed = reviewed.has(item.id);
        return (
          <div
            key={item.id}
            className={cn(
              "rounded-lg border bg-card p-3.5 transition-all duration-200",
              isReviewed && "opacity-60",
            )}
          >
            <p className="text-sm font-medium mb-2">{item.title}</p>

            {/* Fields comparison */}
            <div className="space-y-1.5 mb-2.5">
              {item.fields.map((field, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[80px_1fr_auto_1fr] items-center gap-2 text-xs"
                >
                  <span className="text-muted-foreground">{field.label}:</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 line-through text-muted-foreground/70">
                    {field.before}
                  </span>
                  <ArrowRight className="h-3 w-3 text-signal-indigo" />
                  <span className="rounded bg-balanced-green/10 px-1.5 py-0.5 font-medium text-balanced-green">
                    {field.after}
                  </span>
                </div>
              ))}
            </div>

            {/* Reason */}
            <div className="rounded-lg bg-accent/30 p-2 mb-2.5">
              <p className="text-[10px] text-muted-foreground">{item.reason}</p>
            </div>

            {/* Confidence */}
            <div className="flex items-center gap-2 mb-2.5">
              <Brain className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[9px] text-muted-foreground">
                Confidence
              </span>
              <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    item.confidence >= 95
                      ? "bg-balanced-green"
                      : "bg-attention-amber",
                  )}
                  style={{ width: `${item.confidence}%` }}
                />
              </div>
              <span className="text-[9px] font-bold tabular-nums">
                {item.confidence}%
              </span>
            </div>

            {/* Actions */}
            {!isReviewed && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApprove(item.id)}
                  className="flex items-center gap-1 rounded-lg bg-balanced-green/10 px-2.5 py-1.5 text-[10px] font-medium text-balanced-green hover:bg-balanced-green/20 transition-colors"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Approve
                </button>
                <button
                  onClick={() => handleReject(item.id)}
                  className="flex items-center gap-1 rounded-lg bg-error-clay/10 px-2.5 py-1.5 text-[10px] font-medium text-error-clay hover:bg-error-clay/20 transition-colors"
                >
                  <XCircle className="h-3 w-3" />
                  Reject
                </button>
                {onEdit && (
                  <button
                    onClick={() => onEdit(item.id)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
