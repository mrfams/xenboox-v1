import {
  Crown,
  TrendingUp,
  BarChart3,
  Lightbulb,
  MessageSquare,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const capabilities = [
  {
    title: "Strategic Planning",
    description:
      "Provides high-level financial strategy, budget recommendations, and long-term planning insights based on your financial data.",
    icon: TrendingUp,
  },
  {
    title: "Financial Analysis",
    description:
      "Analyzes financial statements, identifies trends, and provides actionable insights for business decisions.",
    icon: BarChart3,
  },
  {
    title: "AI Cost Optimization",
    description:
      "Monitors AI agent usage and costs across LLM providers. Recommends model routing optimizations to reduce spending.",
    icon: Lightbulb,
  },
  {
    title: "Executive Reporting",
    description:
      "Generates executive summaries, board reports, and strategic recommendations with high-confidence analysis.",
    icon: MessageSquare,
  },
];

export default function CFOAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="CFO Agent"
        description="The CFO Agent is the strategic command center of Xenboox. It handles high-level financial planning, budget analysis, and coordinates responses from all other agents."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "CFO", href: "/docs/agents/cfo" },
        ]}
        icon={Crown}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The CFO Agent is the top-level strategic agent in Xenboox's
                three-tier agent hierarchy. It serves as the primary interface
                for human users, receiving requests and delegating tasks to
                department heads (Controller, Treasury, Payroll Manager,
                Compliance). The CFO Agent synthesizes information from all
                other agents to provide comprehensive financial insights and
                recommendations. It uses Claude Sonnet for deep reasoning and
                strategic analysis.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Capabilities
          </h2>
          <FeatureGrid features={capabilities} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            How It Works
          </h2>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">Human Request</h3>
                  <p className="text-sm text-muted-foreground">
                    User sends a request through the Chat interface. The CFO
                    Agent analyzes the request context and intent.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">Agent Delegation</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on the request type, the CFO Agent delegates to the
                    appropriate department head or worker agent.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">Response Synthesis</h3>
                  <p className="text-sm text-muted-foreground">
                    The CFO Agent synthesizes responses from multiple agents
                    into a coherent, human-readable response with confidence
                    scoring.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Confidence Scoring
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-3">
                The CFO Agent assigns confidence scores to all outputs:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  <span>
                    <strong>0.7 - 1.0</strong> — High confidence: Actions
                    executed automatically
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>
                    <strong>0.4 - 0.7</strong> — Medium confidence: Escalated to
                    supervisor agent for review
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <span>
                    <strong>Below 0.4</strong> — Low confidence: Escalated to
                    human user for decision
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "What's our current cash position?" • "Show me this quarter's
          financial highlights" • "Compare this month's performance to budget" •
          "What are our top 5 expense categories?"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Controller Agent",
              href: "/docs/agents/controller",
              description: "Period close and oversight",
            },
            {
              title: "Treasury Agent",
              href: "/docs/agents/treasury",
              description: "Cash and treasury management",
            },
            {
              title: "Budget Agent",
              href: "/docs/agents/budget",
              description: "Budget planning and analysis",
            },
            {
              title: "Reporting Agent",
              href: "/docs/agents/reporting",
              description: "Report generation",
            },
          ]}
        />
      </div>
    </>
  );
}
