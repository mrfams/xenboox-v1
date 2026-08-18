import {
  Landmark,
  Calendar,
  Percent,
  FileCheck2,
  Shield,
  Scale,
  Bell,
  Globe,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const features = [
  {
    title: "Multi-Jurisdiction Rules",
    description:
      "Jurisdiction-aware tax rules engine covering VAT/GST, PAYE, withholding tax, corporate tax, and social security across supported countries — with statutory rates kept current through the rule-update pipeline.",
    icon: Globe,
  },
  {
    title: "Filing Deadlines",
    description:
      "A live filing-deadline calendar for every tax type and jurisdiction. Automated compliance signals flag upcoming or missed filings before they become penalties.",
    icon: Calendar,
  },
  {
    title: "VAT Calculation & Returns",
    description:
      "Output-tax and input-tax calculations per period, with returns assembled from real transactions — no manual re-keying between the ledger and the return.",
    icon: Percent,
  },
  {
    title: "Withholding Records",
    description:
      "Track withholding tax on vendor payments and customer remittances with full source documentation, so every withholding amount is traceable to a transaction.",
    icon: FileCheck2,
  },
  {
    title: "Tax Packages & 1099",
    description:
      "Bundle filings into per-period tax packages with status tracking, and generate US 1099 summaries from verified vendor information.",
    icon: Landmark,
  },
  {
    title: "Deduction Discovery",
    description:
      "Continuous scans surface missed deductions, input VAT credits, and statutory exemptions — turning tax compliance from a cost center into a recovery engine.",
    icon: Scale,
  },
];

const workflowSteps = [
  {
    step: "1",
    title: "Rules Load",
    description:
      "Statutory rates and rule changes are loaded per jurisdiction and kept current through the rule-change pipeline. Overrides can be applied per entity.",
  },
  {
    step: "2",
    title: "Transactions Taxed",
    description:
      "Every invoice, bill, and payment is classified against the active rules as it is recorded — output tax, input tax, and withholding calculated automatically.",
  },
  {
    step: "3",
    title: "Period Calculations",
    description:
      "VAT and withholding are computed per period from the ledger. The system cross-checks against the trial balance so nothing is missed.",
  },
  {
    step: "4",
    title: "Deadline Monitoring",
    description:
      "Filing deadlines are tracked continuously. Compliance signals surface anything at risk, with days-to-deadline visibility on the dashboard.",
  },
  {
    step: "5",
    title: "Package & File",
    description:
      "Filings are assembled into tax packages with supporting documentation, ready for review and submission by your finance team or accountant.",
  },
];

export default function TaxComplianceDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Tax Compliance"
        description="Stay ahead of every filing obligation. The Tax Compliance module applies jurisdiction-specific rules, tracks deadlines, and assembles filing-ready packages — with agents watching for deductions you might be leaving on the table."
        breadcrumbs={[
          { label: "Modules", href: "/docs/modules" },
          { label: "Tax Compliance", href: "/docs/modules/tax-compliance" },
        ]}
        icon={Landmark}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Tax Compliance module turns a fragmented compliance burden
                into a single, monitored workflow. Jurisdiction-specific rules
                are applied to transactions as they are recorded, filings are
                calculated per period directly from the ledger, and every
                deadline is tracked with proactive signals. The Compliance Agent
                and Tax Engine work together to validate rates, flag anomalies,
                and surface deduction opportunities — so your team files on
                time, accurately, and without re-keying numbers between systems.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Key Features
          </h2>
          <FeatureGrid features={features} columns={3} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Compliance Workflow
          </h2>
          <div className="space-y-3">
            {workflowSteps.map((item) => (
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

        <InfoCallout type="info" title="Audit-ready by design">
          Every tax calculation, deduction discovery, and filing package is
          logged with its source transactions and confidence score. The Audit
          Agent can recompute any period independently, so filings stand up to
          review without extra work from your team.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Compliance Agent",
              href: "/docs/agents/compliance",
              description: "AI agent for statutory compliance",
            },
            {
              title: "Audit Agent",
              href: "/docs/agents/audit",
              description: "Continuous audit readiness",
            },
            {
              title: "Fiscal Periods",
              href: "/docs/modules/fiscal",
              description: "Period management and close",
            },
            {
              title: "DevSecOps",
              href: "/docs/devsecops",
              description: "Platform engineering practices",
            },
          ]}
        />
      </div>
    </>
  );
}
