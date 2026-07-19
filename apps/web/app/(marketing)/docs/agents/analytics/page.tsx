import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { DocsPageHeader } from "../../components/docs-page-header"
import { FeatureGrid } from "../../components/feature-grid"
import { InfoCallout } from "../../components/info-callout"
import { RelatedLinks } from "../../components/related-links"
import { BarChart3, TrendingUp, AlertTriangle, Lightbulb, DollarSign, Zap } from "lucide-react"

const capabilities = [
  { title: "Usage Analytics", description: "Monitors platform usage metrics across all modules. Tracks user activity, feature adoption, and performance trends.", icon: BarChart3 },
  { title: "Spend Analysis", description: "Analyzes AI agent usage costs across LLM providers (Claude Sonnet, Haiku). Identifies cost optimization opportunities.", icon: DollarSign },
  { title: "Anomaly Detection", description: "Detects unusual patterns in financial data and platform usage. Flags anomalies for investigation to prevent fraud or errors.", icon: AlertTriangle },
  { title: "Predictive Insights", description: "Uses AI to predict future trends based on historical data. Provides cash flow forecasts and revenue projections.", icon: TrendingUp },
  { title: "Cost Optimization", description: "Recommends model routing optimizations to reduce AI costs. Balances response quality with operational expense.", icon: Lightbulb },
]

export default function AnalyticsAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Analytics Agent"
        description="The Analytics Agent monitors platform usage, analyzes costs across AI models, detects anomalies, and provides predictive insights for business intelligence."
        breadcrumbs={[{ label: "Agents", href: "/docs/agents" }, { label: "Analytics", href: "/docs/agents/analytics" }]}
        icon={BarChart3}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Analytics Agent provides business intelligence and platform analytics for Xenboox. It 
                monitors usage metrics across all modules, tracks AI agent costs across different LLM providers, 
                detects anomalies in both financial data and platform behavior, and provides predictive insights. 
                The agent helps organizations optimize their AI costs while maintaining high-quality responses. 
                It works with the Reporting Agent to provide analytical context to financial reports.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Capabilities</h2>
          <FeatureGrid features={capabilities} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">AI Cost Management</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Model Routing Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Routes queries to the most cost-effective LLM model that meets the quality requirements. 
                  Simple queries use Haiku (lower cost), while complex strategic analysis uses Sonnet.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cost Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Tracks AI costs by agent, module, entity, and user. Provides chargeback data for 
                  multi-tenant deployments. Identifies cost trends and optimization opportunities.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Dashboards & Reports</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Dashboard</th>
                  <th className="px-4 py-3 text-left font-medium">Metrics Tracked</th>
                  <th className="px-4 py-3 text-left font-medium">Refresh</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="px-4 py-3">Usage Overview</td><td className="px-4 py-3 text-muted-foreground">Active users, queries, documents processed, entries created</td><td className="px-4 py-3 text-muted-foreground">Real-time</td></tr>
                <tr className="border-b"><td className="px-4 py-3">AI Cost Dashboard</td><td className="px-4 py-3 text-muted-foreground">Cost per model, per agent, per entity, trend analysis</td><td className="px-4 py-3 text-muted-foreground">Daily</td></tr>
                <tr className="border-b"><td className="px-4 py-3">Anomaly Monitor</td><td className="px-4 py-3 text-muted-foreground">Unusual transactions, unusual usage spikes, access anomalies</td><td className="px-4 py-3 text-muted-foreground">Real-time</td></tr>
                <tr><td className="px-4 py-3">Model Comparison</td><td className="px-4 py-3 text-muted-foreground">Response quality, latency, cost comparison across models</td><td className="px-4 py-3 text-muted-foreground">Weekly</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Show me platform usage this month" • "What are our AI costs this quarter?" • "Detect anomalies in last week's transactions" • 
          "Compare model performance" • "Forecast next month's usage"
        </InfoCallout>

        <RelatedLinks
          links={[
            { title: "Analytics Module", href: "/docs/modules/analytics", description: "Analytics features" },
            { title: "Reporting Agent", href: "/docs/agents/reporting", description: "Report generation" },
            { title: "Budget Agent", href: "/docs/agents/budget", description: "Budget analysis" },
            { title: "CFO Agent", href: "/docs/agents/cfo", description: "Strategic cost oversight" },
          ]}
        />
      </div>
    </>
  )
}
