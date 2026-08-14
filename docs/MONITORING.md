# Monitoring & Alerting Strategy

> How Xenboox monitors application health, LLM performance, infrastructure, costs, and business metrics.

---

## 1. Application Monitoring (Sentry)

### Setup

Xenboox uses Sentry for error tracking, performance tracing, and session replay across all surfaces.

```typescript
// apps/web/lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  tracesSampleRate:
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? 0.2 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.prismaIntegration()],
});
```

### Plan

| Tier                   | Plan                    | Monthly Cost | Notes                              |
| ---------------------- | ----------------------- | ------------ | ---------------------------------- |
| Development            | Sentry Developer (Free) | $0           | 5K errors, 1 user                  |
| Production (launch)    | Sentry Team             | $26/mo       | 50K errors, 5M spans               |
| Growth (100+ entities) | Sentry Business         | $80/mo       | SSO, dashboards, anomaly detection |
| Scale (1000+ entities) | Sentry Enterprise       | Custom       | TAM, custom retention              |

### Key Monitors

| Monitor           | What It Tracks                      | Alert Threshold    |
| ----------------- | ----------------------------------- | ------------------ |
| Error Rate        | 5xx responses, unhandled exceptions | >1% of requests    |
| p95 Response Time | API endpoint latency                | >2s for tRPC calls |
| Crash-Free Rate   | Sessions without fatal errors       | <99.5%             |
| tRPC Error Rate   | Failed procedure calls              | >5% per procedure  |

### Performance Tracing

- tRPC procedures are tagged with `procedureName` and `entityId`
- Transaction names follow pattern: `trpc.{router}.{procedure}`
- Database queries captured via Prisma/SQL instrumentation
- External API calls (Merge, Wave, Resend) tagged with `http.target`

---

## 1.5 Distributed Tracing (OpenTelemetry)

> This is the distributed-request pillar (§24.2): one trace from browser → edge →
> tRPC → database → LLM. Sentry covers errors, Pino covers logs, LangFuse covers
> agent traces — OTel ties them to a single request. It is the prerequisite for
> measuring the latency SLOs (p95 < 300ms reads, p99 < 1s writes).

### What is instrumented

| Layer                      | How                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP request (inbound)     | Next.js 15 auto-instrumentation once `register()` boots the SDK (`apps/web/instrumentation.ts`)                                                                              |
| Outbound HTTP / fetch / DB | `getNodeAutoInstrumentations()` — http, undici (covers the Neon fetch driver), pg                                                                                            |
| tRPC procedure             | `tracingMiddleware` (`apps/web/lib/trpc/tracing-middleware.ts`) — outermost middleware on every procedure chain; span `trpc.{path}` with `user.id`, `entity.id`, `trpc.type` |
| Agent / LLM runs           | LangChain/LangGraph emit spans via `@opentelemetry/api` once a provider is registered — no agent code changes needed                                                         |

### Environment variables (set in Vercel for production)

| Variable                      | Example (mock)                                   | Notes                                                                                |
| ----------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `https://otel-collector.example.com`             | Base URL of any OTLP/HTTP collector. **Unset = OTel fully disabled (silent no-op).** |
| `OTEL_EXPORTER_OTLP_HEADERS`  | `Authorization=Bearer MOCK_OTEL_COLLECTOR_TOKEN` | `Key=Value` pairs, `;` or `&` separated (e.g. Grafana `X-Scope-OrgID` too)           |
| `OTEL_SERVICE_NAME`           | `xenboox-web`                                    | Span service name. Defaults to `xenboox-web`.                                        |
| `OTEL_TRACES_SAMPLER`         | `parentbased_traceidratio`                       | `always_on` (default), `always_off`, `parentbased_traceidratio`                      |
| `OTEL_TRACES_SAMPLER_ARG`     | `0.1`                                            | Ratio when `*traceidratio*` — 0.1 = 10% of traces.                                   |
| `OTEL_SDK_DISABLED`           | `true`                                           | Hard kill-switch (overrides everything).                                             |

