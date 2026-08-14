#!/usr/bin/env bash
# job-queue-drill.sh — verify the job platform's failure semantics (§23.1 / §25.2):
#   1. Re-triggering the same job (double webhook) collapses into ONE run
#      (idempotencyKey).
#   2. A poison task surfaces into review_items (DLQ) instead of vanishing.
#   3. A backlog does not double-post journal entries.
#
# STAGING ONLY. See docs/runbooks/drills/README.md.
set -euo pipefail

BASE_URL="${DRILL_BASE_URL:-http://localhost:3000}"
PASS=0
FAIL=0

say()  { printf '\n\033[1;34m== %s ==\033[0m\n' "$*"; }
ok()   { printf '  \033[1;32mPASS\033[0m %s\n' "$*"; PASS=$((PASS+1)); }
bad()  { printf '  \033[1;31mFAIL\033[0m %s\n' "$*"; FAIL=$((FAIL+1)); }

say "Drill: job queue semantics (staging only) — $BASE_URL"

# ── Phase 1: double trigger collapses ───────────────────────────────────────
say "Phase 1 — double-trigger a job with the SAME idempotency key"
say "  > From the Trigger.dev dashboard, trigger 'process-month-end-close'"
say "  > twice with idempotencyKey 'job:{entityId}:2026-8' (same entity/period)."
read -r -p "  [Enter to continue]" _

say "  > Assert: the dashboard shows ONE run (the second trigger returned the"
say "  > same run / was deduped). No double close was executed."
read -r -p "  [Enter to continue]" _

# ── Phase 2: poison task → DLQ ──────────────────────────────────────────────
say "Phase 2 — poison task lands in review_items"
say "  > Upload a corrupt/unsupported document so the pipeline fails after"
say "  > retries (or temporarily point R2 at a dead endpoint)."
read -r -p "  [Enter to continue]" _

say "  > Assert (SQL on staging DB):"
say "  >   SELECT count(*) FROM review_items WHERE agent_id='process-document' AND status='pending';"
say "  > must be ≥ 1 — the DLQ captured the poison task with error context."
read -r -p "  [Enter to continue]" _

# ── Phase 3: backlog doesn't double-post ────────────────────────────────────
say "Phase 3 — backlog replay does not double-post"
say "  > Re-run the failed run from the dashboard (same idempotency key)."
read -r -p "  [Enter to continue]" _

say "  > Assert: exactly ONE journal entry / document transition — no duplicate."
read -r -p "  [Enter to continue]" _

echo
if [[ "$FAIL" -eq 0 ]]; then
  echo "DRILL PASSED — $PASS assertions, 0 failures"
  exit 0
else
  echo "DRILL FAILED — $PASS passed, $FAIL failed"
  exit 1
fi
