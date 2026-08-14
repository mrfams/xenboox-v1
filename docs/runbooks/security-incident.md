# Runbook: Security Incident

**When:** key/credential leak, unauthorized access, data exposure, or suspected
breach. **Sev: SEV-1 always** — invoke leadership + the comms template
immediately.

---

## Immediate actions (0–5 min) — CONTAIN FIRST, investigate second

1. **Rotate everything that could be exposed:**
   - `AUTH_SECRET` / `NEXTAUTH_SECRET` — rotating invalidates all sessions.
   - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` — rotate; the AI gateway
     `AI_KILL_SWITCH=true` stops LLM spend while you triage.
   - `DATABASE_URL` (Neon) — rotate; RLS is the backstop but don't rely on it
     alone.
   - `TRIGGER_SECRET_KEY`, `R2_*`, `UPSTASH_*`, `RESEND_API_KEY`.
   - Any key found in git history: `git filter-repo` + rotate — never just
     delete the file.
2. **Kill switches:** `AI_KILL_SWITCH=true`; pause job queue; consider
   read-only mode for the platform (block writes) until scope is known.
3. **Freeze:** collect logs (Sentry, audit_log, LangFuse traces, Vercel logs)
   before they rotate away.

## Triage (5–30 min)

1. Was it a repo leak, a phishing victim, or an app-level exploit (IDOR/SSRF)?
   - App-level: check audit_log for cross-entity access, the IDOR/RLS test
     suite (`__tests__/idor-rls-sweep.test.ts`), and webhook signature
     verification.
2. Scope: which tenants/users, what data, read or write, how long.
3. Legal: assess breach-notification obligations (target markets: GDPR/PA-DPA
   etc.) — comms template §7 of `docs/INCIDENT_RUNBOOK.md`.

## Recovery

1. Fix the root cause; re-run the security test suites
   (`security-headers`, `csrf-origin`, `xss`, `sqli-static`, `idor-rls-sweep`).
2. Restore env one key at a time; re-enable the kill-switch off last.
3. Postmortem + **blameless** write-up; add the finding to
   `docs/decisions/` if it changes architecture (e.g. SSRF allowlist).

## Never

- Never log or paste secrets into the incident thread.
- Never disclose the incident publicly before comms approval.
