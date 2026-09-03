# Sub-Part A — Fix Verification (Executed & Committed)

## 🔴 Critical Fixes

| #   | Fix                                                                                                                                                                                                                                               | Files                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Bank tokens encrypted at rest (AES-256-GCM, `xenc:v1:` prefix, backward-compatible with legacy plaintext rows). Fails loud in production without `FIELD_ENCRYPTION_KEY`. Key generated + added to env files + documented in both `.env.example`s. | NEW `packages/db/lib/bank-token-encryption.ts`, exported from `packages/db/index.ts` · `exchange-token/route.ts` (encrypt on write) · `plaid-sync.ts` + `mono-sync.ts` jobs (decrypt on read) |
| C2  | `getBankConnections` no longer leaks tokens/raw account numbers — strict masked projection matching `banking.listConnections`                                                                                                                     | `integrations.ts`                                                                                                                                                                             |

## 🟠 High Fixes

| #   | Fix                                                                                                                                                                                                                                                                                                             | Files                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| H1  | **NEW Plaid webhook route** (`/api/webhooks/plaid`): JWT-verified (`Plaid-Verification` ES256 + body sha256 + 5-min iat), deduped, handles SYNC_UPDATES_AVAILABLE/TRANSACTIONS_REMOVED/HISTORICAL/INITIAL/DEFAULT_UPDATE (trigger sync job), ITEM_ERROR/PENDING_EXPIRATION (status=error)                       | NEW `app/api/webhooks/plaid/route.ts` + `lib/plaid-webhook-verify.ts` |
| H2  | `deleteConnection` + `disconnectBank` now revoke the Plaid item server-side (`/item/remove`) before deleting locally; revoke errors surface, never block the local delete                                                                                                                                       | `banking.ts`, `integrations.ts`, NEW `lib/plaid-api.ts`               |
| H3  | Exchange-token dedups on `providerConnectionId` (re-link updates the existing row + refreshes token instead of duplicating); bank account upserted on (entityId, bankName, accountNumber)                                                                                                                       | `exchange-token/route.ts`                                             |
| H4  | Router `syncTransactions` no longer re-implements Plaid inline (different cursor key + uninstalled SDK). Real plaid/mono → dispatches to the shared job (one cursor `plaidCursor`, retries, DLQ). Demo generation kept for manual/demo connections, error for token-less mono/stitch. 30s cooldown guard added. | `banking.ts`                                                          |

## 🔴 New Critical Found During Fix (also fixed)

| #   | Finding                                                                                                                                                                                                                                                                                                                                   | Fix                                                                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C3  | **The entire real Plaid path was broken at every layer**: `plaid` SDK not installed (3 routes → MODULE_NOT_FOUND), `react-plaid-link` not installed (dialog), routes imported `auth` from `@/lib/auth/edge` which exports `edgeAuth` (→ 500), dialog sent a literal `"real-token-placeholder"` public token and called tRPC via raw fetch | Routes rewritten to repo conventions: `auth` from `@/lib/auth` + plain REST fetch (matching jobs). Dialog now loads Plaid's hosted Link, exchanges the real public_token, dispatches sync via the tRPC client. Demo mode gated behind `NEXT_PUBLIC_DEMO_MODE=true` (never silent in prod). |

## 🟡 Medium Fixes

- M1: 30s per-connection sync cooldown (job idempotency key adds a second layer)
- M2: Mono webhook resolves row first, then updates scoped to id + entityId (never bare providerConnectionId update)
- M3: covered by C1 (tokens encrypted; account numbers masked to client)
- M4: demo mode now requires `NEXT_PUBLIC_DEMO_MODE=true`; missing Plaid config returns 503 in prod
- L1/L2: comment fixed, `as any` gone (inline sync removed)

## Verification

- ✅ Typecheck: all changed web/jobs/db files clean (remaining repo errors pre-existing)
- ✅ Tests: **+9 new** (bank-token-encryption); 22 web + 5 jobs + 167 ingestion all passing
