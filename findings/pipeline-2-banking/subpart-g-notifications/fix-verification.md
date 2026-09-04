# Sub-Part G — Notifications & Status — Fix Verification

## Findings → Fixes

| #      | Finding                                                                                                                                     | Fix                                                                                                                                                                                                                                | Files                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **G1** | Bank sync/import failures never notify entity users (only the platform-admin DLQ + 10px card text)                                          | Shared entity-notify core created; **mono-sync, plaid-sync, bank-import** now send `bank_sync_failed` / `bank_import_failed` notifications to every entity user on failure (deduped per connection/document so retries never spam) | `packages/db/lib/notify-entity.ts`, `packages/jobs/mono-sync.ts`, `packages/jobs/plaid-sync.ts`, `packages/jobs/bank-import.ts` |
| **G2** | `notifications.create` fallback referenced `notifications.entityId` inside a `userEntityAccess` query → SQL error on every broadcast create | Fixed to query `userEntityAccess.entityId` + added missing entityId/userId guard                                                                                                                                                   | `apps/web/server/routers/notifications.ts`                                                                                      |
| **G3** | No Plaid `ITEM_LOGIN_REQUIRED` handling                                                                                                     | Sync now parses the Plaid error body; reauth-required is detected, stored as a distinct "Reconnect required" syncError, and the notification title/body/CTA say reconnect                                                          | `packages/jobs/plaid-sync.ts`                                                                                                   |
| **G4** | No recovery signal; stale failure alerts double-signal after heal                                                                           | On a successful sync of an errored connection: stale unread `bank_sync_failed` rows are marked read, then a `bank_sync_recovered` notification is sent                                                                             | `mono-sync.ts` / `plaid-sync.ts`                                                                                                |
| **G5** | Notification taxonomy had no banking types / no attention routing                                                                           | Added `bank_sync_failed`, `bank_sync_recovered`, `bank_import_failed` to `notificationTypeEnum` + matching `NOTIFICATION_DESTINATIONS` (Operations: action/new)                                                                    | `packages/db/schema/notifications.ts`, `apps/web/lib/hooks/use-attention-signals.ts`                                            |
| **M1** | Error card easy to miss; no in-place retry                                                                                                  | SyncError rendered as an error panel with remediation guidance; Sync button now enabled on `error` (labeled "Retry sync")                                                                                                          | `apps/web/components/banking/bank-connection-card.tsx`                                                                          |

## Architecture change

- **Extracted the drizzle client to its own module** (`packages/db/client.ts`) and typed it
  with the full schema (instantiation expression on the generic `drizzle` factory).
  Previously the `ReturnType<typeof drizzle>` annotation resolved the default empty
  schema, so `db.query.<table>` typed as `{}` for every consumer — a latent defect
  that also produced the pre-existing `field-encryption/service.ts` errors (now gone).
- **One shared entity-notify core** (`notifyEntityUsers` / `clearEntityFailureNotifications`)
  — `db` injected (no import cycles, unit-testable), dedupe fields **allowlisted** and
  rendered as literal SQL (`documentId`, `connectionId`) — never raw-interpolated.
  Ingestion's private copy now delegates to the shared core (single source of truth).

## Verification

| Suite                           | Before | After                                                                                                                                                     |
| ------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| db unit tests                   | 43     | **52** (+9 notify-entity)                                                                                                                                 |
| jobs unit tests                 | 25     | 25                                                                                                                                                        |
| ingestion unit tests            | 167    | 167 (refactor-safe)                                                                                                                                       |
| web banking + attention suites  | —      | 71 passed; 1 failure = `command-bar-attention` placeholder test, **pre-existing at HEAD** (other session's P0-5 placeholder sweep vs its own static test) |
| db package typecheck (my files) | —      | 0 errors (package total dropped **139 → 73**, fixing pre-existing `{}`-typed query errors in field-encryption)                                            |
| jobs typecheck (my files)       | —      | 0 errors                                                                                                                                                  |
| web typecheck (my files)        | —      | 0 errors                                                                                                                                                  |
