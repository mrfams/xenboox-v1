import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { DocsPageHeader } from "../../components/docs-page-header"
import { FeatureGrid } from "../../components/feature-grid"
import { InfoCallout } from "../../components/info-callout"
import { RelatedLinks } from "../../components/related-links"
import { LayoutDashboard, GitBranch, Tag, FileText, Type, Settings } from "lucide-react"

const accountTypes = [
  { type: "Asset", code: "1-xxxx", normal: "Debit", examples: "Cash, Bank, Accounts Receivable, Inventory, Fixed Assets" },
  { type: "Liability", code: "2-xxxx", normal: "Credit", examples: "Accounts Payable, Loans, Accrued Expenses" },
  { type: "Equity", code: "3-xxxx", normal: "Credit", examples: "Share Capital, Retained Earnings, Reserves" },
  { type: "Revenue", code: "4-xxxx", normal: "Credit", examples: "Sales Revenue, Service Fees, Interest Income" },
  { type: "Expense", code: "5-xxxx", normal: "Debit", examples: "Salaries, Rent, Utilities, Cost of Goods Sold" },
  { type: "Other", code: "6-xxxx", normal: "Variable", examples: "Gains, Losses, Suspense, Clearing Accounts" },
]

const features = [
  { title: "Account Structure", description: "Hierarchical account structure with types, subtypes, and account codes. Flexible coding system supports up to 6-digit account codes.", icon: GitBranch },
  { title: "Account Types", description: "Six primary account types: Asset, Liability, Equity, Revenue, Expense, and Other. Each with configurable subtypes and default normal balance.", icon: Type },
  { title: "Account Management", description: "Create, edit, and deactivate accounts. Set default accounts for transactions, auto-posting rules, and reporting categories.", icon: Settings },
  { title: "Import/Export", description: "Import chart of accounts from CSV/Excel. Export for audit or migration purposes. Bulk account updates and reclassification.", icon: FileText },
]

export default function COADocPage() {
  return (
    <>
      <DocsPageHeader
        title="Chart of Accounts"
        description="Configure your account structure, types, and coding system. The Chart of Accounts is the foundation of your financial reporting."
        breadcrumbs={[{ label: "Modules", href: "/docs/modules" }, { label: "COA", href: "/docs/modules/coa" }]}
        icon={LayoutDashboard}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Chart of Accounts (COA) is the backbone of your accounting system. It defines the account 
                structure used to categorize all financial transactions. Xenboox provides a flexible COA system 
                with six primary account types, configurable subtypes, and a hierarchical coding system that 
                supports up to 6-digit account codes. The COA Agent helps maintain account mappings and suggests 
                account structures based on your business type.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Key Features</h2>
          <FeatureGrid features={features} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Account Types</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Code Range</th>
                  <th className="px-4 py-3 text-left font-medium">Normal Balance</th>
                  <th className="px-4 py-3 text-left font-medium">Examples</th>
                </tr>
              </thead>
              <tbody>
                {accountTypes.map((row) => (
                  <tr key={row.type} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{row.type}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                    <td className="px-4 py-3">{row.normal}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <InfoCallout type="info" title="Default Account Mapping">
          Each entity comes with a pre-configured chart of accounts template based on IFRS standards. 
          You can customize accounts, add new ones, or import your existing COA from other systems.
        </InfoCallout>

        <RelatedLinks
          links={[
            { title: "Journal Module", href: "/docs/modules/journal", description: "Journal entry creation" },
            { title: "Reports Module", href: "/docs/modules/reports", description: "Financial statement generation" },
            { title: "Organizations Module", href: "/docs/modules/organizations", description: "Entity and account structure" },
          ]}
        />
      </div>
    </>
  )
}
