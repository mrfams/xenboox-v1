// Data Retention Cron
//
// Vercel Cron: 0 3 * * 0 (03:00 UTC every Sunday) → GET /api/cron/data-retention
// Header: x-cron-secret: <CRON_SECRET> (Vercel injects CRON_SECRET automatically)
//
// Triggers the data-retention-purge Trigger.dev job for all entities with
// active retention policies. Runs weekly to avoid excessive DB load.
//
// Safety:
//  - Only runs when CRON_SECRET matches
//  - The purge job itself is entity-scoped and batched
//  - Legal hold tables are never purged
//  - Every purge is logged to retention_purge_logs

import { NextRequest, NextResponse } from "next/server";
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
    // Trigger the data retention purge job
    // Uses dynamic import to avoid bundling Trigger.dev in edge contexts
    const { dataRetentionTask } = await import(
      "@xenboox/jobs/lib/data-retention"
    );

    const result = await dataRetentionTask.trigger({
      triggeredBy: "cron",
      runId: `cron-dr-${Date.now()}`,
    });

    logger.info({ runId: result.id }, "data-retention-cron: job triggered");

    return NextResponse.json({
      ok: true,
      runId: result.id,
      message: "Data retention purge job triggered",
    });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      "data-retention-cron: trigger failed",
    );
    return NextResponse.json(
      { ok: false, error: "Failed to trigger data retention job" },
      { status: 500 },
    );
  }
}
