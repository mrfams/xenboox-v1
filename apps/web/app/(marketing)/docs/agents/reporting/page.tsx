import {
  BarChart3,
  FileText,
  Download,
  TrendingUp,
  PieChart,
  Table,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const capabilities = [
  {
    title: "Report Generation",
    description:
      "Generates financial reports including P&L, Balance Sheet, Trial Balance, and Cash Flow. Supports custom report builders.",
    icon: FileText,
  },
  {
    title: "Multi-Format Export",
    description:
      "Exports reports in PDF, Excel, CSV, and HTML formats. Preserves formatting and supports bulk export.",
    icon: Download,
  },
  {
    title: "Comparative Analysis",
    description:
      "Generates period-over-period comparisons, variance analysis, and trend reports. Highlights significant changes.",
    icon: TrendingUp,
  },
  {
    title: "Consolidated Reporting",
    description:
      "Consolidates financial data across multiple entities. Handles intercompany eliminations and currency translation.",
    icon: PieChart,
  },
  {
    title: "Scheduled Reports",
    description:
      "Automates report generation on schedules. Distributes reports via email, Slack, or in-app notifications.",
    icon: Table,
  },
];

export default function ReportingAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Reporting Agent"
        description="The Reporting Agent generates financial reports, handles multi-format exports, and automates scheduled report distribution across entities."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Reporting", href: "/docs/agents/reporting" },
        ]}
        icon={BarChart3}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Reporting Agent is a platform-level agent responsible for
                financial report generation and distribution. It accesses the
                general ledger to produce standard financial statements as well
                as custom management reports. The agent supports comparative
                analysis across periods, entity consolidation with intercompany
                eliminations, and scheduled report distribution. It works
                closely with the CFO Agent to generate executive summaries and
                board-level reports.
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
            Report Types
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Financial Statements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>Profit &amp; Loss Statement (by nature / function)</li>
                  <li>Balance Sheet (classified / liquidity-based)</li>
                  <li>Trial Balance (detailed / summary)</li>
                  <li>Cash Flow Statement (direct / indirect method)</li>
                  <li>Statement of Changes in Equity</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Management Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>Budget vs Actual variance analysis</li>
                  <li>Departmental / cost center P&amp;L</li>
                  <li>Aged receivables and payables</li>
                  <li>Inventory valuation reports</li>
                  <li>Custom KPI dashboards</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Export Formats
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Format</th>
                  <th className="px-4 py-3 text-left font-medium">Use Case</th>
                  <th className="px-4 py-3 text-left font-medium">Features</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-3">PDF</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Formal reporting, board packs
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Watermark, page numbering, cover page
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3">Excel</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Analysis, manipulation
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Formulas, pivot tables, conditional formatting
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3">CSV</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Data export, integration
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Raw data, no formatting
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">HTML</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    In-app viewing, email
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Interactive tables, responsive design
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Generate Q3 P&L report" • "Export trial balance to Excel" • "Show
          budget vs actual for this month" • "Create consolidated balance sheet"
          • "Schedule monthly board reports"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Reports Module",
              href: "/docs/modules/reports",
              description: "Reporting features",
            },
            {
              title: "CFO Agent",
              href: "/docs/agents/cfo",
              description: "Executive reporting",
            },
            {
              title: "Analytics Agent",
              href: "/docs/agents/analytics",
              description: "Analytics and insights",
            },
            {
              title: "Budget Agent",
              href: "/docs/agents/budget",
              description: "Budget variance analysis",
            },
          ]}
        />
      </div>
    </>
  );
}
