# Add Original Features to /new Pages (AI-Native)

> **For agentic workers:** Use superpowers:executing-plans to implement this plan. Steps use checkbox syntax.

**Goal:** Port missing features from original dashboard surfaces into the `/new` AI-native pages, redesigned with AI-native patterns.

**Architecture:** Each surface is an independent task. Features are ported as AI-native components (narratives, provenance, streaming) — not copied as legacy SaaS UI.

**Tech Stack:** Next.js 15, React, tRPC, Shadcn/ui, Tailwind, Lucide icons

**Spec:** User request: add all original features to /new pages, make them AI-native

---

## Global Constraints

- All code in `apps/web/app/dashboard/` (web app only)
- Use `ai-native-v2/` component patterns (ProvenanceBadge, MetricNarrative, CommandBar)
- No `ModulePageShell` — custom layouts
- Entity scoping on all tRPC queries
- No admin metrics (model, cost, tokens) in user-facing UI
- Conventional commits: `feat:`, `fix:`, `chore:`

---

## Surface 1: Dashboard — Briefing + Checklist + Sidebar

### Task 1.1: Add ProactiveBriefing to Mission Control

**Files:**

- Modify: `apps/web/app/dashboard/new/page.tsx`

**What to add:** When the conversation is idle (no active chat), show an AI-generated briefing card above the MissionsBoard. This replaces the old `ProactiveBriefing` component but uses the same tRPC data.

**Implementation:**

- Add `trpc.dashboard.getAiBriefing.useQuery()` and `trpc.dashboard.getDashboardData.useQuery()` calls
- Render a briefing section between the context strip and MissionsBoard when idle
- Show AI text if available, fallback to structured cards (cash position, pending approvals, deadlines)
- Use `ProvenanceBadge` pattern for AI-generated content attribution
- Loading state: skeleton with pulse animation
- Empty state: green "All clear" card

### Task 1.2: Add GettingStartedChecklist to Mission Control

**Files:**

- Modify: `apps/web/app/dashboard/new/page.tsx`

**What to add:** For first-time users, show a dismissable onboarding checklist below the briefing. Uses localStorage for state.

**Implementation:**

- Add localStorage keys: `xenboox_getting_started_dismissed`, `xenboox_getting_started_completed`
- Render 5 onboarding steps as compact pills (not full cards)
- Steps: "Ask a question" (sends message), "Connect bank" (links to operations/banking), "Review accounts" (sends message), "Create invoice" (sends message), "Close month" (sends message)
- Progress indicator: "2/5 complete"
- Dismiss button with confirmation
- Style: subtle border, not dominant — briefing and missions are primary

### Task 1.3: Add ConversationSidebar to Mission Control

**Files:**

- Modify: `apps/web/app/dashboard/new/page.tsx`

**What to add:** A slide-out sidebar for conversation history, triggered from the top bar or keyboard shortcut.

**Implementation:**

- Import `ConversationSidebar` from `components/chat/conversation-sidebar.tsx`
- Add toggle state, wire to existing `useDashboardChat` hook's `conversationId` and `onSelectConversation`
- Add a "History" button in the top bar (when chatting) that opens the sidebar
- Keyboard shortcut: `Ctrl+H` to toggle sidebar
- Pass `currentQuery` for `ConversationMemory` widget

### Task 1.4: Add RoleBasedWelcome to Mission Control

**Files:**

- Modify: `apps/web/app/dashboard/new/page.tsx`

**What to add:** Personalized greeting based on user role, shown when idle above the briefing.

**Implementation:**

- Import role config from `lib/role-config.ts`
- Use `useEntity()` for `entityRole`, `useSession()` for name
- Render role-specific headline + description as a compact welcome strip
- Quick-action pills from role config (not full cards — compact row)
- Style: text-based, not card-based — fits the AI-native aesthetic

---

## Surface 2: Activity Hub — Batch Actions + Completed

### Task 2.1: Add Batch Approve/Reject

**Files:**

- Modify: `apps/web/app/dashboard/activity-hub/new/page.tsx`

**What to add:** Multi-select with batch approve/reject actions for decision items.

**Implementation:**

- Add checkbox state to each decision item
- Track selected IDs in state
- Show a floating action bar when items are selected: "Approve N" / "Reject N" buttons
- Keyboard: `Shift+A` to select all visible, `a` to approve selected, `r` to reject selected
- Use `trpc.ingestion.batchApprove` and `trpc.ingestion.batchReject` mutations (or iterate existing single mutations)
- Show optimistic UI: items flash green/red then disappear
- Toast notification with undo option

### Task 2.2: Add Completed Section

**Files:**

- Modify: `apps/web/app/dashboard/activity-hub/new/page.tsx`

**What to add:** Collapsible section at the bottom showing recently completed items.

**Implementation:**

- Query: fetch items with `status: "completed"` from the last 24 hours
- Render as a collapsible section with count badge
- Each completed item: title, who approved, when, confidence score
- Collapsed by default, expand on click
- AI-narrated summary: "3 items completed today, all approved within 2 minutes"
- Max 20 items, with "View all" link to audit trail

---

