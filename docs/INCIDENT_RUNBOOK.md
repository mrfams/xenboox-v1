# Incident Response Runbook

> Living document. Every incident updates this file (and the postmortem
> template below is copied per incident into `docs/incidents/`).
>
> Target: enterprise-grade incident response matching the 99.9% SLA promise.
> Last reviewed: Aug 14, 2026.

---

## 1. Severity Matrix

| Sev       | Definition                                                                                      | Examples                                                                                                               | Response time               | Update cadence |
| --------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------- |
| **SEV-1** | Total or near-total outage. All users blocked; money movement/GL writes broken; data loss risk. | DB unavailable, auth down for all, R2 uploads broken globally, LLM gateway kill-switch tripped globally                | **≤ 15 min** to acknowledge | Every 30 min   |
| **SEV-2** | Major feature/tenant outage. Some tenants blocked; a core flow degraded for many.               | One region's cell down, webhooks failing at-least-once, report generation broken, LLM provider outage affecting agents | **≤ 1 hr** to acknowledge   | Every 1 hr     |
| **SEV-3** | Minor degradation. Workaround exists; a single tenant or non-critical flow affected.            | Slow queries > SLO, one bank connection failing, cosmetic UI bug, one tenant over budget (throttled)                   | **≤ 1 business day**        | Daily          |
| **SEV-4** | Cosmetic / backlog. No user impact.                                                             | Typo in UI, missing telemetry attribute, stale docs                                                                    | Next sprint                 | On change      |

**SLA mapping:** SEV-1/2 must not take the platform below 99.9% monthly uptime
(≈ 43.8 min allowed downtime/month). Track breaches in §6.

---

## 2. Roles & On-Call

| Role                        | Responsibility                                                           | Current holder   |
| --------------------------- | ------------------------------------------------------------------------ | ---------------- |
| **Incident Commander (IC)** | Owns the incident end-to-end: declares severity, drives timeline, comms. | _[user: assign]_ |
| **Scribe**                  | Maintains the timeline in the incident channel (what/when/who).          | _[user: assign]_ |
| **Service owner(s)**        | Diagnose + fix their service (web, jobs, DB, agents, mobile).            | _[user: assign]_ |
| **Communications**          | Status page updates + user-facing announcements.                         | _[user: assign]_ |
| **Deputy**                  | Backs up the IC; takes over if IC is unavailable.                        | _[user: assign]_ |

**Escalation path:** On-call → IC → CTO/leadership. After-hours: page via
PagerDuty/Opsgenie (mock config in `docs/ALERTING_CONFIG.md` — see also
`docs/MONITORING.md §alerting`).

---

## 3. Comms Channels

| Channel                          | Purpose                                               |
| -------------------------------- | ----------------------------------------------------- |
| `#incidents` (Slack/Discord)     | Live coordination. Every incident gets a thread.      |
| Status page (status.xenboox.com) | Public status. Updated per §5.                        |
| Customer comms                   | SEV-1/2 only, via `comms@xenboox.com` template in §7. |

**Golden rule:** the status page and `#incidents` thread must never contradict
each other. The IC approves all public status text.

---

## 4. Incident Lifecycle

### 4.1 Detect

Sources: external probes (BetterStack/Checkly), Sentry alert rules, APM
latency/error alerts, LLM spend alerts, queue-depth alerts, or a user report.

1. **Acknowledge within the severity window** (§1).
2. Create the incident thread in `#incidents` with: sev, service, start time,
   detection source, current impact.
3. Assign IC + Scribe.

### 4.2 Triage (first 15 min)

1. **Is money movement affected?** (payments, bank sync, journal posting) → treat
   as SEV-1 until proven otherwise; consider the AI gateway kill-switch
   (`AI_KILL_SWITCH=true`) to stop LLM-driven writes.
2. **Is data at risk?** (write path failing mid-transaction, migrations broken)
   → stop the bleeding: disable the trigger/cron, pause the job queue.
3. Confirm or deny each system using the probes in §4.3. Update the status page.

### 4.3 System Check Probes (run these first — copy/paste)

| System        | Probe                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| Web app       | `GET https://xenboox.com/api/health?check=live` → 200                         |
| Web readiness | `GET https://xenboox.com/api/health?check=ready` → 200 (503 if DB/Redis down) |
| Jobs          | Trigger.dev dashboard → runs failing? DLQ `review_items` rows spiking?        |
| Database      | `SELECT 1` via Neon console; `pg_stat_activity` for long queries              |
| Redis/Upstash | Rate-limit keys responding? `GET ai:budget:*` counters?                       |
| LLM providers | Anthropic/OpenAI status pages; LangFuse error rates; gateway alerts           |
| R2            | Presigned-upload test; document pipeline DLQ rows                             |
| Email         | Resend dashboard; `email_failures` retry queue                                |

