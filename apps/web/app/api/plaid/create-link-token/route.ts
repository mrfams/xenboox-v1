import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/edge";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { entities } from "@xenboox/db/schema";

/**
 * Creates a Plaid Link token for the frontend to use.
 *
 * Flow:
 * 1. Frontend calls this endpoint to get a link_token
 * 2. Frontend opens Plaid Link with the link_token
 * 3. User selects their bank and authenticates
 * 4. Plaid returns a public_token
 * 5. Frontend calls /api/plaid/exchange-token with the public_token
 * 6. Backend exchanges public_token for access_token and stores it
 *
 * Requires PLAID_CLIENT_ID and PLAID_SECRET env vars.
 * Falls back to demo mode if not configured.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { entityId } = body;

    if (!entityId) {
      return NextResponse.json({ error: "entityId required" }, { status: 400 });
    }

    // Verify entity access
    const { resolveEntityAccess } = await import("@/lib/auth/entity-access");
    const access = await resolveEntityAccess(session.user.id!, entityId);
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const entity = await db.query.entities.findFirst({
      where: eq(entities.id, entityId),
    });
    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    // Check if Plaid is configured
    const plaidClientId = process.env.PLAID_CLIENT_ID;
    const plaidSecret = process.env.PLAID_SECRET;

    if (!plaidClientId || !plaidSecret) {
      // Demo mode — return a mock link token
      return NextResponse.json({
        linkToken: `demo-link-token-${Date.now()}`,
        expiration: new Date(Date.now() + 3600000).toISOString(),
        requestId: `demo-${Date.now()}`,
        isDemoMode: true,
      });
    }

    // Real Plaid integration
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

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: session.user.id },
      client_name: "Xenboox",
      products: ["transactions"],
      country_codes: ["US", "GB", "CA", "EU"],
      language: "en",
    });

    return NextResponse.json({
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
      requestId: response.data.request_id,
      isDemoMode: false,
    });
  } catch (error) {
    console.error("Failed to create link token:", error);
    return NextResponse.json(
      { error: "Failed to create link token" },
      { status: 500 }
    );
  }
}
