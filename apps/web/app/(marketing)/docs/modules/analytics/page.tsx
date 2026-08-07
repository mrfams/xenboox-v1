import {
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Bot,
  Users,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const features = [
  {
    title: "Usage Metrics",
    description:
      "Track platform usage including active users, transactions processed, document uploads, and AI agent interactions.",
    icon: Users,
  },
  {
    title: "Spend Analytics",
    description:
      "Monitor API spending across LLM providers. Compare costs between Claude, GPT, and other models. Set budget alerts.",
    icon: DollarSign,
  },
  {
    title: "AI Model Comparison",
    description:
      "Compare performance and cost across different AI models. A/B test responses and track quality metrics.",
    icon: Bot,
  },
  {
    title: "Trend Analysis",
    description:
      "Identify trends in financial data, usage patterns, and operational metrics. AI-powered anomaly detection.",
    icon: TrendingUp,
  },
  {
    title: "Alert Configuration",
    description:
      "Set up custom alerts for unusual activity, spending thresholds, and performance anomalies.",
    icon: AlertTriangle,
  },
];

export default function AnalyticsDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Analytics"
        description="Track platform usage, monitor AI costs, compare model performance, and configure alerts. Data-driven insights for platform optimization."
        breadcrumbs={[
          { label: "Modules", href: "/docs/modules" },
          { label: "Analytics", href: "/docs/modules/analytics" },
        ]}
        icon={BarChart3}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Analytics module provides comprehensive visibility into
                platform usage, AI model performance, and spending across LLM
                providers. Track key metrics, compare AI model costs and
                quality, and set up proactive alerts for anomalies. The
                Analytics Agent provides natural language insights and
                recommendations for optimizing platform usage and reducing
                costs.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Key Features
          </h2>
          <FeatureGrid features={features} columns={3} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            AI Model Comparison
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-3">
                Xenboox supports a multi-LLM architecture. The Analytics module
                allows you to:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>Compare Costs</strong> — Track per-model spending
                    across Claude Sonnet, Haiku, GPT-4, and custom models
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>Monitor Quality</strong> — Track response quality
                    scores, user feedback, and error rates per model
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>Optimize Routing</strong> — Automatically route
                    requests to the most cost-effective model based on task
                    complexity
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>Set Budgets</strong> — Configure monthly spending
                    limits and receive alerts when approaching thresholds
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Analytics Agent">
          The Analytics Agent provides natural language insights about your
          platform usage. Ask "Show me my AI spending this month" or "What's the
          most cost-effective model for invoice processing?"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Admin Dashboard",
              href: "/admin",
              description: "Admin overview and management",
            },
            {
              title: "Alerts",
              href: "/admin/alerts",
              description: "Alert configuration and history",
            },
            {
              title: "Analytics Agent",
              href: "/docs/agents/analytics",
              description: "AI agent for analytics",
            },
            {
              title: "Reports Module",
              href: "/docs/modules/reports",
              description: "Financial reporting",
            },
          ]}
        />
      </div>
    </>
  );
}
