# Sub-Part F Audit Findings — Notifications & Status

**Employee #6** — Scope: `notifications.ts`, `status-tracker.ts`, Activity Hub wiring, attention signals, web notifications router

## 2 Critical, 5 High, 5 Medium, 2 Low — 14 findings

### 🔴 CRITICAL (2)

| #      | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Impact             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| **C1** | **`ingestion_failed` type doesn't exist** — `sendPostingFailureNotification` writes `type: "ingestion_failed"` but the `NotificationType` union (notifications.ts), the DB `notificationTypeEnum`, `NOTIFICATION_DESTINATIONS` (attention signals), and `ACTIVITY_META` (activity-hub) have no such type. TS error TS2322 confirmed. The failure notification falls through to `DEFAULT_DESTINATION` (tone `"new"`) — a **failed posting looks like fresh news, not something needing action**. Users never notice their document failed                           | Silent failures    |
| **C2** | **Ingestion review panel is unreachable** — Activity Hub opens the panel via `setReviewDocumentId(item.id)` guarded by `item.category === "ingestion"`, but **no item is ever pushed with that category** (only `agent_activity` / `notification`). Even if it fired, `item.id` is the _notification_ id, not the document id (the real documentId lives in the unparsed `data` JSON). `rejectIngestion` has the same wrong-id bug. Users see "needs review" in the hub but **cannot open or act on the review** — the human-in-the-loop flow is broken end-to-end | Broken review flow |

### 🟠 HIGH (5)

| #   | Finding                                                                                                                                                                                                                                                                                                            | Impact              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| H1  | **`isValidTransition` is dead code** — exported from status-tracker (and re-exported from index.ts:739) but **never called anywhere**. The module claims "Stage-validated: enforces valid state transitions (no jumping ahead)" — the validation simply doesn't run. A doc can jump `detected` → `done` or regress | Status integrity    |
| H2  | **Status update + audit insert are not atomic** — `withRetry` re-runs the whole block on failure. If the status UPDATE succeeds but the audit INSERT fails (or vice-versa), retry re-runs both → **duplicate audit entries** or status-without-audit. No transaction                                               | Corrupt audit trail |
| H3  | **`transitionToFailed` silently swallows write failures** — if marking a doc `failed` fails, only a `console.warn` fires; the doc stays stuck (e.g. in `posting`) and nobody is told. The failure path is the one place silent failure is unacceptable                                                             | Stuck docs, again   |
| H4  | **Type-unsafe status casts** — `.set({ status: stage } as any)` in status-tracker (2×) and posting-engine (`as any` on `agent_processing` update). No compiler protection on status values                                                                                                                         | Type safety         |
| H5  | **No notification dedup** — `createNotificationForEntity` inserts blindly. If a document is re-processed (retry, re-upload), a **second identical "needs review" notification** is created per run → notification spam + inflated badge counts                                                                     | Notification spam   |

### 🟡 MEDIUM (5)

| #   | Finding                                                                                                                                                                        | Impact       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| M1  | `userEntityAccess` query uses `with: { user: true }` — loads full user rows just to collect `userId`                                                                           | Perf         |
| M2  | `status: "sent"` written at insert while other senders (reminders) write `"pending"`; enum default is `"pending"` — inconsistent semantics                                     | Consistency  |
| M3  | Escalation reuses `ingestion_review` type — distinguishable only by priority/title/data.action, not by type                                                                    | Routing      |
| M4  | `auto_post` notification only fires when `confidence < 0.95` — high-confidence auto-posts are invisible. By design, but the threshold comment ("85-94%") doesn't match reality | Docs         |
| M5  | Notification `data` JSON is written but the web `list` router returns it raw; activity-hub never parses it (this is why C2's documentId is lost)                               | Deep-linking |

### 🟢 LOW (2)

| #   | Finding                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | `getStageNumber` returns -2 for unknown statuses while `isValidTransition` indexes `PIPELINE_STAGES[from]` directly — inconsistent unknown handling |
| L2  | Zero test coverage for `notifications.ts` and `status-tracker.ts` (the 15-type destination parity test exists, but no behavior tests)               |

### ✅ Already Solid

- Web unread badge uses real `COUNT(*)` (fixed earlier) ✓
- Notification failures never break the pipeline (documented non-blocking design) ✓
- Partial unread index on `(userId, createdAt) where read = false` ✓
- Attention-signals test guards type↔destination parity ✓
- Entity scoping on all notification queries ✓

---

## Proposed Fix Plan

### Phase 1 — Critical + High (7 fixes)

1. **C1:** Add `ingestion_failed` to `NotificationType` union + DB `notificationTypeEnum` + `NOTIFICATION_DESTINATIONS` (tone `action`, key `activity-hub`) + `ACTIVITY_META` + the attention-signals test list
2. **C2:** In Activity Hub, push ingestion review items with `category: "ingestion"` and the **real documentId** parsed from notification `data`; open the panel and call `rejectReview` with that id
3. **H1:** Wire `isValidTransition` into `updateIngestionStatus` — read the doc's current status, validate the transition, block invalid jumps
4. **H2:** Wrap status update + audit insert in a transaction; retry the transaction as a unit
5. **H3:** `transitionToFailed` surfaces write failure to the monitoring engine instead of `console.warn` alone
6. **H4:** Type the documents `status` column properly; drop `as any` casts
7. **H5:** Dedup — skip insert when an unread notification with same `(entityId, documentId, type)` already exists

### Phase 2 — Medium (5 fixes)

8. M1: select only `userId` from `userEntityAccess`
9. M5: parse notification `data` in the web list router so deep-links work
10. M3: distinct `ingestion_escalated` type for escalations
11. M4: align auto-post notification threshold comment with code
12. M2: standardize status write semantics

### Phase 3 — Tests

13. status-tracker suite: transition validation (valid jump, invalid jump, terminal states), retry/transaction behavior
14. notifications suite: type union coverage, dedup behavior, documentName extraction
