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
  CalendarDays,
  Building2,
  ArrowRight,
  ListChecks,
  Eye,
  ShieldAlert,
  FileText,
  Send,
  Sparkles,
  TrendingUp,
  CreditCard,
  UserCheck,
  MailX,
  HandCoins,
  Clock,
  Wallet,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────

export type ArState =
  | "INVOICE_CREATED"
  | "SENT"
  | "AWAITING_PAYMENT"
  | "PAYMENT_MATCHING"
  | "RECEIPT_GENERATED"
  | "AGING_UPDATED"
  | "FULL_MATCH"
  | "PARTIAL_MATCH"
  | "OVERPAYMENT";

export type MatchKind =
  | "full"
  | "partial"
  | "overpayment"
  | "ambiguous"
  | "unmatched"
  | "donor";

export interface ArLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showDeliveryFailure?: boolean;
  showOverpayment?: boolean;
  showAmbiguousMatch?: boolean;
  showAgingUpdated?: boolean;
}

// ─── Active Stage ──────────────────────────────────────────────────────

const ACTIVE_STATE: ArState = "PAYMENT_MATCHING";

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: ArState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "INVOICE_CREATED",
    label: "INVOICE_CREATED",
    description: "Pulling customer record, applying payment terms",
    icon: FileText,
  },
  {
    id: "SENT",
    label: "SENT",
    description: "Delivered via email/portal — confirmed, never assumed",
    icon: Send,
  },
  {
    id: "AWAITING_PAYMENT",
    label: "AWAITING_PAYMENT",
    description: "Tracking against due date — days until/past due shown",
    icon: CalendarDays,
  },
  {
    id: "PAYMENT_MATCHING",
    label: "PAYMENT_MATCHING",
    description:
      "Matching incoming payment to open invoice(s) — confidence + basis",
    icon: HandCoins,
  },
  {
    id: "RECEIPT_GENERATED",
    label: "RECEIPT_GENERATED",
    description: "Receipt reflects exact amount received, never invoice total",
    icon: Receipt,
  },
  {
    id: "AGING_UPDATED",
    label: "AGING_UPDATED",
    description: "Recalculating aging bucket (current/30/60/90+) — live",
    icon: TrendingUp,
  },
];

const MATCH_OUTCOMES: ArState[] = [
  "FULL_MATCH",
  "PARTIAL_MATCH",
  "OVERPAYMENT",
];

const PAYMENT_MATCHES: Array<{
  kind: MatchKind;
  label: string;
  basis: string;
  badge?: string;
  confidence?: number;
  detail: string;
  active?: boolean;
}> = [
  {
    kind: "full",
    label: "Full match: GMD 500.00 ↔ INV-2201",
    basis: "amount + reference exactly match",
    badge: "100% · by definition",
    detail:
      "Matched GMD 500.00 payment to Invoice #INV-2201 — amount and reference exactly match. Closes the invoice in full.",
  },
  {
    kind: "partial",
    label: "Partial payment: GMD 300.00 of GMD 500.00 received",
    basis: "amount + reference match",
    badge: "GMD 200.00 remains outstanding",
    active: true,
    detail:
      "Payment of GMD 300.00 received against Invoice #INV-2205 (GMD 500.00 total) — recorded as partial, GMD 200.00 remains outstanding. Never rounded to a full payment.",
  },
  {
    kind: "overpayment",
    label: "Overpayment: GMD 550.00 received against GMD 500.00",
    basis: "amount + reference match",
    badge: "GMD 50.00 credit balance — pending instruction",
    detail:
      "GMD 550.00 received against GMD 500.00 invoice — GMD 50.00 flagged as credit balance, pending instruction. Apply to next invoice or refund?",
  },
  {
    kind: "ambiguous",
    label: "Ambiguous: two open invoices match GMD 500.00 exactly",
    basis: "amount-only match — INV-2205 & INV-2207",
    confidence: 0.54,
    detail:
      "Payment of GMD 500.00 matches two open invoices for this customer exactly. Never auto-picks one — flagged for confirmation which invoice to apply. Blocking.",
  },
  {
    kind: "unmatched",
    label: "Unmatched: GMD 750.00 payment — no open invoice matches",
    basis: "no open invoice matches amount + reference",
    detail:
      "No open invoice matches this payment — routed to Reconciliation Agent buckets with reason. Non-blocking to other invoices.",
  },
  {
    kind: "donor",
    label: "Donor tranche: GMD 50,000.00 matched to INV-2301",
    basis: "donor schedule + reference match",
    detail:
      "Donor tranche (Gambia Relief Fund) matched per schedule — reported to Reporting Agent for donor-format reports.",
  },
];

