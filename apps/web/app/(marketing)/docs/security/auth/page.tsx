import {
  ShieldCheck,
  Fingerprint,
  KeyRound,
  Clock,
  MailCheck,
  Lock,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { InfoCallout } from "../../components/info-callout";
import { FeatureGrid } from "../../components/feature-grid";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const features = [
  {
    title: "Password Authentication",
    description:
      "Passwords are hashed with a modern adaptive algorithm — never stored or transmitted in plaintext. Policy enforces minimum strength and rotation.",
    icon: Lock,
  },
  {
    title: "Two-Factor Authentication",
    description:
      "TOTP-based 2FA (Google Authenticator, Authy, 1Password) can be enforced per organization or per user, with recovery codes issued at setup.",
    icon: Fingerprint,
  },
  {
    title: "Email Verification",
    description:
      "New accounts must verify their email before performing mutations. Verification links are single-use and time-limited.",
    icon: MailCheck,
  },
  {
    title: "Session Security",
    description:
      "Sessions are tracked server-side, expire on inactivity, and can be revoked remotely at any time. Revocation takes effect immediately — not on next login.",
    icon: Clock,
  },
  {
    title: "OAuth (Google)",
    description:
      "Sign in with Google is supported. OAuth identities are linked to the same access-control model as password accounts.",
    icon: KeyRound,
  },
];

export default function SecurityAuthPage() {
  return (
    <>
      <DocsPageHeader
        title="Authentication & Sessions"
        description="How Xenboox verifies identity, protects credentials, and keeps sessions under your control."
        breadcrumbs={[
          { label: "Security", href: "/docs/security" },
          { label: "Authentication", href: "/docs/security/auth" },
        ]}
        icon={ShieldCheck}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Identity Controls
          </h2>
          <FeatureGrid features={features} />
        </section>

        <InfoCallout type="warning" title="Enable 2FA for finance users">
          Roles that can approve payments or post journal entries are the
          highest-value targets. Xenboox strongly recommends enforcing 2FA for
          all users holding approver or post permissions.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Security Overview",
              href: "/docs/security",
              description: "Platform security model",
            },
            {
              title: "API Authentication",
              href: "/docs/api/auth",
              description: "Sessions and API keys",
            },
            {
              title: "Users & Roles",
              href: "/docs/users-roles",
              description: "Access control",
            },
          ]}
        />
      </div>
    </>
  );
}
