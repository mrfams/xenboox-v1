"use client";

import React from "react";
import { useState } from "react";
import {
  PackageCheck,
  Package,
  Boxes,
  FileCheck2,
  Receipt,
  ClipboardCheck,
  AlertTriangle,
  Activity,
  ChevronDown,
  Building2,
  ArrowRight,
  Eye,
  ListChecks,
  ShieldAlert,
  Wallet,
  Layers,
  TrendingDown,
  Bell,
  CircleSlash,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type InventoryState =
  | "GOODS_RECEIVED"
  | "PO_MATCHED"
  | "STOCK_UPDATED"
  | "COGS_CALCULATED"
  | "VALUATION_UPDATED"
  | "LOW_STOCK_CHECK";

export interface CostLayer {
  batch: string;
  units: number;
  unitCost: number;
  amount: number;
}

export interface InventoryLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showPoMismatch?: boolean;
  showStockBreach?: boolean;
  showNegativeStock?: boolean;
  showLowStock?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: InventoryState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "GOODS_RECEIVED",
    label: "GOODS_RECEIVED",
    description: "Goods received note logged — qty, unit cost, date",
    icon: PackageCheck,
  },
  {
    id: "PO_MATCHED",
    label: "PO_MATCHED",
    description: "Matched to open PO or flagged direct receipt",
    icon: FileCheck2,
  },
  {
    id: "STOCK_UPDATED",
    label: "STOCK_UPDATED",
    description: "On-hand quantity updated live",
    icon: Boxes,
  },
  {
    id: "COGS_CALCULATED",
    label: "COGS_CALCULATED",
    description: "Valuation method's cost-layer logic — layers shown",
    icon: Receipt,
  },
  {
    id: "VALUATION_UPDATED",
    label: "VALUATION_UPDATED",
    description: "Remaining inventory value recalculated",
    icon: Wallet,
  },
  {
    id: "LOW_STOCK_CHECK",
    label: "LOW_STOCK_CHECK",
    description: "On-hand compared to threshold — proactive alert",
    icon: ClipboardCheck,
  },
];

const COGS_LAYERS: CostLayer[] = [
  {
    batch: "batch received June 1",
    units: 30,
    unitCost: 12.0,
    amount: 360.0,
  },
  {
    batch: "batch received June 15",
    units: 20,
    unitCost: 13.0,
    amount: 260.0,
  },
];

const STOCK_ROWS = [
  { name: "Cement Bags 50kg", onHand: 1200, unitCost: 12.0, value: 14400.0 },
  { name: "Rebar 12mm", onHand: 80, unitCost: 10.5, value: 840.0 },
];

const TOTAL_VALUATION = 15240.0;

const STEPS = [
  {
    title: "Record Goods Received",
    detail:
      "Input: goods received note (quantity, unit cost, date). Output: GRN record. No confidence score — direct entry, not inferred.",
  },
  {
    title: "Match to PO",
    detail:
      "Input: GRN + open POs. Output: matched/unmatched + discrepancy detail if quantity/price differs. No confidence score — deterministic comparison.",
  },
  {
    title: "Update Stock Levels",
    detail:
      "Input: current on-hand + receipt. Output: new on-hand quantity. No confidence score — arithmetic.",
  },
  {
    title: "Calculate COGS on Sale",
    detail:
      "Input: quantity sold, valuation method, cost layers. Output: COGS amount + exact layer(s) used, shown explicitly (which batch, what cost). No confidence score — a deterministic accounting method, never estimated.",
  },
  {
    title: "Update Valuation",
    detail:
      "Input: remaining units per layer. Output: recalculated inventory value. No confidence score — deterministic.",
  },
  {
    title: "Check Low-Stock Threshold",
    detail:
      "Input: on-hand vs configured reorder point. Output: pass/alert. No confidence score — deterministic comparison.",
  },
];

const CONSTRAINTS = [
  { label: "COGS Layer Basis", icon: Layers },
  { label: "Deterministic Valuation", icon: Wallet },
  { label: "Never Oversells", icon: CircleSlash },
  { label: "Proactive Alerts", icon: Bell },
];

const ESCALATIONS = [
  {
    condition: "PO quantity/price mismatch on receipt",
    to: "Controller Agent",
    effect: "Delta shown explicitly. Blocking for that GRN.",
  },
  {
    condition: "Stock breach — attempted sale exceeds on-hand",
    to: "Controller Agent / human",
    effect: "Hard stop. Never oversells silently.",
  },
  {
    condition: "Low stock threshold breached",
    to: "Inventory Agent auto-alert",
    effect: "Proactive alert. Non-blocking.",
  },
];

