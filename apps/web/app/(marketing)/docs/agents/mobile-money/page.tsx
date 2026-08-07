import {
  Smartphone,
  Send,
  ArrowLeftRight,
  FileSearch,
  Shield,
  Bell,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const capabilities = [
  {
    title: "Transaction Processing",
    description:
      "Processes incoming and outgoing mobile money transactions. Supports M-Pesa, MTN Mobile Money, Airtel Money, and other major providers.",
    icon: Send,
  },
  {
    title: "Automatic Categorization",
    description:
      "Intelligently categorizes mobile money transactions based on patterns, counterparties, and descriptions. Learns from manual corrections.",
    icon: ArrowLeftRight,
  },
  {
    title: "Reconciliation",
    description:
      "Reconciles mobile money transactions against bank statements and internal records. Aligns digital payments with accounting entries.",
    icon: FileSearch,
  },
  {
    title: "Fraud Monitoring",
    description:
      "Monitors mobile money transactions for suspicious patterns. Flags unusual amounts, frequencies, or counterparties for investigation.",
    icon: Shield,
  },
  {
    title: "Notification Alerts",
    description:
      "Sends real-time alerts for large transactions, low balances, and unusual activity. Supports SMS and in-app notifications.",
    icon: Bell,
  },
];

export default function MobileMoneyAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Mobile Money Agent"
        description="The Mobile Money Agent manages digital payment processing, transaction reconciliation, and fraud monitoring for mobile money accounts."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Mobile Money", href: "/docs/agents/mobile-money" },
        ]}
        icon={Smartphone}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Mobile Money Agent specializes in processing digital payment
                transactions through mobile money platforms. It supports
                multiple providers including M-Pesa, MTN Mobile Money, and
                Airtel Money — the dominant payment rails in African markets.
                The agent automatically processes incoming payments, categorizes
                transactions, reconciles against bank records, and monitors for
                fraudulent activity. It reports to the Treasury Agent and
                integrates with the Ledger Agent for proper accounting
                treatment.
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
            Supported Providers
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">M-Pesa</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Full support for M-Pesa transactions including send/receive,
                  statement import via API, and automatic categorization based
                  on transaction types (B2C, C2B, B2B).
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">MTN Mobile Money</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Support for MTN MoMo transactions including merchant payments,
                  person-to-person transfers, and bulk disbursements with
                  automatic reconciliation.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Airtel Money</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Full integration with Airtel Money for transaction processing,
                  balance inquiries, and statement reconciliation via API.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Transaction Flow
          </h2>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">Receive Transaction</h3>
                  <p className="text-sm text-muted-foreground">
                    Transaction received via API webhook or SMS parsing. Agent
                    extracts amount, sender, reference, and timestamp.
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
                  <h3 className="font-semibold">Classify & Categorize</h3>
                  <p className="text-sm text-muted-foreground">
                    Agent classifies transaction type (payment, transfer,
                    withdrawal, deposit) and assigns accounting categories.
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
                  <h3 className="font-semibold">Match & Reconcile</h3>
                  <p className="text-sm text-muted-foreground">
                    Agent matches transaction against outstanding invoices,
                    purchase orders, or internal records. Flags unmatched items.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold">Post to Ledger</h3>
                  <p className="text-sm text-muted-foreground">
                    Agent requests Ledger Agent to post journal entry.
                    Transaction recorded in mobile money account and GL.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Process incoming M-Pesa payment of 500 GHS" • "Show me today's mobile
          money transactions" • "Reconcile mobile money for January" • "Flag
          unusual transactions this week" • "What's my mobile money balance?"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Mobile Money Module",
              href: "/docs/modules/mobile-money",
              description: "Mobile money management",
            },
            {
              title: "Treasury Agent",
              href: "/docs/agents/treasury",
              description: "Treasury oversight",
            },
            {
              title: "Cash Agent",
              href: "/docs/agents/cash",
              description: "Physical cash management",
            },
            {
              title: "Ledger Agent",
              href: "/docs/agents/ledger",
              description: "Journal posting",
            },
          ]}
        />
      </div>
    </>
  );
}
