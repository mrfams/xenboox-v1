import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import {
  LayoutDashboard,
  CheckCircle,
  Calendar,
  FileText,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

const capabilities = [
  {
    title: "Month-End Close",
    description:
      "Manages the complete month-end close checklist. Tracks completion status, identifies gaps, and ensures all steps are completed before period close.",
    icon: Calendar,
  },
  {
    title: "Period Management",
    description:
      "Oversees fiscal period transitions. Validates that all entries are posted, reconciliations are complete, and adjustments are recorded.",
    icon: LayoutDashboard,
  },
  {
    title: "Compliance Verification",
    description:
      "Verifies that all accounting activities comply with organizational policies and accounting standards before period close.",
    icon: CheckCircle,
  },
  {
    title: "Close Reporting",
    description:
      "Generates close completion reports, variance analysis, and management summaries for review by the CFO Agent.",
    icon: FileText,
  },
];

const closeChecklist = [
  {
    task: "All journal entries posted",
    owner: "Ledger Agent",
    status: "Verified",
  },
  {
    task: "Bank accounts reconciled",
    owner: "Treasury Agent",
    status: "Verified",
  },
  {
    task: "Receivables aged and reviewed",
    owner: "AR Agent",
    status: "Verified",
  },
  { task: "Payables reconciled", owner: "AP Agent", status: "Verified" },
  { task: "Payroll posted", owner: "Payroll Manager", status: "Verified" },
  {
    task: "Depreciation recorded",
    owner: "Fixed Assets Agent",
    status: "Verified",
  },
  {
    task: "Accruals and prepayments",
    owner: "Ledger Agent",
    status: "Verified",
  },
  {
    task: "Trial balance reviewed",
    owner: "Controller Agent",
    status: "Pending",
  },
  { task: "Management review", owner: "CFO Agent", status: "Pending" },
];

export default function ControllerAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Controller Agent"
        description="The Controller Agent manages the month-end close checklist, period transitions, and compliance verification. It ensures all steps are completed before periods are closed."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Controller", href: "/docs/agents/controller" },
        ]}
        icon={LayoutDashboard}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Controller Agent serves as the department head overseeing
                period-end closing activities. It works closely with the CFO
                Agent and manages worker agents (Ledger, AP, AR) to ensure all
                closing tasks are completed accurately and on time. The
                Controller maintains a detailed close checklist, tracks task
                completion, and flags issues for human intervention.
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
            Close Checklist
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Task</th>
                  <th className="px-4 py-3 text-left font-medium">Owner</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {closeChecklist.map((item) => (
                  <tr key={item.task} className="border-b last:border-0">
                    <td className="px-4 py-3">{item.task}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.owner}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs ${item.status === "Verified" ? "text-green-600" : "text-amber-600"}`}
                      >
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${item.status === "Verified" ? "bg-green-500" : "bg-amber-500"}`}
                        />
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Show me the close checklist" • "What steps are still pending for
          month-end?" • "Close the current period" • "Are all reconciliations
          complete?"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "CFO Agent",
              href: "/docs/agents/cfo",
              description: "Strategic oversight",
            },
            {
              title: "Ledger Agent",
              href: "/docs/agents/ledger",
              description: "Journal posting",
            },
            {
              title: "Fiscal Agent",
              href: "/docs/agents/fiscal",
              description: "Period management",
            },
            {
              title: "Fiscal Periods Module",
              href: "/docs/modules/fiscal",
              description: "Period closing workflow",
            },
          ]}
        />
      </div>
    </>
  );
}
