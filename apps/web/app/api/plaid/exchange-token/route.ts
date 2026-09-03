import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptConnectionToken } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import { bankConnections, bankAccounts } from "@xenboox/db/schema";
import { tenantJobOptions, triggerClient } from "@/lib/trigger";

const PLAID_API_URL =
  process.env.PLAID_ENV === "production"
    ? "https://production.plaid.com"
    : process.env.PLAID_ENV === "development"
      ? "https://development.plaid.com"
      : "https://sandbox.plaid.com";

const DEMO_MODE_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type PlaidAccount = {
  account_id: string;
  name: string;
  mask: string | null;
  balances: { iso_currency_code: string | null; current: number | null };
  type: string;
  subtype: string | null;
};

/**
 * Exchanges a Plaid public_token for an access_token and creates a bank
 * connection.
 *
 * Flow:
 * 1. Frontend gets public_token from Plaid Link
 * 2. Frontend calls this endpoint with public_token + entityId
 * 3. Backend exchanges for access_token, gets account info, stores connection
 * 4. Backend triggers the plaid-sync-transactions job for the initial sync
 *
 * Demo mode is ONLY active behind NEXT_PUBLIC_DEMO_MODE=true.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { entityId, publicToken, institutionName, institutionId, mode } =
      body as {
        entityId: string;
        publicToken?: string;
        institutionName: string;
        institutionId?: string;
        mode?: "manual";
      };

    if (!entityId || !institutionName) {
      return NextResponse.json(
        { error: "entityId and institutionName required" },
        { status: 400 },
      );
    }

    // Verify entity access
    const { resolveEntityAccess } = await import("@/lib/auth/entity-access");
    const access = await resolveEntityAccess(session.user.id!, entityId);
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // ── Manual connection (no live feed — user uploads statements) ────
    if (mode === "manual") {
      const [connection] = await db
        .insert(bankConnections)
        .values({
          entityId,
          userId: session.user.id,
          provider: "manual",
          providerConnectionId: `manual-${Date.now()}`,
          institutionName,
          institutionId: institutionId ?? institutionName.toLowerCase(),
          accountName: institutionName,
          accountNumber: null,
          currency: "USD",
          status: "active",
          lastSyncedAt: new Date(),
          metadata: { manual: true },
        })
        .returning();

      return NextResponse.json({
        success: true,
        connectionId: connection.id,
        accountName: institutionName,
        isDemoMode: false,
        isManual: true,
      });
    }

    const plaidClientId = process.env.PLAID_CLIENT_ID;
    const plaidSecret = process.env.PLAID_SECRET;

    // ── Real Plaid exchange ───────────────────────────────────────────
    if (plaidClientId && plaidSecret && publicToken) {
      // Exchange public_token for access_token (REST — no SDK dependency).
      const exchangeRes = await fetch(
        `${PLAID_API_URL}/item/public_token/exchange`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "PLAID-CLIENT-ID": plaidClientId,
            "PLAID-SECRET": plaidSecret,
          },
          body: JSON.stringify({ public_token: publicToken }),
        },
      );
      const exchangeData = (await exchangeRes.json().catch(() => ({}))) as {
        access_token?: string;
        item_id?: string;
        error_code?: string;
        error_message?: string;
        request_id?: string;
      };

      if (!exchangeRes.ok || !exchangeData.access_token) {
        return NextResponse.json(
          {
            error: exchangeData.error_message ?? "Failed to exchange token",
            errorCode: exchangeData.error_code,
          },
          { status: 502 },
        );
      }

      const accessToken = exchangeData.access_token;
      const itemId = exchangeData.item_id!;

      // H3 — dedup: never create a second connection for the same Plaid item.
      const existing = await db.query.bankConnections.findFirst({
        where: and(
          eq(bankConnections.entityId, entityId),
          eq(bankConnections.provider, "plaid"),
          eq(bankConnections.providerConnectionId, itemId),
        ),
      });
      if (existing) {
        // Re-link of an already-connected item: refresh status + sync time,
        // re-encrypt the (possibly rotated) token, and return the existing row.
        await db
          .update(bankConnections)
          .set({
            status: "active",
            accessToken: encryptConnectionToken(accessToken),
            syncError: null,
            lastSyncedAt: new Date(),
          })
          .where(eq(bankConnections.id, existing.id));

        await triggerSyncJob(entityId, existing.id);
        return NextResponse.json({
          success: true,
          connectionId: existing.id,
          isDemoMode: false,
          duplicate: true,
        });
      }

      // Get account info
      const accountsRes = await fetch(`${PLAID_API_URL}/accounts/get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PLAID-CLIENT-ID": plaidClientId,
          "PLAID-SECRET": plaidSecret,
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const accountsData = (await accountsRes.json().catch(() => ({}))) as {
        accounts?: PlaidAccount[];
        error_code?: string;
        error_message?: string;
      };

      const account: PlaidAccount | undefined = accountsData.accounts?.[0];
      const accountName = account?.name ?? institutionName;
      const accountNumber = account?.mask ?? "0000";
      const currency = account?.balances.iso_currency_code ?? "USD";

      // Store the access_token encrypted at rest (AES-256-GCM). Throws in
      // production if FIELD_ENCRYPTION_KEY is unset — never plaintext tokens.
      const encryptedToken = encryptConnectionToken(accessToken);
      const [connection] = await db
        .insert(bankConnections)
        .values({
          entityId,
          userId: session.user.id,
          provider: "plaid",
          providerConnectionId: itemId,
          institutionName,
          institutionId: institutionId ?? institutionName.toLowerCase(),
          accountName,
          accountNumber,
          currency,
          status: "active",
          accessToken: encryptedToken,
          lastSyncedAt: new Date(),
        })
        .returning();

      // Upsert the bank account — reuse an existing row for this connection
      // instead of duplicating on re-connect (H3).
      const existingAccount = await db.query.bankAccounts.findFirst({
        where: and(
          eq(bankAccounts.entityId, entityId),
          eq(bankAccounts.bankName, institutionName),
          eq(bankAccounts.accountNumber, accountNumber),
        ),
      });
      if (existingAccount) {
        await db
          .update(bankAccounts)
          .set({
            name: accountName,
            currency,
            isActive: true,
          })
          .where(eq(bankAccounts.id, existingAccount.id));
      } else {
        await db.insert(bankAccounts).values({
          entityId,
          name: accountName,
          bankName: institutionName,
          accountNumber,
          currency,
          currentBalance: String(account?.balances.current ?? 0),
          isActive: true,
        });
      }

      await triggerSyncJob(entityId, connection.id);

      return NextResponse.json({
        success: true,
        connectionId: connection.id,
        accountName,
        isDemoMode: false,
      });
    }

    // ── Demo mode (opt-in only) ───────────────────────────────────────
    if (DEMO_MODE_ENABLED) {
      const [connection] = await db
        .insert(bankConnections)
        .values({
          entityId,
          userId: session.user.id,
          provider: "manual",
          providerConnectionId: `demo-${Date.now()}`,
          institutionName,
          institutionId: institutionId ?? institutionName.toLowerCase(),
          accountName: institutionName,
          accountNumber: "00000000",
          currency: "USD",
          status: "active",
          lastSyncedAt: new Date(),
        })
        .returning();

      return NextResponse.json({
        success: true,
        connectionId: connection.id,
        accountName: institutionName,
        isDemoMode: true,
      });
    }

    return NextResponse.json(
      { error: "Plaid is not configured" },
      { status: 503 },
    );
  } catch (error) {
    console.error("Failed to exchange token:", error);
    return NextResponse.json(
      { error: "Failed to connect bank account" },
      { status: 500 },
    );
  }
}

/** Fire the real sync job after a successful exchange. */
async function triggerSyncJob(
  entityId: string,
  connectionId: string,
): Promise<void> {
  try {
    await triggerClient.tasks.trigger(
      "plaid-sync-transactions",
      { connectionId, entityId },
      tenantJobOptions(entityId, `plaid-initial-sync:${connectionId}`),
    );
  } catch (error) {
    // Sync is retryable via the UI/cron — never fail the connection itself.
    console.error("Failed to trigger initial sync:", error);
    // Best-effort: mark the error on the connection so the UI surfaces it.
    await db
      .update(bankConnections)
      .set({ syncError: "Initial sync could not be started" })
      .where(and(eq(bankConnections.id, connectionId)));
  }
}
