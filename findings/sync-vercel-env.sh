#!/usr/bin/env bash
# Syncs app secrets from local dotenv files to Vercel (production + preview).
# Values are piped via stdin and never echoed. Only adds keys that are missing.
set -u

# Keys managed by Vercel itself or irrelevant to the app runtime
SKIP='^(VERCEL_|TURBO_|NX_|NODE_ENV)$'

# Precedence like dotenv: .env.local overrides .env
get_value() {
  local key="$1" line
  line=$(grep -m1 "^${key}=" .env.local 2>/dev/null) || line=$(grep -m1 "^${key}=" .env 2>/dev/null) || return 1
  printf '%s' "${line#*=}"
}

# Keys already present in Vercel production
vercel env ls production > /tmp/vercel-env.txt 2>/dev/null

MISSING=()
while IFS= read -r line; do
  case "$line" in
    \#*|"") continue ;;
  esac
  key="${line%%=*}"
  [[ "$key" =~ $SKIP ]] && continue
  if ! grep -qE "^ ${key} " /tmp/vercel-env.txt; then
    MISSING+=("$key")
  fi
done < <(grep -hoE "^[A-Z_][A-Z0-9_]+=" .env .env.local 2>/dev/null | sort -u)

echo "Missing in Vercel: ${#MISSING[@]} keys"
printf '  %s\n' "${MISSING[@]}"

for key in "${MISSING[@]}"; do
  val=$(get_value "$key") || { echo "SKIP $key (no local value)"; continue; }
  for env in production preview; do
    printf '%s' "$val" | vercel env add "$key" $env > /dev/null 2>&1 \
      && echo "ADDED $key -> $env" || echo "FAILED $key -> $env"
  done
done
