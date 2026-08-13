# Disaster Recovery Plan — Xenboox

> Living document. Reviewed quarterly. Last review: 2026-08-14.

---

## RTO / RPO Targets

| Metric                             | Target      | Justification                                                                 |
| ---------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| **RPO** (Recovery Point Objective) | ≤ 5 minutes | Neon PITR retains WAL segments; max data loss is the last WAL segment         |
| **RTO** (Recovery Time Objective)  | ≤ 1 hour    | Vercel auto-redeploys; Neon restore takes ~10-15 min; DNS propagation ~15 min |

---

## Backup Strategy

### 1. Neon Point-in-Time Recovery (PITR)

- **What:** Continuous WAL archival enables restore to any point in time
- **Retention:** 7 days (Starter plan), 30 days (Pro plan)
- **How:** Neon console → Branches → Create restore branch
- **Verification:** Weekly automated restore to a scratch branch (see `.github/workflows/backup-verify.yml`)
- **Cost:** Included in Neon Pro plan ($19/mo)

### 2. Daily Logical Backup to R2

- **What:** `pg_dump` of full schema + data, compressed, encrypted
- **Storage:** Cloudflare R2 bucket `xenboox-backups` with object-lock (7-day retention)
- **Schedule:** Daily at 03:00 UTC via GitHub Actions
- **Encryption:** AES-256-GCM with key from `BACKUP_ENCRYPTION_KEY` secret
- **Verification:** Weekly checksum verification + monthly test restore

### 3. Schema + Migration Backup

- **What:** All Drizzle migration files + schema snapshots are in git
- **Recovery:** `drizzle-kit push --force` from clean schema重建 the entire database
- **Verified:** 2026-08-13 — full rebuild from repo succeeded (BUILD_LOG.md)

---

## Recovery Procedures

### Scenario 1: Neon Database Corruption / Accidental Deletion

1. **Neon Console** → Branches → "Restore branch" → select point-in-time
2. Update `DATABASE_URL` in Vercel to point to restored branch
3. Run `pnpm db:migrate` to apply any post-backup migrations
4. Verify with `pnpm db:studio` — spot-check entity data
5. Update DNS if branch URL changed
6. **Expected time:** 15-30 minutes

### Scenario 2: Vercel Deployment Failure

1. **Vercel Dashboard** → Deployments → find last working deployment
2. Click "Promote to Production" → instant rollback
3. No data impact (database is separate)
4. **Expected time:** 2-5 minutes

### Scenario 3: Full Region Outage (US East)

1. Neon: create new project in `eu-central-1` (Frankfurt)
2. Restore from R2 backup: decrypt → `psql` import
3. Vercel: redeploy to `cdg1` (Paris) via `vercel.json` region config
4. Update DNS CNAME to new Vercel deployment
5. Update `DATABASE_URL` and all env vars
6. **Expected time:** 30-60 minutes

### Scenario 4: Secrets Compromise

1. **Immediate:** Rotate all secrets in Vercel dashboard
   - `AUTH_SECRET` → new value
   - `DATABASE_URL` → Neon password rotation
   - `ANTHROPIC_API_KEY` → Anthropic console rotation
   - `UPSTASH_REDIS_REST_TOKEN` → Upstash console rotation
2. Neon: rotate all connection passwords
3. Verify all services reconnect
4. Review security audit log for unauthorized access
5. **Expected time:** 15-30 minutes

---

## Backup Verification Schedule

| Check                   | Frequency       | Method                                   |
| ----------------------- | --------------- | ---------------------------------------- |
| Neon PITR restore test  | Weekly (Monday) | `.github/workflows/backup-verify.yml`    |
| R2 backup checksum      | Daily           | Automated in backup workflow             |
| Full DR drill           | Quarterly       | Manual — follow Scenario 3               |
| Schema rebuild from git | Semi-annually   | `drizzle-kit push --force` from clean DB |

---

## Monitoring & Alerts

| Alert                | Condition                                          | Channel                |
| -------------------- | -------------------------------------------------- | ---------------------- |
| Neon backup failure  | PITR archival gap > 1 hour                         | Email + Slack          |
| R2 backup failure    | `pg_dump` exit code != 0                           | GitHub Actions failure |
| Database unreachable | Health check `/api/health?check=ready` returns 503 | Vercel uptime monitor  |
| Disk usage > 80%     | Neon dashboard metric                              | Email                  |

---

## Contacts

| Role                 | Responsibility                           | Backup |
| -------------------- | ---------------------------------------- | ------ |
| Infrastructure owner | Neon, Vercel, R2, Upstash console access | —      |
| Security lead        | Secret rotation, incident response       | —      |
| On-call engineer     | First responder for alerts               | —      |

---

## Document History

| Date       | Change                  | Author   |
| ---------- | ----------------------- | -------- |
| 2026-08-14 | Initial DR plan created | Opencode |
