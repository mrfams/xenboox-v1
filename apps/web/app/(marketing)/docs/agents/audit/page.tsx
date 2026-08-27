import {
  Shield,
  AlertTriangle,
  Search,
  FileText,
  CheckCircle,
  Eye,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const capabilities = [
  {
    title: "Compliance Checking",
    description:
      "Performs continuous compliance checks against accounting standards (IFRS/GAAP) and regulatory requirements. Flags non-compliant entries.",
    icon: Shield,
  },
  {
    title: "Anomaly Detection",
    description:
      "Detects unusual patterns in financial data using statistical analysis. Identifies potential errors, fraud, or policy violations.",
    icon: AlertTriangle,
  },
  {
    title: "Audit Trail Review",
    description:
      "Reviews the complete audit trail for selected transactions or periods. Validates that all entries have proper authorization and documentation.",
    icon: Eye,
  },
  {
    title: "Workpaper Generation",
    description:
      "Generates audit-ready workpapers with supporting schedules, reconciliations, and documentation references.",
    icon: FileText,
  },
  {
    title: "Risk Assessment",
    description:
      "Assesses risk levels across entities, accounts, and processes. Recommends control enhancements for high-risk areas.",
    icon: Search,
  },
];

export default function AuditAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Audit Agent"
        description="The Audit Agent performs continuous compliance checking, anomaly detection, and risk assessment. It ensures audit-readiness and identifies potential issues."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Audit", href: "/docs/agents/audit" },
        ]}
        icon={Shield}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Audit Agent provides continuous internal audit capabilities
                for Xenboox. It performs ongoing compliance checks against
                accounting standards and regulatory requirements, detects
                anomalies in financial data using statistical analysis, and
                generates audit-ready workpapers. The agent helps organizations
                maintain a state of continuous audit readiness, reducing the
                burden of periodic external audits. It works with the Compliance
                Agent for regulatory checks and the Reporting Agent for audit
                documentation.
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
            Audit Framework
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-attention-amber" />
                  Preventive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Prevents errors before they occur. Segregation of duties,
                  approval thresholds, entity scoping enforcement, and
                  validation rules embedded in all workflows.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Detective
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Detects anomalies and errors in real-time. Statistical
                  analysis, pattern recognition, and cross-system validation.
                  Flags unusual transactions for review.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-balanced-green" />
                  Corrective
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Recommendations for remediation. Adjusting entries, process
                  improvements, and control enhancements based on audit
                  findings.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Audit Checks
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">
                        Check Type
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Frequency
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Automation
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-3">Journal Entry Review</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Real-time
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-balanced-green">Auto</span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Account Balance Review</td>
                      <td className="px-4 py-3 text-muted-foreground">Daily</td>
                      <td className="px-4 py-3">
                        <span className="text-balanced-green">Auto</span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Reconciliation Review</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Weekly
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-balanced-green">Auto</span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Policy Compliance</td>
                      <td className="px-4 py-3 text-muted-foreground">Daily</td>
                      <td className="px-4 py-3">
                        <span className="text-balanced-green">Auto</span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Access Audit</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Weekly
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-balanced-green">Auto</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Full Audit Report</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Monthly
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-attention-amber">
                          Auto + Review
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Run compliance check for this period" • "Detect anomalies in Q4
          transactions" • "Show me the audit trail for entry J-100" • "Generate
          audit workpapers for FY 2025" • "What's our current risk assessment?"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Compliance Agent",
              href: "/docs/agents/compliance",
              description: "Regulatory compliance",
            },
            {
              title: "Controller Agent",
              href: "/docs/agents/controller",
              description: "Period close auditing",
            },
            {
              title: "Ledger Agent",
              href: "/docs/agents/ledger",
              description: "Audit trail maintenance",
            },
            {
              title: "Reporting Agent",
              href: "/docs/agents/reporting",
              description: "Audit documentation",
            },
          ]}
        />
      </div>
    </>
  );
}
