import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { DocsPageHeader } from "../../components/docs-page-header"
import { FeatureGrid } from "../../components/feature-grid"
import { InfoCallout } from "../../components/info-callout"
import { RelatedLinks } from "../../components/related-links"
import { Shield, FileText, AlertTriangle, Search, CheckCircle, BookOpen, Calculator } from "lucide-react"

const capabilities = [
  { title: "Tax Calculation", description: "Calculates corporate taxes, VAT/GST, withholding taxes, and other statutory taxes based on applicable regulations and rates.", icon: Calculator },
  { title: "Regulatory Checks", description: "Verifies accounting practices against regulatory requirements. Flags non-compliance issues for remediation.", icon: Search },
  { title: "Filing Preparation", description: "Prepares tax filing data and supporting schedules for statutory submissions. Generates compliance reports.", icon: FileText },
  { title: "Policy Enforcement", description: "Ensures accounting policies are consistently applied across all entities. Monitors policy adherence.", icon: CheckCircle },
  { title: "Audit Support", description: "Prepares audit-ready workpapers and supporting schedules. Responds to audit queries with documentation.", icon: BookOpen },
]

export default function ComplianceAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Compliance Agent"
        description="The Compliance Agent ensures regulatory compliance with tax laws, accounting standards, and organizational policies. It prepares filings and supports audits."
        breadcrumbs={[{ label: "Agents", href: "/docs/agents" }, { label: "Compliance", href: "/docs/agents/compliance" }]}
        icon={Shield}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Compliance Agent is a department head agent responsible for ensuring all accounting activities 
                comply with applicable regulatory requirements. It monitors tax calculations, ensures accounting 
                standards (IFRS/GAAP) are properly applied, and prepares data for statutory submissions. The agent 
                performs continuous compliance checks across all modules and flags issues for remediation. It works 
                closely with all other agents to ensure consistent policy enforcement and maintains audit-ready 
                documentation for all activities.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Capabilities</h2>
          <FeatureGrid features={capabilities} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Compliance Framework</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-sm">Tax Compliance</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Corporate Income Tax</li>
                  <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> VAT / GST / Sales Tax</li>
                  <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Withholding Tax</li>
                  <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Payroll Taxes (PAYE, SSNIT)</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Accounting Standards</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> IFRS compliance checks</li>
                  <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Revenue recognition (IFRS 15)</li>
                  <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Lease accounting (IFRS 16)</li>
                  <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Financial instruments (IFRS 9)</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Internal Controls</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Segregation of duties</li>
                  <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Approval thresholds</li>
                  <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Audit trail integrity</li>
                  <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Entity scoping enforcement</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Audit Trail Requirements</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                The Compliance Agent ensures all financial activities maintain a complete audit trail. Every 
                transaction must record: who performed the action, when it was performed, what changes were made, 
                the source of the transaction, and the approval chain. Confidence scores are attached to all 
                AI-generated entries. The agent validates that no entries bypass the Ledger Agent — the single 
                point of entry for all journal postings.
              </p>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Show compliance status for this period" • "Prepare VAT filing data" • "Check IFRS compliance" • 
          "What tax filings are due this month?" • "Flag compliance issues"
        </InfoCallout>

        <RelatedLinks
          links={[
            { title: "Payroll Manager Agent", href: "/docs/agents/payroll", description: "Payroll tax compliance" },
            { title: "Audit Agent", href: "/docs/agents/audit", description: "Audit and anomaly detection" },
            { title: "Controller Agent", href: "/docs/agents/controller", description: "Close compliance" },
            { title: "CFO Agent", href: "/docs/agents/cfo", description: "Strategic compliance oversight" },
          ]}
        />
      </div>
    </>
  )
}
