# ROLE_BASED_UI.md — Role-Based UI Strategy

> How Xenboox adapts its UI to 10 distinct user types.
> Route protection, sidebar navigation, component-level permissions, and CFO Agent chat adaptation.

---

## 1. User Types & Permissions

| # | Role | Scope | Access Level | Description |
|---|------|-------|-------------|-------------|
| 1 | **Org Owner** | Organization | Full | Billing, all entities, all modules, delete |
| 2 | **Org Admin** | Organization | Full - billing | All entities, user management, config |
| 3 | **Finance Director** | Entity | Manage | All financial modules, approvals, reports |
| 4 | **Accountant** | Entity | Write | Journal entries, invoices, reconciliation |
| 5 | **Payroll Officer** | Entity | Write (payroll) | Payroll runs, employee data, payslips |
| 6 | **Cashier** | Entity | Write (cash) | Cash management, imprest, mobile money |
| 7 | **Department Manager** | Entity | Read + budget | Budget view, expense approvals, reports |
| 8 | **Employee** | Entity | Self-service | Own expense reports, payslips, PTO |
| 9 | **External Auditor** | Entity | Read-only | All financial data, reports, audit log |
| 10 | **Compliance Officer** | Entity | Read + flag | Tax compliance, regulatory reports |

### Permission Hierarchy (database-level)

```typescript
// packages/db/schema/organization.ts
import { pgEnum, pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core"

export const userRoleEnum = pgEnum("user_role", [
  "org_owner",
  "org_admin",
  "finance_director",
  "accountant",
  "payroll_officer",
  "cashier",
  "department_manager",
  "employee",
  "external_auditor",
  "compliance_officer",
])

export const userEntityAccess = pgTable("user_entity_access", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id").notNull(),
  entityId:  uuid("entity_id").notNull(),
  role:      userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
```

### Role-to-Permission Matrix

```typescript
// packages/config/permissions.ts
export type Permission =
  | "entity:view"
  | "entity:manage"
  | "entity:delete"
  | "billing:view"
  | "billing:manage"
  | "users:view"
  | "users:manage"
  | "users:invite"
  | "journal:read"
  | "journal:write"
  | "journal:approve"
  | "invoices:read"
  | "invoices:write"
  | "invoices:approve"
  | "payroll:read"
  | "payroll:write"
  | "payroll:run"
  | "cash:read"
  | "cash:write"
  | "reconciliation:read"
  | "reconciliation:write"
  | "reports:read"
  | "reports:export"
  | "budget:read"
  | "budget:write"
  | "budget:approve"
  | "audit:read"
  | "audit:export"
  | "tax:read"
  | "tax:file"
  | "settings:read"
  | "settings:write"
  | "chat:use"
  | "chat:view_agent_details"
  | "documents:upload"
  | "documents:read_all"

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  org_owner:          ["entity:view", "entity:manage", "entity:delete", "billing:view", "billing:manage", "users:view", "users:manage", "users:invite", "journal:read", "journal:write", "journal:approve", "invoices:read", "invoices:write", "invoices:approve", "payroll:read", "payroll:write", "payroll:run", "cash:read", "cash:write", "reconciliation:read", "reconciliation:write", "reports:read", "reports:export", "budget:read", "budget:write", "budget:approve", "audit:read", "audit:export", "tax:read", "tax:file", "settings:read", "settings:write", "chat:use", "chat:view_agent_details", "documents:upload", "documents:read_all"],
  org_admin:          ["entity:view", "entity:manage", "users:view", "users:manage", "users:invite", "journal:read", "journal:write", "journal:approve", "invoices:read", "invoices:write", "invoices:approve", "payroll:read", "payroll:write", "payroll:run", "cash:read", "cash:write", "reconciliation:read", "reconciliation:write", "reports:read", "reports:export", "budget:read", "budget:write", "budget:approve", "audit:read", "audit:export", "tax:read", "tax:file", "settings:read", "settings:write", "chat:use", "chat:view_agent_details", "documents:upload", "documents:read_all"],
  finance_director:   ["entity:view", "journal:read", "journal:write", "journal:approve", "invoices:read", "invoices:write", "invoices:approve", "payroll:read", "payroll:run", "cash:read", "cash:write", "reconciliation:read", "reconciliation:write", "reports:read", "reports:export", "budget:read", "budget:write", "budget:approve", "audit:read", "audit:export", "tax:read", "tax:file", "settings:read", "chat:use", "chat:view_agent_details", "documents:upload", "documents:read_all"],
  accountant:         ["entity:view", "journal:read", "journal:write", "invoices:read", "invoices:write", "cash:read", "reconciliation:read", "reconciliation:write", "reports:read", "budget:read", "chat:use", "documents:upload"],
  payroll_officer:    ["entity:view", "payroll:read", "payroll:write", "payroll:run", "reports:read", "chat:use"],
  cashier:            ["entity:view", "cash:read", "cash:write", "invoices:read", "chat:use", "documents:upload"],
  department_manager: ["entity:view", "invoices:read", "reports:read", "budget:read", "budget:write", "chat:use"],
  employee:           ["chat:use", "documents:upload"],
  external_auditor:   ["entity:view", "journal:read", "invoices:read", "reports:read", "reports:export", "audit:read", "audit:export", "tax:read"],
  compliance_officer: ["entity:view", "reports:read", "reports:export", "audit:read", "tax:read", "tax:file"],
}
```

