// Audit Log Archival Cron
//
// Vercel Cron: 0 2 * * 0 (02:00 UTC every Sunday) → GET /api/cron/audit-archive
// Header: x-cron-secret: <CRON_SECRET> (Vercel injects CRON_SECRET automatically)
//
// Triggers the audit-log-archival Trigger.dev job that exports old audit_log
// rows to Cloudflare R2 (write-once, compliance-grade storage) and then
// deletes them from the database.
//
// Safety:
//  - Only runs when CRON_SECRET matches
//  - Archives BEFORE deleting (never lose data)
//  - Checksum verified after upload
//  - Legal-hold entities are skipped
//  - Runs weekly to avoid excessive load

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
    // Trigger the audit archival job
    const { auditArchivalTask } = await import(
      "@xenboox/jobs/lib/audit-archival"
    );

    const result = await auditArchivalTask.trigger({
      triggeredBy: "cron",
      runId: `cron-aa-${Date.now()}`,
    });

    logger.info({ runId: result.id }, "audit-archive-cron: job triggered");

    return NextResponse.json({
      ok: true,
      runId: result.id,
      message: "Audit log archival job triggered",
    });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      "audit-archive-cron: trigger failed",
    );
    return NextResponse.json(
      { ok: false, error: "Failed to trigger audit archival job" },
      { status: 500 },
    );
  }
}
