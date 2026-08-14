# Runbook: Redis / Upstash Down

**When:** `UPSTASH_REDIS_REST_URL` unreachable; rate limiters failing; caches
cold; `check=ready` returning 503.

**Sev:** SEV-2 (degraded) — rate limiting falls back to in-memory; SEV-3 if
only cache coldness.

---

## Detection

- `/api/health?check=ready` → 503 (readiness includes Redis ping).
- Rate-limit errors in logs: `tryUpstash` catches and falls back to the
  in-memory limiter — expect a **silent degradation**, not errors.

## Immediate actions (0–5 min)

1. **Do not panic — design intent:** every Redis consumer has an in-memory
   fallback:
   - Rate limiter (`apps/web/lib/security/rate-limiter.ts`) → `InMemoryRateLimiter`.
   - AI gateway budget counters → in-memory per-process (documented limitation).
   - Semantic cache → in-memory Map (TTL/LRU bounded).
   - Tenant cache → in-memory LRU.
2. **Understand the window:** in-memory fallbacks are per-instance. Under
   multi-instance traffic the effective limits are per-instance, not global —
   a brief period of looser rate limiting is acceptable; document it in the
   postmortem.
3. Check Upstash status page (upstash.com/status) and the dashboard for
   degraded regions.

## Recovery

1. Upstash recovers → readiness flips to 200.
2. Verify rate-limit counters reset cleanly (old windows expire naturally).
3. AI gateway budget counters are per-process: after Redis returns, restart
   workers so budget state is consistent (or accept the reset for the day).

## Post-incident

- Postmortem per `docs/INCIDENT_RUNBOOK.md §8`.
- If Redis outages repeat, consider a second region / replica for the
  rate-limiter store.
