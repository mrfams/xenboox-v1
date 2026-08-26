"use client";

import { Bot, FileText, User } from "lucide-react";

import { cn } from "@/lib/utils";

// ─── Provenance ───────────────────────────────────────────────────────────
//
// Every machine-touched fact in the AI-native surfaces carries its origin:
// who acted (agent or human), how confident they were, and the source doc.
// Confidence thresholds follow platform law: >=0.8 act, 0.6-0.79 review,
// <0.6 escalate.

export function ProvenanceBadge({
  actor,
  actorName,
  confidence,
  source,
  className,
}: {
  actor: "agent" | "human";
  actorName?: string;
  confidence?: number;
  source?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 px-2 py-0.5",
        className,
      )}
    >
      {actor === "agent" ? (
        <Bot className="h-3 w-3 text-primary" aria-hidden="true" />
      ) : (
        <User className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
      )}
      {actorName && (
        <span className="max-w-[140px] truncate text-[10px] font-medium text-foreground/80">
          {actorName}
        </span>
      )}
      {confidence !== undefined && (
        <>
          <span className="h-2 w-px bg-border" aria-hidden="true" />
          <span
            className={cn(
              "font-mono text-[10px] font-semibold tabular-nums",
              confidence >= 0.8
                ? "text-emerald-500"
                : confidence >= 0.6
                  ? "text-amber-500"
                  : "text-red-500",
            )}
            title={
              confidence >= 0.8
                ? "Agent acted with high confidence"
                : confidence >= 0.6
                  ? "Supervisor review threshold"
                  : "Escalated to a human"
            }
          >
            {Math.round(confidence * 100)}%
          </span>
        </>
      )}
      {source && (
        <>
          <span className="h-2 w-px bg-border" aria-hidden="true" />
          <span className="inline-flex max-w-[160px] items-center gap-1 truncate text-[10px] text-muted-foreground">
            <FileText className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
            {source}
          </span>
        </>
      )}
    </span>
  );
}

// Compact dot form for dense rows (tables, feeds).
export function ProvenanceDot({
  actor,
  confidence,
}: {
  actor: "agent" | "human";
  confidence?: number;
}) {
  if (actor === "human") {
    return (
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
        title="Created by a human"
        aria-label="Human entry"
      />
    );
  }
  const tone =
    confidence === undefined
      ? "bg-primary"
      : confidence >= 0.8
        ? "bg-emerald-500"
        : confidence >= 0.6
          ? "bg-amber-500"
          : "bg-red-500";
  return (
    <span
      className={cn("inline-block h-1.5 w-1.5 rounded-full", tone)}
      title={`AI-posted${confidence !== undefined ? ` · ${Math.round(confidence * 100)}% confidence` : ""}`}
      aria-label="AI-posted entry"
    />
  );
}