---

## 2. Route Protection Matrix

### Route Definitions

```typescript
// apps/web/lib/auth/routes.ts
import { Permission } from "@xenboox/config/permissions"

type RouteDef = {
  path: string
  label: string
  permissions: Permission[]
  sidebar: boolean
  sidebarGroup?: string
}

export const ROUTE_DEFINITIONS: RouteDef[] = [
  { path: "/dashboard",          label: "Dashboard",       permissions: ["entity:view"],              sidebar: true,  sidebarGroup: "main" },
  { path: "/journal",            label: "Journal",         permissions: ["journal:read"],             sidebar: true,  sidebarGroup: "accounting" },
  { path: "/chart-of-accounts",  label: "Chart of Accounts", permissions: ["journal:read"],           sidebar: true,  sidebarGroup: "accounting" },
  { path: "/invoices",           label: "Invoices",        permissions: ["invoices:read"],            sidebar: true,  sidebarGroup: "accounting" },
  { path: "/invoices/ap",        label: "AP Invoices",     permissions: ["invoices:read"],            sidebar: false, sidebarGroup: "accounting" },
  { path: "/invoices/ar",        label: "AR Invoices",     permissions: ["invoices:read"],            sidebar: false, sidebarGroup: "accounting" },
  { path: "/reconciliation",     label: "Reconciliation",  permissions: ["reconciliation:read"],      sidebar: true,  sidebarGroup: "accounting" },
  { path: "/cash",               label: "Cash & Imprest",  permissions: ["cash:read"],                sidebar: true,  sidebarGroup: "treasury" },
  { path: "/mobile-money",       label: "Mobile Money",    permissions: ["cash:read"],                sidebar: true,  sidebarGroup: "treasury" },
  { path: "/payroll",            label: "Payroll",         permissions: ["payroll:read"],             sidebar: true,  sidebarGroup: "people" },
  { path: "/budget",             label: "Budget",          permissions: ["budget:read"],              sidebar: true,  sidebarGroup: "planning" },
  { path: "/reports",            label: "Reports",         permissions: ["reports:read"],             sidebar: true,  sidebarGroup: "planning" },
  { path: "/tax",                label: "Tax",             permissions: ["tax:read"],                 sidebar: true,  sidebarGroup: "compliance" },
  { path: "/audit",              label: "Audit Trail",     permissions: ["audit:read"],               sidebar: true,  sidebarGroup: "compliance" },
  { path: "/chat",               label: "CFO Agent",       permissions: ["chat:use"],                 sidebar: true,  sidebarGroup: "main" },
  { path: "/documents",          label: "Documents",       permissions: ["documents:read_all"],       sidebar: true,  sidebarGroup: "main" },
  { path: "/users",              label: "Users",           permissions: ["users:view"],               sidebar: true,  sidebarGroup: "admin" },
  { path: "/settings",           label: "Settings",        permissions: ["settings:read"],            sidebar: true,  sidebarGroup: "admin" },
  { path: "/billing",            label: "Billing",         permissions: ["billing:view"],             sidebar: true,  sidebarGroup: "admin" },
]
```

### Route Access by Role

