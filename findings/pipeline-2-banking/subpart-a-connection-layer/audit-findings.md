# Pipeline 2: Bank Connection → Transaction Import → Categorization

## Sub-Part A — Bank Connection & Link Layer — Deep Audit

**Scope:** Plaid Link flow (`/api/plaid/*`), Mono webhook (`/api/webhooks/mono`), connection lifecycle (integrations + banking routers), token security at rest, provider item lifecycle.

---

### 🔴 CRITICAL (2)

| #      | Finding                                                                   | Location                                                                                                 | Impact                                                                                                                                                                                                                                                                                                                                 |
| ------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1** | **Bank access tokens stored in PLAINTEXT**                                | `exchange-token/route.ts:139` (`accessToken, // TODO: encrypt in production`), same for Mono manual path | Live provider credentials in the DB. A DB leak or read-only access exposes full account access (read balances + transactions forever). The project already ships `packages/db/lib/field-encryption` with `bank_connections.access_token/refresh_token/account_number` configured — it is simply never called on the insert/read paths. |
| **C2** | **`getBankConnections` returns full rows incl. raw tokens to the client** | `integrations.ts` `getBankConnections`                                                                   | Returns `accessToken`, `refreshToken`, `accountNumber` to the browser over tRPC. The sibling `banking.ts listConnections` correctly masks — this one leaks.                                                                                                                                                                            |

### 🟠 HIGH (4)

| #   | Finding                                                                              | Location                                                                                                                  | Impact                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | **No Plaid webhook route exists** — only Mono                                        | `apps/web/app/api/webhooks/` (mono only)                                                                                  | Plaid `SYNC_UPDATES_AVAILABLE`, `ITEM_ERROR`, `TRANSACTIONS_REMOVED` webhooks never consumed. Reliance on a 6-hour cron means new transactions can be up to 6h stale, and item-level errors (credentials revoked) are never surfaced to `syncError`/status.                                                                              |
| H2  | **`deleteConnection` never revokes the provider item**                               | `banking.ts deleteConnection`, `integrations.ts disconnectBank`                                                           | Plaid `/item/remove` and Mono disconnect never called. Deleting the local row just orphans the live item — Plaid keeps billing for the item and the token remains valid server-side; Mono stays connected.                                                                                                                               |
| H3  | **Duplicate connection/account creation on re-link**                                 | `exchange-token/route.ts` real path                                                                                       | Each successful exchange inserts a **new** `bankConnections` row and a **new** `bankAccounts` row unconditionally. Reconnecting the same institution/account creates duplicates (double-counted balances, split transaction streams). No dedup on providerConnectionId or (entityId, institutionId, accountNumber).                      |
| H4  | **Router `syncTransactions` bypasses the job queue + stores a different cursor key** | `banking.ts syncTransactions` (writes `metadata.syncCursor`) vs `plaid-sync.ts` job (reads/writes `metadata.plaidCursor`) | Two independent sync implementations for the same provider. Manual "Sync" and the 6h cron read/write **different cursor keys**, so each switches the other back to a full re-sync (cursor lost) → duplicate API cost + re-insert attempts. Also runs synchronously in the request path (long-lived HTTP call, no concurrency/retry/DLQ). |

### 🟡 MEDIUM (4) + 🟢 LOW (2)

| #   | Finding                                                                                                  | Location                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| M1  | `syncTransactions` has no rate limit or per-account in-flight guard                                      | `banking.ts:631`                                                                                            |
| M2  | Mono webhook updates connections by `providerConnectionId` with no entity scoping on the update          | `mono/route.ts` (signature-authenticated, but cross-entity collision possible if provider IDs ever overlap) |
| M3  | `initiateBankConnection` accepts plaintext accountNumber, no encryption at rest                          | `integrations.ts`                                                                                           |
| M4  | Demo mode is reachable in production if env vars are absent — silently creates fake "active" connections | `create-link-token`, `exchange-token` fallback paths                                                        |
| L1  | Exchange-token comment says "triggers initial transaction sync" — no trigger exists                      | `exchange-token/route.ts` header                                                                            |
| L2  | `syncTransactions` casts `metadata` set to `as any`                                                      | `banking.ts:838`                                                                                            |

### ✅ What's Solid

- Entity access verified on both Plaid API routes (`resolveEntityAccess`)
- Mono webhook signature verification present
- Webhook dedup (at-least-once) via `claimWebhookEvent`
- `listConnections` masks account numbers and never returns tokens
- Status enum cleanly models pending/active/error/disconnected
- Cursor-based incremental sync design (in the job) is the right model

---

## Proposed Fix Plan — Sub-Part A

| #     | Fix                                                                                                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1    | Wire `packages/db/lib/field-encryption` `encryptRecord`/`decryptRecord` into all `bankConnections` insert/read paths (exchange-token, integrations, jobs, banking router)                                                                              |
| C2    | Mask `getBankConnections` output — never return tokens/raw account numbers to the client                                                                                                                                                               |
| H1    | Add `/api/webhooks/plaid` route (verify webhook signature from Plaid headers) handling `SYNC_UPDATES_AVAILABLE` (trigger sync job), `ITEM_ERROR` (set status=error + syncError), `PENDING_EXPIRATION`, `TRANSACTIONS_REMOVED`                          |
| H2    | Call Plaid `/item/remove` on `deleteConnection` (provider=plaid), Mono disconnect API on `disconnectBank`; fall back gracefully when provider API fails but still delete locally                                                                       |
| H3    | Dedup on `providerConnectionId` before insert in exchange-token; upsert bank account keyed on (entityId, institutionId, accountNumber)                                                                                                                 |
| H4    | Route manual "Sync" through the existing `plaid-sync-transactions` job (like Mono already does via `syncBankTransactions`) so cursor state + retries + DLQ are unified; drop the inline Plaid implementation in `banking.ts` (keep demo path separate) |
| M1    | Cooldown/rate-limit guard on sync trigger per connection                                                                                                                                                                                               |
| M2    | Entity-scope the Mono webhook update                                                                                                                                                                                                                   |
| M3    | Use field-encryption for manual connections too                                                                                                                                                                                                        |
| M4    | Require explicit demo flag (`NEXT_PUBLIC_DEMO_MODE`) for demo fallbacks, never silent env absence                                                                                                                                                      |
| L1/L2 | Fix comment, drop `as any`                                                                                                                                                                                                                             |

**Headline:** bank connections currently store live provider credentials in plaintext and hand them to the browser; re-linking duplicates accounts; and manual sync + cron use two divergent implementations that reset each other's cursors. None of this is production-grade.
