import { Lock, ShieldCheck, Database, KeyRound, EyeOff } from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { InfoCallout } from "../../components/info-callout";
import { FeatureGrid } from "../../components/feature-grid";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const layers = [
  {
    title: "Encryption in Transit",
    description:
      "All traffic is encrypted with TLS 1.3. Connections to the database, object storage, and third-party APIs are always encrypted end to end.",
    icon: Lock,
  },
  {
    title: "Encryption at Rest",
    description:
      "Financial data is encrypted at rest with AES-256. Database volumes, backups, and object storage are all protected.",
    icon: Database,
  },
  {
    title: "Field-Level Encryption",
    description:
      "Sensitive fields — bank account numbers, mobile money details, and identity documents — are additionally encrypted at the application layer with per-tenant keys.",
    icon: EyeOff,
  },
  {
    title: "Key Management",
    description:
      "Encryption keys are managed centrally, rotated on schedule, and never logged. Key rotation follows the documented runbook with no downtime.",
    icon: KeyRound,
  },
];

export default function SecurityEncryptionPage() {
  return (
    <>
      <DocsPageHeader
        title="Encryption"
        description="Defense in depth — your financial data is protected in transit, at rest, and at the field level."
        breadcrumbs={[
          { label: "Security", href: "/docs/security" },
          { label: "Encryption", href: "/docs/security/encryption" },
        ]}
        icon={ShieldCheck}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Encryption Layers
          </h2>
          <FeatureGrid features={layers} />
        </section>

        <InfoCallout type="info" title="Per-tenant isolation">
          Field-level encryption uses per-tenant keys, so even a compromised
          application-layer secret cannot decrypt another tenant's sensitive
          fields. Combined with row-level security and entity scoping, this
          gives multi-layer tenant isolation.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Security Overview",
              href: "/docs/security",
              description: "Platform security model",
            },
            {
              title: "Key Rotation",
              href: "/docs/key-rotation",
              description: "Rotation runbook",
            },
            {
              title: "Compliance",
              href: "/docs/security/compliance",
              description: "Standards and certifications",
            },
          ]}
        />
      </div>
    </>
  );
}
