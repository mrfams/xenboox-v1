"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Activity,
  FileSearch,
  CalendarDays,
  Building2,
  ArrowRight,
  ListChecks,
  Layers,
  Eye,
  Link2,
  ShieldAlert,
  FileText,
  Lock,
  Sparkles,
  ScanSearch,
  UserCheck,
  UserPlus,
  CopyCheck,
  Timer,
  Send,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────

export type ApState =
  | "DOC_RECEIVED"
  | "EXTRACTING"
  | "VENDOR_MATCHING"
  | "PO_MATCHING"
  | "DUPLICATE_CHECK"
  | "PAYMENT_SCHEDULED"
  | "HANDED_TO_CASH_OR_MOBILE_MONEY"
  | "FLAGGED_NEEDS_INPUT";

export type VendorMatchKind = "exact" | "fuzzy" | "new";

export type DuplicateKind = "clean" | "fuzzy";

export interface ApLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showNeedsInput?: boolean;
  showHandedOff?: boolean;
}

// ─── Active Stage ──────────────────────────────────────────────────────

const ACTIVE_STATE: ApState = "VENDOR_MATCHING";

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: ApState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "DOC_RECEIVED",
    label: "DOC_RECEIVED",
    description:
      "Invoice received from Document Agent — structured extraction available",
    icon: FileText,
  },
  {
    id: "EXTRACTING",
    label: "EXTRACTING",
    description:
      "Confirming/refining extracted fields (vendor, amount, date, due date, line items)",
    icon: ScanSearch,
  },
  {
    id: "VENDOR_MATCHING",
    label: "VENDOR_MATCHING",
    description:
      "Matching vendor to master, or flagging as new — basis + confidence shown",
    icon: UserCheck,
  },
  {
    id: "PO_MATCHING",
    label: "PO_MATCHING",
    description:
      "Checking for an open PO matching amount/vendor — deterministic lookup",
    icon: Link2,
  },
  {
    id: "DUPLICATE_CHECK",
    label: "DUPLICATE_CHECK",
    description:
      "Comparing invoice number + vendor + amount — always shown, even when clean",
    icon: CopyCheck,
  },
  {
    id: "PAYMENT_SCHEDULED",
    label: "PAYMENT_SCHEDULED",
    description: "Setting due date, adding to payment queue",
    icon: CalendarDays,
  },
  {
    id: "HANDED_TO_CASH_OR_MOBILE_MONEY",
    label: "HANDED_TO_CASH_OR_MOBILE_MONEY",
    description: "Handoff to Cash Agent or Mobile Money Agent for payment",
    icon: Send,
  },
];

const EXTRACTED_FIELDS: Array<{
  field: string;
  value: string;
  confidence: string;
}> = [
  { field: "Vendor", value: "AWS", confidence: "100%" },
  { field: "Invoice Number", value: "AWS-88123", confidence: "99%" },
  { field: "Invoice Date", value: "Jul 14, 2026", confidence: "100%" },
  { field: "Due Date", value: "Jul 31, 2026", confidence: "98%" },
  { field: "Total Amount", value: "GMD 48,900.00", confidence: "100%" },
  { field: "Line Items", value: "3 (cloud services)", confidence: "96%" },
];

const VENDOR_MATCHES: Array<{
  id: string;
  kind: VendorMatchKind;
  label: string;
  basis: string;
  confidence?: number;
  detail: string;
}> = [
  {
    id: "v_exact",
    kind: "exact",
    label: "Matched to existing vendor: AWS",
    basis: "matched on tax ID",
    detail:
      "Matched vendor 'AWS' — exact match on existing vendor master record (tax ID identical). Proceeds automatically.",
  },
  {
    id: "v_new",
    kind: "new",
    label: "New vendor detected: Cloudline Ltd",
    basis: "no match found",
    detail:
      "New vendor flagged: 'Cloudline Ltd' — no match found in vendor master. Confirm to add.",
  },
  {
    id: "v_fuzzy",
    kind: "fuzzy",
    label: "Fuzzy match: Westlink Consulting ↔ Westlink Group",
    basis: "matched on similar name",
    confidence: 0.82,
    detail:
      "Fuzzy match (82% confidence): 'Westlink Consulting' ↔ 'Westlink Group' — matched on similar name. Is this Westlink Group or a new vendor? Never auto-merges on name similarity alone.",
  },
];

