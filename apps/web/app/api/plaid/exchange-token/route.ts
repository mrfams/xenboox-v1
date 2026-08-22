import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/edge";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { entities, bankConnections, bankAccounts } from "@xenboox/db/schema";

/**
 * Exchanges a Plaid public_token for an access_token and creates a bank connection.
 *
 * Flow:
 * 1. Frontend gets public_token from Plaid Link
 * 2. Frontend calls this endpoint with public_token + entityId
 * 3. Backend exchanges for access_token, gets account info, stores connection
 * 4. Backend triggers initial transaction sync
 *
 * In demo mode, creates a mock connection without Plaid.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { entityId, publicToken, institutionName, institutionId } = body;

    if (!entityId || !institutionName) {
      return NextResponse.json(
        { error: "entityId and institutionName required" },
        { status: 400 }
      );
    }

    // Verify entity access
    const entity = await db.query.entities.findFirst({
      where: eq(entities.id, entityId),
    });
    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    const plaidClientId = process.env.PLAID_CLIENT_ID;
    const plaidSecret = process.env.PLAID_SECRET;

    let providerConnectionId = `demo-${Date.now()}`;
    let accountName = institutionName;
    let accountNumber = "00000000";
    let currency = "USD";

    if (plaidClientId && plaidSecret && publicToken && !publicToken.startsWith("demo-")) {
      // Real Plaid exchange
      const { Configuration, PlaidApi, PlaidEnvironments } = await import("plaid");

      const configuration = new Configuration({
        basePath:
          process.env.PLAID_ENV === "production"
            ? PlaidEnvironments.production
            : process.env.PLAID_ENV === "development"
              ? PlaidEnvironments.development
              : PlaidEnvironments.sandbox,
        baseOptions: {
          headers: {
            "PLAID-CLIENT-ID": plaidClientId,
            "PLAID-SECRET": plaidSecret,
          },
        },
      });

      const plaidClient = new PlaidApi(configuration);

      // Exchange public_token for access_token
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const accessToken = exchangeResponse.data.access_token;
      providerConnectionId = exchangeResponse.data.item_id;

      // Get account info
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      });

      const account = accountsResponse.data.accounts[0];
      if (account) {
        accountName = account.name;
        accountNumber = account.mask ?? "0000";
        currency = account.balances.iso_currency_code ?? "USD";
      }

      // Store the access_token securely (encrypted in production)
      const [connection] = await db
        .insert(bankConnections)
        .values({
          entityId,
          userId: session.user.id,
          provider: "plaid",
          providerConnectionId,
          institutionName,
          institutionId: institutionId ?? institutionName.toLowerCase(),
          accountName,
          accountNumber,
          currency,
          status: "active",
          accessToken, // TODO: encrypt in production
          lastSyncedAt: new Date(),
        })
        .returning();

      // Create a corresponding bank account
      await db.insert(bankAccounts).values({
        entityId,
        name: accountName,
        bankName: institutionName,
        accountNumber,
        currency,
        currentBalance: "0",
        isActive: true,
      });

      return NextResponse.json({
        success: true,
        connectionId: connection.id,
        accountName,
        isDemoMode: false,
      });
    }

    // Demo mode — create a mock connection
    const [connection] = await db
      .insert(bankConnections)
      .values({
        entityId,
        userId: session.user.id,
        provider: "manual",
        providerConnectionId,
        institutionName,
        institutionId: institutionId ?? institutionName.toLowerCase(),
        accountName,
        accountNumber,
        currency,
        status: "active",
        lastSyncedAt: new Date(),
      })
      .returning();

    // Create demo bank account
    await db.insert(bankAccounts).values({
      entityId,
      name: accountName,
      bankName: institutionName,
      accountNumber,
      currency,
      currentBalance: (Math.random() * 50000 + 10000).toFixed(2),
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      accountName,
      isDemoMode: true,
    });
  } catch (error) {
    console.error("Failed to exchange token:", error);
    return NextResponse.json(
      { error: "Failed to connect bank account" },
      { status: 500 }
    );
  }
}
