import { LayoutGrid, ListTree, FileText, ArrowRightLeft } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const features = [
  {
    title: "Account Types",
    description:
      "Accounts are classified as Asset, Liability, Equity, Revenue, or Expense. The classification drives where balances appear on financial statements.",
    icon: LayoutGrid,
  },
  {
    title: "Account Codes",
    description:
      "Every account has a unique code, usually numeric, that keeps the chart tidy and makes reporting predictable. Codes can follow any scheme your team prefers.",
    icon: ListTree,
  },
  {
    title: "Hierarchy",
    description:
      "Accounts can be nested — parent accounts roll up child balances, which is how statements like the P&L and Balance Sheet are assembled.",
    icon: FileText,
  },
  {
    title: "Posting Integration",
    description:
      "The chart of accounts is the backbone of every module. Invoices, payroll, and journal entries all reference accounts from your chart.",
    icon: ArrowRightLeft,
  },
];

export default function ChartOfAccountsConceptPage() {
  return (
    <>
      <DocsPageHeader
        title="Chart of Accounts"
        description="The structured list of every account your business uses to record financial activity."
        breadcrumbs={[
          { label: "Concepts", href: "/docs/concepts" },
          {
            label: "Chart of Accounts",
            href: "/docs/concepts/chart-of-accounts",
          },
        ]}
        icon={LayoutGrid}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The chart of accounts is the master list of accounts a business
                uses to record transactions. Every journal entry line references
                an account from the chart, which means the quality of your
                financial statements depends on the quality of your chart. A
                well-designed chart groups similar activity into the same
                accounts, so reports are clean and analysis is meaningful.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Key Concepts
          </h2>
          <FeatureGrid features={features} />
        </section>

        <InfoCallout type="tip" title="Design for the reports, not the entry">
          A good chart of accounts is designed backward from the reports you
          want to see. If you need to break out revenue by product line, create
          accounts that make that possible before the transactions start flowing
          — retrofitting a chart after the fact is painful.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Chart of Accounts Guide",
              href: "/docs/chart-of-accounts",
              description: "Step-by-step design walkthrough",
            },
            {
              title: "Journal Entries",
              href: "/docs/concepts/journal-entries",
              description: "How transactions reference accounts",
            },
            {
              title: "Core Concepts",
              href: "/docs/concepts",
              description: "Back to the concepts index",
            },
          ]}
        />
      </div>
    </>
  );
}
