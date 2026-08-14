# Runbook: Database Failover / Pool Exhaustion / Migration Break

**When:** Neon unreachable, connection pool saturated, `check=ready` 503,
migrations failing, or data-integrity alarms.

**Sev:** SEV-1 (all reads/writes blocked) unless limited to a single cell/tenant.

---

## Detection

- `/api/health?check=ready` → 503 (DB ping failed).
- `pg_stat_activity` shows long-running queries / `query_wait_timeout` (120s)
  exhaustion in Neon console.
- Sentry/APM: `ECONNREFUSED` / `connection terminated` storms in routers.
- Drizzle errors on every entity-scoped query.

## Immediate actions (0–5 min)

1. **Confirm scope:** is it all of Neon (regional incident) or our connection
   pool? Check Neon status page + console.
2. **Regional outage → fail over the cell:** flip `DATABASE_URL` to the
   standby/other-region endpoint per `docs/DR-PLAN.md` + `docs/MULTI-REGION.md`.
   The app reads the new `DATABASE_URL` on cold start — redeploy or rotate env.
3. **Pool exhaustion:** reduce load before scaling — trigger the job-queue
   pause (Trigger.dev) so background jobs stop hammering the pool; set
   `XENBOOX_AUTONOMY_LEVEL=suggest` to stop agent writes; consider read-only
   mode for dashboards.
4. **Migration broke:** `pnpm db:migrate` failed mid-run → **do not re-run
   blindly** (Drizzle migrations are not transactional end-to-end). Inspect
   `packages/db/migrations/meta/_journal.json` + the `__drizzle_migrations`
   table; complete or roll back the partial migration by hand with a
   review-approved SQL script.

## Recovery

1. Readiness probe green → un-pause the job queue (concurrency ramps back).
2. Restore autonomy level to its configured value.
3. Verify entity-scoped reads + an end-to-end journal posting (TrustGuard +
   idempotency) before declaring resolved.

## Post-incident

- Postmortem per `docs/INCIDENT_RUNBOOK.md §8`.
- Review `docs/DATABASE.md §partitioning` notes; rerun the DR restore drill
  (see [`drills/db-failover-drill.md`](drills/db-failover-drill.md)).
