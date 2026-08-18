import {
  ShieldCheck,
  Fingerprint,
  KeyRound,
  Clock,
  MailCheck,
  Lock,
  LogOut,
  Ban,
  UserCheck,
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
      "Passwords are hashed with a modern adaptive algorithm — never stored or transmitted in plaintext. Policy enforces minimum strength, and the hash cost factor is tuned to current hardware.",
    icon: Lock,
  },
  {
    title: "Two-Factor Authentication",
    description:
      "TOTP-based 2FA (Google Authenticator, Authy, 1Password) can be enforced per organization or per user, with recovery codes issued at setup. Approver and post roles should be 2FA-enforced.",
    icon: Fingerprint,
  },
  {
    title: "Email Verification",
    description:
      "New accounts must verify their email before performing mutations. Verification links are single-use and time-limited, and the verified state is enforced at the procedure level.",
    icon: MailCheck,
  },
  {
    title: "Session Security",
    description:
      "Sessions are tracked server-side, expire on inactivity, and can be revoked remotely at any time. Revocation takes effect immediately — not on next login — because the server validates every request against the live session record.",
    icon: Clock,
  },
  {
    title: "OAuth (Google)",
    description:
      "Sign in with Google is supported. OAuth identities are linked to the same access-control model as password accounts, so roles and permissions behave identically regardless of how a user signed in.",
    icon: KeyRound,
  },
  {
    title: "Account Lockout",
    description:
      "Repeated failed sign-in attempts trigger progressive lockout with an escalating cooldown. Lockout state is tracked per account and IP, and successful MFA resets the counter.",
    icon: Ban,
  },
];

const sessionSteps = [
  {
    step: "1",
    title: "Sign In",
    description:
      "The user authenticates with credentials plus MFA where enforced. On success, a session token is created and stored server-side with an absolute expiry.",
  },
  {
    step: "2",
    title: "Every Request Validated",
    description:
      "Each authenticated request is checked against the live session record — not just the signed token. Revoked or expired sessions are rejected immediately.",
  },
  {
    step: "3",
    title: "Idle Timeout",
    description:
      "An inactivity window is layered on top of the absolute expiry. After the idle window elapses without activity, the session is invalidated even if the absolute expiry hasn't been reached.",
  },
  {
    step: "4",
    title: "Remote Revocation",
    description:
      "Users and admins can revoke any session from the settings panel. The revoked session stops working on the very next request — no waiting for a token to expire.",
  },
  {
    step: "5",
    title: "Sign Out",
    description:
      "Signing out deletes the server-side session record, making the token permanently invalid. The same path is used for forced sign-out after password changes.",
  },
];

export default function SecurityAuthPage() {
  return (
    <>
      <DocsPageHeader
        title="Authentication & Sessions"
        description="How Xenboox verifies identity, protects credentials, and keeps sessions under your control — from sign-in to remote revocation."
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
          <FeatureGrid features={features} columns={3} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Session Lifecycle
          </h2>
          <div className="space-y-3">
            {sessionSteps.map((item) => (
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

        <InfoCallout type="warning" title="Enable 2FA for finance users">
          Roles that can approve payments or post journal entries are the
          highest-value targets. Xenboox strongly recommends enforcing 2FA for
          all users holding approver or post permissions — the same enforcement
          the admin control plane already requires for every platform admin.
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
              description: "Access control and permissions",
            },
            {
              title: "Encryption",
              href: "/docs/security/encryption",
              description: "Credential and data protection",
            },
          ]}
        />
      </div>
    </>
  );
}
