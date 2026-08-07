import { NextRequest, NextResponse } from "next/server";
import { bankConnections } from "@xenboox/db/schema/integrations";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { verifyMonoSignature } from "@/lib/webhook-verify";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("mono-signature");

    if (!verifyMonoSignature(rawBody, signature)) {
      console.error("[Mono Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { event, data } = body;

    console.log("[Mono Webhook] Received event:", event, data?.id);

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

            console.log(
              "[Mono Webhook] Sync completed for connection:",
              connection.id,
            );
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
        console.log("[Mono Webhook] Unhandled event:", event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Mono Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
