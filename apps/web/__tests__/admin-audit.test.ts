import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  writeAdminAudit,
  withAdminAudit,
  buildAuditEntry,
} from "@/lib/admin/audit";
import type { AdminRole } from "@/lib/admin/roles";

describe("admin audit util", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("buildAuditEntry attaches actor identity and timestamps", () => {
    const entry = buildAuditEntry({
      actorAdminUserId: "admin-1",
      actorRoleAtTimeOfAction: "ops_admin",
      actionType: "prompt.update",
      targetEntityType: "prompt",
      targetEntityId: "prompt-9",
      beforeValue: { text: "old" },
      afterValue: { text: "new" },
      reason: "Tweak system prompt",
      ipAddress: "203.0.113.7",
      userAgent: "test-agent",
    });

    expect(entry.actorAdminUserId).toBe("admin-1");
    expect(entry.actorRoleAtTimeOfAction).toBe("ops_admin" satisfies AdminRole);
    expect(entry.actionType).toBe("prompt.update");
    expect(entry.targetEntityType).toBe("prompt");
    expect(entry.targetEntityId).toBe("prompt-9");
    expect(entry.beforeValue).toEqual({ text: "old" });
    expect(entry.afterValue).toEqual({ text: "new" });
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  it("writeAdminAudit persists an entry through the executor", async () => {
    const valuesFn = vi.fn().mockReturnThis();
    const insertFn = vi.fn().mockReturnValue({ values: valuesFn });
    const executor = { insert: insertFn } as any;

    const entry = buildAuditEntry({
      actorAdminUserId: "admin-1",
      actorRoleAtTimeOfAction: "super_admin",
      actionType: "admin_users.create",
      targetEntityType: "admin_user",
    });

    await writeAdminAudit(executor, entry);

    expect(insertFn).toHaveBeenCalledTimes(1);
    expect(valuesFn).toHaveBeenCalledTimes(1);
    expect(insertFn).toHaveBeenCalledWith(expect.anything());
    const written = valuesFn.mock.calls[0][0];
    expect(written.actionType).toBe("admin_users.create");
    expect(written.createdAt).toBeDefined();
  });

  it("withAdminAudit logs after the mutation succeeds, same transaction", async () => {
    const valuesFn = vi.fn().mockReturnThis();
    const insertFn = vi.fn().mockReturnValue({ values: valuesFn });
    const tx = { insert: insertFn } as any;
    const mutation = vi.fn().mockResolvedValue({ id: "new-1" });

    const result = await withAdminAudit(
      tx,
      {
        actorAdminUserId: "admin-1",
        actorRoleAtTimeOfAction: "super_admin",
        actionType: "admin_users.create",
        targetEntityType: "admin_user",
        afterValue: { email: "ops@xenboox.com" },
      },
      mutation,
    );

    expect(result).toEqual({ id: "new-1" });
    expect(mutation).toHaveBeenCalledTimes(1);
    expect(valuesFn).toHaveBeenCalledTimes(1);
  });

  it("withAdminAudit does not log when the mutation throws", async () => {
    const valuesFn = vi.fn();
    const insertFn = vi.fn().mockReturnValue({ values: valuesFn });
    const tx = { insert: insertFn } as any;
    const mutation = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(
      withAdminAudit(
        tx,
        {
          actorAdminUserId: "admin-1",
          actorRoleAtTimeOfAction: "super_admin",
          actionType: "admin_users.create",
          targetEntityType: "admin_user",
        },
        mutation,
      ),
    ).rejects.toThrow("boom");

    expect(valuesFn).not.toHaveBeenCalled();
  });
});
