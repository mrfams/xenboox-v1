# Plan: Fix Admin Routes + Build Real-World Admin Pages

### What

The admin pages are placed inside a Next.js route group `(admin)/`, which means they resolve to root-level URLs like `/users`, `/organizations`, etc. — not `/admin/users`, `/admin/organizations`. The admin layout links all point to `/admin/*` paths, so every page except `/admin` returns 404.

We will:

1. Move all admin pages from `app/(admin)/` to `app/admin/` so they nest under `/admin/`.
2. Add missing CRUD mutations to the admin tRPC router (create/update/delete users and organizations).
3. Enhance the admin pages with real-world admin capabilities: data tables with sorting, filtering, pagination, create/edit/delete modals, search, status badges, and empty states.

### File List

#### Move (fix routing)

- `apps/web/app/(admin)/admin/page.tsx` -> `apps/web/app/admin/page.tsx`
- `apps/web/app/(admin)/layout.tsx` -> `apps/web/app/admin/layout.tsx`
- `apps/web/app/(admin)/loading.tsx` -> `apps/web/app/admin/loading.tsx`
- `apps/web/app/(admin)/error.tsx` -> `apps/web/app/admin/error.tsx`
- `apps/web/app/(admin)/not-found.tsx` -> `apps/web/app/admin/not-found.tsx`
- `apps/web/app/(admin)/ai-comparison/page.tsx` -> `apps/web/app/admin/ai-comparison/page.tsx`
- `apps/web/app/(admin)/alerts/page.tsx` -> `apps/web/app/admin/alerts/page.tsx`
- `apps/web/app/(admin)/analytics/page.tsx` -> `apps/web/app/admin/analytics/page.tsx`
- `apps/web/app/(admin)/financial/page.tsx` -> `apps/web/app/admin/financial/page.tsx`
- `apps/web/app/(admin)/model-ops/page.tsx` -> `apps/web/app/admin/model-ops/page.tsx`
- `apps/web/app/(admin)/organizations/page.tsx` -> `apps/web/app/admin/organizations/page.tsx`
- `apps/web/app/(admin)/settings/page.tsx` -> `apps/web/app/admin/settings/page.tsx`
- `apps/web/app/(admin)/spending/page.tsx` -> `apps/web/app/admin/spending/page.tsx`
- `apps/web/app/(admin)/users/page.tsx` -> `apps/web/app/admin/users/page.tsx`

#### Create (after delete old route group)

#### Modify

- `apps/web/server/routers/admin.ts` — Add `createUser`, `updateUser`, `deleteUser`, `createOrganization`, `updateOrganization`, `deleteOrganization`
- `apps/web/app/admin/organizations/page.tsx` — Real data table, create dialog, edit, delete
- `apps/web/app/admin/users/page.tsx` — Real data table, create dialog, edit, delete, role management

### File Order

1. Delete old route-group pages (after writing the new ones to avoid 404 windows)
2. Move all admin files into `app/admin/`
3. Update admin router with new mutations
4. Enhance `users/page.tsx` and `organizations/page.tsx`
5. Run typecheck + lint

### What Each File Contains

#### `app/admin/layout.tsx`

- Same sidebar nav, links now naturally resolve to `/admin/...` because folder is `admin/` not `(admin)/`
- No import or path changes required beyond folder move

#### `app/admin/page.tsx`

- Overview page with stat cards, alert banners, quick links (unchanged content)

#### `app/admin/users/page.tsx`

- Full user management table with client-side search, role badges, status indicators
- Create User dialog (name, email, role selector, entity assignment)
- Edit user dialog
- Delete user with confirmation
- Pagination placeholder (shows all, but structured for it)
- Empty state
- Loading skeleton

#### `app/admin/organizations/page.tsx`

- Full organizations table with search by name/slug
- Create Organization dialog (name, slug, plan selector)
- Edit organization dialog
- Delete with confirmation
- Plan badge variants
- Entity count display
- Empty state

#### `app/admin/ai-comparison/page.tsx`

- Keep as-is (read-only dashboard, already working)

#### `app/admin/alerts/page.tsx`

- Keep as-is (read-only dashboard, already working)

#### `app/admin/analytics/page.tsx`

- Keep as-is (read-only dashboard, already working)

#### `app/admin/financial/page.tsx`

- Keep as-is (read-only dashboard, already working)

#### `app/admin/spending/page.tsx`

- Keep as-is (read-only dashboard, already working)

#### `app/admin/model-ops/page.tsx`

- Keep as-is (uses model-ops router with CRUD)

#### `app/admin/settings/page.tsx`

- Keep as-is (already has save mutation)

#### `apps/web/server/routers/admin.ts` additions

- `createUser` — input: name, email, role, entityId. Creates user + assigns role.
- `updateUser` — input: userId, name, email, entityId, role
- `deleteUser` — input: userId. Soft-delete or hard-delete.
- `createOrganization` — input: name, slug, plan, ownerId. Creates org + owner access.
- `updateOrganization` — input: orgId, name, plan
- `deleteOrganization` — input: orgId

### Rules Applied

- Strict TypeScript, no `any`
- Zod validation on all inputs
- entity scoping enforced
- Shadcn/ui + lucide-react icons
- Server actions not needed — tRPC mutations used
- Use `adminProcedure` for admin-only mutations
- No native `alert()`/`confirm()` — use confirmation dialogs/ui

### After Building

- `pnpm typecheck` (web package)
- `pnpm lint` (web package)
- `pnpm build --filter=web` — verify build succeeds

### What I Won't Touch

- Mobile app routes
- Desktop app routes
- Marketing pages
- Dashboard routes
- Existing entities outside `app/(admin)/` and admin router
