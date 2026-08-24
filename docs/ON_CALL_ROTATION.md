# On-Call Rotation

> Who's responsible when things break at 3 AM.

---

## Current State

Xenboox is a small team. On-call is shared responsibility, not a formal rotation.

### Quick Contact

- **Primary:** Founder (available 24/7 during early stage)
- **Backup:** TBD (when team grows)

---

## When to Page

| Severity | Condition                     | Response          |
| -------- | ----------------------------- | ----------------- |
| P1       | Platform down (auth, DB, API) | Immediate         |
| P1       | Data loss or breach           | Immediate         |
| P2       | Major feature broken          | Within 1 hour     |
| P3       | Minor feature broken          | Next business day |
| P4       | Cosmetic issue                | Next sprint       |

---

## On-Call Tools

| Tool         | Purpose                    | Status    |
| ------------ | -------------------------- | --------- |
| BetterUptime | Uptime monitoring + alerts | Planned   |
| Sentry       | Error tracking + alerts    | ✅ Active |
| Vercel       | Deployment status          | ✅ Active |
| Slack        | Communication              | Planned   |

---

## Incident Response

1. **Alert fires** → Check Sentry/BetterUptime
2. **Assess severity** → P1/P2/P3/P4
3. **Communicate** → Post in #incidents channel
4. **Investigate** → Check logs, dashboards, recent deploys
5. **Fix or rollback** → If fix > 30min, rollback first
6. **Verify** → Confirm resolution in monitoring
7. **Post-mortem** → Complete within 48 hours (use template)

---

## Scaling Plan

| Team Size | On-Call Model                         |
| --------- | ------------------------------------- |
| 1-2       | Founder always on-call                |
| 3-5       | Weekly rotation, 1 primary + 1 backup |
| 5-10      | PagerDuty with escalation             |
| 10+       | Follow-the-sun model                  |

---

_Last updated: August 2026_
