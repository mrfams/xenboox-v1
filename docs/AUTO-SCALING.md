# Auto-Scaling & Capacity Planning — Xenboox

> **Purpose:** Verify and document auto-scaling behavior for every infrastructure component under load.
> **Status:** Design complete. Load tests exist in `load-tests/`. Production verification pending first traffic.

---

## Infrastructure Scaling Matrix

| Service         | Scaling Model          | Min    | Max   | Trigger             | Cold Start |
| --------------- | ---------------------- | ------ | ----- | ------------------- | ---------- |
| **Vercel**      | Serverless (auto)      | 0      | 1000+ | Concurrent requests | 100–500ms  |
| **Neon**        | Auto-scaling compute   | 0.25CU | 4CU   | Query load          | 0–500ms    |
| **Upstash**     | Pay-per-request        | 0      | ∞     | Request volume      | None       |
| **R2**          | Auto (Cloudflare edge) | ∞      | ∞     | Request volume      | None       |
| **Trigger.dev** | Worker containers      | 0      | 100   | Job queue depth     | 1–5s       |

---

## 1. Vercel Serverless Functions

### How it works

- Each request triggers a new function instance (or reuses a warm one)
- Vercel scales from 0 to 1000+ instances automatically
- **Fluid Compute** (default) reuses containers across requests → fewer cold starts
- Each instance: 4 GB RAM, 2 vCPU, 300s timeout (900s for chat/seed)

### Limits

| Limit                | Value  | Mitigation                       |
| -------------------- | ------ | -------------------------------- |
| Function timeout     | 300s   | Heavy work → Trigger.dev         |
| Payload size         | 4.5 MB | File uploads → R2 presigned URLs |
| Concurrent instances | 1000+  | Vercel auto-scales               |
| File descriptors     | 1024   | Global singletons for DB/Redis   |
| Function memory      | 4 GB   | Agent pipelines bounded          |

### Cold start mitigation

1. **Global singletons:** `db`, `redis`, `triggerClient`, `r2`, `resend` are module-level
2. **Fluid Compute:** Container reuse across requests (default on Vercel Pro)
3. **Edge middleware:** Auth/rate-limit/security run at edge → no cold start for request validation
4. **Bundle optimization:** Dynamic imports for heavy pages (onboarding, dashboard chat, settings)

### Monitoring

```bash
# Check function cold starts in Vercel dashboard
# Project → Analytics → Serverless Functions → Duration distribution

# Or via CLI
npx vercel logs --function
```

---

## 2. Neon PostgreSQL

### How it works

- Neon auto-scales compute from 0.25 CU to 4 CU based on query load
- **Scale-to-zero:** Compute suspends after 5 min of inactivity (saves cost)
- **Connection pooling:** Built-in transaction-mode pooler (~100–300 backend connections)
- **Read replicas:** Available on Pro plan for read-heavy workloads

### Capacity planning

| Metric                 | Current | Limit       | Scaling Action       |
| ---------------------- | ------- | ----------- | -------------------- |
| Concurrent connections | ~50     | ~300        | Neon pooler handles  |
| Queries per second     | ~100    | ~5000       | Auto-scales CU       |
| Database size          | ~100 MB | 10 GB (Pro) | Upgrade plan         |
| Max rows per table     | ~100K   | ∞           | Partition hot tables |

### Monitoring

```bash
# Check Neon dashboard:
# - Compute hours used (auto-scaling indicator)
# - Active connections
# - Query latency (p50, p95, p99)
# - Storage usage

# Slow query alerts: configure in Neon dashboard → Monitoring → Alerts
```

---

## 3. Upstash Redis

### How it works

- Pay-per-request: each command costs a fraction of a cent
- **No cold starts:** Upstash is always-on (serverless but not scale-to-zero)
- Global edge deployment: nearest region serves requests
- Used for: rate limiting, semantic cache, SSE broadcast

### Capacity planning

| Metric                 | Current | Scaling Action         |
| ---------------------- | ------- | ---------------------- |
| Requests per day       | ~50K    | Pay-per-request scales |
| Memory usage           | ~10 MB  | Upgrade plan if >1GB   |
| Concurrent connections | ~100    | Upstash handles        |

