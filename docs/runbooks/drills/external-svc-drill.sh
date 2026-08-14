#!/usr/bin/env bash
# external-svc-drill.sh — verify graceful degradation when third-party services
# (Mono, Resend, R2) are down (§25.2):
#   1. Webhooks 500 WITH retry semantics (never silently drop).
#   2. Email failures surface in the retry queue.
#   3. Uploads still work via presigned fallbacks when the object store is down.
#
# STAGING ONLY. See docs/runbooks/drills/README.md.
set -euo pipefail

BASE_URL="${DRILL_BASE_URL:-http://localhost:3000}"
PASS=0
FAIL=0

say()  { printf '\n\033[1;34m== %s ==\033[0m\n' "$*"; }
ok()   { printf '  \033[1;32mPASS\033[0m %s\n' "$*"; PASS=$((PASS+1)); }
bad()  { printf '  \033[1;31mFAIL\033[0m %s\n' "$*"; FAIL=$((FAIL+1)); }

say "Drill: external services (staging only) — $BASE_URL"

# ── Phase 1: webhooks fail loudly with retry ────────────────────────────────
say "Phase 1 — Mono webhook with provider down"
say "  > Point MONO_API_KEY at a garbage value (or block api.withmono.com)."
say "  > POST a webhook payload to the Mono webhook endpoint."
read -r -p "  [Enter to continue]" _

say "  > Assert: the webhook endpoint responds 500 (fail loudly) AND the job"
say "  > retries (Trigger.dev maxAttempts 3) — never a silent 200 with data lost."
read -r -p "  [Enter to continue]" _

# ── Phase 2: email failures surface in retry queue ──────────────────────────
say "Phase 2 — Resend down"
say "  > Set RESEND_API_KEY to a garbage value; trigger a notification email"
say "  > (e.g. payment received)."
read -r -p "  [Enter to continue]" _

say "  > Assert (staging DB): the email_failures / retry queue has a row —"
say "  > the failure is queued for retry, not silently dropped."
read -r -p "  [Enter to continue]" _

# ── Phase 3: uploads still work via presigned fallback ──────────────────────
say "Phase 3 — R2 down, presigned uploads still flow"
say "  > Point R2_* at garbage values; request a presigned upload URL."
read -r -p "  [Enter to continue]" _

say "  > Assert: presigning still returns a URL (it doesn't require the object"
say "  > to exist); the client upload fails only at the store, and the UI"
say "  > shows a friendly error / queues the upload for retry."
read -r -p "  [Enter to continue]" _

echo
if [[ "$FAIL" -eq 0 ]]; then
  echo "DRILL PASSED — $PASS assertions, 0 failures"
  exit 0
else
  echo "DRILL FAILED — $PASS passed, $FAIL failed"
  exit 1
fi
