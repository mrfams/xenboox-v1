# Uptime Monitoring & Status Page — Config (mock keys)

> User action required: replace every `MOCK_*` value with real credentials
> before launch. This file documents the exact probes and status page
> components to configure in BetterStack (or Checkly + a status page).
>
> Status page URL: **status.xenboox.com** — must match the SLA promise.

---

## 1. Probes to create

| #   | Type    | URL                                                       | Expected                     | Frequency | Regions                    |
| --- | ------- | --------------------------------------------------------- | ---------------------------- | --------- | -------------------------- |
| 1   | HTTP(S) | `https://xenboox.com/api/health?check=live`               | 200                          | 1 min     | us-east, eu-west, af-south |
| 2   | HTTP(S) | `https://xenboox.com/api/health?check=ready`              | 200 (503 when DB/Redis down) | 1 min     | us-east, eu-west           |
| 3   | HTTP(S) | `https://xenboox.com/login`                               | 200                          | 5 min     | us-east, af-south          |
| 4   | HTTP(S) | `https://xenboox.com/api/health?check=ready` (SSL expiry) | cert valid > 14 days         | daily     | us-east                    |

**Alert rules (all probes):** alert on 2 consecutive failures; escalate to
email → Slack/PagerDuty after 5 min of continuous failure.

---

## 2. BetterStack mock config

```env
# docs/UPTIME_PROBES.md — MOCK VALUES (replace before launch)
BETTERSTACK_API_TOKEN=MOCK_BETTERSTACK_API_TOKEN
BETTERSTACK_STATUS_PAGE_ID=MOCK_STATUS_PAGE_ID
# Status page subdomain: status.xenboox.com (set in BetterStack dashboard)
# Notify channels: email + Slack webhook
BETTERSTACK_SLACK_WEBHOOK=https://hooks.slack.com/services/MOCK/T00000000/B00000000
```

### 2.1 BetterStack setup (click-through)

1. Sign in at betterstack.com → **Uptime** → **New monitor**.
2. Add the 4 probes from §1 (pick closest regions).
3. Set the alert escalation: 2 consecutive fails → email; 5 min → Slack/PagerDuty.
4. **Status page** → create → subdomain `status.xenboox.com`.
5. Add a component per row in the status page table (§4 below).
6. Set **incident templates** to mirror `docs/INCIDENT_RUNBOOK.md §7`.

---

## 3. Checkly alternative (if BetterStack is not used)

```env
# Checkly mock config
CHECKLY_API_KEY=MOCK_CHECKLY_API_KEY
CHECKLY_ACCOUNT_ID=MOCK_CHECKLY_ACCOUNT_ID
# CLI: npx checkly deploy (repo has checkly.config.ts once provisioned)
```

Create the same 4 probes via `checkly` CLI or dashboard; use **statuspage.io**
(or Checkly's built-in status pages) for status.xenboox.com.

---

## 4. Status page components (status.xenboox.com)

| Component            | Maps to probe # | Notes                                             |
| -------------------- | --------------- | ------------------------------------------------- |
| Website              | 1               | Liveness — process up                             |
| API & Dashboard      | 2               | Readiness — DB + Redis reachable                  |
| Agent jobs           | (manual/API)    | Trigger.dev queue depth; DLQ `review_items` count |
| Database             | 2               | via readiness probe                               |
| Payments & bank sync | (manual)        | Mono API status                                   |
| Email                | (manual)        | Resend status                                     |

**Manual components** update via the status page API (mock key):
`BETTERSTACK_STATUS_PAGE_API_KEY=MOCK_STATUS_PAGE_API_KEY` — POST incident
updates per `docs/INCIDENT_RUNBOOK.md §5`.

---

## 5. Local verification before launch

```bash
# Health endpoints must be green locally:
curl -s "http://localhost:3000/api/health?check=live"   # expect {"status":"ok",...}
curl -s "http://localhost:3000/api/health?check=ready"  # expect 200 when DB/Redis up
```

If `check=ready` returns 503, the probe config above will alert immediately —
that is the intended fail-fast behavior.

---

## 6. Checklist (launch gate)

- [ ] All 4 probes created in BetterStack (or Checkly) with real regions
- [ ] status.xenboox.com created + components mapped (§4)
- [ ] Escalation: email → Slack → PagerDuty wired
- [ ] Incident templates reference `docs/INCIDENT_RUNBOOK.md`
- [ ] `BETTERSTACK_*` / `CHECKLY_*` real values in Vercel env (never in git)
- [ ] Postmortem folder `docs/incidents/` exists
