/**
 * Shared DATABASE_URL resolution for standalone db scripts.
 *
 * Every script in this folder that talks to the database must read the
 * connection string from the ENVIRONMENT — never hardcode a Neon URL.
 * Hardcoded URLs rot: the shell can carry a stale DATABASE_URL that shadows
 * `.env` files, and Neon passwords rotate, silently breaking the script.
 *
 * Usage:
 *   cd packages/db && set -a && source ../../.env.local && set +a \
 *     && npx tsx seed/setup-demo-admin.ts
 *
 * Or export DATABASE_URL yourself before running the script.
 */
export function requireDbUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL is required. Load the repo env first, e.g.:\n" +
        "  cd packages/db && set -a && source ../../.env.local && set +a\n" +
        "then re-run this script.",
    );
    process.exit(1);
  }
  return url;
}
