import {
  KeyRound,
  ShieldCheck,
  Fingerprint,
  Clock,
  RefreshCcw,
  Lock,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { InfoCallout } from "../../components/info-callout";
import { FeatureGrid } from "../../components/feature-grid";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const methods = [
  {
    title: "Session Authentication",
    description:
      "The web app authenticates with Auth.js session cookies. The session is validated against the database on every request, so revocation takes effect immediately.",
    icon: Fingerprint,
  },
  {
    title: "API Keys",
    description:
      "Machine-to-machine integrations use API keys scoped to a user and entity. Keys are hashed at rest and can be revoked individually from Settings.",
    icon: KeyRound,
  },
  {
    title: "Entity Header",
    description:
      "Business procedures read the x-entity-id header to resolve the active entity. The caller must have an access grant for that entity.",
    icon: ShieldCheck,
  },
];

const flow = [
  {
    title: "Obtain credentials",
    description:
      "Sign in as a user (session) or create an API key from Settings → API Keys.",
  },
  {
    title: "Attach identity",
    description:
      "Send the session cookie or API key on every request, plus the x-entity-id header.",
  },
  {
    title: "Server verifies",
    description:
      "The server validates the session or key against the database, resolves the entity, and checks the user's role and permissions.",
  },
  {
    title: "Execute with audit",
    description:
      "The request runs with entity scoping enforced, and mutations write to the audit trail with the acting user's identity.",
  },
];

export default function ApiAuthPage() {
  return (
    <>
      <DocsPageHeader
        title="Authentication"
        description="How requests prove identity and entity context to the Xenboox API."
        breadcrumbs={[
          { label: "API", href: "/docs/api" },
          { label: "Authentication", href: "/docs/api/auth" },
        ]}
        icon={KeyRound}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Authentication Methods
          </h2>
          <FeatureGrid features={methods} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Request Flow
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ol className="space-y-4">
                {flow.map((step, i) => (
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

        <InfoCallout type="warning" title="Protect your credentials">
          API keys grant full access as the owning user. Never commit keys to
          source control, never log them, and rotate them immediately if you
          suspect exposure. Keys are stored hashed — Xenboox support cannot
          retrieve a lost key.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "API Overview",
              href: "/docs/api",
              description: "Platform reference",
            },
            {
              title: "Security",
              href: "/docs/security",
              description: "Encryption and RLS",
            },
            {
              title: "Users & Roles",
              href: "/docs/users-roles",
              description: "Permissions model",
            },
          ]}
        />
      </div>
    </>
  );
}
