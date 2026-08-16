# XENBOOX — Setup Items Only You Can Do 🔑

> Generated Aug 16, 2026. These are the credentials/services I cannot create for you.
> Everything else in the app is built, seeded, and pushed. This is the final launch checklist.

**Vercel project:** `mrfams-projects/xenboox` → Settings → Environment Variables
**Local env files:** root `.env.local` (dev) · `apps/web/.env.example` (template, committed)

---

## 1. Already done (no action) ✅

| Item                                                                             | Status                                                                                                |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Seeds in the live DB                                                             | ✅ `demo@xenboox.com` / `demo1234` (Kerr Jula) + `yc@xenboox.com` / `demo1234` (Northwind) — verified |
| `AUTH_SECRET`, `DATABASE_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV` | ✅ Set on Vercel (Production + Preview)                                                               |
| Git → Vercel auto-deploys + preview deployments                                  | ✅ Connected                                                                                          |

---

## 2. Credentials to create & add to Vercel (HIGH PRIORITY — features are dark without these)

### 🔴 R2 — Cloudflare (object storage: document uploads)

Create at `dash.cloudflare.com` → R2 → "Create bucket" → API Tokens (Read/Write scoped to the bucket).

- `R2_ACCOUNT_ID` — Cloudflare account ID (dash URL `dash.cloudflare.com/<ACCOUNT_ID>`)
- `R2_ACCESS_KEY_ID` — from the API token
- `R2_SECRET_ACCESS_KEY` — from the API token
- `R2_BUCKET_NAME` — e.g. `xenboox-documents`

### 🔴 Resend — (transactional email: invoices, notifications)

Create at `resend.com` → API Keys. Verify your sending domain (DNS records).

- `RESEND_API_KEY` — `re_...`
- `RESEND_FROM_EMAIL` — e.g. `billing@xenboox.com` (must match verified domain)
- `EMAIL_FROM` (alias, if read)

### 🔴 Anthropic — (the CFO + all worker agents — currently the LLM answers, but use the dedicated key)

`console.anthropic.com` → API Keys.

- `ANTHROPIC_API_KEY` — `sk-ant-...`

### 🔴 Upstash — (Redis: rate limiting + SSE broadcast + tenant cache)

`console.upstash.com` → create a Redis database → REST API section.

- `UPSTASH_REDIS_REST_URL` — `https://...upstash.io`
- `UPSTASH_REDIS_REST_TOKEN` — the REST token

### 🟡 LangFuse — (agent observability, traces, evals)

`cloud.langfuse.com` → project → keys.

- `LANGFUSE_PUBLIC_KEY` — `pk-lf-...`
- `LANGFUSE_SECRET_KEY` — `sk-lf-...`
- `LANGFUSE_BASE_URL` — `https://cloud.langfuse.com`

### 🟡 Sentry — (error tracking; source maps auto-upload when these are set)

`sentry.io` → org → project (Next.js) → settings.

- `SENTRY_DSN` — `https://...@sentry.io/...`
- `SENTRY_ORG` — your org slug
- `SENTRY_PROJECT` — project slug
- `SENTRY_AUTH_TOKEN` — org → Settings → Auth Tokens (must include `project:releases` scope; enables source-map upload at build)

### 🟡 Trigger.dev — (background jobs)

`trigger.dev` → project → API keys.

- `TRIGGER_SECRET_KEY` — `tr_...`
- `TRIGGER_API_KEY`

### 🟡 OpenRouter (fallback LLM routing) — optional

`openrouter.ai` → keys.

- `OPENROUTER_API_KEY`

---

## 3. Optional / feature-specific

| Env var                                                                                                               | What it enables                                                                | Where to get it                        |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------- |
| `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`                                                                               | Google OAuth login                                                             | console.cloud.google.com → Credentials |
| `FIELD_ENCRYPTION_KEY` (+ `FIELD_ENCRYPTION_KEY_VERSION`)                                                             | AES-256-GCM field encryption (set once — rotations per `docs/KEY_ROTATION.md`) | `openssl rand -base64 32`              |
| `ADMIN_AUTH_SECRET`                                                                                                   | /admin session signing                                                         | `openssl rand -base64 32`              |
| `CRON_SECRET` / `WEBHOOK_SECRET` / `MONO_WEBHOOK_SECRET`                                                              | Cron + webhook HMACs                                                           | `openssl rand -base64 32`              |
| `SAML_*` / `SSO_*`                                                                                                    | SSO/SAML login                                                                 | Your IdP (Okta/AzureAD)                |
| `DEEPINFRA_API_KEY`, `FIREWORKS_API_KEY`, `GOOGLE_AI_API_KEY`, `VERTEX_API_KEY`, `TOGETHER_API_KEY`, `OPENAI_API_KEY` | Alternate LLM providers (model-ops/llm-router)                                 | Respective consoles                    |
| `MODEMPAY_*`                                                                                                          | Mobile money payouts                                                           | ModemPay dashboard                     |
| `AUTH_IDLE_TIMEOUT_MINUTES`                                                                                           | Idle session timeout (default 60)                                              | —                                      |
| `SEED_DEMO_TOKEN`                                                                                                     | Protected seed endpoints                                                       | —                                      |
| `OTEL_*`                                                                                                              | OpenTelemetry export (optional; LangFuse covers this)                          | —                                      |

---

## 4. One-time CLI commands (run from repo root, after creating keys)

```bash
# Add each key to Vercel Production + Preview:
cd apps/web && vercel env add R2_ACCOUNT_ID production
# ...repeat for every key above. Then trigger a redeploy:
vercel deploy --prod
```

**Test email creds** (seeded for QA, change before public launch):

- `demo@xenboox.com` / `demo1234` (Kerr Jula Trading Co., GMD — Gambia)
- `yc@xenboox.com` / `demo1234` (Northwind Labs Inc., USD — US)

---

## 5. Post-launch hygiene (not launch-blocking)

- Rotate the demo password before public launch.
- Replace `AUTH_SECRET` with a fresh value, then invalidate old sessions.
- Enable Vercel "Protection" on Preview deployments if you want them private.
- Set up Sentry + BetterStack/Checkly alerts (probe docs in `docs/SLOs.md` — health paths are `/api/health?check=live` and `?check=ready`).
