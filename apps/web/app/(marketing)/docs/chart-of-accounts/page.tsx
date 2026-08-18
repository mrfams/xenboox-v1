import {
  BookOpen,
  LayoutGrid,
  Tags,
  Settings2,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

import { DocsPageHeader } from "../components/docs-page-header";
import { InfoCallout } from "../components/info-callout";
import { FeatureGrid } from "../components/feature-grid";
import { RelatedLinks } from "../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const accountTypes = [
  {
    title: "Asset",
    description:
      "Resources the business owns — cash, bank balances, receivables, inventory, and fixed assets. Presented first on the balance sheet.",
    icon: BookOpen,
  },
  {
    title: "Liability",
    description:
      "Obligations the business owes — payables, loans, accrued expenses, and deferred revenue.",
    icon: LayoutGrid,
  },
  {
    title: "Equity",
    description:
      "Owner capital, retained earnings, and current-period profit or loss.",
    icon: Tags,
  },
  {
    title: "Revenue",
    description:
      "Income from sales, services, interest, and other operating activities.",
    icon: CheckCircle,
  },
  {
    title: "Expense",
    description:
      "Costs incurred to run the business — payroll, rent, supplies, utilities, and depreciation.",
    icon: Settings2,
  },
];

const steps = [
  {
    title: "Start from a template",
    description:
      "Xenboox ships with pre-built templates (GAAP, IFRS, SME) covering the accounts most businesses need. Pick the closest match to your industry.",
  },
  {
    title: "Review the default structure",
    description:
      "Each account has a code, name, type, and subtype. Codes follow a conventional range — 1xxx assets, 2xxx liabilities, 3xxx equity, 4xxx revenue, 5xxx+ expenses.",
  },
  {
    title: "Add accounts for your business",
    description:
      "Create accounts specific to your operations — a new bank account, a revenue line for a new product, or a cost centre for a department.",
  },
  {
    title: "Mark accounts active or archived",
    description:
      "Active accounts are available for posting. Archive accounts you no longer use so historical entries stay intact without cluttering new entry screens.",
  },
  {
    title: "Assign defaults per entity",
    description:
      "Each entity can set default bank, cash, and clearing accounts so journal entries, payments, and reconciliations post to the right place automatically.",
  },
];

export default function ChartOfAccountsPage() {
  return (
    <>
      <DocsPageHeader
        title="Chart of Accounts"
        description="Design and maintain the account structure that powers your general ledger — the backbone of every journal entry, report, and reconciliation."
        breadcrumbs={[
          { label: "Guides", href: "/docs/getting-started" },
          { label: "Chart of Accounts", href: "/docs/chart-of-accounts" },
        ]}
        icon={BookOpen}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The chart of accounts (COA) is the complete list of accounts
                your business uses to record transactions. Every journal entry
                line references an account in the chart, and every report —
                trial balance, profit &amp; loss, balance sheet — is derived
                from it. Getting the structure right at the start makes
                reporting cleaner, automation more accurate, and month-end close
                faster.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Account Types
          </h2>
          <FeatureGrid features={accountTypes} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Setting Up Your Chart
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
            Account Code Ranges
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Range</th>
                      <th className="px-4 py-3 text-left font-medium">Type</th>
                      <th className="px-4 py-3 text-left font-medium">
                        Examples
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [
                        "1000–1999",
                        "Assets",
                        "Cash, Bank, Accounts Receivable",
                      ],
                      ["2000–2999", "Liabilities", "Accounts Payable, Loans"],
                      [
                        "3000–3999",
                        "Equity",
                        "Owner Capital, Retained Earnings",
                      ],
                      [
                        "4000–4999",
                        "Revenue",
                        "Sales, Service Income, Interest",
                      ],
                      ["5000–6999", "Expenses", "Payroll, Rent, Supplies"],
                    ].map(([range, type, examples]) => (
                      <tr key={range} className="border-b last:border-0">
                        <td className="px-4 py-3 font-mono text-xs">{range}</td>
                        <td className="px-4 py-3">{type}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {examples}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Best practice">
          Keep account names descriptive but consistent — "Bank – GTBank Main"
          instead of "Bank 1". The Ledger Agent uses account names to
          auto-categorize transactions, so clarity directly improves automation
          accuracy.
        </InfoCallout>

        <InfoCallout type="warning" title="Archiving vs deleting">
          Accounts with posted transactions can never be deleted — only
          archived. This preserves the integrity of historical entries and the
          audit trail.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Journal Module",
              href: "/docs/modules/journal",
              description: "Posting to ledger accounts",
            },
            {
              title: "Core Concepts",
              href: "/docs/concepts",
              description: "Double-entry fundamentals",
            },
            {
              title: "Reports",
              href: "/docs/modules/reports",
              description: "Trial balance & financial statements",
            },
            {
              title: "Getting Started",
              href: "/docs/getting-started",
              description: "Set up your workspace",
            },
          ]}
        />
      </div>
    </>
  );
}
