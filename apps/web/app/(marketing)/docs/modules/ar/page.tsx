import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { DocsPageHeader } from "../../components/docs-page-header"
import { FeatureGrid } from "../../components/feature-grid"
import { InfoCallout } from "../../components/info-callout"
import { RelatedLinks } from "../../components/related-links"
import { CreditCard, Users, FileText, Receipt, TrendingUp, Bell } from "lucide-react"

const features = [
  { title: "Customer Management", description: "Maintain a comprehensive customer database with contact details, credit limits, payment terms, and transaction history. Segment customers for targeted collections.", icon: Users },
  { title: "Sales Invoices", description: "Create and manage sales invoices with line-item details, taxes, discounts, and payment schedules. Support for recurring invoices and credit notes.", icon: FileText },
  { title: "Payment Collection", description: "Record and reconcile customer payments across multiple channels including bank transfers, mobile money, and checks. Automated payment allocation to open invoices.", icon: Receipt },
  { title: "Aging & Collections", description: "Monitor accounts receivable aging with real-time dashboards. Automated payment reminders and dunning letters. Prioritize collections based on aging and amount.", icon: TrendingUp },
  { title: "Credit Management", description: "Set customer credit limits, monitor credit exposure, and manage credit holds. Automated alerts for approaching credit limits.", icon: Bell },
]

const workflowSteps = [
  { step: "1", title: "Create Customer", description: "Add customer details including name, contact information, credit terms, and tax registration numbers." },
  { step: "2", title: "Issue Sales Invoice", description: "Create invoice with line items, quantities, prices, and applicable taxes. Send to customer via email or portal." },
  { step: "3", title: "Track Payments", description: "Monitor incoming payments. Automatically match payments to open invoices using reference numbers." },
  { step: "4", title: "Manage Collections", description: "Automated dunning for overdue invoices. Escalate to collections based on configurable rules." },
  { step: "5", title: "Reconciliation", description: "Reconcile payments with bank statements. Generate aging reports and cash flow forecasts." },
]

export default function ARDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Accounts Receivable"
        description="Manage customer relationships, sales invoices, payments, and collections. The AR module provides end-to-end visibility into your receivables with automated payment matching and collections workflows."
        breadcrumbs={[{ label: "Modules", href: "/docs/modules" }, { label: "AR", href: "/docs/modules/ar" }]}
        icon={CreditCard}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Accounts Receivable (AR) module manages all aspects of your incoming payments. From customer 
                onboarding to payment reconciliation, the module provides real-time visibility into your receivables 
                position. The AR Agent automates invoice generation, payment reminders, and dunning processes, 
                while the aging dashboard helps you prioritize collections efforts and manage cash flow effectively.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Key Features</h2>
          <FeatureGrid features={features} columns={3} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Order-to-Cash Workflow</h2>
          <div className="space-y-3">
            {workflowSteps.map((item) => (
              <Card key={item.step}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">{item.step}</div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <InfoCallout type="tip" title="AR Agent">
          The AR Agent can automatically generate invoices, send payment reminders, and provide real-time 
          aging analysis. Try asking "Which customers have overdue invoices?" or "Send payment reminders for all invoices due in 3 days."
        </InfoCallout>

        <RelatedLinks
          links={[
            { title: "AP Module", href: "/docs/modules/ap", description: "Accounts Payable" },
            { title: "Treasury Module", href: "/docs/modules/treasury", description: "Bank reconciliation and cash management" },
            { title: "AR Agent", href: "/docs/agents/ar", description: "AI agent for invoice and payment management" },
            { title: "Reports Module", href: "/docs/modules/reports", description: "Financial reporting and analysis" },
          ]}
        />
      </div>
    </>
  )
}
