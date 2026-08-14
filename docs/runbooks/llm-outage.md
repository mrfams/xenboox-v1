# Runbook: LLM Provider Outage

**When:** Anthropic/OpenAI unreachable, 5xx/429 storms, or gateway alerts.

**Sev:** SEV-2 (agents degraded) → SEV-1 if agent writes are blocked and money
movement/GL posting is stalled.

---

## Detection

- LangFuse error-rate spike; `packages/agents/core/retry.ts` retries failing.
- Provider status pages (status.anthropic.com / status.openai.com).
- AI gateway spend alerts, or `AiBudgetExceededError` storms (check whether the
  kill-switch is genuinely armed vs. a misconfigured env).

## Immediate actions (0–5 min)

1. **Never queue into a dead provider.** The ModelRouter already skips
   unhealthy routes (`healthTracker.shouldSkip`) — verify routes are flipping
   unhealthy rather than failing fast.
2. Confirm whether fallback providers exist for the affected task tier
   (`packages/models/router.ts` provider pool). If a fallback route is healthy,
   traffic already splits — monitor only.
3. If no fallback: **degrade deterministically**:
   - Chat surfaces: switch to template/degraded answers ("financial data is
     temporarily unavailable — retry shortly").
   - Agent jobs: they already `retry` with backoff (maxAttempts 3); ensure the
     queue is _not_ the bottleneck — a backlog is acceptable, a retry storm is not.
   - **Money movement:** the autonomy policy (`XENBOOX_AUTONOMY_LEVEL`) already
     hard-denies autonomous payments. If a payment pipeline is mid-flight,
     treat as SEV-1 and verify no partial writes (TrustGuard + journal idempotency).

## Recovery

1. Watch the provider status page + LangFuse error rate for recovery.
2. When healthy, the router's health tracker flips routes back automatically.
3. Drain the job backlog (see [`job-backlog.md`](job-backlog.md)) and re-run
   failed runs from the Trigger.dev dashboard (idempotency keys prevent doubles).

## Post-incident

- Postmortem per `docs/INCIDENT_RUNBOOK.md §8`.
- Consider adding another provider to the affected tier if this provider is
  single-source for a critical task type.
