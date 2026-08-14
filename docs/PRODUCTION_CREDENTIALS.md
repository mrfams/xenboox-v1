# Production Credentials — Launch Checklist

> **User action required.** Every item below is either a `MOCK_*` placeholder or an
> unset value the app currently tolerates in dev but **must** be real before launch.
> Work through this list top-to-bottom; each row names the exact env var, where it's
> used, and what to put in it. Do **not** commit real values — keep them in Vercel
> dashboard env vars / your secrets manager.

Last audited: **2026-08-15** (final sweep, Issue 20).

---

## 1. LLM / AI (Anthropic, OpenAI)

| Env var                    | Current state | Action                                                  |
| -------------------------- | ------------- | ------------------------------------------------------- |
| `ANTHROPIC_API_KEY`        | unset         | Claude API key — the primary provider for all 19 agents |
| `OPENAI_API_KEY`           | unset         | OpenAI key (fallback provider + embeddings)             |
| `LLM_MONTHLY_BUDGET_CENTS` | `50000`       | $500/mo default — tune to actual spend ceiling          |

**Related docs:** `docs/LLM_COST_MODEL.md`, `docs/MULTI_LLM_ARCHITECTURE.md`

## 2. Database (Neon)

| Env var          | Current state | Action                                                                           |
| ---------------- | ------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`   | unset         | Production connection string (use a **direct**, non-pooled URL for `db:migrate`) |
| `NEON_WEBSOCKET` | unset         | Set `"true"` only if using WebSocket mode for RLS                                |

## 3. Auth (Auth.js v5)

| Env var                                 | Current state | Action                                         |
| --------------------------------------- | ------------- | ---------------------------------------------- |
| `AUTH_SECRET`                           | unset         | Generate: `openssl rand -base64 32`            |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | unset         | Google OAuth client (console.cloud.google.com) |
| `NEXTAUTH_URL`                          | unset         | e.g. `https://app.xenboox.com`                 |

## 4. Storage (Cloudflare R2) — the mock trio you flagged

| Env var                                                                | Current state     | Action                                                              |
| ---------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------- |
| `R2_ACCOUNT_ID`                                                        | unset             | Cloudflare account ID                                               |
| `R2_ACCESS_KEY_ID`                                                     | unset             | R2 API token (read/write)                                           |
| `R2_SECRET_ACCESS_KEY`                                                 | unset             | R2 API token secret                                                 |
| `R2_BUCKET_NAME`                                                       | `xenboox-uploads` | Verify bucket exists with object-lock for audit logs                |
| `R2_PUBLIC_URL`                                                        | unset             | Public base URL for the bucket (or leave empty + serve via API)     |
| `R2_ACCESS_KEY_ID_AF` / `R2_SECRET_ACCESS_KEY_AF` / `R2_ACCOUNT_ID_AF` | `MOCK_R2_AF_*`    | Per-cell R2 trio for the Africa cell (only if multi-region enabled) |

**Related docs:** `docs/FILE_UPLOAD_PIPELINE.md`, `docs/MULTI-REGION.md`

## 5. Webhooks

| Env var               | Current state | Action                                                    |
| --------------------- | ------------- | --------------------------------------------------------- |
| `WEBHOOK_SECRET`      | unset         | Shared secret for outbound webhook signature verification |
| `MONO_WEBHOOK_SECRET` | unset         | Mono bank-sync webhook secret                             |

## 6. Email (Resend)

| Env var             | Current state | Action                                                     |
| ------------------- | ------------- | ---------------------------------------------------------- |
| `RESEND_API_KEY`    | unset         | Resend API key                                             |
| `RESEND_FROM_EMAIL` | unset         | e.g. `notifications@xenboox.com` (verified sender domain!) |

## 7. Observability

### LangFuse

| Env var                                       | Current state | Action                                              |
| --------------------------------------------- | ------------- | --------------------------------------------------- |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | unset         | LangFuse project keys (verify payloads exclude PII) |
| `LANGFUSE_BASE_URL`                           | unset         | LangFuse instance URL                               |

### Sentry

| Env var                                        | Current state | Action                |
| ---------------------------------------------- | ------------- | --------------------- |
| `SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` | unset         | Sentry project setup  |
| `NEXT_PUBLIC_SENTRY_DSN`                       | unset         | Client DSN (optional) |

### OpenTelemetry (APM) — MOCK VALUES

| Env var                                           | Current state                                    | Action                                                                   |
| ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                     | `https://otel-collector.example.com`             | Real OTLP/HTTP collector endpoint (SigNoz / Tempo / New Relic / Datadog) |
| `OTEL_EXPORTER_OTLP_HEADERS`                      | `Authorization=Bearer MOCK_OTEL_COLLECTOR_TOKEN` | Real collector auth token                                                |
| `OTEL_SERVICE_NAME`                               | `xenboox-web`                                    | OK as-is                                                                 |
| `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG` | `parentbased_traceidratio` / `0.1`               | Tune sampling (0.1 = 10%)                                                |

> When the collector is live, set up the **performance dashboards** + **slow-query alerts**
> (ROADTOPRODUCTION §2.2) and add **database health checks** to `/api/health` (§2.4 pending items).

## 8. Job Queue (Trigger.dev)

