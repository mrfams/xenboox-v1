import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import {
  CreditCard,
  FileText,
  Send,
  Bell,
  CheckCircle,
  Users,
} from "lucide-react";

const capabilities = [
  {
    title: "Invoice Generation",
    description:
      "Creates sales invoices from orders or manually. Supports line items, discounts, taxes, and custom invoice templates with automatic numbering.",
    icon: FileText,
  },
  {
    title: "Payment Reminders",
    description:
      "Automatically sends payment reminders to customers based on configurable schedules. Escalates overdue accounts with increasingly urgent notifications.",
    icon: Bell,
  },
  {
    title: "Cash Application",
    description:
      "Matches incoming payments against outstanding invoices. Handles partial payments, overpayments, and multi-invoice payment allocations.",
    icon: CheckCircle,
  },
  {
    title: "Credit Management",
    description:
      "Tracks customer credit limits, payment history, and aging. Flags accounts that exceed credit thresholds for review.",
    icon: Users,
  },
  {
    title: "Dunning Management",
    description:
      "Manages the complete collections process with automated dunning letters, escalation workflows, and customer communication tracking.",
    icon: Send,
  },
];

export default function ARAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="AR Agent"
        description="The AR Agent manages customer invoices, payment collections, and credit management. It automates the order-to-cash cycle with intelligent cash application."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "AR", href: "/docs/agents/ar" },
        ]}
        icon={CreditCard}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The AR Agent specializes in accounts receivable operations. It
                manages the complete order-to-cash cycle from invoice generation
                through payment collection and cash application. The agent
                automates payment reminders, handles dunning processes, and
                provides real-time visibility into receivables aging. It
                integrates with the Ledger Agent for automatic revenue
                recognition and with the Treasury module for payment
                reconciliation.
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
            Collections Workflow
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" />
                  0-30 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Automatic payment reminders sent at configurable intervals.
                  Gentle reminders with invoice details and payment links.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Send className="h-4 w-4 text-orange-500" />
                  31-60 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Escalated notifications with late payment fees. Dunning
                  letters sent via email and SMS. AR Team notified.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-red-500" />
                  61+ Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Account flagged for collections. Automated escalation to
                  collections team or agency. Credit hold recommended.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Cash Application Logic
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">
                        Scenario
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Match Method
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-3">
                        Exact amount, single invoice
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Reference match
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-600 font-medium">High</span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Partial payment</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Amount + customer
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-amber-600 font-medium">
                          Medium
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Multi-invoice payment</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        AI allocation algorithm
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-amber-600 font-medium">
                          Medium
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Overpayment</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Customer credit memo
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-600 font-medium">High</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Create invoice for Customer ABC" • "Show me overdue invoices" •
          "Match payment of $500 to invoice INV-100" • "What's the aging report
          for Q3?" • "Send payment reminders for this week"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "AR Module",
              href: "/docs/modules/ar",
              description: "Accounts Receivable module",
            },
            {
              title: "AP Agent",
              href: "/docs/agents/ap",
              description: "Accounts Payable agent",
            },
            {
              title: "Treasury Agent",
              href: "/docs/agents/treasury",
              description: "Payment reconciliation",
            },
            {
              title: "Ledger Agent",
              href: "/docs/agents/ledger",
              description: "Revenue posting",
            },
          ]}
        />
      </div>
    </>
  );
}
