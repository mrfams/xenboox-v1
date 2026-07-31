"use client";

import React from "react";
import { useState } from "react";
import {
  FileText,
  ScanSearch,
  ScanLine,
  Link2,
  Route,
  CheckCircle2,
  Activity,
  ChevronDown,
  Eye,
  ListChecks,
  ArrowRight,
  Fingerprint,
  FolderOpen,
  FileWarning,
  Copy,
  ShieldQuestion,
  Tag,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type DocumentState =
  | "DETECTED"
  | "CLASSIFYING"
  | "EXTRACTING"
  | "LINKING"
  | "ROUTING"
  | "DONE";

export interface StateTransition {
  state: DocumentState | "LOG";
  timestamp: string;
  detail: string;
}

export interface DocumentLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showLowConfidence?: boolean;
  showExtractionFailure?: boolean;
  showUnrecognized?: boolean;
  showCorrupt?: boolean;
  showDuplicate?: boolean;
  showDone?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const DOC_NAME = "invoice-1042.pdf";

const PIPELINE_STATES: Array<{
  id: DocumentState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "DETECTED",
    label: "DETECTED",
    description:
      "File registered from any surface (upload, email, folder watch, mobile photo)",
    icon: FileText,
  },
  {
    id: "CLASSIFYING",
    label: "CLASSIFYING",
    description:
      "Determining document type (invoice, receipt, contract, bank statement, payslip, grant letter)",
    icon: ScanSearch,
  },
  {
    id: "EXTRACTING",
    label: "EXTRACTING",
    description: "Running OCR/extraction appropriate to the document type",
    icon: ScanLine,
  },
  {
    id: "LINKING",
    label: "LINKING",
    description:
      "Associating document with its eventual transaction record (bidirectional)",
    icon: Link2,
  },
  {
    id: "ROUTING",
    label: "ROUTING",
    description: "Sending structured data to the correct downstream agent",
    icon: Route,
  },
  {
    id: "DONE",
    label: "DONE",
    description:
      "Downstream agent confirms processing — status updates to Done",
    icon: CheckCircle2,
  },
];

const EXTRACTED_FIELDS: Array<{
  label: string;
  value: string;
  confidence: number;
}> = [
  { label: "Vendor", value: "Acme Supplies", confidence: 96 },
  { label: "Amount", value: "GMD 1,240.00", confidence: 91 },
  { label: "Date", value: "Jun 14, 2026", confidence: 88 },
  { label: "Invoice #", value: "INV-4471", confidence: 97 },
];

const AUDIT_TRAIL: StateTransition[] = [
  {
    state: "DETECTED",
    timestamp: "09:41:00.102",
    detail:
      "detected: invoice-1042.pdf, source: web upload, entity: Xenboox HQ, size: 412 KB",
  },
  {
    state: "CLASSIFYING",
    timestamp: "09:41:01.356",
    detail:
      "classification: invoice, confidence: 0.94, basis: layout pattern + presence of 'Invoice #' field",
  },
  {
    state: "EXTRACTING",
    timestamp: "09:41:02.011",
    detail: "fields: vendor 0.96, amount 0.91, date 0.88, invoice_no 0.97",
  },
  {
    state: "LINKING",
    timestamp: "09:41:02.833",
    detail: "link: pending — waiting for downstream agent confirm",
  },
  {
    state: "ROUTING",
    timestamp: "09:41:03.217",
    detail: "routed to: AP Agent (invoice workflow)",
  },
  {
    state: "DONE",
    timestamp: "09:41:03.904",
    detail: "downstream confirm: AP-2026-0412, link established",
  },
  {
    state: "LOG",
    timestamp: "09:41:04.000",
    detail: "retention policy: 7 years (GRA statutory), source metadata kept",
  },
];

const STEPS = [
  {
    title: "Detect",
    detail:
      "Input: file from any surface (upload, email, folder watch, mobile photo). Output: registered document record with source metadata. No confidence score — structural intake.",
  },
  {
    title: "Classify Type",
    detail:
      "Input: file content. Output: document type + confidence. Confidence score REQUIRED — below-threshold classifications are flagged for human confirmation, never silently defaulted to the most common type.",
  },
  {
    title: "Extract Fields",
    detail:
      "Input: classified document. Output: structured fields + per-field confidence. Confidence score REQUIRED per field — shown against the source image.",
  },
  {
    title: "Link to Transaction",
    detail:
      "Input: downstream agent's record. Output: bidirectional reference once the record exists. No confidence score — structural.",
  },
  {
    title: "Route",
    detail:
      "Input: classified + extracted document. Output: which downstream agent received it (AP, Expense, Reconciliation, Payroll, Tax). No confidence score.",
  },
  {
    title: "Confirm Done",
    detail:
      "Input: downstream agent processing confirmation. Output: DONE status in the document inbox. No confidence score.",
  },
];

