# RBAC Overhaul — Fix Owner + Configurable Approvals + Permission Overrides

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the RBAC system work for every business size — from a 1-person freelancer to a 50+ person company — with configurable approvals, granular permission overrides, and AI chat for everyone.

**Architecture:** Fix the `owner` role to have full access to everything (GL, payroll, settings, all modules). Make approval workflows configurable per entity (not hardcoded per role). Enable per-user permission overrides via a simple UI toggle. Grant AI chat access to all roles (AI enforces permissions internally). The existing RBAC matrix stays as the base; overrides layer on top.

**Tech Stack:** Drizzle ORM, PostgreSQL enums, tRPC, React, Zod, LangFuse

**Spec:** This plan (docs/superpowers/plans/2025-01-rbac-overhaul.md)

---

## Global Constraints

- Strict TypeScript, no `any` types
- All DB queries entity-scoped (`entityId` filter)
- Migrations generated via Drizzle, never hand-written
- Server enforces permissions via `requirePermission` middleware
- Client uses `<Can>` / `<CanScope>` for UI rendering only
- Every change logged to `permission_audit_log`
- Zod validation on all tRPC inputs

---

## Phase 1: Fix Owner Permissions (Full Access)

The `owner` role should have full access to everything — GL create/edit, full payroll view, all modules. A 1-person business signs up, gets `owner`, and they can do everything. No separate "solo" role needed.

### Task 1.1: Fix owner seed permissions

**Files:**

- Modify: `packages/db/seed/permissions.ts` (expand owner permissions)

**Interfaces:**

- Consumes: existing `rolePermissions` table
- Produces: owner gets full access to all modules, all actions, scope: "full"

- [ ] **Step 1: Fix owner GL permissions — add create/edit/post**

```typescript
// packages/db/seed/permissions.ts — add these entries for owner
// Owner can now CREATE, EDIT, POST to the general ledger (previously denied)
{ role: "owner", module: "general_ledger", action: "create", scope: "full" },
{ role: "owner", module: "general_ledger", action: "edit", scope: "full" },
{ role: "owner", module: "general_ledger", action: "post", scope: "full" },
```

- [ ] **Step 2: Fix owner payroll permissions — full view (not just summary)**

```typescript
// packages/db/seed/permissions.ts — owner gets full payroll view
// Previously: view=scoped (summary only), now: view=full
// Remove the old scoped entry, add full:
{ role: "owner", module: "payroll", action: "view", scope: "full" },
{ role: "owner", module: "payroll", action: "create", scope: "full" },
{ role: "owner", module: "payroll", action: "edit", scope: "full" },
```

- [ ] **Step 3: Fix owner expense management — add create/edit**

```typescript
// packages/db/seed/permissions.ts — owner gets full expense management
{ role: "owner", module: "expense_management", action: "create", scope: "full" },
{ role: "owner", module: "expense_management", action: "edit", scope: "full" },
```

- [ ] **Step 4: Fix owner mobile money — add create/edit**

```typescript
// packages/db/seed/permissions.ts — owner gets full mobile money
{ role: "owner", module: "mobile_money", action: "create", scope: "full" },
{ role: "owner", module: "mobile_money", action: "edit", scope: "full" },
```

- [ ] **Step 5: Fix owner cash imprest — add create/edit**

```typescript
// packages/db/seed/permissions.ts — owner gets full cash imprest
{ role: "owner", module: "cash_imprest", action: "create", scope: "full" },
{ role: "owner", module: "cash_imprest", action: "edit", scope: "full" },
```

- [ ] **Step 6: Fix owner bank reconciliation — add create/edit**

```typescript
// packages/db/seed/permissions.ts — owner gets full bank reconciliation
{ role: "owner", module: "bank_reconciliation", action: "create", scope: "full" },
{ role: "owner", module: "bank_reconciliation", action: "edit", scope: "full" },
```

- [ ] **Step 7: Fix owner chart of accounts — add create/edit**

