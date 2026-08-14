#!/usr/bin/env bash
# db-failover-drill.sh — simulate a database outage (§25.2 / DR plan):
#   1. Readiness → 503 (DB ping fails).
#   2. Requests fail cleanly — no partial writes, no unhandled crashes.
#   3. Idempotency: a retried write after recovery must NOT double-post.
#   4. Recovery: readiness 200; end-to-end journal write succeeds once.
#
# STAGING ONLY — pointing this at production risks real data. See
# docs/runbooks/drills/README.md.
set -euo pipefail

BASE_URL="${DRILL_BASE_URL:-http://localhost:3000}"
ENV_FILE=".drill-db-env"
PASS=0
FAIL=0

say()  { printf '\n\033[1;34m== %s ==\033[0m\n' "$*"; }
ok()   { printf '  \033[1;32mPASS\033[0m %s\n' "$*"; PASS=$((PASS+1)); }
bad()  { printf '  \033[1;31mFAIL\033[0m %s\n' "$*"; FAIL=$((FAIL+1)); }

backup_env() {
  : > "$ENV_FILE"
  for k in DATABASE_URL; do
    if [[ -n "${!k:-}" ]]; then
      printf '%s=%s\n' "$k" "${!k}" >> "$ENV_FILE"
    fi
  done
}
restore_env() {
  if [[ -f "$ENV_FILE" ]]; then
    set -a; source "$ENV_FILE"; set +a
    rm -f "$ENV_FILE"
  fi
}
trap restore_env EXIT ERR INT TERM

say "Drill: DB failover (staging only) — $BASE_URL"

backup_env

# ── Phase 1: baseline ───────────────────────────────────────────────────────
say "Phase 1 — baseline readiness (expect 200)"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health?check=ready")
if [[ "$code" == "200" ]]; then ok "baseline readiness 200 (got $code)"; else bad "baseline expected 200, got $code"; fi

# ── Phase 2: kill the DB ────────────────────────────────────────────────────
say "Phase 2 — inject DB outage"
say "  > Staging: point DATABASE_URL at a dead endpoint (or pause the Neon branch)."
say "  > Restart the app with the dead DATABASE_URL."
read -r -p "  [Enter to continue]" _

say "Phase 3 — verify degraded behavior"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health?check=ready")
if [[ "$code" == "503" ]]; then ok "readiness 503 while DB down (got $code)"; else bad "readiness expected 503, got $code"; fi

code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health?check=live")
if [[ "$code" == "200" ]]; then ok "liveness still 200 (process alive) (got $code)"; else bad "liveness expected 200, got $code"; fi

say "  > Exercise a write path (e.g. create a draft document) — it must fail"
say "  > with a clean error (no stack trace to the client, no partial row)."
read -r -p "  [Enter to continue]" _

say "Phase 4 — verify no partial writes on recovery"
say "  > Restore DATABASE_URL and restart the app."
restore_env
read -r -p "  [Enter to continue]" _

code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health?check=ready")
if [[ "$code" == "200" ]]; then ok "readiness back to 200 after restore (got $code)"; else bad "readiness expected 200, got $code"; fi

say "  > Re-run the same write twice with the SAME x-idempotency-key header."
say "  > Assert: exactly ONE row exists (journal/document) — idempotency saved us."
read -r -p "  [Enter to continue]" _

echo
if [[ "$FAIL" -eq 0 ]]; then
  echo "DRILL PASSED — $PASS assertions, 0 failures"
  exit 0
else
  echo "DRILL FAILED — $PASS passed, $FAIL failed"
  exit 1
fi