## Surface 3: Financial Pulse — Exchange Rates + KPI Drawers

### Task 3.1: Add LiveExchangeRates

**Files:**

- Modify: `apps/web/app/dashboard/financial-pulse/new/page.tsx`

**What to add:** Live exchange rates widget in the Overview tab.

**Implementation:**

- Add `trpc.currencies.getRates.useQuery()` or similar existing query
- Render as a compact card in the overview: "USD → EUR 0.92 | USD → GBP 0.79 | USD → KES 153.2"
- Show rate change arrows (up/down) with color coding
- `ProvenanceBadge` on rates: "Live rates via ECB"
- Auto-refresh every 60 seconds
- Style: inline pills, not a full card — fits in the KPI row

### Task 3.2: Add DailyCloseStatus

**Files:**

- Modify: `apps/web/app/dashboard/financial-pulse/new/page.tsx`

**What to add:** Daily close status indicator in the Overview tab.

**Implementation:**

- Query `trpc.dailyClose.getStatus.useQuery()` for latest close run
- Render as a status strip: "Today's close: ✅ Complete (matched 142/142 transactions)" or "⏳ In progress" or "❌ Failed"
- Link to activity-hub/tasks for details
- AI narration: "Daily reconciliation completed at 11:30 PM. All transactions matched."
- Style: compact, not dominant — a single line with status indicator

### Task 3.3: Add KpiDrillDownDrawer

**Files:**

- Modify: `apps/web/app/dashboard/financial-pulse/new/page.tsx`

**What to add:** Click any KPI to open a detail drawer with AI-narrated breakdown.

**Implementation:**

- Add click handler to each KPI card
- Open a slide-out drawer (use `createPortal` pattern from ledger/new)
- Drawer shows: KPI value, trend chart (sparkline), breakdown by category, AI narrative explaining the number
- Data: reuse existing tRPC queries for each KPI's underlying data
- Close on ESC or click outside
- Style: overlay drawer with backdrop blur, 400px wide

---

## Surface 4: Operations — Separate Tabs

### Task 4.1: Split People Tab into Customers + Vendors

**Files:**

- Modify: `apps/web/app/dashboard/operations/new/page.tsx`

**What to add:** Restore separate Customers and Vendors tabs instead of merged "People" tab.

**Implementation:**

- Change the tabs array from 5 to 6: Cash Position, Invoices, Bills, Customers, Vendors, Banking
- Import `CustomersView` and `VendorsView` separately (they already exist as components)
- Update the active tab state and URL param sync
- Each tab gets its own count badge from tRPC queries
- Style: same tab pattern as existing, just one more tab

---

## Surface 5: Ledger — Manual Entry + Import + Export

### Task 5.1: Add CreateJournalEntryForm

**Files:**

- Modify: `apps/web/app/dashboard/ledger/new/page.tsx`

**What to add:** Manual journal entry form with AI assistance.

**Implementation:**

- Import `CreateJournalEntryForm` from the original ledger components
- Add a "New Entry" button in the Journal tab header
- Open a modal/drawer with the form
- AI-native twist: pre-fill suggested accounts based on description, validate debits=credits, warn on unusual amounts
- Use `usePermission` to check `ledger.journal.create` before showing the button
- On submit: invalidate journal list query, show success toast

### Task 5.2: Add CoaImportWizard

**Files:**

- Modify: `apps/web/app/dashboard/ledger/new/page.tsx`

**What to add:** Import chart of accounts from CSV/Excel.

**Implementation:**

- Import `CoaImportWizard` from the original ledger components
- Add an "Import" button in the COA tab header
- Open a modal with the wizard: upload file → map columns → preview → confirm import
- AI-native twist: auto-detect column mapping, suggest account categories, validate against standard COA templates
- Use `usePermission` to check `ledger.coa.import` before showing the button

### Task 5.3: Add BulkExportButton

**Files:**

- Modify: `apps/web/app/dashboard/ledger/new/page.tsx`

**What to add:** Export journal/COA/trial balance to CSV.

**Implementation:**

- Import `BulkExportButton` from the original ledger components
- Add export button to each tab's header (Journal, COA, Trial Balance)
- Pass the current filtered data to the export function
- AI-native twist: AI-narrated export summary ("Exported 1,247 journal entries for Jan-Dec 2025")
- Use `usePermission` to check `ledger.export` before showing buttons

### Task 5.4: Add Permission Gating

**Files:**

- Modify: `apps/web/app/dashboard/ledger/new/page.tsx`

**What to add:** Permission-based UI gating for all actions.

**Implementation:**

- Import `usePermission` from `@/lib/permissions`
- Gate each action button: New Entry, Import, Export
- For read-only users: hide action buttons, show "Read-only access" badge
- For external auditors: show export but hide create/import
- For donors: hide all action buttons, show data only

---

## Verification

After all tasks:

- [ ] `pnpm typecheck --filter=web` passes
- [ ] `pnpm lint --filter=web` passes
- [ ] No `/new` routes deleted — all changes are additive
- [ ] All features work in both desktop and mobile views
- [ ] Commit: `feat: add original features to /new pages with AI-native design`
