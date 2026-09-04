# Pipeline 8 — Sub-Part C: UI Surface + Notifications

**Scope:** the month-end close surface (Operations Compliance & Close widget),
plus close-outcome notifications.

---

## 🔴 Findings & Fixes

### C1 — The close had NO human action affordance (and no usable period id)

The Operations "Compliance & Close" widget was status-only: it showed a
progress bar and an Ask-AI handoff, but a human could not start the close from
anywhere in the UI — `initiateClose` was only reachable through chat/agent
wiring that didn't exist, and `close-center`'s checklist procedures had zero UI
consumers. Worse, `getCloseStatus` returned a human label
(`"2026-08"`) but no period **id**, so even a wired button couldn't target the
right period.

**Fix:**

- `getCloseStatus` now returns `currentPeriodId` (additive).
- The Compliance & Close widget gains an explicit **Start Month-End Close**
  flow: confirm step with plain-language consequences, calls
  `fiscal.initiateClose` (manual), shows a spinner, surfaces server errors
  inline, and invalidates the close status on success. Hidden when the period
  is already closed.

### C2 — Close outcomes were never surfaced to the entity's users

Both close paths (the agent pipeline behind `initiateClose` and the async
month-end job) completed silently — an owner had to poll to learn the books
closed, or worse, never learned a close was blocked.

**Fix:** both paths now call `notifyEntityUsers` with a `month_end_close`
notification, deduped per `periodId` (a retried run can never double-notify):

- `initiateClose`: "Month-end close finished" (or "...needs review" with the
  stopping status + error count when the pipeline blocked).
- `month-end-close` job: "Books closed for YYYY-MM" on success.

---

## ✅ Verification

- `fiscal-close-record-layer.test.ts` now 12 assertions (P8-A → P8-C).
- Jobs suite 25 green; all changed files parse clean.
