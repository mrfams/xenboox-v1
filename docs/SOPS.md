# Standard Operating Procedures (SOPs)

> Operational playbooks for the Xenboox team. Follow these for consistent, repeatable processes.

---

## 1. Deployment

### Pre-Deployment Checklist

- [ ] All CI checks pass (lint, typecheck, test, build)
- [ ] PR approved by at least one reviewer
- [ ] No unresolved `TODO` or `FIXME` in changed files
- [ ] Database migrations tested against fresh Postgres
- [ ] Environment variables documented and set in Vercel

### Deployment Process

1. Merge PR to `main`
2. Vercel auto-deploys to production
3. Verify health check: `GET /api/health`
4. Check Sentry for new errors (15-minute window)
5. Verify key flows: login → dashboard → invoice creation

### Rollback Procedure

1. Go to Vercel dashboard → Deployments
2. Find the last known good deployment
3. Click "Promote to Production"
4. Post incident in #engineering Slack channel

---

## 2. Incident Response

### Severity Levels

| Level | Definition               | Response Time  | Example                     |
| ----- | ------------------------ | -------------- | --------------------------- |
| P1    | Platform down, data loss | 1 hour         | Auth broken, DB unreachable |
| P2    | Major feature impaired   | 4 hours        | Invoice creation failing    |
| P3    | Minor feature impaired   | 1 business day | CSV export broken           |
| P4    | Cosmetic / low impact    | Next sprint    | Wrong color on a button     |

### Response Process

1. Acknowledge alert within SLA
2. Open incident channel: `#inc-YYYY-MM-DD-description`
3. Assign Incident Commander
4. Communicate status every 30 minutes for P1/P2
5. Resolve and deploy fix
6. Complete post-mortem within 48 hours

---

## 3. Code Review

### Review Checklist

- [ ] TypeScript strict mode — no `any` types
- [ ] Entity scoping on all database queries
- [ ] Zod validation on all tRPC inputs
- [ ] Error handling — no silent failures
- [ ] No secrets, keys, or credentials in code
- [ ] Tests for new logic (where applicable)
- [ ] Accessibility — aria-labels on icon buttons

### Review SLA

- First response within 4 business hours
- Approval within 1 business day
- Authors respond to feedback within 24 hours

---

## 4. Database Changes

### Schema Changes

1. Modify Drizzle schema in `packages/db/schema/`
2. Run `pnpm db:generate` to create migration
3. Review generated SQL
4. Test against local Postgres
5. Commit migration file with schema changes
6. Never hand-write migrations

### Data Migrations

1. Write migration script in `packages/db/migrations/`
2. Test against staging database
3. Back up production before running
4. Run during low-traffic window
5. Verify row counts before/after

---

## 5. Agent Changes

### Deployment Process

1. Modify agent in `packages/agents/`
2. Run `pnpm test:eval` to verify against golden dataset
3. Check LangFuse for regression in confidence scores
4. Deploy via Trigger.dev
5. Monitor first 100 runs in LangFuse

### Rollback

1. Trigger.dev supports instant rollback to previous version
2. No database migration needed for agent changes
3. Verify rollback in LangFuse dashboard

---

## 6. Monitoring & Alerting

### Daily Checks

- [ ] Sentry error count (should be < 5 new/day)
- [ ] Vercel function duration (p95 < 5s)
- [ ] Database connection pool usage
- [ ] Trigger.dev job success rate (> 99%)

### Weekly Checks

- [ ] LangFuse agent confidence scores
- [ ] Vercel bandwidth and build minutes
- [ ] Dependency audit results
- [ ] Test coverage trend

---

## 7. Security

### Access Control

- All production access via Vercel team permissions
- Database access via Neon console (admin only)
- No shared credentials — use password manager
- MFA required for all team accounts

### Secrets Management

- Environment variables in Vercel (production)
- `.env.local` for local development (never committed)
- Rotate secrets quarterly
- Audit API keys monthly

---

_Last updated: August 2026_