```typescript
// packages/db/seed/permissions.ts — owner gets full chart of accounts
{ role: "owner", module: "chart_of_accounts", action: "create", scope: "full" },
{ role: "owner", module: "chart_of_accounts", action: "edit", scope: "full" },
```

- [ ] **Step 8: Fix owner invoicing — add create/edit (if not already)**

```typescript
// packages/db/seed/permissions.ts — owner gets full invoicing
{ role: "owner", module: "invoicing", action: "view", scope: "full" },
{ role: "owner", module: "invoicing", action: "create", scope: "full" },
{ role: "owner", module: "invoicing", action: "edit", scope: "full" },
{ role: "owner", module: "invoicing", action: "approve", scope: "full" },
{ role: "owner", module: "invoicing", action: "delete", scope: "full" },
{ role: "owner", module: "invoicing", action: "export", scope: "full" },
```

- [ ] **Step 9: Seed the database**

```bash
pnpm db:seed
```

- [ ] **Step 10: Typecheck**

```bash
pnpm typecheck --filter=web
```

- [ ] **Step 11: Commit**

```bash
git add packages/db/seed/permissions.ts
git commit -m "feat(rbac): expand owner to full access — GL, payroll, expenses, all modules"
```

---

### Task 1.2: Verify owner UI config is correct

**Files:**

- Read: `apps/web/lib/role-config.ts` (verify owner config)

**Interfaces:**

- Consumes: existing owner RoleConfig
- Produces: confirmation that owner has full access in UI

- [ ] **Step 1: Verify owner config**

```typescript
// apps/web/lib/role-config.ts — owner config should already have:
// surfaces: FULL_SURFACES ✓
// canAccessSettings: true ✓
// canAccessAdmin: true ✓
// showAiChat: true ✓
// showCreateButtons: true ✓
// No changes needed — the seed data fixes the server-side permissions
```

- [ ] **Step 2: Commit (no changes needed)**

```bash
# No commit needed — verification only
```

---

## Phase 2: Configurable Approval Workflows

Instead of hardcoding "this role requires approval," let the owner/admin decide per entity. A solo business turns approvals OFF. A 10-person business turns them ON.

### Task 2.1: Add entity approval settings

**Files:**

- Modify: `packages/db/schema/organization.ts` (add approval settings to entities table)
- Create: migration

**Interfaces:**

- Consumes: existing `entities` table
- Produces: `approvalSettings` JSONB column on entities

- [ ] **Step 1: Add approval settings column to entities**

```typescript
// packages/db/schema/organization.ts — entities table
approvalSettings: jsonb("approval_settings").default({
  enabled: false,
  expenseApprovalRequired: false,
  payrollApprovalRequired: false,
  purchaseApprovalRequired: false,
  approvalThreshold: 0,
  selfApprovalAllowed: true,
}).$type<{
  enabled: boolean;
  expenseApprovalRequired: boolean;
  payrollApprovalRequired: boolean;
  purchaseApprovalRequired: boolean;
  approvalThreshold: number; // amount above which approval is required
  selfApprovalAllowed: boolean; // can owner approve their own stuff?
}>(),
```

- [ ] **Step 2: Generate migration**

```bash
pnpm db:generate
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck --filter=web
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/schema/organization.ts packages/db/migrations/
git commit -m "feat(rbac): add configurable approval settings per entity"
```

---

### Task 2.2: Build approval settings tRPC router

**Files:**

- Create: `apps/web/server/routers/approval-settings.ts`

**Interfaces:**

- Consumes: `entities.approvalSettings` column, `protectedProcedure`, `requireRole`
- Produces: `approvalSettings.get`, `approvalSettings.update` procedures

- [ ] **Step 1: Write the router**

