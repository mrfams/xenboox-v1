import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"

export default function DevSecOpsDocumentationPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">DevOps & Security Operations</h1>
        <p className="mt-4 text-muted-foreground">
          Infrastructure, deployment, monitoring, and security operations documentation.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">CI/CD Pipeline</h2>
          <Card>
            <CardHeader>
              <CardTitle>GitHub Actions Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Automated CI/CD pipeline defined in <code>.github/workflows/ci.yml</code>:
              </p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`jobs:
  lint:     # ESLint all packages
  typecheck: # TypeScript strict mode check
  test:     # Vitest unit tests
  build:    # Production build for all apps`}
              </pre>
              <p className="mt-2 text-sm text-muted-foreground">
                Pipeline runs on push and pull request to main branch.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Infrastructure</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Deployment Architecture</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Xenboox is deployed across multiple environments:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                  <li><strong>Web Frontend</strong> - Vercel with Edge Network</li>
                  <li><strong>Database</strong> - Neon PostgreSQL serverless</li>
                  <li><strong>Object Storage</strong> - Cloudflare R2</li>
                  <li><strong>Email</strong> - Resend</li>
                  <li><strong>Job Queue</strong> - Trigger.dev</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Required environment variables (never committed to git):
                </p>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto mt-2">
{`DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://app.xenboox.com
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
CLERK_SECRET_KEY=...
RESEND_API_KEY=...
ANTHROPIC_API_KEY=...`}</pre>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Monitoring & Observability</h2>
          <Card>
            <CardHeader>
              <CardTitle>LangFuse Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All agent activity is traced and logged to LangFuse for observability:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                <li><strong>Trace IDs</strong> - Each request gets a unique trace ID</li>
                <li><strong>Agent Activity</strong> - All agent decisions and confidence scores logged</li>
                <li><strong>LangChain Integration</strong> - LLM calls traced for debugging</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Backup & Disaster Recovery</h2>
          <Card>
            <CardHeader>
              <CardTitle>Backup Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Data protection measures:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                <li><strong>Database Backups</strong> - Neon automated daily backups retained for 7 days</li>
                <li><strong>R2 Versioning</strong> - Object storage versioning enabled for document recovery</li>
                <li><strong>Point-in-Time Recovery</strong> - Neon PITR allows recovery to any second within retention window</li>
                <li><strong>Data Export</strong> - All data exportable via admin dashboard</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Security Operations</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Incident Response</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Security incident flow:
                </p>
                <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                  <li><strong>Detection</strong> - Alert from monitoring or user report</li>
                  <li><strong>Triage</strong> - Assess severity and impact</li>
                  <li><strong>Containment</strong> - Disable affected accounts, rotate credentials</li>
                  <li><strong>Investigation</strong> - Review audit logs, trace IDs, agent activity</li>
                  <li><strong>Remediation</strong> - Apply fix, verify resolution</li>
                  <li><strong>Post-mortem</strong> - Document lessons learned, update prevention</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vulnerability Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Regular security practices:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                  <li><strong>Dependabot</strong> - Automated dependency vulnerability scanning</li>
                  <li><strong>Security Audits</strong> - Quarterly penetration testing</li>
                  <li><strong>Code Review</strong> - All PRs require review, security-sensitive changes flagged</li>
                  <li><strong>Secrets Detection</strong> - Pre-commit hooks scan for committed secrets</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Scaling & Performance</h2>
          <Card>
            <CardHeader>
              <CardTitle>Performance Considerations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Key performance and scaling notes:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                <li><strong>Connection Pooling</strong> - Neon serverless with PgBouncer for connection management</li>
                <li><strong>Caching</strong> - Redis for rate limiting, entity caching</li>
                <li><strong>Image Optimization</strong> - Next.js Image component for optimized images</li>
                <li><strong>Code Splitting</strong> - Dynamic imports for admin pages, loading.tsx skeletons</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  )
}