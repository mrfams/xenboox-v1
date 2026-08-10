# Plan: Compact Chrome for ModulePageShell (vertical-space optimization)

## What

Compress the fixed chrome rendered by the shared `ModulePageShell` parent component so all 11 dashboard module pages (transactions, banking, invoicing, customers, vendors, bills, payroll, expenses, reports, documents, journal) show content sooner. No per-page changes — every page inherits the fix from the parent.

Today each page spends ~250px of fixed vertical space before content:

```
Header (icon + title + description + actions)      ~60px
Underline tabs (py-2.5, text-sm)                   ~40px
"Overview" label row + toggle                       ~28px
Summary cards grid (px-3 py-2.5, text-lg values)    ~92px
Filters band (py-2.5)                               ~44px
                                                    ≈ 264px total
```

Target: ~180px of chrome (~30% reduction) with a more professional metric-strip presentation, no loss of information.

## File List

| File                                                            | Action                                                            |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `apps/web/components/module/module-page-shell.tsx`              | Modify — compact header, tabs, summary strip, filters, pagination |
| `.kilo/plans/1786217000000-module-page-shell-compact-chrome.md` | Create — this plan                                                |
| `BUILD_LOG.md`                                                  | Modify — session entry                                            |

No changes to `module-page-shell.types.ts` (props API is stable) and no changes to any of the 11 page files.

## File Order

1. `module-page-shell.tsx` (single file, no dependencies)

## What Each File Contains

### `apps/web/components/module/module-page-shell.tsx`

1. **Header band** — `px-4 py-2` (was `py-3`), icon `h-7 w-7 rounded-md` (was `h-8 w-8`), title `text-[15px] leading-5` (was `text-base`), description `text-[11px] leading-4` single line truncated (was `text-xs`).
2. **Tabs** — buttons `py-1.5 text-[13px]` (was `py-2.5 text-sm`), count pill `h-4 min-w-4 text-[9px]` (was `h-5 min-w-5 text-[10px]`), collapsed label `text-[10px]`. Toggle unchanged and stays visible.
3. **Summary cards → compact KPI metric strip** (the main win, ~120px → ~56px):
   - Remove the separate "Overview" label row when expanded.
   - Render a hairline-divided strip: `grid grid-cols-2 gap-px bg-slate-200/70 md:grid-cols-3 xl:grid-cols-5` with `bg-white` cells `px-3 py-2`.
   - Cell layout (2 lines): row 1 = icon chip (`h-7 w-7 rounded-md` + `card.bgColor`) + label (`text-[10px] font-medium`) with subtitle on the right (`text-[9px] text-slate-400`, truncated); row 2 = value (`text-[15px] font-semibold tabular-nums`) + change arrow inline (`text-[10px]`, emerald/red).
   - Collapse toggle floats at the strip's top-right (`absolute right-1.5 top-1/2 -translate-y-1/2`, subtle `bg-white/90 ring-1 ring-slate-200`), always visible; last grid cell gets `[&>*:last-child]:pr-8` so content never runs under it.
   - Collapsed state: slim `px-4 py-1.5` band with "Overview" label + toggle (toggle stays visible).
4. **Filters band** — `py-2` (was `py-2.5`), collapsed label `text-[10px]`, toggle unchanged.
5. **Pagination band** — `py-2.5` (was `py-3`).
6. **Bottom charts band** — `py-3` (was `py-4`).
7. **Unchanged:** sticky header+tabs (`sticky top-0 z-20`), localStorage collapse persistence, `noOuterWrapper`, content area, outer `min-h-full` wrapper.

## Rules Applied

- DRY: one fix in the parent component; all 11 pages inherit it. No page edits.
- Props API untouched — pages keep passing the same `summaryCards`/`tabs`/`filters` data.
- Design language preserved: slate palette, indigo accent, `tabular-nums` values, truncation on every line, existing collapse semantics (`xb:shell:*` localStorage keys unchanged so user preferences carry over).
- Collapse toggles stay visible (matches prior fix "keep tab/filter collapse toggles visible").
- Responsive: same breakpoints as today (`grid-cols-2 md:grid-cols-3 xl:grid-cols-5`).

## After Building

- `pnpm typecheck --filter=@xenboox/web`
- `pnpm lint --filter=@xenboox/web`
- `pnpm test --filter=@xenboox/web`
- Code-reviewer pass, then update `BUILD_LOG.md`.

## What I Won't Touch

- The 11 page files under `apps/web/app/dashboard/*/page.tsx`
- `module-page-shell.types.ts` (stable API)
- Dashboard layout, TopNav, sidebar, ChatPanel
- Mobile / desktop apps

---

## Autoplan review record (condensed gate)

**Scope detection:** UI scope = yes. DX scope = no (no dev-facing API/CLI surface).

**Phase 1 — CEO:** Premise accepted: "the shell's chrome is too tall and should be compressed once in the parent." Alternative considered (per-page tuning) rejected — duplicates logic (P4 DRY), slower to ship (P6). Scope: strictly in blast radius (1 file + docs). Verdict: correct problem, minimal scope.

**Phase 2 — Design (all 7 dimensions evaluated):**

- Information hierarchy (9/10 → 10): values remain the dominant element; icon chips preserve color-coding; delta arrows keep change semantics.
- Space efficiency (4/10 → 8): the metric strip removes the label row and cuts card padding/type size; ~264px → ~180px of chrome.
- Consistency (8/10 → 10): one component, zero page drift; identical treatment on all 11 pages.
- States (loading/empty/collapsed): unchanged behavior — collapse toggles stay visible, localStorage persists.
- Responsive (8/10): same breakpoints, `truncate` on every line prevents overflow.
- Accessibility: toggles keep `aria-expanded` + labels; no interaction model change.
- Aesthetics: hairline-divided strip is the standard professional KPI pattern (Stripe/Linear-style) vs the current chunky card grid.
- Taste decisions logged: (1) keep sticky header+tabs (pinned tab context is worth ~40px on long tables; standard in Notion/Stripe) — not removing; (2) summary toggle floats at strip top-right, always visible, instead of a dedicated label row.

**Phase 3 — Eng:** Single presentational file; no state/logic changes; props API stable so no caller churn. Edge cases: long values → `truncate` + `min-w-0`; 6+ cards wrap at `xl:grid-cols-5` (same as today); toggle overlap on last cell → `[&>*:last-child]:pr-8`. Test plan: typecheck + lint + existing 330-test suite (no new logic → no new unit tests; visual verification of /payroll, /banking, /transactions). Architecture unchanged.

**Decision audit trail:**

| #   | Phase  | Decision                                                                    | Classification   | Principle   | Rationale                                                                                                                                                                                                         |
| --- | ------ | --------------------------------------------------------------------------- | ---------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CEO    | Fix in parent component only                                                | Mechanical       | P4 DRY / P6 | User explicitly requested; pages stay untouched                                                                                                                                                                   |
| 2   | Design | Metric strip replaces card grid                                             | Taste            | P5 / P1     | Max space saving while preserving all data                                                                                                                                                                        |
| 3   | Design | Keep sticky header+tabs                                                     | Taste            | P5          | Standard pattern; pinned tab context valuable                                                                                                                                                                     |
| 4   | Design | Floating always-visible summary toggle                                      | Taste            | P5          | No label row; discoverable, persists                                                                                                                                                                              |
| 5   | Eng    | Added focused shell regression test (`module-page-shell.test.tsx`, 3 tests) | Taste (override) | P1          | Shell had zero coverage; compact-chrome structure is exactly the regression this task protects. Verified: header/tabs/content render, metric strip has no label row, toggles hide bands + persist to localStorage |
