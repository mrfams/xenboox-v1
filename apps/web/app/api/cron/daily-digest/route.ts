// Daily Digest Cron
//
// Vercel Cron: 0 6 * * * (06:00 UTC) → GET /api/cron/daily-digest
// Header: x-cron-secret: <CRON_SECRET> (Vercel injects CRON_SECRET automatically)
//
// For every user with at least one entity access, aggregates the actionable
// items across their entities (overdue invoices, pending approvals, unread
// notifications) and emails the daily digest. This is the trigger for
// `sendDailyDigestEmail` — the template existed but no caller did.
//
// Safety:
//  - Bounded: batch of users per run (default 200) so a growing user base
//    never turns one invocation into a mail bomb; the cron can run hourly
//    if the batch is ever exceeded.
//  - Only emails users with at least one digest-worthy item (no empty spam).
//  - Entity-scoped aggregation, never cross-entity.

import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@xenboox/db";
import { userEntityAccess } from "@xenboox/db/schema/organization";
import { users } from "@xenboox/db/schema/auth";
import { salesInvoices } from "@xenboox/db/schema/ap-ar";
import { approvals } from "@xenboox/db/schema/agents";
import { notifications } from "@xenboox/db/schema/notifications";

import { sendDailyDigestEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface DigestItem {
  type: string;
  count: number;
  items: Array<{ title: string; body: string }>;
}

const DEFAULT_BATCH = 200;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("x-cron-secret");

  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchParam = req.nextUrl.searchParams.get("batch");
  const batchSize = Math.min(
    Number(batchParam ?? DEFAULT_BATCH) || DEFAULT_BATCH,
    500,
  );

  try {
    const usersWithAccess = await db
      .selectDistinct({
        userId: userEntityAccess.userId,
      })
      .from(userEntityAccess)
      .limit(batchSize);

    if (usersWithAccess.length === 0) {
      return NextResponse.json({
        ok: true,
        users: 0,
        skipped: 0,
        emailsSent: 0,
      });
    }

    const userIds = usersWithAccess.map((u) => u.userId);

    const emailRows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(inArray(users.id, userIds), isNotNull(users.emailVerified)));

    // Only email verified users — digest mail to an unverified inbox is
    // noise at best and spam at worst.
    let emailsSent = 0;
    let skipped = 0;

    for (const user of emailRows) {
      const entityIds = await db
        .select({ entityId: userEntityAccess.entityId })
        .from(userEntityAccess)
        .where(eq(userEntityAccess.userId, user.id))
        .then((rows) =>
          rows.map((r) => r.entityId).filter((e): e is string => !!e),
        );

      if (entityIds.length === 0) {
        skipped += 1;
        continue;
      }

      const items: DigestItem[] = [];

      // Overdue invoices across the user's entities
      const overdue = await db
        .select({
          entityId: salesInvoices.entityId,
          invoiceNumber: salesInvoices.invoiceNumber,
          dueDate: salesInvoices.dueDate,
          balance: salesInvoices.balance,
          currency: salesInvoices.currency,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.status, "overdue"),
            inArray(salesInvoices.entityId, entityIds),
          ),
        )
        .limit(10);

      if (overdue.length > 0) {
        items.push({
          type: "overdue_invoice",
          count: overdue.length,
          items: overdue.map((inv) => ({
            title: `${inv.invoiceNumber} — ${inv.currency} ${Number(inv.balance).toLocaleString()}`,
            body: `Due ${inv.dueDate}`,
          })),
        });
      }

      // Pending approvals
      const pendingApprovals = await db
        .select({
          entityId: approvals.entityId,
          approvalType: approvals.approvalType,
        })
        .from(approvals)
        .where(
          and(
            eq(approvals.status, "pending"),
            inArray(approvals.entityId, entityIds),
          ),
        )
        .limit(10);

      if (pendingApprovals.length > 0) {
        items.push({
          type: "pending_approval",
          count: pendingApprovals.length,
          items: pendingApprovals.slice(0, 5).map((a) => ({
            title: `${a.approvalType.replace(/_/g, " ")} approval`,
            body: "Waiting on your review",
          })),
        });
      }

      // Unread notifications (attention-map style)
      const unread = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, user.id),
            eq(notifications.read, false),
            inArray(notifications.entityId, entityIds),
          ),
        );

      const unreadCount = Number(unread[0]?.count ?? 0);
      if (unreadCount > 0) {
        items.push({
          type: "unread_notification",
          count: unreadCount,
          items: [
            {
              title: `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`,
              body: "Review them in the dashboard",
            },
          ],
        });
      }

      if (items.length === 0) {
        skipped += 1;
        continue;
      }

      try {
        await sendDailyDigestEmail(user.email, {
          userName: user.name ?? user.email,
          items,
        });
        emailsSent += 1;
      } catch (err) {
        logger.error(
          {
            userId: user.id,
            err: err instanceof Error ? err.message : String(err),
          },
          "daily-digest: email send failed",
        );
      }
    }

    logger.info(
      { users: usersWithAccess.length, emailsSent, skipped },
      "daily-digest: run complete",
    );

    return NextResponse.json({
      ok: true,
      users: usersWithAccess.length,
      emailsSent,
      skipped,
    });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      "daily-digest: run failed",
    );
    return NextResponse.json(
      { ok: false, error: "digest failed" },
      { status: 500 },
    );
  }
}