const PO_MATCHES = [
  {
    invoice: "AP-2026-0317 · AWS",
    result: "Matched to PO #1042 — GMD 48,900.00 open",
    note: "Deterministic lookup against open POs — no confidence score.",
  },
  {
    invoice: "AP-2026-0318 · Cloudline Ltd",
    result: "No PO found — proceeding as non-PO invoice",
    note: "Absence of a PO is a fact, not a failure.",
  },
  {
    invoice: "AP-2026-0321 · Westlink Group",
    result:
      "PO #1047 amount differs — invoice GMD 12,800.00 vs PO GMD 12,400.00 (delta GMD 400.00)",
    note: "Flagged explicitly with the delta — not auto-accepted, not auto-rejected.",
  },
];

const DUPLICATE_CHECKS: Array<{
  id: string;
  kind: DuplicateKind;
  invoice: string;
  result: string;
  confidence?: number;
  detail: string;
}> = [
  {
    id: "d_clean",
    kind: "clean",
    invoice: "AWS-88123",
    result: "Checked against 340 existing AP records — no duplicate",
    detail:
      "No prior record found for AWS-88123 / AWS / GMD 48,900.00. Proceeding.",
  },
  {
    id: "d_fuzzy",
    kind: "fuzzy",
    invoice: "#4471",
    result:
      "Near-duplicate flagged: #4471 vs prior #4470 — GMD 3,450.00, amount + vendor identical",
    confidence: 0.91,
    detail:
      "Invoice number differs by one character from prior record #4470. Prior record #4470 shown side-by-side. Requires confirmation — never silently resolved.",
  },
];

const PAYMENT_QUEUE = [
  {
    invoice: "AP-2026-0317",
    vendor: "AWS",
    amount: "GMD 48,900.00",
    due: "due Jul 31, 2026",
    status: "scheduled Jul 29, 2026",
    blocked: false,
  },
  {
    invoice: "AP-2026-0316",
    vendor: "Gamcel",
    amount: "GMD 12,400.00",
    due: "due Aug 5, 2026",
    status: "scheduled Aug 3, 2026",
    blocked: false,
  },
  {
    invoice: "AP-2026-0318",
    vendor: "Cloudline Ltd",
    amount: "GMD 22,500.00",
    due: "due Aug 15, 2026",
    status: "blocked — new vendor confirmation required",
    blocked: true,
  },
];

const ESCALATION_TRIGGERS = [
  {
    trigger: "New vendor detected",
    to: "Controller Agent / human",
    effect:
      "Confirm-new-vendor prompt with extracted details. Blocking for that invoice.",
  },
  {
    trigger: "Fuzzy vendor match (ambiguous)",
    to: "Controller Agent / human",
    effect: "Is this [Vendor A] or a new vendor? Blocking.",
  },
  {
    trigger: "Likely duplicate invoice",
    to: "Controller Agent",
    effect: "Shown side-by-side with the suspected original. Blocking.",
  },
  {
    trigger: "Critical field unreadable (amount, vendor)",
    to: "Document Agent retry / human",
    effect: "Couldn't read [field] — please confirm. Blocking.",
  },
];

const STEPS = [
  {
    title: "Receive Structured Extraction",
    detail:
      "Input: OCR output from Document Agent. Output: draft invoice record. No confidence score at this step — inherits Document Agent's per-field confidence, doesn't regenerate it.",
  },
  {
    title: "Confirm & Refine Fields",
    detail:
      "Input: draft record. Output: finalized {vendor, amount, currency, invoice_number, date, due_date, line_items[]}. Confidence per field carried through.",
  },
  {
    title: "Match Vendor",
    detail:
      "Input: vendor name/details. Output: matched vendor_id + match confidence + basis, OR 'new vendor' flag. Confidence required for fuzzy matches. Critical rule: never auto-merge on fuzzy name similarity alone — always requires human confirmation.",
  },
  {
    title: "Match PO",
    detail:
      "Input: vendor_id + amount. Output: matched PO_id or null. No confidence score — deterministic lookup against open POs. Absence of a PO is a fact, not a failure.",
  },
  {
    title: "Duplicate Check",
    detail:
      "Input: vendor_id + invoice_number + amount. Output: pass, or flagged with the specific matching prior record shown. Confidence only if fuzzy near-duplicate — exact/none is deterministic.",
  },
  {
    title: "Schedule Payment",
    detail:
      "Input: due date, cash position awareness. Output: queued payment date. No confidence score.",
  },
  {
    title: "Hand Off",
    detail:
      "Structural step, not a judgment. Routes to Cash Agent (bank rail) or Mobile Money Agent (mobile rail) at scheduled date, then to Ledger Agent for posting.",
  },
];

