# Runbook: R2 / Storage Outage

**When:** uploads/downloads fail, presigned URLs 403, document pipeline DLQ
spiking with storage errors.

**Sev:** SEV-2 (document ingestion degraded) → SEV-1 if bank-statement imports
and all uploads are blocked for all tenants.

---

## Detection

- Sentry: `S3Client` errors (AccessDenied, 5xx, timeout) in
  `apps/web/server/routers/document.ts` + `packages/jobs/bank-import.ts`.
- Cloudflare status page + R2 dashboard (object store, custom domains).

## Immediate actions (0–5 min)

1. **Uploads must keep working** — the platform has presigned-upload fallbacks;
   verify the presign path is returning URLs (it doesn't need the object to
   exist yet). If presigning is also broken, block new uploads with a friendly
   error (queue them client-side if mobile).
2. **Document pipeline:** jobs already retry (maxAttempts 3, backoff). DLQ
   entries (`review_items`) capture poison tasks — do not auto-reprocess until
   R2 is green.
3. Check `R2_*` credentials didn't rotate: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY` (mock placeholders must be replaced pre-launch —
   see `docs/seed-credentials.md`).

## Recovery

1. R2 green → re-run DLQ'd document jobs from the ops review queue (idempotent
   via `process-document:{entityId}:{documentId}` keys).
2. Verify an end-to-end upload → process → classify → ingest flow.

## Post-incident

- Postmortem per `docs/INCIDENT_RUNBOOK.md §8`.