const CONSTRAINTS = [
  { label: "Classify With Confidence", icon: ScanSearch },
  { label: "No Silent Default", icon: ShieldQuestion },
  { label: "Bidirectional Link", icon: Link2 },
  { label: "Never Silently Dropped", icon: FileWarning },
  { label: "Duplicate Detection", icon: Copy },
  { label: "Per-Field Extraction Confidence", icon: ScanLine },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateIcon(state: DocumentState): React.ElementType {
  switch (state) {
    case "DETECTED":
      return FileText;
    case "CLASSIFYING":
      return ScanSearch;
    case "EXTRACTING":
      return ScanLine;
    case "LINKING":
      return Link2;
    case "ROUTING":
      return Route;
    case "DONE":
      return CheckCircle2;
  }
}

function getStateColor(state: DocumentState): string {
  switch (state) {
    case "DETECTED":
    case "LINKING":
      return "text-muted-foreground/70";
    case "CLASSIFYING":
    case "EXTRACTING":
      return "text-signal-indigo";
    case "ROUTING":
      return "text-attention-amber";
    case "DONE":
      return "text-balanced-green";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function ConfidenceMeter({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Confidence: ${value}%`}
      className="flex items-center gap-1.5"
      title={label}
    >
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-signal-indigo"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
        {value}%
      </span>
    </div>
  );
}

function LayerTag({ layer, label }: { layer: "1" | "2"; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold",
        layer === "1"
          ? "bg-balanced-green/10 text-balanced-green"
          : "bg-signal-indigo/10 text-signal-indigo",
      )}
    >
      Layer {layer} — {label}
    </span>
  );
}

// ─── Branch State Card ─────────────────────────────────────────────────

function BranchCard({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: React.ElementType;
  title: string;
  tone: "amber" | "red" | "green";
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "amber"
      ? "border-attention-amber/30 bg-attention-amber/5"
      : tone === "red"
        ? "border-error-clay/30 bg-error-clay/5"
        : "border-balanced-green/30 bg-balanced-green/5";
  const iconClasses =
    tone === "amber"
      ? "bg-attention-amber/10 text-attention-amber"
      : tone === "red"
        ? "bg-error-clay/10 text-error-clay"
        : "bg-balanced-green/10 text-balanced-green";
  return (
    <div className={cn("rounded-xl border p-4", toneClasses)}>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            iconClasses,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold">{title}</p>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function DocumentLiveness({
  className,
  showEmptyState,
  showLowConfidence,
  showExtractionFailure,
  showUnrecognized,
  showCorrupt,
  showDuplicate,
  showDone,
}: DocumentLivenessProps) {
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  // ── Empty state ──────────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card p-6", className)}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No documents in inbox</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Upload a file from any surface — web, mobile, desktop, or email —
            and the Document Agent pipeline will appear here.
          </p>
        </div>
      </div>
    );
  }

  // ── Branch: Low classification confidence (Critical Rule) ────────────
  if (showLowConfidence) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <ShieldQuestion className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Low Classification Confidence
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Critical Rule — Blocking for that document
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Blocking
          </span>
        </div>
        <BranchCard
          icon={ShieldQuestion}
          title="What type of document is this?"
          tone="amber"
        >
          <p>
            Low confidence (52%) — could be invoice or receipt, please confirm.
          </p>
          <p>
            Never silently default to the most common type. A misclassified
            document cascades into every downstream agent&apos;s logic being
            applied to the wrong workflow.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            {DOC_NAME} paused at CLASSIFYING — awaiting human confirmation.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Extraction failure ───────────────────────────────────────
  if (showExtractionFailure) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <ScanLine className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Extraction Needs Input</h2>
              <p className="text-[10px] text-muted-foreground">
                Critical field unreadable — Blocking for that document
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Blocking
          </span>
        </div>
        <BranchCard
          icon={ScanLine}
          title="Couldn't read amount — please confirm or enter manually"
          tone="amber"
        >
          <p>
            The agent never guesses a figure it couldn&apos;t read. The other
            fields (vendor 96%, date 88%) are intact, but the amount field
            failed OCR on {DOC_NAME}.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Blocking for this document — downstream agents are not routed until
            the field is confirmed.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Unrecognized format ──────────────────────────────────────
  if (showUnrecognized) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
            <Tag className="h-4 w-4 text-error-clay" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Unrecognized File Format</h2>
            <p className="text-[10px] text-muted-foreground">
              Blocking for that document
            </p>
          </div>
        </div>
        <BranchCard
          icon={Tag}
          title="Can't process this file type — try PDF, PNG, JPG, or CSV export"
          tone="red"
        >
          <p>
            The agent surfaces unsupported formats explicitly instead of
            silently skipping them. A human can convert the file and re-upload.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            {DOC_NAME} shown as a failed item in the inbox until resolved.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Corrupt file ─────────────────────────────────────────────
  if (showCorrupt) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
            <FileWarning className="h-4 w-4 text-error-clay" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              Corrupt or Unreadable File
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Error / Failure State
            </p>
          </div>
        </div>
        <BranchCard
          icon={FileWarning}
          title="Couldn't read this file — never silently dropped"
          tone="red"
        >
          <p>
            {DOC_NAME} is corrupt or unreadable. It stays visible as a failed
            item in the document inbox requiring action — never silently removed
            from the pipeline.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Options: re-upload a clean export, or flag for manual entry.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Duplicate document ───────────────────────────────────────
  if (showDuplicate) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
            <Copy className="h-4 w-4 text-attention-amber" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              Duplicate Document Detected
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Same file uploaded twice — flagged, not processed twice
            </p>
          </div>
        </div>
        <BranchCard
          icon={Copy}
          title="invoice-1042.pdf was uploaded twice"
          tone="amber"
        >
          <p>
            The second copy is flagged rather than silently processed twice —
            duplicate ingestion would double-post to every downstream agent.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Uploaded at 09:40:52 and 09:41:07 — identical hash. One copy
            suspended pending confirmation.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: DONE terminal state ──────────────────────────────────────
  if (showDone) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-balanced-green/10">
              <CheckCircle2 className="h-4 w-4 text-balanced-green" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Document Done</h2>
              <p className="text-[10px] text-muted-foreground">
                Terminal — downstream agent confirmed processing
              </p>
            </div>
          </div>
          <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
            DONE
          </span>
        </div>
        <BranchCard
          icon={CheckCircle2}
          title={`Linked to transaction AP-2026-0412`}
          tone="green"
        >
          <p>
            Status updates to Done in the document inbox. The bidirectional link
            means clicking the transaction anywhere in the system opens the
            originating document in one click.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <Link2 className="h-3 w-3 text-balanced-green" />
            invoice-1042.pdf ↔ AP invoice AP-2026-0412 — link established.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────

  const activeState: DocumentState = "CLASSIFYING";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
            <Fingerprint className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Document Agent</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                Universal ingestion — web, mobile, desktop, email
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              The single entry point for nearly all data into the system — and
              the PRD&apos;s best liveness example, generalized to every
              surface.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-signal-indigo/10 px-2 py-0.5 text-[10px] font-semibold text-signal-indigo">
            <Activity className="h-3 w-3 animate-pulse" />
            Classifying
          </span>
          <span className="text-[9px] text-muted-foreground">
            Entity: Xenboox HQ
          </span>
        </div>
      </div>

      {/* Live status */}
      <div
        role="status"
        data-live-status
        className="flex items-center gap-2 rounded-lg border bg-accent/20 px-3 py-2 text-[10px] text-muted-foreground"
      >
        <Activity className="h-3 w-3 text-signal-indigo animate-pulse" />
        Currently:{" "}
        <span className="font-semibold text-foreground">CLASSIFYING</span> —
        processing {DOC_NAME}
      </div>

      {/* Pipeline */}
      <section
        aria-label="Document State Machine"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Document State Machine
          </h3>
          <LayerTag layer="1" label="detect · link · route · done" />
        </div>
        <ol className="space-y-1.5">
          {PIPELINE_STATES.map((stage, i) => {
            const isActive = stage.id === activeState;
            const isComplete =
              i < PIPELINE_STATES.findIndex((s) => s.id === activeState);
            const isTerminal = stage.id === "DONE";
            const Icon = stage.icon;
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2",
                  isActive
                    ? "border-signal-indigo/30 bg-signal-indigo/5"
                    : isComplete
                      ? "border-border/60 bg-muted/30"
                      : "border-border/40 bg-card opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    isActive
                      ? "bg-signal-indigo/15"
                      : isComplete
                        ? "bg-balanced-green/10"
                        : "bg-muted",
                  )}
                >
                  {isActive ? (
                    <Activity
                      className={cn(
                        "h-3 w-3 animate-pulse",
                        getStateColor(stage.id),
                      )}
                    />
                  ) : (
                    <Icon className={cn("h-3 w-3", getStateColor(stage.id))} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tabular-nums">
                      {stage.label}
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-signal-indigo/10 px-1.5 py-0.5 text-[8px] font-semibold text-signal-indigo">
                        ACTIVE
                      </span>
                    )}
                    {isComplete && !isTerminal && (
                      <span className="rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
                        COMPLETE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {stage.description}
                  </p>
                </div>
                {isTerminal && (
                  <span className="text-[9px] text-muted-foreground/60">
                    terminal
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Detection (Layer 1) */}
      <section aria-label="Detection" className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Detection
          </h3>
          <LayerTag layer="1" label="deterministic" />
        </div>
        <p data-step="detected" className="text-xs text-muted-foreground">
          New file: {DOC_NAME} detected — source: web upload · size 412 KB ·
          09:41:00
        </p>
      </section>

      {/* Classification (Layer 2) */}
      <section
        aria-label="Classification"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Classification
          </h3>
          <LayerTag layer="2" label="probabilistic" />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p data-step="classify" className="text-xs">
              <span className="font-medium text-foreground">
                Classified as invoice
              </span>{" "}
              — 94% confidence, based on layout pattern and presence of
              &apos;Invoice #&apos; field.
            </p>
            <p className="text-[10px] text-muted-foreground">
              Below-threshold classifications are flagged for human confirmation
              rather than guessed.
            </p>
          </div>
          <ConfidenceMeter value={94} label="Classification confidence" />
        </div>
      </section>

      {/* Extraction (Layer 2, per-field) */}
      <section
        aria-label="Field Extraction"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Field Extraction
          </h3>
          <LayerTag layer="2" label="per-field confidence" />
        </div>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Extracted fields shown against the source document — each field
          carries its own independent confidence score.
        </p>
        <div className="space-y-1.5">
          {EXTRACTED_FIELDS.map((field) => (
            <div
              key={field.label}
              data-step="extract"
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="w-20 text-[10px] font-medium text-muted-foreground">
                  {field.label}
                </span>
                <span className="text-xs font-semibold tabular-nums">
                  {field.value}
                </span>
              </div>
              <ConfidenceMeter
                value={field.confidence}
                label={`${field.label} confidence`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Link & Routing (Layer 1) */}
      <section
        aria-label="Link & Routing"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Link &amp; Routing
          </h3>
          <LayerTag layer="1" label="structural" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div
            data-step="link"
            className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
          >
            <p className="text-[10px] font-medium text-muted-foreground">
              Bidirectional Link
            </p>
            <p className="mt-0.5 text-xs">
              Link pending — bidirectional link established once the downstream
              agent confirms processing.
            </p>
          </div>
          <div
            data-step="route"
            className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
          >
            <p className="text-[10px] font-medium text-muted-foreground">
              Routing Decision
            </p>
            <p className="mt-0.5 text-xs">
              Routed to AP Agent for invoice processing.
            </p>
          </div>
        </div>
      </section>

      {/* Status grid */}
      <section
        aria-label="Document Metadata"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {[
          { label: "Source", value: "Web upload" },
          { label: "Type", value: "Invoice" },
          { label: "Retention", value: "7 years (GRA statutory)" },
          { label: "Linked Transaction", value: "Pending" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card px-3 py-2">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/50">
              {item.label}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold">{item.value}</p>
          </div>
        ))}
      </section>

      {/* Escalation & Human-in-the-Loop */}
      <section
        aria-label="Escalation & Human-in-the-Loop"
        className="rounded-xl border bg-card p-4"
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Escalation &amp; Human-in-the-Loop
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="border-b text-muted-foreground/60">
                <th className="py-1.5 pr-2 font-medium">Condition</th>
                <th className="py-1.5 pr-2 font-medium">Escalates to</th>
                <th className="py-1.5 pr-2 font-medium">What user sees</th>
                <th className="py-1.5 font-medium">Blocking?</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  condition: "Classification confidence below threshold",
                  esc: "Human",
                  note: "'What type of document is this?'",
                  blocking: "Blocking for that document",
                },
                {
                  condition: "Extraction fails on critical field",
                  esc: "Human, downstream agent",
                  note: "'Couldn't read [field] — please confirm or enter manually'",
                  blocking: "Blocking",
                },
                {
                  condition: "Unrecognized file format",
                  esc: "Human",
                  note: "'Can't process this file type — try alternatives'",
                  blocking: "Blocking",
                },
              ].map((row) => (
                <tr key={row.condition} className="border-b border-border/40">
                  <td className="py-1.5 pr-2 text-muted-foreground">
                    {row.condition}
                  </td>
                  <td className="py-1.5 pr-2 text-muted-foreground">
                    {row.esc}
                  </td>
                  <td className="py-1.5 pr-2 text-muted-foreground">
                    {row.note}
                  </td>
                  <td className="py-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[9px] font-medium text-attention-amber">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {row.blocking}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* How It Works */}
      <section aria-label="How It Works" className="rounded-xl border bg-card">
        <button
          onClick={() => setHowItWorksOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold">
            <Eye className="h-3.5 w-3.5 text-signal-indigo" />
            How It Works — Step-by-Step
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              howItWorksOpen && "rotate-180",
            )}
          />
        </button>
        {howItWorksOpen && (
          <div className="space-y-2 border-t px-4 py-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="flex gap-3 rounded-lg bg-muted/20 p-2.5"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal-indigo/10 text-[9px] font-bold text-signal-indigo">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[11px] font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Constraint Enforcement */}
      <section
        aria-label="Constraint Enforcement"
        className="rounded-xl border bg-card p-4"
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Constraint Enforcement
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {CONSTRAINTS.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[10px] font-medium"
            >
              <c.icon className="h-3 w-3 text-balanced-green" />
              {c.label}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          The critical rule: classification confidence below threshold must
          never silently default to the most common type — it is flagged for
          human confirmation, since misclassification cascades into every
          downstream agent&apos;s logic.
        </p>
      </section>

      {/* Audit Trail */}
      <section aria-label="Audit Trail" className="rounded-xl border bg-card">
        <button
          onClick={() => setAuditOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold">
            <ListChecks className="h-3.5 w-3.5 text-signal-indigo" />
            Audit Trail — Every State Transition
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              auditOpen && "rotate-180",
            )}
          />
        </button>
        {auditOpen && (
          <div className="border-t">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="border-b text-muted-foreground/60">
                  <th className="px-4 py-2 font-medium">Timestamp</th>
                  <th className="px-4 py-2 font-medium">State</th>
                  <th className="px-4 py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {AUDIT_TRAIL.map((entry, i) => {
                  const Icon =
                    entry.state === "LOG"
                      ? ListChecks
                      : getStateIcon(entry.state as DocumentState);
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="px-4 py-2 font-mono text-[9px] text-muted-foreground/70">
                        {entry.timestamp}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                            entry.state === "DONE" || entry.state === "LOG"
                              ? "bg-balanced-green/10 text-balanced-green"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {entry.state}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-[9px] text-muted-foreground">
                        {entry.detail}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cross-Agent Dependencies */}
      <section
        aria-label="Cross-Agent Chain"
        className="rounded-xl border bg-card p-4"
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Cross-Agent Chain
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">
            <Fingerprint className="h-3 w-3" />
            Document Agent
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
          {[
            "AP Agent",
            "Expense Agent",
            "Reconciliation Agent",
            "Payroll Worker Agent",
            "Tax Agent",
          ].map((agent, i) => (
            <span key={agent} className="flex items-center gap-1.5">
              <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
                {agent}
              </span>
              {i < 4 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
              )}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          The universal upstream agent — feeds nearly every downstream agent
          across web, mobile, desktop, and email surfaces.
        </p>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-accent/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <ShieldCheck className="h-3 w-3 text-balanced-green" />
          Layer 1 — deterministic: detection, linking, routing, done
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <Activity className="h-3 w-3 text-signal-indigo" />
          Layer 2 — probabilistic: classification 94%, per-field extraction
        </span>
      </div>
    </div>
  );
}