> Replace the mock values above with the real collector credentials before launch.
> Recommended production start: `parentbased_always_on` for the first week (full
> fidelity while validating), then `parentbased_traceidratio` / `0.1` once volume
> is understood. The exporter stream is standard OTLP/HTTP — SigNoz, Grafana
> Tempo, New Relic, Datadog, and Honeycomb all accept it.

### Latency SLOs (measured from these spans)

- Availability 99.9% (matches the public SLA) — error-rate alert on tRPC spans.
- p95 < 300ms on core tRPC reads; p99 < 1s on writes.
- Error budget burn alerts once the APM backend is configured (see §24.2).

### Follow-ons (not yet wired)

- **Trigger.dev jobs** run in a separate process — bootstrap `initOtel()` in the
  job worker entrypoint with the same env vars to trace document processing,
  close orchestration, and report generation.
- **Mobile (Expo)** — OTel RN instrumentation; not needed before launch.

---

## 2. LLM Observability (LangFuse)

### LangFuse Setup

Every agent action is traced through LangFuse.

```typescript
// packages/agents/core/telemetry.ts
import { Langfuse } from "langfuse";
import { LangfuseTraceClient } from "langfuse-core";

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com",
});

export function createAgentTrace(agentName: string, entityId: string) {
  const trace = langfuse.trace({
    name: agentName,
    sessionId: entityId,
    tags: ["xenboox", agentName, `entity:${entityId}`],
  });
  return trace;
}

export function createAgentSpan(
  trace: LangfuseTraceClient,
  name: string,
  input: unknown,
) {
  return trace.span({ name, input });
}
```

### What We Trace

| Event            | LangFuse Object | Metadata                                 |
| ---------------- | --------------- | ---------------------------------------- |
| Agent invocation | Trace           | agentName, entityId, confidence          |
| LLM call         | Generation      | model, prompt, response, tokens, latency |
| Tool execution   | Span            | toolName, input, output, duration        |
| Agent decision   | Span            | decisionType, confidence, reasoning      |
| Error            | Span (error)    | errorType, message, stack                |
| Human escalation | Event           | reason, context, assignedTo              |

### LangFuse Dashboard Widgets

| Dashboard               | Purpose                              |
| ----------------------- | ------------------------------------ |
| Daily Agent Volume      | Traces per agent per day             |
| Avg Response Time       | Mean + p95 latency per agent         |
| Token Consumption       | Total tokens per agent, per model    |
| Cost by Agent           | Estimated LLM cost per agent per day |
| Error Rate by Agent     | Failed traces / total traces         |
| Confidence Distribution | Histogram of confidence scores       |
| Human Escalation Rate   | Escalations per 100 traces           |

---

## 3. Database Monitoring (Neon)

### What We Monitor

Neon provides a built-in Monitoring dashboard plus OpenTelemetry export.

| Metric             | Source         | Warning      | Critical     | Action                       |
| ------------------ | -------------- | ------------ | ------------ | ---------------------------- |
| Active connections | Neon dashboard | >80% of max  | >95% of max  | Scale compute, check pool    |
| CPU utilization    | Neon dashboard | >70%         | >90%         | Optimize queries, scale      |
| RAM usage          | Neon dashboard | >80%         | >95%         | Scale compute                |
| Cache hit rate     | Neon dashboard | <95%         | <90%         | Review query patterns        |
| Deadlocks          | Neon dashboard | >0/min       | >5/min       | Review transaction ordering  |
| Replication lag    | Neon dashboard | >5s          | >30s         | Check primary compute health |
| Database size      | Neon dashboard | >80% of plan | >95% of plan | Archive old data             |

### Neon OpenTelemetry Export

```yaml
# Configured in Neon Console → Integrations → OpenTelemetry
platform: grafana-cloud
otlp_endpoint: https://otlp-gateway-{region}.grafana.net/otlp
auth: ${GRAFANA_CLOUD_TOKEN}
custom_headers:
  X-Scope-OrgID: ${GRAFANA_ORG_ID}
```

