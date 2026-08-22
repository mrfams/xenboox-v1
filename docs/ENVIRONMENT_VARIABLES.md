# Xenboox Environment Variables — Complete Setup Guide

> All environment variables needed for production deployment. Each section explains where to get the value and how to configure it.

---

## 🟢 Required (App Won't Start Without)

### `AUTH_SECRET`

- **What it is:** Encryption key for session JWTs
- **How to generate:** `openssl rand -base64 32` (terminal)
- **Where to set:** Vercel → Settings → Environment Variables
- **Length:** 32 bytes base64-encoded

### `AUTH_URL`

- **What it is:** Public URL of your app
- **Example:** `https://xenboox.vercel.app`
- **Where to set:** Vercel → Settings → Environment Variables
- **Note:** Must match your Vercel deployment URL

### `DATABASE_URL`

- **What it is:** PostgreSQL connection string for Neon
- **Format:** `postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/xenboox?sslmode=require`
- **Where to get:** [Neon Dashboard](https://console.neon.tech) → Project → Connection Details → Pooled connection
- **Required options:** `?sslmode=require&pgbouncer=true` (for connection pooling)

### `NEXT_PUBLIC_APP_URL`

- **What it is:** Public-facing app URL (used in emails, redirects)
- **Example:** `https://xenboox.vercel.app`
- **Where to set:** Vercel → Settings → Environment Variables

---

## 🔵 Authentication (OAuth)

### `GOOGLE_CLIENT_ID`

- **What it is:** OAuth 2.0 client identifier
- **Where to get:**
  1. Go to [Google Cloud Console](https://console.cloud.google.com)
  2. Create a new project or select existing
  3. Navigate to APIs & Services → Credentials
  4. Click "Create Credentials" → "OAuth 2.0 Client ID"
  5. Application type: "Web application"
  6. Authorized redirect URIs: `https://xenboox.vercel.app/api/auth/callback/google`
  7. Copy the Client ID

### `GOOGLE_CLIENT_SECRET`

- **What it is:** OAuth 2.0 client secret
- **Where to get:** Same Google Cloud Console page as above
- **Security:** Treat like a password — never commit to git

### `GITHUB_CLIENT_ID`

- **What it is:** GitHub OAuth App client identifier
- **Where to get:**
  1. Go to [GitHub Settings → Developer Settings → OAuth Apps](https://github.com/settings/developers)
  2. Click "New OAuth App"
  3. Homepage URL: `https://xenboox.vercel.app`
  4. Authorization callback URL: `https://xenboox.vercel.app/api/auth/callback/github`
  5. Copy the Client ID

### `GITHUB_CLIENT_SECRET`

- **What it is:** GitHub OAuth App client secret
- **Where to get:** Same GitHub OAuth App page as above
- **Security:** Treat like a password — never commit to git

---

## 📧 Email (Resend)

### `RESEND_API_KEY`

- **What it is:** API key for sending emails via Resend
- **Where to get:**
  1. Sign up at [resend.com](https://resend.com) _(user: already signed up ✅)_
  2. Go to Dashboard → API Keys
  3. Click "Create API Key"
  4. Choose permission: "Sending access" (or "Full access" for inbound email)
  5. Copy the key — it starts with `re_`
- **How to use:** `re_xxxxxxxxxxxxx` (starts with `re_`)
- **To test:**
  ```bash
  curl -X POST 'https://api.resend.com/emails' \
    -H 'Authorization: Bearer re_xxxxxxxxxxxxx' \
    -H 'Content-Type: application/json' \
    -d '{"from":"Xenboox <noreply@yourdomain.com>","to":"you@example.com","subject":"Test","html":"<p>Hello!</p>"}'
  ```
- **Free tier:** 100 emails/day, 3,000 emails/month — generous for development

### `EMAIL_FROM`

- **What it is:** Sender email address for all outgoing emails
- **Example:** `Xenboox <noreply@xenboox.com>`
- **Required:** You must verify your domain in Resend first:
  1. Resend Dashboard → Domains → Add Domain
  2. Add the DNS TXT record to your domain provider (e.g., Namecheap, Cloudflare)
  3. Wait for verification (5-30 min)
  4. Use `noreply@yourdomain.com` or `hello@yourdomain.com`

### Setting Up Inbound Email (For Email Forwarding Feature)

- **Purpose:** Users forward invoices/receipts to Xenboox for auto-processing
- **How it works:** Resend receives emails → sends webhook to your API → OCR processes attachments
- **Setup:**
  1. Resend Dashboard → Domains → Choose verified domain
  2. Enable "Inbound Email"
  3. Set destination webhook URL: `https://xenboox.vercel.app/api/webhooks/email`
  4. Resend provides an inbound address like `inbound@yourdomain.resend.com`
  5. Users set up email forwarding rules pointing to this address

---

## 🏦 Bank Integration (Mono Connect)

### `NEXT_PUBLIC_MONO_PUBLIC_KEY`

- **What it is:** Public key for Mono Connect widget (frontend)
- **Where to get:**
  1. Sign up at [mono.co](https://mono.co)
  2. Go to Dashboard → Developers → API Keys
  3. Copy the "Public Key" (starts with `test_pk_` for sandbox, `live_pk_` for production)
- **Used for:** Bank account linking UI in connect-bank-dialog.tsx

### `MONO_SECRET_KEY`

- **What it is:** Secret key for Mono API calls (backend)
- **Where to get:** Same Mono dashboard page as above
- **Security:** Backend-only — never expose in frontend code
- **Used for:** Mono webhook verification, transaction sync jobs

---

## 📊 Observability (LangFuse)

### `LANGFUSE_PUBLIC_KEY`

- **What it is:** Public key for LangFuse tracing
- **Where to get:**
  1. Sign up at [langfuse.com](https://langfuse.com) (free tier: 50k observations/mo)
  2. Go to Project Settings → API Keys
  3. Copy the "Public Key" (starts with `pk-lf-`)
- **Used for:** LLM call tracing, agent pipeline monitoring

### `LANGFUSE_SECRET_KEY`

- **What it is:** Secret key for LangFuse API
- **Where to get:** Same LangFuse settings page
- **Security:** Backend-only
- **Used for:** Sending trace data to LangFuse

### `LANGFUSE_BASE_URL` (Optional)

- **Default:** `https://us.cloud.langfuse.com`
- **Custom:** If self-hosting LangFuse, set to your instance URL

#### What LangFuse Actually Does:

- **Traces everything your AI agents do** — every LLM call, every pipeline step, every decision
- **Cost tracking** — shows exactly what each agent costs per run
- **Latency monitoring** — how long each pipeline step takes
- **Debugging** — replay any agent conversation with full logs
- **Dashboard** — see how many agent runs per day, error rates, token usage

---

## ☁️ Storage (Cloudflare R2)

### `R2_ACCESS_KEY_ID`

- **What it is:** S3-compatible access key for Cloudflare R2
- **Where to get:**
  1. Cloudflare Dashboard → R2 → Manage API Tokens
  2. Create token with Object Read & Write permissions

### `R2_SECRET_ACCESS_KEY`

- **What it is:** Secret key for Cloudflare R2
- **Security:** Backend-only

### `R2_BUCKET_NAME`

- **What it is:** Name of your R2 bucket for document storage
- **Default:** `xenboox-documents`

### `R2_ACCOUNT_ID`

- **What it is:** Cloudflare account ID for R2 endpoint
- **Where to get:** Cloudflare Dashboard → right sidebar → Account ID

### `R2_ENDPOINT`

- **Format:** `https://<account-id>.r2.cloudflarestorage.com`
- **Note:** Auto-constructed from R2_ACCOUNT_ID if not set

---

## 🔧 Job Queue (Trigger.dev)

### `TRIGGER_SECRET_KEY`

- **What it is:** API key for Trigger.dev job queue
- **Where to get:**
  1. Sign up at [trigger.dev](https://trigger.dev)
  2. Create a project, go to Environment Variables

### `TRIGGER_API_URL` (Optional)

- **Default:** `https://api.trigger.dev`
- **Custom:** Self-hosted Trigger.dev instances

---

## 🚀 Vercel Deployment Checklist

### Step 1: Set up project

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Pull environment variables from Vercel
vercel env pull
```

### Step 2: Add all env vars in Vercel Dashboard

Navigate to: Vercel Project → Settings → Environment Variables

Add each variable from the sections above. Most should be marked as "Production" and "Preview".

### Step 3: Configure build

- **Framework preset:** Next.js
- **Build command:** `pnpm build`
- **Output directory:** `.next`
- **Install command:** `pnpm install`
- **Root directory:** `apps/web`

### Step 4: First deployment

```bash
git push origin main
# or
vercel --prod
```

### Step 5: Verify

- Check deployment logs for build errors
- Visit `https://xenboox.vercel.app/api/health` (if available)
- Test login flow
- Test email sending with a test email

---

## Quick Reference: All Variables at a Glance

| Variable                      | Service       | Required      | Where to Get              |
| ----------------------------- | ------------- | ------------- | ------------------------- |
| `AUTH_SECRET`                 | Auth.js       | ✅            | `openssl rand -base64 32` |
| `AUTH_URL`                    | Auth.js       | ✅            | Your deployment URL       |
| `DATABASE_URL`                | Neon          | ✅            | Neon Dashboard            |
| `NEXT_PUBLIC_APP_URL`         | App           | ✅            | Your deployment URL       |
| `GOOGLE_CLIENT_ID`            | Google OAuth  | For SSO       | Google Cloud Console      |
| `GOOGLE_CLIENT_SECRET`        | Google OAuth  | For SSO       | Google Cloud Console      |
| `GITHUB_CLIENT_ID`            | GitHub OAuth  | For SSO       | GitHub OAuth Apps         |
| `GITHUB_CLIENT_SECRET`        | GitHub OAuth  | For SSO       | GitHub OAuth Apps         |
| `RESEND_API_KEY`              | Resend        | For email     | Resend Dashboard          |
| `EMAIL_FROM`                  | Resend        | For email     | Your verified domain      |
| `NEXT_PUBLIC_MONO_PUBLIC_KEY` | Mono          | For bank link | Mono Dashboard            |
| `MONO_SECRET_KEY`             | Mono          | For bank link | Mono Dashboard            |
| `LANGFUSE_PUBLIC_KEY`         | LangFuse      | For tracing   | LangFuse Project Settings |
| `LANGFUSE_SECRET_KEY`         | LangFuse      | For tracing   | LangFuse Project Settings |
| `R2_ACCESS_KEY_ID`            | Cloudflare R2 | For storage   | Cloudflare Dashboard      |
| `R2_SECRET_ACCESS_KEY`        | Cloudflare R2 | For storage   | Cloudflare Dashboard      |
| `R2_BUCKET_NAME`              | Cloudflare R2 | For storage   | Cloudflare Dashboard      |
| `R2_ACCOUNT_ID`               | Cloudflare R2 | For storage   | Cloudflare Dashboard      |
| `TRIGGER_SECRET_KEY`          | Trigger.dev   | For jobs      | Trigger.dev Dashboard     |