```typescript
// apps/web/server/routers/approval-settings.ts
import { z } from "zod";
import { eq } from "drizzle-orm";
import { entities } from "@xenboox/db/schema/organization";
import { protectedProcedure, router, requireRole } from "@/lib/trpc/server";
import { db } from "@/lib/db";

const approvalSettingsSchema = z.object({
  enabled: z.boolean(),
  expenseApprovalRequired: z.boolean(),
  payrollApprovalRequired: z.boolean(),
  purchaseApprovalRequired: z.boolean(),
  approvalThreshold: z.number().min(0),
  selfApprovalAllowed: z.boolean(),
});

export const approvalSettingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const entity = await db.query.entities.findFirst({
      where: eq(entities.id, ctx.entityId!),
      columns: { approvalSettings: true },
    });
    return (
      entity?.approvalSettings ?? {
        enabled: false,
        expenseApprovalRequired: false,
        payrollApprovalRequired: false,
        purchaseApprovalRequired: false,
        approvalThreshold: 0,
        selfApprovalAllowed: true,
      }
    );
  }),

  update: protectedProcedure
    .use(requireRole("owner", "admin"))
    .input(approvalSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      await db
        .update(entities)
        .set({ approvalSettings: input })
        .where(eq(entities.id, ctx.entityId!));

      // Audit log
      // ... log the change

      return { success: true };
    }),
});
```

- [ ] **Step 2: Register in main router**

```typescript
// apps/web/server/routers/_app.ts — add to merge
import { approvalSettingsRouter } from "./approval-settings";

export const appRouter = router({
  // ... existing routers
  approvalSettings: approvalSettingsRouter,
});
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck --filter=web
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/server/routers/approval-settings.ts apps/web/server/routers/_app.ts
git commit -m "feat(rbac): add approval settings tRPC router"
```

---

### Task 2.3: Build approval settings UI

**Files:**

- Create: `apps/web/components/settings/approval-settings.tsx`
- Modify: `apps/web/app/dashboard/settings/page.tsx` (add approval tab)

**Interfaces:**

- Consumes: `trpc.approvalSettings.get`, `trpc.approvalSettings.update`
- Produces: Settings page section with toggle switches

- [ ] **Step 1: Create ApprovalSettings component**

```tsx
// apps/web/components/settings/approval-settings.tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ApprovalSettings() {
  const { data: settings, isLoading } = trpc.approvalSettings.get.useQuery();
  const updateSettings = trpc.approvalSettings.update.useMutation();

  if (isLoading || !settings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Workflows</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="enabled">Enable approval workflows</Label>
          <Switch
            id="enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) =>
              updateSettings.mutate({ ...settings, enabled: checked })
            }
          />
        </div>

        {settings.enabled && (
          <>
            <div className="flex items-center justify-between">
              <Label htmlFor="expense">Expense approval required</Label>
              <Switch
                id="expense"
                checked={settings.expenseApprovalRequired}
                onCheckedChange={(checked) =>
                  updateSettings.mutate({
                    ...settings,
                    expenseApprovalRequired: checked,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="payroll">Payroll approval required</Label>
              <Switch
                id="payroll"
                checked={settings.payrollApprovalRequired}
                onCheckedChange={(checked) =>
                  updateSettings.mutate({
                    ...settings,
                    payrollApprovalRequired: checked,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="purchase">Purchase approval required</Label>
              <Switch
                id="purchase"
                checked={settings.purchaseApprovalRequired}
                onCheckedChange={(checked) =>
                  updateSettings.mutate({
                    ...settings,
                    purchaseApprovalRequired: checked,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Approval threshold ($)</Label>
              <Input
                id="threshold"
                type="number"
                value={settings.approvalThreshold}
                onChange={(e) =>
                  updateSettings.mutate({
                    ...settings,
                    approvalThreshold: Number(e.target.value),
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Transactions above this amount require approval
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="self-approve">Allow self-approval</Label>
              <Switch
                id="self-approve"
                checked={settings.selfApprovalAllowed}
                onCheckedChange={(checked) =>
                  updateSettings.mutate({
                    ...settings,
                    selfApprovalAllowed: checked,
                  })
                }
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Add to settings page**

```typescript
// apps/web/app/dashboard/settings/page.tsx — add ApprovalSettings component
import { ApprovalSettings } from "@/components/settings/approval-settings";

