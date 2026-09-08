#!/usr/bin/env bash
# Removes junk/corrupt env vars added by the first sync, then re-adds the
# quoted-value keys with properly sanitized values (quotes stripped).
set -u

# 1) Remove junk keys Vercel injects itself + anything empty/corrupt
JUNK_KEYS=$(vercel env ls production 2>/dev/null | grep -oE "^ (VERCEL_[A-Z_]+|NX_[A-Z_]+|TURBO_[A-Z_]+|NODE_ENV|ANTHROPIC_API_KEY) " | tr -d ' ' | sort -u)
for k in $JUNK_KEYS; do
  for e in production preview; do
    vercel env rm "$k" "$e" --yes > /dev/null 2>&1 && echo "REMOVED $k ($e)"
  done
done

# 2) Re-add quoted-value app keys with sanitized values
sanitize() { printf '%s' "$1" | sed -e "s/^['\"]//" -e "s/['\"]$//"; }

for key in AUTH_GOOGLE_ID AUTH_GOOGLE_SECRET FIELD_ENCRYPTION_KEY; do
  for e in production preview; do
    vercel env rm "$key" "$e" --yes > /dev/null 2>&1
  done
  raw=$(grep -m1 "^${key}=" .env.local 2>/dev/null) || raw=$(grep -m1 "^${key}=" .env 2>/dev/null) || { echo "SKIP $key"; continue; }
  val=$(sanitize "${raw#*=}")
  echo "re-adding $key (len=${#val})"
  for e in production preview; do
    printf '%s' "$val" | vercel env add "$key" "$e" > /dev/null 2>&1 && echo "  ADDED $key -> $e" || echo "  FAILED $key -> $e"
  done
done