### Connection Pool Health

Monitor the PgBouncer pooler continuously:

| Metric                      | Healthy      | Warning | Critical |
| --------------------------- | ------------ | ------- | -------- |
| Pooler waiting connections  | 0            | >10     | >50      |
| Pooler max wait time        | <100ms       | >500ms  | >2s      |
| Pooler server active        | <70% of pool | >85%    | >95%     |
| Connection acquisition time | <5ms         | >20ms   | >100ms   |

---

## 4. Infrastructure Monitoring (Vercel)

### Vercel Analytics

| Metric                    | Dashboard             | Alert                  |
| ------------------------- | --------------------- | ---------------------- |
| Function execution time   | Vercel Speed Insights | p95 > 5s               |
| Function invocation count | Vercel Analytics      | >100K/day per function |
| Edge function duration    | Vercel Speed Insights | p95 > 500ms            |
| Bandwidth                 | Vercel Usage          | >500 GB/mo             |
| Build time                | Vercel Deployments    | >10 min                |
| Cold start frequency      | Custom log analysis   | >5% of invocations     |

### Function Execution Budgets

| Function Type   | Timeout | Max Memory | Max Duration (p99) |
| --------------- | ------- | ---------- | ------------------ |
| tRPC procedure  | 30s     | 512MB      | 2s                 |
| Server Action   | 60s     | 1GB        | 5s                 |
| Webhook handler | 30s     | 512MB      | 3s                 |
| Agent execution | 300s    | 2GB        | 120s               |
| CSV import      | 300s    | 2GB        | 60s                |
| Background job  | 900s    | 2GB        | 300s               |

### Vercel Logs

All serverless function logs are shipped to Vercel Logs (via `@vercel/otel`) and forwarded to our observability stack:

```typescript
// apps/web/lib/otel.ts
import { trace } from "@opentelemetry/api";

export function recordFunctionMetric(
  name: string,
  durationMs: number,
  tags?: Record<string, string>,
) {
  const meter = trace.getMeter("xenboox");
  const histogram = meter.createHistogram(`vercel.function.${name}`, {
    description: "Duration of serverless function",
    unit: "milliseconds",
  });
  histogram.record(durationMs, tags);
}
```

---

## 5. Agent Health Monitoring

### Agent Success Rate

| Agent                 | Expected Success Rate | Alert if Below |
| --------------------- | --------------------- | -------------- |
| CFO Agent (strategic) | 95%                   | 90%            |
| Controller            | 97%                   | 92%            |
| Treasury              | 99%                   | 95%            |
| Payroll Manager       | 99%                   | 95%            |
| Compliance            | 95%                   | 90%            |
| Worker agents         | 98%                   | 93%            |
| Ledger Agent          | 99.9%                 | 99%            |

### Per-Agent Metrics Tracked

```
agent_requests_total{agent="cfo_agent"}        → Counter
agent_success_total{agent="cfo_agent"}         → Counter
agent_duration_seconds{agent="cfo_agent"}      → Histogram (buckets: 0.1, 0.5, 1, 2, 5, 10, 30, 60, 120)
agent_tokens_total{agent="cfo_agent"}          → Counter
agent_confidence{agent="cfo_agent"}            → Gauge (0-1)
agent_escalation_total{agent="cfo_agent"}      → Counter
agent_error_total{agent="cfo_agent", error_type="timeout|llm|validation"} → Counter
```

### Health Check Endpoint

```typescript
// apps/web/app/api/health/route.ts
export async function GET() {
  // Run a synthetic agent execution for each tier
  const results = await Promise.allSettled([
    checkAgent("cfo_agent"),
    checkAgent("controller"),
    checkAgent("ledger_agent"),
  ]);

  const healthy = results.filter(
    (r) => r.status === "fulfilled" && r.value.ok,
  ).length;
  const total = results.length;

  return Response.json({
    status: healthy === total ? "healthy" : "degraded",
    agents: results.map((r, i) => ({
      name: ["cfo_agent", "controller", "ledger_agent"][i],
      ok:
        r.status === "fulfilled" && (r as PromiseFulfilledResult<any>).value.ok,
    })),
    healthyAgents: healthy,
    totalAgents: total,
  });
}
```

