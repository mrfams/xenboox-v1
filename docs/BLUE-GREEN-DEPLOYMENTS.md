# Blue-Green & Canary Deployments — Vercel Strategy

> **Xenboox deploys on Vercel.** Vercel doesn't use traditional blue-green or canary deployments, but provides equivalent (and often superior) capabilities through instant rollback, preview deployments, and traffic shifting.

## 1. Instant Rollback (Blue-Green Equivalent)

Vercel's **deployment promotion** is the blue-green equivalent:

### How it works

1. Every push to `master` creates a new deployment (the "green" environment)
2. Vercel builds and tests the deployment in isolation
3. On success, the deployment is **instantly promoted** to production (traffic shifts in <1s)
4. The previous deployment remains available at its unique URL for rollback

### Rollback procedure

```bash
# List recent deployments
npx vercel ls --limit 5

# Rollback to the previous deployment
npx vercel rollback <deployment-url>

# Or via Vercel dashboard:
# Project → Deployments → Click "..." on the last good deployment → "Promote to Production"
```

### Rollback time

- **< 1 second** — DNS is not involved; Vercel swaps the internal routing
- **Zero downtime** — old deployment continues serving during the swap

### When to rollback

- Error rate spike (>1% of requests returning 5xx)
- Performance degradation (p95 latency >2x baseline)
- Breaking change discovered in production
- Security vulnerability introduced

---

## 2. Canary Deployment (Percentage-Based Rollout)

Vercel supports **traffic splitting** via the `vercel.json` configuration:

### Configuration

```jsonc
// vercel.json
{
  "routes": [
    // 90% of traffic → current production (stable)
    // 10% of traffic → latest preview deployment (canary)
    {
      "src": "/(.*)",
      "dest": {
        "http": {
          "host": "xenboox.vercel.app",
          // Vercel automatically routes canary traffic to the latest
          // preview deployment when configured via Dashboard → Settings → Canary
        },
      },
    },
  ],
}
```

### Enabling canary deployments

1. Go to Vercel Dashboard → Project → Settings → Deployment Protection
2. Enable **"Canary Deployments"**
3. Set the percentage (e.g., 10% for canary)
4. The latest preview deployment receives canary traffic

### Monitoring canary health

```bash
# Compare error rates between production and canary
npx vercel logs <production-url> --error | wc -l
npx vercel logs <canary-url> --error | wc -l

# Check response times
curl -w "%{time_total}" -o /dev/null -s https://xenboox.com/dashboard
curl -w "%{time_total}" -o /dev/null -s https://xenboox-<canary-id>.vercel.app/dashboard
```

### Rollback from canary

If canary shows issues:

1. Disable canary in Vercel Dashboard → Settings → Deployment Protection
2. All traffic returns to the stable deployment immediately
3. Or: promote the stable deployment back to 100%

---

## 3. Preview Deployments (Pre-Production Testing)

Every PR gets a unique preview URL:

### How it works

1. Push a branch or open a PR
2. Vercel automatically creates a preview deployment
3. Preview URL: `https://xenboox-<commit-hash>-<team>.vercel.app`
4. GitHub PR gets a deployment status check with the preview link

### Preview deployment features

- **Isolated environment** — separate from production
- **Same infrastructure** — same Vercel region, same build pipeline
- **Database branching** — use Neon's `staging` branch for preview DB
- **Auth testing** — preview deployments can authenticate against staging DB

### Configuring preview database

```bash
# In Vercel Dashboard → Project → Environment Variables → Preview:
DATABASE_URL=postgresql://...@ep-staging-xxx.neon.tech/xenboox?sslmode=require
```

---

## 4. Deployment Approval Workflow

For production safety:

### Configuration

1. Vercel Dashboard → Project → Settings → Deployment Protection
2. Enable **"Required Approvals"** for production
3. Configure who can approve:
   - Team members with "Developer" role
   - Specific email addresses

### Approval flow

1. Push to `master` → Vercel starts building
2. Build succeeds → deployment enters "Pending Approval" state
3. Approver reviews the preview URL + build logs
4. Approves → deployment promotes to production
5. Rejects → deployment is cancelled

### Recommended approval process

1. **PR review** — code review + CI checks pass
2. **Preview testing** — manually test the preview deployment
3. **Approval** — approve the production deployment
4. **Post-deploy monitoring** — watch Sentry + health endpoints for 15 minutes

---

## 5. Post-Deployment Verification

After every production deployment:

```bash
# 1. Health check
curl -s https://xenboox.com/api/health?check=ready | jq .

# 2. Security headers
curl -sI https://xenboox.com | grep -iE "strict-transport|x-frame|content-security"

# 3. Auth flow
curl -s -o /dev/null -w "%{http_code}" https://xenboox.com/login

# 4. API response time
curl -w "%{time_total}\n" -o /dev/null -s https://xenboox.com/dashboard
```

### Monitoring window

- **First 5 minutes:** Watch Sentry for new errors
- **First 15 minutes:** Monitor p95 latency and error rate
- **First 1 hour:** Check cron job execution (webhook delivery, daily digest)
- **First 24 hours:** Review full-day metrics against baseline

---

## 6. Emergency Procedures

### Hotfix (critical security fix)

```bash
# 1. Create hotfix branch
git checkout -b hotfix/security-fix

# 2. Make the fix
# ...

# 3. Commit and push
git add . && git commit -m "fix(security): critical vulnerability fix"
git push origin hotfix/security-fix

# 4. Create PR → auto-preview deployment
# 5. Quick review + merge to master
# 6. Vercel auto-deploys to production
# 7. Monitor for 15 minutes
```

### Rollback (if deployment breaks)

```bash
# Immediate rollback (< 1 second)
npx vercel rollback <last-good-deployment-url>

# Or via dashboard:
# Deployments → Find last good deployment → "..." → "Promote to Production"
```

### Database rollback (if migration breaks)

```bash
# Neon supports point-in-time recovery
# 1. Go to Neon Console → Branches → main
# 2. Click "Restore" → Choose a timestamp before the migration
# 3. Update DATABASE_URL in Vercel to point to the restored branch
# 4. Redeploy
```

---

## Summary

| Capability | Vercel Feature                          | Rollback Time | Downtime |
| ---------- | --------------------------------------- | ------------- | -------- |
| Blue-Green | Instant rollback / deployment promotion | < 1 second    | None     |
| Canary     | Traffic splitting (Dashboard config)    | < 1 second    | None     |
| Preview    | Auto-deploy on PR                       | N/A           | N/A      |
| Approval   | Required approvals                      | N/A           | N/A      |

Vercel's model is **superior to traditional blue-green** because:

- No duplicate infrastructure to maintain
- Every deployment is a potential rollback target
- Rollback is instant (DNS-independent)
- Preview deployments provide pre-production testing without separate environments
