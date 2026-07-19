import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import { MarketingShell } from "../../../components/marketing-primitives";
import {
  BarChart3,
  FileText,
  Download,
  TrendingUp,
  PieChart,
  Table,
} from "lucide-react";

const features = [
  {
    title: "Profit & Loss",
    description:
      "Real-time profit and loss statement showing revenue, cost of goods sold, and expense breakdowns. Comparative periods and budget vs actual.",
    icon: TrendingUp,
  },
  {
    title: "Balance Sheet",
    description:
      "Complete balance sheet with assets, liabilities, and equity. Period-over-period comparison with variance analysis.",
    icon: PieChart,
  },
  {
    title: "Trial Balance",
    description:
      "Detailed trial balance showing all account balances with debit/credit columns. Drill down to individual transactions.",
    icon: Table,
  },
  {
    title: "Cash Flow Statement",
    description:
      "Statement of cash flows showing operating, investing, and financing activities. Direct and indirect method support.",
    icon: BarChart3,
  },
  {
    title: "Aging Reports",
    description:
      "Accounts receivable and payable aging reports with 30/60/90/120+ day buckets. Export for collections and payment planning.",
    icon: FileText,
  },
  {
    title: "Export & Scheduling",
    description:
      "Export reports as PDF, CSV, or Excel. Schedule automated report generation and email distribution.",
    icon: Download,
  },
];

export default function ReportsDocPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <DocsPageHeader
          title="Reports"
          description="Generate comprehensive financial reports including P&L, Balance Sheet, Trial Balance, Cash Flow, and Aging reports. Export and schedule distribution."
          breadcrumbs={[
            { label: "Modules", href: "/docs/modules" },
            { label: "Reports", href: "/docs/modules/reports" },
          ]}
          icon={BarChart3}
        />

        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">
              Overview
            </h2>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="pt-6">
                <p className="text-sm text-white/55 leading-relaxed">
                  The Reports module provides comprehensive financial reporting
                  capabilities with real-time data from the general ledger.
                  Generate standard financial statements, aging reports, and
                  custom reports with period-over-period comparisons. The
                  Reporting Agent can generate ad-hoc reports on demand and
                  schedule recurring report distribution to stakeholders.
                </p>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">
              Available Reports
            </h2>
            <FeatureGrid features={features} columns={3} />
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">
              Export Formats
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-base">PDF</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/55">
                    Print-ready formatted reports with company branding. Ideal
                    for board presentations and audit submissions.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-base">CSV</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/55">
                    Raw data export for analysis in spreadsheets. Supports pivot
                    table-friendly layouts.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-base">Excel</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/55">
                    Formatted Excel workbooks with multiple sheets, formulas
                    preserved for further analysis.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <InfoCallout type="tip" title="Reporting Agent">
            The Reporting Agent can generate custom reports on demand. Try
            asking "Show me the P&L for last quarter" or "Generate a cash flow
            forecast for the next 3 months."
          </InfoCallout>

          <RelatedLinks
            links={[
              {
                title: "Journal Module",
                href: "/docs/modules/journal",
                description: "Source of report data",
              },
              {
                title: "Chart of Accounts",
                href: "/docs/modules/coa",
                description: "Report structure and account mapping",
              },
              {
                title: "Reporting Agent",
                href: "/docs/agents/reporting",
                description: "AI agent for report generation",
              },
              {
                title: "Analytics Module",
                href: "/docs/modules/analytics",
                description: "Usage and performance analytics",
              },
            ]}
          />
        </div>
      </div>
    </MarketingShell>
  );
}
