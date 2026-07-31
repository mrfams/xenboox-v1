"use client";

import { CloseLiveness } from "@/components/close/close-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Lock,
  ShieldCheck,
  Activity,
  Bell,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function CloseLivenessPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <Link
            href="/dashboard/close"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Month-End Close
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-foreground/80">Close Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-500" />
              Month-End Close Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Close is largely passive from the human&apos;s side — which is
              exactly why the process itself needs to be visible while it
              happens. The live checklist ticks department by department, the
              readiness gate is explicit, and the owner notification is a
              distinct legal-acknowledgment moment per PRD §14.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 mb-1">
                <Activity className="h-3 w-3" />
                Live Close Checklist
              </div>
              <p className="text-[10px] text-muted-foreground">
                Ticking department by department in real time — not revealed
                only once fully complete. Any blocked item shows its specific
                unresolved cause.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-sky-500 mb-1">
                <ShieldCheck className="h-3 w-3" />
                Never Silently Proceeds
              </div>
              <p className="text-[10px] text-muted-foreground">
                The close never advances past an unconfirmed department item,
                and the blocking state is shown explicitly — never hidden behind
                a spinner labeled &quot;closing&quot;.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <Bell className="h-3 w-3" />
                Legal Acknowledgment (PRD §14)
              </div>
              <p className="text-[10px] text-muted-foreground">
                The owner notification is a distinct, deliberate moment — not a
                generic badge — since it carries legal acknowledgment weight.
                Silence = approval.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask about your month-end close..."
            suggestions={[
              "Where is the June 2026 close right now?",
              "Did all departments confirm the close?",
              "Has the owner been notified?",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <CloseLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-indigo-500" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Month-End Close Liveness Spec —
                they let you simulate different flow states to verify
                transparency at every stage of the state machine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">All Confirmed</p>
                <p className="text-[8px] text-muted-foreground">
                  Readiness gate 94% ≥ 90% — closing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Controller Blocked</p>
                <p className="text-[8px] text-muted-foreground">
                  Trial balance variance — close halts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Treasury Blocked</p>
                <p className="text-[8px] text-muted-foreground">
                  Bank line BT-88213 unreconciled
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Confidence Held</p>
                <p className="text-[8px] text-muted-foreground">
                  68% &lt; 90% — held, human notified
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-indigo/10">
                <span className="h-2 w-2 rounded-full bg-signal-indigo" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Owner Notified</p>
                <p className="text-[8px] text-muted-foreground">
                  Legal acknowledgment — delivery logged
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Passive Approval</p>
                <p className="text-[8px] text-muted-foreground">
                  Silence = approval — terminal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Flagged for Reopen</p>
                <p className="text-[8px] text-muted-foreground">
                  Routes to Error Recovery flow
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
