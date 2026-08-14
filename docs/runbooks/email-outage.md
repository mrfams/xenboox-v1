# Runbook: Email Outage

**When:** Resend failures, `email_failures` retry queue growing, verification
emails not arriving.

**Sev:** SEV-3 (no money movement affected; auth verification delayed) — SEV-2
if all transactional email is blocked (onboarding/verification blocks signups).

---

## Detection

- Resend dashboard (delivery rate, hard bounces, webhook errors).
- `email_failures` table / retry queue count.
- Sentry: `lib/email.ts` errors.

## Immediate actions (0–5 min)

1. **Auth emails are the critical path** — new-user verification must not
   silently fail. Check whether `sendVerificationEmail` is erroring or being
   rate-limited by Resend.
2. If Resend is down: rely on the retry queue (`email_failures`); users can
   re-request verification links (idempotent).
3. Check domain verification (SPF/DKIM/DMARC) hasn't lapsed — a config change
   at launch often breaks this.

## Recovery

1. Resend green → drain the email retry queue (bounded concurrency).
2. Verify a full signup → verification email → login flow.

## Post-incident

- Postmortem per `docs/INCIDENT_RUNBOOK.md §8`.
