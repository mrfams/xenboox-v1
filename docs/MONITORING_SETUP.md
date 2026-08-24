# Monitoring Setup

> Uptime monitoring and cost tracking for Xenboox infrastructure.

---

## Uptime Monitoring

### Recommended: BetterUptime

- **Free tier:** 5 monitors, 3-minute checks
- **Setup:**
  1. Create account at betterstack.com
  2. Add monitors for:
     - `https://xenboox.com` (main site)
     - `https://xenboox.com/api/health` (health endpoint)
     - `https://xenboox.com/api/ready` (readiness endpoint)
  3. Configure alerts: Email, SMS, Slack
  4. Set status page: `status.xenboox.com`

### Health Check Endpoints (Already Implemented ✅)

| Endpoint      | Purpose           | Expected Response |
| ------------- | ----------------- | ----------------- |
| `/api/health` | Liveness probe    | `200 OK`          |
| `/api/ready`  | Readiness probe   | `200 OK`          |
| `/api/live`   | Deep health check | `200 OK`          |

---

## Cost Monitoring

### Vercel

- **Dashboard:** vercel.com/dashboard → Usage
- **Alerts:** Settings → Usage → Set budget alerts
  - $50 warning
  - $100 critical
  - $200 emergency

### Neon Postgres

- **Dashboard:** console.neon.tech → Monitoring
- **Metrics:** Connection count, storage, compute time

### Cloudflare R2

- **Dashboard:** dash.cloudflare.com → R2 → Analytics
- **Metrics:** Storage, egress, requests

### Trigger.dev

- **Dashboard:** trigger.dev/dashboard → Usage
- **Metrics:** Job runs, compute time

---

## Alerting Rules

| Metric         | Warning | Critical | Action       |
| -------------- | ------- | -------- | ------------ |
| Error rate     | > 1%    | > 5%     | Investigate  |
| P95 latency    | > 3s    | > 10s    | Optimize     |
| Monthly cost   | > $100  | > $200   | Review usage |
| DB connections | > 50    | > 80     | Scale pool   |

---

_Last updated: August 2026_
