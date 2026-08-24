# On-Call Rotation

> Last updated: August 25, 2026

## Overview

Xenboox uses a pager-based on-call rotation for production incidents. The on-call engineer is responsible for responding to alerts, triaging issues, and escalating when needed.

## Rotation Schedule

| Week   | Primary On-Call | Secondary On-Call |
| ------ | --------------- | ----------------- |
| Week 1 | TBD             | TBD               |
| Week 2 | TBD             | TBD               |
| Week 3 | TBD             | TBD               |
| Week 4 | TBD             | TBD               |

**Rotation:** Weekly, Monday 9:00 AM → Monday 9:00 AM (local time)

## Escalation Levels

| Level             | Response Time | Action                                                          |
| ----------------- | ------------- | --------------------------------------------------------------- |
| **P1 — Critical** | 15 minutes    | Page primary on-call. If no response in 15 min, page secondary. |
| **P2 — High**     | 1 hour        | Notify primary on-call via Slack. Investigate within 1 hour.    |
| **P3 — Medium**   | 4 hours       | Log ticket. Address during business hours.                      |
| **P4 — Low**      | 24 hours      | Log ticket. Address in next sprint.                             |

## Alert Routing

| Alert Source                         | Channel                  | Escalation |
| ------------------------------------ | ------------------------ | ---------- |
| Sentry (error rate > 5%)             | Slack #incidents + Email | P1         |
| Sentry (new critical issue)          | Slack #incidents         | P2         |
| Uptime monitoring (down)             | SMS + Slack #incidents   | P1         |
| Vercel (build failure)               | Slack #deployments       | P3         |
| Database (connection pool exhausted) | SMS + Slack #incidents   | P1         |

## Incident Response Process

```
1. DETECT — Alert fires (Sentry, uptime monitor, or manual report)
2. TRIAGE — On-call engineer assesses severity (P1-P4)
3. ACKNOWLEDGE — Acknowledge in Slack #incidents within response time
4. INVESTIGATE — Check Sentry, Vercel, Neon dashboards
5. MITIGATE — Fix forward or rollback if needed
6. RESOLVE — Confirm fix, update status page
7. POST-MORTEM — For P1/P2 incidents, write post-mortem within 48 hours
```

## Contact Information

| Role              | Contact | Backup |
| ----------------- | ------- | ------ |
| Primary On-Call   | TBD     | TBD    |
| Secondary On-Call | TBD     | TBD    |
| Engineering Lead  | TBD     | TBD    |
| CEO/Founder       | TBD     | TBD    |

## Tools

| Tool         | Purpose                 | URL                      |
| ------------ | ----------------------- | ------------------------ |
| Sentry       | Error tracking & alerts | https://sentry.io        |
| Vercel       | Deployment & hosting    | https://vercel.com       |
| Neon         | Database                | https://neon.tech        |
| BetterUptime | Uptime monitoring       | https://betteruptime.com |
| Slack        | Communication           | #incidents channel       |

## Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

**Date:** YYYY-MM-DD
**Severity:** P1/P2
**Duration:** X hours Y minutes
**Author:** [Name]

## Summary

[1-2 sentence summary of what happened]

## Timeline

- HH:MM — [Event]
- HH:MM — [Event]

## Root Cause

[What caused the incident]

## Impact

[What was affected, how many users, revenue impact]

## What Went Well

[Things that worked during the response]

## What Went Wrong

[Things that didn't work]

## Action Items

- [ ] [Action item] — Owner: [Name], Due: [Date]

## Lessons Learned

[Key takeaways]
```
