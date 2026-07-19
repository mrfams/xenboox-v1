import {
  MarketingShell,
  PageHero,
  Reveal,
  GlassCard,
} from "../../components/marketing-primitives";

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal>
      <GlassCard className="p-7">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <div className="mt-4 space-y-3 text-sm text-white/60">{children}</div>
      </GlassCard>
    </Reveal>
  );
}

export default function SecurityDocumentationPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Documentation"
        title="Security"
        highlight="Documentation"
        subtitle="A comprehensive security overview for Xenboox platform administrators and developers."
      />

      <section className="space-y-6 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">
              Authentication & Authorization
            </h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-2">
            <Block title="Auth.js v5 Implementation">
              <p>
                Xenboox uses Auth.js v5 for authentication with the following
                providers:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong className="text-white/90">
                    Credentials Provider
                  </strong>{" "}
                  — Email/password authentication with hashed passwords
                </li>
                <li>
                  <strong className="text-white/90">Google OAuth</strong> —
                  OAuth 2.0 flow with PKCE for secure authentication
                </li>
                <li>
                  <strong className="text-white/90">Session Management</strong>{" "}
                  — JWT-based sessions with 30-day expiry
                </li>
              </ul>
            </Block>
            <Block title="Entity Scoping & RBAC">
              <p>
                Every API request is scoped to an entity. The{" "}
                <code>rlsProtectedProcedure</code> middleware sets PostgreSQL
                Row Level Security (RLS) context via <code>SET_config()</code>.
              </p>
              <p className="mt-2">
                <strong className="text-white/90">Roles:</strong> owner, admin,
                finance_director, accountant, payroll_officer, cashier,
                department_manager, employee, external_auditor, donor
              </p>
            </Block>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">
              Data Encryption
            </h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-2">
            <Block title="Encryption at Rest">
              <p>
                All sensitive financial data is encrypted with AES-256 before
                storage.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong className="text-white/90">Database Encryption</strong>{" "}
                  — PostgreSQL TDE with customer-managed keys
                </li>
                <li>
                  <strong className="text-white/90">
                    Field-level Encryption
                  </strong>{" "}
                  — PII fields (SSN, tax_id) encrypted separately
                </li>
                <li>
                  <strong className="text-white/90">R2 Object Storage</strong> —
                  Cloudflare R2 with server-side encryption
                </li>
              </ul>
            </Block>
            <Block title="Encryption in Transit">
              <p>All data in transit uses TLS 1.3 encryption.</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong className="text-white/90">HTTP Headers</strong> —
                  Strict-Transport-Security: max-age=63072000;
                  includeSubDomains; preload
                </li>
                <li>
                  <strong className="text-white/90">API Communication</strong> —
                  tRPC over HTTPS with certificate pinning
                </li>
                <li>
                  <strong className="text-white/90">Third-party APIs</strong> —
                  Outbound connections to LLM providers use TLS 1.3
                </li>
              </ul>
            </Block>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">
              Security Headers
            </h2>
          </Reveal>
          <Block title="Content Security Policy">
            <p className="mb-2">
              CSP is implemented with per-request nonces for script and style
              execution:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-black/40 p-4 text-xs text-white/80">{`Content-Security-Policy: default-src 'self';
script-src 'self' https://cdn.jsdelivr.net 'nonce-{nonce}';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-{nonce}';
img-src 'self' data: https: blob:;
connect-src 'self' https://api.anthropic.com https://api.openai.com;
font-src 'self' https://fonts.gstatic.com;
object-src 'none';
frame-ancestors 'none';
frame-src 'none';
base-uri 'self';
form-action 'self';`}</pre>
          </Block>
        </div>

        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">
              Rate Limiting
            </h2>
          </Reveal>
          <Block title="API Rate Limits">
            <p className="mb-2">
              Rate limiting is implemented using Upstash Redis with a
              fixed-window algorithm:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-white/90">API Requests</strong> — 1000
                requests per 60 seconds per IP/user
              </li>
              <li>
                <strong className="text-white/90">Auth Endpoints</strong> — 10
                requests per 60 seconds per IP (prevents brute force)
              </li>
              <li>
                <strong className="text-white/90">Webhooks</strong> — 100
                requests per 60 seconds per endpoint
              </li>
            </ul>
            <p className="mt-2">
              Rate limit headers are returned: <code>X-RateLimit-Limit</code>,{" "}
              <code>X-RateLimit-Remaining</code>, <code>X-RateLimit-Reset</code>
            </p>
          </Block>
        </div>

        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">
              CSRF Protection
            </h2>
          </Reveal>
          <Block title="Cross-Site Request Forgery">
            <p>CSRF protection is implemented at multiple levels:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-white/90">
                  Same-Origin Validation
                </strong>{" "}
                — Requests without Origin header require safe Content-Type
              </li>
              <li>
                <strong className="text-white/90">Auth.js CSRF</strong> —
                Built-in CSRF token handling for auth endpoints
              </li>
              <li>
                <strong className="text-white/90">SameSite Cookies</strong> —
                Cookies set with SameSite=Strict
              </li>
            </ul>
          </Block>
        </div>

        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">
              Audit Logging
            </h2>
          </Reveal>
          <Block title="Audit Trail">
            <p>
              All significant actions are logged to the <code>audit_log</code>{" "}
              table:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-white/90">User Actions</strong> —
                Recorded with user_id, ip_address, user_agent
              </li>
              <li>
                <strong className="text-white/90">Agent Actions</strong> —
                Recorded with agent_id, confidence, reasoning
              </li>
              <li>
                <strong className="text-white/90">Financial Changes</strong> —
                Before/after state captured in changes JSONB
              </li>
            </ul>
          </Block>
        </div>

        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">
              Security Compliance
            </h2>
          </Reveal>
          <Block title="GDPR & Data Protection">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-white/90">Data Export</strong> — Users
                can export all their data at any time
              </li>
              <li>
                <strong className="text-white/90">Data Deletion</strong> —
                Account deletion triggers 30-day grace period then permanent
                deletion
              </li>
              <li>
                <strong className="text-white/90">Data Retention</strong> —
                Financial data retained for 7 years as per accounting
                regulations
              </li>
              <li>
                <strong className="text-white/90">Right to Erasure</strong> —
                PII can be anonymized while preserving financial records
              </li>
            </ul>
          </Block>
        </div>
      </section>
    </MarketingShell>
  );
}
