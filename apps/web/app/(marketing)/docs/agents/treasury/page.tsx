import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import {
  Landmark,
  ArrowRightLeft,
  FileSearch,
  TrendingUp,
  Shield,
  DollarSign,
} from "lucide-react";

const capabilities = [
  {
    title: "Bank Reconciliation",
    description:
      "Automates bank statement reconciliation. Matches transactions using amount, date, and reference algorithms. Flags discrepancies for review.",
    icon: FileSearch,
  },
  {
    title: "Cash Flow Forecasting",
    description:
      "Projects future cash positions based on scheduled payments, receivables, and historical patterns. AI-powered cash flow predictions.",
    icon: TrendingUp,
  },
  {
    title: "Transaction Monitoring",
    description:
      "Continuously monitors bank transactions for anomalies. Flags unusual patterns and potential fraud for investigation.",
    icon: ArrowRightLeft,
  },
  {
    title: "Liquidity Management",
    description:
      "Provides real-time visibility into cash positions across all accounts. Recommends fund transfers to optimize liquidity.",
    icon: DollarSign,
  },
  {
    title: "Payment Processing",
    description:
      "Validates and processes outgoing payments. Ensures sufficient funds and proper authorization before execution.",
    icon: Landmark,
  },
];

export default function TreasuryAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Treasury Agent"
        description="The Treasury Agent manages bank reconciliation, cash flow forecasting, and liquidity optimization. It provides real-time visibility into your cash position."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Treasury", href: "/docs/agents/treasury" },
        ]}
        icon={Landmark}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Treasury Agent is a department head agent responsible for
                all treasury and cash management activities. It oversees bank
                reconciliations, monitors cash positions across accounts, and
                provides cash flow forecasts. The agent uses AI to predict
                future cash positions and recommends optimal fund allocation
                across accounts. It works closely with the Cash and Mobile Money
                agents for comprehensive liquidity management.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Capabilities
          </h2>
          <FeatureGrid features={capabilities} columns={3} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Reconciliation Process
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">1. Import</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Bank statement imported via API or upload. Transaction parsing
                  and categorization.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">2. Auto-Match</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Algorithm matches bank transactions against system records
                  using reference, amount, and date.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">3. Review</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Unmatched items flagged for manual review. Treasury Agent
                  provides match suggestions.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">4. Close</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Reconciliation finalized. Report generated. Journal entries
                  posted for adjustments.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Reconcile bank account ABC" • "Show me my cash position" • "Forecast
          cash for next month" • "Flag unusual transactions" • "What payments
          are pending approval?"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Cash Agent",
              href: "/docs/agents/cash",
              description: "Petty cash management",
            },
            {
              title: "Mobile Money Agent",
              href: "/docs/agents/mobile-money",
              description: "Digital payments",
            },
            {
              title: "Treasury Module",
              href: "/docs/modules/treasury",
              description: "Bank account management",
            },
            {
              title: "CFO Agent",
              href: "/docs/agents/cfo",
              description: "Strategic oversight",
            },
          ]}
        />
      </div>
    </>
  );
}