---

## 6. Business Metrics

### Key Business Metrics Dashboard

| Metric                 | Definition                                                          | Refresh   | Target              |
| ---------------------- | ------------------------------------------------------------------- | --------- | ------------------- |
| Active Entities        | Entities with transactions in last 7 days                           | Real-time | Growth week-on-week |
| Transactions Processed | Total ledger entries (debits + credits)                             | Real-time | —                   |
| Monthly Close Rate     | % of entities that completed month-end close within 5 business days | Daily     | >90%                |
| Average Close Time     | Hours from month-end to close completion                            | Daily     | <48h                |
| Invoices Generated     | Total invoices created via system                                   | Real-time | —                   |
| Payments Matched       | % of payments auto-reconciled                                       | Real-time | >85%                |
| LLM Cost per Entity    | Avg daily LLM spend per entity                                      | Daily     | <$0.50              |
| Human Escalations      | Actions escalated to human review                                   | Daily     | <5% of actions      |
| Onboarding Completion  | % of signups that complete data migration                           | Weekly    | >70%                |
| MRR (if applicable)    | Monthly recurring revenue                                           | Real-time | —                   |

### Business Metric Implementation

```typescript
// packages/agents/platform/reporting/business-metrics.ts
export async function collectBusinessMetrics(entityId: string) {
  const [transactionCount, activeAgents, closeStatus, llmCost] =
    await Promise.all([
      db.query.ledgerEntries.count({
        where: eq(ledgerEntries.entityId, entityId),
      }),
      db.query.agentTraces.count({
        where: and(
          eq(agentTraces.entityId, entityId),
          gte(agentTraces.createdAt, subDays(new Date(), 1)),
        ),
      }),
      db.query.monthlyCloses.findFirst({
        where: and(
          eq(monthlyCloses.entityId, entityId),
          eq(monthlyCloses.period, format(lastMonth, "yyyy-MM")),
        ),
      }),
      getDailyLLMCost(entityId),
    ]);

  return {
    entityId,
    date: new Date().toISOString().split("T")[0],
    transactionsProcessed: transactionCount,
    activeAgentRuns: activeAgents,
    closeCompleted: closeStatus?.completed ?? false,
    closeDaysToComplete: closeStatus?.daysToComplete ?? null,
    llmCostUsd: llmCost,
  };
}
```

---

## 7. Alerting Rules

### Alert Severity Levels

| Level         | Color  | Response Time | Notification Channel         |
| ------------- | ------ | ------------- | ---------------------------- |
| P0 - Critical | Red    | 15 min        | PagerDuty phone call + Slack |
| P1 - High     | Orange | 1 hour        | Slack @channel               |
| P2 - Medium   | Yellow | 4 hours       | Slack @agent-team            |
| P3 - Low      | Blue   | 24 hours      | Email digest                 |

### Alert Definitions

| Alert                              | Severity | Condition                                    | Who Gets Notified                     |
| ---------------------------------- | -------- | -------------------------------------------- | ------------------------------------- |
| Sentry error rate spike            | P1       | Error rate >5% for 5 min                     | Engineering on-call                   |
| tRPC procedure failure >10%        | P1       | Any procedure failing >10% of calls          | Engineering on-call                   |
| Agent trace failure cascade        | P1       | >20% of agent traces failing in 10 min       | Engineering on-call                   |
| Database connection saturation     | P0       | Pooler waiting connections >100              | Engineering on-call + DevOps          |
| Database replication lag           | P1       | Lag >30s                                     | Engineering on-call                   |
| LLM cost spike per entity          | P2       | >$5/day for a single entity                  | Engineering + Product                 |
| Monthly close completion rate drop | P2       | <80% of entities closed by day 5             | Product + Customer Success            |
| Merge.dev sync failure             | P2       | Sync stuck for >1 hour                       | Engineering on-call                   |
| Wave API token expiring            | P3       | Token expiry <7 days                         | Engineering                           |
| Entity onboarding stuck            | P2       | Migration in "syncing" for >4 hours          | Customer Success                      |
| Vercel function timeout            | P2       | p95 >10s for any function                    | Engineering                           |
| Low agent confidence cascade       | P2       | >10% of agent decisions with confidence <0.7 | Engineering + Product                 |
| Compliance check failure           | P1       | Entity fails mandatory compliance check      | Compliance officer + Customer Success |

