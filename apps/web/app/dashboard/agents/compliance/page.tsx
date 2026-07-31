"use client";

import { ComplianceLiveness } from "@/components/agents/compliance-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  ShieldCheck,
  CalendarDays,
  Lock,
  GitCommitHorizontal,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function ComplianceAgentLivenessPage() {
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
          <span className="text-foreground/80">Compliance Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-500" />
              Compliance Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Deadlines and rule currency are inherently time-based facts that
              decay silently if shown as a static list — this agent keeps the
              compliance calendar visibly live and makes every rule update
              traceable to a source and date.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-teal-500 mb-1">
                <CalendarDays className="h-3 w-3" />
                Live Graduated Calendar
              </div>
              <p className="text-[10px] text-muted-foreground">
                Every filing deadline ticks live with a color-graduated
                countdown at 30 / 14 / 7-day thresholds — not a static list
                refreshed only on page load.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <Lock className="h-3 w-3" />
                Never Auto-Applied
              </div>
              <p className="text-[10px] text-muted-foreground">
                Rule set changes require explicit human confirmation with the
                source cited — this agent detects and proposes, it never
                unilaterally rewrites the tax rules other agents depend on.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <GitCommitHorizontal className="h-3 w-3" />
                Versioned Rule Citations
              </div>
              <p className="text-[10px] text-muted-foreground">
                Every return line and rule application cites its exact rule
                version — old rule vs proposed new rule shown side-by-side
                before confirmation.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Compliance Agent about deadlines or rule changes..."
            suggestions={[
              "Which filing deadlines are approaching?",
              "Has the Gambia VAT rule change been applied?",
              "Was the VAT Q2 draft reviewed?",
              "Are there any regulatory risks flagged?",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <ComplianceLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Compliance Liveness Spec — they
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
                <p className="text-[10px] font-medium">Tax Agent Review</p>
                <p className="text-[8px] text-muted-foreground">
                  Gambia VAT Q2 draft — rule v2.1 cited per line
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Rule Applied</p>
                <p className="text-[8px] text-muted-foreground">
                  15% → 16% — confirmed by human, terminal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Deadline Critical</p>
                <p className="text-[8px] text-muted-foreground">
                  Due in 2 days — package not ready, urgent
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Regulatory Risk</p>
                <p className="text-[8px] text-muted-foreground">
                  Missed SSHFC filing — blocking, immediate
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Kicked Back</p>
                <p className="text-[8px] text-muted-foreground">
                  Draft cites rule v2.0 — current is 2.1
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Low-Confidence Rule</p>
                <p className="text-[8px] text-muted-foreground">
                  Unverifiable source — never silently applied
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
