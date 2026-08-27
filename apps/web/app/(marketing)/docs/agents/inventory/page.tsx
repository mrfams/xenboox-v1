import {
  Package,
  BarChart3,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const capabilities = [
  {
    title: "Stock Level Monitoring",
    description:
      "Continuously monitors inventory levels across all warehouses. Provides real-time stock positions and reorder alerts when thresholds are reached.",
    icon: Package,
  },
  {
    title: "Inventory Valuation",
    description:
      "Calculates inventory values using FIFO, LIFO, or weighted average methods. Supports periodic and perpetual inventory systems.",
    icon: BarChart3,
  },
  {
    title: "Stock Movement Tracking",
    description:
      "Tracks all stock movements including receipts, issues, transfers, and adjustments. Maintains complete traceability.",
    icon: TrendingDown,
  },
  {
    title: "Reorder Management",
    description:
      "Automatically generates purchase requisitions when stock falls below reorder levels. Considers lead times and demand forecasts.",
    icon: RefreshCw,
  },
  {
    title: "Slow-Moving & Obsolete",
    description:
      "Identifies slow-moving, obsolete, and excess inventory. Recommends markdowns, returns, or write-offs.",
    icon: AlertTriangle,
  },
];

export default function InventoryAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Inventory Agent"
        description="The Inventory Agent manages stock levels, valuations, movements, and reorder points. It ensures optimal inventory levels and identifies slow-moving stock."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Inventory", href: "/docs/agents/inventory" },
        ]}
        icon={Package}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Inventory Agent is a worker agent specializing in inventory
                management. It monitors stock levels across all warehouses,
                calculates inventory valuations using multiple costing methods,
                and generates reorder alerts when stock falls below thresholds.
                The agent tracks all stock movements with complete traceability
                and identifies slow-moving or obsolete inventory. It integrates
                with the AP Agent for purchase requisition generation and the
                Ledger Agent for inventory-related journal entries.
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
            Valuation Methods
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">FIFO</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  First In, First Out — Assumes oldest inventory items are sold
                  first. Provides accurate cost matching during periods of
                  stable prices.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">LIFO</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Last In, First Out — Assumes newest inventory items are sold
                  first. Provides tax advantages during inflationary periods.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Weighted Average</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Calculates average cost of all units available for sale.
                  Smoothes price fluctuations and is simple to implement and
                  audit.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Reorder Logic
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">
                        Signal
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Automation
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-3">Stock &le; Reorder Point</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Generate purchase requisition
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-balanced-green">Auto</span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Stock &le; Safety Stock</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Urgent reorder + escalation
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-balanced-green">Auto</span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Lead time exceeded</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Vendor follow-up
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-attention-amber">Flag</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">
                        Slow-moving (90d+ no movement)
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Review / markdown recommendation
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-attention-amber">Recommend</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "What's my current inventory value?" • "Show me low-stock items" •
          "Generate reorder report" • "Flag slow-moving inventory" • "Transfer
          stock from Warehouse A to Warehouse B"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Inventory Module",
              href: "/docs/modules/inventory",
              description: "Inventory management",
            },
            {
              title: "AP Agent",
              href: "/docs/agents/ap",
              description: "Purchase requisitions",
            },
            {
              title: "Fixed Assets Agent",
              href: "/docs/agents/fixed-assets",
              description: "Asset management",
            },
            {
              title: "Ledger Agent",
              href: "/docs/agents/ledger",
              description: "Inventory journal entries",
            },
          ]}
        />
      </div>
    </>
  );
}
