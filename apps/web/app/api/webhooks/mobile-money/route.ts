import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import {
  mobileMoneyAccounts,
  mobileMoneyTransactions,
} from "@xenboox/db/schema";

import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/webhook-verify";
import { logger } from "@/lib/logger";
import { claimWebhookEvent, shortHash } from "@/lib/webhooks/dedup";

const log = logger.child({ module: "mobile-money-webhook" });

// ─── Mobile Money Webhook Endpoint ──────────────────────────────────────────
//
// Receives real-time transaction notifications from mobile money providers
// (Wave, Orange Money, QCell/QMoney, Africell Money, M-Pesa).
//
// Provider payloads are standardised into this schema:
//
//   {
//     event: "transaction.completed" | "transaction.failed" | "balance.updated",
//     provider: "wave" | "modempay" | "afrimoney" | "qmoney" | "mpesa",
//     data: {
//       providerTxId: string,
//       phoneNumber: string,
//       type: "collection" | "disbursement" | "transfer" | "refund",
//       amount: number,
//       fee?: number,
//       netAmount: number,
//       counterparty?: string,
//       counterpartyName?: string,
//       description?: string,
//       status: "pending" | "successful" | "failed" | "reversed" | "timeout",
//       initiatedAt: string (ISO),
//       completedAt?: string (ISO),
//     }
//   }

type ProviderEvent =
  | "transaction.completed"
  | "transaction.failed"
  | "transaction.pending"
  | "balance.updated";

type ProviderName =
  | "wave"
  | "modempay"
  | "afrimoney"
  | "qmoney"
  | "mpesa";

interface WebhookPayload {
  event: ProviderEvent;
  provider: ProviderName;
  data: {
    providerTxId: string;
    phoneNumber: string;
    type: "collection" | "disbursement" | "transfer" | "refund";
    amount: number;
    fee?: number;
    netAmount: number;
    counterparty?: string;
    counterpartyName?: string;
    description?: string;
    status: "pending" | "successful" | "failed" | "reversed" | "timeout";
    initiatedAt: string;
    completedAt?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-webhook-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
      log.warn("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as WebhookPayload;
    const { event, provider, data } = body;

    log.info({ event, provider, providerTxId: data?.providerTxId }, "Received mobile money webhook");

    // Dedup: at-least-once delivery
    const eventKey = `mm:${provider}:${event}:${data?.providerTxId ?? shortHash(rawBody)}`;
    if (!(await claimWebhookEvent(eventKey))) {
      log.info({ eventKey }, "Duplicate webhook event — skipping");
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Validate required fields
    if (!data?.providerTxId || !data?.phoneNumber || !data?.type || !data?.amount) {
      log.warn({ data }, "Missing required fields in webhook payload");
      return NextResponse.json(
        { error: "Missing required fields: providerTxId, phoneNumber, type, amount" },
        { status: 400 },
      );
    }

    // Find the matching mobile money account by phone number + provider
    const account = await db.query.mobileMoneyAccounts.findFirst({
      where: and(
        eq(mobileMoneyAccounts.entityId, ""), // will be resolved below
        eq(mobileMoneyAccounts.provider, provider),
      ),
    });

    // Find account by phone number across all entities
    const accountByPhone = await db.query.mobileMoneyAccounts.findFirst({
      where: and(
        eq(mobileMoneyAccounts.phoneNumber, data.phoneNumber),
        eq(mobileMoneyAccounts.provider, provider),
        eq(mobileMoneyAccounts.isActive, true),
      ),
    });

    if (!accountByPhone) {
      log.warn(
        { phoneNumber: data.phoneNumber, provider },
        "No active mobile money account found for this phone number",
      );
      return NextResponse.json(
        { error: "No active account found for this phone/provider combination" },
        { status: 404 },
      );
    }

    // Check for duplicate transaction
    const existing = await db.query.mobileMoneyTransactions.findFirst({
      where: eq(mobileMoneyTransactions.providerTxId, data.providerTxId),
    });

    if (existing) {
      // Update status if the event is a completion/failure
      if (event === "transaction.completed" && existing.status !== "successful") {
        await db
          .update(mobileMoneyTransactions)
          .set({
            status: "successful",
            completedAt: data.completedAt ? new Date(data.completedAt) : new Date(),
          })
          .where(eq(mobileMoneyTransactions.id, existing.id));

        log.info({ txId: existing.id }, "Updated existing transaction to successful");
      } else if (event === "transaction.failed" && existing.status !== "failed") {
        await db
          .update(mobileMoneyTransactions)
          .set({
            status: "failed",
            failedAt: new Date(),
            failureReason: data.description ?? "Failed via webhook",
          })
          .where(eq(mobileMoneyTransactions.id, existing.id));

        log.info({ txId: existing.id }, "Updated existing transaction to failed");
      }

      return NextResponse.json({ received: true, updated: true });
    }

    // Insert new transaction
    const netAmount = data.netAmount ?? data.amount - (data.fee ?? 0);

    const [tx] = await db
      .insert(mobileMoneyTransactions)
      .values({
        entityId: accountByPhone.entityId,
        mobileMoneyAccountId: accountByPhone.id,
        providerTxId: data.providerTxId,
        type: data.type,
        amount: String(data.amount),
        fee: String(data.fee ?? 0),
        netAmount: String(netAmount),
        counterparty: data.counterparty ?? null,
        counterpartyName: data.counterpartyName ?? null,
        description: data.description ?? null,
        status: data.status ?? "pending",
        initiatedAt: data.initiatedAt ? new Date(data.initiatedAt) : new Date(),
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
      })
      .returning();

    log.info(
      {
        txId: tx.id,
        provider,
        type: data.type,
        amount: data.amount,
        status: data.status,
      },
      "Mobile money transaction ingested via webhook",
    );

    return NextResponse.json({ received: true, txId: tx.id });
  } catch (error) {
    log.error({ error }, "Mobile money webhook processing failed");
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
