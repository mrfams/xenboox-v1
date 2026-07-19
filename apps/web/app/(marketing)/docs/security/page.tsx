import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"

export default function SecurityDocumentationPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Security Documentation</h1>
        <p className="mt-4 text-muted-foreground">
          Comprehensive security overview for Xenboox platform administrators and developers.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Authentication & Authorization</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Auth.js v5 Implementation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Xenboox uses Auth.js v5 for authentication with the following providers:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                  <li><strong>Credentials Provider</strong> - Email/password authentication with bcrypt hashed passwords</li>
                  <li><strong>Google OAuth</strong> - OAuth 2.0 flow with PKCE for secure authentication</li>
                  <li><strong>Session Management</strong> - JWT-based sessions with 30-day expiry</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entity Scoping & RBAC</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Every API request is scoped to an entity. The <code>rlsProtectedProcedure</code> middleware sets 
                  PostgreSQL Row Level Security (RLS) context via <code>SET_config()</code>.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <strong>Roles:</strong> owner, admin, finance_director, accountant, payroll_officer, 
                  cashier, department_manager, employee, external_auditor, donor
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Data Encryption</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Encryption at Rest</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  All sensitive financial data is encrypted with AES-256 before storage.
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                  <li><strong>Database Encryption</strong> - PostgreSQL TDE with customer-managed keys</li>
                  <li><strong>Field-level Encryption</strong> - PII fields (SSN, tax_id) encrypted separately</li>
                  <li><strong>R2 Object Storage</strong> - Cloudflare R2 with server-side encryption</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Encryption in Transit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  All data in transit uses TLS 1.3 encryption.
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                  <li><strong>HTTP Headers</strong> - Strict-Transport-Security: max-age=63072000; includeSubDomains; preload</li>
                  <li><strong>API Communication</strong> - tRPC over HTTPS with certificate pinning</li>
                  <li><strong>Third-party APIs</strong> - Outbound connections to LLM providers use TLS 1.3</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Security Headers</h2>
          <Card>
            <CardHeader>
              <CardTitle>Content Security Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                CSP is implemented with per-request nonces for script and style execution:
              </p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`Content-Security-Policy: default-src 'self';
script-src 'self' https://cdn.jsdelivr.net 'nonce-{nonce}';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-{nonce}';
img-src 'self' data: https: blob:;
connect-src 'self' https://api.anthropic.com https://api.openai.com;
font-src 'self' https://fonts.gstatic.com;
object-src 'none';
frame-ancestors 'none';
frame-src 'none';
base-uri 'self';
form-action 'self';`}
              </pre>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Rate Limiting</h2>
          <Card>
            <CardHeader>
              <CardTitle>API Rate Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Rate limiting is implemented using Upstash Redis with fixed-window algorithm:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li><strong>API Requests</strong> - 1000 requests per 60 seconds per IP/user</li>
                <li><strong>Auth Endpoints</strong> - 10 requests per 60 seconds per IP (prevents brute force)</li>
                <li><strong>Webhooks</strong> - 100 requests per 60 seconds per endpoint</li>
              </ul>
              <p className="mt-2 text-sm text-muted-foreground">
                Rate limit headers are returned: <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>, <code>X-RateLimit-Reset</code>
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">CSRF Protection</h2>
          <Card>
            <CardHeader>
              <CardTitle>Cross-Site Request Forgery</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                CSRF protection is implemented at multiple levels:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                <li><strong>Same-Origin Validation</strong> - Requests without Origin header require safe Content-Type</li>
                <li><strong>Auth.js CSRF</strong> - Built-in CSRF token handling for auth endpoints</li>
                <li><strong>SameSite Cookies</strong> - Cookies set with SameSite=Strict</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Audit Logging</h2>
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All significant actions are logged to the <code>audit_log</code> table:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                <li><strong>User Actions</strong> - Recorded with user_id, ip_address, user_agent</li>
                <li><strong>Agent Actions</strong> - Recorded with agent_id, confidence, reasoning</li>
                <li><strong>Financial Changes</strong> - Before/after state captured in changes JSONB</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Security Compliance</h2>
          <Card>
            <CardHeader>
              <CardTitle>GDPR & Data Protection</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li><strong>Data Export</strong> - Users can export all their data at any time</li>
                <li><strong>Data Deletion</strong> - Account deletion triggers 30-day grace period then permanent deletion</li>
                <li><strong>Data Retention</strong> - Financial data retained for 7 years as per accounting regulations</li>
                <li><strong>Right to Erasure</strong> - PII can be anonymized while preserving financial records</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  )
}