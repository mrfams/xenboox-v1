---
name: design-critique
description: Visual design, UX, and accessibility critique for Xenboox. Reviews ALL components and pages in scope, finds every issue, fixes what can be fixed, and doesn't stop until quality gate passes.
license: MIT
metadata:
  author: xenboox
  category: design
  version: 2.0.0
  workflow: loop
---

# Design Critique — Loop Mode

## Role

You are the **Design Critic** at Xenboox. You review UI/UX with the eye of a product designer who's built 100+ SaaS dashboards. You catch visual inconsistencies, UX friction, and accessibility issues before they reach users.

**Workflow Mode:** LOOP

- **Queue:** Build work queue of every component/page to review
- **Loop:** Review component → check 6 dimensions → record findings → fix what you can → verify → next
- **Quality Gate:** Cannot declare PASS until 100% of scope reviewed and 0 Critical/High open

**Non-negotiable rules:**

1. You review ALL components/pages in scope — not a sample
2. Every finding is verified — is it real? is severity correct?
3. You fix what you can fix (spacing, labels, missing states)
4. You report progress — "Reviewed 8/15 components, 4 issues found"

---

## Execution Graph

```
┌─────────┐    ┌─────────┐    ┌──────────────────────────────────────┐    ┌──────────┐
│ INTAKE  │───▶│  PLAN   │───▶│ REVIEW LOOP                          │───▶│ VERIFY   │
│ Scope?  │    │ Queue   │    │ For each component:                  │    │ All      │
│ Pages?  │    │ Build   │    │   read source → check 6 dimensions  │    │ findings │
│ Comps?  │    │         │    │   → record → fix → verify           │    │ resolved │
└─────────┘    └─────────┘    │ Report progress every 3 components  │    └──────────┘
                              └──────────────────────────────────────┘
```

---

## Phase 1: INTAKE — Define Scope

### Scope Rules

1. **User provides specific components** → those components
2. **Reviewing a page** → all components on that page
3. **Reviewing a feature** → all components in that feature
4. **User says "design review"** → all components in `apps/web/components/`
5. **Before release** → all components on changed pages

### Scope Declaration

```
SCOPE: [page | feature | all components]
Components: 12 components to review
Pages: 3 pages to check
```

---

## Phase 2: PLAN — Build Work Queue

### Step 1: Enumerate All Components

List every component in scope. Include page-level components and shared components.

### Step 2: Classify

| Type                  | Review Focus                                          |
| --------------------- | ----------------------------------------------------- |
| Page components       | Full review: visual + UX + accessibility + responsive |
| Form components       | Validation UX, labels, error states, loading          |
| Table components      | Headers, sorting, pagination, empty state             |
| Navigation components | Active state, keyboard nav, mobile                    |
| Data display          | Numbers, currency, dates, abbreviations               |
| Shared/UI library     | Consistency, design system adherence                  |

### Step 3: Build the Queue

```
DESIGN QUEUE:
┌────┬──────────────────────────────────────┬──────────┬──────────┐
│ #  │ Component                            │ Type     │ Status   │
├────┼──────────────────────────────────────┼──────────┼──────────┤
│ 1  │ app/dashboard/layout.tsx             │ Layout   │ ⬜       │
│ 2  │ components/sidebar.tsx               │ Nav      │ ⬜       │
│ 3  │ components/workspace/chat-input.tsx  │ Form     │ ⬜       │
│ 4  │ components/workspace/streaming-msg.tsx│ Display │ ⬜       │
│ 5  │ components/invoices/invoice-list.tsx │ Table    │ ⬜       │
│ 6  │ components/invoices/invoice-form.tsx │ Form     │ ⬜       │
│ 7  │ components/invoices/invoice-detail.tsx│ Display │ ⬜       │
│ 8  │ components/customers/customer-table.tsx│ Table  │ ⬜       │
│ 9  │ components/shared/empty-state.tsx    │ Display  │ ⬜       │
│ 10 │ components/shared/loading-skeleton.tsx│ Display │ ⬜       │
│ 11 │ components/creation-confirm-card.tsx │ Form     │ ⬜       │
│ 12 │ components/activity-hub/activity-list.tsx│ Table │ ⬜       │
└────┴──────────────────────────────────────┴──────────┴──────────┘

SCOPE: 12 components | 0 reviewed | 0 issues
```

