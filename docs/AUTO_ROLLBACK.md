# Auto-Rollback Strategy

> Automatic rollback when error rates spike after deployment.

---

## Trigger Conditions

| Condition             | Threshold        | Window     |
| --------------------- | ---------------- | ---------- |
| Error rate spike      | > 5% (from < 1%) | 5 minutes  |
| P95 latency spike     | > 2x baseline    | 10 minutes |
| Health check failures | > 3 consecutive  | 2 minutes  |
| 5xx response rate     | > 10%            | 5 minutes  |

---

## Rollback Process

### Automatic (Vercel)

1. Vercel monitors function error rates
2. If threshold exceeded, trigger rollback
3. Rollback to last successful deployment
4. Notify team via Slack/email

### Manual Override

```bash
# Via Vercel CLI
vercel rollback

# Via Vercel Dashboard
# Deployments → Find last good → Promote to Production
```

---

## Post-Rollback

| Action                 | Timeline  | Owner       |
| ---------------------- | --------- | ----------- |
| Acknowledge incident   | Immediate | On-call     |
| Open incident channel  | 5 minutes | On-call     |
| Investigate root cause | 1 hour    | Engineering |
| Fix and re-deploy      | 4 hours   | Engineering |
| Post-mortem            | 48 hours  | Engineering |

---

## Prevention

| Measure              | Description                       |
| -------------------- | --------------------------------- |
| Canary deployments   | Deploy to 10% of traffic first    |
| Feature flags        | Roll back features, not code      |
| Pre-deploy checks    | Typecheck, lint, test must pass   |
| Staging verification | Test in staging before production |

---

_Last updated: August 2026_
