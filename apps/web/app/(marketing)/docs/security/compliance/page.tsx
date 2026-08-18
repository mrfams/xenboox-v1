import {
  ShieldCheck,
  FileCheck,
  ScrollText,
  Landmark,
  Globe2,
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
      "Every action is recorded with who, what, when, why, and confidence. The tamper-evident hash chain makes post-hoc alteration detectable.",
    icon: ScrollText,
  },
  {
    title: "Accounting Standards",
    description:
      "Double-entry bookkeeping aligned with IFRS and GAAP conventions — with support for local statutory requirements (PAYE, VAT, social security).",
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
];

export default function SecurityCompliancePage() {
  return (
    <>
      <DocsPageHeader
        title="Compliance"
        description="Built for audit-readiness — standards-aligned accounting, a tamper-evident audit trail, and data protection by design."
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
          <FeatureGrid features={compliance} />
        </section>

        <InfoCallout type="info" title="Tamper-evident audit chain">
          The audit log is append-only and hash-chained: each entry references
          the hash of the previous one, and any alteration breaks the chain.
          TRUNCATE, UPDATE, and DELETE are blocked at the database layer.
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
          ]}
        />
      </div>
    </>
  );
}
