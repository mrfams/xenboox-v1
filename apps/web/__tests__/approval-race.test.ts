// ─── §20.2 Approval workflow state-transition races ────────────────────────
//
// Three approval surfaces must validate state transitions server-side so a
// double-approval (two concurrent requests) or approve-after-reject can
// never silently double-post, flip a decided entry, or duplicate audit rows:
//
//   1. approvals.resolve (journal entries + agent escalations) — the
//      financial approval center.
//   2. closeCenter.updateTaskStatus — month-end close task transitions.
//   3. ap.approvePO — purchase order approval.
//
// The fix is an ATOMIC conditional UPDATE (the WHERE clause carries the
// current-state guard), so the second racer affects 0 rows and gets a
// CONFLICT (or an idempotent no-op for close tasks) instead of overwriting.
// These tests drive the REAL routers via createCaller with a mocked db and
// assert the race outcomes.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────

let updateReturning: unknown[] = [];

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue(updateReturning),
        })),
      })),
    })),
    execute: vi.fn().mockResolvedValue(undefined),
    query: {
      sessions: { findFirst: vi.fn().mockResolvedValue({ id: "sess-1" }) },
      users: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: "user-1", emailVerified: true }),
      },
      orgRoles: {
        // Entity-scoping middleware: an org-level role grants full access.
        findFirst: vi
          .fn()
          .mockResolvedValue({
            userId: "user-1",
            orgId: "org-1",
            role: "owner",
          }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      organizations: {
        findFirst: vi.fn().mockResolvedValue({ plan: "growth" }),
      },
      entities: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: "entity-1", organizationId: "org-1" }),
      },
      userEntityAccess: { findFirst: vi.fn() },
      // requirePermission (RBAC matrix): owner role has full access.
      rolePermissions: {
        findFirst: vi.fn().mockResolvedValue({ scope: "full" }),
      },
      journalEntries: { findFirst: vi.fn() },
      agentRoutingLogs: { findFirst: vi.fn() },
      purchaseOrders: { findFirst: vi.fn() },
      closeTasks: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { appRouter } from "@/server/routers/_app";

const session = { user: { id: "user-1", email: "u@example.com", name: "U" } };

const caller = appRouter.createCaller({
  session,
  entityId: "entity-1",
  entityRole: "owner",
  headers: {},
} as never);

const JE_ID = "00000000-0000-4000-8000-000000000001";
const LOG_ID = "00000000-0000-4000-8000-000000000002";
const TASK_ID = "00000000-0000-4000-8000-000000000003";
const PO_ID = "00000000-0000-4000-8000-000000000004";

const DRAFT_ENTRY = {
  id: JE_ID,
  entityId: "entity-1",
  status: "draft",
  entryNumber: "JE-2026-0001",
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  updateReturning = [];
  vi.mocked(auth).mockResolvedValue(session as never);
});

// ─── 1. approvals.resolve — journal entries ───────────────────────────────

