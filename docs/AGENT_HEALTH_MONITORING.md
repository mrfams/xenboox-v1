# Agent Health Monitoring

> Tracking AI agent performance and health in production.

---

## Monitoring Stack

| Tool             | Purpose             | Metrics                 |
| ---------------- | ------------------- | ----------------------- |
| LangFuse         | Agent observability | Traces, scores, costs   |
| Sentry           | Error tracking      | Exceptions, performance |
| Vercel Analytics | Web performance     | Core Web Vitals         |

---

## Key Metrics

### Agent Performance

| Metric                 | Target  | Alert Threshold |
| ---------------------- | ------- | --------------- |
| Avg confidence score   | > 0.85  | < 0.70          |
| Escalation rate        | < 5%    | > 15%           |
| Response latency (p95) | < 3s    | > 10s           |
| Success rate           | > 99%   | < 95%           |
| Cost per interaction   | < $0.01 | > $0.05         |

### Agent Health

| Metric       | Target  | Alert Threshold |
| ------------ | ------- | --------------- |
| Uptime       | 99.9%   | < 99%           |
| Queue depth  | < 10    | > 100           |
| Error rate   | < 0.1%  | > 1%            |
| Memory usage | < 512MB | > 1GB           |

---

## Alerting Rules

| Condition                             | Severity | Action                  |
| ------------------------------------- | -------- | ----------------------- |
| Confidence < 0.5 for 10+ interactions | P1       | Investigate immediately |
| Error rate > 5% for 5 minutes         | P1       | Page on-call            |
| Queue depth > 100 for 10 minutes      | P2       | Check processing        |
| Cost > $0.10 per interaction          | P3       | Review prompts          |

---

## Dashboard

LangFuse dashboard shows:

- Real-time agent traces
- Confidence score distribution
- Cost breakdown by agent
- Error logs with full context

---

_Last updated: August 2026_