const TIMELINE = [
  { label: "Created", date: "Jul 1, 2026" },
  {
    label: "Sent",
    date: "Jul 2, 2026",
    note: "delivered to accounts@kairaba.gm",
  },
  { label: "Viewed", date: "Jul 5, 2026", note: "customer portal" },
  {
    label: "Payment",
    date: "Jul 18, 2026",
    note: "GMD 300.00 partial received",
  },
  { label: "Due", date: "Jul 31, 2026", note: "13 days until due" },
];

const AGING_BUCKETS = [
  {
    bucket: "Current",
    amount: "GMD 200.00",
    detail: "INV-2205 · recalculated live: GMD 500.00 → GMD 200.00 outstanding",
  },
  { bucket: "30 days", amount: "GMD 480.00", detail: "INV-2172" },
  { bucket: "60 days", amount: "GMD 1,250.00", detail: "INV-2140" },
  { bucket: "90+ days", amount: "GMD 800.00", detail: "INV-2099" },
];

const ESCALATION_TRIGGERS = [
  {
    trigger: "Payment can't be matched to any open invoice",
    to: "Reconciliation Agent bucket / human",
    effect: "Shown as unmatched with reason. Non-blocking to other invoices.",
  },
  {
    trigger: "Overpayment",
    to: "Controller Agent / human",
    effect:
      "GMD 50.00 credit — apply to next invoice or refund? Blocking on that credit only.",
  },
  {
    trigger: "Invoice significantly overdue (30/60/90+ threshold)",
    to: "AR Agent auto-alert, Department/Finance",
    effect: "Aging alert surfaced proactively. Non-blocking.",
  },
  {
    trigger: "Ambiguous match across multiple same-amount open invoices",
    to: "human confirmation",
    effect: "Never auto-picks one — flagged for confirmation. Blocking.",
  },
];

const STEPS = [
  {
    title: "Pull Customer + Terms",
    detail:
      "Input: customer_id, payment terms. Output: customer_id, payment terms, currency. No confidence score — deterministic lookup.",
  },
  {
    title: "Draft Invoice",
    detail:
      "Input: customer + terms. Output: line items, total, due date. No confidence score.",
  },
  {
    title: "Deliver",
    detail:
      "Input: finalized invoice. Output: delivery confirmation or failure. No confidence score. Delivery failure is flagged with retry/alternate contact — never silently marked sent.",
  },
  {
    title: "Match Incoming Payment",
    detail:
      "Input: payment amount, date, reference. Output: matched invoice_id(s), match type (full/partial/overpayment), confidence + basis. Confidence score required — especially when matching against multiple open invoices for the same customer. Never auto-picks between same-amount invoices.",
  },
  {
    title: "Generate Receipt",
    detail:
      "Input: confirmed match. Output: receipt reflecting the exact amount received — never the invoice total. No confidence score.",
  },
  {
    title: "Update Aging",
    detail:
      "Input: receipt. Output: recalculated aging bucket (current/30/60/90+). No confidence score. Aging updates live, not batch-refreshed.",
  },
];

