# Sentry Source Maps

> Last updated: Aug 16, 2026 · Reference: ROADTOPRODUCTION.md §2.1

## How upload works

The `@sentry/nextjs` webpack plugin (`withSentryConfig` in `apps/web/next.config.ts`)
uploads source maps **automatically at build time**. The app deploys via
Vercel (git push → Vercel build), so the upload happens on every production
deploy — no separate CI step is needed.

`next.config.ts` wiring:

```ts
withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: { create: true, name: process.env.VERCEL_GIT_COMMIT_SHA || process.env.SENTRY_RELEASE },
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  tunnelRoute: "/api/sentry",
  ...
});
```

- **Release name = commit SHA** (`VERCEL_GIT_COMMIT_SHA`) so stack traces
  map exactly to the deployed code.
- **`deleteSourcemapsAfterUpload: true`** strips the maps from the shipped
  bundle — they never reach the browser.
- **`hideSourceMaps` is not set** — the maps are uploaded, not hidden, which
  is what enables symbolication.

## Required env vars (set on Vercel)

| Var                 | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `SENTRY_ORG`        | Sentry org slug (also used by the plugin)                  |
| `SENTRY_PROJECT`    | Sentry project slug                                        |
| `SENTRY_AUTH_TOKEN` | API token with `project:releases` + `project:write` scopes |

Without `SENTRY_AUTH_TOKEN` the plugin skips upload (build still succeeds) —
symptom: source maps never appear in Sentry.

## Verifying

1. Deploy, then check Sentry → Project Settings → Source Maps for the
   release matching the latest `VERCEL_GIT_COMMIT_SHA`.
2. Trigger a client error, open the event, confirm the stack is
   symbolicated (not minified one-liners).
3. Local check: `npx @sentry/cli releases files <release> list` with the
   auth token to see uploaded files.

## Manual fallback (non-Vercel deploys)

```bash
# after a local build
npx @sentry/cli sourcemaps inject .next/static
npx @sentry/cli sourcemaps upload --org <org> --project <project> --release <sha> .next/static
```

## Test

`apps/web/__tests__/sentry-sourcemaps.test.ts` pins the config contract
(authToken wiring, release = commit SHA, deleteSourcemapsAfterUpload) so a
refactor that disables upload fails CI.
