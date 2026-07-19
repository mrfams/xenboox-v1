import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { DocsPageHeader } from "../../components/docs-page-header"
import { FeatureGrid } from "../../components/feature-grid"
import { InfoCallout } from "../../components/info-callout"
import { RelatedLinks } from "../../components/related-links"
import { Calendar, Lock, CheckCircle, AlertTriangle, ArrowRight, FileText } from "lucide-react"

const features = [
  { title: "Period Management", description: "Define and manage fiscal periods for each entity. Support for monthly, quarterly, and annual periods with customizable start dates.", icon: Calendar },
  { title: "Opening/Closing", description: "Automated period opening and closing workflows. Lock periods to prevent further postings once closed.", icon: Lock },
  { title: "Year-End Close", description: "Comprehensive year-end closing process including income summary, retained earnings transfer, and opening balance creation.", icon: CheckCircle },
  { title: "Period Locking", description: "Granular period locking at entity level. Configurable lock dates prevent unauthorized postings to closed periods.", icon: AlertTriangle },
]

const closeSteps = [
  { step: "1", title: "Review Unposted Entries", description: "Ensure all journal entries for the period are posted. Review and approve pending entries." },
  { step: "2", title: "Run Trial Balance", description: "Generate trial balance for the period. Verify debits equal credits across all accounts." },
  { step: "3", title: "Reconcile Accounts", description: "Reconcile bank accounts, receivables, payables, and other balance sheet accounts." },
  { step: "4", title: "Post Adjustments", description: "Record accruals, prepayments, depreciation, and other period-end adjustments." },
  { step: "5", title: "Close Period", description: "Lock the period. Income statement accounts reset for the next period. Retained earnings updated." },
]

export default function FiscalDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Fiscal Periods"
        description="Manage fiscal periods, closing workflows, and period locking. Ensure accurate period-end closes with automated validation."
        breadcrumbs={[{ label: "Modules", href: "/docs/modules" }, { label: "Fiscal", href: "/docs/modules/fiscal" }]}
        icon={Calendar}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Fiscal Periods module governs the accounting period structure and closing workflow. It ensures 
                that financial data is properly segmented into periods, prevents unauthorized postings to closed 
                periods, and automates the month-end and year-end close processes. The Controller Agent oversees 
                the close checklist and validates that all steps are completed before periods are locked.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Key Features</h2>
          <FeatureGrid features={features} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Month-End Close Workflow</h2>
          <div className="space-y-3">
            {closeSteps.map((item) => (
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

        <InfoCallout type="warning" title="Important">
          Once a period is closed and locked, no new entries can be posted to it. Ensure all necessary 
          adjustments are completed before closing a period. The Controller Agent maintains a close checklist 
          to track completion status.
        </InfoCallout>

        <RelatedLinks
          links={[
            { title: "Journal Module", href: "/docs/modules/journal", description: "Journal entries and posting" },
            { title: "Controller Agent", href: "/docs/agents/controller", description: "AI agent for period close" },
            { title: "Fiscal Agent", href: "/docs/agents/fiscal", description: "AI agent for fiscal management" },
            { title: "Reports Module", href: "/docs/modules/reports", description: "Trial balance and financial reports" },
          ]}
        />
      </div>
    </>
  )
}