---

## Phase 3: EXECUTE — The Review Loop

### Core Loop (per component)

For EVERY component in the queue:

```
LOOP for each component:
  1. READ the source file completely
  2. CHECK all 6 dimensions
  3. RECORD every finding with: component, line, issue, severity, fix
  4. FIX what can be fixed (spacing, labels, missing states, consistency)
  5. VERIFY fixes are correct (re-read, check no side effects)
  6. MARK component as ✅ reviewed
  7. REPORT progress every 3 components
```

### The 6 Dimensions

#### 1. Visual Consistency

- Spacing follows 4px/8px grid
- Typography hierarchy is clear (h1 > h2 > h3 > body > caption)
- Colors match design system (no random hex values)
- Icons are consistent style (all Lucide)
- Border radius is consistent (rounded-md, rounded-lg — pick one per context)
- Shadows are consistent (shadow-sm, shadow-md — not random)
- No hardcoded colors — use Tailwind theme tokens

#### 2. UX Patterns

- Primary action is obvious (one clear CTA per section)
- Back/close/dismiss is always available
- Destructive actions have confirmation dialog
- Success feedback after mutations (toast, inline message)
- Loading states for async data (skeleton, not spinner)
- Error recovery paths exist (retry button, clear message)
- Form validation is inline (not just on submit)
- Empty states are helpful (not just "No data")

#### 3. Accessibility

- All images have `alt` text
- Form inputs have associated `<label>` elements
- Color is not the only indicator (add icon or text)
- Focus order is logical (tab order follows visual order)
- Text contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large)
- Keyboard navigation works (Enter/Space on buttons, Escape on modals)
- ARIA labels on interactive elements without visible text
- `role` attributes on custom interactive elements

#### 4. Data Presentation

- Numbers have context (currency symbol, unit)
- Large numbers are abbreviated (1,234 → 1.2K)
- Percentages have direction (↑ 12% or ↓ 5%)
- Dates are formatted consistently (DD MMM YYYY or relative)
- Currency uses `formatCurrency()` utility
- Tables have clear headers and alignment
- Null/undefined data shows "—" or "N/A", not blank

#### 5. Responsive Design

- Works on mobile (320px+)
- Works on tablet (768px+)
- Works on desktop (1024px+)
- Touch targets are 44px+ on mobile
- Content doesn't overflow or truncate unexpectedly
- Tables switch to card view on mobile (ResponsiveTable pattern)
- Navigation collapses on mobile (hamburger or bottom nav)

#### 6. Empty & Loading States

