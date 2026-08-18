import {
  Lock,
  ShieldCheck,
  Database,
  KeyRound,
  EyeOff,
  Layers,
  FileKey2,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { InfoCallout } from "../../components/info-callout";
import { FeatureGrid } from "../../components/feature-grid";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const layers = [
  {
    title: "Encryption in Transit",
    description:
      "All traffic is encrypted with TLS 1.3. Connections to the database, object storage, and third-party APIs are always encrypted end to end. Certificates are automatically renewed and never self-signed.",
    icon: Lock,
  },
  {
    title: "Encryption at Rest",
    description:
      "Financial data is encrypted at rest with AES-256. Database volumes, automated backups, and object storage are all protected — an attacker who exfiltrates storage media still cannot read the data without the keys.",
    icon: Database,
  },
  {
    title: "Field-Level Encryption",
    description:
      "Sensitive fields — bank account numbers, mobile money details, identity documents, and TOTP secrets — are additionally encrypted at the application layer with per-tenant keys before they reach the database.",
    icon: EyeOff,
  },
  {
    title: "Key Hierarchy",
    description:
      "Keys are organized in a hierarchy: a root master key protects data-encryption keys, which in turn protect per-tenant field keys. No single key can decrypt everything, and keys never appear in logs or error messages.",
    icon: Layers,
  },
  {
    title: "Key Management & Rotation",
    description:
      "Keys are managed centrally, rotated on a documented schedule, and versioned so old data remains readable during transition. Rotation follows the published runbook with zero downtime.",
    icon: KeyRound,
  },
];

const rotationSteps = [
  {
    step: "1",
    title: "Schedule & Plan",
    description:
      "Rotation is planned against the key lifecycle policy. Affected services are identified, and the maintenance window is announced if any transient impact is expected (typically none — rotation is designed to be transparent).",
  },
  {
    step: "2",
    title: "Generate New Key Version",
    description:
      "A new key version is created alongside the current one. Data encrypted under the old version remains decryptable, so no re-encryption of historical records is required in the same pass.",
  },
  {
    step: "3",
    title: "Rollover Write Path",
    description:
      "New writes use the newest key version. Reads still work across all active versions, so services keep functioning through the transition without coordinated downtime.",
  },
  {
    step: "4",
    title: "Verify & Retire",
    description:
      "Once the new version has been in service and verified, the old version is retired and destroyed on schedule. Destruction is logged to the audit trail.",
  },
];

export default function SecurityEncryptionPage() {
  return (
    <>
      <DocsPageHeader
        title="Encryption"
        description="Defense in depth — your financial data is protected in transit, at rest, and at the field level, with keys that are managed, versioned, and rotated on schedule."
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
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Xenboox applies encryption at three independent layers. Each layer
            protects against a different class of threat — network interception,
            storage exfiltration, and application-layer compromise — so a breach
            at any single layer does not expose tenant financial data.
          </p>
          <FeatureGrid features={layers} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Cipher & Algorithm Standards
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <li className="flex gap-3">
                  <FileKey2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    <strong className="text-foreground">In transit:</strong> TLS
                    1.3 with forward secrecy. TLS 1.0 and 1.1 are unsupported;
                    TLS 1.2 is accepted only with modern cipher suites.
                  </span>
                </li>
                <li className="flex gap-3">
                  <FileKey2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    <strong className="text-foreground">At rest:</strong>{" "}
                    AES-256 encryption for database volumes, backups, and object
                    storage.
                  </span>
                </li>
                <li className="flex gap-3">
                  <FileKey2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    <strong className="text-foreground">
                      Field-level secrets:
                    </strong>{" "}
                    AES-256-GCM authenticated encryption with per-tenant keys.
                    GCM provides integrity verification, so tampered ciphertext
                    is detected and rejected rather than silently decrypted.
                  </span>
                </li>
                <li className="flex gap-3">
                  <FileKey2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    <strong className="text-foreground">Passwords:</strong>{" "}
                    hashed with bcrypt using a cost factor tuned to current
                    hardware. Plaintext passwords are never stored or logged.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Key Rotation Runbook
          </h2>
          <div className="space-y-3">
            {rotationSteps.map((item) => (
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

        <InfoCallout type="info" title="Per-tenant isolation">
          Field-level encryption uses per-tenant keys, so even a compromised
          application-layer secret cannot decrypt another tenant's sensitive
          fields. Combined with row-level security and entity scoping, this
          gives multi-layer tenant isolation — the same key that protects one
          customer's bank details is useless against another customer's data.
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
              description: "Rotation policy and runbook",
            },
            {
              title: "Compliance",
              href: "/docs/security/compliance",
              description: "Standards and certifications",
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
