// ─── Webhook Delivery Processor ────────────────────────────────────────────
//
// Trigger point for outbound webhook delivery. Call via cron or Trigger.dev:
//   GET /api/webhooks/process?batch=50
// with header `x-cron-secret: <CRON_SECRET>`.
//
// Never processes more than `batch` deliveries per invocation so long runs
// stay bounded; schedule a recurring job for continuous draining.

import { NextRequest, NextResponse } from "next/server";

import { processPendingWebhookDeliveries } from "@/lib/webhooks/delivery";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("x-cron-secret");

  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchParam = req.nextUrl.searchParams.get("batch");
  const batchSize = Math.min(Number(batchParam ?? "50") || 50, 200);

  const result = await processPendingWebhookDeliveries({ batchSize });

  return NextResponse.json({ ok: true, ...result });
}