```
Route                    Owner Admin  FD   Acct Payrl Cash  DeptM Emp   Audit Comp
──────────────────────────────────────────────────────────────────────────────────
/dashboard               ✅    ✅    ✅   ✅   ✅    ✅    ✅    ✅   ✅    ✅
/journal                 ✅    ✅    ✅   ✅   ❌    ❌    ❌    ❌   ✅    ❌
/chart-of-accounts       ✅    ✅    ✅   ✅   ❌    ❌    ❌    ❌   ✅    ❌
/invoices                ✅    ✅    ✅   ✅   ❌    ✅    ✅    ❌   ✅    ❌
/reconciliation          ✅    ✅    ✅   ✅   ❌    ❌    ❌    ❌   ❌    ❌
/cash                    ✅    ✅    ✅   ❌   ❌    ✅    ❌    ❌   ❌    ❌
/mobile-money            ✅    ✅    ✅   ❌   ❌    ✅    ❌    ❌   ❌    ❌
/payroll                 ✅    ✅    ✅   ❌   ✅    ❌    ❌    ❌   ❌    ❌
/budget                  ✅    ✅    ✅   ✅   ❌    ❌    ✅    ❌   ❌    ❌
/reports                 ✅    ✅    ✅   ✅   ✅    ❌    ✅    ❌   ✅    ✅
/tax                     ✅    ✅    ✅   ❌   ❌    ❌    ❌    ❌   ✅    ✅
/audit                   ✅    ✅    ✅   ❌   ❌    ❌    ❌    ❌   ✅    ✅
/chat                    ✅    ✅    ✅   ✅   ✅    ✅    ✅    ✅   ❌    ❌
/documents               ✅    ✅    ✅   ✅   ❌    ✅    ❌    ❌   ✅    ❌
/users                   ✅    ✅    ❌   ❌   ❌    ❌    ❌    ❌   ❌    ❌
/settings                ✅    ✅    ✅   ❌   ❌    ❌    ❌    ❌   ❌    ❌
/billing                 ✅    ❌    ❌   ❌   ❌    ❌    ❌    ❌   ❌    ❌
```

---

## 3. Sidebar Navigation Per Role

```typescript
// apps/web/components/layout/sidebar.tsx
"use client"

import { useAuthorization } from "@/lib/hooks/use-authorization"
import { ROUTE_DEFINITIONS } from "@/lib/auth/routes"
import Link from "next/link"
import { usePathname } from "next/navigation"

const GROUP_ORDER = ["main", "accounting", "treasury", "people", "planning", "compliance", "admin"]

const GROUP_LABELS: Record<string, string> = {
  main:       "Overview",
  accounting: "Accounting",
  treasury:   "Treasury",
  people:     "People",
  planning:   "Planning",
  compliance: "Compliance",
  admin:      "Administration",
}

export function Sidebar() {
  const { hasAnyPermission } = useAuthorization()
  const pathname = usePathname()

  const visibleRoutes = ROUTE_DEFINITIONS.filter(
    (r) => r.sidebar && hasAnyPermission(r.permissions)
  )

  const grouped = GROUP_ORDER
    .map((group) => ({
      group,
      label: GROUP_LABELS[group],
      routes: visibleRoutes.filter((r) => r.sidebarGroup === group),
    }))
    .filter((g) => g.routes.length > 0)

  return (
    <nav className="w-64 border-r h-full p-4 space-y-6">
      {grouped.map(({ group, label, routes }) => (
        <div key={group}>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            {label}
          </h4>
          <div className="space-y-1">
            {routes.map((route) => (
              <Link
                key={route.path}
                href={route.path}
                className={`block px-3 py-2 rounded-md text-sm ${
                  pathname.startsWith(route.path)
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted"
                }`}
              >
                {route.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
```

### Sidebar Per Role Example

**Finance Director** sees:
```
Overview       | CFO Agent | Dashboard | Documents
Accounting     | Journal | Chart of Accounts | Invoices | Reconciliation
Treasury       | Cash & Imprest | Mobile Money
People         | Payroll
Planning       | Budget | Reports
Compliance     | Tax | Audit Trail
Administration | Settings
```

**Employee** sees:
```
Overview       | CFO Agent
```

**External Auditor** sees:
```
Overview       | Dashboard
Accounting     | Journal | Invoices | Reports | Audit Trail
Compliance     | Tax
```

---

## 4. Component-Level Permission Strategy

### Individual Permission Hook

```typescript
// apps/web/lib/hooks/use-authorization.ts
"use client"

import { useSession } from "@/lib/auth/use-session"
import { ROLE_PERMISSIONS, Permission } from "@xenboox/config/permissions"

export function useAuthorization() {
  const { data: session } = useSession()
  const role = session?.user?.role as string | undefined
  const permissions = role ? ROLE_PERMISSIONS[role] ?? [] : []

  return {
    role,
    permissions,
    hasPermission: (permission: Permission) => permissions.includes(permission),
    hasAnyPermission: (perms: Permission[]) => perms.some((p) => permissions.includes(p)),
    hasAllPermissions: (perms: Permission[]) => perms.every((p) => permissions.includes(p)),
    isAtLeast: (minimumRole: string) => {
      const hierarchy = ["employee", "department_manager", "cashier", "payroll_officer", "accountant", "compliance_officer", "finance_director", "org_admin", "org_owner"]
      return hierarchy.indexOf(role ?? "") >= hierarchy.indexOf(minimumRole)
    },
  }
}
```