### Alert Routing Configuration

```typescript
// packages/config/alerting-rules.ts
export const alertRules = [
  {
    id: "high-error-rate",
    name: "High tRPC Error Rate",
    severity: "P1" as const,
    condition: {
      metric: "trpc_error_rate",
      operator: ">" as const,
      value: 0.05,
      windowMinutes: 5,
    },
    channels: ["pagerduty", "slack-engineering"],
    cooldownMinutes: 30,
  },
  {
    id: "agent-failure-cascade",
    name: "Agent Failure Cascade",
    severity: "P1" as const,
    condition: {
      metric: "agent_failure_rate",
      operator: ">" as const,
      value: 0.2,
      windowMinutes: 10,
    },
    channels: ["pagerduty", "slack-engineering"],
    cooldownMinutes: 15,
  },
  // ... more rules
];
```

---

## 8. Dashboards

### Grafana Dashboard: Xenboox Production Overview

```
Row 1: LLM Health
  ├─ Agent Success Rate (timeseries, last 24h)
  ├─ Token Consumption by Agent (stacked bar)
  ├─ LLM Cost by Agent (area chart, $/day)
  └─ Avg Confidence by Agent (heatmap)

Row 2: Application Performance
  ├─ Sentry Error Rate (timeseries, by environment)
  ├─ p95 tRPC Latency by Procedure (top 10)
  ├─ Vercel Function Duration (histogram)
  └─ Cold Start Rate (gauge)

Row 3: Database
  ├─ Active Connections vs Max (timeseries)
  ├─ Cache Hit Rate (gauge, %)
  ├─ Deadlocks (counter, last 24h)
  └─ Database Size Growth (area chart)

Row 4: Business
  ├─ Active Entities (timeseries, last 30d)
  ├─ Transactions Processed (cumulative count)
  ├─ Monthly Close Rate (bar, by month)
  └─ Avg Close Time (timeseries, hours)

Row 5: Infrastructure
  ├─ Vercel Invocations (timeseries)
  ├─ R2 Storage Usage (area chart, GB)
  ├─ Merge.dev Sync Status (table)
  └─ Resend Email Delivery Rate (gauge)
```

### LangFuse Dashboard: Agent Performance

```
Row 1: Usage
  ├─ Traces per Agent (stacked bar, daily)
  ├─ Total Tokens (timeseries, input vs output)
  ├─ Cost by Model (sonnet vs haiku, pie chart)
  └─ Session Duration (histogram)

Row 2: Quality
  ├─ Confidence Distribution (histogram, 0-1 buckets)
  ├─ Human Escalation Rate (timeseries, %)
  ├─ Error Breakdown by Type (pie chart)
  └─ Feedback Score (gauge, 1-5)

Row 3: Cost
  ├─ Cost per Agent per Entity (table, top 20)
  ├─ Cumulative Cost (area chart, MTD)
  ├─ Cost Projection (line chart, forecast vs budget)
  └─ Cost per Transaction (gauge)
```

### Alertmanager Configuration

```yaml
# prometheus/alertmanager.yml
route:
  receiver: "pagerduty-critical"
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: P0
      receiver: "pagerduty-critical"
      repeat_interval: 1h
    - match:
        severity: P1
      receiver: "slack-engineering"
      repeat_interval: 4h
    - match:
        severity: P2
      receiver: "slack-agent-team"
      repeat_interval: 24h
```

---

## 9. Cost Monitoring

