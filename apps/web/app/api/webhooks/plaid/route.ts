import { NextRequest, NextResponse } from "next/server";

import { bankConnections } from "@xenboox/db/schema";
import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { verifyPlaidWebhook } from "@/lib/plaid-webhook-verify";
import { claimWebhookEvent, shortHash } from "@/lib/webhooks/dedup";
import { tenantJobOptions, triggerClient } from "@/lib/trigger";

export const runtime = "nodejs";

const log = logger.child({ module: "plaid-webhook" });

/**
 * Plaid webhook receiver.
 *
 * Plaid fires webhooks for item-level events: new transactions available
 * (SYNC_UPDATES_AVAILABLE), item errors (ITEM_ERROR), access token expiry
 * (PENDING_EXPIRATION), removed transactions (TRANSACTIONS_REMOVED), and
 * newly added accounts (NEW_ACCOUNTS_AVAILABLE).
 *
 * Verification: Plaid signs webhooks with a JWT in the `Plaid-Verification`
 * header (ES256, body-sha256 claim, 5-minute iat window). See
 * lib/plaid-webhook-verify.ts. Delivery is at-least-once, so events are
 * deduped via claimWebhookEvent before any side effect.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const verificationHeader = request.headers.get("Plaid-Verification");

    if (!(await verifyPlaidWebhook(rawBody, verificationHeader))) {
      log.warn("Invalid Plaid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { webhook_type, webhook_code, item_id } = body;

    // Dedup at-least-once deliveries (Plaid retries on non-2xx).
    const eventKey = `plaid:${webhook_type}:${webhook_code}:${item_id ?? shortHash(rawBody)}`;
    if (!(await claimWebhookEvent(eventKey))) {
      log.info({ eventKey }, "Duplicate Plaid webhook — skipping");
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Find the connection for this Plaid item.
    const connection = item_id
      ? await db.query.bankConnections.findFirst({
          where: and(
            eq(bankConnections.provider, "plaid"),
            eq(bankConnections.providerConnectionId, item_id as string),
          ),
        })
      : null;

    if (!connection) {
      log.warn({ webhook_code, item_id }, "No connection for Plaid item");
      return NextResponse.json({ received: true, unlinked: true });
    }

    const entityId = connection.entityId;

    switch (webhook_code) {
      case "SYNC_UPDATES_AVAILABLE":
        // New transactions are ready — trigger the sync job so data lands
        // promptly instead of waiting up to 6h for the cron.
        await triggerClient.tasks.trigger(
          "plaid-sync-transactions",
          { connectionId: connection.id, entityId },
          tenantJobOptions(entityId!, `plaid-webhook-sync:${connection.id}`),
        );
        log.info(
          { connectionId: connection.id, item_id },
          "Triggered sync from SYNC_UPDATES_AVAILABLE",
        );
        break;

      case "TRANSACTIONS_REMOVED":
        // Same treatment — let the sync job apply removals cleanly.
        await triggerClient.tasks.trigger(
          "plaid-sync-transactions",
          { connectionId: connection.id, entityId },
          tenantJobOptions(entityId!, `plaid-webhook-removed:${connection.id}`),
        );
        break;

      case "ITEM_ERROR":
        // Item-level failure (e.g. credentials revoked, permissions revoked).
        await db
          .update(bankConnections)
          .set({
            status: "error",
            syncError: `Plaid item error: ${webhook_code} (${(body.error ?? {}).error_code ?? "unknown"})`,
          })
          .where(eq(bankConnections.id, connection.id));
        log.warn({ connectionId: connection.id }, "Plaid item error");
        break;

      case "PENDING_EXPIRATION":
        await db
          .update(bankConnections)
          .set({
            status: "error",
            syncError: "Plaid access token expiring soon — reconnect required",
          })
          .where(eq(bankConnections.id, connection.id));
        break;

      case "NEW_ACCOUNTS_AVAILABLE":
        // Optional — user can share more accounts via update mode. No action
        // required for correctness; log for observability.
        log.info(
          { connectionId: connection.id },
          "New Plaid accounts available",
        );
        break;

      case "HISTORICAL_UPDATE":
      case "INITIAL_UPDATE":
      case "DEFAULT_UPDATE":
        // Legacy transaction-ready codes — trigger a sync as well.
        await triggerClient.tasks.trigger(
          "plaid-sync-transactions",
          { connectionId: connection.id, entityId },
          tenantJobOptions(entityId!, `plaid-webhook-update:${connection.id}`),
        );
        break;

      default:
        log.warn({ webhook_type, webhook_code }, "Unhandled Plaid webhook");
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error({ error }, "Plaid webhook processing failed");
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
