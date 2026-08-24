# Capacity Planning

> Monitoring resource usage and planning for growth.

---

## Current Infrastructure

| Component | Provider      | Current Usage | Capacity     |
| --------- | ------------- | ------------- | ------------ |
| Web       | Vercel        | —             | Auto-scales  |
| Database  | Neon          | —             | Serverless   |
| Storage   | Cloudflare R2 | —             | Auto-scales  |
| Job Queue | Trigger.dev   | —             | Auto-scales  |
| Email     | Resend        | —             | 100/day free |

---

## Resource Monitoring

### Database

| Metric              | Check  | Alert Threshold |
| ------------------- | ------ | --------------- |
| Connection count    | Daily  | > 80% of max    |
| Query latency (p95) | Daily  | > 500ms         |
| Storage usage       | Weekly | > 80% of plan   |
| Backup size         | Weekly | Unusual growth  |

### Compute (Vercel)

| Metric                  | Check   | Alert Threshold  |
| ----------------------- | ------- | ---------------- |
| Function duration (p95) | Daily   | > 10s            |
| Bandwidth               | Monthly | > 100GB          |
| Build minutes           | Monthly | > 500 min        |
| Serverless exec         | Monthly | > 1M invocations |

### Storage (R2)

| Metric           | Check   | Alert Threshold |
| ---------------- | ------- | --------------- |
| Storage used     | Weekly  | > 5GB           |
| Egress           | Monthly | > 10GB          |
| PUT/GET requests | Monthly | > 100K          |

---

## Scaling Triggers

| Trigger                 | Current | Action                     |
| ----------------------- | ------- | -------------------------- |
| DB connections > 80%    | —       | Upgrade Neon plan          |
| Function duration > 10s | —       | Optimize code, add caching |
| Storage > 5GB           | —       | Archive old data           |
| Bandwidth > 100GB       | —       | Add CDN, optimize assets   |
| Build minutes > 500     | —       | Optimize CI pipeline       |

---

## Cost Projections

| Users | Monthly Cost | Revenue | Margin |
| ----- | ------------ | ------- | ------ |
| 100   | $50          | $2K     | 97%    |
| 500   | $200         | $10K    | 98%    |
| 1,000 | $500         | $20K    | 97%    |
| 5,000 | $2,000       | $100K   | 98%    |

---

_Last updated: August 2026_
