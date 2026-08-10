"use client";

import React from "react";
import { useState } from "react";
import {
  Database,
  UserPlus,
  Building2,
  PlugZap,
  History,
  BookOpen,
  Sparkles,
  Landmark,
  Smartphone,
  FileText,
  Activity,
  CheckCircle2,
  Clock,
  ChevronDown,
  ListChecks,
  ArrowRight,
  AlertTriangle,
  Lock,
  Route,
  Share2,
  ShieldCheck,
  ClipboardCheck,
  Timer,
  GitCompareArrows,
  Eye,
} from "lucide-react";

import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type OnboardingState =
  | "SIGNUP"
  | "ENTITY_SETUP"
  | "DATA_SOURCE_CONNECTING"
  | "HISTORICAL_PULL_RUNNING"
  | "CHART_OF_ACCOUNTS_PROPOSED"
  | "FIRST_LOOK_DELIVERED";

export interface StateTransition {
  state: string;
  timestamp: string;
  detail: string;
}

export type OnboardingSourceType =
  | "brand_new"
  | "professional_software"
  | "manual_records"
  | "statements_only"
  | "no_records";

export const SOURCE_TYPE_LABELS: Record<OnboardingSourceType, string> = {
  brand_new: "Brand-new business",
  professional_software: "Professional accounting software",
  manual_records: "Manual records",
  statements_only: "Statements only",
  no_records: "No records",
};

// Mirrors getFirstMessage() in packages/agents/core/onboarding-pipeline.ts —
// keep the copy in sync when either surface changes. B/C/D carry the
// summary form (demo totals below match the pipeline's summary contract).
const FIRST_MESSAGE: Record<OnboardingSourceType, string> = {
  brand_new:
    "You're starting with a clean slate — no history to sort through. I'll track everything from here. Let's set up your chart of accounts.",
  no_records:
    "I don't have any records or statements to reconstruct your history from. I can start tracking from today with an opening balance you confirm — cash on hand, any money owed to you, and anything you owe — and we'll build accurate books from this point forward.",
  professional_software:
    "I've reviewed your records from your accounting software. Here's what I found: 5,963 transactions categorized across 12 months, 337 flagged for your review.",
  manual_records:
    "I've reviewed your records. Here's what I found: 5,963 transactions categorized across 12 months, 337 flagged for your review.",
  statements_only:
    "I've reviewed your bank and mobile money statements. Here's what I found: 5,963 transactions categorized across 12 months, 337 flagged for your review.",
};

export interface OnboardingLivenessProps {
  className?: string;
  sourceType?: OnboardingSourceType;
  showEmptyState?: boolean;
  showPermissionRequested?: boolean;
  showFallbackOffered?: boolean;
  showLowConfidenceBatch?: boolean;
  showCoaEdits?: boolean;
  showFirstLookDelivered?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: OnboardingState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "SIGNUP",
    label: "SIGNUP",
    description:
      "User completes signup — creating the organization/entity shell",
    icon: UserPlus,
  },
  {
    id: "ENTITY_SETUP",
    label: "ENTITY_SETUP",
    description: "Recording business basics — standard setup form",
    icon: Building2,
  },
  {
    id: "DATA_SOURCE_CONNECTING",
    label: "DATA_SOURCE_CONNECTING",
    description:
      "Awaiting connection — bank API, mobile money, QBO/Xero, or Excel upload",
    icon: PlugZap,
  },
  {
    id: "HISTORICAL_PULL_RUNNING",
    label: "HISTORICAL_PULL_RUNNING",
    description:
      "Document Agent / Reconciliation Agent processing historical transactions month by month — one period at a time",
    icon: History,
  },
  {
    id: "CHART_OF_ACCOUNTS_PROPOSED",
    label: "CHART_OF_ACCOUNTS_PROPOSED",
    description:
      "Proposing a chart of accounts based on business type and country — shown for review, never silently applied",
    icon: BookOpen,
  },
  {
    id: "FIRST_LOOK_DELIVERED",
    label: "FIRST_LOOK_DELIVERED",
    description:
      "CFO Agent reviews everything processed so far — a first message citing specifics, never generic",
    icon: Sparkles,
  },
];