### 4.4 Mitigate (choose first viable)

- **Degrade gracefully** (preferred): read-only mode for the affected surface,
  turn off the agent autonomy (`XENBOOX_AUTONOMY_LEVEL=suggest`), queue jobs
  instead of running synchronously.
- **Fail over** (multi-region): flip `XENBOOX_REGION` cell routing (see
  `docs/MULTI-REGION.md` and DR plan).
- **Roll back**: revert the last deploy if a regression (Vercel instant rollback).
- **Kill-switch**: `AI_KILL_SWITCH=true` stops all LLM calls globally (gateway
  throws `AiBudgetExceededError`); `OTEL_SDK_DISABLED=true` drops tracing load.

### 4.5 Resolve & verify

1. Confirm the fix with the §4.3 probes (green).
2. Watch for 30 min (SEV-1) / 1 hr (SEV-2) of clean telemetry.
3. Update the status page to **Operational**.
4. Close the thread → file the postmortem (§8).

---

## 5. Status Page Procedure (status.xenboox.com)

The status page is the single public source of truth. Components to model:

| Component                 | Health probe                                 |
| ------------------------- | -------------------------------------------- |
| Website & API             | `https://xenboox.com/api/health?check=live`  |
| Dashboard & API readiness | `https://xenboox.com/api/health?check=ready` |
| Agent jobs                | Trigger.dev queue depth / DLQ count          |
| Database                  | Neon status + readiness probe                |
| Payments & bank sync      | Mono API health                              |
| Email notifications       | Resend status                                |

**Status transitions:** Operational → Degraded Performance → Partial Outage →
Major Outage → (back) Operational. Announce at every transition; backfill the
timeline in the postmortem.

> Mock config for BetterStack/Checkly lives in
> `docs/UPTIME_PROBES.md` — replace `MOCK_*` values with real credentials.

---

## 6. Availability Tracking

| Month   | Uptime % | Downtime (min) | SEV-1s | SEV-2s | SLA met? |
| ------- | -------- | -------------- | ------ | ------ | -------- |
| 2026-08 | —        | —              | 0      | 0      | pending  |

Compute: `uptime = (total_min - downtime_min) / total_min`.

---

## 7. Customer Comms Template (SEV-1/2)

> Send via `comms@xenboox.com`; the IC approves the exact text.

```
Subject: [Status] Xenboox incident — <DATE> <HH:MM UTC>

We are currently investigating an issue affecting <SERVICES>.
Impact: <WHAT USERS SEE>.
We have <MITIGATION IN PROGRESS / ROLLED BACK / RESTORED>.
Next update: <TIME>.

— Xenboox Engineering
```

---

## 8. Postmortem Template

Copy `docs/incidents/YYYY-MM-DD-<sev>-<slug>.md` from this template after every
SEV-1/2 (SEV-3 optional). Fill every section — a blank section is a finding.

```markdown
# Postmortem: <DATE> <sev> <title>

## Summary

<one paragraph: what happened, who was affected, how long>

## Timeline (all times UTC)

| Time | Event        |
| ---- | ------------ |
|      | Detection    |
|      | Acknowledged |
|      | Mitigation   |
|      | Resolution   |

## Impact

- Users affected: <count/scope>
- Uptime impact: <minutes>
- Financial impact: <estimate or "none">

## Root Cause

<what actually caused it — 5 whys>

## Contributing Factors

<deploy without feature flag, missing alert, no runbook step, etc.>

## What Went Well

## What Went Wrong

## Where We Got Lucky

## Action Items

| #   | Action               | Owner | Due | Sev |
| --- | -------------------- | ----- | --- | --- |
| 1   | <prevent recurrence> |       |     |     |

## Blameless Statement

<the incident is a process failure, not a person failure>
```

---

## 9. Common Runbooks (quick links)

| Scenario                                       | Runbook                                     |
| ---------------------------------------------- | ------------------------------------------- |
| LLM provider outage                            | `docs/runbooks/llm-outage.md`               |
| Redis down                                     | `docs/runbooks/redis-down.md`               |
| Database failover / connection pool exhaustion | `docs/runbooks/db-failover.md`              |
| R2 / storage failure                           | `docs/runbooks/r2-outage.md`                |
| Job queue backlog / DLQ spike                  | `docs/runbooks/job-backlog.md`              |
| Email delivery failure                         | `docs/runbooks/email-outage.md`             |
| Security incident (breach / key leak)          | `docs/runbooks/security-incident.md`        |
| LLM spend anomaly / budget breach              | see AI gateway §22.1 + `docs/MONITORING.md` |

> The Chaos Drill scripts (`docs/runbooks/drills/`) exercise several of these
> in a controlled environment — see `docs/runbooks/README.md`.
