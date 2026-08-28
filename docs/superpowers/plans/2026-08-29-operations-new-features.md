# Operations New — Feature Migration Plan

> **Goal:** Evaluate what (if anything) from the old Operations page should be brought to the AI-native /operations/new page.

**Current state:** Old page (207 lines) is a tab shell that renders 6 view components (2733 lines total). New page (321 lines) has a flow stream with money-in/money-out narrative.

---

## Assessment: The New Page is Already Better

The old Operations page is a **traditional SaaS dashboard** — 6 tabs, each rendering a full data table with CRUD operations. The new page is **AI-native** — a flow stream that narrates money movement.

**Key insight:** The old page's tabs (Overview, Invoices, Bills, Customers, Vendors, Banking) are navigation surfaces. In the AI-native model, the AI absorbs navigation. Users talk to the AI, not click through tabs.

### What the Old Page Has That's Worth Keeping

| Feature       | Old Page               | New Page                 | Verdict              |
| ------------- | ---------------------- | ------------------------ | -------------------- |
| Overview tab  | Summary cards + charts | Flow stream + narratives | **New is better**    |
| Invoices tab  | Full CRUD table        | AI handles via chat      | **Skip** — AI-native |
| Bills tab     | Full CRUD table        | AI handles via chat      | **Skip** — AI-native |
| Customers tab | Customer list + CRUD   | AI handles via chat      | **Skip** — AI-native |
| Vendors tab   | Vendor list + CRUD     | AI handles via chat      | **Skip** — AI-native |
| Banking tab   | Bank connections       | AI handles via chat      | **Skip** — AI-native |

### What Could Enhance the New Page

1. **Quick Stats Strip** — a thin bar showing: `5 invoices pending · $12K outstanding · 3 bills due`

   - Not a full tab, just a status line
   - AI narrates what the numbers mean

2. **Recent Activity Feed** — last 5 operations (invoice created, bill paid, etc.)
   - Already partially covered by the flow stream
   - Could add provenance dots to each flow item

---

## Recommendation: Minimal Changes

The new page is already AI-native. Adding tabs would be a regression. Instead:

### Optional Enhancement: Status Strip

Add a thin status strip above the flow stream showing key counts:

```
📄 5 invoices pending · 💰 $12K outstanding · 📋 3 bills due · 🏦 Connected
```

This gives at-a-glance awareness without requiring navigation.

### Implementation

**File:** `apps/web/app/dashboard/operations/new/page.tsx`

1. Add `trpc.invoices.list.useQuery` for pending count
2. Add `trpc.bills.list.useQuery` for bills due count
3. Render a compact status strip above the flow stream
4. Each stat is clickable → opens command bar with relevant prompt

**No tab infrastructure needed.** The AI-native model doesn't need tabs.

---

## What NOT to Do

- ❌ Don't add tab navigation (regression to SaaS pattern)
- ❌ Don't import the old view components (InvoicesView, BillsView, etc.)
- ❌ Don't add CRUD tables (AI handles mutations via chat)
- ❌ Don't add sidebar navigation (AI absorbs navigation)

The new page is already the right direction. Enhance it, don't regress it.
