# Connection Pool Configuration

> Neon PostgreSQL connection pool settings for optimal performance.

---

## Current Setup

Neon serverless Postgres handles connection pooling automatically. No manual configuration needed for most cases.

### Default Settings

| Setting            | Value              | Notes               |
| ------------------ | ------------------ | ------------------- |
| Pool mode          | Transaction        | Best for serverless |
| Max connections    | 100 (Neon default) | Scales with compute |
| Idle timeout       | 300 seconds        | Neon default        |
| Connection timeout | 10 seconds         | Application default |

---

## When to Customize

### High Traffic (> 1K requests/min)

```typescript
// drizzle.config.ts
export default {
  dbCredentials: {
    url: process.env.DATABASE_URL,
    // Neon handles pooling — no manual config needed
  },
};
```

### Connection Exhaustion Symptoms

- `too many connections` errors
- Slow query response times
- Connection timeout errors

### Solutions

1. **Verify Neon pooling is enabled** — Check Neon console → Settings → Connection pooling
2. **Use pooled connection string** — `postgresql://...?pool=true`
3. **Reduce connection lifetime** — Set `idleTimeout: 60000` in Drizzle config
4. **Add connection retry logic** — Exponential backoff for transient failures

---

## Monitoring

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Check connection pool usage
SELECT count(*) FROM pg_stat_activity WHERE datname = 'xenboox';

-- Identify long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';
```

---

_Last updated: August 2026_
