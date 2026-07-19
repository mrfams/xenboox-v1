import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { DocsPageHeader } from "../../components/docs-page-header"
import { FeatureGrid } from "../../components/feature-grid"
import { InfoCallout } from "../../components/info-callout"
import { RelatedLinks } from "../../components/related-links"
import { BarChart3, Calculator, Calendar, RefreshCw, FileText, TrendingDown } from "lucide-react"

const features = [
  { title: "Asset Register", description: "Maintain a complete register of fixed assets with details including purchase date, cost, location, department, and custodian.", icon: FileText },
  { title: "Depreciation Schedules", description: "Automatically calculate depreciation using straight-line, reducing balance, or sum-of-years-digits methods. Monthly depreciation entries auto-posted.", icon: Calculator },
  { title: "Asset Lifecycle", description: "Track assets from acquisition through capitalization, depreciation, maintenance, and eventual disposal or write-off.", icon: RefreshCw },
  { title: "Disposal Processing", description: "Record asset disposals with gain/loss calculations. Generate journal entries for asset retirement.", icon: TrendingDown },
  { title: "Tax Depreciation", description: "Separate tax depreciation schedules alongside book depreciation. Support for capital allowances and investment incentives.", icon: BarChart3 },
]

const depreciationMethods = [
  { method: "Straight-Line", formula: "(Cost - Residual Value) / Useful Life", use: "Assets with consistent benefit over time (buildings, furniture)" },
  { method: "Reducing Balance", formula: "Net Book Value × Depreciation Rate", use: "Assets with higher early-year value (vehicles, equipment)" },
  { method: "Sum-of-Years-Digits", formula: "(Cost - Residual Value) × (Remaining Life / SYD)", use: "Accelerated depreciation for tax optimization" },
]

export default function FixedAssetsDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Fixed Assets"
        description="Manage fixed asset registers, depreciation schedules, and disposal processing. Support for multiple depreciation methods and tax reporting."
        breadcrumbs={[{ label: "Modules", href: "/docs/modules" }, { label: "Fixed Assets", href: "/docs/modules/fixed-assets" }]}
        icon={BarChart3}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Fixed Assets module manages the complete lifecycle of capital assets from acquisition through 
                capitalization, depreciation, and disposal. It supports multiple depreciation methods for both 
                book and tax purposes, automated monthly depreciation posting, and comprehensive asset reporting. 
                The Fixed Assets Agent monitors asset registers and flags assets for impairment review.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Key Features</h2>
          <FeatureGrid features={features} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Depreciation Methods</h2>
          <div className="space-y-3">
            {depreciationMethods.map((item) => (
              <Card key={item.method}>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{item.method}</h3>
                  <p className="text-sm font-mono text-muted-foreground mt-1">{item.formula}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.use}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Asset Lifecycle</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">1. Acquisition</CardTitle></CardHeader>
              <CardContent><p className="text-xs text-muted-foreground">Record purchase cost, date, and supplier details</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">2. Capitalization</CardTitle></CardHeader>
              <CardContent><p className="text-xs text-muted-foreground">Capitalize asset and begin depreciation</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">3. Depreciation</CardTitle></CardHeader>
              <CardContent><p className="text-xs text-muted-foreground">Monthly depreciation auto-posted to ledger</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">4. Disposal</CardTitle></CardHeader>
              <CardContent><p className="text-xs text-muted-foreground">Record sale, retirement, or write-off with gain/loss</p></CardContent>
            </Card>
          </div>
        </section>

        <InfoCallout type="tip" title="Fixed Assets Agent">
          The Fixed Assets Agent tracks asset registers, calculates depreciation, and alerts on assets due for 
          impairment review. Ask "Show me fully depreciated assets" or "What's the next depreciation run date?"
        </InfoCallout>

        <RelatedLinks
          links={[
            { title: "Inventory Module", href: "/docs/modules/inventory", description: "Stock and inventory management" },
            { title: "Journal Module", href: "/docs/modules/journal", description: "Depreciation journal entries" },
            { title: "Fixed Assets Agent", href: "/docs/agents/fixed-assets", description: "AI agent for asset management" },
            { title: "Compliance Agent", href: "/docs/agents/compliance", description: "Tax depreciation compliance" },
          ]}
        />
      </div>
    </>
  )
}