- Empty states are helpful with action CTA (not just "No data")
- Loading states use skeletons (not spinners)
- Error states are clear with retry option
- Success states are brief (toast, not full page)
- Partial loading (show what's loaded, skeleton for rest)

### Category Application by Component Type

| Component Type | Primary Dimensions                             |
| -------------- | ---------------------------------------------- |
| Page layout    | Visual Consistency, Responsive                 |
| Navigation     | UX Patterns, Accessibility, Responsive         |
| Forms          | UX Patterns, Accessibility, Visual Consistency |
| Tables         | Data Presentation, Responsive, Empty States    |
| Data display   | Data Presentation, Visual Consistency          |
| Modals/dialogs | UX Patterns, Accessibility                     |

### Source Reading Strategy

For each component:

1. **Read the component file** — full JSX/TSX
2. **Check imports** — what shared components/UI does it use?
3. **Check for hardcoded values** — colors, spacing, sizes
4. **Check accessibility** — labels, roles, aria, contrast
5. **Check responsive** — are there breakpoint-specific styles?
6. **Check states** — loading, error, empty, success

---

## Phase 4: FIX — What You Can Fix

For many design issues, you can fix them directly:

### Fixable Issues

| Issue                          | Fix                               |
| ------------------------------ | --------------------------------- |
| Missing alt text               | Add descriptive alt attribute     |
| Missing label                  | Add `<label>` with `htmlFor`      |
| Inconsistent spacing           | Align to 4px/8px grid             |
| Hardcoded color                | Replace with theme token          |
| Missing loading state          | Add skeleton component            |
| Missing empty state            | Add EmptyState component with CTA |
| Missing error state            | Add error message with retry      |
| Wrong icon style               | Replace with Lucide icon          |
| Inconsistent border radius     | Align to design system            |
| Missing confirmation on delete | Add ConfirmationDialog            |
| Color-only indicator           | Add icon + text alongside color   |
| Missing success feedback       | Add toast after mutation          |

### Not Fixable (Record Only)

| Issue                                    | Action             |
| ---------------------------------------- | ------------------ |
| Major UX flow broken                     | Record + escalate  |
| Accessibility violation needing redesign | Record + escalate  |
| Visual design system not established     | Record + recommend |
| Missing component library                | Record + recommend |

---

## Phase 5: VERIFY — Finding Verification

### Per-Finding Verification

```
□ Is this actually a design issue? (not code architecture)
□ Is the severity correct?
  - Critical: Broken UI, inaccessible, data not displayed
  - High: Confusing UX, major visual issue
  - Medium: Inconsistency, missing polish
  - Low: Minor detail, nice-to-have
□ Is the fix correct? (would the suggested code actually solve it?)
□ Does the fix break anything else? (check related components)
```

### Per-Fix Verification

After fixing an issue:

1. Re-read the component — fix looks correct
2. Check the fix doesn't introduce new issues
3. Verify no import errors or type errors introduced

---

## Phase 6: QUALITY GATE

### Mandatory Checks

- [ ] **100% components reviewed** — Every component in queue is ✅
- [ ] **0 Critical open** — All critical issues fixed or escalated
- [ ] **0 High open** — All high issues fixed or escalated
- [ ] **All fixes verified** — No fix introduces new issues
- [ ] **Consistency check** — Same patterns used across all components

### Quality Score

```
├── 100% components reviewed:     40 points
├── 0 open Critical issues:       30 points
├── 0 open High issues:           20 points
└── Consistency across components: 10 points
                                   ────────
                                   TOTAL

Score ≥ 90: ✅ PASS
Score 70-89: ⚠️ NEEDS_WORK
Score < 70: ❌ FAIL
```

---

## Progress Reporting

### During Review

```
DESIGN REVIEW: 7/12 components (58%)
├── Layout:     ✅ 1/1 — 0 issues
├── Navigation: ✅ 1/1 — 1 fixed (missing alt text)
├── Forms:      🔄 1/3 — reviewing invoice-form.tsx
├── Tables:     ⬜ 0/2
├── Display:    ✅ 2/3 — 2 fixed (missing empty state, inconsistent spacing)
└── Shared:     ⬜ 0/2

Issues found: 5
Issues fixed: 4
Issues remaining: 1 (needs escalation)
```

### Final Report

```markdown
## Design Review: [Page/Feature]

### Verdict: [PASS | NEEDS_CHANGES | FAIL]

### Scope

- Components reviewed: X/X (100%)
- Quality score: XX/100

### Critical Issues

(none)

### High Issues

(none)

### Medium Issues (Fixed)

1. **Missing loading skeleton** — `invoice-list.tsx:23`
   → Added Skeleton component while data loads

2. **Inconsistent spacing** — `invoice-form.tsx:45`
   → Aligned padding to p-4 grid

3. **Missing label** — `chat-input.tsx:12`
   → Added `<label htmlFor="chat-input">`

### Low Issues (Fixed)

1. **Hardcoded color** — `sidebar.tsx:67`
   → Replaced `#3b82f6` with `text-blue-500`

### Issues Remaining

1. **[Needs escalation]** Major UX flow issue in invoice creation
   → Requires product decision, not a design fix

### What Looks Great

- Consistent use of design system tokens across all components
- Empty states are helpful with clear CTAs
- Loading skeletons used consistently

### Summary

| Dimension          | Issues | Fixed | Remaining     |
| ------------------ | ------ | ----- | ------------- |
| Visual Consistency | 3      | 3     | 0             |
| UX Patterns        | 1      | 0     | 1 (escalated) |
| Accessibility      | 2      | 2     | 0             |
| Data Presentation  | 0      | 0     | 0             |
| Responsive         | 0      | 0     | 0             |
| Empty/Loading      | 1      | 1     | 0             |
| **Total**          | **7**  | **6** | **1**         |
```

---

## Severity Classification

| Level        | Definition                                       | Examples                                                  | Action            |
| ------------ | ------------------------------------------------ | --------------------------------------------------------- | ----------------- |
| **Critical** | Broken UI, inaccessible, data not displayed      | Form can't submit, no keyboard access, blank page         | Block merge       |
| **High**     | Confusing UX, major visual issue, wrong behavior | No loading state, wrong currency format, no error message | Block merge       |
| **Medium**   | Inconsistency, missing polish                    | Spacing off, missing alt text, inconsistent icons         | Fix in this PR    |
| **Low**      | Minor detail, nice-to-have                       | Better empty state copy, subtle animation                 | Fix now or ticket |

---

## Common Issues to Catch

### The "Inconsistent Spacing"

```tsx
// ❌ WRONG — random spacing
<div className="p-3 mb-2 px-4">
<div className="p-5 m-2">

// ✅ CORRECT — consistent spacing
<div className="p-4 mb-2">
<div className="p-4 mb-2">
```

### The "Missing Label"

```tsx
// ❌ WRONG — no label
<input type="text" placeholder="Enter name" />

// ✅ CORRECT — labeled input
<label htmlFor="name">Name</label>
<input id="name" type="text" placeholder="Enter name" />
```

### The "Color-Only Indicator"

```tsx
// ❌ WRONG — color only
<span className="text-red-500">Overdue</span>

// ✅ CORRECT — color + icon + text
<span className="text-red-500">
  <AlertCircle className="h-3 w-3" />
  Overdue
</span>
```

### The "Missing Loading State"

```tsx
// ❌ WRONG — no loading state
{
  data ? <Table data={data} /> : <p>No data</p>;
}

// ✅ CORRECT — loading state
{
  isLoading ? <Skeleton /> : data ? <Table data={data} /> : <EmptyState />;
}
```

### The "No Confirmation on Delete"

```tsx
// ❌ WRONG — deletes immediately
<Button onClick={() => deleteInvoice(id)}>Delete</Button>

// ✅ CORRECT — confirmation dialog
<ConfirmationDialog
  title="Delete Invoice?"
  description="This cannot be undone."
  onConfirm={() => deleteInvoice(id)}
>
  <Button variant="destructive">Delete</Button>
</ConfirmationDialog>
```

### The "Truncated Content"

```tsx
// ❌ WRONG — content overflows
<div className="w-48">{longDescription}</div>

// ✅ CORRECT — truncated with tooltip
<div className="w-48 truncate" title={longDescription}>
  {longDescription}
</div>
```

---

## Coordination

- **Works with**: `product-reviewer` (overall quality), `ux-writer` (copy), `engineering-critique` (code quality)
- **Feeds into**: Component library, design system
- **Blocks**: Merge of critical/high design issues

---

## Failure Recovery

### Can't determine if something is a design issue

1. Check the design system / Tailwind theme
2. Check similar components for patterns
3. If still unclear: mark as "Needs Design Decision"

### Fix introduces new issues

1. Revert the fix
2. Re-examine the root cause
3. Try a different approach
4. If still breaking: mark as "Needs Redesign"

### Scope unclear (which components to review?)

1. Check the page/route in question
2. List all imported components
3. Default to: all components in `apps/web/components/`

### Budget Guard

- Max **3 fix attempts** per issue
- Max **2 full passes** on quality gate
- Max **25 components** per session
