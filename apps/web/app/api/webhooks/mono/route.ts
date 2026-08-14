import { NextRequest, NextResponse } from "next/server";
import { bankConnections } from "@xenboox/db/schema/integrations";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { verifyMonoSignature } from "@/lib/webhook-verify";
import { logger } from "@/lib/logger";
import { claimWebhookEvent, shortHash } from "@/lib/webhooks/dedup";

const log = logger.child({ module: "mono-webhook" });

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("mono-signature");

    if (!verifyMonoSignature(rawBody, signature)) {
      log.warn("Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { event, data } = body;

    log.info({ event, connectionId: data?.id }, "Received webhook event");

    // At-least-once delivery: drop retried events so they never double-apply.
    const eventKey = `mono:${event}:${data?.id ?? shortHash(rawBody)}`;
    if (!(await claimWebhookEvent(eventKey))) {
      log.info({ eventKey }, "Duplicate webhook event — skipping");
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event) {
      case "mono.account.connected":
      case "mono.account.updated": {
        if (data?.id) {
          await db
            .update(bankConnections)
            .set({
              status: "active",
              lastSyncedAt: new Date(),
            })
            .where(eq(bankConnections.providerConnectionId, data.id));
        }
        break;
      }

      case "mono.account.synced": {
        if (data?.id) {
          const connection = await db.query.bankConnections.findFirst({
            where: eq(bankConnections.providerConnectionId, data.id),
          });

          if (connection) {
            await db
              .update(bankConnections)
              .set({ lastSyncedAt: new Date() })
              .where(eq(bankConnections.id, connection.id));

            log.info({ connectionId: connection.id }, "Sync completed");
          }
        }
        break;
      }

      case "mono.account.disconnected": {
        if (data?.id) {
          await db
            .update(bankConnections)
            .set({ status: "disconnected" })
            .where(eq(bankConnections.providerConnectionId, data.id));
        }
        break;
      }

      default:
        log.warn({ event }, "Unhandled webhook event");
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error({ error }, "Webhook processing failed");
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
