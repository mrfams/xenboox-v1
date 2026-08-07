import { Truck, FileText, CreditCard, CheckCircle, Users } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const features = [
  {
    title: "Supplier Management",
    description:
      "Maintain a comprehensive supplier database with contact details, payment terms, tax information, and transaction history. Organize suppliers by category and status.",
    icon: Users,
  },
  {
    title: "Purchase Orders",
    description:
      "Create and track purchase orders with line-item details, quantities, prices, and delivery schedules. Link POs to invoices for automated matching.",
    icon: FileText,
  },
  {
    title: "Invoice Processing",
    description:
      "Capture supplier invoices manually or via document upload with OCR. Automate approval workflows with configurable routing rules and thresholds.",
    icon: CreditCard,
  },
  {
    title: "Payment Management",
    description:
      "Schedule and process payments to suppliers. Support for bank transfers, mobile money, and checks. Automate payment runs with batch processing.",
    icon: CheckCircle,
  },
];

const workflowSteps = [
  {
    step: "1",
    title: "Create Supplier",
    description:
      "Add supplier details including name, contact information, tax ID, payment terms, and default account mappings.",
  },
  {
    step: "2",
    title: "Issue Purchase Order",
    description:
      "Create a PO with line items, quantities, and agreed prices. Send to supplier for acknowledgment.",
  },
  {
    step: "3",
    title: "Receive Invoice",
    description:
      "Supplier sends invoice. Match against PO for three-way matching (PO → Goods Receipt → Invoice).",
  },
  {
    step: "4",
    title: "Approval Workflow",
    description:
      "Route invoice through configurable approval chain based on amount, category, or department.",
  },
  {
    step: "5",
    title: "Schedule Payment",
    description:
      "Approve invoice for payment. Schedule payment based on due date or payment terms.",
  },
  {
    step: "6",
    title: "Process Payment",
    description:
      "Execute payment via selected method. Update invoice status to Paid. Record transaction in ledger.",
  },
];

export default function APDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Accounts Payable"
        description="Manage supplier relationships, purchase orders, invoices, and payments. The AP module streamlines your procure-to-pay workflow with automated approval routing and AI-powered invoice processing."
        breadcrumbs={[
          { label: "Modules", href: "/docs/modules" },
          { label: "AP", href: "/docs/modules/ap" },
        ]}
        icon={Truck}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Accounts Payable (AP) module manages all aspects of your
                outgoing payments. From supplier onboarding to payment
                execution, the module provides end-to-end visibility into your
                payable obligations. AI agents automate invoice data capture,
                approval routing, and payment scheduling, reducing manual effort
                and minimizing errors. The module integrates with the Ledger
                Agent for automatic journal entry creation and with the Cash
                module for payment execution.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Key Features
          </h2>
          <FeatureGrid features={features} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Procure-to-Pay Workflow
          </h2>
          <div className="space-y-3">
            {workflowSteps.map((item) => (
              <Card key={item.step}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <InfoCallout type="tip" title="AP Agent">
          The AP Agent can automatically process incoming invoices, match them
          against purchase orders, and schedule payments. Use the Chat interface
          to ask questions like "What invoices are due this week?" or "Show me
          overdue supplier payments."
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "AR Module",
              href: "/docs/modules/ar",
              description: "Accounts Receivable — manage customer invoices",
            },
            {
              title: "Cash Module",
              href: "/docs/modules/cash",
              description: "Cash and payment management",
            },
            {
              title: "AP Agent",
              href: "/docs/agents/ap",
              description: "AI agent for invoice processing",
            },
            {
              title: "Chart of Accounts",
              href: "/docs/modules/coa",
              description: "Account structure and coding",
            },
          ]}
        />
      </div>
    </>
  );
}