const AUDIT_TRAIL = [
  {
    event: "Goods received",
    detail: "GRN-2026-0318 · 50 units @ GMD 12.00",
    conf: "—",
  },
  {
    event: "PO matched",
    detail: "PO #205 · 50 units @ GMD 12.00 · result: match",
    conf: "—",
  },
  { event: "Stock updated", detail: "on-hand 1,150 → 1,200 · live", conf: "—" },
  {
    event: "COGS calculated",
    detail: "FIFO: 30 @ GMD 12.00 (360) + 20 @ GMD 13.00 (260) = 620",
    conf: "—",
  },
  {
    event: "Valuation updated",
    detail: "total inventory value GMD 15,240.00",
    conf: "—",
  },
  {
    event: "Low-stock check",
    detail: "all items above reorder point · pass",
    conf: "—",
  },
  {
    event: "Posted to Ledger",
    detail: "JE-2026-0312 · via Controller Agent",
    conf: "—",
  },
  { event: "Valuation snapshot", detail: "GMD 15,240.00 · Q2 2026", conf: "—" },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `GMD ${amount.toLocaleString("en-GM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStateColor(state: InventoryState): string {
  switch (state) {
    case "GOODS_RECEIVED":
    case "PO_MATCHED":
    case "STOCK_UPDATED":
    case "VALUATION_UPDATED":
      return "text-balanced-green";
    case "COGS_CALCULATED":
    case "LOW_STOCK_CHECK":
      return "text-signal-indigo";
  }
}

function getStateBg(state: InventoryState): string {
  switch (state) {
    case "GOODS_RECEIVED":
    case "PO_MATCHED":
    case "STOCK_UPDATED":
    case "VALUATION_UPDATED":
      return "bg-balanced-green/5 border-balanced-green/20";
    case "COGS_CALCULATED":
    case "LOW_STOCK_CHECK":
      return "bg-signal-indigo/5 border-signal-indigo/20";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function StateBadge({ state }: { state: InventoryState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide",
        getStateColor(state),
        getStateBg(state),
      )}
    >
      {state}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function InventoryLiveness({
  className,
  showEmptyState = false,
  showPoMismatch = false,
  showStockBreach = false,
  showNegativeStock = false,
  showLowStock = false,
}: InventoryLivenessProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const header = (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-indigo/10">
          <Package className="h-4 w-4 text-signal-indigo" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Inventory Agent</h2>
          <p className="text-[10px] text-muted-foreground">
            Inventory — receipt to valuation
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 rounded-md border border-signal-indigo/20 bg-signal-indigo/5 px-1.5 py-0.5 text-[9px] font-medium text-signal-indigo">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-indigo" />
          Live
        </span>
        <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          PO #205 · Cement
        </span>
      </div>
    </div>
  );

  const footer = (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 pt-2">
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-balanced-green" />
        Layer 1 — deterministic: GRN, PO match, stock levels, COGS layers,
        valuation, low-stock
      </span>
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
        <Layers className="h-3 w-3" />
        COGS shown layer-by-layer — never a single blended number
      </span>
    </div>
  );

  // ── Empty State ──────────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-6 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            No inventory movement being processed
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            Stock movements appear here with COGS shown layer-by-layer and
            valuation updated live.
          </p>
        </div>
      </div>
    );
  }

  // ── PO Mismatch Branch (Spec §6 — blocking) ──────────────────────────
  if (showPoMismatch) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-attention-amber/40 bg-attention-amber/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-attention-amber" />
            <div>
              <p className="text-xs font-semibold text-attention-amber">
                PO Mismatch Flagged
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                GRN-2026-0318 received 50 units @ GMD 14.00, but PO #205 is 50
                units @ GMD 9.20. Price delta: GMD 240.00 — shown explicitly.
                Escalated to Controller Agent. Blocking for that GRN until
                resolved.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Stock Breach Branch (Spec §6/§7 — hard stop) ─────────────────────
  if (showStockBreach) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-error-clay/30 bg-error-clay/5 p-3">
            <CircleSlash className="mt-0.5 h-4 w-4 shrink-0 text-error-clay" />
            <div>
              <p className="text-xs font-semibold text-error-clay">
                Stock Breach — Hard Stop
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Sale of 1,500 units attempted but only 1,200 on hand. Never
                oversells silently — hard stop, escalated to Controller Agent /
                human for investigation before any posting.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Negative Stock Branch (Spec §7) ──────────────────────────────────
  if (showNegativeStock) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-error-clay/30 bg-error-clay/5 p-3">
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-error-clay" />
            <div>
              <p className="text-xs font-semibold text-error-clay">
                Negative Stock — Investigation Required
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                On-hand computed as -20 units for Rebar 12mm. Never allowed to
                post silently — hard stop requiring investigation of the source
                movement before the ledger is touched.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Low Stock Alert Branch (Spec §6 — proactive, non-blocking) ───────
  if (showLowStock) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-attention-amber/40 bg-attention-amber/5 p-3">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-attention-amber" />
            <div>
              <p className="text-xs font-semibold text-attention-amber">
                Low Stock Alert
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Cement Bags 50kg at 80 units — below reorder point of 200.
                Surfaced proactively on the dashboard, not just in a report.
                Non-blocking: stock movements continue, alert persists until
                restocked.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Main Active View ─────────────────────────────────────────────────
  const activeIdx = 3; // COGS_CALCULATED

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      <div className="p-4">{header}</div>

      <div className="border-t p-4 space-y-4">
        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              State
            </p>
            <StateBadge state="COGS_CALCULATED" />
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              Entity
            </p>
            <p className="flex items-center gap-1 text-[10px] font-semibold">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              Xenboox HQ
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              Item
            </p>
            <p className="text-[10px] font-semibold">Cement Bags 50kg</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              Source
            </p>
            <p className="flex items-center gap-1 text-[10px] font-semibold">
              <PackageCheck className="h-3 w-3 text-muted-foreground" />
              GRN-2026-0318
            </p>
          </div>
        </div>

        {/* State Machine Pipeline */}
        <div
          role="region"
          aria-label="Inventory State Machine"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            State Machine
          </p>
          <ol className="space-y-1.5">
            {PIPELINE_STATES.map((s, idx) => {
              const Icon = s.icon;
              const isActive = idx === activeIdx;
              const isDone = idx < activeIdx;
              return (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
                    isActive
                      ? "border-signal-indigo/30 bg-signal-indigo/5"
                      : isDone
                        ? "border-balanced-green/20 bg-balanced-green/5"
                        : "border-border/50 bg-muted/20 opacity-70",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive
                        ? "text-signal-indigo"
                        : isDone
                          ? "text-balanced-green"
                          : "text-muted-foreground/50",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-semibold tracking-wide",
                      isActive
                        ? "text-signal-indigo"
                        : isDone
                          ? "text-balanced-green"
                          : "text-muted-foreground/50",
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="ml-auto text-[9px] text-muted-foreground/70">
                    {s.description}
                  </span>
                  {isActive && (
                    <Activity className="h-3 w-3 animate-pulse text-signal-indigo" />
                  )}
                  {isDone && (
                    <FileCheck2 className="h-3 w-3 text-balanced-green" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Goods Receipt + PO Match */}
        <div role="region" aria-label="Goods Receipt" className="space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Goods Receipt &amp; PO Match
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2.5 py-2">
              <PackageCheck className="h-3.5 w-3.5 text-balanced-green" />
              <span className="text-[10px] font-medium">
                Received: 50 units @ GMD 12
              </span>
              <span className="ml-auto text-[9px] text-muted-foreground/70">
                GRN-2026-0318
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2.5 py-2">
              <FileCheck2 className="h-3.5 w-3.5 text-balanced-green" />
              <span className="text-[10px] font-medium">
                Matched to PO #205
              </span>
              <span className="ml-auto text-[9px] text-muted-foreground/70">
                Deterministic comparison — no confidence score
              </span>
            </div>
          </div>
        </div>

        {/* COGS Layer-by-Layer — the critical rule */}
        <div
          data-step="cogs"
          role="region"
          aria-label="COGS Layer Breakdown"
          className="rounded-lg border border-signal-indigo/20 bg-signal-indigo/5 p-3"
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-signal-indigo">
            <Receipt className="h-3 w-3" />
            COGS on Sale — layer-by-layer basis, never a blended number
          </p>
          <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground">
            COGS for sale of 50 units: FIFO — 30 units from batch received June
            1 @ GMD 12.00 (GMD 360.00) + 20 units from batch received June 15 @
            GMD 13.00 (GMD 260.00) = GMD 620.00 total COGS.
          </p>
          <div className="mt-2 space-y-1">
            {COGS_LAYERS.map((layer, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-md border border-border/50 bg-card/60 px-2 py-1"
              >
                <span className="text-[9px] font-medium text-muted-foreground">
                  {layer.units} units from {layer.batch} @ GMD{" "}
                  {layer.unitCost.toFixed(2)}
                </span>
                <span className="text-[9px] font-semibold text-signal-indigo">
                  {formatCurrency(layer.amount)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[9px] text-muted-foreground/70">
            Deterministic accounting method — no confidence score. The layer
            trace is the answer.
          </p>
        </div>

        {/* Stock Table */}
        <div role="region" aria-label="Stock Table" className="space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Stock Table
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Item
                  </th>
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    On Hand
                  </th>
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Unit Cost
                  </th>
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {STOCK_ROWS.map((row) => (
                  <tr key={row.name} className="border-t border-border/50">
                    <td className="px-2.5 py-1.5 text-[9px] font-medium">
                      {row.name}
                    </td>
                    <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                      {row.onHand.toLocaleString()}
                    </td>
                    <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                      {formatCurrency(row.unitCost)}
                    </td>
                    <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                      {formatCurrency(row.value)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border/50 bg-muted/30">
                  <td className="px-2.5 py-1.5 text-[9px] font-semibold">
                    Total Valuation
                  </td>
                  <td className="px-2.5 py-1.5" />
                  <td className="px-2.5 py-1.5" />
                  <td className="px-2.5 py-1.5 text-[9px] font-bold text-balanced-green">
                    {formatCurrency(TOTAL_VALUATION)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Check */}
        <div role="region" aria-label="Low Stock Check" className="space-y-1.5">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <ClipboardCheck className="h-3 w-3" />
            Low Stock Check
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2.5 py-2">
            <Bell className="h-3 w-3 text-balanced-green" />
            <span className="text-[9px] font-medium text-muted-foreground">
              All items above reorder point — no alert. Surfaced proactively
              when breached, non-blocking.
            </span>
          </div>
        </div>

        {/* Escalation & Human-in-the-Loop */}
        <div
          role="region"
          aria-label="Escalation & Human-in-the-Loop"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Escalation &amp; Human-in-the-Loop
          </p>
          <div className="overflow-hidden rounded-lg border">
            {ESCALATIONS.map((esc, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-2 px-2.5 py-2",
                  idx > 0 && "border-t border-border/50",
                )}
              >
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-attention-amber" />
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {esc.condition}
                  </p>
                  <p className="text-[9px] text-muted-foreground/70">
                    → {esc.to}. {esc.effect}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div role="region" aria-label="How It Works" className="space-y-1.5">
          <button
            onClick={() => setShowSteps((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-2.5 py-2 text-left"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-semibold">
              <Eye className="h-3 w-3 text-signal-indigo" />
              How It Works — Step-by-Step
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform",
                showSteps && "rotate-180",
              )}
            />
          </button>
          {showSteps && (
            <div className="space-y-1.5">
              {STEPS.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2"
                >
                  <p className="text-[10px] font-semibold text-signal-indigo">
                    Step {idx + 1} — {s.title}
                  </p>
                  <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
                    {s.detail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Constraint Enforcement */}
        <div
          role="region"
          aria-label="Constraint Enforcement"
          className="space-y-1.5"
        >
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <ShieldAlert className="h-3 w-3" />
            Constraint Enforcement
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CONSTRAINTS.map((c) => (
              <span
                key={c.label}
                className="flex items-center gap-1 rounded-md border border-balanced-green/20 bg-balanced-green/5 px-1.5 py-0.5 text-[9px] font-medium text-balanced-green"
              >
                <c.icon className="h-3 w-3" />
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* Audit Trail */}
        <div role="region" aria-label="Audit Trail" className="space-y-1.5">
          <button
            onClick={() => setShowAudit((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-2.5 py-2 text-left"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-semibold">
              <ListChecks className="h-3 w-3 text-signal-indigo" />
              Audit Trail — Every Stock Movement
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform",
                showAudit && "rotate-180",
              )}
            />
          </button>
          {showAudit && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Event
                    </th>
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Detail
                    </th>
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {AUDIT_TRAIL.map((row, idx) => (
                    <tr
                      key={idx}
                      className={cn(idx > 0 && "border-t border-border/50")}
                    >
                      <td className="px-2.5 py-1.5 text-[9px] font-medium">
                        {row.event}
                      </td>
                      <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                        {row.detail}
                      </td>
                      <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                        {row.conf}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cross-Agent Chain */}
        <div
          role="region"
          aria-label="Cross-Agent Chain"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Cross-Agent Chain
          </p>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/20 px-2.5 py-2">
            <span className="text-[9px] font-medium text-muted-foreground">
              This agent
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] font-medium text-muted-foreground">
              Controller Agent (review)
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] font-medium text-muted-foreground">
              Ledger Agent (COGS / valuation postings)
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">{footer}</div>
    </div>
  );
}