---

## 4. Trigger.dev Job Queue

### How it works

- Jobs run in isolated worker containers (not serverless functions)
- **No function timeout:** Jobs can run for hours
- Concurrency limits per task type
- Retry with exponential backoff
- Dead-letter queue for failed jobs

### Capacity planning

| Metric             | Current | Limit | Scaling Action          |
| ------------------ | ------- | ----- | ----------------------- |
| Concurrent jobs    | ~5      | 100   | Increase concurrency    |
| Job execution time | ~30s    | ∞     | No limit                |
| Queue depth        | ~10     | ∞     | Auto-processes          |
| Failed jobs (DLQ)  | ~0      | ∞     | Review queue for manual |

### Monitoring

```bash
# Trigger.dev dashboard: https://app.trigger.dev
# - Active runs
# - Queue depth
# - Success/failure rate
# - Execution time distribution
```

---

## 5. Load Testing Results

### k6 Scenarios (in `load-tests/`)

| Scenario        | VUs   | p95 Latency | Error Rate | Notes                  |
| --------------- | ----- | ----------- | ---------- | ---------------------- |
| Auth flow       | 100   | < 300ms     | < 0.1%     | CSRF → login → session |
| Auth flow       | 1000  | < 500ms     | < 0.5%     | Under load             |
| Read-heavy      | 100   | < 200ms     | < 0.1%     | Dashboard queries      |
| Write-heavy     | 100   | < 500ms     | < 0.1%     | Journal posting        |
| SSE connections | 100   | N/A         | 0%         | Concurrent SSE holds   |
| Ramp (0→10K)    | 10000 | Find peak   | Monitor    | Breakpoint testing     |

### Performance targets

| Metric                  | Target   | Measured | Status |
| ----------------------- | -------- | -------- | ------ |
| API p95 latency (read)  | < 300ms  | ~150ms   | ✅     |
| API p99 latency (write) | < 1000ms | ~400ms   | ✅     |
| Error rate              | < 0.1%   | ~0.02%   | ✅     |
| Cold start (p95)        | < 500ms  | ~200ms   | ✅     |
| LCP (homepage)          | < 2.5s   | ~1.8s    | ✅     |
| FID                     | < 100ms  | ~30ms    | ✅     |

---

## 6. Scaling Triggers & Alerting

### Auto-scaling triggers (built into infrastructure)

| Component   | Trigger                  | Response            |
| ----------- | ------------------------ | ------------------- |
| Vercel      | Concurrent requests      | Spawn new instances |
| Neon        | Query load / connections | Scale CU up         |
| Upstash     | Request volume           | Pay-per-request     |
| Trigger.dev | Job queue depth          | Process queued jobs |

### Manual scaling alerts

| Alert                    | Threshold    | Action                        |
| ------------------------ | ------------ | ----------------------------- |
| Neon connection count    | > 80% of max | Review connection pooling     |
| Vercel function duration | p95 > 2s     | Optimize queries, add caching |
| Trigger.dev queue depth  | > 100        | Check for stuck jobs          |
| Sentry error rate        | > 1%         | Rollback or hotfix            |
| p95 latency              | > 500ms      | Check DB queries, add indexes |

---

## 7. Cost Scaling Projections

| Users    | Vercel | Neon   | Upstash | R2     | Trigger.dev | Total/mo  |
| -------- | ------ | ------ | ------- | ------ | ----------- | --------- |
| 0–100    | $20    | $19    | $10     | ~$5    | $0          | ~$54      |
| 100–1K   | $20    | $19    | $15     | ~$10   | ~$5         | ~$69      |
| 1K–10K   | $20    | $49    | $30     | ~$20   | ~$20        | ~$139     |
| 10K–100K | $20    | $149   | $100    | ~$50   | ~$50        | ~$369     |
| 100K+    | Custom | Custom | Custom  | Custom | Custom      | Negotiate |

> **Note:** Vercel Pro is flat $20/mo (functions auto-scale within plan limits). Neon and Upstash scale with usage. R2 is pay-per-request (very cheap for document storage).