describe("§20.2 approvals.resolve — journal entry double-approval race", () => {
  it("approves a draft entry exactly once; a concurrent second approve hits CONFLICT", async () => {
    vi.mocked(db.query.journalEntries.findFirst).mockResolvedValue(
      DRAFT_ENTRY as never,
    );
    updateReturning = [DRAFT_ENTRY]; // first racer wins

    const first = await caller.approvals.resolve({
      itemId: JE_ID,
      itemType: "journal_entry",
      action: "approved",
    });
    expect(first.success).toBe(true);
    expect(first.action).toBe("approved");

    // Second racer: the entry is now posted, the guarded UPDATE affects 0 rows.
    updateReturning = [];
    await expect(
      caller.approvals.resolve({
        itemId: JE_ID,
        itemType: "journal_entry",
        action: "approved",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects an approve-after-reject (entry already voided → CONFLICT)", async () => {
    vi.mocked(db.query.journalEntries.findFirst).mockResolvedValue({
      ...DRAFT_ENTRY,
      status: "voided",
    } as never);
    updateReturning = []; // guarded UPDATE matches nothing

    await expect(
      caller.approvals.resolve({
        itemId: JE_ID,
        itemType: "journal_entry",
        action: "approved",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects a rejected-after-approve (entry already posted → CONFLICT)", async () => {
    vi.mocked(db.query.journalEntries.findFirst).mockResolvedValue({
      ...DRAFT_ENTRY,
      status: "posted",
    } as never);
    updateReturning = [];

    await expect(
      caller.approvals.resolve({
        itemId: JE_ID,
        itemType: "journal_entry",
        action: "rejected",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("does not flip an entry when the approval action is rejected", async () => {
    vi.mocked(db.query.journalEntries.findFirst).mockResolvedValue(
      DRAFT_ENTRY as never,
    );
    updateReturning = [DRAFT_ENTRY];

    const res = await caller.approvals.resolve({
      itemId: JE_ID,
      itemType: "journal_entry",
      action: "rejected",
    });
    expect(res.success).toBe(true);
  });
});

// ─── 1b. approvals.resolve — agent escalations ────────────────────────────

describe("§20.2 approvals.resolve — agent escalation double-resolution race", () => {
  const ESCALATED = {
    id: LOG_ID,
    entityId: "entity-1",
    decision: "escalated",
    humanResponse: null,
    inputSummary: "Low confidence journal draft",
  } as const;

  it("resolves an escalation once; a second concurrent resolve hits CONFLICT", async () => {
    vi.mocked(db.query.agentRoutingLogs.findFirst).mockResolvedValue(
      ESCALATED as never,
    );
    updateReturning = [ESCALATED]; // first racer claims it

    const first = await caller.approvals.resolve({
      itemId: LOG_ID,
      itemType: "agent_escalation",
      action: "approved",
    });
    expect(first.success).toBe(true);

    // Second racer: humanResponse is now set → 0 rows → CONFLICT.
    updateReturning = [];
    await expect(
      caller.approvals.resolve({
        itemId: LOG_ID,
        itemType: "agent_escalation",
        action: "approved",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

// ─── 2. closeCenter.updateTaskStatus ──────────────────────────────────────

describe("§20.2 closeCenter.updateTaskStatus — double-complete race", () => {
  const TASK = {
    id: TASK_ID,
    entityId: "entity-1",
    status: "in_progress",
    name: "Reconcile bank",
    taskKey: "bank_recon",
    blockedReason: null,
  } as const;

  it("completes a task once; a concurrent same-state update is an idempotent no-op with NO duplicate audit", async () => {
    vi.mocked(db.query.closeTasks.findFirst).mockResolvedValue(TASK as never);
    updateReturning = [TASK]; // first racer wins

    const first = await caller.closeCenter.updateTaskStatus({
      id: TASK_ID,
      status: "completed",
    });
    expect(first.success).toBe(true);
    expect(db.insert).toHaveBeenCalledTimes(1); // one audit row

    // Second racer: task already completed → guarded UPDATE (status != completed)
    // affects 0 rows → idempotent success, no second audit row.
    updateReturning = [];
    vi.mocked(db.query.closeTasks.findFirst).mockResolvedValue({
      ...TASK,
      status: "completed",
    } as never);

    const second = await caller.closeCenter.updateTaskStatus({
      id: TASK_ID,
      status: "completed",
    });
    expect(second.success).toBe(true);
    expect(second.message).toContain("already");
    expect(db.insert).toHaveBeenCalledTimes(1); // still exactly one audit row
  });
});

// ─── 3. ap.approvePO ──────────────────────────────────────────────────────

describe("§20.2 ap.approvePO — double-approval race", () => {
  it("approves a draft PO; a second concurrent approve hits CONFLICT (not silent success)", async () => {
    const PO = { id: PO_ID, entityId: "entity-1", status: "draft" } as const;
    updateReturning = [PO];

    const first = await caller.ap.approvePO({ id: PO_ID });
    expect(first?.id).toBe(PO_ID);

    // Second racer: PO is now approved → guarded UPDATE (status = draft) matches
    // nothing → CONFLICT instead of the old silent `undefined` success.
    updateReturning = [];
    await expect(caller.ap.approvePO({ id: PO_ID })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
