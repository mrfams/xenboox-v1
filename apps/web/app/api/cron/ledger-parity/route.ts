import { NextRequest, NextResponse } from "next/server";
import { eq, desc, gt, and, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { entities } from "@xenboox/db/schema";
import { journalEntries } from "@xenboox/db/schema/accounting";
import { verifyParity } from "@xenboox/ledger";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/ledger-parity
 *
 * Nightly cut-over verifier (Batch 3 / N36): proves legacy posted JEs have
 * mirrored journal_events with matching totals and periods. Header:
 * x-cron-secret: <CRON_SECRET> (same model as the close-reminder cron).
 *
 * Bounded: newest 50 entities with posted JEs, 300 entries each per run —
 * the nightly cadence walks the tail; full scans are operator-triggered by
 * passing ?entityId=<uuid>.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("x-cron-secret");

  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const singleEntity = req.nextUrl.searchParams.get("entityId");

    if (singleEntity) {
      const report = await verifyParity(db, singleEntity, { limit: 2000 });
      return NextResponse.json({
        ok: report.mismatches.length === 0,
        reports: [report],
      });
    }

    // Newest entities that actually have posted reference-JEs
    const activeEntities = await db
      .select({
        entityId: journalEntries.entityId,
        lastPost: sql<string>`MAX(${journalEntries.createdAt})`,
      })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.status, "posted"),
          sql`${journalEntries.reference} IS NOT NULL`,
        ),
      )
      .groupBy(journalEntries.entityId)
      .orderBy(desc(sql`MAX(${journalEntries.createdAt})`))
      .limit(50);

    const reports = [];
    for (const { entityId } of activeEntities) {
      const report = await verifyParity(db, entityId, { limit: 300 });
      reports.push(report);
      if (report.mismatches.length > 0) {
        logger.warn(
          {
            entityId,
            checked: report.checked,
            mismatches: report.mismatches.length,
            sample: report.mismatches.slice(0, 5),
          },
          "[ledger-parity] mismatches detected",
        );
      }
    }

    const totals = reports.reduce(
      (acc, r) => ({
        checked: acc.checked + r.checked,
        matched: acc.matched + r.matched,
        mismatches: acc.mismatches + r.mismatches.length,
        entitiesWithIssues:
          acc.entitiesWithIssues + (r.mismatches.length > 0 ? 1 : 0),
      }),
      { checked: 0, matched: 0, mismatches: 0, entitiesWithIssues: 0 },
    );

    return NextResponse.json({
      ok: totals.mismatches === 0,
      entities: reports.length,
      ...totals,
    });
  } catch (error) {
    logger.error({ err: error }, "[ledger-parity] run failed");
    return NextResponse.json(
      { error: "Parity verification failed" },
      { status: 500 },
    );
  }
}
