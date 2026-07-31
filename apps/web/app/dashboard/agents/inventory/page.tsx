"use client";

import { InventoryLiveness } from "@/components/agents/inventory-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Layers,
  Wallet,
  CircleSlash,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function InventoryAgentLivenessPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <Link
            href="/dashboard/agents"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to AI Team
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-foreground/80">Inventory Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-signal-indigo" />
              Inventory Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              COGS and valuation calculations are the classic &quot;trust
              me&quot; numbers in inventory accounting — showing the actual
              FIFO/LIFO/weighted-average math, not just a final COGS figure, is
              what proves the platform isn&apos;t guessing. Every COGS amount is
              shown with its layer-by-layer basis and the exact batches
              consumed.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <Layers className="h-3 w-3" />
                COGS Layer Basis
              </div>
              <p className="text-[10px] text-muted-foreground">
                COGS always shows its layer-by-layer basis — which batch each
                unit came from and at what cost — never a single blended number
                with no visible method trace.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <Wallet className="h-3 w-3" />
                Deterministic Valuation
              </div>
              <p className="text-[10px] text-muted-foreground">
                The entire lifecycle is deterministic — GRN, PO match, stock
                levels, COGS layers, and valuation carry no confidence score. No
                meters anywhere.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <CircleSlash className="h-3 w-3" />
                Never Oversells
              </div>
              <p className="text-[10px] text-muted-foreground">
                Stock breaches and negative stock are hard stops — never posted
                silently. PO mismatches show explicit deltas and block that GRN.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Inventory Agent about a stock movement..."
            suggestions={[
              "Show the COGS layer breakdown for the last sale",
              "Why was this GRN blocked?",
              "Which items are below reorder point?",
              "Show the valuation snapshot for Q2 2026",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <InventoryLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Inventory Liveness Spec — they
                let you simulate different agent states to verify transparency
                at every stage of the state machine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-indigo/10">
                <span className="h-2 w-2 rounded-full bg-signal-indigo" />
              </div>
              <div>
                <p className="text-[10px] font-medium">COGS Calculating</p>
                <p className="text-[8px] text-muted-foreground">
                  COGS_CALCULATED active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">PO Mismatch</p>
                <p className="text-[8px] text-muted-foreground">
                  Blocking for that GRN
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Stock Breach</p>
                <p className="text-[8px] text-muted-foreground">
                  Hard stop — never oversells
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Negative Stock</p>
                <p className="text-[8px] text-muted-foreground">
                  Never posts silently
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Low Stock</p>
                <p className="text-[8px] text-muted-foreground">
                  Proactive, non-blocking
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
