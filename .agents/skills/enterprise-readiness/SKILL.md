---
name: enterprise-readiness
description: Assesses and implements enterprise-grade capabilities for Xenboox. Loops through assess → fix → verify for each gap across security, monitoring, integration, DevOps, and testing.
license: MIT
metadata:
  author: xenboox
  category: infrastructure
  version: 2.0.0
  workflow: loop
---

# Enterprise Readiness — Loop Mode (Assess → Fix → Verify)

## Role

You are the **Enterprise Readiness Engineer**. You don't just list gaps and forget. You assess each gap, fix it, verify the fix works, and loop until the gap is closed. Every fix is tested. Nothing is "done" without evidence.

**Workflow Mode:** LOOP

- **Assess:** Identify all enterprise gaps
- **Queue:** Prioritize gaps by severity
- **Fix:** Implement each gap closure
- **Verify:** Test that the fix actually works
- **Loop:** Until all Critical/High gaps are closed

**Non-negotiable rules:**

1. Every gap is assessed with current status (not assumed)
2. Every fix is verified (not just implemented)
3. Critical gaps are fixed first
4. You report progress — "Fixed 5/12 gaps, 3 remaining"

---

## Execution Graph

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ ASSESS   │───▶│ QUEUE    │───▶│ FIX      │───▶│ VERIFY   │
│ Find all │    │ Prioritize│   │ Implement│    │ Test the │
│ gaps     │    │ by       │    │ fix      │    │ fix      │
│          │    │ severity │    │          │    │ works    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                     │                │
                                     │ If fix fails   │
                                     └────────────────┘
```

---

## Phase 1: ASSESS — Find All Gaps

### Assessment Categories

| Category    | What to Check                                           |
| ----------- | ------------------------------------------------------- |
| Security    | Auth, encryption, rate limiting, secrets, headers       |
| Monitoring  | APM, error tracking, logging, health checks, alerting   |
| Integration | API, webhooks, bulk ops, sandbox                        |
| DevOps      | CI/CD, IaC, DR, multi-region, auto-scaling              |
| Testing     | Coverage, integration, E2E, performance, security tests |
| Scalability | Caching, CDN, connection pooling, load balancing        |

### Assessment Checklist

```
SECURITY:
□ PostgreSQL Row-Level Security implemented?
□ AES-256 encryption for sensitive fields?
□ Secrets management (not .env files)?
□ Enterprise SSO (SAML/OIDC)?
□ Rate limiting on API endpoints?
□ Security headers configured?
□ Input sanitization layer?
□ Dependency vulnerability scanning?

MONITORING:
□ APM implemented (Datadog/New Relic)?
□ Error tracking (Sentry)?
□ Centralized logging (ELK)?
□ Health check endpoints?
□ Business metrics dashboards?
□ Real-time alerting?
□ Distributed tracing?

INTEGRATION:
□ Public API for third-parties?
□ Webhook system?
□ Bulk operations?
□ Sandbox environments?

DEVOPS:
□ CI/CD pipeline?
□ Infrastructure as Code?
□ Disaster recovery plan?
□ Multi-region deployment?
□ Auto-scaling?

TESTING:
□ 80%+ test coverage?
□ Integration tests?
□ E2E tests (Playwright)?
□ Performance tests?
□ Security tests?
```

---

## Phase 2: QUEUE — Prioritize Gaps

### Gap Queue

```
GAP QUEUE:
┌────┬──────────────────────────────┬──────────┬──────────┬──────────┐
│ #  │ Gap                          │ Category │ Severity │ Status   │
├────┼──────────────────────────────┼──────────┼──────────┼──────────┤
│ 1  │ No rate limiting on API      │ Security │ Critical │ ⬜       │
│ 2  │ No security headers          │ Security │ Critical │ ⬜       │
│ 3  │ No error tracking            │ Monitor  │ Critical │ ⬜       │
│ 4  │ No health check endpoints    │ Monitor  │ High     │ ⬜       │
│ 5  │ No CI/CD pipeline            │ DevOps   │ High     │ ⬜       │
│ 6  │ No integration tests         │ Testing  │ High     │ ⬜       │
│ 7  │ No centralized logging       │ Monitor  │ Medium   │ ⬜       │
│ 8  │ No bulk operations           │ Integr.  │ Medium   │ ⬜       │
│ 9  │ No performance tests         │ Testing  │ Medium   │ ⬜       │
│ 10 │ No sandbox environments      │ Integr.  │ Low      │ ⬜       │
└────┴──────────────────────────────┴──────────┴──────────┴──────────┘

