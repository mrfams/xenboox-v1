/**
 * Seed close_tasks rows for an entity + period from the default catalog.
 *
 * Idempotent: unique on (entity_id, period, task_key), so re-running
 * never duplicates. Completed tasks carry a deterministic confidence so
 * demo data looks real but is reproducible.
 */
import { desc, eq } from "drizzle-orm";
import { db } from "../index";
import { closeTasks } from "../schema/close";
import { fiscalPeriods } from "../schema/accounting";
import {
  DEFAULT_CLOSE_TASKS,
  dueDateForPeriod,
  seedConfidenceForIndex,
  seedStatusForIndex,
  type CloseTaskPhase,
} from "./close-task-catalog";

export async function seedCloseTasks(
  entityId: string,
  period: string,
): Promise<{ inserted: number; total: number }> {
  const values = DEFAULT_CLOSE_TASKS.map((task, index) => {
    const seedStatus = seedStatusForIndex(index);
    return {
      entityId,
      period,
      taskKey: task.taskKey,
      name: task.name,
      description: task.description ?? null,
      phase: task.phase as CloseTaskPhase,
      phaseOrder: task.phaseOrder,
      sortOrder: task.sortOrder,
      ownerAgent: task.ownerAgent,
      ownerInitials: task.ownerInitials,
      ownerColor: task.ownerColor,
      status: seedStatus.status,
      confidence: seedConfidenceForIndex(index),
      dueDate: dueDateForPeriod(period, task.sortOrder),
      isAutoCompletable: task.isAutoCompletable,
      autoCompleted: seedStatus.autoCompleted,
      completedAt: seedStatus.status === "completed" ? new Date() : null,
      completedByUserId: seedStatus.status === "completed" ? "system" : null,
    };
  });

  const result = await db
    .insert(closeTasks)
    .values(values)
    .onConflictDoNothing({
      target: [closeTasks.entityId, closeTasks.period, closeTasks.taskKey],
    })
    .returning({ id: closeTasks.id });

  return { inserted: result.length, total: DEFAULT_CLOSE_TASKS.length };
}

/** Resolve the "YYYY-MM" label of an entity's most recent fiscal period. */
export async function latestPeriodLabel(
  entityId: string,
): Promise<string | null> {
  const rows = await db
    .select({ startDate: fiscalPeriods.startDate })
    .from(fiscalPeriods)
    .where(eq(fiscalPeriods.entityId, entityId))
    .orderBy(desc(fiscalPeriods.startDate))
    .limit(1);
  if (!rows[0]?.startDate) return null;
  return rows[0].startDate.slice(0, 7); // "YYYY-MM-DD" → "YYYY-MM"
}
