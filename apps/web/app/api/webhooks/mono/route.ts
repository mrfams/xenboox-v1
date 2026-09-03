import { NextRequest, NextResponse } from "next/server";
import { bankConnections } from "@xenboox/db/schema/integrations";
import { eq, and } from "drizzle-orm";

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

    // Resolve the connection by provider id FIRST, then scope every write to
    // that row's id + entity — never a bare update on providerConnectionId
    // (entity-scoping rule; prevents cross-entity writes if ids ever collide).
    const providerConnectionId = data?.id as string | undefined;
    const connection = providerConnectionId
      ? await db.query.bankConnections.findFirst({
          where: eq(bankConnections.providerConnectionId, providerConnectionId),
        })
      : null;

    if (!connection) {
      log.warn({ event, providerConnectionId }, "No connection for webhook");
      return NextResponse.json({ received: true, unlinked: true });
    }

    const { id: connectionId, entityId } = connection;

    switch (event) {
      case "mono.account.connected":
      case "mono.account.updated": {
        await db
          .update(bankConnections)
          .set({
            status: "active",
            syncError: null,
            lastSyncedAt: new Date(),
          })
          .where(
            and(
              eq(bankConnections.id, connectionId),
              eq(bankConnections.entityId, entityId),
            ),
          );
        break;
      }

      case "mono.account.synced": {
        await db
          .update(bankConnections)
          .set({ lastSyncedAt: new Date(), syncError: null })
          .where(
            and(
              eq(bankConnections.id, connectionId),
              eq(bankConnections.entityId, entityId),
            ),
          );
        log.info({ connectionId }, "Sync completed");
        break;
      }

      case "mono.account.disconnected": {
        await db
          .update(bankConnections)
          .set({ status: "disconnected" })
          .where(
            and(
              eq(bankConnections.id, connectionId),
              eq(bankConnections.entityId, entityId),
            ),
          );
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
