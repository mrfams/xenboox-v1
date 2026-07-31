"use client";

import { ControllerLiveness } from "@/components/agents/controller-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Scale,
  Eye,
  Undo2,
  ClipboardCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function ControllerAgentLivenessPage() {
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
          <span className="text-foreground/80">Controller Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Scale className="h-5 w-5 text-violet-500" />
              Controller Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Controller Agent is a management-tier reviewer, not a doer — its
              liveness shows what it&apos;s reviewing right now among the flow
              of postings from five worker agents, and what it approved vs.
              kicked back, so it never reads as a passive rubber stamp.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-violet-500 mb-1">
                <Eye className="h-3 w-3" />
                Reviewer, Not a Doer
              </div>
              <p className="text-[10px] text-muted-foreground">
                Live &quot;currently reviewing&quot; feed — distinct from Ledger
                Agent&apos;s posting feed, showing an active second review
                layer.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-error-clay mb-1">
                <Undo2 className="h-3 w-3" />
                Kickbacks With Reasons
              </div>
              <p className="text-[10px] text-muted-foreground">
                Kicked-back items show the specific reason and route visibly
                back to the originating agent&apos;s queue — never a bare
                rejection.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <ClipboardCheck className="h-3 w-3" />
                Live Close Checklist
              </div>
              <p className="text-[10px] text-muted-foreground">
                Trial balance balanced / AP-AR reconciled / all postings
                reviewed ticks live as conditions are met — not revealed only at
                month-end.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Controller Agent about a review decision..."
            suggestions={[
              "What posting is being reviewed right now?",
              "Why was invoice #4471 kicked back?",
              "Show the close checklist status",
              "Has anything been escalated to the CFO Agent?",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <ControllerLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Controller Liveness Spec — they
                let you simulate different agent states to verify transparency
                at every stage of the state machine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Reviewing</p>
                <p className="text-[8px] text-muted-foreground">
                  REVIEWING active — posting from AP Agent
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Kickback Loop</p>
                <p className="text-[8px] text-muted-foreground">
                  Escalated to CFO Agent — blocking
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Close at Risk</p>
                <p className="text-[8px] text-muted-foreground">
                  Non-blocking but flagged to CFO Agent
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Material Issue</p>
                <p className="text-[8px] text-muted-foreground">
                  Never silently confirmed to keep close on schedule
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
