"use client";

import { OnboardingLiveness } from "@/components/onboarding/onboarding-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Rocket,
  History,
  Database,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function OnboardingLivenessPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Dashboard
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-foreground/80">
            Onboarding / Historical Data Pull Liveness
          </span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Rocket className="h-5 w-5 text-sky-500" />
              Onboarding / Historical Data Pull Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              This is the most important liveness moment in the product — PRD
              §13 targets first meaningful value within 12 minutes, and the
              first-value moment is watching transactions appear, categorized,
              in real time. The onboarding flow must visibly perform agent work
              at the first impression.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <History className="h-3 w-3" />
                Real Per-Period Progress
              </div>
              <p className="text-[10px] text-muted-foreground">
                The pull processes one period at a time with real per-period
                state — never a single aggregate spinner timed to feel realistic
                while a batch job runs invisibly underneath.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-sky-500 mb-1">
                <Database className="h-3 w-3" />
                Inherited Confidence
              </div>
              <p className="text-[10px] text-muted-foreground">
                Onboarding surfaces Document/AP/Expense Agent categorization
                confidence live — it never re-derives per-transaction scores.
                The COA proposal carries the single judgment-based score.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <BookOpen className="h-3 w-3" />
                Never Silently Applied
              </div>
              <p className="text-[10px] text-muted-foreground">
                The proposed chart of accounts is shown for review, never
                applied silently — and every failure state offers a named
                alternative path, never a dead end.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask about your data import or first look..."
            suggestions={[
              "How is my historical data import progressing?",
              "Which transactions were flagged for review?",
              "When will I get my first look?",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <OnboardingLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-sky-500" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Onboarding / Historical Data Pull
                Liveness Spec — they let you simulate different flow states to
                verify transparency at every stage of the state machine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">
                  Historical Pull Running
                </p>
                <p className="text-[8px] text-muted-foreground">
                  Processing April 2026 — 847 found, 812 categorized
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Permission Requested</p>
                <p className="text-[8px] text-muted-foreground">
                  &gt;12 months — blocking until permission given
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-indigo/10">
                <span className="h-2 w-2 rounded-full bg-signal-indigo" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Fallback Offered</p>
                <p className="text-[8px] text-muted-foreground">
                  Format not recognized — manual entry, never a dead end
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Low-Confidence Batch</p>
                <p className="text-[8px] text-muted-foreground">
                  Flagged for review — not silently accepted
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-indigo/10">
                <span className="h-2 w-2 rounded-full bg-signal-indigo" />
              </div>
              <div>
                <p className="text-[10px] font-medium">COA Edited</p>
                <p className="text-[8px] text-muted-foreground">
                  4 accounts edited before confirming
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">First Look Delivered</p>
                <p className="text-[8px] text-muted-foreground">
                  CFO Agent first message — specific, terminal
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
