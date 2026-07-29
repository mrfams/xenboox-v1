"use client";

import { useRouter } from "next/navigation";
import { AgentProfile } from "@/components/agents/agent-profile";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import { Brain, ArrowRight } from "lucide-react";

const AGENTS = [
  {
    name: "CFO Agent",
    emoji: "🏦",
    role: "Chief Financial Officer — Strategic",
    status: "active" as const,
    mission:
      "Monitoring company liquidity and financial health. Preparing strategic recommendations.",
    capabilities: [
      "Analyze cash",
      "Forecast payments",
      "Detect risks",
      "Strategic planning",
    ],
    restrictions: ["Cannot transfer money", "Cannot approve payments"],
    recentActions: [
      { time: "08:00", action: "Reviewed bank accounts" },
      { time: "08:05", action: "Found liquidity issue" },
      { time: "08:10", action: "Created recommendation" },
    ],
  },
  {
    name: "Treasury Agent",
    emoji: "💰",
    role: "Treasury Manager — Cash & Liquidity",
    status: "active" as const,
    mission: "Monitoring bank accounts and cash positions across all entities.",
    capabilities: [
      "Monitor cash",
      "Reconcile banks",
      "Forecast liquidity",
      "Detect anomalies",
    ],
    restrictions: ["Cannot move money"],
    recentActions: [
      { time: "07:45", action: "Reconciled GTBank" },
      { time: "07:50", action: "Updated cash forecast" },
    ],
  },
  {
    name: "Revenue Agent",
    emoji: "📈",
    role: "Credit Controller — Accounts Receivable",
    status: "active" as const,
    mission: "Monitoring customer payments and collection health.",
    capabilities: [
      "Track invoices",
      "Predict payments",
      "Send reminders",
      "Assess risk",
    ],
    restrictions: ["Cannot write off invoices", "Cannot modify customer data"],
    recentActions: [
      { time: "08:15", action: "Analyzed payment patterns" },
      { time: "08:20", action: "Flagged 4 high-risk accounts" },
    ],
  },
  {
    name: "Procurement Agent",
    emoji: "📋",
    role: "Procurement Manager — Accounts Payable",
    status: "busy" as const,
    mission:
      "Optimizing payment schedule and identifying early payment discounts.",
    capabilities: [
      "Manage bills",
      "Optimize payments",
      "Find savings",
      "Detect duplicates",
    ],
    recentActions: [
      { time: "07:30", action: "Optimized payment schedule" },
      { time: "07:35", action: "Found $8,420 in discounts" },
    ],
  },
  {
    name: "Accounting Agent",
    emoji: "📊",
    role: "Financial Controller — Books & Records",
    status: "active" as const,
    mission: "Preparing month-end close and reviewing journal entries.",
    capabilities: [
      "Post journals",
      "Reconcile accounts",
      "Close periods",
      "Explain entries",
    ],
    restrictions: ["Cannot approve own journals"],
    recentActions: [
      { time: "07:00", action: "Posted depreciation" },
      { time: "07:30", action: "Prepared accruals" },
      { time: "08:00", action: "Generated trial balance" },
    ],
  },
  {
    name: "Tax Agent",
    emoji: "🧾",
    role: "Tax Compliance Officer",
    status: "busy" as const,
    mission: "Preparing Q3 VAT return and monitoring tax deadlines.",
    capabilities: [
      "Prepare filings",
      "Calculate tax",
      "Find deductions",
      "Monitor deadlines",
    ],
    restrictions: ["Cannot file without review"],
    recentActions: [
      { time: "07:15", action: "Calculated VAT liability" },
      { time: "07:45", action: "Found missing deductions" },
    ],
  },
  {
    name: "Audit Agent",
    emoji: "🔍",
    role: "Internal Auditor — Risk & Compliance",
    status: "idle" as const,
    mission:
      "Reviewing transaction patterns for anomalies and compliance issues.",
    capabilities: [
      "Review entries",
      "Find anomalies",
      "Check compliance",
      "Prepare reports",
    ],
    recentActions: [
      { time: "06:00", action: "Reviewed 842 transactions" },
      { time: "06:30", action: "Found 3 exceptions" },
    ],
  },
  {
    name: "Analyst Agent",
    emoji: "📉",
    role: "Financial Analyst — Intelligence & Reports",
    status: "active" as const,
    mission: "Analyzing business performance and preparing board reports.",
    capabilities: [
      "Analyze data",
      "Create reports",
      "Forecast trends",
      "Benchmark performance",
    ],
    recentActions: [
      { time: "08:30", action: "Generated board report" },
      { time: "08:45", action: "Updated revenue forecast" },
    ],
  },
];

export default function AgentsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <Brain className="h-3 w-3" />
            <span>Your AI Finance Team — working 24/7 on your behalf.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-card p-3 col-span-1 sm:col-span-2">
              <h1 className="text-lg font-bold">AI Agent Team</h1>
              <p className="text-xs text-muted-foreground mt-1">
                8 specialized agents managing your entire finance operation.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Active
              </p>
              <p className="text-lg font-bold text-balanced-green mt-1">6</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Tasks Today
              </p>
              <p className="text-lg font-bold text-signal-indigo mt-1">142</p>
            </div>
          </div>

          {/* Command bar */}
          <AICommandBar
            placeholder="Ask your AI team anything..."
            suggestions={[
              "What is my team working on?",
              "Show me each agent's activity",
              "Create a new agent",
              "Delegate cash monitoring",
            ]}
          />
        </div>

        {/* Agent Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {AGENTS.map((agent) => (
            <AgentProfile key={agent.name} {...agent} />
          ))}
        </div>

        {/* Team summary */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold">Your AI Finance Team</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                8 agents · 142 tasks completed today · 98% average confidence
              </p>
            </div>
            <button
              onClick={() =>
                router.push(
                  "/dashboard/chat?initial=Show me the full activity of all AI agents",
                )
              }
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-signal-indigo to-indigo-600 px-3 py-1.5 text-[10px] font-medium text-white hover:shadow-md transition-all"
            >
              View full activity <ArrowRight className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
