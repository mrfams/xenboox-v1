# Xenboox Infrastructure as Code (Terraform)

> **Status:** Reference configuration — provision actual resources via Vercel dashboard + CLI before applying Terraform.

## Overview

This directory contains Terraform configurations for all Xenboox infrastructure:

| Module     | Provider   | Purpose                                    |
| ---------- | ---------- | ------------------------------------------ |
| `vercel/`  | Vercel     | Next.js web application, domains, env vars |
| `neon/`    | Neon       | PostgreSQL database, branches, pooling     |
| `r2/`      | Cloudflare | Object storage for documents/uploads       |
| `upstash/` | Upstash    | Redis for rate limiting + caching          |
| `dns/`     | Cloudflare | DNS records for production domain          |

## Prerequisites

1. **Terraform** ≥ 1.5 installed
2. **Provider tokens** set as environment variables:
   ```bash
   export VERCEL_TOKEN="your-vercel-token"
   export NEON_API_KEY="your-neon-api-key"
   export CLOUDFLARE_API_TOKEN="your-cloudflare-token"
   export UPSTASH_API_TOKEN="your-upstash-token"
   export UPSTASH_API_EMAIL="your-email"
   ```

## Quick Start

```bash
cd terraform/

# Initialize providers
terraform init

# Preview changes
terraform plan

# Apply infrastructure
terraform apply

# Destroy (use with caution)
terraform destroy
```

## Module Details

### Vercel (`vercel/`)

- **Project:** `xenboox` — Next.js 15 app with serverless functions
- **Domain:** Production + preview deployments
- **Env vars:** Injected via Vercel dashboard (secrets), supplemented by Terraform for non-secret config
- **Regions:** `iad1` (US East) primary; `cpt1` (Cape Town) for African cells
- **Cron jobs:** Webhook delivery (5min), daily digest (06:00 UTC), month-end close (09:00 UTC)

### Neon (`neon/`)

- **Project:** Serverless PostgreSQL with branching
- **Branches:** `main` (production), `staging` (preview), `dev` (local development)
- **Compute:** Auto-scaling 0.25–4 CU; production minimum 1 CU
- **Connection pooling:** Built-in transaction-mode pooler (~100–300 backend connections)
- **Backup:** Point-in-time recovery (7-day retention on Pro plan)

### Cloudflare R2 (`r2/`)

- **Bucket:** `xenboox-documents` — document storage (invoices, receipts, exports)
- **Bucket:** `xenboox-exports` — bulk export files (CSV, Excel)
- **Lifecycle:** Auto-delete incomplete multipart uploads after 7 days
- **CORS:** Allow `xenboox.com` origins only

### Upstash Redis (`upstash/`)

- **Database:** Rate limiting + semantic cache + SSE broadcast
- **Plan:** Pay-per-request (Pro recommended for production)
- **Region:** `us-east-1` (same as Vercel `iad1` for lowest latency)

### DNS (`dns/`)

- **Zone:** `xenboox.com`
- **Records:** `A`/`AAAA` → Vercel, `CNAME` → Vercel for subdomains
- **SSL:** Managed by Vercel (automatic Let's Encrypt)

## Environment Variables

Terraform manages **non-secret** configuration. Secrets are set via Vercel dashboard:

| Variable              | Source           | Description             |
| --------------------- | ---------------- | ----------------------- |
| `NEXT_PUBLIC_APP_URL` | Terraform        | Production URL          |
| `DATABASE_URL`        | Neon console     | Connection string       |
| `R2_BUCKET_NAME`      | Terraform        | Document storage bucket |
| `AUTH_SECRET`         | Vercel dashboard | Auth.js session secret  |
| `ANTHROPIC_API_KEY`   | Vercel dashboard | LLM provider key        |
| `LANGFUSE_SECRET_KEY` | Vercel dashboard | Observability key       |

## Cost Estimates (Monthly)

| Service       | Plan        | Est. Cost      |
| ------------- | ----------- | -------------- |
| Vercel        | Pro         | $20            |
| Neon          | Pro         | $19            |
| Cloudflare R2 | Pay-per-use | ~$5–15         |
| Upstash Redis | Pro         | ~$10           |
| **Total**     |             | **~$55–70/mo** |

## Notes

- **This is a reference configuration.** For the initial launch, use the Vercel/Neon/R2 dashboards directly. Terraform is for operational maturity (repeatable deploys, drift detection, multi-region cells).
- **Multi-region cells** (`af1`, `eu1`) are configured in `docs/MULTI-REGION.md` with mock keys. Provision actual Neon projects + Vercel deployments per cell when ready.
- **State backend:** Use Terraform Cloud or S3+DynamoDB for team state management.
