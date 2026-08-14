#!/usr/bin/env bash
# redis-down-drill.sh — simulate a Redis/Upstash outage and verify Xenboox
# degrades gracefully (§25.2):
#   1. Health check=ready returns 503 (readiness includes Redis ping).
#   2. Rate limiting still holds per-instance (in-memory fallback).
#   3. The app still serves traffic.
#   4. Recovery: readiness returns 200 when Redis is back.
#
# STAGING ONLY. See docs/runbooks/drills/README.md.
set -euo pipefail

BASE_URL="${DRILL_BASE_URL:-http://localhost:3000}"
ENV_FILE=".drill-redis-env"
PASS=0
FAIL=0

say()  { printf '\n\033[1;34m== %s ==\033[0m\n' "$*"; }
ok()   { printf '  \033[1;32mPASS\033[0m %s\n' "$*"; PASS=$((PASS+1)); }
bad()  { printf '  \033[1;31mFAIL\033[0m %s\n' "$*"; FAIL=$((FAIL+1)); }

# Capture + neutralize real Redis env (must restore on exit).
backup_env() {
  : > "$ENV_FILE"
  for k in UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN; do
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
trap restore_env EXIT

cleanup_on_error() { restore_env; }
trap cleanup_on_error ERR INT TERM

say "Drill: Redis down (staging only) — $BASE_URL"

# ── Phase 1: baseline (Redis present) ──────────────────────────────────────
backup_env
say "Phase 1 — baseline readiness (expect 200)"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health?check=ready")
if [[ "$code" == "200" ]]; then ok "baseline readiness 200 (got $code)"; else bad "baseline readiness expected 200, got $code"; fi

# ── Phase 2: kill Redis from the app's perspective ─────────────────────────
# Note: for a local/staging run, the realistic injection is pointing the app
# at a dead endpoint. In Vercel/staging, flip the env var in the dashboard;
# for local dev, export a dead URL before starting the dev server.
say "Phase 2 — inject outage (point app at dead Redis endpoint)"
say "  > Set UPSTASH_REDIS_REST_URL to a dead endpoint and restart the app."
say "  > Press Enter when the app is running with the dead Redis…"
read -r -p "  [Enter to continue]" _

say "Phase 3 — verify degraded behavior"
# Readiness must 503: the check pings Redis.
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health?check=ready")
if [[ "$code" == "503" ]]; then ok "readiness 503 while Redis down (got $code)"; else bad "readiness expected 503, got $code"; fi

# Liveness must still be 200 (process alive).
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health?check=live")
if [[ "$code" == "200" ]]; then ok "liveness still 200 while Redis down (got $code)"; else bad "liveness expected 200, got $code"; fi

# The login page must still render (app serves traffic without Redis).
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/login")
if [[ "$code" == "200" ]]; then ok "login page serves without Redis (got $code)"; else bad "login page expected 200, got $code"; fi

# Rate limiting must still hold per-instance (in-memory fallback):
# a burst of login attempts should eventually be limited, not open.
say "Phase 4 — in-memory rate limiter engages (burst 25 auth-login requests)"
limited=0
for i in $(seq 1 25); do
  code=$(curl -s -o /dev/null -w '%{http_code}' \
    -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data 'email=drill@xenboox.test&password=wrong&csrfToken=drill')
  # 429 (rate limited) OR 401/403 (rejected creds) are both "limiter/guard alive"
  if [[ "$code" == "429" ]]; then ok "rate limiter returned 429 on attempt $i"; limited=1; break; fi
  if [[ "$code" == "401" || "$code" == "403" ]]; then
    # auth guard still rejects — limiter fallback engaged silently
    continue
  fi
done
if [[ "$limited" == "1" ]]; then
  ok "in-memory limiter returned 429 during burst"
else
  bad "no 429 observed — verify auth-login limiter fallback (may need real auth flow)"
fi

# ── Phase 5: recovery ───────────────────────────────────────────────────────
say "Phase 5 — restore Redis and verify recovery"
restore_env
say "  > Restore UPSTASH_REDIS_REST_URL and restart the app."
read -r -p "  [Enter to continue]" _

code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health?check=ready")
if [[ "$code" == "200" ]]; then ok "readiness back to 200 after Redis restore (got $code)"; else bad "readiness expected 200 after restore, got $code"; fi

# ── Summary ─────────────────────────────────────────────────────────────────
echo
if [[ "$FAIL" -eq 0 ]]; then
  echo "DRILL PASSED — $PASS assertions, 0 failures"
  exit 0
else
  echo "DRILL FAILED — $PASS passed, $FAIL failed"
  exit 1
fi