const CONSTRAINTS = [
  { label: "Partial Never Rounded", icon: ShieldAlert },
  { label: "Exact Amount Always Shown", icon: Eye },
  { label: "Overpayment Flagged", icon: CreditCard },
  { label: "Never Auto-Picks Ambiguous", icon: UserCheck },
  { label: "Delivery Never Assumed Sent", icon: Send },
  { label: "Aging Updates Live", icon: TrendingUp },
];

const AUDIT_TRAIL = [
  {
    invoice: "INV-2205",
    event: "created",
    detail: "invoice created · line items: 3 · total GMD 500.00 · terms net30",
    confidence: "—",
    ts: "09:12:03.114",
  },
  {
    invoice: "INV-2205",
    event: "delivery",
    detail: "delivered to accounts@kairaba.gm · delivery confirmed",
    confidence: "—",
    ts: "09:12:04.001",
  },
  {
    invoice: "INV-2205",
    event: "match",
    detail:
      "match attempt: GMD 300.00 · matched INV-2205 · type partial · basis: amount + reference",
    confidence: "100%",
    ts: "09:41:22.431",
  },
  {
    invoice: "INV-2205",
    event: "receipt",
    detail:
      "receipt #RCP-2026-0881 · GMD 300.00 (exact amount received, not invoice total)",
    confidence: "—",
    ts: "09:41:22.880",
  },
  {
    invoice: "INV-2205",
    event: "aging",
    detail: "aging recalculated: GMD 500.00 → GMD 200.00 outstanding · current",
    confidence: "—",
    ts: "09:41:23.102",
  },
  {
    invoice: "INV-2205",
    event: "human",
    detail:
      "confirmed by human: partial payment accepted · A. Jammeh (Controller)",
    confidence: "—",
    ts: "09:52:00.410",
  },
  {
    invoice: "INV-2188",
    event: "match",
    detail:
      "match attempt: GMD 750.00 · no match · routed to Reconciliation Agent buckets",
    confidence: "—",
    ts: "10:02:11.556",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateColor(state: ArState): string {
  switch (state) {
    case "FULL_MATCH":
      return "text-balanced-green";
    case "PARTIAL_MATCH":
    case "OVERPAYMENT":
      return "text-attention-amber";
    case "AGING_UPDATED":
      return "text-balanced-green";
    default:
      return "text-signal-indigo";
  }
}

function getStateBg(state: ArState): string {
  switch (state) {
    case "FULL_MATCH":
      return "bg-balanced-green/5 border-balanced-green/20";
    case "PARTIAL_MATCH":
    case "OVERPAYMENT":
      return "bg-attention-amber/5 border-attention-amber/20";
    case "AGING_UPDATED":
      return "bg-balanced-green/5 border-balanced-green/20";
    default:
      return "bg-signal-indigo/5 border-signal-indigo/20";
  }
}

function getMatchColor(kind: MatchKind): string {
  switch (kind) {
    case "full":
      return "text-balanced-green";
    case "partial":
    case "overpayment":
    case "ambiguous":
      return "text-attention-amber";
    case "unmatched":
      return "text-error-clay";
    case "donor":
      return "text-signal-indigo";
  }
}

function getMatchBg(kind: MatchKind): string {
  switch (kind) {
    case "full":
      return "bg-balanced-green/10";
    case "partial":
    case "overpayment":
    case "ambiguous":
      return "bg-attention-amber/10";
    case "unmatched":
      return "bg-error-clay/10";
    case "donor":
      return "bg-signal-indigo/10";
  }
}

function getMatchRowBg(kind: MatchKind): string {
  switch (kind) {
    case "full":
      return "border-balanced-green/25 bg-balanced-green/5";
    case "partial":
    case "overpayment":
    case "ambiguous":
      return "border-attention-amber/25 bg-attention-amber/5";
    case "unmatched":
      return "border-error-clay/25 bg-error-clay/5";
    case "donor":
      return "border-signal-indigo/25 bg-signal-indigo/5";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function StateBadge({ state }: { state: ArState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold",
        getStateColor(state),
        getStateBg(state),
      )}
    >
      {state === "FULL_MATCH" && (
        <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
      )}
      {state === "PARTIAL_MATCH" && (
        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
      )}
      {state === "OVERPAYMENT" && (
        <CreditCard className="h-2.5 w-2.5 shrink-0" />
      )}
      {state}
    </span>
  );
}

function MatchIcon({ kind }: { kind: MatchKind }) {
  switch (kind) {
    case "full":
      return <CheckCircle2 className="h-3 w-3" />;
    case "partial":
    case "overpayment":
    case "ambiguous":
      return <AlertTriangle className="h-3 w-3" />;
    case "unmatched":
      return <MailX className="h-3 w-3" />;
    case "donor":
      return <HandCoins className="h-3 w-3" />;
  }
}

function MatchRow({ row }: { row: (typeof PAYMENT_MATCHES)[number] }) {
  return (
    <div
      data-match-kind={row.kind}
      data-active={row.active ? "true" : undefined}
      className={cn(
        "rounded-lg border p-2.5 transition-all",
        getMatchRowBg(row.kind),
        row.active && "border-attention-amber/40 shadow-sm",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
            getMatchBg(row.kind),
            getMatchColor(row.kind),
          )}
        >
          <MatchIcon kind={row.kind} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium text-foreground">
              {row.label}
            </span>
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-[8px] font-semibold",
                getMatchRowBg(row.kind),
                getMatchColor(row.kind),
              )}
            >
              {row.basis}
            </span>
            {row.kind === "ambiguous" && row.confidence !== undefined ? (
              <span
                role="meter"
                aria-label={`Ambiguous match confidence ${Math.round(
                  row.confidence * 100,
                )}%`}
                aria-valuenow={Math.round(row.confidence * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="shrink-0 rounded-full border border-attention-amber/30 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-bold text-attention-amber"
              >
                {Math.round(row.confidence * 100)}%
              </span>
            ) : row.badge ? (
              <span
                className={cn(
                  "shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-bold",
                  row.kind === "full"
                    ? "border-balanced-green/20 bg-balanced-green/5 text-balanced-green"
                    : row.kind === "partial"
                      ? "border-attention-amber/30 bg-attention-amber/10 text-attention-amber"
                      : row.kind === "overpayment"
                        ? "border-attention-amber/30 bg-attention-amber/10 text-attention-amber"
                        : "border-border/50 bg-card text-muted-foreground/70",
                )}
              >
                {row.badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
            {row.detail}
          </p>
          {row.active && (
            <p className="mt-1 text-[9px] font-semibold text-attention-amber">
              Active outcome — exact received amount and exact remaining balance
              always shown. No rounding, no &quot;close enough.&quot;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function ArLiveness({
  className,
  showEmptyState = false,
  showDeliveryFailure = false,
  showOverpayment = false,
  showAmbiguousMatch = false,
  showAgingUpdated = false,
}: ArLivenessProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const header = (
    <div className="border-b bg-gradient-to-r from-accent/50 to-transparent px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
          <Receipt className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">AR Agent</h2>
          <p className="text-[10px] text-muted-foreground">
            Accounts Receivable — Invoice-to-Cash
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
            No invoice awaiting payment
          </p>
          <p className="mx-auto mt-1 max-w-md text-[10px] text-muted-foreground/60">
            The AR Agent is idle — waiting for an invoice to be created or for
            an incoming payment to arrive from Reconciliation Agent / Mobile
            Money Agent. Matching, receipts, and aging updates appear here the
            moment a payment is detected.
          </p>
        </div>
      </div>
    );
  }

  // ── Delivery Failure State ────────────────────────────────────────
  if (showDeliveryFailure) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {header}

        {/* Needs Attention Strip */}
        <div className="border-b-2 border-error-clay/30 bg-error-clay/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-error-clay/10">
              <MailX className="h-4 w-4 text-error-clay" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-error-clay">
                  Delivery Failed
                </span>
                <span className="rounded-full border border-error-clay/20 bg-error-clay/10 px-1.5 py-0.5 text-[8px] font-medium text-error-clay">
                  SENT — DELIVERY FAILURE
                </span>
              </div>
              <p className="mt-1 text-[10px] text-foreground">
                Invoice #INV-2209 could not be delivered to billing@westlink.gm
                — email bounced. Retry or use alternate contact — never silently
                marked as sent.
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5 text-error-clay/60" />
                <span className="text-[9px] font-medium text-error-clay/80">
                  Flagged for retry or alternate contact — never assumed sent
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div role="region" aria-label="Flagged Delivery">
            <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Flagged Delivery
            </h3>
            <div className="rounded-lg border border-error-clay/20 bg-error-clay/5 p-3">
              <p className="text-[10px] font-medium text-error-clay">
                Email bounce — no delivery confirmation. No confidence score
                (deterministic failure).
              </p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                Delivery failure is flagged and offered for retry or an
                alternate contact — the invoice is never silently marked
                &quot;sent.&quot;
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
                  Blocking rule:
                </strong>{" "}
                a delivery failure is never silently treated as a successful
                send — the invoice parks in a flagged state with retry or
                alternate contact offered.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Overpayment Credit State ──────────────────────────────────────
  if (showOverpayment) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {header}

        {/* Attention Strip */}
        <div className="border-b-2 border-attention-amber/30 bg-attention-amber/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-attention-amber/10">
              <CreditCard className="h-4 w-4 text-attention-amber" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-attention-amber">
                  Overpayment — GMD 50.00 Credit
                </span>
                <span className="rounded-full border border-attention-amber/20 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-medium text-attention-amber">
                  OVERPAYMENT
                </span>
              </div>
              <p className="mt-1 text-[10px] text-foreground">
                GMD 550.00 received against GMD 500.00 invoice INV-2208 — GMD
                50.00 flagged as credit balance, pending instruction. Apply to
                next invoice or refund? Blocking on that credit only.
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5 text-attention-amber/60" />
                <span className="text-[9px] font-medium text-attention-amber/80">
                  Escalated to Controller Agent / human — pending instruction
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div role="region" aria-label="Credit Balance">
            <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Credit Balance
            </h3>
            <div className="rounded-lg border border-attention-amber/20 bg-attention-amber/5 p-3">
              <p className="text-[10px] font-medium text-attention-amber">
                GMD 50.00 credit balance — pending instruction
              </p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                The overpayment is never silently folded into a full payment or
                silently refunded — it waits for instruction: apply to next
                invoice or refund. Blocking on that credit only; other invoices
                continue.
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
                  Credit rule:
                </strong>{" "}
                overpayments are flagged as a credit balance pending instruction
                — never silently applied, never silently refunded. Blocking on
                that credit only.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Ambiguous Match State ─────────────────────────────────────────
  if (showAmbiguousMatch) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {header}

        {/* Attention Strip */}
        <div className="border-b-2 border-attention-amber/30 bg-attention-amber/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-attention-amber/10">
              <UserCheck className="h-4 w-4 text-attention-amber" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-attention-amber">
                  Ambiguous Match
                </span>
                <span className="rounded-full border border-attention-amber/20 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-medium text-attention-amber">
                  NEVER AUTO-PICKS
                </span>
              </div>
              <p className="mt-1 text-[10px] text-foreground">
                Payment of GMD 500.00 matches two open invoices for this
                customer exactly — INV-2205 and INV-2207. Never auto-picks one —
                flagged for human confirmation which invoice to apply. Blocking.
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5 text-attention-amber/60" />
                <span className="text-[9px] font-medium text-attention-amber/80">
                  Awaiting confirmation — which invoice does this payment apply
                  to?
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div role="region" aria-label="Candidate Invoices">
            <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Candidate Invoices
            </h3>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-accent/20 p-2.5">
                <p className="text-[10px] font-medium">INV-2205 · GMD 500.00</p>
                <p className="mt-0.5 text-[8px] text-muted-foreground/70">
                  open · issued Jul 1, 2026
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-accent/20 p-2.5">
                <p className="text-[10px] font-medium">INV-2207 · GMD 500.00</p>
                <p className="mt-0.5 text-[8px] text-muted-foreground/70">
                  open · issued Jul 10, 2026
                </p>
              </div>
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
                  Ambiguity rule:
                </strong>{" "}
                an ambiguous match across multiple same-amount open invoices is
                never auto-picked — it is flagged for human confirmation which
                invoice to apply. Blocking.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Terminal AGING_UPDATED State ─────────────────────────────────
  if (showAgingUpdated) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-accent/50 via-accent/30 to-transparent px-4 py-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">AR Agent</h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:border-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    AGING_UPDATED
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Accounts Receivable — Invoice-to-Cash
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Terminal summary */}
        <div className="space-y-3 p-4" role="region" aria-label="Agent Status">
          <div className="rounded-lg border border-balanced-green/25 bg-balanced-green/5 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-balanced-green" />
              <p className="text-xs font-semibold text-balanced-green">
                Invoice fully resolved — aging updated
              </p>
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">
              Invoice INV-2201 · Kairaba Trading Ltd · GMD 500.00 paid in full —
              receipt #RCP-2026-0880 issued, aging bucket recalculated: GMD
              500.00 → GMD 0.00 outstanding. Terminal for AR Agent&apos;s scope
              until the next payment arrives.
            </p>
            <div className="mt-2 flex items-center gap-1 text-[9px]">
              <ArrowRight className="h-2.5 w-2.5 text-balanced-green/60" />
              <span className="font-medium text-balanced-green/80">
                Ledger Agent — posting follows receipt confirmation
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
                every invoice&apos;s creation, delivery, payment match attempts
                (matched and unmatched), receipt, and aging changes are logged —
                original agent decisions and human confirmations both preserved,
                never overwritten.
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">AR Agent</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:border-emerald-800">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Partial never rounded
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Accounts Receivable — Invoice-to-Cash
              </p>
            </div>
          </div>

          {/* Invoice attribution */}
          <div className="hidden text-right sm:block">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Invoice
            </p>
            <p className="text-xs font-medium">INV-2205</p>
            <p className="text-[9px] text-muted-foreground/60">
              Kairaba Trading Ltd · GMD
            </p>
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
                PAYMENT_MATCHING
              </span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Invoice
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Receipt className="h-3 w-3 text-signal-indigo" />
              <span className="font-mono text-xs font-medium">INV-2205</span>
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
              <Wallet className="h-3 w-3 text-signal-indigo" />
              <span className="font-mono text-xs font-medium">
                Reconciliation / Mobile Money
              </span>
            </div>
          </div>
        </div>

        {/* Payment received banner */}
        <div
          className="rounded-lg border border-border/60 bg-accent/20 p-2.5"
          data-step="received"
        >
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Incoming Payment Detected
          </p>
          <p className="mt-0.5 text-[10px] text-foreground">
            Payment of GMD 300.00 detected from Mobile Money Agent — matching
            against open invoices for Kairaba Trading Ltd.
          </p>
          <p className="mt-0.5 text-[8px] text-muted-foreground/60">
            Match result shows the exact received amount and exact remaining
            balance — never a silent &quot;close enough.&quot;
          </p>
        </div>

        {/* Cross-Agent Handoff */}
        <div className="rounded-lg border bg-accent/20 p-2.5">
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Cross-Agent Handoff Chain
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="font-medium">Reconciliation Agent</span>
            <span className="text-muted-foreground/60">|</span>
            <span className="font-medium">Mobile Money Agent</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-medium">AR Agent</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-medium">Ledger Agent</span>
            <span className="ml-1 text-muted-foreground/70">
              — donor payment tracking additionally flows to Reporting Agent for
              donor-format reports
            </span>
          </div>
        </div>

        {/* Invoice Timeline */}
        <div role="region" aria-label="Invoice Timeline">
          <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Invoice Timeline — INV-2205
          </h3>
          <div className="space-y-1">
            {TIMELINE.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[10px]">
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                    idx < TIMELINE.length - 1
                      ? "bg-balanced-green/10 text-balanced-green"
                      : "bg-attention-amber/10 text-attention-amber",
                  )}
                >
                  {idx < TIMELINE.length - 1 ? (
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  ) : (
                    <Clock className="h-2.5 w-2.5" />
                  )}
                </span>
                <span className="font-medium text-foreground">
                  {t.label} — {t.date}
                </span>
                {t.note && (
                  <span className="text-muted-foreground/70">· {t.note}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* State Machine Pipeline */}
        <div role="region" aria-label="AR State Machine">
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

          {/* Match outcome branch */}
          <div className="mt-1.5 flex items-start gap-3 rounded-lg border border-border/60 bg-accent/20 p-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal-indigo/10 text-signal-indigo">
              <ArrowRight className="h-3 w-3" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[8px] text-muted-foreground/70">
                <span>
                  match outcome — exact outcome recorded, never rounds a partial
                  into a full
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {MATCH_OUTCOMES.map((outcome) => (
                  <StateBadge key={outcome} state={outcome} />
                ))}
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-attention-amber" />
              </div>
              <p className="mt-0.5 text-[8px] text-muted-foreground/60">
                Partial payments are shown distinctly from full matches — exact
                received amount and exact remaining balance, every time.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Matching */}
        <div role="region" aria-label="Payment Matching">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Matching — Confidence + Basis Always Shown
            </h3>
            <span className="text-[8px] text-muted-foreground/60">
              full/partial/overpayment = deterministic · ambiguous = labeled
            </span>
          </div>
          <div className="space-y-1.5">
            {PAYMENT_MATCHES.map((row) => (
              <MatchRow key={row.kind} row={row} />
            ))}
          </div>

          {/* Critical rule callout */}
          <div className="mt-2 rounded-md border border-attention-amber/30 bg-attention-amber/5 p-2">
            <p className="text-[9px] leading-relaxed text-attention-amber">
              Critical rule: a partial payment is never silently treated as
              closing the invoice. The exact received amount and the exact
              remaining balance are shown every time — no rounding, no
              &quot;close enough.&quot;
            </p>
          </div>
        </div>

        {/* Aging Report */}
        <div role="region" aria-label="Aging Report">
          <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Aging Report — Updates Live, Not Batch-Refreshed
          </h3>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {AGING_BUCKETS.map((b) => (
              <div
                key={b.bucket}
                className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-accent/20 p-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-foreground">
                    {b.bucket}
                  </p>
                  <p className="mt-0.5 text-[8px] text-muted-foreground/70">
                    {b.detail}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs font-semibold text-foreground">
                  {b.amount}
                </span>
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
                  Critical rule: a partial payment must never be silently
                  treated as closing the invoice. The exact received amount and
                  the exact remaining balance are shown every time — no
                  rounding, no &quot;close enough.&quot;
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
                Audit Trail — Every Event Logged
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
                              entry.event === "match"
                                ? "text-signal-indigo"
                                : entry.event === "human"
                                  ? "text-balanced-green"
                                  : entry.event === "delivery"
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
                entity: ent_2f8a1c · actor: AR Agent · source: Reconciliation
                Agent / Mobile Money Agent · every payment match attempt logged
                (matched and unmatched) · human confirmations preserved, never
                overwritten
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
              customer pull, invoice drafting, delivery, receipt generation, and
              aging recalculation carry no confidence score of their own. The
              receipt reflects the exact amount received, never the invoice
              total.{" "}
              <strong className="text-muted-foreground/80">
                Layer 2 — Probabilistic:
              </strong>{" "}
              payment matching carries a confidence score — especially across
              multiple open invoices for the same customer. Ambiguous
              same-amount matches never auto-pick; they are flagged for human
              confirmation.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
