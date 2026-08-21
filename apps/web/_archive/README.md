# Archived: Old SaaS Dashboard Pages

> These pages were archived on August 21, 2026 as part of the AI-native platform pivot.

---

## Why These Pages Were Archived

Xenboox is not a traditional SaaS accounting tool. It is an **AI-native accounting platform** where 19 AI agents handle the work and humans make decisions. The old pages followed the conventional SaaS pattern: every function gets its own page, and the user navigates to the right page to do the right thing.

That model is dead here.

### The Old Model (Archived)

```
User thinks: "I need to create an invoice"
User does:   Navigates to Invoicing page -> clicks "New Invoice" -> fills form -> submits
```

This is how QuickBooks, Wave, and Xero work. Every accounting function is a separate page. The user has to know where things are. The user does the work.

### The New Model (Active)

```
User thinks: "I need to create an invoice"
User does:   Types "Create an invoice for GTBank for 50,000 GMD" in Command Center
AI does:     Parses intent -> calls invoicing router -> creates draft -> shows preview -> asks for confirmation
User does:   Clicks "Confirm" or says "Change the amount to 60,000"
```

This is how Xenboox works. The AI is the interface. The user talks. The AI acts. The 5 dashboard surfaces are the human's view into what the AI is doing — not a menu of pages to visit.

---

## The 5 Active Surfaces

| Surface             | Purpose                      | What the AI does                                    |
| ------------------- | ---------------------------- | --------------------------------------------------- |
| **Command Center**  | Conversational AI interface  | Handles ALL create/update/approve actions via chat  |
| **Activity Hub**    | Human-in-the-loop queue      | Surfaces ALL things needing human decision          |
| **Financial Pulse** | AI-narrated financial health | Explains what the numbers mean, not just shows them |
| **Ledger**          | The record of truth          | When you need to look at the books directly         |
| **Operations**      | Money in, money out          | AI manages cash flow, you approve                   |

### What Changed

The AI layer absorbs the navigation problem:

- **Invoicing** -> AI creates invoices from the Command Center
- **Customers** -> AI manages customer data from any surface
- **Bills & Expenses** -> AI processes bills, surfaces approvals in Activity Hub
- **Banking** -> AI handles reconciliation, shows results in Operations
- **Payroll** -> AI runs payroll, surfaces confirmations in Activity Hub
- **Reports** -> AI generates narratives in Financial Pulse
- **Chart of Accounts** -> AI manages COA, you review in Ledger
- **Journal** -> AI posts entries, you see them in Ledger
- **Tax Compliance** -> AI tracks deadlines, surfaces in Activity Hub

---

## What's In This Archive

### Old SaaS Pages (33 directories)

Pages that followed the traditional SaaS pattern. Each was a standalone route with its own UI, typically using hardcoded light-theme colors (`bg-white`, `bg-slate-*`) inconsistent with the dark AI-native theme.

### Old Dashboard Components (shared/dialog files)

The `create-*-dialog.tsx` files in `components/dashboard/` that were used by the old pages. In the AI-native model, creation forms appear inline in the Command Center chat when the AI needs user input.

---

## What Was NOT Archived

| Path                             | Why It Stays                              |
| -------------------------------- | ----------------------------------------- |
| `app/dashboard/page.tsx`         | Command Center — the primary AI interface |
| `app/dashboard/activity-hub/`    | Activity Hub — human-in-the-loop queue    |
| `app/dashboard/financial-pulse/` | Financial Pulse — AI-narrated health      |
| `app/dashboard/ledger/`          | Ledger — the record of truth              |
| `app/dashboard/operations/`      | Operations — money flow                   |
| `app/dashboard/audit-trail/`     | Audit Trail — compliance requirement      |
| `app/dashboard/settings/`        | Settings — user configuration             |
| `app/dashboard/help/`            | Help — user support                       |
| `server/routers/*.ts`            | All tRPC routers — the AI calls these     |
| `packages/db/schema/*.ts`        | All database tables — the data layer      |
| `packages/agents/**`             | All AI agents — the workforce             |

---

## The Architectural Decision

**Decision:** AI-native interface over SaaS page-per-function.
**Date:** August 2026
**Rationale:**

1. The product promise is "Your entire accounting department, running autonomously." That means the AI does the work, not the user navigating pages.
2. 19 AI agents handle every accounting function. The human's job is to decide, not to navigate.
3. The5 surfaces provide complete visibility without requiring the user to know where things are.
4. Mobile-first design favors conversational interfaces over deep navigation hierarchies.
5. The Gambia launch market has users who may not be accounting-literate. AI mediation removes the need to understand accounting software navigation.

**Tradeoffs:**

- Power users lose the ability to quickly jump to a specific function (mitigated by AI speed + keyboard shortcuts)
- Some operations are harder to do in bulk via chat (mitigated by Activity Hub batch actions)
- Deep-dive analysis requires AI to surface the right data (mitigated by Financial Pulse + Ledger)

---

## How to Restore

If you ever need to bring back an old page:

1. Move the directory from `_archive/dashboard/` back to `app/dashboard/`
2. Update the sidebar in `components/layout/sidebar.tsx` to add the route
3. Verify the tRPC router is still wired
4. Migrate the page from hardcoded `slate-*` colors to CSS variable design tokens
5. Add loading skeleton, error boundary, empty state
6. Wire all actions to real tRPC mutations

---

_This archive preserves the old code for reference. The active codebase is the 5-surface AI-native dashboard._
