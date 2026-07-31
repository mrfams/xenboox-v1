"use client";

import { AnalyticsLiveness } from "@/components/agents/analytics-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import { ArrowLeft, Radar, Search, Bell, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AnalyticsAgentLivenessPage() {
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
          <span className="text-foreground/80">Analytics Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Radar className="h-5 w-5 text-cyan-500" />
              Analytics Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              This agent&apos;s entire value proposition is proactively
              surfacing things nobody asked about — &quot;the AI noticed
              something.&quot; If that noticing happens silently in a batch job,
              the proactive insight differentiator is invisible in the
              day-to-day product experience.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-500 mb-1">
                <Radar className="h-3 w-3" />
                Continuous Scanning
              </div>
              <p className="text-[10px] text-muted-foreground">
                A low-key monitoring indicator runs continuously in the
                background — viewable on demand, never intrusive.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <Bell className="h-3 w-3" />
                Proactive Insight Cards
              </div>
              <p className="text-[10px] text-muted-foreground">
                &quot;I noticed: [specific pattern]&quot; surfaced immediately
                on dashboard/chat, timestamped — never batched only into
                month-end.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <Search className="h-3 w-3" />
                Baseline-Cited, Never Vague
              </div>
              <p className="text-[10px] text-muted-foreground">
                Every insight names the specific metric, its comparison
                baseline, and the trajectory data behind it — never a vague
                &quot;unusual activity detected.&quot;
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Analytics Agent about a pattern..."
            suggestions={[
              "What insight surfaced most recently?",
              "Show the trend data behind the supplier spend spike",
              "How many months of runway do we have?",
              "What gets flagged as fraud versus logged only?",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <AnalyticsLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Analytics Liveness Spec — they
                let you simulate different agent states to verify transparency
                at every stage of the state machine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Surfaced</p>
                <p className="text-[8px] text-muted-foreground">
                  SURFACED active — baseline cited
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Fraud Flag</p>
                <p className="text-[8px] text-muted-foreground">
                  High urgency — routed to Compliance Agent
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Runway Alert</p>
                <p className="text-[8px] text-muted-foreground">
                  Below threshold — CFO Agent notified
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Insufficient History</p>
                <p className="text-[8px] text-muted-foreground">
                  Explicit — never presented as certain
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
