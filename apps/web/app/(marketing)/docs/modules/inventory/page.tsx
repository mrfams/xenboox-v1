import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import { MarketingShell } from "../../../components/marketing-primitives";
import {
  Package,
  Warehouse,
  BarChart3,
  ArrowRightLeft,
  AlertTriangle,
  Truck,
} from "lucide-react";

const features = [
  {
    title: "Warehouse Management",
    description:
      "Manage multiple warehouses and storage locations. Track inventory levels, movements, and stock transfers between locations.",
    icon: Warehouse,
  },
  {
    title: "Item Catalog",
    description:
      "Maintain a comprehensive item catalog with SKUs, descriptions, categories, units of measure, and pricing information.",
    icon: Package,
  },
  {
    title: "Stock Transactions",
    description:
      "Record all stock movements including receipts, issues, transfers, adjustments, and write-offs. Full audit trail for every transaction.",
    icon: ArrowRightLeft,
  },
  {
    title: "Valuation Methods",
    description:
      "Support for FIFO, weighted average, and standard costing valuation methods. Automatic cost calculation on stock movements.",
    icon: BarChart3,
  },
  {
    title: "Reorder Management",
    description:
      "Set reorder levels and economic order quantities. Automated alerts when stock falls below minimum thresholds.",
    icon: AlertTriangle,
  },
  {
    title: "Stock Reports",
    description:
      "Generate inventory reports including stock levels, valuation summaries, movement history, and slow-moving item analysis.",
    icon: Truck,
  },
];

export default function InventoryDocPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <DocsPageHeader
          title="Inventory"
          description="Comprehensive inventory management with warehouse tracking, stock valuation, and automated reorder alerts. Supports FIFO, weighted average, and standard costing."
          breadcrumbs={[
            { label: "Modules", href: "/docs/modules" },
            { label: "Inventory", href: "/docs/modules/inventory" },
          ]}
          icon={Package}
        />

        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">
              Overview
            </h2>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="pt-6">
                <p className="text-sm text-white/55 leading-relaxed">
                  The Inventory module provides end-to-end stock management
                  capabilities. It supports multiple warehouses, item
                  categorization, stock movement tracking, and multiple
                  valuation methods. The Inventory Agent monitors stock levels,
                  predicts reorder needs, and helps optimize inventory carrying
                  costs. Integration with the AP module enables automated
                  purchase order generation when stock reaches reorder levels.
                </p>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">
              Key Features
            </h2>
            <FeatureGrid features={features} columns={3} />
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">
              Valuation Methods
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-base">FIFO</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/55">
                    First-In, First-Out method assumes oldest inventory items
                    are sold first. Best for perishable goods or products with
                    expiry dates.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-base">Weighted Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/55">
                    Calculates average cost of all items in stock. Smooths out
                    price fluctuations and is ideal for homogeneous products.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-base">Standard Costing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/55">
                    Uses predetermined standard costs. Variance analysis
                    highlights differences between standard and actual costs for
                    management review.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <InfoCallout type="tip" title="Inventory Agent">
            The Inventory Agent automatically monitors stock levels, predicts
            demand, and generates reorder suggestions. Ask "What items need
            reordering?" or "Show me slow-moving inventory."
          </InfoCallout>

          <RelatedLinks
            links={[
              {
                title: "AP Module",
                href: "/docs/modules/ap",
                description: "Purchase orders and supplier management",
              },
              {
                title: "Fixed Assets Module",
                href: "/docs/modules/fixed-assets",
                description: "Asset register and depreciation",
              },
              {
                title: "Inventory Agent",
                href: "/docs/agents/inventory",
                description: "AI agent for inventory management",
              },
              {
                title: "Reports Module",
                href: "/docs/modules/reports",
                description: "Inventory valuation reports",
              },
            ]}
          />
        </div>
      </div>
    </MarketingShell>
  );
}
