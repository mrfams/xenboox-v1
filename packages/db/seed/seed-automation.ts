// ─── Seed: entity automation rules (tenant Automation Studio) ──────────────
//
// Populates the demo entity's Automation Studio with a realistic set of
// rules so the page renders live data. Idempotent: deletes the demo entity's
// existing rules and re-inserts a known set. Call from seed:all.

import { db } from "../index";
import { entities } from "../schema/organization";
import { entityAutomationRules } from "../schema/automation";
import { eq } from "drizzle-orm";

function daysFromNow(days: number, hour = 2): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export async function seedAutomationRules(): Promise<void> {
  const [demoEntity] = await db
    .select({ id: entities.id })
    .from(entities)
    .where(eq(entities.name, "Kerr Jula Trading Co."))
    .limit(1);

  if (!demoEntity) {
    console.log("  [automation] demo entity not found — skipping");
    return;
  }

  // Idempotent: reset only this entity's rules.
  await db
    .delete(entityAutomationRules)
    .where(eq(entityAutomationRules.entityId, demoEntity.id));

  const rules = [
    {
      name: "Monthly warehouse rent",
      description: "GMD 45,000 rent posting on the 1st of every month.",
      scheduleLabel: "Monthly (day 1)",
      scheduleKind: "monthly",
      scheduleDay: 1,
      actionType: "recurring_transaction" as const,
      config: { amount: "45000.00" },
      lastRunAt: daysFromNow(-30),
      nextRunAt: daysFromNow(12),
      runCount: 6,
      lastRunStatus: "success" as const,
      lastRunSummary: "Posted recurring entry of 45000.00",
    },
    {
      name: "Invoice reminder — 3 days before due",
      description: "Email customers whose invoices are due within 3 days.",
      scheduleLabel: "Daily",
      scheduleKind: "daily",
      scheduleDay: null,
      actionType: "invoice_reminder" as const,
      config: { daysBeforeDue: 3, channel: "email" },
      lastRunAt: daysFromNow(-1),
      nextRunAt: daysFromNow(1),
      runCount: 24,
      lastRunStatus: "success" as const,
      lastRunSummary: "Sent 3-day reminder to customers",
    },
    {
      name: "Vendor bill payment reminder",
      description:
        "Remind 3 days before bills come due so payments are never late.",
      scheduleLabel: "Daily",
      scheduleKind: "daily",
      scheduleDay: null,
      actionType: "bill_reminder" as const,
      config: { daysBeforeDue: 3, channel: "in_app" },
      lastRunAt: daysFromNow(-1),
      nextRunAt: daysFromNow(1),
      runCount: 18,
      lastRunStatus: "success" as const,
      lastRunSummary: "Reminded 3-day-before-due bill payments",
    },
    {
      name: "Weekly P&L export",
      description: "Generate and email the P&L report every Monday morning.",
      scheduleLabel: "Weekly (Monday)",
      scheduleKind: "weekly",
      scheduleDay: 1,
      actionType: "report_export" as const,
      config: { reportType: "pnl", channel: "email" },
      lastRunAt: daysFromNow(-3),
      nextRunAt: daysFromNow(4),
      runCount: 11,
      lastRunStatus: "success" as const,
      lastRunSummary: "Generated pnl report",
    },
  ];

  await db.insert(entityAutomationRules).values(
    rules.map((r) => ({
      entityId: demoEntity.id,
      name: r.name,
      description: r.description,
      triggerType: "schedule" as const,
      scheduleLabel: r.scheduleLabel,
      scheduleKind: r.scheduleKind,
      scheduleDay: r.scheduleDay ?? undefined,
      actionType: r.actionType,
      config: r.config,
      lastRunAt: r.lastRunAt,
      nextRunAt: r.nextRunAt,
      runCount: r.runCount,
      lastRunStatus: r.lastRunStatus,
      lastRunSummary: r.lastRunSummary,
    })),
  );

  console.log(
    `  [automation] seeded ${rules.length} rules for Kerr Jula Trading Co.`,
  );
}

// Allow direct execution: `npx tsx seed/seed-automation.ts`
if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").split("/").pop() === "seed-automation.ts"
) {
  seedAutomationRules().then(() => process.exit(0));
}
