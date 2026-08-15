// Month-End Close Reminder Cron
//
// Vercel Cron: 0 9 * * * (09:00 UTC, business hours for Africa/Europe) →
// GET /api/cron/month-end-close
// Header: x-cron-secret: <CRON_SECRET> (Vercel injects CRON_SECRET automatically)
//
// Scans for OPEN fiscal periods whose endDate has passed (books are ready to
// close but nobody has). Creates one in-app notification per entity member so
// the close-center surfaces the outstanding period. This NEVER auto-closes —
// closing books is a deliberate human-gated action (§22.3 HITL) — it only
// reminds.
//
// Safety:
//  - Only notifies for periods closed_at is null (never re-notify).
//  - Idempotent: keys the notification on the period id so a re-run does not
//    stack duplicates. Re-runs find the same period and the EXISTS guard
//    skips it.

import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, lt } from "drizzle-orm";

import { db } from "@xenboox/db";
import { fiscalPeriods } from "@xenboox/db/schema/accounting";
import { userEntityAccess } from "@xenboox/db/schema/organization";
import { notifications } from "@xenboox/db/schema/notifications";
import { entities } from "@xenboox/db/schema/organization";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("x-cron-secret");

  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    // Open periods whose end date has passed — the "books ready to close" set.
    const readyPeriods = await db
      .select({
        id: fiscalPeriods.id,
        entityId: fiscalPeriods.entityId,
        startDate: fiscalPeriods.startDate,
        endDate: fiscalPeriods.endDate,
        year: fiscalPeriods.year,
        month: fiscalPeriods.month,
        entityName: entities.name,
      })
      .from(fiscalPeriods)
      .innerJoin(entities, eq(entities.id, fiscalPeriods.entityId))
      .where(
        and(
          eq(fiscalPeriods.status, "open"),
          isNull(fiscalPeriods.closedAt),
          lt(fiscalPeriods.endDate, today),
        ),
      )
      .limit(200);

    let notified = 0;

    for (const period of readyPeriods) {
      // Members of this entity get the reminder.
      const members = await db
        .select({ userId: userEntityAccess.userId })
        .from(userEntityAccess)
        .where(eq(userEntityAccess.entityId, period.entityId));

      const periodLabel = new Date(
        `${period.endDate}T00:00:00Z`,
      ).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });

      for (const member of members) {
        // Idempotency guard — skip if this period already has a reminder
        // notification for this user (keyed on the period id in data).
        const existing = await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, member.userId),
              eq(notifications.entityId, period.entityId),
              eq(notifications.type, "close_reminder"),
              eq(notifications.data, JSON.stringify({ periodId: period.id })),
            ),
          )
          .limit(1);

        if (existing.length > 0) continue;

        await db.insert(notifications).values({
          userId: member.userId,
          entityId: period.entityId,
          type: "close_reminder",
          priority: "medium",
          title: `Books ready to close — ${periodLabel}`,
          body: `${period.entityName}: the books for ${periodLabel} are ready to close. Open the Close Center to review and close.`,
          data: JSON.stringify({ periodId: period.id }),
        });
        notified += 1;
      }
    }

    logger.info(
      { periods: readyPeriods.length, notified },
      "month-end-close: run complete",
    );

    return NextResponse.json({
      ok: true,
      periods: readyPeriods.length,
      notified,
    });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      "month-end-close: run failed",
    );
    return NextResponse.json(
      { ok: false, error: "close-reminder scan failed" },
      { status: 500 },
    );
  }
}
