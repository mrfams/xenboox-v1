import {
  BarChart3,
  Calculator,
  RefreshCw,
  FileText,
  AlertTriangle,
  Building,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const capabilities = [
  {
    title: "Asset Lifecycle Management",
    description:
      "Tracks assets from acquisition through depreciation to disposal. Maintains complete asset register with all supporting documentation.",
    icon: Building,
  },
  {
    title: "Depreciation Calculation",
    description:
      "Calculates depreciation using straight-line, declining balance, or units of production methods. Supports component depreciation.",
    icon: Calculator,
  },
  {
    title: "Disposal Processing",
    description:
      "Handles asset disposals including sale, scrapping, or donation. Calculates gain/loss on disposal and posts adjusting entries.",
    icon: RefreshCw,
  },
  {
    title: "Impairment Testing",
    description:
      "Reviews assets for impairment indicators. Calculates recoverable amounts and recommends impairment adjustments when needed.",
    icon: AlertTriangle,
  },
  {
    title: "Tax Depreciation",
    description:
      "Maintains separate tax depreciation schedules. Tracks differences between book and tax depreciation for deferred tax calculations.",
    icon: FileText,
  },
];

export default function FixedAssetsAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Fixed Assets Agent"
        description="The Fixed Assets Agent manages the complete asset lifecycle including acquisition, depreciation, revaluation, and disposal."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Fixed Assets", href: "/docs/agents/fixed-assets" },
        ]}
        icon={BarChart3}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Fixed Assets Agent manages the complete lifecycle of fixed
                assets. It tracks assets from initial recognition through
                depreciation to eventual disposal. The agent supports multiple
                depreciation methods, maintains separate tax depreciation
                schedules, and performs impairment testing. It integrates with
                the Ledger Agent for automatic journal creation and the
                Procurement module for asset acquisition workflows. Reports to
                the Controller Agent during month-end close.
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
            Depreciation Methods
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Straight-Line</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Equal depreciation expense over useful life. Most common
                  method for buildings and office equipment. Simple and
                  predictable.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Declining Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Accelerated depreciation with higher expense in early years.
                  Used for technology assets that lose value rapidly.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Units of Production</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Depreciation based on actual usage. Ideal for manufacturing
                  equipment and vehicles where wear is usage-based.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Asset Lifecycle
          </h2>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">Acquisition</h3>
                  <p className="text-sm text-muted-foreground">
                    Record asset at cost including purchase price, import
                    duties, installation, and directly attributable costs.
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
                  <h3 className="font-semibold">Capitalization</h3>
                  <p className="text-sm text-muted-foreground">
                    Capitalize asset with useful life, residual value, and
                    depreciation method assigned. Create asset register entry.
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
                  <h3 className="font-semibold">Depreciation</h3>
                  <p className="text-sm text-muted-foreground">
                    Run monthly depreciation schedules. Agent posts journal
                    entries automatically via Ledger Agent.
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
                  <h3 className="font-semibold">Revaluation / Impairment</h3>
                  <p className="text-sm text-muted-foreground">
                    Review for impairment indicators. Perform revaluation if
                    required. Adjust carrying value accordingly.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  5
                </div>
                <div>
                  <h3 className="font-semibold">Disposal</h3>
                  <p className="text-sm text-muted-foreground">
                    Process disposal via sale, scrapping, or donation. Calculate
                    gain/loss. Derecognize from balance sheet.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Record new asset acquisition" • "Run monthly depreciation" • "Show me
          the asset register" • "Process disposal of asset AST-001" • "What's
          the net book value of all assets?"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Fixed Assets Module",
              href: "/docs/modules/fixed-assets",
              description: "Asset management",
            },
            {
              title: "Inventory Agent",
              href: "/docs/agents/inventory",
              description: "Inventory management",
            },
            {
              title: "Ledger Agent",
              href: "/docs/agents/ledger",
              description: "Depreciation journal entries",
            },
            {
              title: "Compliance Agent",
              href: "/docs/agents/compliance",
              description: "Tax depreciation compliance",
            },
          ]}
        />
      </div>
    </>
  );
}