const CONSTRAINTS = [
  { label: "Never Auto-Merge", icon: ShieldAlert },
  { label: "Basis Always Shown", icon: Eye },
  { label: "Duplicate Always Checked", icon: FileSearch },
  { label: "Non-PO Is A Fact", icon: Building2 },
  { label: "Exact ≠ Fuzzy Weight", icon: Layers },
  { label: "Inherited ≠ Regenerated", icon: Sparkles },
];

const AUDIT_TRAIL = [
  {
    invoice: "AP-2026-0317 · AWS-88123",
    event: "extraction",
    detail:
      "extraction: vendor 100% / amount 100% / date 100% — inherited from Document Agent",
    confidence: "—",
    ts: "09:41:58.104",
  },
  {
    invoice: "AP-2026-0317",
    event: "vendor",
    detail: "vendor match: exact · basis: tax ID identical",
    confidence: "100%",
    ts: "09:42:00.211",
  },
  {
    invoice: "AP-2026-0317",
    event: "po",
    detail: "PO match: #1042 · open · deterministic lookup",
    confidence: "—",
    ts: "09:42:00.874",
  },
  {
    invoice: "AP-2026-0317",
    event: "duplicate",
    detail: "duplicate check: clean · 340 records checked",
    confidence: "—",
    ts: "09:42:01.102",
  },
  {
    invoice: "AP-2026-0317",
    event: "schedule",
    detail: "schedule: Jul 29, 2026 · due Jul 31, 2026 · cash position checked",
    confidence: "—",
    ts: "09:42:01.442",
  },
  {
    invoice: "AP-2026-0318 · Cloudline Ltd",
    event: "vendor",
    detail: "vendor match: NEW · no match in master · confirm to add",
    confidence: "—",
    ts: "09:44:12.003",
  },
  {
    invoice: "AP-2026-0318",
    event: "human",
    detail: "confirmed by human: new vendor added · A. Jammeh (Controller)",
    confidence: "—",
    ts: "09:52:00.410",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateColor(state: ApState): string {
  switch (state) {
    case "FLAGGED_NEEDS_INPUT":
      return "text-error-clay";
    case "HANDED_TO_CASH_OR_MOBILE_MONEY":
      return "text-balanced-green";
    default:
      return "text-signal-indigo";
  }
}

function getStateBg(state: ApState): string {
  switch (state) {
    case "FLAGGED_NEEDS_INPUT":
      return "bg-error-clay/5 border-error-clay/20";
    case "HANDED_TO_CASH_OR_MOBILE_MONEY":
      return "bg-balanced-green/5 border-balanced-green/20";
    default:
      return "bg-signal-indigo/5 border-signal-indigo/20";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function StateBadge({ state }: { state: ApState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold",
        getStateColor(state),
        getStateBg(state),
      )}
    >
      {state === "FLAGGED_NEEDS_INPUT" && (
        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
      )}
      {state === "HANDED_TO_CASH_OR_MOBILE_MONEY" && (
        <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
      )}
      {state}
    </span>
  );
}

function VendorRow({ row }: { row: (typeof VENDOR_MATCHES)[number] }) {
  const isExact = row.kind === "exact";
  const isFuzzy = row.kind === "fuzzy";
  const isNew = row.kind === "new";

  return (
    <div
      data-vendor-kind={row.kind}
      className={cn(
        "rounded-lg border p-2.5",
        isExact && "border-balanced-green/25 bg-balanced-green/5",
        isFuzzy && "border-attention-amber/25 bg-attention-amber/5",
        isNew && "border-signal-indigo/25 bg-signal-indigo/5",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
            isExact && "bg-balanced-green/10 text-balanced-green",
            isFuzzy && "bg-attention-amber/10 text-attention-amber",
            isNew && "bg-signal-indigo/10 text-signal-indigo",
          )}
        >
          {isExact ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : isFuzzy ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <UserPlus className="h-3 w-3" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium text-foreground">
              {row.label}
            </span>
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-[8px] font-semibold",
                isExact &&
                  "border-balanced-green/20 bg-balanced-green/10 text-balanced-green",
                isFuzzy &&
                  "border-attention-amber/20 bg-attention-amber/10 text-attention-amber",
                isNew &&
                  "border-signal-indigo/20 bg-signal-indigo/10 text-signal-indigo",
              )}
            >
              {row.basis}
            </span>
            {isExact && (
              <span className="shrink-0 rounded-full border border-balanced-green/20 bg-balanced-green/5 px-1.5 py-0.5 text-[8px] font-bold text-balanced-green">
                100% · by definition
              </span>
            )}
            {isFuzzy && row.confidence !== undefined && (
              <span
                role="meter"
                aria-label={`Fuzzy vendor match confidence ${Math.round(row.confidence * 100)}%`}
                aria-valuenow={Math.round(row.confidence * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="shrink-0 rounded-full border border-attention-amber/30 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-bold text-attention-amber"
              >
                {Math.round(row.confidence * 100)}%
              </span>
            )}
          </div>
          <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
            {row.detail}
          </p>
        </div>
      </div>
    </div>
  );
}

function DuplicateRow({ row }: { row: (typeof DUPLICATE_CHECKS)[number] }) {
  const isClean = row.kind === "clean";

  return (
    <div
      data-duplicate-kind={row.kind}
      className={cn(
        "rounded-lg border p-2.5",
        isClean
          ? "border-balanced-green/25 bg-balanced-green/5"
          : "border-attention-amber/25 bg-attention-amber/5",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
            isClean
              ? "bg-balanced-green/10 text-balanced-green"
              : "bg-attention-amber/10 text-attention-amber",
          )}
        >
          {isClean ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium text-foreground">
              {row.result}
            </span>
            {!isClean && row.confidence !== undefined && (
              <span
                role="meter"
                aria-label={`Near-duplicate confidence ${Math.round(row.confidence * 100)}%`}
                aria-valuenow={Math.round(row.confidence * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="shrink-0 rounded-full border border-attention-amber/30 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-bold text-attention-amber"
              >
                {Math.round(row.confidence * 100)}%
              </span>
            )}
          </div>
          <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
            {row.detail}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function ApLiveness({
  className,
  showEmptyState = false,
  showNeedsInput = false,
  showHandedOff = false,
}: ApLivenessProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const header = (
    <div className="border-b bg-gradient-to-r from-accent/50 to-transparent px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
          <Receipt className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">AP Agent</h2>
          <p className="text-[10px] text-muted-foreground">
            Invoice Processing — Procure-to-Pay
          </p>
        </div>
      </div>
    </div>
  );

  // ── Empty State ───────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {header}
        <div className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Receipt className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No invoice being processed
          </p>
          <p className="mx-auto mt-1 max-w-md text-[10px] text-muted-foreground/60">
            The AP Agent is idle, waiting for the Document Agent to classify an
            inbound document as an invoice. Extraction, vendor matching,
            duplicate check, and payment scheduling appear here the moment an
            invoice is routed in.
          </p>
        </div>
      </div>
    );
  }

  // ── FLAGGED_NEEDS_INPUT State ────────────────────────────────────
  if (showNeedsInput) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {header}

        {/* Needs Attention Strip */}
        <div className="border-b-2 border-error-clay/30 bg-error-clay/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-error-clay/10">
              <AlertTriangle className="h-4 w-4 text-error-clay" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-error-clay">
                  Couldn&apos;t Read Amount
                </span>
                <span className="rounded-full border border-error-clay/20 bg-error-clay/10 px-1.5 py-0.5 text-[8px] font-medium text-error-clay">
                  FLAGGED_NEEDS_INPUT
                </span>
              </div>
              <p className="mt-1 text-[10px] text-foreground">
                Critical field unreadable on invoice #4473 — the amount is
                illegible. Blocking for this invoice; never guessed.
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5 text-error-clay/60" />
                <span className="text-[9px] font-medium text-error-clay/80">
                  Returned to Document Agent — re-scan or manual entry
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div role="region" aria-label="Flagged Fields">
            <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Flagged Fields
            </h3>
            <div className="rounded-lg border border-error-clay/20 bg-error-clay/5 p-3">
              <p className="text-[10px] font-medium text-error-clay">
                Amount — Couldn&apos;t read. No confidence score (deterministic
                failure).
              </p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                Field illegible on source document. Routed back through the
                Document Agent for re-scan, or offered for manual entry — never
                guessed.
              </p>
            </div>
          </div>

          {/* Liveness footer */}
          <div
            className="rounded-lg border border-dashed bg-muted/20 p-2.5"
            role="region"
            aria-label="Liveness Transparency"
          >
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
              <Sparkles className="h-3 w-3 shrink-0 text-signal-indigo" />
              <span>
                <strong className="text-muted-foreground/80">
                  Blocking failure:
                </strong>{" "}
                critical unreadable fields never proceed — the invoice parks in
                FLAGGED_NEEDS_INPUT until resolved. Never guessed, never
                silently skipped.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Handed-Off Terminal State ────────────────────────────────────
  if (showHandedOff) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-accent/50 via-accent/30 to-transparent px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">AP Agent</h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:border-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    HANDED_OFF
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Invoice Processing — Procure-to-Pay
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Handoff summary */}
        <div className="space-y-3 p-4" role="region" aria-label="Agent Status">
          <div className="rounded-lg border border-balanced-green/25 bg-balanced-green/5 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-balanced-green" />
              <p className="text-xs font-semibold text-balanced-green">
                Handed to Cash Agent for payment
              </p>
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">
              Invoice AP-2026-0317 · AWS · GMD 48,900.00 — payment method
              bank_transfer, scheduled Jul 29, 2026. Terminal for AP
              Agent&apos;s scope until payment confirms.
            </p>
            <div className="mt-2 flex items-center gap-1 text-[9px]">
              <ArrowRight className="h-2.5 w-2.5 text-balanced-green/60" />
              <span className="font-medium text-balanced-green/80">
                Cash Agent → Ledger Agent — posting follows payment confirmation
              </span>
            </div>
          </div>

          {/* Liveness footer */}
          <div
            className="rounded-lg border border-dashed bg-muted/20 p-2.5"
            role="region"
            aria-label="Liveness Transparency"
          >
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
              <Sparkles className="h-3 w-3 shrink-0 text-signal-indigo" />
              <span>
                <strong className="text-muted-foreground/80">Audit:</strong>{" "}
                every invoice&apos;s extraction confidence, vendor match basis,
                PO result, duplicate result, and schedule are logged — original
                agent decisions and human confirmations both preserved, never
                overwritten.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Active Run State ──────────────────────────────────────
  const activeStateIdx = PIPELINE_STATES.findIndex(
    (s) => s.id === ACTIVE_STATE,
  );

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-accent/50 via-accent/30 to-transparent px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">AP Agent</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:border-emerald-800">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Exact deterministic · Fuzzy labeled
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Invoice Processing — Procure-to-Pay
              </p>
            </div>
          </div>

          {/* Invoice attribution */}
          <div className="hidden text-right sm:block">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Invoice
            </p>
            <p className="text-xs font-medium">AP-2026-0317</p>
            <p className="text-[9px] text-muted-foreground/60">AWS · GMD</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4" role="region" aria-label="Agent Status">
        {/* Status Info Grid */}
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          role="region"
          aria-label="Status Information"
        >
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-indigo" />
              <span className="text-xs font-medium text-signal-indigo">
                VENDOR_MATCHING
              </span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Invoice
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Receipt className="h-3 w-3 text-signal-indigo" />
              <span className="font-mono text-xs font-medium">
                AP-2026-0317
              </span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Entity
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-signal-indigo" />
              <span className="truncate text-xs font-medium">Xenboox HQ</span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Source
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-signal-indigo" />
              <span className="font-mono text-xs font-medium">
                Document Agent
              </span>
            </div>
          </div>
        </div>

        {/* Doc received banner */}
        <div
          className="rounded-lg border border-border/60 bg-accent/20 p-2.5"
          data-step="received"
        >
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Invoice Received
          </p>
          <p className="mt-0.5 text-[10px] text-foreground">
            Invoice received from Document Agent — structured extraction
            available. Processed at 09:41:58.
          </p>
          <p className="mt-0.5 text-[8px] text-muted-foreground/60">
            No confidence score at this step — inherits Document Agent&apos;s
            per-field confidence, never regenerates it.
          </p>
        </div>

        {/* Cross-Agent Handoff */}
        <div className="rounded-lg border bg-accent/20 p-2.5">
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Cross-Agent Handoff Chain
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="font-medium">Document Agent</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-medium">AP Agent</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-medium">Cash Agent</span>
            <span className="text-muted-foreground/60">|</span>
            <span className="font-medium">Mobile Money Agent</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-medium">Ledger Agent</span>
            <span className="ml-1 text-muted-foreground/70">
              — cash-position awareness from Treasury/Cash Agent
            </span>
          </div>
        </div>

        {/* Split View: Source Doc + Extracted Fields */}
        <div role="region" aria-label="Source Document and Extracted Fields">
          <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Split View — Source Document + Extracted Fields
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {/* Source document */}
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 border-b border-dashed pb-1.5">
                <FileText className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Source Document
                </span>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Invoice
                </p>
                <p className="text-sm font-bold">AWS</p>
                <div className="mt-1 space-y-0.5 text-[9px] text-muted-foreground">
                  <p>Invoice #: AWS-88123</p>
                  <p>Date: Jul 14, 2026</p>
                  <p>Due: Jul 31, 2026</p>
                  <p className="pt-0.5 font-medium text-foreground">
                    Amount: GMD 48,900.00
                  </p>
                </div>
                <div className="mt-2 rounded border border-border/50 bg-card px-1.5 py-1 text-[8px] text-muted-foreground/60">
                  3 line items · cloud services · net30
                </div>
              </div>
            </div>

            {/* Extracted fields */}
            <div data-step="extract" className="rounded-lg border bg-accent/20">
              <div className="flex items-center justify-between border-b bg-accent/30 px-2.5 py-1.5">
                <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Extracted Fields
                </span>
                <span className="text-[8px] text-muted-foreground/60">
                  confidence inherited from Document Agent
                </span>
              </div>
              <div className="divide-y divide-border/50">
                {EXTRACTED_FIELDS.map((f) => (
                  <div
                    key={f.field}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[9px]"
                  >
                    <span className="text-muted-foreground">{f.field}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">
                        {f.value}
                      </span>
                      <span className="rounded border border-border bg-card px-1 py-0.5 font-mono text-[8px] text-muted-foreground/70">
                        {f.confidence} · from Document Agent
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* State Machine Pipeline */}
        <div role="region" aria-label="AP State Machine">
          <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            State Machine — one invoice at a time
          </h3>
          <div className="space-y-1.5" role="list">
            {PIPELINE_STATES.map((state, idx) => (
              <div
                key={state.id}
                role="listitem"
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-all duration-300",
                  idx === activeStateIdx &&
                    "border-signal-indigo/30 bg-signal-indigo/5 shadow-sm",
                  idx < activeStateIdx &&
                    "border-balanced-green/20 bg-balanced-green/5",
                  idx > activeStateIdx &&
                    "border-border/50 bg-muted/30 opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    idx === activeStateIdx && "text-signal-indigo",
                    idx < activeStateIdx && "text-balanced-green",
                    idx > activeStateIdx && "text-muted-foreground/40",
                  )}
                >
                  {idx === activeStateIdx ? (
                    <Activity className="h-4 w-4 animate-pulse" />
                  ) : idx < activeStateIdx ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <state.icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <StateBadge state={state.id} />
                    {idx === activeStateIdx && (
                      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-signal-indigo" />
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-[9px]",
                      idx <= activeStateIdx
                        ? "text-muted-foreground/80"
                        : "text-muted-foreground/40",
                    )}
                  >
                    {state.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Exception branch */}
          <div className="mt-1.5 flex items-start gap-3 rounded-lg border border-error-clay/20 bg-error-clay/5 p-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-error-clay/10 text-error-clay">
              <AlertTriangle className="h-3 w-3" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[8px] text-error-clay/70">
                <span>exception branch — blocking input needed</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </div>
              <div className="mt-0.5">
                <StateBadge state="FLAGGED_NEEDS_INPUT" />
              </div>
              <p className="mt-0.5 text-[8px] text-muted-foreground/60">
                Blocking exception — triggers: unreadable critical field,
                ambiguous vendor match (two similar vendors), or likely
                duplicate. The invoice parks here until a human confirms — never
                guessed, never silently skipped.
              </p>
            </div>
          </div>
        </div>

        {/* Vendor Matching */}
        <div role="region" aria-label="Vendor Matching">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Vendor Match — Basis Always Shown
            </h3>
            <span className="text-[8px] text-muted-foreground/60">
              exact auto-proceeds · fuzzy &amp; new require confirmation
            </span>
          </div>
          <div className="space-y-1.5">
            {VENDOR_MATCHES.map((row) => (
              <VendorRow key={row.id} row={row} />
            ))}
          </div>

          {/* Critical rule callout */}
          <div className="mt-2 rounded-md border border-attention-amber/30 bg-attention-amber/5 p-2">
            <p className="text-[9px] leading-relaxed text-attention-amber">
              Critical rule: vendor matching never auto-merges a &quot;new&quot;
              vendor into an existing one on fuzzy name similarity alone — a
              fuzzy vendor match always requires human confirmation, never
              auto-proceeds like an exact match does.
            </p>
          </div>
        </div>

        {/* PO Matching */}
        <div data-step="po" role="region" aria-label="PO Matching">
          <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            PO Match — Deterministic Lookup
          </h3>
          <div className="space-y-1.5">
            {PO_MATCHES.map((po) => (
              <div
                key={po.invoice}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-accent/20 p-2.5"
              >
                <Link2 className="mt-0.5 h-3 w-3 shrink-0 text-balanced-green" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-foreground">
                    {po.result}
                  </p>
                  <p className="mt-0.5 text-[8px] text-muted-foreground/70">
                    {po.invoice} · {po.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Duplicate Check */}
        <div role="region" aria-label="Duplicate Check">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Duplicate Check — Always Shown, Even When Clean
            </h3>
            <span className="text-[8px] text-muted-foreground/60">
              clean = deterministic · near-duplicate = labeled confidence
            </span>
          </div>
          <div className="space-y-1.5">
            {DUPLICATE_CHECKS.map((row) => (
              <DuplicateRow key={row.id} row={row} />
            ))}
          </div>
        </div>

        {/* Payment Queue */}
        <div role="region" aria-label="Payment Queue">
          <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Payment Queue — Live List
          </h3>
          <div className="space-y-1.5">
            {PAYMENT_QUEUE.map((item) => (
              <div
                key={item.invoice}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2.5",
                  item.blocked
                    ? "border-attention-amber/25 bg-attention-amber/5"
                    : "border-border/60 bg-accent/20",
                )}
              >
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    item.blocked
                      ? "bg-attention-amber/10 text-attention-amber"
                      : "bg-balanced-green/10 text-balanced-green",
                  )}
                >
                  {item.blocked ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <Timer className="h-3 w-3" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-foreground">
                    {item.invoice} · {item.vendor} · {item.amount}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[8px]",
                      item.blocked
                        ? "text-attention-amber"
                        : "text-muted-foreground/70",
                    )}
                  >
                    {item.due} · {item.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Escalation & Human-in-the-Loop Triggers */}
        <div
          className="rounded-lg border bg-accent/20"
          role="region"
          aria-label="Escalation & Human-in-the-Loop Triggers"
        >
          <div className="flex items-center gap-1.5 border-b bg-accent/30 px-3 py-2">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Escalation &amp; Human-in-the-Loop Triggers
            </span>
          </div>
          <div className="space-y-1 px-3 py-2">
            {ESCALATION_TRIGGERS.map((t, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 rounded-md border border-border/50 bg-card p-2 text-[9px]"
              >
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-attention-amber" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{t.trigger}</p>
                  <p className="mt-0.5 text-signal-indigo">
                    Escalates to: {t.to}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{t.effect}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works Toggle */}
        <div className="overflow-hidden rounded-lg border bg-accent/20">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-signal-indigo" />
              <span className="text-xs font-medium">
                How It Works — Step-by-Step Decomposition
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                showSteps && "rotate-180",
              )}
            />
          </button>

          {showSteps && (
            <div className="space-y-2.5 border-t px-3 py-3">
              {STEPS.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-indigo/10 text-[8px] font-bold text-signal-indigo">
                      {idx + 1}
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-3">
                    <p className="text-[10px] font-medium text-foreground">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
              <div className="rounded-md border border-attention-amber/30 bg-attention-amber/5 p-2">
                <p className="text-[9px] leading-relaxed text-attention-amber">
                  Critical rule: vendor matching must never silently auto-merge
                  a &quot;new&quot; vendor into an existing one on fuzzy name
                  similarity alone — a fuzzy vendor match always requires human
                  confirmation, never auto-proceeds like an exact match does.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Constraint Enforcement Badges */}
        <div role="region" aria-label="Constraint Enforcement">
          <h3 className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Deterministic Constraints Enforced
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {CONSTRAINTS.map((c) => {
              const Icon = c.icon;
              return (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1 rounded-full border border-balanced-green/20 bg-balanced-green/10 px-2 py-0.5 text-[9px] font-medium text-balanced-green"
                >
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {c.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Audit Trail Toggle */}
        <div className="overflow-hidden rounded-lg border bg-accent/20">
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5 text-signal-indigo" />
              <span className="text-xs font-medium">
                Audit Trail — Every Invoice Logged
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                showAudit && "rotate-180",
              )}
            />
          </button>

          {showAudit && (
            <div className="border-t">
              <div className="overflow-x-auto">
                <table className="w-full text-[9px]" role="table">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Invoice
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Event
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Detail
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Confidence
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {AUDIT_TRAIL.map((entry, idx) => (
                      <tr
                        key={idx}
                        className="border-b last:border-b-0 transition-colors hover:bg-accent/30"
                        role="row"
                      >
                        <td className="px-3 py-1.5 font-medium">
                          {entry.invoice}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={cn(
                              "font-mono font-semibold",
                              entry.event === "vendor"
                                ? "text-signal-indigo"
                                : entry.event === "human"
                                  ? "text-balanced-green"
                                  : entry.event === "duplicate"
                                    ? "text-attention-amber"
                                    : "text-muted-foreground",
                            )}
                          >
                            {entry.event}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground/80">
                          {entry.detail}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground/70">
                          {entry.confidence}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground/60 tabular-nums">
                          {entry.ts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t bg-muted/20 px-3 py-1.5 text-[8px] text-muted-foreground/60">
                entity: ent_2f8a1c · actor: AP Agent · source: Document Agent ·
                original agent decisions and human confirmations preserved,
                never overwritten
              </div>
            </div>
          )}
        </div>

        {/* Liveness Footer */}
        <div
          className="rounded-lg border border-dashed bg-muted/20 p-2.5"
          role="region"
          aria-label="Liveness Transparency"
        >
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
            <Sparkles className="h-3 w-3 shrink-0 text-signal-indigo" />
            <span>
              <strong className="text-muted-foreground/80">
                Layer 1 — Deterministic:
              </strong>{" "}
              extraction inheritance, PO lookup, clean duplicate check, and
              payment scheduling carry no confidence score of their own —
              extraction confidence is inherited from Document Agent, never
              regenerated.{" "}
              <strong className="text-muted-foreground/80">
                Layer 2 — Probabilistic:
              </strong>{" "}
              fuzzy vendor match (82%) and fuzzy near-duplicate (91%) carry
              labeled confidence and always require human confirmation. This
              agent never auto-merges on fuzzy name similarity alone.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