### Component Wrapper: `<Can>` / `<ElseCan>`

```typescript
// apps/web/components/auth/can.tsx
import { useAuthorization } from "@/lib/hooks/use-authorization"
import type { Permission } from "@xenboox/config/permissions"

type CanProps = {
  permission: Permission
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function Can({ permission, fallback = null, children }: CanProps) {
  const { hasPermission } = useAuthorization()
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>
}

export function CanAny({ permissions, fallback = null, children }: {
  permissions: Permission[]
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const { hasAnyPermission } = useAuthorization()
  return hasAnyPermission(permissions) ? <>{children}</> : <>{fallback}</>
}
```

### Usage Examples

```tsx
// Hide the "Post Journal Entry" button from auditors
<Can permission="journal:write" fallback={<ViewOnlyBadge />}>
  <Button onClick={openJournalForm}>Post Journal Entry</Button>
</Can>

// Show approval actions only to finance director and above
<CanAny permissions={["journal:approve", "invoices:approve"]}>
  <ApproveButton invoiceId={id} />
</CanAny>

// Conditionally render table columns
const columns = [
  { header: "Amount", accessor: "amount" },
  { header: "Date", accessor: "date" },
  ...(hasPermission("journal:approve")
    ? [{ header: "Actions", accessor: "actions" }]
    : []),
]

// Hide entire sections
{hasPermission("audit:read") && (
  <Section title="Audit Trail">
    <AuditLogTable entityId={entityId} />
  </Section>
)}
```

---

## 5. Next.js Middleware (Route Protection)

```typescript
// apps/web/middleware.ts
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { ROLE_PERMISSIONS, Permission } from "@xenboox/config/permissions"
import { ROUTE_DEFINITIONS } from "@/lib/auth/routes"

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth

  // Allow auth routes
  if (nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register")) {
    if (session) return NextResponse.redirect(new URL("/dashboard", nextUrl))
    return NextResponse.next()
  }

  // Require auth for all other routes
  if (!session) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  // Find matching route definition
  const matchedRoute = ROUTE_DEFINITIONS.find(
    (r) => nextUrl.pathname === r.path || nextUrl.pathname.startsWith(r.path + "/")
  )

  if (matchedRoute) {
    const role = session.user.role as string
    const userPermissions = ROLE_PERMISSIONS[role] ?? []

    // Check if user has any of the required permissions
    const authorized = matchedRoute.permissions.some(
      (p: Permission) => userPermissions.includes(p)
    )

    if (!authorized) {
      return NextResponse.rewrite(new URL("/unauthorized", nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
```

### Middleware Config Note

For Vercel Edge, the middleware runs at the edge before the request hits the serverless function. This means:
- Unauthenticated requests are redirected before any serverless invocation
- Unauthorized access is caught early (no DB hit for permission check — role from session)
- Route definitions need to be importable in edge runtime (no Node.js deps)

---

## 6. "Unauthorized" Handling

### Three-Tier Response

| Layer | Mechanism | UX |
|-------|-----------|-----|
| **Middleware** | Rewrite to `/unauthorized` | Full page: "You don't have access to this page" |
| **tRPC** | `TRPCError({ code: "FORBIDDEN" })` | Toast + redirect to dashboard |
| **Component** | `<Can>` wrapper | Section hidden, no explanation needed |

### `/unauthorized` Page

```tsx
// apps/web/app/unauthorized/page.tsx
import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground">
        You don't have permission to access this page.
      </p>
      <p className="text-sm text-muted-foreground">
        If you believe this is a mistake, contact your organization admin.
      </p>
      <Link href="/dashboard" className="text-primary hover:underline">
        Go to Dashboard
      </Link>
    </div>
  )
}
```

### tRPC Error Handling on Client

```tsx
// apps/web/components/shared/trpc-error-toast.tsx
// Inside the root layout or provider
import { TRPCClientError } from "@trpc/client"
import { toast } from "sonner"

// In your TRPC provider config:
const onError = (err: TRPCClientError) => {
  if (err.data?.code === "FORBIDDEN" || err.data?.code === "UNAUTHORIZED") {
    toast.error("You don't have permission to perform this action")
    // Optional: redirect
    // router.push("/dashboard")
  }
}
```

---

## 7. CFO Agent Chat Per Role

The CFO Agent chat adapts its capabilities, responses, and UI based on the user's role:

| Role | Can Chat | Sees Agent Details | Can Delegate | Sees Confidence |
|------|----------|-------------------|-------------|-----------------|
| Org Owner | ✅ Full | ✅ Yes | ✅ Yes | ✅ Always |
| Org Admin | ✅ Full | ✅ Yes | ✅ Yes | ✅ Always |
| Finance Director | ✅ Full | ✅ Yes | ✅ Yes | ✅ Always |
| Accountant | ✅ Full | ✅ Inline (collapsible) | ❌ No | ✅ Always |
| Payroll Officer | ✅ Limited (payroll scope) | ❌ No | ❌ No | ❌ Hidden |
| Cashier | ✅ Limited (cash scope) | ❌ No | ❌ No | ❌ Hidden |
| Department Manager | ✅ Budget/invoices only | ❌ No | ❌ No | ❌ Hidden |
| Employee | ✅ Self-service only | ❌ No | ❌ No | ❌ Hidden |
| External Auditor | ✅ Read-only | ✅ Yes | ❌ No | ✅ Always |
| Compliance Officer | ✅ Tax/compliance scope | ✅ Yes | ❌ No | ✅ Always |

### Scoped Agent Context

```typescript
// apps/web/app/api/chat/stream/route.ts (extended)
const AGENT_SCOPES: Record<string, {
  allowedTopics: string[]
  showAgentDetails: boolean
  canDelegateTo: string[]
}> = {
  org_owner:          { allowedTopics: ["*"],                                        showAgentDetails: true,  canDelegateTo: ["*"] },
  org_admin:          { allowedTopics: ["*"],                                        showAgentDetails: true,  canDelegateTo: ["*"] },
  finance_director:   { allowedTopics: ["*"],                                        showAgentDetails: true,  canDelegateTo: ["*"] },
  accountant:         { allowedTopics: ["journal", "invoices", "reconciliation"],    showAgentDetails: true,  canDelegateTo: [] },
  payroll_officer:    { allowedTopics: ["payroll"],                                  showAgentDetails: false, canDelegateTo: [] },
  cashier:            { allowedTopics: ["cash", "mobile-money", "invoices"],         showAgentDetails: false, canDelegateTo: [] },
  department_manager: { allowedTopics: ["budget", "expenses", "reports"],            showAgentDetails: false, canDelegateTo: [] },
  employee:           { allowedTopics: ["expenses", "payslips", "leave"],            showAgentDetails: false, canDelegateTo: [] },
  external_auditor:   { allowedTopics: ["reports", "journal", "audit"],              showAgentDetails: true,  canDelegateTo: [] },
  compliance_officer: { allowedTopics: ["tax", "compliance", "reports"],             showAgentDetails: true,  canDelegateTo: [] },
}

export async function POST(req: Request) {
  const session = await auth()
  const role = session?.user?.role ?? "employee"
  const scope = AGENT_SCOPES[role]

  // Inject scope into the agent's system prompt
  const systemPrompt = buildChatPrompt({
    role,
    allowedTopics: scope.allowedTopics,
    showAgentDetails: scope.showAgentDetails,
    canDelegateTo: scope.canDelegateTo,
  })

  // Continue with streaming...
}
```

### Chat UI Adaptation

```tsx
// apps/web/components/chat/chat-header.tsx
"use client"

import { useAuthorization } from "@/lib/hooks/use-authorization"

export function ChatHeader() {
  const { hasPermission } = useAuthorization()

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <h2 className="font-semibold">CFO Agent</h2>
        {hasPermission("chat:view_agent_details") ? (
          <p className="text-xs text-muted-foreground">
            Powered by Claude Sonnet 4.6 | Confidence scores visible
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Ask me anything about your finances
          </p>
        )}
      </div>

      {hasPermission("chat:view_agent_details") && (
        <SettingsDropdown />  {/* Agent config, model selection, etc. */}
      )}
    </div>
  )
}
```

---

## 8. Role Assignment Rules

| Assignment | Who Can Assign | Notes |
|------------|---------------|-------|
| Org Owner | System (first user) | Single owner per org |
| Org Admin | Org Owner | Max 3 per org |
| Finance Director | Org Admin | One per entity by default |
| Accountant | Finance Director | Multiple per entity |
| Payroll Officer | Finance Director | Separate from accounting role |
| Cashier | Finance Director | Separate from accounting role |
| Department Manager | Finance Director | Typically 1 per department entity |
| Employee | Department Manager | Bulk import via CSV |
| External Auditor | Org Owner | Time-limited access |
| Compliance Officer | Org Owner | Read-only + flagging |

---

*Last updated: July 2026*
*Reference: ARCHITECTURE.md §3 (Role Hierarchy), XENBOOX_PRD.md §9 for user types, docs/STREAMING_CHAT_ARCHITECTURE.md for chat patterns*