// In the page render:
<ApprovalSettings />
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck --filter=web
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/settings/approval-settings.tsx apps/web/app/dashboard/settings/page.tsx
git commit -m "feat(rbac): add approval settings UI in settings page"
```

---

## Phase 3: Per-User Permission Overrides UI

Owner/admin can toggle specific permissions for any user. The `user_permission_overrides` table already exists — we just need a UI.

### Task 3.1: Build permission override tRPC procedures

**Files:**

- Modify: `apps/web/server/routers/permissions-admin.ts` (already exists — add procedures)

**Interfaces:**

- Consumes: `userPermissionOverrides` table, `protectedProcedure`, `requireRole`
- Produces: `permissionsAdmin.getForUser`, `permissionsAdmin.grant`, `permissionsAdmin.revoke`

- [ ] **Step 1: Add getForUser procedure**

```typescript
// apps/web/server/routers/permissions-admin.ts — add to router
getForUser: protectedProcedure
  .use(requireRole("owner", "admin"))
  .input(z.object({ userId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const overrides = await db.query.userPermissionOverrides.findMany({
      where: and(
        eq(userPermissionOverrides.userId, input.userId),
        eq(userPermissionOverrides.entityId, ctx.entityId!),
      ),
    });
    return overrides;
  }),
```

- [ ] **Step 2: Add grant procedure**

```typescript
grant: protectedProcedure
  .use(requireRole("owner", "admin"))
  .input(
    z.object({
      userId: z.string().uuid(),
      module: z.string(),
      action: z.string(),
      grant: z.boolean(),
      reason: z.string().optional(),
      expiresAt: z.date().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    // Upsert the override
    await db
      .insert(userPermissionOverrides)
      .values({
        userId: input.userId,
        entityId: ctx.entityId!,
        module: input.module as any,
        action: input.action as any,
        grant: input.grant,
        grantedBy: ctx.session!.user!.id!,
        reason: input.reason,
        expiresAt: input.expiresAt,
      })
      .onConflictDoUpdate({
        target: [
          userPermissionOverrides.userId,
          userPermissionOverrides.entityId,
          userPermissionOverrides.module,
          userPermissionOverrides.action,
        ],
        set: {
          grant: input.grant,
          reason: input.reason,
          expiresAt: input.expiresAt,
        },
      });

    // Audit log
    await db.insert(permissionAuditLog).values({
      userId: ctx.session!.user!.id!,
      action: input.grant ? "override_granted" : "override_revoked",
      targetUserId: input.userId,
      module: input.module as any,
      actionName: input.action as any,
      details: input.reason ?? `Permission ${input.grant ? "granted" : "revoked"} by owner/admin`,
    });

    clearPermissionCache();
    return { success: true };
  }),
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck --filter=web
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/server/routers/permissions-admin.ts
git commit -m "feat(rbac): add permission override get/grant procedures"
```

---

### Task 3.2: Build permission override UI

**Files:**

- Create: `apps/web/components/settings/permission-overrides.tsx`
- Modify: `apps/web/app/dashboard/settings/page.tsx`

**Interfaces:**

- Consumes: `trpc.permissionsAdmin.getForUser`, `trpc.permissionsAdmin.grant`
- Produces: Permission toggle grid per user

- [ ] **Step 1: Create PermissionOverrides component**

```tsx
// apps/web/components/settings/permission-overrides.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MODULES = [
  "general_ledger",
  "chart_of_accounts",
  "bank_reconciliation",
  "accounts_payable",
  "accounts_receivable",
  "cash_imprest",
  "payroll",
  "expense_management",
  "fixed_assets",
  "inventory",
  "budgeting",
  "financial_reporting",
  "tax_compliance",
  "document_management",
  "settings_users",
  "settings_entities",
];

const ACTIONS = ["view", "create", "edit", "approve", "delete", "export"];

export function PermissionOverrides({ userId }: { userId: string }) {
  const [selectedUser, setSelectedUser] = useState(userId);
  const { data: overrides } = trpc.permissionsAdmin.getForUser.useQuery(
    { userId: selectedUser },
    { enabled: !!selectedUser },
  );
  const grantMutation = trpc.permissionsAdmin.grant.useMutation();

  const hasOverride = (module: string, action: string) => {
    const override = overrides?.find(
      (o) => o.module === module && o.action === action,
    );
    return override?.grant ?? null; // null = no override, use role default
  };

  const togglePermission = (module: string, action: string, grant: boolean) => {
    grantMutation.mutate({
      userId: selectedUser,
      module,
      action,
      grant,
      reason: `Owner/admin override via settings UI`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permission Overrides</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Module</th>
                {ACTIONS.map((action) => (
                  <th key={action} className="text-center p-2 capitalize">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((module) => (
                <tr key={module} className="border-b">
                  <td className="p-2 font-medium">
                    {module.replace(/_/g, " ")}
                  </td>
                  {ACTIONS.map((action) => {
                    const override = hasOverride(module, action);
                    return (
                      <td key={action} className="text-center p-2">
                        <Switch
                          checked={override ?? false}
                          onCheckedChange={(checked) =>
                            togglePermission(module, action, checked)
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Add to settings page (admin section)**

```typescript
// apps/web/app/dashboard/settings/page.tsx
import { PermissionOverrides } from "@/components/settings/permission-overrides";

// In the admin/team section:
<PermissionOverrides userId={selectedUserId} />
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck --filter=web
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/settings/permission-overrides.tsx apps/web/app/dashboard/settings/page.tsx
git commit -m "feat(rbac): add permission overrides UI with toggle grid"
```

---

## Phase 4: AI Chat for All Roles

Every role gets AI chat access. The AI enforces permissions internally — it won't let an Employee approve an invoice, but it WILL let them ask about their payslip.

### Task 4.1: Enable AI chat for all roles in UI config

**Files:**

- Modify: `apps/web/lib/role-config.ts` (set showAiChat: true for all roles)

**Interfaces:**

- Consumes: existing ROLE_CONFIGS
- Produces: all roles have `showAiChat: true`

- [ ] **Step 1: Update all roles to show AI chat**

```typescript
// apps/web/lib/role-config.ts — update these roles:
// payroll_officer: showAiChat: false → true
// cashier: showAiChat: false → true
// employee: showAiChat: false → true
// external_auditor: showAiChat: false → true
// donor: showAiChat: false → true
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck --filter=web
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/role-config.ts
git commit -m "feat(rbac): enable AI chat for all roles"
```

---

## After Building

### Verification Steps

1. **Typecheck:** `pnpm typecheck --filter=web`
2. **Lint:** `pnpm lint --filter=web`
3. **Test:** `pnpm test --filter=web` (if RBAC tests exist)
4. **Seed:** `pnpm db:seed` (re-seed permissions with expanded owner)
5. **Manual Test:**
   - Sign up as new user → should get `owner` role
   - Verify owner can access GL create/edit, full payroll, all modules
   - Invite a team member → assign them a specific role
   - Toggle approval settings → verify they save
   - Grant permission override → verify it takes effect
   - Verify AI chat appears for all roles

### What I Won't Touch

- Agent code (packages/agents/) — permission enforcement is server-side tRPC
- Mobile/Desktop — already removed from repo
- Admin platform roles (super_admin, etc.) — separate system, not affected
- Existing role definitions for admin/finance_director/accountant/etc. — only expanding owner
- Database schema enum — no new roles added, just fixing seed data

---

## Summary

| Phase | What                                                | Business Size Served |
| ----- | --------------------------------------------------- | -------------------- |
| 1     | Fix owner to full access (GL, payroll, all modules) | 1-person business    |
| 2     | Configurable approvals                              | All sizes            |
| 3     | Permission overrides UI                             | All sizes            |
| 4     | AI chat for everyone                                | All sizes            |

The existing 11 roles stay unchanged. Owner gets expanded to full access. Approvals become configurable per entity. Permission overrides let owner/admin customize per user. No breaking changes, no new enum values.
