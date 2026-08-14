# Runbook: Job Queue Backlog / DLQ Spike

**When:** Trigger.dev runs queue up, `review_items` (DLQ) count spikes, or
per-tenant concurrency is starved.

**Sev:** SEV-2 (ingestion/reporting delayed) → SEV-1 if close orchestration or
payment-adjacent jobs stall.

---

## Detection

- Trigger.dev dashboard: pending runs count growing, oldest pending age > 5 min.
- DLQ table: `SELECT count(*) FROM review_items WHERE status='pending'` spiking.
- Monitoring: queue-depth alert (§2.6 / §24.4).

## Immediate actions (0–5 min)

1. **Read the DLQ first** — `review_items` rows carry task + run + error
   context. Cluster by `agent_id`/error to find the poison task.
2. **Is it one tenant?** Per-tenant concurrency (`concurrencyKey: entityId`)
   means one tenant's backlog can't starve others — confirm the backlog is
   cross-tenant (systemic) vs. a single entity (isolated).
3. **Systemic cause (e.g. provider down):** pause the queue (Trigger.dev) while
   the dependency recovers; re-enable after — idempotency keys prevent
   double-processing.
4. **Poison task:** fix the code path, then re-run the DLQ'd runs from the ops
   review queue (do not blanket-replay — replay only the affected task id).

## Recovery

1. Queue drains; verify oldest-pending returns to < 1 min.
2. Confirm no double-posts via idempotency (`job:{entityId}:{key}` keys) —
   check `ops` audit for duplicate journal entries.

## Post-incident

- Postmortem per `docs/INCIDENT_RUNBOOK.md §8`.
