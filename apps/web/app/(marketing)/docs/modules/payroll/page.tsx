import {
  Users,
  Shield,
  Calculator,
  FileText,
  Clock,
  ChartBar,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const features = [
  {
    title: "Employee Management",
    description:
      "Maintain employee records with contracts, tax information, bank details, and benefits enrollment. Support for full-time, part-time, and contract workers.",
    icon: Users,
  },
  {
    title: "Payroll Processing",
    description:
      "Run payroll with automatic calculation of gross pay, deductions, taxes (PAYE), and employer contributions (SSNIT). Support for multiple pay schedules.",
    icon: Calculator,
  },
  {
    title: "Tax Compliance",
    description:
      "Automatic calculation of PAYE tax bands, SSNIT contributions, and other statutory deductions. Generate tax reports for regulatory filing.",
    icon: Shield,
  },
  {
    title: "Payslips",
    description:
      "Generate and distribute digital payslips to employees via email or mobile app. Detailed breakdown of earnings, deductions, and net pay.",
    icon: FileText,
  },
  {
    title: "Staff Loans",
    description:
      "Manage employee loan requests, approval workflows, and automated deduction schedules. Track outstanding balances and repayment progress.",
    icon: Clock,
  },
  {
    title: "Leave Management",
    description:
      "Track employee leave balances including annual, sick, and casual leave. Integrated leave calendar and approval workflows.",
    icon: ChartBar,
  },
];

const payrollSteps = [
  {
    step: "1",
    title: "Set Up Employees",
    description:
      "Add employee details including salary, bank account, tax information, and statutory deduction profiles.",
  },
  {
    step: "2",
    title: "Configure Pay Elements",
    description:
      "Define earnings components (basic, allowances, overtime) and deduction types (tax, loans, benefits).",
  },
  {
    step: "3",
    title: "Run Payroll",
    description:
      "Process payroll for selected period. System automatically calculates all earnings, deductions, and employer costs.",
  },
  {
    step: "4",
    title: "Review & Approve",
    description:
      "Review payroll summary, check for anomalies, and approve for processing. Payroll Manager Agent flags discrepancies.",
  },
  {
    step: "5",
    title: "Distribute Payslips",
    description:
      "Generate and distribute payslips. Process payments to employee bank accounts or mobile money wallets.",
  },
  {
    step: "6",
    title: "File Returns",
    description:
      "Generate statutory returns for tax authority, social security, and other regulatory bodies.",
  },
];

const taxBands = [
  { band: "First GHS 402", rate: "0%", notes: "Tax-free threshold" },
  { band: "Next GHS 110", rate: "5%", notes: "Low-income bracket" },
  { band: "Next GHS 130", rate: "10%", notes: "Lower-middle bracket" },
  { band: "Next GHS 3,333", rate: "17.5%", notes: "Middle bracket" },
  { band: "Next GHS 20,000", rate: "25%", notes: "Upper-middle bracket" },
  { band: "Above GHS 23,975", rate: "30%", notes: "High-income bracket" },
];

export default function PayrollDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Payroll"
        description="Complete payroll management with automated calculations, tax compliance, and employee self-service. Supports PAYE, SSNIT, and other statutory deductions."
        breadcrumbs={[
          { label: "Modules", href: "/docs/modules" },
          { label: "Payroll", href: "/docs/modules/payroll" },
        ]}
        icon={Users}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Payroll module handles the complete employee compensation
                lifecycle. From employee onboarding and contract management to
                payroll processing, tax filing, and payslip distribution. The
                module supports multi-entity payroll with configurable pay
                elements, tax bands, and deduction profiles. The Payroll Manager
                Agent automates monthly runs and ensures compliance with local
                tax regulations.
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
            Payroll Processing Workflow
          </h2>
          <div className="space-y-3">
            {payrollSteps.map((item) => (
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

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Tax Bands (Ghana - PAYE)
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">
                    Income Band
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Rate</th>
                  <th className="px-4 py-3 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {taxBands.map((row) => (
                  <tr key={row.band} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{row.band}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.rate}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Statutory Deductions
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                The Payroll module supports the following statutory deductions:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>PAYE Tax</strong> — Pay As You Earn income tax based
                    on progressive tax bands
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>SSNIT Employee</strong> — 5.5% of basic salary for
                    Social Security
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>SSNIT Employer</strong> — 13% of basic salary
                    (employer contribution)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>Provident Fund</strong> — Optional employee/employer
                    contributions
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Payroll Manager Agent">
          The Payroll Manager Agent can automate monthly payroll runs, validate
          calculations, and generate statutory reports. Try asking "Run payroll
          for this month" or "Show me the payroll summary for Q2."
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Payroll Manager Agent",
              href: "/docs/agents/payroll",
              description: "AI agent for payroll automation",
            },
            {
              title: "Compliance Agent",
              href: "/docs/agents/compliance",
              description: "Tax and regulatory compliance",
            },
            {
              title: "Journal Module",
              href: "/docs/modules/journal",
              description: "Journal entry posting",
            },
            {
              title: "Reports Module",
              href: "/docs/modules/reports",
              description: "Payroll reporting",
            },
          ]}
        />
      </div>
    </>
  );
}