### LLM Cost Tracking

```typescript
// packages/agents/core/cost-tracker.ts
const MODEL_COSTS = {
  "claude-sonnet-4-6": {
    input: 0.003 / 1000, // $ per token
    output: 0.015 / 1000,
  },
  "claude-haiku-4-5": {
    input: 0.00025 / 1000,
    output: 0.00125 / 1000,
  },
} as const;

export function calculateLLMCost(
  model: keyof typeof MODEL_COSTS,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_COSTS[model];
  return inputTokens * pricing.input + outputTokens * pricing.output;
}
```

### Budget Alerts

| Alert                      | Threshold         | Action                                   |
| -------------------------- | ----------------- | ---------------------------------------- |
| Daily LLM spend per entity | >$2               | Notify entity admin (usage warning)      |
| Daily LLM spend per entity | >$5               | Restrict to haiku-only, notify admin     |
| Monthly total LLM spend    | >80% of budget    | Notify engineering + product             |
| Monthly total LLM spend    | >100% of budget   | Auto-downgrade entities to haiku         |
| Unexpected cost spike      | >5x daily average | PagerDuty alert (possible runaway agent) |

### Cost Dashboard

```
Row: LLM Cost by Agent (today vs yesterday, $)
Row: LLM Cost by Entity (top 10, $)
Row: Daily Cost Trend (30-day timeseries)
Row: Infrastructure Cost Breakdown:
  ├─ Vercel Functions ($)
  ├─ Neon Database ($)
  ├─ Cloudflare R2 ($)
  ├─ Resend Email ($)
  └─ Merge.dev ($)
```

---

## 10. Uptime Strategy

### Health Check Endpoints

| Endpoint                   | Purpose               | Expected Response                              | Interval |
| -------------------------- | --------------------- | ---------------------------------------------- | -------- |
| `GET /api/health`          | Overall system health | `{"status":"healthy"}`                         | 30s      |
| `GET /api/health/db`       | Database connectivity | `{"postgres":"ok","pooler":"ok"}`              | 30s      |
| `GET /api/health/agents`   | Agent runtime health  | `{"cfo":"ok","ledger":"ok","controller":"ok"}` | 60s      |
| `GET /api/health/merge`    | Merge.dev sync status | `{"connected":true,"lastSync":"..."}`          | 5min     |
| `GET /api/health/langfuse` | LangFuse connectivity | `{"reachable":true}`                           | 5min     |

### Status Page

Hosted on a separate static deployment (Vercel + `_next/static` only, no DB dependency):

```
xenboox.status              → Public status page
xenboox.status/api/events   → JSON feed of incidents
xenboox.status/api/uptime   → Uptime percentages (24h, 7d, 30d)
```

Uptime targets:

| Component       | Target | Measured By                                |
| --------------- | ------ | ------------------------------------------ |
| Web application | 99.9%  | Vercel uptime checks + external monitoring |
| API (tRPC)      | 99.9%  | Health check endpoint                      |
| Database        | 99.95% | Neon SLA                                   |
| Agent runtime   | 99.5%  | Internal health checks                     |
| LLM inference   | 99.0%  | Anthropic API status                       |
| Merge.dev sync  | 99.5%  | Merge status page                          |

### External Monitoring

Use a third-party uptime monitor (Better Uptime or Checkly) for synthetic checks:

- HTTP check on `https://app.xenboox.com/api/health` every 30s from 3 regions
- Playwright transaction flow check: login → create invoice → generate report (every 5min)
- SSL certificate expiry alert (30 days before)
- DNS resolution check

### Incident Response

```
1. Alert fires → PagerDuty notifies on-call engineer
2. Engineer acknowledges (within SLA by severity)
3. Engineer investigates via:
   • Sentry issues → recent errors
   • Vercel logs → function failures
   • Neon dashboard → DB metrics
   • LangFuse → agent trace failures
4. Status page updated: investigating → identified → monitoring → resolved
5. Post-mortem written within 72h for P0/P1 incidents
```
