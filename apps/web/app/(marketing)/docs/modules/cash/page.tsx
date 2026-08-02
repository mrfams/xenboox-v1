import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import { Wallet, DollarSign, RefreshCw, FileText, Users } from "lucide-react";

const features = [
  {
    title: "Petty Cash Management",
    description:
      "Track petty cash floats, disbursements, and replenishments. Maintain a detailed cash book with opening and closing balances for each float.",
    icon: DollarSign,
  },
  {
    title: "Imprest Float System",
    description:
      "Manage imprest floats with automatic replenishment based on usage and approval workflows. Track float holders and their limits.",
    icon: RefreshCw,
  },
  {
    title: "Cash Books",
    description:
      "Maintain detailed cash books with transaction history, category tracking, and real-time balance updates. Generate cash book reports on demand.",
    icon: FileText,
  },
  {
    title: "Float Reconciliation",
    description:
      "Reconcile cash floats against expenses and receipts. Automated matching against supporting documents and receipts.",
    icon: Wallet,
  },
];

const imprestSteps = [
  {
    step: "1",
    title: "Create Imprest Float",
    description:
      "Establish a float with assigned holder, amount, and purpose. Set replenishment thresholds.",
  },
  {
    step: "2",
    title: "Disburse Funds",
    description:
      "Float holder requests disbursement for approved expenses. Record expense details and attach receipts.",
  },
  {
    step: "3",
    title: "Track Expenses",
    description:
      "Record all expenses against the float. Categorize and link to supporting documentation.",
  },
  {
    step: "4",
    title: "Request Replenishment",
    description:
      "When float reaches threshold, submit replenishment request with expense summary.",
  },
  {
    step: "5",
    title: "Reconcile & Close",
    description:
      "Reconcile float against receipts. Close float when no longer needed or transfer to new holder.",
  },
];

export default function CashDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Cash"
        description="Manage petty cash, imprest floats, and cash books. Track disbursements, replenishments, and reconciliation with supporting documentation."
        breadcrumbs={[
          { label: "Modules", href: "/docs/modules" },
          { label: "Cash", href: "/docs/modules/cash" },
        ]}
        icon={Wallet}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Cash module manages all physical cash operations including
                petty cash funds and imprest floats. It provides complete
                tracking of cash movements from initial float establishment to
                final reconciliation. The module integrates with the Ledger
                Agent for automatic journal entry posting and the Document
                module for receipt attachment and OCR processing.
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
            Imprest Float Workflow
          </h2>
          <div className="space-y-3">
            {imprestSteps.map((item) => (
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

        <InfoCallout type="tip" title="Cash Agent">
          The Cash Agent monitors cash float levels, flags low balances, and can
          automatically initiate replenishment requests. Ask "What are my
          current cash float balances?" or "Show me unreconciled expenses."
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Treasury Module",
              href: "/docs/modules/treasury",
              description: "Bank account management",
            },
            {
              title: "Mobile Money Module",
              href: "/docs/modules/mobile-money",
              description: "Digital payment management",
            },
            {
              title: "Cash Agent",
              href: "/docs/agents/cash",
              description: "AI agent for cash operations",
            },
            {
              title: "Documents Module",
              href: "/docs/modules/documents",
              description: "Receipt OCR and attachment",
            },
          ]}
        />
      </div>
    </>
  );
}