const CONNECTIONS: Array<{
  type: string;
  status: "connected" | "processing";
  detail: string;
  icon: React.ElementType;
}> = [
  {
    type: "Bank account",
    status: "connected",
    detail: "Connected — 5,963 transactions pulled",
    icon: Landmark,
  },
  {
    type: "Mobile money",
    status: "connected",
    detail: "Connected — 214 transactions pulled",
    icon: Smartphone,
  },
  {
    type: "Bank statement upload",
    status: "processing",
    detail: "Bank statement uploaded. Processing 847 transactions...",
    icon: FileText,
  },
];

const HISTORICAL_PERIODS: Array<{
  period: string;
  found: number;
  categorized: number;
  flagged: number;
  status: "done" | "active" | "pending";
}> = [
  {
    period: "August 2025",
    found: 634,
    categorized: 598,
    flagged: 36,
    status: "done",
  },
  {
    period: "September 2025",
    found: 712,
    categorized: 671,
    flagged: 41,
    status: "done",
  },
  {
    period: "October 2025",
    found: 683,
    categorized: 640,
    flagged: 43,
    status: "done",
  },
  {
    period: "November 2025",
    found: 745,
    categorized: 702,
    flagged: 43,
    status: "done",
  },
  {
    period: "December 2025",
    found: 821,
    categorized: 776,
    flagged: 45,
    status: "done",
  },
  {
    period: "January 2026",
    found: 798,
    categorized: 754,
    flagged: 44,
    status: "done",
  },
  {
    period: "February 2026",
    found: 767,
    categorized: 723,
    flagged: 44,
    status: "done",
  },
  {
    period: "March 2026",
    found: 803,
    categorized: 762,
    flagged: 41,
    status: "done",
  },
  {
    period: "April 2026",
    found: 847,
    categorized: 812,
    flagged: 35,
    status: "active",
  },
  {
    period: "May 2026",
    found: 0,
    categorized: 0,
    flagged: 0,
    status: "pending",
  },
  {
    period: "June 2026",
    found: 0,
    categorized: 0,
    flagged: 0,
    status: "pending",
  },
  {
    period: "July 2026",
    found: 0,
    categorized: 0,
    flagged: 0,
    status: "pending",
  },
];

const COA_ACCOUNTS: Array<{ code: string; name: string; type: string }> = [
  { code: "1000", name: "Cash at Bank", type: "asset" },
  { code: "1100", name: "Petty Cash", type: "asset" },
  { code: "2000", name: "Accounts Payable", type: "liability" },
  { code: "3000", name: "Owner's Equity", type: "equity" },
  { code: "4000", name: "Sales Revenue", type: "revenue" },
  { code: "5000", name: "Cost of Goods Sold", type: "expense" },
  { code: "5010", name: "Office Supplies", type: "expense" },
];

const AUDIT_TRAIL: StateTransition[] = [
  {
    state: "DATA_SOURCE_CONNECTING",
    timestamp: "09:41:03.112",
    detail: "connection: bank API connected — 5,963 records pulled",
  },
  {
    state: "DATA_SOURCE_CONNECTING",
    timestamp: "09:41:44.556",
    detail:
      "connection: mobile money connected — MTN MoMo + Orange Money, 214 records pulled",
  },
  {
    state: "DATA_SOURCE_CONNECTING",
    timestamp: "09:42:10.904",
    detail: "connection: bank statement uploaded — processing 847 transactions",
  },
  {
    state: "HISTORICAL_PULL_RUNNING",
    timestamp: "09:43:02.441",
    detail: "period: August 2025 — 634 found, 598 categorized, 36 flagged",
  },
  {
    state: "HISTORICAL_PULL_RUNNING",
    timestamp: "09:52:41.203",
    detail: "period: March 2026 — 803 found, 762 categorized, 41 flagged",
  },
  {
    state: "HISTORICAL_PULL_RUNNING",
    timestamp: "09:53:17.880",
    detail: "period: April 2026 — processing, 847 found so far",
  },
  {
    state: "CHART_OF_ACCOUNTS_PROPOSED",
    timestamp: "10:05:11.773",
    detail:
      "coa proposal: standard chart for Trading/Retail in Gambia (GM) — 28 accounts, basis cited",
  },
  {
    state: "FIRST_LOOK_DELIVERED",
    timestamp: "10:05:12.001",
    detail:
      "first message basis: 5,963 categorized, 337 flagged, 2 vendors matched",
  },
];

