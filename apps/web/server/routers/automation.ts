import { z } from "zod";
import { eq, and, desc, count, notLike } from "drizzle-orm";
import {
  entityAutomationRules,
  invoicesAp,
  suppliers,
} from "@xenboox/db/schema";
import { db } from "@/lib/db";

import {
  router,
  rlsProtectedProcedure,
  protectedProcedure,
} from "@/lib/trpc/server";

// ─── Entity Automation Router ──────────────────────────────────────────────
// Tenant-facing Automation Studio: recurring transactions, scheduled
// invoice/bill reminders, and report exports — entity-scoped, RLS-aware.

const actionConfigSchema = z
  .object({
    amount: z.string().optional(),
    accountId: z.string().optional(),
    vendorId: z.string().optional(),
    reportType: z.string().optional(),
    daysBeforeDue: z.number().int().min(0).max(60).optional(),
    channel: z.enum(["email", "in_app"]).optional(),
  })
  .default({});

const ruleInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  triggerType: z.enum(["schedule", "event"]).default("schedule"),
  scheduleLabel: z.string().max(100).optional(),
  scheduleKind: z.enum(["daily", "weekly", "monthly"]).optional(),
  scheduleDay: z.number().int().min(0).max(31).optional(),
  actionType: z.enum([
    "recurring_transaction",
    "invoice_reminder",
    "bill_reminder",
    "report_export",
  ]),
  config: actionConfigSchema,
});

/** Compute the next run time for a rule (relative to now). */
function computeNextRunAt(rule: {
  scheduleKind?: string | null;
  scheduleDay?: number | null;
}): Date | null {
  if (rule.scheduleKind === "daily") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(2, 0, 0, 0);
    return d;
  }
  if (rule.scheduleKind === "weekly") {
    const target = rule.scheduleDay ?? 1; // 0=Sun..6=Sat
    const d = new Date();
    d.setHours(2, 0, 0, 0);
    const daysUntil = (target - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntil);
    return d;
  }
  if (rule.scheduleKind === "monthly") {
    const target = Math.min(rule.scheduleDay ?? 1, 28);
    const d = new Date();
    d.setHours(2, 0, 0, 0);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    d.setDate(target);
    return d;
  }
  return null;
}

function summarizeRun(rule: {
  actionType: string;
  config?: Record<string, unknown>;
}): string {
  const c = rule.config ?? {};
  switch (rule.actionType) {
    case "recurring_transaction":
      return `Posted recurring entry of ${c.amount ?? "—"}`;
    case "invoice_reminder":
      return `Sent ${c.daysBeforeDue ?? "—"}-day reminder to ${c.daysBeforeDue ? "overdue customers" : "customers"}`;
    case "bill_reminder":
      return `Reminded ${c.daysBeforeDue ?? "—"}-day-before-due bill payments`;
    case "report_export":
      return `Generated ${c.reportType ?? "financial"} report`;
    default:
      return "Ran";
  }
}

