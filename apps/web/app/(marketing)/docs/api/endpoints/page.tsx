import { ListTree, Boxes, Lock, RefreshCcw } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const routers = [
  {
    group: "Accounting",
    description: "Chart of accounts, journal entries, fiscal periods, reports",
    procedures: [
      ["journal.list", "query", "Paginated journal entries for the entity"],
      [
        "journal.getOutlierSignals",
        "query",
        "GL anomaly and duplicate detection",
      ],
      ["coa.list", "query", "Chart of accounts with balances"],
      ["reports.getPnlOverview", "query", "Profit & loss summary for a period"],
      [
        "reports.getReportNarrative",
        "query",
        "Data-driven narrative for a report",
      ],
    ],
  },
  {
    group: "Accounts Payable & Receivable",
    description: "Invoices, purchase orders, payments, and aging",
    procedures: [
      ["ap.listInvoices", "query", "Paginated AP invoices"],
      ["ap.approveInvoice", "mutation", "Approve an AP invoice for payment"],
      ["ar.listInvoices", "query", "Paginated sales invoices"],
      ["ar.sendReminder", "mutation", "Send a collection reminder"],
    ],
  },
  {
    group: "Payroll & Treasury",
    description: "Payroll runs, bank, cash, and mobile money",
    procedures: [
      ["payroll.listRuns", "query", "Payroll runs with status"],
      ["treasury.getCashPosition", "query", "Consolidated cash position"],
      ["reconciliation.list", "query", "Bank reconciliations"],
      ["expenses.listClaims", "query", "Employee expense claims"],
    ],
  },
  {
    group: "Platform",
    description: "Documents, automation, analytics, and admin",
    procedures: [
      ["documents.list", "query", "Document library with OCR status"],
      ["automation.listRules", "query", "Automation rules and schedules"],
      ["admin.getAIUsage", "query", "AI usage analytics (admin)"],
      [
        "admin.getFinancialHealth",
        "query",
        "Platform financial health (admin)",
      ],
    ],
  },
];

export default function ApiEndpointsPage() {
  return (
    <>
      <DocsPageHeader
        title="Endpoints"
        description="The Xenboox tRPC procedure catalog — every procedure is typed, validated, authenticated, and entity-scoped."
        breadcrumbs={[
          { label: "API", href: "/docs/api" },
          { label: "Endpoints", href: "/docs/api/endpoints" },
        ]}
        icon={ListTree}
      />

      <div className="space-y-10">
        {routers.map((router) => (
          <section key={router.group}>
            <h2 className="text-2xl font-bold tracking-tight mb-1">
              {router.group}
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {router.description}
            </p>
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">
                          Procedure
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {router.procedures.map(([name, type, desc]) => (
                        <tr key={name} className="border-b last:border-0">
                          <td className="px-4 py-3 font-mono text-xs">
                            {name}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                type === "query"
                                  ? "text-primary"
                                  : "text-emerald-600"
                              }
                            >
                              {type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {desc}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        ))}

        <InfoCallout type="info" title="Everything is typed">
          Inputs and outputs are defined once in TypeScript and validated with
          Zod at runtime. Invalid input returns a structured error with field
          details — never a bare stack trace.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Authentication",
              href: "/docs/api/auth",
              description: "Sessions and API keys",
            },
            {
              title: "Rate Limits",
              href: "/docs/api/rate-limits",
              description: "Per-plan quotas",
            },
            {
              title: "Webhooks",
              href: "/docs/webhooks",
              description: "Event notifications",
            },
          ]}
        />
      </div>
    </>
  );
}
