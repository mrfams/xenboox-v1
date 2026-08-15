import { describe, it, expect } from "vitest";
import {
  CLOSE_PHASES,
  DEFAULT_CLOSE_TASKS,
  buildChecklistShape,
  dueDateForPeriod,
  seedConfidenceForIndex,
  seedStatusForIndex,
} from "@xenboox/db/seed/close-task-catalog";

describe("close-task-catalog", () => {
  it("catalog covers all 5 phases in order with 25 tasks", () => {
    expect(CLOSE_PHASES).toHaveLength(5);
    expect(DEFAULT_CLOSE_TASKS).toHaveLength(25);

    const byPhase = new Map<string, number>();
    for (const t of DEFAULT_CLOSE_TASKS) {
      byPhase.set(t.phase, (byPhase.get(t.phase) ?? 0) + 1);
    }
    // Every phase must be present
    for (const p of CLOSE_PHASES) {
      expect(
        byPhase.get(p.id.replace("-", "_") as string) ?? 0,
      ).toBeGreaterThan(0);
    }

    // sortOrder is globally sequential — no collisions
    const orders = DEFAULT_CLOSE_TASKS.map((t) => t.sortOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("task keys are unique (idempotent seeding depends on it)", () => {
    const keys = DEFAULT_CLOSE_TASKS.map((t) => t.taskKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  describe("dueDateForPeriod", () => {
    it("returns a date inside the period month, clamped to month end", () => {
      // Feb 2026 has 28 days
      const d = dueDateForPeriod("2026-02", 25);
      expect(d).toMatch(/^Feb /);
      const day = Number(d.split(" ")[1]);
      expect(day).toBeLessThanOrEqual(28);

      // July 2026 has 31 days
      const d2 = dueDateForPeriod("2026-07", 1);
      expect(d2).toMatch(/^Jul /);
    });

    it("spreads early tasks earlier than late tasks", () => {
      const early = dueDateForPeriod("2026-07", 1);
      const late = dueDateForPeriod("2026-07", 25);
      expect(late).not.toBe(early);
    });
  });

  describe("seedStatusForIndex", () => {
    it("first 4 tasks complete (auto), 5th in review, rest pending", () => {
      expect(seedStatusForIndex(0)).toEqual({
        status: "completed",
        autoCompleted: true,
      });
      expect(seedStatusForIndex(3)).toEqual({
        status: "completed",
        autoCompleted: true,
      });
      expect(seedStatusForIndex(4)).toEqual({
        status: "in_review",
        autoCompleted: false,
      });
      expect(seedStatusForIndex(5)).toEqual({
        status: "pending",
        autoCompleted: false,
      });
    });
  });

  describe("seedConfidenceForIndex", () => {
    it("returns 0.95+ for completed tasks and null otherwise", () => {
      expect(Number(seedConfidenceForIndex(0))).toBeGreaterThanOrEqual(0.95);
      expect(seedConfidenceForIndex(5)).toBeNull();
    });
  });

  describe("buildChecklistShape", () => {
    const row = (
      overrides: Partial<
        Parameters<typeof buildChecklistShape>[0][number]
      > = {},
    ) => ({
      id: "00000000-0000-0000-0000-000000000001",
      name: "Reconcile all bank accounts",
      ownerAgent: "Bank Reconciler Agent",
      ownerInitials: "BR",
      ownerColor: "bg-indigo-500",
      status: "completed",
      confidence: "0.9800",
      dueDate: "Jul 21",
      phase: "pre_close" as const,
      phaseOrder: 1,
      sortOrder: 2,
      ...overrides,
    });

    it("groups rows into the 5 phases in catalog order", () => {
      const shape = buildChecklistShape([
        row(),
        row({
          id: "00000000-0000-0000-0000-000000000002",
          name: "Post accruals",
          ownerAgent: "Journal Agent",
          phase: "closing_entries",
          phaseOrder: 2,
          sortOrder: 9,
          status: "pending",
        }),
      ]);

      expect(shape.phases).toHaveLength(5);
      expect(shape.phases[0].id).toBe("pre-close");
      expect(shape.phases[0].tasks).toHaveLength(1);
      expect(shape.phases[1].id).toBe("closing-entries");
      expect(shape.phases[1].tasks).toHaveLength(1);
      expect(shape.phases[2].tasks).toBeUndefined();
      expect(shape.totalTasks).toBe(2);
      expect(shape.completedTasks).toBe(1);
    });

    it("converts confidence 0-1 to 0-100 percent and rounds", () => {
      const shape = buildChecklistShape([row()]);
      expect(shape.phases[0].tasks?.[0].confidence).toBe(98);
    });

    it("falls back to initials/color when row fields are null", () => {
      const shape = buildChecklistShape([
        row({ ownerInitials: null, ownerColor: null }),
      ]);
      const task = shape.phases[0].tasks?.[0];
      expect(task?.ownerInitials).toBe("Ba");
      expect(task?.ownerColor).toBe("bg-slate-500");
    });

    it("sorts tasks within a phase by sortOrder", () => {
      const shape = buildChecklistShape([
        row({ sortOrder: 6, name: "late" }),
        row({ sortOrder: 2, name: "early" }),
      ]);
      expect(shape.phases[0].tasks?.map((t) => t.name)).toEqual([
        "early",
        "late",
      ]);
    });

    it("pre-close phase is expanded by default", () => {
      const shape = buildChecklistShape([row()]);
      expect(shape.phases[0].isExpanded).toBe(true);
      expect(shape.phases[1].isExpanded).toBe(false);
    });
  });
});
