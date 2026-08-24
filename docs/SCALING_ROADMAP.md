# Scaling Roadmap

> Technical scaling plan from 100 to 10,000+ users.

---

## Current State (100 users)

| Component                         | Status              | Bottleneck Risk |
| --------------------------------- | ------------------- | --------------- |
| Web (Vercel)                      | Auto-scales         | Low             |
| Database (Neon)                   | Serverless Postgres | Low             |
| AI Agents (Trigger.dev)           | Queue-based         | Low             |
| File Storage (Cloudflare R2)      | Auto-scales         | Low             |
| Email (Resend)                    | API-based           | Low             |
| Observability (Sentry + LangFuse) | Cloud-hosted        | Low             |

**Assessment:** Infrastructure is cloud-native and auto-scaling. No immediate bottlenecks.

---

## Phase 1: 100 → 1,000 Users

### Database

- [ ] Monitor connection pool usage (Neon serverless handles this)
- [ ] Add indexes for slow queries identified in monitoring
- [ ] Enable Neon connection pooling if not already active

### AI Agents

- [ ] Monitor Trigger.dev queue depth and processing time
- [ ] Increase concurrency limits if queue depth > 50
- [ ] Add retry logic for agent failures

### Caching

- [ ] Implement Redis/Upstash for hot data caching
- [ ] Cache exchange rates, COA suggestions, and user preferences
- [ ] Set appropriate TTLs per cache key type

### Monitoring

- [ ] Set up uptime monitoring (BetterUptime or similar)
- [ ] Add Vercel cost alerts ($100, $500, $1000 thresholds)
- [ ] Track p95 latency for all API endpoints

---

## Phase 2: 1,000 → 5,000 Users

### Database

- [ ] Evaluate read replicas for reporting queries
- [ ] Implement connection pooling at application layer
- [ ] Archive old data to cold storage (> 7 years)

### AI Agents

- [ ] Shard agent processing by entity size
- [ ] Implement agent result caching for repeated queries
- [ ] Add circuit breakers for external API calls (Plaid, Mono)

### Frontend

- [ ] Implement edge caching for marketing pages
- [ ] Add CDN for static assets (already on Vercel Edge Network)
- [ ] Optimize bundle size — code-split by route

### Multi-Tenancy

- [ ] Verify row-level security performance at scale
- [ ] Add tenant-level resource quotas
- [ ] Implement fair-use throttling for heavy users

---

## Phase 3: 5,000 → 10,000+ Users

### Database

- [ ] Consider dedicated Postgres instance for largest tenants
- [ ] Implement data partitioning by entity for large accounts
- [ ] Add materialized views for complex reports

### AI Agents

- [ ] Move to dedicated compute for agent processing
- [ ] Implement agent versioning with instant rollback
- [ ] Add A/B testing framework for agent improvements

### Operations

- [ ] Implement blue-green deployments
- [ ] Add canary releases for agent changes
- [ ] Create runbooks for all scaling-related incidents

### Cost Optimization

- [ ] Review Vercel function duration and memory usage
- [ ] Optimize database queries identified in slow query log
- [ ] Negotiate volume discounts with infrastructure providers

---

## Key Metrics to Watch

| Metric             | 100 Users | 1K Target | 10K Target |
| ------------------ | --------- | --------- | ---------- |
| API p95 latency    | < 2s      | < 1s      | < 500ms    |
| DB connections     | < 20      | < 100     | < 500      |
| Agent queue depth  | < 10      | < 50      | < 200      |
| Monthly infra cost | ~$100     | ~$500     | ~$2,000    |
| Uptime             | 99.9%     | 99.9%     | 99.95%     |

---

_Last updated: August 2026_
