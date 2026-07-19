import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import { MarketingShell } from "../../../components/marketing-primitives";
import {
  Landmark,
  ArrowRightLeft,
  FileSearch,
  TrendingUp,
  Shield,
  Building2,
} from "lucide-react";

const features = [
  {
    title: "Bank Account Management",
    description:
      "Manage multiple bank accounts across different banks and currencies. Track account balances, transaction history, and account details.",
    icon: Building2,
  },
  {
    title: "Transaction Tracking",
    description:
      "Record and categorize all bank transactions including deposits, withdrawals, transfers, and fees. Link transactions to accounting entries.",
    icon: ArrowRightLeft,
  },
  {
    title: "Bank Reconciliation",
    description:
      "Automated reconciliation of bank statements against system records. Match transactions based on amount, date, and reference numbers. Flag discrepancies for review.",
    icon: FileSearch,
  },
  {
    title: "Cash Flow Forecasting",
    description:
      "Project future cash positions based on scheduled payments, receivables, and historical patterns. AI-powered cash flow predictions.",
    icon: TrendingUp,
  },
  {
    title: "Multi-Bank Support",
    description:
      "Support for multiple banks, currencies, and account types including checking, savings, and investment accounts.",
    icon: Landmark,
  },
];

const reconciliationSteps = [
  {
    step: "1",
    title: "Upload Statement",
    description:
      "Upload bank statement (CSV, PDF, or direct bank API integration). System automatically parses transactions.",
  },
  {
    step: "2",
    title: "Auto-Match",
    description:
      "System matches bank transactions against recorded entries using amount, date, and reference algorithms.",
  },
  {
    step: "3",
    title: "Review Matches",
    description:
      "Review auto-matched items and manually resolve unmatched transactions. Treasury Agent flags potential issues.",
  },
  {
    step: "4",
    title: "Record Adjustments",
    description:
      "Create adjusting entries for bank fees, interest, and uncleared items. Journal entries are automatically posted.",
  },
  {
    step: "5",
    title: "Close Reconciliation",
    description:
      "Finalize reconciliation. Generate report showing beginning balance, transactions, adjustments, and ending balance.",
  },
];

export default function TreasuryDocPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <DocsPageHeader
          title="Treasury"
          description="Manage bank accounts, track transactions, reconcile statements, and forecast cash flow. The Treasury module provides real-time visibility into your cash position."
          breadcrumbs={[
            { label: "Modules", href: "/docs/modules" },
            { label: "Treasury", href: "/docs/modules/treasury" },
          ]}
          icon={Landmark}
        />

        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-white">
              Overview
            </h2>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="pt-6">
                <p className="text-sm leading-relaxed text-white/60">
                  The Treasury module provides comprehensive bank account
                  management and reconciliation capabilities. It supports
                  multiple bank accounts across different currencies, automated
                  transaction matching, and AI-powered cash flow forecasting.
                  The Treasury Agent continuously monitors bank transactions,
                  flags anomalies, and helps reconcile statements efficiently.
                  Integration with the Ledger Agent ensures all bank
                  transactions are properly recorded in the general ledger.
                </p>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-white">
              Key Features
            </h2>
            <FeatureGrid features={features} />
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-white">
              Reconciliation Workflow
            </h2>
            <div className="space-y-3">
              {reconciliationSteps.map((item) => (
                <Card key={item.step} className="border-white/10 bg-white/5">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm text-white/55">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <InfoCallout type="info" title="Multi-Currency Support">
            The Treasury module supports accounts in multiple currencies with
            real-time exchange rate integration. All transactions are recorded
            in both the transaction currency and your base reporting currency.
          </InfoCallout>

          <RelatedLinks
            links={[
              {
                title: "Cash Module",
                href: "/docs/modules/cash",
                description: "Petty cash and imprest management",
              },
              {
                title: "Mobile Money Module",
                href: "/docs/modules/mobile-money",
                description: "Mobile money account management",
              },
              {
                title: "Treasury Agent",
                href: "/docs/agents/treasury",
                description: "AI agent for treasury operations",
              },
              {
                title: "Multi-Currency Module",
                href: "/docs/modules/currency",
                description: "Currency and exchange rate management",
              },
            ]}
          />
        </div>
      </div>
    </MarketingShell>
  );
}
