"use client";

import { ArrowLeft, Crown, GitBranch, Shield, Landmark } from "lucide-react";
import Link from "next/link";

import { CfoLiveness } from "@/components/agents/cfo-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";

export default function CfoAgentLivenessPage() {
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
          <span className="text-foreground/80">CFO Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Crown className="h-5 w-5 text-violet-500" />
              CFO Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time transparency into the CFO Agent&apos;s decision
              pipeline. Every department consulted, every claim with a source
              reference, every escalation framed for your judgment.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-violet-500 mb-1">
                <GitBranch className="h-3 w-3" />
                No Black Boxes
              </div>
              <p className="text-[10px] text-muted-foreground">
                The CFO Agent routes every question to the department heads who
                own the data, and shows each step in real time.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <Shield className="h-3 w-3" />
                Honest Uncertainty
              </div>
              <p className="text-[10px] text-muted-foreground">
                Every claim carries a confidence score from the department that
                produced it. Below 0.7 escalates to a supervisor, below 0.4 to a
                human.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <Landmark className="h-3 w-3" />
                Human Judgement
              </div>
              <p className="text-[10px] text-muted-foreground">
                Escalations and conflicts are always shown side by side with the
                triggering data — never silently resolved by the agent.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the CFO Agent..."
            suggestions={[
              "What was our profit last month?",
              "Show me the cash position",
              "Why did my expenses go up?",
              "Explain the escalation you flagged",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <CfoLiveness />
      </div>
    </div>
  );
}
