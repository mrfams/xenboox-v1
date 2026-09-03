import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { entities } from "@xenboox/db/schema";

const PLAID_API_URL =
  process.env.PLAID_ENV === "production"
    ? "https://production.plaid.com"
    : process.env.PLAID_ENV === "development"
      ? "https://development.plaid.com"
      : "https://sandbox.plaid.com";

const DEMO_MODE_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

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
 * Real Plaid integration requires PLAID_CLIENT_ID + PLAID_SECRET.
 * Demo mode is ONLY active behind NEXT_PUBLIC_DEMO_MODE=true — never when
 * env vars are merely absent in production.
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

    const plaidClientId = process.env.PLAID_CLIENT_ID;
    const plaidSecret = process.env.PLAID_SECRET;

    if (!plaidClientId || !plaidSecret) {
      // Demo mode is opt-in via env — in production a missing config is an
      // error, never a silent fake connection.
      if (DEMO_MODE_ENABLED) {
        return NextResponse.json({
          linkToken: `demo-link-token-${Date.now()}`,
          expiration: new Date(Date.now() + 3600000).toISOString(),
          requestId: `demo-${Date.now()}`,
          isDemoMode: true,
        });
      }
      return NextResponse.json(
        { error: "Plaid is not configured" },
        { status: 503 },
      );
    }

    // Real Plaid — REST call (no SDK dependency; matches the jobs package).
    const response = await fetch(`${PLAID_API_URL}/link/token/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PLAID-CLIENT-ID": plaidClientId,
        "PLAID-SECRET": plaidSecret,
      },
      body: JSON.stringify({
        user: { client_user_id: session.user.id },
        client_name: "Xenboox",
        products: ["transactions"],
        country_codes: ["US", "GB", "CA", "EU"],
        language: "en",
        // When transactions is in the products array, Plaid takes the history
        // window from transactions.days_requested (max 730 = 24 months).
        transactions: { days_requested: 730 },
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      link_token?: string;
      expiration?: string;
      request_id?: string;
      error_code?: string;
      error_message?: string;
    };

    if (!response.ok || !data.link_token) {
      return NextResponse.json(
        {
          error: data.error_message ?? "Failed to create link token",
          errorCode: data.error_code,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      linkToken: data.link_token,
      expiration: data.expiration,
      requestId: data.request_id,
      isDemoMode: false,
    });
  } catch (error) {
    console.error("Failed to create link token:", error);
    return NextResponse.json(
      { error: "Failed to create link token" },
      { status: 500 },
    );
  }
}
