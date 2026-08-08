# Plan: Dashboard Module Page Shell — Vertical Space Optimization

## What

Build a shared `ModulePageShell` component that wraps all dashboard module pages (payroll, transactions, banking, invoicing, customers, vendors, bills, expenses, reports, documents, journal). The shell replaces the duplicated inline header/tabs/cards/filters/table/pagination structure with a single, properly-flexed layout where the data table gets all remaining vertical space. Header, tabs, summary cards, and filters become independently collapsible so they only consume space when needed.

## File List

### Files to Create

| File                                                    | Purpose                 |
| ------------------------------------------------------- | ----------------------- |
| `apps/web/components/module/module-page-shell.tsx`      | Shared shell component  |
| `apps/web/components/module/module-page-shell.types.ts` | Shared TypeScript types |

### Files to Modify

| File                                           | Change                           |
| ---------------------------------------------- | -------------------------------- |
| `apps/web/app/dashboard/payroll/page.tsx`      | Replace inline layout with shell |
| `apps/web/app/dashboard/transactions/page.tsx` | Replace inline layout with shell |
| `apps/web/app/dashboard/banking/page.tsx`      | Replace inline layout with shell |
| `apps/web/app/dashboard/invoicing/page.tsx`    | Replace inline layout with shell |
| `apps/web/app/dashboard/customers/page.tsx`    | Replace inline layout with shell |
| `apps/web/app/dashboard/vendors/page.tsx`      | Replace inline layout with shell |
| `apps/web/app/dashboard/bills/page.tsx`        | Replace inline layout with shell |
| `apps/web/app/dashboard/expenses/page.tsx`     | Replace inline layout with shell |
| `apps/web/app/dashboard/reports/page.tsx`      | Replace inline layout with shell |
| `apps/web/app/dashboard/documents/page.tsx`    | Replace inline layout with shell |
| `apps/web/app/dashboard/journal/page.tsx`      | Replace inline layout with shell |

## File Order

1. Create `apps/web/components/module/module-page-shell.types.ts` — types first
2. Create `apps/web/components/module/module-page-shell.tsx` — shell component
3. Modify `payroll/page.tsx` — first consumer, validate pattern
4. Modify `transactions/page.tsx`
5. Modify `banking/page.tsx`
6. Modify `invoicing/page.tsx`
7. Modify `customers/page.tsx`
8. Modify `vendors/page.tsx`
9. Modify `bills/page.tsx`
10. Modify `expenses/page.tsx`
11. Modify `reports/page.tsx`
12. Modify `documents/page.tsx`
13. Modify `journal/page.tsx`

## What Each File Contains

### `apps/web/components/module/module-page-shell.types.ts`

```tsx
export type TabItem = {
  key: string;
  label: string;
  count?: number;
  onClick?: () => void;
};

export type SummaryCardItem = {
  label: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
};

export type ModulePageShellProps = {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconBgClassName?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  summaryCards?: SummaryCardItem[];
  filters?: React.ReactNode;
  children: React.ReactNode;
  pagination?: React.ReactNode;
  bottomCharts?: React.ReactNode;
  defaultCollapsed?: {
    tabs?: boolean;
    summaryCards?: boolean;
    filters?: boolean;
  };
};
```

### `apps/web/components/module/module-page-shell.tsx`

A `"use client"` component that:

1. Receives the props above
2. Manages local collapsed state for `tabs`, `summaryCards`, and `filters` (default: all expanded)
3. Renders the outer `<div className="h-[calc(100vh-4rem)] flex">` wrapper
4. Renders main content area with proper flex column layout
5. Header: title row with optional icon, badge, actions. Compact by default — description hidden unless expanded or always shown based on a prop.
6. Tabs: horizontal scrollable row. Collapsible with a small toggle button. When collapsed, only shows a single compact indicator or hides entirely.
7. Summary cards: rendered in a `grid-cols-5` (or responsive `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`) grid. Collapsible. When collapsed, shows only 1-2 key metrics or hides.
8. Filters: single row, collapsible. When collapsed, only shows search input.
9. Content: `<div className="flex-1 overflow-auto">` — this is the table area, gets all remaining space.
10. Pagination: optional, rendered at bottom of content area.
11. Bottom charts: optional, rendered after pagination.

Key layout behavior:

- Header is always visible but compact (no extra padding)
- Tabs are collapsible via a small chevron toggle next to the tab row
- Summary cards are collapsible
- Filters are collapsible
- The table/content area always expands to fill remaining space via `flex-1 overflow-auto`
- No fixed heights on inner sections — only the outer shell uses `h-[calc(100vh-4rem)]`

### Modified Page Files

Each page will:

1. Remove its inline `SummaryCards` function (moved into shell via `summaryCards` prop)
2. Remove its inline header/tabs/filters/table/pagination markup
3. Replace the outer `<div className="h-[calc(100vh-4rem)] flex">` with `<ModulePageShell ...>`
4. Pass the table component as `children`
5. Pass pagination as `pagination` prop
6. Pass bottom charts as `bottomCharts` prop
7. Pass tab definitions as `tabs` prop
8. Pass summary card definitions as `summaryCards` prop
9. Pass filter JSX as `filters` prop

The page retains its data-fetching logic, state, and table/pagination components. Only the layout wrapper changes.

## Rules Applied

- **Entity scoping** — not affected (data fetching stays in page components)
- **No `any` types** — all new types are explicit
- **Strict TypeScript** — all props typed
- **Component colocation** — shell goes in `apps/web/components/module/`
- **Tailwind** — all styling via existing Tailwind classes
- **No new dependencies** — only uses existing `lucide-react` and `clsx/cn`
- **Backward compatible** — all existing page functionality preserved

## After Building

1. `pnpm typecheck` — ensure no TypeScript errors across the 13 modified + 2 new files
2. `pnpm lint` — ensure ESLint passes
3. Visually verify at least payroll and transactions pages in browser

## What I Won't Touch

- Any tRPC routers, database schema, agent code, or API routes
- The `DashboardLayout` in `app/dashboard/layout.tsx`
- The disabled AI Copilot panels
- Bottom chart components (they stay as-is, just passed as props)
- Table components (they stay as-is, just passed as children)
- Any other dashboard pages not listed above