const STEPS = [
  {
    title: "Detect Connection Type & Pull Data",
    detail:
      "Input: connection (bank API, bank PDF, mobile money, QBO/Xero, or Excel upload). Output: raw data stream. No confidence score — structural.",
  },
  {
    title: "Process Each Historical Period Sequentially",
    detail:
      "Output: per-period transaction count + categorization result. Must show real per-period progress — never a single aggregate spinner covering the whole history at once.",
  },
  {
    title: "Categorize Each Transaction",
    detail:
      "Inherits Document Agent/AP Agent/Expense Agent per-transaction confidence. Onboarding does not re-derive this — it surfaces it live.",
  },
  {
    title: "Propose Chart of Accounts",
    detail:
      "Output: proposed structure with basis shown (standard chart for [business type] in [country]). Confidence score if judgment-based on business description.",
  },
  {
    title: "Draft CFO Agent's First Message",
    detail:
      "Must cite specifics from what was actually processed (transaction counts, flagged items) — never a generic welcome message.",
  },
];

const CONSTRAINTS = [
  { label: "Per-Period Progress Is Real", icon: Database },
  { label: "Categorization Inherited, Never Re-Derived", icon: Share2 },
  { label: "COA Proposed, Never Silently Applied", icon: BookOpen },
  { label: "No Dead Ends — Alternative Path Shown", icon: Route },
  { label: "Permission Gate for >12 Months", icon: Lock },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateColor(state: OnboardingState): string {
  switch (state) {
    case "SIGNUP":
      return "text-muted-foreground/70";
    case "ENTITY_SETUP":
      return "text-muted-foreground/70";
    case "DATA_SOURCE_CONNECTING":
      return "text-signal-indigo";
    case "HISTORICAL_PULL_RUNNING":
      return "text-attention-amber";
    case "CHART_OF_ACCOUNTS_PROPOSED":
      return "text-signal-indigo";
    case "FIRST_LOOK_DELIVERED":
      return "text-balanced-green";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function LayerTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
      Layer 1 — {label}
    </span>
  );
}

function BranchCard({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: React.ElementType;
  title: string;
  tone: "amber" | "red" | "green" | "indigo";
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "amber"
      ? "border-attention-amber/30 bg-attention-amber/5"
      : tone === "red"
        ? "border-error-clay/30 bg-error-clay/5"
        : tone === "green"
          ? "border-balanced-green/30 bg-balanced-green/5"
          : "border-signal-indigo/30 bg-signal-indigo/5";
  const iconClasses =
    tone === "amber"
      ? "bg-attention-amber/10 text-attention-amber"
      : tone === "red"
        ? "bg-error-clay/10 text-error-clay"
        : tone === "green"
          ? "bg-balanced-green/10 text-balanced-green"
          : "bg-signal-indigo/10 text-signal-indigo";
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

export function OnboardingLiveness({
  className,
  sourceType,
  showEmptyState,
  showPermissionRequested,
  showFallbackOffered,
  showLowConfidenceBatch,
  showCoaEdits,
  showFirstLookDelivered,
}: OnboardingLivenessProps) {
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  // ── Empty state ──────────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card p-6", className)}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Database className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No onboarding in progress</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Onboarding is the first-value moment — watching transactions appear,
            categorized, in real time. Nothing to show right now.
          </p>
        </div>
      </div>
    );
  }

  // ── Branch: Category A — brand-new business (clean slate, no pull) ───
  // Spec §7.4: categories with nothing to reconstruct never show pull UI —
  // a progress bar here would imply fabricated work.
  if (sourceType === "brand_new") {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">
                  Onboarding — Clean Slate
                </h2>
                <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
                  Category A — brand-new business
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                No history to reconstruct — your books start from today. Nothing
                is sorted, pulled, or estimated.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[10px] font-semibold text-balanced-green">
            <CheckCircle2 className="h-3 w-3" />
            Clean slate — no historical pull
          </span>
        </div>

        <BranchCard
          icon={Sparkles}
          title="Nothing to reconstruct — by design, not by omission"
          tone="green"
        >
          <p>
            You told us this is a brand-new business. There is no history to
            pull, no statements to process, and no records to sort through — so
            we are not showing a progress bar that would imply work that never
            happened. Your chart of accounts is being prepared for review, and
            your CFO Agent will track everything from here.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <ShieldCheck className="h-3 w-3 text-balanced-green" />
            No fabricated progress — per spec §7.4, categories with nothing to
            reconstruct never render pull UI.
          </div>
        </BranchCard>

        {/* First Look Preview */}
        <section
          aria-label="First Look Preview"
          className="rounded-xl border bg-card p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              First Look Preview
            </h3>
            <LayerTag label="CFO Agent synthesis" />
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-balanced-green" />
            <p className="text-[10px] text-muted-foreground">
              {FIRST_MESSAGE.brand_new}
            </p>
          </div>
        </section>
      </div>
    );
  }

  // ── Branch: Category E — no records (opening balance confirmation) ───
  // Spec §7.4: no reconstruction happens — books start from today with an
  // owner-confirmed opening balance, so no pull UI renders.
  if (sourceType === "no_records") {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Landmark className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">
                  Onboarding — Opening Balance
                </h2>
                <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
                  Category E — no records
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Nothing to reconstruct from — tracking begins today at your
                confirmed opening balance.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-attention-amber/10 px-2 py-0.5 text-[10px] font-semibold text-attention-amber">
            <CheckCircle2 className="h-3 w-3" />
            Opening balance confirmed
          </span>
        </div>

        <BranchCard
          icon={Landmark}
          title="Books start from today — with the balance you confirmed"
          tone="indigo"
        >
          <p>
            With no records or statements, there is nothing to reconstruct — and
            we won&apos;t pretend otherwise. Tracking begins now from the
            opening balance you confirmed: cash on hand, money owed to you, and
            anything you owe. If you chose &quot;I don&apos;t know yet&quot;,
            the balance starts at zero and is flagged for your CFO Agent to
            reconcile with you later.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <ClipboardCheck className="h-3 w-3 text-signal-indigo" />
            Opening balance source is always recorded — owner-confirmed, never
            assumed.
          </div>
        </BranchCard>

        {/* First Look Preview */}
        <section
          aria-label="First Look Preview"
          className="rounded-xl border bg-card p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              First Look Preview
            </h3>
            <LayerTag label="CFO Agent synthesis" />
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-balanced-green" />
            <p className="text-[10px] text-muted-foreground">
              {FIRST_MESSAGE.no_records}
            </p>
          </div>
        </section>
      </div>
    );
  }

  // ── Branch: History beyond 12 months (Spec §6) — blocking ────────────
  if (showPermissionRequested) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <Lock className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                History Beyond 12 Months Detected
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §6 — permission requested before the pull begins (per PRD
                §13)
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Blocking until permission is given
          </span>
        </div>
        <BranchCard
          icon={Lock}
          title="Permission requested before beginning — routes to Historical Data Reconstruction spec"
          tone="red"
        >
          <p>
            History beyond 12 months detected (per PRD §13). The pull cannot
            begin until permission is given — blocking until permission is
            given. Once approved, the flow routes to the Historical Data
            Reconstruction spec for the full &gt;12-month path.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Blocking until permission is given — never silently truncated to 12
            months.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Format not recognized (Spec §6/§7) — never a dead end ────
  if (showFallbackOffered) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-indigo/10">
              <FileText className="h-4 w-4 text-signal-indigo" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Bank Statement Format Not Recognized
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §6/§7 — every failure state has a named alternative path
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Non-blocking — alternative path always available
          </span>
        </div>
        <BranchCard
          icon={FileText}
          title="Manual entry offered immediately"
          tone="indigo"
        >
          <p>
            The uploaded statement format wasn&apos;t recognized. Manual entry
            offered immediately (per PRD §13) — never a dead end, never silently
            skipped, never left on a broken screen.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <Route className="h-3 w-3 text-signal-indigo" />
            Non-blocking — alternative path always available.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Low categorization confidence batch (Spec §6) ────────────
  if (showLowConfidenceBatch) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <AlertTriangle className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Low Categorization Confidence Batch
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §6 — flagged for review, never silently accepted
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Non-blocking — surfaced clearly
          </span>
        </div>
        <BranchCard
          icon={AlertTriangle}
          title="Flagged batch for review — not silently accepted"
          tone="amber"
        >
          <p>
            Many transactions in this period were categorized below the
            confidence threshold. The batch is flagged for your review rather
            than silently accepted — surfaced clearly, non-blocking to the rest
            of the pull.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <Eye className="h-3 w-3 text-attention-amber" />
            Non-blocking — surfaced clearly, never silently accepted.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: COA edited before confirming (Spec §2 fail path) ─────────
  if (showCoaEdits) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-indigo/10">
              <GitCompareArrows className="h-4 w-4 text-signal-indigo" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Chart of Accounts — Edited Before Confirming
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2 — user edits before confirming, never silently applied
              </p>
            </div>
          </div>
          <span className="rounded-full bg-signal-indigo/10 px-2 py-0.5 text-[9px] font-semibold text-signal-indigo">
            User edits
          </span>
        </div>
        <BranchCard
          icon={GitCompareArrows}
          title="4 accounts edited before confirming"
          tone="indigo"
        >
          <p>
            The proposed chart of accounts was reviewed and edited by the user
            before confirmation — 4 accounts changed from the original proposal
            (proposed → edited deltas shown). The Ledger Agent applies the
            edited structure, never the original silently.
          </p>
          <div className="grid gap-1.5">
            {[
              {
                code: "5030",
                from: "Marketing Expense",
                to: "Advertising Expense",
              },
              { code: "6010", from: "Transport", to: "Fuel & Transport" },
              {
                code: "2100",
                from: "— (not proposed)",
                to: "Tax Payable (VAT)",
              },
              {
                code: "1200",
                from: "Accounts Receivable",
                to: "Trade Receivables",
              },
            ].map((row) => (
              <div
                key={row.code}
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-[10px]"
              >
                <span className="font-mono text-muted-foreground/70">
                  {row.code}
                </span>
                <span className="line-through text-muted-foreground/50">
                  {row.from}
                </span>
                <ArrowRight className="h-3 w-3 text-signal-indigo" />
                <span className="font-medium">{row.to}</span>
              </div>
            ))}
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: First Look Delivered (terminal, Spec §2) ─────────────────
  if (showFirstLookDelivered) {
    const firstLookMessage =
      sourceType && FIRST_MESSAGE[sourceType]
        ? FIRST_MESSAGE[sourceType]
        : "I've reviewed your records. Here's what I found: 5,963 transactions categorized across 12 months, 337 flagged for your review, 2 vendors matched, cash position established. Your first look is ready — every claim traceable to what was actually processed.";
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-balanced-green/10">
              <Sparkles className="h-4 w-4 text-balanced-green" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">First Look Delivered</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2 — terminal state, CFO Agent&apos;s first message
              </p>
            </div>
          </div>
          <span className="rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
            Terminal
          </span>
        </div>
        <BranchCard
          icon={Sparkles}
          title="CFO Agent's first message — specific, never generic"
          tone="green"
        >
          <p>{firstLookMessage}</p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <ClipboardCheck className="h-3 w-3 text-balanced-green" />
            Cites specifics from what was actually processed — never a generic
            welcome message.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────

  const activeState: OnboardingState = "HISTORICAL_PULL_RUNNING";
  const doneMonths = HISTORICAL_PERIODS.filter((p) => p.status === "done");
  const runningFound = doneMonths.reduce((sum, p) => sum + p.found, 0);
  const runningCategorized = doneMonths.reduce(
    (sum, p) => sum + p.categorized,
    0,
  );
  const runningFlagged = doneMonths.reduce((sum, p) => sum + p.flagged, 0);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-600 to-indigo-600">
            <Database className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">
                Onboarding / Historical Data Pull
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                Cross-cutting first-value flow
              </span>
              {sourceType && (
                <span className="rounded-full bg-signal-indigo/10 px-2 py-0.5 text-[9px] font-semibold text-signal-indigo">
                  {SOURCE_TYPE_LABELS[sourceType]}
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              PRD §13 targets first meaningful value within 12 minutes — the
              first-value moment is watching transactions appear, categorized,
              in real time. Onboarding must visibly perform agent work at first
              impression, not look like autofill.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-attention-amber/10 px-2 py-0.5 text-[10px] font-semibold text-attention-amber">
            <Activity className="h-3 w-3 animate-pulse" />
            Historical pull running
          </span>
          <span className="text-[9px] text-muted-foreground">
            Entity: Xenboox HQ
          </span>
        </div>
      </div>

      {/* Live status */}
      <div
        role="status"
        className="flex items-center gap-2 rounded-lg border bg-accent/20 px-3 py-2 text-[10px] text-muted-foreground"
      >
        <Activity className="h-3 w-3 text-attention-amber animate-pulse" />
        Currently:{" "}
        <span className="font-semibold text-foreground">
          HISTORICAL_PULL_RUNNING
        </span>{" "}
        — Processing April 2026... 847 transactions found
      </div>

      {/* Pipeline */}
      <section
        aria-label="Onboarding State Machine"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Onboarding State Machine
          </h3>
          <LayerTag label="structural lifecycle" />
        </div>
        <ol className="space-y-1.5">
          {PIPELINE_STATES.map((stage, i) => {
            const isActive = stage.id === activeState;
            const isComplete =
              i < PIPELINE_STATES.findIndex((s) => s.id === activeState);
            const isTerminal = stage.id === "FIRST_LOOK_DELIVERED";
            const Icon = stage.icon;
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2",
                  isActive
                    ? "border-attention-amber/30 bg-attention-amber/5"
                    : isComplete
                      ? "border-border/60 bg-muted/30"
                      : "border-border/40 bg-card opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    isActive
                      ? "bg-attention-amber/15"
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
                      <span className="rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-semibold text-attention-amber">
                        ACTIVE
                      </span>
                    )}
                    {isComplete && (
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

      {/* Connection cards */}
      <section
        aria-label="Data Source Connections"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Data Source Connections
          </h3>
          <LayerTag label="structural" />
        </div>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Each connection card shows live status the moment it&apos;s actioned.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {CONNECTIONS.map((conn) => {
            const Icon = conn.icon;
            const isProcessing = conn.status === "processing";
            return (
              <div
                key={conn.type}
                className={cn(
                  "rounded-lg border px-3 py-2.5",
                  isProcessing
                    ? "border-attention-amber/30 bg-attention-amber/5"
                    : "border-border/50 bg-muted/20",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        isProcessing
                          ? "text-attention-amber"
                          : "text-balanced-green",
                      )}
                    />
                    {conn.type}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[8px] font-semibold",
                      isProcessing
                        ? "bg-attention-amber/10 text-attention-amber"
                        : "bg-balanced-green/10 text-balanced-green",
                    )}
                  >
                    {isProcessing ? "PROCESSING" : "CONNECTED"}
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {conn.detail}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Historical pull — per-period progress */}
      <section
        aria-label="Historical Pull"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Historical Pull — Real Per-Period Progress
          </h3>
          <LayerTag label="per-period state" />
        </div>
        <p className="mb-2 text-[10px] text-muted-foreground">
          Pull window: Aug 2025 → Jul 2026 (12 months) — within the ordinary
          ≤12-month path, no permission gate required.
        </p>
        <div className="space-y-1">
          {HISTORICAL_PERIODS.map((p) => {
            const isActive = p.status === "active";
            const isDone = p.status === "done";
            return (
              <div
                key={p.period}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5",
                  isActive
                    ? "border-attention-amber/30 bg-attention-amber/5"
                    : isDone
                      ? "border-border/50 bg-muted/20"
                      : "border-border/30 bg-card opacity-50",
                )}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {isActive ? (
                    <Activity className="h-3 w-3 animate-pulse text-attention-amber" />
                  ) : isDone ? (
                    <CheckCircle2 className="h-3 w-3 text-balanced-green" />
                  ) : (
                    <Clock className="h-3 w-3 text-muted-foreground/50" />
                  )}
                </span>
                <span className="w-28 shrink-0 text-[10px] font-medium tabular-nums">
                  {p.period}
                </span>
                {isActive ? (
                  <span className="flex-1 text-[10px] text-muted-foreground">
                    Processing {p.period}... {p.found.toLocaleString()}{" "}
                    transactions found, {p.categorized.toLocaleString()}{" "}
                    categorized automatically (confidence above threshold),{" "}
                    {p.flagged} flagged for your review
                  </span>
                ) : isDone ? (
                  <span className="flex-1 text-[10px] text-muted-foreground/70">
                    {p.found.toLocaleString()} found ·{" "}
                    {p.categorized.toLocaleString()} categorized · {p.flagged}{" "}
                    flagged
                  </span>
                ) : (
                  <span className="flex-1 text-[10px] text-muted-foreground/50">
                    Not yet processed
                  </span>
                )}
                {isDone && (
                  <span className="rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
                    DONE
                  </span>
                )}
                {isActive && (
                  <span className="rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-semibold text-attention-amber">
                    PROCESSING
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 rounded-lg border border-border/50 bg-accent/10 px-3 py-2 text-[10px] text-muted-foreground">
          Processed so far: {doneMonths.length} periods ·{" "}
          {runningFound.toLocaleString()} transactions found ·{" "}
          {runningCategorized.toLocaleString()} categorized automatically ·{" "}
          {runningFlagged} flagged for your review
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground/70">
          Per-period status driven by actual per-period processing state — never
          a simulated progress animation.
        </p>
      </section>

      {/* Chart of Accounts Proposal */}
      <section
        aria-label="Chart of Accounts Proposal"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Chart of Accounts — Proposed Structure
          </h3>
          <LayerTag label="basis shown" />
        </div>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-signal-indigo" />
            <p className="text-[11px] font-semibold">
              Basis: standard chart for Trading/Retail in Gambia (GM) — 28
              accounts proposed
            </p>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Proposed for your review — never silently applied. You can edit
            accounts before confirming.
          </p>
        </div>
        <div className="mt-2 space-y-1">
          {COA_ACCOUNTS.map((acct) => (
            <div
              key={acct.code}
              className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-1.5 text-[10px]"
            >
              <span className="font-mono text-muted-foreground/70">
                {acct.code}
              </span>
              <span className="flex-1 px-2 font-medium">{acct.name}</span>
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60">
                {acct.type}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">
              Proposal confidence — judgment-based on business description +
              segment template
            </span>
            <span className="text-[10px] font-semibold text-signal-indigo">
              87%
            </span>
          </div>
          <div
            role="meter"
            aria-label="COA proposal confidence"
            aria-valuenow={87}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-signal-indigo"
              style={{ width: "87%" }}
            />
          </div>
        </div>
      </section>

      {/* First Look Preview */}
      <section
        aria-label="First Look Preview"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            First Look Preview
          </h3>
          <LayerTag label="CFO Agent synthesis" />
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-balanced-green" />
          <p className="text-[10px] text-muted-foreground">
            Once the pull completes, the CFO Agent reviews everything processed
            so far: 5,963 transactions categorized, 337 flagged for your review,
            2 vendors matched, cash position established. The first message
            cites these specifics — never a generic welcome.
          </p>
        </div>
      </section>

      {/* Status grid */}
      <section
        aria-label="Onboarding Metadata"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {[
          { label: "Periods Processed", value: `${doneMonths.length}` },
          {
            label: "Transactions Found",
            value: runningFound.toLocaleString(),
          },
          {
            label: "Categorized Automatically",
            value: runningCategorized.toLocaleString(),
          },
          { label: "Flagged for Review", value: `${runningFlagged}` },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card px-3 py-2">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/50">
              {item.label}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      {/* Why */}
      <section aria-label="Why" className="rounded-xl border bg-card p-4">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Why
        </h3>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5 text-[10px] text-muted-foreground">
          <p>
            Processing April 2026 — 847 transactions found, 812 categorized
            automatically (confidence above threshold), 35 flagged for your
            review. Each period&apos;s progress is driven by actual per-period
            processing state — real, never simulated.
          </p>
        </div>
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
                  condition: "Bank upload format not recognized",
                  esc: "Human",
                  note: "Manual entry path offered immediately",
                  blocking: "Non-blocking — alternative path always available",
                },
                {
                  condition: "History beyond 12 months detected",
                  esc: "Human",
                  note: "Permission requested before beginning — routes to Historical Data Reconstruction spec",
                  blocking: "Blocking until permission given",
                },
                {
                  condition:
                    "Low categorization confidence on many transactions",
                  esc: "Human",
                  note: "Flagged batch for review, not silently accepted",
                  blocking: "Non-blocking — surfaced clearly",
                },
              ].map((row) => (
                <tr
                  key={row.condition}
                  className="border-b border-border/40 last:border-0"
                >
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
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                        row.blocking.startsWith("Blocking")
                          ? "bg-error-clay/10 text-error-clay"
                          : "bg-attention-amber/10 text-attention-amber",
                      )}
                    >
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
            <BookOpen className="h-3.5 w-3.5 text-signal-indigo" />
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
          The critical rule: the per-period progress (&quot;Processing April
          2026...&quot;) must be real, driven by actual per-period processing
          state — never a simulated progress animation timed to feel realistic
          while a batch job runs invisibly underneath.
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
            Audit Trail — Every Connection, Period &amp; Decision
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
                {AUDIT_TRAIL.map((entry, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-4 py-2 font-mono text-[9px] text-muted-foreground/70">
                      {entry.timestamp}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                        {entry.state}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-[9px] text-muted-foreground">
                      {entry.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cross-Agent Chain */}
      <section
        aria-label="Cross-Agent Chain"
        className="rounded-xl border bg-card p-4"
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Cross-Agent Chain
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {[
            "Document Agent",
            "AP / AR / Expense Agents",
            "Ledger Agent",
            "CFO Agent",
          ].map((agent, i) => (
            <span key={agent} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  agent === "Ledger Agent"
                    ? "bg-primary/10 font-semibold text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {agent}
              </span>
              {i < 3 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
              )}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Document Agent (ingestion/OCR) → AP/AR/Expense Agents (categorization)
          → Ledger Agent (COA setup) → CFO Agent (first message synthesis).
          Categorization confidence is inherited, never re-derived.
        </p>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-accent/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <ShieldCheck className="h-3 w-3 text-balanced-green" />
          Layer 1 — structural: connections, per-period processing, COA proposal
          basis — never judgment
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <Timer className="h-3 w-3 text-signal-indigo" />
          Layer 2 — probabilistic: 87% confidence on the COA proposal
          (judgment-based on business description); per-transaction
          categorization confidence is inherited from Document Agent/AP
          Agent/Expense Agent, never re-derived
        </span>
      </div>
    </div>
  );
}
