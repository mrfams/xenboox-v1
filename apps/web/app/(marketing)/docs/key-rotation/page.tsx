import { KeyRound, RefreshCcw, ShieldCheck, Clock } from "lucide-react";

import { DocsPageHeader } from "../components/docs-page-header";
import { InfoCallout } from "../components/info-callout";
import { RelatedLinks } from "../components/related-links";

import { Card, CardContent } from "@/components/ui";

const steps = [
  {
    title: "Schedule the rotation",
    description:
      "Rotations run on a documented cadence — quarterly for field-encryption keys, immediately after any suspected exposure.",
  },
  {
    title: "Dual-key window",
    description:
      "During rotation, new data is encrypted with the new key while old data remains decryptable with the previous key.",
  },
  {
    title: "Re-encrypt in background",
    description:
      "Stored fields are re-encrypted in the background in batches, so the window closes without downtime.",
  },
  {
    title: "Retire the old key",
    description:
      "Once every value is re-encrypted and verified, the old key is retired and destroyed. No key is ever reused.",
  },
];

export default function KeyRotationPage() {
  return (
    <>
      <DocsPageHeader
        title="Key Rotation"
        description="How Xenboox rotates encryption keys without downtime and why rotation is scheduled, not optional."
        breadcrumbs={[
          { label: "Security", href: "/docs/security" },
          { label: "Key Rotation", href: "/docs/key-rotation" },
        ]}
        icon={KeyRound}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Key rotation limits the blast radius of a compromised key: the
                longer a key lives, the more data it protects and the more
                damage its loss causes. Xenboox rotates field-encryption keys on
                a fixed schedule and supports immediate rotation on demand. The
                rotation process runs entirely in the background — users never
                experience downtime and data remains continuously readable.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Rotation Process
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ol className="space-y-4">
                {steps.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="warning" title="After a suspected exposure">
          If an encryption key or credential is suspected of exposure, rotate it
          immediately — do not wait for the scheduled window. Contact support
          for an expedited rotation.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Encryption",
              href: "/docs/security/encryption",
              description: "Encryption layers",
            },
            {
              title: "Security Overview",
              href: "/docs/security",
              description: "Platform security model",
            },
            {
              title: "Compliance",
              href: "/docs/security/compliance",
              description: "Standards",
            },
          ]}
        />
      </div>
    </>
  );
}
