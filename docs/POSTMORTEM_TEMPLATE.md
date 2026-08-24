# Incident Post-Mortem Template

> Use this template after any P1 or P2 incident. Complete within 48 hours of resolution.

---

## Incident Details

| Field         | Value            |
| ------------- | ---------------- |
| **Date**      | YYYY-MM-DD       |
| **Duration**  | e.g., 45 minutes |
| **Severity**  | P1 / P2          |
| **Status**    | Resolved         |
| **Author**    | Name             |
| **Reviewers** | Names            |

---

## Summary

> One-paragraph description of what happened, in plain English.

## Impact

- **Users affected**: e.g., All users / users in region X
- **Data impact**: None / Partial / Full
- **Revenue impact**: Estimated $X lost
- **SLA impact**: Yes / No — if yes, which commitment was missed

## Timeline (UTC)

| Time  | Event                           |
| ----- | ------------------------------- |
| HH:MM | First alert triggered           |
| HH:MM | On-call engineer acknowledged   |
| HH:MM | Root cause identified           |
| HH:MM | Fix deployed                    |
| HH:MM | Monitoring confirmed resolution |

## Root Cause

> Technical explanation of why this happened. Be specific — which service, which code path, which configuration.

## Detection

- **How was it detected?** (monitoring alert / customer report / internal discovery)
- **Time to detect**: X minutes
- **Could it have been detected sooner?** How?

## Resolution

> What was done to fix the immediate issue?

## What Went Well

- [ ] Item 1
- [ ] Item 2

## What Went Poorly

- [ ] Item 1
- [ ] Item 2

## Action Items

| #   | Action | Owner | Priority | Due Date   | Status |
| --- | ------ | ----- | -------- | ---------- | ------ |
| 1   |        |       | P1/P2/P3 | YYYY-MM-DD | ⬜     |
| 2   |        |       | P1/P2/P3 | YYYY-MM-DD | ⬜     |
| 3   |        |       | P1/P2/P3 | YYYY-MM-DD | ⬜     |

## Lessons Learned

> What should the team remember from this incident? What patterns should we watch for?

## Supporting Links

- [ ] Dashboard/monitoring link
- [ ] Relevant logs
- [ ] Deployment that caused or fixed the issue
- [ ] Related Slack threads

---

_Template version: 1.0 — Last updated: August 2026_
