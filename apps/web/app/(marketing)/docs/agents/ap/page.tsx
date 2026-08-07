import { Truck, FileText, CheckCircle, Search, Calendar } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const capabilities = [
  {
    title: "Invoice Processing",
    description:
      "Automatically processes supplier invoices using OCR and AI. Extracts key fields including amounts, dates, supplier details, and line items with high accuracy.",
    icon: FileText,
  },
  {
    title: "Payment Scheduling",
    description:
      "Analyzes payment terms and due dates to optimize payment scheduling. Ensures early payment discounts are captured and late payments are avoided.",
    icon: Calendar,
  },
  {
    title: "Three-Way Matching",
    description:
      "Matches invoices against purchase orders and goods receipt notes. Flags discrepancies for human review with detailed variance analysis.",
    icon: CheckCircle,
  },
  {
    title: "Approval Routing",
    description:
      "Intelligently routes invoices through approval workflows based on amount thresholds, categories, and organizational hierarchy.",
    icon: Search,
  },
  {
    title: "Vendor Management",
    description:
      "Maintains vendor profiles, tracks payment history, and provides insights on vendor performance and payment patterns.",
    icon: Truck,
  },
];

export default function APAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="AP Agent"
        description="The AP Agent automates invoice processing, payment scheduling, and vendor management. It handles the complete procure-to-pay cycle with AI-powered intelligence."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "AP", href: "/docs/agents/ap" },
        ]}
        icon={Truck}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The AP Agent is a worker agent specializing in accounts payable
                operations. It processes incoming supplier invoices using OCR
                and AI data extraction, matches them against purchase orders and
                goods receipts, routes them through approval workflows, and
                schedules payments according to terms. The agent integrates with
                the Ledger Agent for automatic journal creation and with the
                Cash/Treasury modules for payment execution. It reports to the
                Controller Agent during month-end close.
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
            Three-Way Matching Process
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Purchase Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  The PO defines what was ordered: items, quantities, and agreed
                  prices. The agent validates the PO exists and is approved.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Goods Receipt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  The goods receipt confirms what was actually received. The
                  agent checks quantities and condition against the PO.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Invoice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  The supplier invoice states what is to be paid. The agent
                  matches amounts, quantities, and totals against PO and
                  receipt.
                </p>
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
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  <span>
                    <strong>&ge; 0.9</strong> — Auto-match and approve: Invoice
                    processed without human intervention
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>
                    <strong>0.7 - 0.9</strong> — Flag for review: Minor
                    discrepancies flagged, auto-routed to approver
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <span>
                    <strong>&lt; 0.7</strong> — Escalate to AP team: Significant
                    discrepancies requiring manual intervention
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Process invoice INV-2024-001" • "What invoices are due this week?" •
          "Show me overdue supplier payments" • "Match PO-123 with invoice
          INV-456" • "Approve payment for invoice INV-789"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "AP Module",
              href: "/docs/modules/ap",
              description: "Accounts Payable module",
            },
            {
              title: "Controller Agent",
              href: "/docs/agents/controller",
              description: "Close oversight",
            },
            {
              title: "AR Agent",
              href: "/docs/agents/ar",
              description: "Accounts Receivable agent",
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
