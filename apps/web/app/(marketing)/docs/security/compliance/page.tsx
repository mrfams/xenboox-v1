import {
  ShieldCheck,
  FileCheck,
  ScrollText,
  Landmark,
  Globe2,
  Database,
  UserCheck,
  Link2,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { InfoCallout } from "../../components/info-callout";
import { FeatureGrid } from "../../components/feature-grid";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const compliance = [
  {
    title: "Audit Trail",
    description:
      "Every action is recorded with who, what, when, why, and confidence. The tamper-evident hash chain makes post-hoc alteration detectable and traceable to the exact entry.",
    icon: ScrollText,
  },
  {
    title: "Accounting Standards",
    description:
      "Double-entry bookkeeping aligned with IFRS and GAAP conventions — with support for local statutory requirements (PAYE, VAT, social security) across jurisdictions.",
    icon: Landmark,
  },
  {
    title: "Data Protection",
    description:
      "GDPR-aligned data handling: encrypted at rest, scoped access, documented retention, and export/deletion tooling for personal data.",
    icon: Globe2,
  },
  {
    title: "Audit Readiness",
    description:
      "The Audit Agent maintains continuous audit readiness — workpapers, anomaly detection, and independent recomputation on demand.",
    icon: FileCheck,
  },
  {
    title: "Least-Privilege Access",
    description:
      "Role-based access control with granular module permissions. Users see only what their role grants, and every permission grant is itself audited.",
    icon: UserCheck,
  },
  {
    title: "Data Residency Controls",
    description:
      "Entity-level scoping keeps each tenant's financial data isolated at the database layer — not merely at the application layer — enforced by row-level security.",
    icon: Database,
  },
];

const lifecycleSteps = [
  {
    step: "1",
    title: "Collection",
    description:
      "Personal and financial data is collected only where required for the service, with purpose limitation applied at the schema level.",
  },
  {
    step: "2",
    title: "Protection",
    description:
      "Data is encrypted in transit and at rest, with sensitive fields encrypted at the application layer under per-tenant keys.",
  },
  {
    step: "3",
    title: "Scoped Access",
    description:
      "Access is granted by role and entity. Row-level security enforces the boundary on every query — a misconfigured application can never read across tenants.",
  },
  {
    step: "4",
    title: "Retention",
    description:
      "Retention is documented per data category. Backup schedules and deletion policies are explicit and auditable.",
  },
  {
    step: "5",
    title: "Export & Deletion",
    description:
      "Data subjects can export their data and request deletion. Tooling produces a complete record of personal data for export or removal.",
  },
];

export default function SecurityCompliancePage() {
  return (
    <>
      <DocsPageHeader
        title="Compliance"
        description="Built for audit-readiness — standards-aligned accounting, a tamper-evident audit trail, and data protection by design, not as an afterthought."
        breadcrumbs={[
          { label: "Security", href: "/docs/security" },
          { label: "Compliance", href: "/docs/security/compliance" },
        ]}
        icon={ShieldCheck}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Compliance Areas
          </h2>
          <FeatureGrid features={compliance} columns={3} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Data Lifecycle
          </h2>
          <div className="space-y-3">
            {lifecycleSteps.map((item) => (
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
            How the Audit Trail Works
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <li className="flex gap-3">
                  <Link2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    <strong className="text-foreground">
                      Append-only storage:
                    </strong>{" "}
                    the audit log lives in an append-only table. TRUNCATE,
                    UPDATE, and DELETE are blocked at the database layer, so
                    entries cannot be edited or removed through normal
                    application paths.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Link2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    <strong className="text-foreground">Hash chaining:</strong>{" "}
                    each entry references the hash of the previous entry.
                    Altering any historical record breaks the chain, making the
                    tampering detectable by any party holding the log.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Link2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    <strong className="text-foreground">
                      Full attribution:
                    </strong>{" "}
                    every entry records the actor (user, agent, or system), the
                    action, the target record, a timestamp, and — for agent
                    actions — the confidence score that justified the action.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Link2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    <strong className="text-foreground">
                      Independent verification:
                    </strong>{" "}
                    the Audit Agent can recompute any financial period and
                    compare its workpapers against the ledger, so auditors get a
                    second, independent path through the same records.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="info" title="Tamper-evident by default">
          Compliance isn't a report you generate — it's how the system is built.
          The audit chain, entity scoping, and standards-aligned accounting are
          enforced continuously, so your books are audit-ready at any moment,
          not just after a preparation pass.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Security Overview",
              href: "/docs/security",
              description: "Platform security model",
            },
            {
              title: "Audit Agent",
              href: "/docs/agents/audit",
              description: "Continuous audit readiness",
            },
            {
              title: "Encryption",
              href: "/docs/security/encryption",
              description: "Data protection",
            },
            {
              title: "Authentication",
              href: "/docs/security/auth",
              description: "Identity and session controls",
            },
          ]}
        />
      </div>
    </>
  );
}
