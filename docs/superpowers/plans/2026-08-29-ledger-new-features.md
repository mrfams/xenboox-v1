# Ledger New — Feature Migration Plan

> **Goal:** Bring high-value features from the old Ledger (1336 lines) to the AI-native /ledger/new page, adapted to the keyboard-triage, provenance-first paradigm.

**Current state:** Old page has 5 tabbed views (Journal, COA, Trial Balance, Fixed Assets, Reconciliation) + Detail Drawer. New page has only search + register (319 lines).

---

## What to Bring

### Priority 1: Journal Entry Detail Drawer

**Value:** HIGH — users need to see full entry details without leaving the page
**Adaptation:** Keep the slide-over drawer but add:

- AI narrative explaining the entry ("This entry records Q3 rent payment to...")
- Provenance badges on each line (who posted, confidence)
- "Ask AI" button for questions about the entry
- Keyboard: `Enter` on focused row opens drawer, `Esc` closes

### Priority 2: Trial Balance View

**Value:** HIGH — fundamental accounting verification
**Adaptation:** Instead of a raw table:

- Balance check as a prominent status card (balanced ✓ / out of balance ✗)
- AI narrative: "Your trial balance is balanced. Total debits match credits at $X."
- Simplified table with hover-to-ask-AI on each account
- Keyboard: `t` key to quick-switch to Trial Balance view

### Priority 3: COA (Chart of Accounts) View

**Value:** MEDIUM — needed for reference, not daily use
**Adaptation:** Keep as a searchable list with:

- Account type grouping (collapsible sections)
- AI narrative: "You have 42 accounts across 5 types. Assets dominate at 60%."
- "Ask AI" to explain any account balance
- Keyboard: `c` key to quick-switch to COA view

### Skip: Fixed Assets + Reconciliation Views

**Reason:** These are specialized workflows better handled by AI agents. The old views are thin wrappers around Suspense boundaries. Not worth bringing to the new page.

---

## Implementation

### File: `apps/web/app/dashboard/ledger/new/page.tsx`

**Add to existing file:**

1. **Tab state** with URL sync (`?tab=register|trial-balance|coa`)
2. **Tab bar** component (keyboard-navigable, same pattern as operations)
3. **TrialBalanceView** — extracted component using `trpc.journal.getTrialBalance`
4. **COAView** — extracted component using `trpc.coa.listHierarchy`
5. **JournalEntryDrawer** — slide-over panel using `trpc.journal.getById`

### Build Order

1. Add tab infrastructure (state, tab bar, URL sync)
2. Add Trial Balance view
3. Add COA view
4. Add Journal Entry Detail Drawer
5. Add keyboard shortcuts (`t`, `c`, `Enter`, `Esc`)

### Data Sources (all exist already)

| Source          | Query                                       |
| --------------- | ------------------------------------------- |
| Journal entries | `journal.listWithDetails` ✅ (already used) |
| Entry detail    | `journal.getById`                           |
| Trial balance   | `journal.getTrialBalance`                   |
| COA             | `coa.listHierarchy`                         |
| Tab counts      | `journal.getTabCounts`                      |
| Reverse entry   | `journal.reverse`                           |

### Keyboard Map

| Key     | Action                              |
| ------- | ----------------------------------- |
| `1`     | Register view                       |
| `2`     | Trial Balance view                  |
| `3`     | COA view                            |
| `Enter` | Open detail drawer on focused entry |
| `Esc`   | Close drawer / exit current view    |
| `j/k`   | Move through entries                |
| `/`     | Focus search                        |
