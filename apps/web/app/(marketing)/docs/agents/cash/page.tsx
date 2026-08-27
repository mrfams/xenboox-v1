import {
  Wallet,
  DollarSign,
  RefreshCw,
  FileText,
  AlertTriangle,
  Search,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const capabilities = [
  {
    title: "Petty Cash Management",
    description:
      "Monitors petty cash floats, tracks disbursements, and alerts when replenishment is needed. Provides real-time visibility into cash positions.",
    icon: DollarSign,
  },
  {
    title: "Imprest Float Oversight",
    description:
      "Oversees imprest float operations including float creation, holder assignment, and replenishment workflows with automatic threshold monitoring.",
    icon: RefreshCw,
  },
  {
    title: "Expense Tracking",
    description:
      "Categorizes and tracks cash expenses against budgets. Flags unusual spending patterns and potential policy violations.",
    icon: FileText,
  },
  {
    title: "Reconciliation Support",
    description:
      "Assists with cash float reconciliation by matching expenses against receipts and supporting documentation.",
    icon: Search,
  },
  {
    title: "Fraud Detection",
    description:
      "Analyzes cash transaction patterns for anomalies. Flags unusual disbursements, duplicate claims, and out-of-policy spending.",
    icon: AlertTriangle,
  },
];

export default function CashAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Cash Agent"
        description="The Cash Agent manages petty cash operations, imprest floats, and expense tracking. It provides real-time visibility into cash positions and detects anomalies."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Cash", href: "/docs/agents/cash" },
        ]}
        icon={Wallet}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Cash Agent is a worker agent specializing in physical cash
                management operations. It monitors petty cash floats and imprest
                accounts, tracks disbursements and replenishments, and provides
                real-time visibility into cash positions. The agent helps
                maintain proper segregation of duties by automatically routing
                replenishment requests through approval workflows. It reports to
                the Treasury Agent and integrates with the Ledger Agent for
                automatic journal posting of cash transactions.
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
            Float Lifecycle
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-balanced-green" />
                  Establish
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Create float with assigned holder, approved amount, and
                  purpose. Record initial disbursement.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  Operate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Holder makes approved disbursements. Agent tracks all
                  transactions against float balance.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-attention-amber" />
                  Replenish
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  When threshold reached, agent initiates replenishment with
                  expense summary and approvals.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-paper-2/600" />
                  Close
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Reconcile final balance against receipts. Return remaining
                  cash. Generate close report.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "What are my current cash float balances?" • "Show me unreconciled
          expenses" • "Initiate replenishment for float F-001" • "Flag unusual
          disbursements this week" • "Create a new imprest float"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Cash Module",
              href: "/docs/modules/cash",
              description: "Petty cash management",
            },
            {
              title: "Treasury Agent",
              href: "/docs/agents/treasury",
              description: "Treasury oversight",
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
          ]}
        />
      </div>
    </>
  );
}
