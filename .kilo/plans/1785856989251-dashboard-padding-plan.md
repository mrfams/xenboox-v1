# Plan: Dashboard Page-Specific Padding

## What

Add conditional padding to the dashboard layout so that `/work`, `/money`, `/insights`, `/agents`, and `/settings` get padding on the `<main>` element, while `/dashboard` gets padding on its content wrapper div instead — without affecting the right-side ChatPanel.

## File List

| File                                | Action                                                            |
| ----------------------------------- | ----------------------------------------------------------------- |
| `apps/web/app/dashboard/layout.tsx` | Modify — add `usePathname()`, conditionally apply padding classes |

## File Order

1. `apps/web/app/dashboard/layout.tsx` (single file change, no dependencies)

## What Each File Contains

### `apps/web/app/dashboard/layout.tsx`

- Import `usePathname` from `next/navigation`
- Derive a `PAGE_PADDING_ROUTES` set: `['/work', '/money', '/insights', '/agents', '/settings']`
- Compute `isDashboardHome = pathname === '/dashboard'`
- Compute `isPaddedPage = PAGE_PADDING_ROUTES.includes(pathname)`
- **On `<main>`**: add `p-6` when `isPaddedPage` is true, no padding otherwise
- **On the main-column wrapper** (the `<div>` containing `<TopNav>` and `<main>`): add `pl-6 pt-6 pr-6` when `isDashboardHome` is true, no padding otherwise

Concrete class changes:

```tsx
// Main column wrapper (line ~92–97)
className={cn(
  "flex flex-col overflow-hidden transition-all duration-300 flex-1",
  chatOpen ? "flex-1" : "flex-1",
  isDashboardHome && "pl-6 pt-6 pr-6",
)}

// <main> element (line ~103)
<main className={cn("flex-1 overflow-y-auto", isPaddedPage && "p-6")}>
  {children}
</main>
```

## Rules Applied

- Single-file change; no page-level modifications needed
- Existing `lg:pl-[4.25rem]` on the outer content wrapper is preserved (it accounts for the collapsed sidebar and is unaffected)
- Right panel (`ChatPanel`) is a sibling in the flex row — padding on the main column or `<main>` does not bleed into it
- Uses `cn()` utility already imported in the file
- Padding value `p-6` / `pl-6 pt-6 pr-6` matches existing design tokens used elsewhere in the app

## After Building

- Run `pnpm lint` and `pnpm typecheck` to confirm no type errors
- Visually verify: `/dashboard` has left/top/right padding on the content area only; `/work`, `/money`, `/insights`, `/agents`, `/settings` have full `p-6` on `<main>`; right panel is unaffected in all cases

## What I Won't Touch

- Any individual page components under `apps/web/app/dashboard/*/page.tsx`
- `TopNav`, `AISidebar`, `ChatPanel` components
- CSS variables or global styles
- Right panel toggle/drag behavior
