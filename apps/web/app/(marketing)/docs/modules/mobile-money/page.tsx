import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import {
  Smartphone,
  ArrowRightLeft,
  FileSearch,
  Zap,
  Users,
  Shield,
} from "lucide-react";

const features = [
  {
    title: "Mobile Money Accounts",
    description:
      "Connect and manage multiple mobile money accounts from providers like M-Pesa, Airtel Money, MTN Mobile Money, and others.",
    icon: Smartphone,
  },
  {
    title: "Transaction Processing",
    description:
      "Record incoming and outgoing mobile money transactions. Real-time balance updates and transaction categorization.",
    icon: ArrowRightLeft,
  },
  {
    title: "Auto-Reconciliation",
    description:
      "Automatically reconcile mobile money transactions against bank statements and system records. Match using reference numbers and amounts.",
    icon: FileSearch,
  },
  {
    title: "Bulk Payments",
    description:
      "Process bulk payments to employees, suppliers, and customers via mobile money. Send salary payments, supplier payments, and refunds.",
    icon: Zap,
  },
];

const transactionSteps = [
  {
    step: "1",
    title: "Connect Account",
    description:
      "Link your mobile money account to Xenboox using API integration or statement upload.",
  },
  {
    step: "2",
    title: "Record Transactions",
    description:
      "Transactions are automatically synced or manually recorded with full details including sender, receiver, amount, and reference.",
  },
  {
    step: "3",
    title: "Categorize",
    description:
      "Categorize transactions by type (payment, receipt, transfer, fee) and link to corresponding accounting entries.",
  },
  {
    step: "4",
    title: "Reconcile",
    description:
      "Match mobile money transactions against bank statements or internal records. Flag discrepancies for review.",
  },
  {
    step: "5",
    title: "Report",
    description:
      "Generate mobile money activity reports showing all transactions, fees, and reconciled status.",
  },
];

export default function MobileMoneyDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Mobile Money"
        description="Manage mobile money accounts from M-Pesa, Airtel Money, MTN Mobile Money, and other providers. Automate reconciliation and bulk payments."
        breadcrumbs={[
          { label: "Modules", href: "/docs/modules" },
          { label: "Mobile Money", href: "/docs/modules/mobile-money" },
        ]}
        icon={Smartphone}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Mobile Money module provides comprehensive management of
                mobile money accounts — a critical payment channel for African
                businesses. It supports all major mobile money providers,
                enabling automatic transaction syncing, reconciliation, and bulk
                payment processing. The Mobile Money Agent monitors transactions
                for anomalies and helps reconcile statements with bank records.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Key Features
          </h2>
          <FeatureGrid features={features} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Transaction Workflow
          </h2>
          <div className="space-y-3">
            {transactionSteps.map((item) => (
              <Card key={item.step}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <InfoCallout type="warning" title="Supported Providers">
          Xenboox supports M-Pesa (Safaricom), Airtel Money, MTN Mobile Money,
          Orange Money, and other regional mobile money providers. API
          integration availability varies by country and provider.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Treasury Module",
              href: "/docs/modules/treasury",
              description: "Bank account management",
            },
            {
              title: "Cash Module",
              href: "/docs/modules/cash",
              description: "Cash float management",
            },
            {
              title: "Mobile Money Agent",
              href: "/docs/agents/mobile-money",
              description: "AI agent for mobile money",
            },
            {
              title: "AP Module",
              href: "/docs/modules/ap",
              description: "Supplier payments via mobile money",
            },
          ]}
        />
      </div>
    </>
  );
}
