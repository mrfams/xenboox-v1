#!/usr/bin/env bash
# llm-outage-drill.sh — simulate an LLM provider outage (§25.2 / §22.4):
#   1. Invalid provider key → chat/agent calls fail gracefully (retry → clean
#      error), never crash the process.
#   2. AI_KILL_SWITCH=true → every model call is blocked with a clean
#      AiBudgetExceededError before touching the provider.
#   3. Recovery: restore the key, calls succeed again.
#
# STAGING ONLY. See docs/runbooks/drills/README.md.
set -euo pipefail

BASE_URL="${DRILL_BASE_URL:-http://localhost:3000}"
ENV_FILE=".drill-llm-env"
PASS=0
FAIL=0

say()  { printf '\n\033[1;34m== %s ==\033[0m\n' "$*"; }
ok()   { printf '  \033[1;32mPASS\033[0m %s\n' "$*"; PASS=$((PASS+1)); }
bad()  { printf '  \033[1;31mFAIL\033[0m %s\n' "$*"; FAIL=$((FAIL+1)); }

backup_env() {
  : > "$ENV_FILE"
  for k in ANTHROPIC_API_KEY OPENAI_API_KEY AI_KILL_SWITCH; do
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

say "Drill: LLM provider outage (staging only) — $BASE_URL"

backup_env

# ── Phase 1: baseline ───────────────────────────────────────────────────────
say "Phase 1 — baseline health (expect 200)"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health?check=live")
if [[ "$code" == "200" ]]; then ok "liveness 200 (got $code)"; else bad "liveness expected 200, got $code"; fi

# ── Phase 2: invalid provider key ───────────────────────────────────────────
say "Phase 2 — inject invalid provider key"
say "  > Set ANTHROPIC_API_KEY/OPENAI_API_KEY to a garbage value and restart the app."
read -r -p "  [Enter to continue]" _

say "Phase 3 — verify graceful degradation"
# The app must still serve (provider failure must not take down the platform).
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health?check=live")
if [[ "$code" == "200" ]]; then ok "liveness 200 with invalid provider key (got $code)"; else bad "liveness expected 200, got $code"; fi

code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/login")
if [[ "$code" == "200" ]]; then ok "login page serves with invalid provider key (got $code)"; else bad "login expected 200, got $code"; fi

say "  > Optional: open the chat surface and confirm the friendly degraded"
say "  > message ('AI services temporarily unavailable') instead of a crash."
read -r -p "  [Enter to continue]" _

# ── Phase 4: hard kill-switch ───────────────────────────────────────────────
say "Phase 4 — arm AI_KILL_SWITCH=true"
say "  > Set AI_KILL_SWITCH=true and restart the app."
read -r -p "  [Enter to continue]" _

say "Phase 5 — verify the gateway blocks all calls"
# The health endpoint reports provider reachability; with the kill-switch the
# gateway throws AiBudgetExceededError before any provider call. Verify via the
# agent/job logs: every callModel entry should record the kill-switch error.
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health?check=ready")
if [[ "$code" == "200" || "$code" == "503" ]]; then
  ok "health endpoint responds while kill-switch armed (got $code — body is authoritative)"
else
  bad "health endpoint expected 200/503, got $code"
fi

say "  > Check LangFuse/logs: model-inference spans carry 'kill_switch'"
say "  > AiBudgetExceededError and NO provider calls were attempted."
read -r -p "  [Enter to continue]" _

# ── Phase 6: recovery ───────────────────────────────────────────────────────
say "Phase 6 — restore keys + kill-switch off"
restore_env
say "  > Restore real keys, unset AI_KILL_SWITCH, restart the app."
read -r -p "  [Enter to continue]" _

code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health?check=live")
if [[ "$code" == "200" ]]; then ok "liveness 200 after restore (got $code)"; else bad "liveness expected 200, got $code"; fi
say "  > Verify one chat/agent call succeeds (no error in LangFuse)."
read -r -p "  [Enter to continue]" _

echo
if [[ "$FAIL" -eq 0 ]]; then
  echo "DRILL PASSED — $PASS assertions, 0 failures"
  exit 0
else
  echo "DRILL FAILED — $PASS passed, $FAIL failed"
  exit 1
fi
