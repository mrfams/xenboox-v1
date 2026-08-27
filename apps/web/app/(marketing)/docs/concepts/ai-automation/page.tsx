import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { CodeBlock } from "../../components/code-block";
import { RelatedLinks } from "../../components/related-links";

export default function AiAutomationPage() {
  return (
    <>
      <DocsPageHeader
        title="AI Automation"
        description="Xenboox uses AI agents to automate routine accounting tasks. All AI actions are logged, reversible, and require your approval before posting."
        breadcrumbs={[
          { label: "Core Concepts", href: "/docs/concepts" },
          { label: "AI Automation", href: "/docs/concepts/ai-automation" },
        ]}
      />

      <div className="space-y-8">
        {/* Overview */}
        <section className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>How AI Works in Xenboox</h2>
          <p>
            Xenboox deploys a hierarchical team of 21 AI agents that handle
            everything from day-to-day transaction processing to strategic
            financial analysis. The agents operate in three tiers — worker
            agents execute tasks, department heads supervise, and the CFO agent
            coordinates with you.
          </p>
          <p>
            Every AI action is transparent. You can see exactly what the agent
            did, why it made that decision, and what confidence level it has. If
            confidence drops below a threshold, the agent escalates to a
            supervisor or to you.
          </p>
        </section>

        {/* Agent Hierarchy */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Agent Hierarchy
          </h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Tier 1
                </span>
                <h4 className="text-sm font-medium text-foreground">
                  CFO Agent
                </h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                The strategic coordinator. The CFO agent is the only agent that
                communicates directly with you. It delegates tasks to department
                heads, reviews their outputs, and presents consolidated
                insights. Uses Claude Sonnet for complex reasoning.
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-primary/50/10 px-2.5 py-0.5 text-xs font-medium text-primary ">
                  Tier 2
                </span>
                <h4 className="text-sm font-medium text-foreground">
                  Department Heads
                </h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Controllers, Treasury, Payroll Manager, and Compliance. Each
                oversees a domain and coordinates the worker agents within it.
                They aggregate results, validate consistency, and escalate
                anomalies. Uses Claude Sonnet.
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-balanced-green/10 px-2.5 py-0.5 text-xs font-medium text-balanced-green dark:text-balanced-green">
                  Tier 3
                </span>
                <h4 className="text-sm font-medium text-foreground">
                  Worker Agents
                </h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                16 specialized agents that execute individual tasks: Accounts
                Payable, Accounts Receivable, Banking, Cash, Payroll, Fixed
                Assets, Inventory, Reconciliation, Audit, Expense, Fiscal,
                Compliance, Budget, Mobile Money, Document, and Analytics. Uses
                Claude Haiku for cost efficiency.
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-signal-indigo/10 px-2.5 py-0.5 text-xs font-medium text-signal-indigo dark:text-signal-indigo">
                  Platform
                </span>
                <h4 className="text-sm font-medium text-foreground">
                  Platform Agents
                </h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Reporting, Budget, Analytics, and Document agents provide
                cross-cutting capabilities that serve all tiers.
              </p>
            </div>
          </div>
        </section>

        {/* Communication Pattern */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Communication Pattern
          </h3>
          <CodeBlock
            language="text"
            code={`You → CFO Agent (strategic decisions)
          ↓
  Department Heads (supervision & coordination)
          ↓
  Worker Agents (task execution)
          ↓
  Ledger Agent (final posting — single point of entry)

Rules:
• Workers never talk to each other directly
• Workers report to their department head
• Department heads report to CFO Agent
• CFO Agent is the only agent that talks to humans
• Ledger Agent is the only agent that posts to the general ledger`}
          />
        </section>

        {/* Safety Controls */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Safety Controls
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            AI automation in accounting requires rigorous safety controls.
            Xenboox implements multiple layers of protection:
          </p>
          <div className="mt-4 space-y-4">
            {[
              {
                title: "Confidence Thresholds",
                description:
                  "Every agent action includes a confidence score (0-1). Below 0.7: escalate to supervisor. Below 0.4: escalate to human. No action is taken without sufficient confidence.",
              },
              {
                title: "Human Approval",
                description:
                  "Financial transactions above configurable thresholds require human approval before posting. The review queue surfaces pending actions with full context and one-click approve/reject.",
              },
              {
                title: "Idempotency",
                description:
                  "Every agent operation uses idempotency keys. Retries and network failures never cause duplicate transactions. The idempotency cache tracks completed operations.",
              },
              {
                title: "Audit Trail",
                description:
                  "Every AI action is logged to LangFuse with full context: input, reasoning, output, confidence, execution time, and token usage. Complete traceability for compliance.",
              },
              {
                title: "Entity Isolation",
                description:
                  "Agents are scoped to a single entity. Cross-entity operations are structurally impossible. Each agent execution carries the entity context throughout.",
              },
              {
                title: "Reversibility",
                description:
                  "All AI-posted journal entries are flagged as AI-generated and can be reversed with a single click. The reversal is also logged in the audit trail.",
              },
              {
                title: "Rate Limiting",
                description:
                  "Agent invocations are rate-limited per entity to prevent runaway automation. Configurable limits per plan tier.",
              },
              {
                title: "Circuit Breaker",
                description:
                  "If an agent fails repeatedly, the circuit breaker trips and routes future tasks to a fallback path. Automatic recovery after a cool-down period.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 items-start">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xs text-primary">✓</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {item.title}
                  </h4>
                  <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Chat Interface */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Conversational Interface
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You interact with agents through the built-in chat interface. Ask
            questions in natural language, give commands, and receive insights.
          </p>
          <CodeBlock
            language="text"
            code={`You: "What's our cash position this month?"
→ CFO Agent delegates to Banking Agent
→ Banking Agent queries bank accounts and recent transactions
→ Returns: GHS 45,280 across 3 accounts (down 12% from last month)

You: "Post a journal entry for the office rent"
→ CFO Agent delegates to Ledger Agent
→ Ledger Agent drafts the entry, validates debits = credits
→ Presents for your approval before posting

You: "Run the monthly payroll for July"
→ CFO Agent delegates to Payroll Manager
→ Payroll Manager coordinates with Fiscal Agent for period status
→ Processes payroll calculations, generates payslips
→ Presents summary for approval`}
          />
        </section>

        {/* Observability */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Observability
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Every agent execution is fully observable:
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium text-foreground">
                Live Agent Monitor
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                See real-time agent activity on the dashboard. Active tasks,
                completion rates, and error counts per entity.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium text-foreground">
                Run History
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Full execution history with input/output, reasoning traces,
                token usage, and cost breakdown per agent per entity.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium text-foreground">
                Confidence Tracking
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Per-agent confidence scores over time. Identify agents that
                consistently need human review.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium text-foreground">
                Cost Analytics
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Track AI spend per entity, per agent, per task type. Budget
                alerts when approaching limits.
              </p>
            </div>
          </div>
        </section>

        {/* Related Links */}
        <RelatedLinks
          links={[
            {
              title: "Agent Documentation",
              href: "/docs/agents",
              description: "Detailed docs for all 21 agents",
            },
            {
              title: "CFO Agent",
              href: "/docs/agents/cfo",
              description: "The strategic coordinator",
            },
            {
              title: "Security",
              href: "/docs/security",
              description: "How AI safety is enforced",
            },
          ]}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <Link
            href="/docs/concepts/roles-permissions"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Roles & Permissions
          </Link>
          <Link
            href="/docs/concepts/audit-trail"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Audit Trail
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
