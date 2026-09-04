# Pipeline 2: Bank Connection → Transaction Import → Categorization

## Sub-Part G — Notifications & Status — Deep Audit

**Scope:** how the banking pipeline (connection, sync, statement import) surfaces
status to humans — bell notifications, Activity Hub, attention signals, connection
error states, reauth, recovery. Cross-checked against the P1 ingestion pipeline's
notification service, which is the canonical pattern.

---

### 🔴 CRITICAL (3)

| #      | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Location                                                                      | Impact                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **G1** | **Bank sync/import failures never reach entity users.** Provider sync tasks set `bankConnections.status = "error"` + `syncError` and throw; retries exhaust → `dlqOnFailure` writes a `review_items` row. But `review_items` is surfaced only through `review-queue` router = `adminProtectedProcedure` (platform-admin session) — **the SME entity owner never sees it**, and no `notifications` row is ever created. A user's bank link can silently die for weeks; the only trace is 10px red text on the connection card. Contrast: P1 ingestion built `sendIngestionNotifications` → entity users get bell + Activity Hub + sidebar attention signals. P2 has **nothing**. | `packages/jobs/mono-sync.ts`, `plaid-sync.ts`, `bank-import.ts`, `lib/dlq.ts` | Connection dies silently; imports fail silently for the people who own the books |
| **G2** | **`notifications.create` fallback is a broken query.** When `userId` is omitted, the admin create falls back to `db.query.userEntityAccess.findFirst({ where: eq(notifications.entityId, ...) })` — a `notifications`-table column referenced inside a `user_entity_access` query. The SQL has no FROM clause entry for `notifications` → throws → `handleMutationError` every time an admin creates a notification without an explicit user.                                                                                                                                                                                                                                   | `apps/web/server/routers/notifications.ts` (create)                           | Admin broadcast notifications broken                                             |
| **G3** | **No Plaid `ITEM_LOGIN_REQUIRED` handling / no reauth concept.** Plaid links expire (90-day reauth in production). The sync treats the 400 as a generic error; there is no distinct "reconnect required" state, no CTA, no guidance. The user is stranded with an expired link and can only notice via a red border on a card.                                                                                                                                                                                                                                                                                                                                                  | `packages/jobs/plaid-sync.ts`                                                 | Expired bank links never recover because the user is never told to reconnect     |

### 🟠 HIGH (2)

| #      | Finding                                                                                                                                                                                                                                                                                                              | Location                                                          | Impact                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| **G4** | **No recovery signal.** When a connection heals (next sync succeeds after `status: "error"`), the status silently flips back to `active` — no notification, and any prior unread failure alert lingers and double-signals against the fresh healthy state.                                                           | `mono-sync.ts` / `plaid-sync.ts` step 5                           | Stale failure alerts contradict healthy state   |
| **G5** | **Notification type taxonomy has no banking entries.** `notificationTypeEnum` covers close/budget/ingestion/recon/payroll — zero banking types. Adding types requires the matching `NOTIFICATION_DESTINATIONS` entry (guarded by `attention-signals.test.ts`) so failures light up Operations with an "action" tone. | `packages/db/schema/notifications.ts`, `use-attention-signals.ts` | Can't route banking alerts to the right surface |

### 🟡 MEDIUM (1)

| #      | Finding                                                                                                                                                                                                        | Location                                               | Impact                          |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------- |
| **M1** | **Error card is easy to miss.** `syncError` renders at 10px red text with no remediation affordance; the Sync (retry) button is disabled on error, so the user cannot even retry a transient failure in place. | `apps/web/components/banking/bank-connection-card.tsx` | Retry friction, poor failure UX |

---

### Architecture notes

- The canonical entity-notify pattern (P1): resolve all `userEntityAccess` rows for
  the entity → batch-insert `notifications` (per-user rows) → dedupe on
  `data->>'<dedupeKey>'` + type + unread so retries never spam → never throw.
  It lives privately in `packages/ingestion/engine/notifications.ts`. P2 needs the
  same core but lives in `packages/jobs` — extract the core to a shared
  `packages/db/lib/notify-entity.ts` (single source, DI of `db` to avoid import
  cycles) and make ingestion delegate to it.
- Platform-admin DLQ (`review_items`) stays as the ops backstop, but it is not the
  entity-user channel; the two are complementary, never substitutes.