| Env var                                  | Current state | Action                   |
| ---------------------------------------- | ------------- | ------------------------ |
| `TRIGGER_SECRET_KEY` / `TRIGGER_API_KEY` | unset         | Trigger.dev project keys |

## 9. Rate Limiting (Upstash Redis)

| Env var                                               | Current state | Action                                                                                                                                |
| ----------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | unset         | Upstash Redis REST credentials — without these the limiter falls back to **in-memory** (fine in dev, not multi-instance-safe in prod) |

## 10. Mobile Money (ModemPay)

| Env var                                                                   | Current state | Action                                                      |
| ------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------- |
| `MODEMPAY_SECRET_KEY` / `MODEMPAY_PUBLIC_KEY` / `MODEMPAY_WEBHOOK_SECRET` | unset         | ModemPay API keys (CBG-licensed, The Gambia)                |
| `MODEMPAY_ENV`                                                            | `sandbox`     | Switch to `production` only after ModemPay approves the app |

## 11. App / Deployment

| Env var                                   | Current state | Action                                                                         |
| ----------------------------------------- | ------------- | ------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_APP_URL`                     | unset         | e.g. `https://app.xenboox.com`                                                 |
| `SEED_DEMO_TOKEN`                         | unset         | Bearer token for the `/api/seed-demo` route (keep secret — it seeds demo data) |
| `XENBOOX_REGION`                          | `iad1`        | Region code this deployment serves                                             |
| `XENBOOX_REGION_MAP`                      | commented     | Tenant → cell residency JSON (only with multi-region)                          |
| `DATABASE_URL_CPT1` / `DATABASE_URL_CDG1` | `MOCK`        | Per-cell DB URLs (only with multi-region)                                      |

## 12. AI Gateway budgets (§22.1) — MOCK VALUES

| Env var                    | Current state   | Action                                                                                                                                                                       |
| -------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AI_KILL_SWITCH`           | unset           | `"true"` blocks all model calls (leave unset until you need it)                                                                                                              |
| `AI_BUDGET_DAILY_TOKENS`   | `500000`        | Per-entity daily token ceiling                                                                                                                                               |
| `AI_BUDGET_DAILY_COST_USD` | `50`            | Per-entity daily cost ceiling                                                                                                                                                |
| `AI_PRICE_*` overrides     | commented mocks | Optional — built-in mock prices (`claude-sonnet-4-6` $3/$15, `claude-haiku-4-5` $0.8/$4) are used otherwise. **Verify these match your real Anthropic rates before launch.** |

## 13. Autonomy policy (§22.3) — MOCK VALUES

| Env var                    | Current state | Action                                                                         |
| -------------------------- | ------------- | ------------------------------------------------------------------------------ |
| `XENBOOX_AUTONOMY_LEVEL`   | `suggest`     | `suggest` (default, safest) → `low`/`standard`/`full` as you tune              |
| `XENBOOX_AUTO_APPROVE_MAX` | `1000000`     | Max minor units auto-approvable at `full` (mock — tune to your risk tolerance) |

## 14. Uptime monitoring (BetterStack / Checkly) — MOCK VALUES

See **`docs/UPTIME_PROBES.md`** for the full table:

| Env var                                  | Current state                                      |
| ---------------------------------------- | -------------------------------------------------- |
| `BETTERSTACK_API_TOKEN`                  | `MOCK_BETTERSTACK_API_TOKEN`                       |
| `BETTERSTACK_STATUS_PAGE_ID`             | `MOCK_STATUS_PAGE_ID`                              |
| `BETTERSTACK_STATUS_PAGE_API_KEY`        | `MOCK_STATUS_PAGE_API_KEY`                         |
| `BETTERSTACK_SLACK_WEBHOOK`              | `https://hooks.slack.com/services/MOCK/...`        |
| `CHECKLY_API_KEY` / `CHECKLY_ACCOUNT_ID` | `MOCK_CHECKLY_API_KEY` / `MOCK_CHECKLY_ACCOUNT_ID` |

## 15. Incident response (PagerDuty / Opsgenie)

| Env var                                       | Current state | Action                                                                                        |
| --------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| `PAGERDUTY_ROUTING_KEY` (or Opsgenie API key) | unset         | Provision the account + escalation policy, then wire alert rules (`docs/INCIDENT_RUNBOOK.md`) |

---

## What's already handled (no action)

- `.env.bak*` files are gitignored (`.gitignore` line 15).
- `EXCHANGE_RATE_SOURCE=ECB` — free, no key needed.
- `WEBHOOK_SECRET`-style signatures, idempotency keys, and audit hashing are implemented in code (not env-dependent).
- Seed credentials are documented in `docs/seed-credentials.md` (demo accounts only — never production).

## Secret hygiene reminders

1. Put real values in **Vercel dashboard env vars** (or a secrets manager — Vault/Doppler/Infisical per ROADTOPRODUCTION §27.2), **never** in `.env` committed to git.
2. `AUTH_SECRET`, `ANTHROPIC_API_KEY`, `LANGFUSE_SECRET_KEY` must never be logged — the logger already redacts secrets; keep it that way.
3. Rotate anything that has ever appeared in git history.
4. Move `SEED_DEMO_TOKEN` to a secrets manager before launch.