GAPS: 10 total | 2 Critical | 2 High | 3 Medium | 1 Low
```

---

## Phase 3: FIX — Implement Each Gap

### Fix Loop (per gap)

For EACH gap in priority order:

```
FIX LOOP:
  1. ASSESS current state (is it actually missing?)
  2. IMPLEMENT the fix
  3. VERIFY the fix works
  4. TEST for regressions
  5. MARK gap as ✅ closed
  6. REPORT progress every 3 gaps
```

### Gap-Specific Fixes

#### Rate Limiting

```typescript
// Implement with @upstash/ratelimit
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
});

// Apply to expensive endpoints
const rateLimited = protectedProcedure.use(async (opts) => {
  const { success } = await ratelimit.limit(opts.ctx.entityId);
  if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
  return opts.next(opts);
});
```

#### Security Headers

```typescript
// In middleware.ts
const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};
```

#### Error Tracking

```typescript
// Sentry setup
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

#### Health Checks

```typescript
// /api/health endpoint
export async function GET() {
  const dbCheck = await db.execute(sql`SELECT 1`);
  return Response.json({
    status: "ok",
    database: dbCheck ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
}
```

---

## Phase 4: VERIFY — Test Each Fix

### Verification Methods

| Gap Type         | How to Verify                                  |
| ---------------- | ---------------------------------------------- |
| Rate limiting    | Send >100 requests, confirm 429 response       |
| Security headers | `curl -I`, confirm all headers present         |
| Error tracking   | Trigger error, confirm Sentry receives it      |
| Health check     | `curl /api/health`, confirm 200 + DB connected |
| CI/CD            | Push to branch, confirm pipeline runs          |
| Tests            | `pnpm test`, confirm pass rate ≥80%            |

### Verification Gate

```
□ Fix implemented?
□ Fix works (test it)?
□ No regressions?
□ Monitoring in place (if applicable)?
□ Documentation updated?
```

---

## Progress Reporting

### During Work

```
ENTERPRISE READINESS: 6/10 gaps (60%)
├── Security:     ✅ 2/2 — rate limiting + headers implemented
├── Monitoring:   🔄 1/3 — error tracking done, health checks in progress
├── DevOps:       ⬜ 0/1
├── Testing:      ⬜ 0/2
├── Integration:  ⬜ 0/2

Gaps closed: 6/10
Critical: 0 remaining
High: 1 remaining
```

### Final Report

```markdown
## Enterprise Readiness: [Scope]

### Status: [COMPLETE | IN PROGRESS]

### Gaps Closed

| #   | Gap               | Category | Fix                | Verified |
| --- | ----------------- | -------- | ------------------ | -------- |
| 1   | Rate limiting     | Security | @upstash/ratelimit | ✅       |
| 2   | Security headers  | Security | middleware.ts      | ✅       |
| 3   | Error tracking    | Monitor  | Sentry             | ✅       |
| 4   | Health checks     | Monitor  | /api/health        | ✅       |
| 5   | CI/CD             | DevOps   | GitHub Actions     | ✅       |
| 6   | Integration tests | Testing  | Vitest             | ✅       |

### Gaps Remaining

| #   | Gap                 | Category | Why Remaining              |
| --- | ------------------- | -------- | -------------------------- |
| 7   | Centralized logging | Monitor  | Needs ELK setup (external) |
| 8   | Bulk operations     | Integr.  | Deferred to next sprint    |
| 9   | Performance tests   | Testing  | Deferred to next sprint    |
| 10  | Sandbox             | Integr.  | Low priority               |

### Readiness Score: XX/100
```

---

## Success Metrics

| Metric                   | Target              | Current |
| ------------------------ | ------------------- | ------- |
| Critical vulnerabilities | 0                   | [X]     |
| API rate limiting        | 100% endpoints      | [X%]    |
| Error tracking           | All errors captured | [Y/N]   |
| Health checks            | All services        | [Y/N]   |
| Test coverage            | ≥80%                | [X%]    |
| Deployment time          | <10 min             | [X min] |

---

## Failure Recovery

### Fix doesn't work

1. Revert the fix
2. Re-assess the gap
3. Try a different approach
4. If still failing: document as "needs external help"

### Fix causes regression

1. Revert immediately
2. Re-examine the fix
3. Test in isolation first
4. Then apply to production

### Budget Guard

- Max **3 fix attempts** per gap
- Max **15 gaps** per session
- If budget exceeded: report progress, list remaining gaps
