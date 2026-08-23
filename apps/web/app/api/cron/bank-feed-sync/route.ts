// Bank Feed Auto-Sync Cron
//
// Vercel Cron: 0 */6 * * * (every 6 hours) → GET /api/cron/bank-feed-sync
// Header: x-cron-secret: <CRON_SECRET> (Vercel injects CRON_SECRET automatically)
//
// Triggers the `bank-feed-auto-sync` Trigger.dev task which:
//   1. Queries all active bank connections across all entities
//   2. Dispatches to provider-specific sync jobs (Plaid, Mono)
//   3. Each provider sync runs as a separate Trigger.dev task
//
// Safety:
//   - Only runs if CRON_SECRET matches (prevents unauthorized triggers)
//   - Trigger.dev handles concurrency, retries, and idempotency
//   - Each entity gets its own concurrency queue (no cross-tenant contention)

import { NextRequest, NextResponse } from "next/server";
import { triggerClient } from "@/lib/trigger";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("x-cron-secret");

  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const triggeredAt = new Date().toISOString();

    // Trigger the bank-feed-auto-sync task
    const run = await triggerClient.tasks.trigger(
      "bank-feed-auto-sync",
      { triggeredAt },
      {
        concurrencyKey: "global",
        idempotencyKey: `cron:bank-feed-sync:${triggeredAt}`,
      },
    );

    logger.info(
      { runId: run.id, triggeredAt },
      "bank-feed-sync: triggered successfully",
    );

    return NextResponse.json({
      ok: true,
      runId: run.id,
      triggeredAt,
    });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      "bank-feed-sync: trigger failed",
    );
    return NextResponse.json(
      { ok: false, error: "Failed to trigger bank feed sync" },
      { status: 500 },
    );
  }
}
