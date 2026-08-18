import {
  BarChart3,
  FileText,
  Download,
  CalendarClock,
  PieChart,
  Filter,
} from "lucide-react";

import { DocsPageHeader } from "../components/docs-page-header";
import { InfoCallout } from "../components/info-callout";
import { FeatureGrid } from "../components/feature-grid";
import { RelatedLinks } from "../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const reportTypes = [
  {
    title: "Profit & Loss",
    description:
      "Revenue, cost of sales, and expenses for a period — with variance against budget and prior periods.",
    icon: BarChart3,
  },
  {
    title: "Balance Sheet",
    description:
      "Assets, liabilities, and equity at a point in time, derived from posted balances.",
    icon: PieChart,
  },
  {
    title: "Cash Flow Statement",
    description:
      "Operating, investing, and financing cash movements — direct from bank and cash activity.",
    icon: CalendarClock,
  },
  {
    title: "Trial Balance",
    description:
      "Every account with its debit and credit totals — the starting point for review and close.",
    icon: FileText,
  },
  {
    title: "Aged Receivables & Payables",
    description:
      "Outstanding invoices by aging bucket, so collections and payments stay on track.",
    icon: Filter,
  },
];

const steps = [
  {
    title: "Pick a report type",
    description:
      "Choose from the standard financial statements or module-specific reports (AP aging, tax summaries, budget variance).",
  },
  {
    title: "Set the period and filters",
    description:
      "Select a fiscal period or custom date range, and filter by entity, department, or account group.",
  },
  {
    title: "Review with AI context",
    description:
      "The Reporting Agent drafts a narrative — what moved, why, and what to watch — alongside the numbers.",
  },
  {
    title: "Export and share",
    description:
      "Download as CSV or PDF, schedule recurring exports, or share a link with a viewer role.",
  },
];

export default function ReportsPage() {
  return (
    <>
      <DocsPageHeader
        title="Reports & Exports"
        description="Turn your ledger into decision-ready financial statements — with AI-written narratives that explain what the numbers mean."
        breadcrumbs={[
          { label: "Guides", href: "/docs/getting-started" },
          { label: "Reports", href: "/docs/reports" },
        ]}
        icon={BarChart3}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Available Reports
          </h2>
          <FeatureGrid features={reportTypes} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Building a Report
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ol className="space-y-4">
                {steps.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Export Formats
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">
                        Format
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Best for
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-3">CSV</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Spreadsheet analysis and data work
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">PDF</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Board packs, auditors, and stakeholder distribution
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="info" title="Numbers first, narrative second">
          Report narratives are generated from live ledger data with the same
          numbers you see on screen — they explain movements, they never replace
          them. Every figure in a narrative is traceable to the underlying
          journal entries.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Reporting Agent",
              href: "/docs/agents/reporting",
              description: "AI report narratives",
            },
            {
              title: "Reports Module",
              href: "/docs/modules/reports",
              description: "Module deep dive",
            },
            {
              title: "Chart of Accounts",
              href: "/docs/chart-of-accounts",
              description: "Account structure",
            },
            {
              title: "Month-End Close",
              href: "/docs/month-end-close",
              description: "Period close workflow",
            },
          ]}
        />
      </div>
    </>
  );
}
