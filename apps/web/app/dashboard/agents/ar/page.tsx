"use client";

import { ArLiveness } from "@/components/agents/ar-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Receipt,
  Shield,
  BarChart3,
  ExternalLink,
  Timer,
} from "lucide-react";
import Link from "next/link";

export default function ArAgentLivenessPage() {
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
          <span className="text-foreground/80">AR Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Receipt className="h-5 w-5 text-signal-indigo" />
              AR Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time transparency into the AR Agent&apos;s invoice-to-cash
              flow — where partial payments, disputed amounts, and donor
              tranches get misallocated if hidden behind a silent
              &quot;matched.&quot; Every payment match shows its type, basis,
              and exact received vs. remaining balance — no rounding, no
              &quot;close enough,&quot; and no auto-picked ambiguous matches.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <Shield className="h-3 w-3" />
                Partial Never Rounded
              </div>
              <p className="text-[10px] text-muted-foreground">
                A partial payment is never silently treated as closing the
                invoice — the exact received amount and exact remaining balance
                are shown every time. No rounding, ever.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <BarChart3 className="h-3 w-3" />
                Match Type + Basis Always Shown
              </div>
              <p className="text-[10px] text-muted-foreground">
                Every payment match states its type (full / partial /
                overpayment) and its basis — amount + reference, donor schedule,
                or ambiguous. No silent matching, ever.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <Timer className="h-3 w-3" />
                Never Auto-Picks Ambiguous
              </div>
              <p className="text-[10px] text-muted-foreground">
                When a payment matches multiple same-amount open invoices, the
                AR Agent never guesses — it flags for human confirmation which
                invoice to apply.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the AR Agent about an invoice..."
            suggestions={[
              "Show me the current payment matching",
              "Why was this payment recorded as partial?",
              "Which invoices have an overpayment credit?",
              "Show the audit trail for invoice INV-2205",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <ArLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the AR Liveness Spec — they let you
                simulate different agent states to verify transparency at every
                stage of the state machine.
              </p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-indigo/10">
                <span className="h-2 w-2 rounded-full bg-signal-indigo" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Payment Matching</p>
                <p className="text-[8px] text-muted-foreground">
                  PAYMENT_MATCHING active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Delivery Failure</p>
                <p className="text-[8px] text-muted-foreground">
                  Never silently marked sent
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Overpayment Credit</p>
                <p className="text-[8px] text-muted-foreground">
                  Blocking on that credit only
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Ambiguous Match</p>
                <p className="text-[8px] text-muted-foreground">
                  Never auto-picks — confirms
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
