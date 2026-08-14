# Chaos Drills

Controlled outage exercises that verify the graceful-degradation paths built
into Xenboox — **run against staging, never production** (§25.2).

Each drill is a runnable script that:

1. Injects the failure (env override / config change / process kill).
2. Exercises the affected path.
3. **Asserts the expected degraded behavior** (fails the drill if the app
   misbehaves).
4. Restores the environment and verifies recovery.

## Safety rules

- **Staging only.** These scripts point at `$DRILL_BASE_URL` (default
  `http://localhost:3000`) — set it to the staging deployment.
- Each drill writes an env override file (`.drill-env`) it restores on exit —
  `trap` guarantees cleanup even on Ctrl-C.
- Never point a drill at production: the LLM/Redis drills are load-bearing
  tests of degradation, not things you want on live traffic.
- After each drill, confirm the service recovers (the script does this last).

## Drills

| Drill        | Script                                           | Verifies                                                                                                                                                                 |
| ------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Redis down   | [`redis-down-drill.sh`](redis-down-drill.sh)     | In-memory rate-limiter fallback engages; `/api/health?check=ready` → 503; app still serves; recovery when Redis returns                                                  |
| LLM outage   | [`llm-outage-drill.sh`](llm-outage-drill.sh)     | Invalid provider key → agents fail gracefully (retry then error, never crash); `AI_KILL_SWITCH` blocks all calls with `AiBudgetExceededError`; recovery with a valid key |
| DB failover  | [`db-failover-drill.sh`](db-failover-drill.sh)   | Readiness → 503 on DB kill; reads/writes fail cleanly (no partial writes); idempotency prevents double-posting on recovery; failover back to primary                     |
| Job queue    | [`job-queue-drill.sh`](job-queue-drill.sh)       | Backlog does not double-post (idempotency keys); DLQ captures poison tasks                                                                                               |
| External svc | [`external-svc-drill.sh`](external-svc-drill.sh) | Webhooks 500-with-retry; uploads fall back to presigned paths                                                                                                            |

## Run one

```bash
# from repo root
DRILL_BASE_URL=http://localhost:3000 bash docs/runbooks/drills/redis-down-drill.sh
```

Exit code 0 = drill passed (degradation behaved as designed). Non-zero =
the app did NOT degrade as expected — treat as a finding and file an issue.

## CI / cadence

Suggest a nightly staging run (GitHub Actions scheduled) — mirror the
`load-test.yml` pattern in `.github/workflows/`.