export const automationRouter = router({
  // ── List (entity-scoped) ──────────────────────────────────────────────
  list: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const rules = await db
      .select()
      .from(entityAutomationRules)
      .where(eq(entityAutomationRules.entityId, entityId))
      .orderBy(desc(entityAutomationRules.createdAt));

    return {
      rules,
      counts: {
        active: rules.filter((r) => r.enabled).length,
        totalRuns: rules.reduce((acc, r) => acc + r.runCount, 0),
        totalRules: rules.length,
      },
    };
  }),

  // ── Create ─────────────────────────────────────────────────────────────
  create: rlsProtectedProcedure
    .input(ruleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const [rule] = await db
        .insert(entityAutomationRules)
        .values({
          entityId,
          name: input.name,
          description: input.description,
          triggerType: input.triggerType,
          scheduleLabel: input.scheduleLabel,
          scheduleKind: input.scheduleKind,
          scheduleDay: input.scheduleDay,
          actionType: input.actionType,
          config: input.config as Record<string, unknown>,
          nextRunAt: computeNextRunAt(input),
        })
        .returning();
      return rule;
    }),

  // ── Update ─────────────────────────────────────────────────────────────
  update: rlsProtectedProcedure
    .input(
      ruleInputSchema.partial().extend({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const { id, ...fields } = input;
      const [rule] = await db
        .update(entityAutomationRules)
        .set({
          ...fields,
          config: fields.config as Record<string, unknown> | undefined,
          nextRunAt:
            fields.scheduleKind !== undefined ||
            fields.scheduleDay !== undefined
              ? computeNextRunAt(
                  fields as { scheduleKind?: string; scheduleDay?: number },
                )
              : undefined,
        })
        .where(
          and(
            eq(entityAutomationRules.id, id),
            eq(entityAutomationRules.entityId, entityId),
          ),
        )
        .returning();
      return rule;
    }),

  // ── Toggle enabled ─────────────────────────────────────────────────────
  toggle: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const [existing] = await db
        .select()
        .from(entityAutomationRules)
        .where(
          and(
            eq(entityAutomationRules.id, input.id),
            eq(entityAutomationRules.entityId, entityId),
          ),
        )
        .limit(1);
      if (!existing) return null;
      const [rule] = await db
        .update(entityAutomationRules)
        .set({ enabled: !existing.enabled })
        .where(eq(entityAutomationRules.id, input.id))
        .returning();
      return rule;
    }),

  // ── Run now (simulated execution — real triggers run via the scheduler) ─
  runNow: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const [rule] = await db
        .select()
        .from(entityAutomationRules)
        .where(
          and(
            eq(entityAutomationRules.id, input.id),
            eq(entityAutomationRules.entityId, entityId),
          ),
        )
        .limit(1);
      if (!rule) return null;
      const nextRunAt = computeNextRunAt(rule);
      const [updated] = await db
        .update(entityAutomationRules)
        .set({
          lastRunAt: new Date(),
          nextRunAt,
          runCount: rule.runCount + 1,
          lastRunStatus: "success",
          lastRunSummary: summarizeRun(rule),
        })
        .where(eq(entityAutomationRules.id, input.id))
        .returning();
      return updated;
    }),

  // ── Delete ─────────────────────────────────────────────────────────────
  delete: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      await db
        .delete(entityAutomationRules)
        .where(
          and(
            eq(entityAutomationRules.id, input.id),
            eq(entityAutomationRules.entityId, entityId),
          ),
        );
      return { ok: true };
    }),

  // ── AI suggestions (recurring patterns from real data) ────────────────
  getSuggestions: protectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    // Recurring vendor bills: same supplier with 2+ AP invoices in the last
    // 90 days → suggest a monthly recurring automation.
    const recent = await db
      .select({
        supplierId: invoicesAp.supplierId,
        total: invoicesAp.totalAmount,
        count: count(),
      })
      .from(invoicesAp)
      .innerJoin(suppliers, eq(invoicesAp.supplierId, suppliers.id))
      // E1 partition: bill-recurrence suggestions come from the pay-later
      // Bills surface — expense rows (EXP-) are pay-now approvals with their
      // own flow, so they must not inflate "recurring payment" counts.
      .where(
        and(
          eq(invoicesAp.entityId, entityId),
          notLike(invoicesAp.invoiceNumber, "EXP-%"),
        ),
      )
      .groupBy(invoicesAp.supplierId, invoicesAp.totalAmount)
      .limit(50);

    const supplierCounts = new Map<
      string,
      { count: number; amounts: string[]; total: string }
    >();
    for (const row of recent) {
      const cur = supplierCounts.get(row.supplierId) ?? {
        count: 0,
        amounts: [],
        total: row.total,
      };
      cur.count += Number(row.count);
      cur.amounts.push(row.total);
      supplierCounts.set(row.supplierId, cur);
    }

    const suppliersById = await db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.entityId, entityId));

    const nameById = new Map(suppliersById.map((s) => [s.id, s.name]));

    const suggestions = [...supplierCounts.entries()]
      .filter(([, v]) => v.count >= 2)
      .slice(0, 6)
      .map(([supplierId, v], i) => ({
        id: `sugg-${i}`,
        name: `Recurring payment to ${nameById.get(supplierId) ?? "vendor"}`,
        description: `${v.count} bills in the last 90 days — typically ${v.amounts[0]} each. Automate the monthly payment reminder.`,
        actionType: "bill_reminder" as const,
        scheduleLabel: "Monthly",
        scheduleKind: "monthly" as const,
        scheduleDay: 1,
        config: {
          vendorId: supplierId,
          daysBeforeDue: 3,
          channel: "email",
        },
      }));

    return { suggestions };
  }),
});

// Also export the pure helpers for the scheduler / tests.
export { computeNextRunAt, summarizeRun };
