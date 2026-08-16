# Service Level Objectives (SLOs)

> Last updated: Aug 16, 2026 · Owner: Platform · Reference: ROADTOPRODUCTION.md §24.2
>
> The SLA already promises 99.9% availability — these SLOs make it
> **measurable**. Measurement is via the OTel pipeline (§24.2, `packages/models/otel.ts`
>
> - tRPC spans in `tracing-middleware.ts`) exported to the APM backend of
>   choice (SigNoz/Datadog/New Relic).

## 1. SLO Table

| Objective                          | Target                    | Window  | Measurement                                                                                                           |
| ---------------------------------- | ------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| **Availability**                   | 99.9%                     | 30 days | `/api/health/live` + `/api/health/ready` probe success (BetterStack/Checkly external probes, `docs/UPTIME_PROBES.md`) |
| **Read latency** (core tRPC reads) | p95 < 300 ms              | 30 days | OTel span duration on `*.list` / `*.get*` / summary queries                                                           |
| **Write latency** (mutations)      | p99 < 1 s                 | 30 days | OTel span duration on `*.create` / `*.update` / `*.post` procedures                                                   |
| **Error rate** (all tRPC)          | < 0.1% of requests        | 30 days | OTel error spans / Sentry error rate                                                                                  |
| **LLM cost** (per entity)          | tracked, alert on anomaly | 30 days | `ops_token_usage` (§8.2 per-entity cost)                                                                              |

## 2. Error Budget (99.9% availability, 30-day window)

- Total allowed downtime: **43.2 minutes / month** (30 days × 24 h × 0.001).
- Budget is consumed by any 5xx + probe failure (weighted by duration).
- **Budget burn rate:**
  - ≥ 1%/day consistently → review (burn rate ≈ 14.4 min/day).
  - ≥ 5% in a single hour → page the on-call (alerting threshold, §24.2).
  - 100% consumed → freeze feature deploys; incident + postmortem mandatory
    (see `docs/INCIDENT_RUNBOOK.md`).

## 3. Burn Alerts (thresholds)

| Alert                 | Condition                                             | Action                             |
| --------------------- | ----------------------------------------------------- | ---------------------------------- |
| **Latency burn**      | p95 read latency > 300 ms for 5 consecutive minutes   | Page on-call, triage               |
| **Error burn**        | tRPC error rate > 0.5% for 5 minutes (5× SLO)         | Page on-call                       |
| **Availability burn** | Probe failure rate > 1% over 1 hour (10× budget burn) | Page on-call + status page update  |
| **LLM spend anomaly** | Per-entity token cost > 3× 7-day rolling mean         | Alert platform, review agent tasks |

Configure these as alert rules in the APM/monitoring backend (SigNoz/DataDog)
or PagerDuty/Opsgenie once accounts are provisioned (user-side, §24.2).

## 4. Measuring Latency SLOs

1. Every tRPC procedure emits an OTel span via `tracing-middleware.ts`.
2. APM computes percentiles per procedure family (reads vs. writes).
3. SLO status is reviewed weekly against the error budget; the
   `docs/INCIDENT_RUNBOOK.md` availability tracker records downtime.

## 5. Latency Budget (p95 < 300 ms reads)

| Layer                             | Budget   |
| --------------------------------- | -------- |
| Network/CDN (Vercel edge)         | ≤ 50 ms  |
| tRPC + auth + RLS middleware      | ≤ 50 ms  |
| DB query (entity-scoped, indexed) | ≤ 150 ms |
| Response serialization            | ≤ 50 ms  |

Anything over budget → profile the DB query (indexes, N+1) first; caching
(§4.1 tenant cache) exists precisely to keep the hot reads inside budget.
