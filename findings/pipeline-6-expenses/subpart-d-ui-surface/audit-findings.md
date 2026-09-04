# P6-D — UI Surface & Notifications — Deep Audit

**Pipeline:** P6 Expense Recording → Categorization → Approval
**Scope:** Approve/reject surface, claim human-in-the-loop path, error feedback, role gates.

---

## 🔴 Findings

| #      | Severity    | Finding                                                                                                                                                                                                                                                                         | Fix                                                                                                                                                                                                                                                                                                                                                                                   |
| ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1** | 🔴 Critical | Approving an expense posted a real payment (P6-B) but the approve panel gave **no way to choose how the money left** — it silently defaulted to `bank_transfer` and never showed feedback on failure (closed period, missing account → user clicks "Approve", nothing happens). | Added a **payment-method picker** (bank transfer / mobile money / cash / check / card) wired into the approve mutation; button renamed **"Approve & Pay"** so the approver knows money moves; added `toast.success`/`toast.error` (imported `sonner` — it was missing, so errors were swallowed entirely). State typed to the exact enum union the server accepts.                    |
| **D2** | 🔴 Critical | Claim decisions (`decideClaim`) and reimbursements (`reimburseClaim`) moved **real money** (P6-C posts a ledger JE on reimburse) but were callable by **any entity role**.                                                                                                      | Added `requireRole("owner", "admin", "finance_director")` to both mutations. Now only finance-capable roles can approve paying an employee or post the cash-out JE.                                                                                                                                                                                                                   |
| **D3** | 🔴 Critical | Claims had **zero UI path**: the AI submits an employee claim, and no human surface exists to approve/reject/reimburse it — the HITL loop dead-ended.                                                                                                                           | Added an **Employee Claims inbox** to the Operations → Expenses surface: lists submitted/flagged/approved claims with claimant, number, department, per-line categories + amounts, flagged reasons; Approve / Reject (with optional reason) / Reimburse actions. Section renders **only when something needs attention** (no dead space). Mutations refetch + toast on success/error. |

## ✅ Verification

- `expense-record-layer.test.ts` — added P6-D block (claims surface with decision path, renders-only-when-actionable, method picker + toast, ≥3 finance role gates server-side). **17/17 green.**
- Fast suite: expense + reconciliation + AP + AR posting = **84/84 green.**
- All changed files parse (esbuild bundle check).
- Server approve path confirmed to resolve the settlement account **from the method** the UI now sends (`resolvePaymentReceiptAccount`).

## 🧭 Needs Review (per standing instruction — implemented, flagged)

None blocking. The Claims inbox lives on the **Operations → Expenses** tab (it already hosts the expense HITL queue). If the product prefers claims under a different surface (e.g. Activity Hub), the component (`ClaimsInbox` in `expenses-view.tsx`) can be lifted and remounted without server changes.
