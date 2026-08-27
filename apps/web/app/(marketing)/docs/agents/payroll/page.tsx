import {
  Users,
  Calculator,
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const capabilities = [
  {
    title: "Payroll Processing",
    description:
      "Processes payroll runs with automatic calculation of gross pay, deductions, taxes, and net pay. Supports salaried, hourly, and contract employees.",
    icon: Calculator,
  },
  {
    title: "Tax Compliance",
    description:
      "Automatically calculates PAYE (Pay As You Earn) income tax based on applicable tax bands and reliefs. Updates tax tables automatically.",
    icon: TrendingDown,
  },
  {
    title: "SSNIT Contributions",
    description:
      "Calculates Social Security and National Insurance Trust contributions for both employer and employee portions.",
    icon: CheckCircle,
  },
  {
    title: "Deduction Management",
    description:
      "Manages employee deductions including loan repayments, union dues, garnishments, and voluntary deductions with priority ordering.",
    icon: AlertTriangle,
  },
  {
    title: "Payslip Generation",
    description:
      "Generates detailed payslips with full breakdown of earnings, deductions, taxes, and net pay. Distributes via email and mobile app.",
    icon: FileText,
  },
];

export default function PayrollAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Payroll Manager Agent"
        description="The Payroll Manager Agent processes payroll runs, calculates taxes and deductions, generates payslips, and ensures compliance with local labor regulations."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Payroll", href: "/docs/agents/payroll" },
        ]}
        icon={Users}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Payroll Manager Agent is a department head agent responsible
                for all payroll operations. It manages the complete payroll
                lifecycle from employee setup through payroll runs, tax
                calculations, and payslip distribution. The agent supports
                multiple pay schedules, handles staff loans and deductions, and
                ensures compliance with local tax regulations including PAYE,
                SSNIT, and other statutory deductions. It works closely with the
                Ledger Agent for automatic payroll journal posting and the
                Compliance Agent for regulatory reporting.
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
            Payroll Run Process
          </h2>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">Employee Validation</h3>
                  <p className="text-sm text-muted-foreground">
                    Validate all active employees have correct bank details, tax
                    IDs, and deduction configurations.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">Attendance & Timesheets</h3>
                  <p className="text-sm text-muted-foreground">
                    Import attendance data, timesheets, and leave records.
                    Calculate overtime and shift differentials.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">Gross Pay Calculation</h3>
                  <p className="text-sm text-muted-foreground">
                    Calculate gross pay including base salary, overtime,
                    bonuses, commissions, and allowances.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold">Deductions & Taxes</h3>
                  <p className="text-sm text-muted-foreground">
                    Apply statutory deductions (PAYE, SSNIT), loan repayments,
                    and voluntary deductions in priority order.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  5
                </div>
                <div>
                  <h3 className="font-semibold">Payslip & Payment</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate payslips, initiate payments, post journal entries
                    to ledger, distribute payslips.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Supported Tax Configurations
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">
                        Tax Type
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Auto-Calculated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-3">PAYE Income Tax</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Progressive tax bands with personal reliefs
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-balanced-green">Yes</span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">SSNIT (Employee)</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        5.5% of gross pay
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-balanced-green">Yes</span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">SSNIT (Employer)</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        13% of gross pay
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-balanced-green">Yes</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Tier 2 Pension</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Occupational pension scheme contributions
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-balanced-green">Yes</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Run payroll for this month" • "Show me pending payroll approvals" •
          "Generate payslips for January" • "Calculate employee John Doe's net
          pay" • "What deductions are active for this payroll run?"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Payroll Module",
              href: "/docs/modules/payroll",
              description: "Payroll management",
            },
            {
              title: "Compliance Agent",
              href: "/docs/agents/compliance",
              description: "Tax and regulatory compliance",
            },
            {
              title: "Ledger Agent",
              href: "/docs/agents/ledger",
              description: "Payroll journal posting",
            },
            {
              title: "CFO Agent",
              href: "/docs/agents/cfo",
              description: "Strategic oversight",
            },
          ]}
        />
      </div>
    </>
  );
}
