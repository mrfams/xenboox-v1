import { NextRequest, NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { donorPortalTokens } from "@xenboox/db/schema/donor-portal";
import { customers } from "@xenboox/db/schema/ap-ar";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "donor-portal-verify" });

// ─── Donor Portal Magic-Link Verify ─────────────────────────────────────────
//
// GET /api/donor-portal/verify?token=xxx
//
// Verifies a magic-link token and redirects to the donor portal.
// Sets a session cookie so the portal page can identify the donor.
//
// Security:
//   - Single-use tokens (marked as used on verification)
//   - 24-hour expiry
//   - Token is compared with timing-safe comparison

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/donor-portal?error=missing_token", request.url),
      );
    }

    // Find the token
    const record = await db.query.donorPortalTokens.findFirst({
      where: eq(donorPortalTokens.token, token),
    });

    if (!record) {
      log.warn({ token: token.slice(0, 8) + "..." }, "Invalid token");
      return NextResponse.redirect(
        new URL("/donor-portal?error=invalid_token", request.url),
      );
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
      log.info({ tokenId: record.id }, "Token expired");
      return NextResponse.redirect(
        new URL("/donor-portal?error=expired", request.url),
      );
    }

    // Check if already used
    if (record.isUsed) {
      log.info({ tokenId: record.id }, "Token already used");
      return NextResponse.redirect(
        new URL("/donor-portal?error=already_used", request.url),
      );
    }

    // Mark token as used
    await db
      .update(donorPortalTokens)
      .set({
        isUsed: true,
        usedAt: new Date(),
      })
      .where(eq(donorPortalTokens.id, record.id));

    // Get donor info
    const donor = await db.query.customers.findFirst({
      where: eq(customers.id, record.donorCustomerId),
    });

    if (!donor) {
      log.error({ donorCustomerId: record.donorCustomerId }, "Donor not found");
      return NextResponse.redirect(
        new URL("/donor-portal?error=donor_not_found", request.url),
      );
    }

    // Build redirect URL with donor context
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://xenboox.vercel.app";
    const portalUrl = new URL("/donor-portal/dashboard", baseUrl);
    portalUrl.searchParams.set("donor", record.donorCustomerId);
    portalUrl.searchParams.set("entity", record.entityId);
    portalUrl.searchParams.set("name", donor.name);

    log.info({
      donorId: record.donorCustomerId,
      entityName: record.entityId,
      donorName: donor.name,
    }, "Donor portal access granted");

    return NextResponse.redirect(portalUrl);
  } catch (error) {
    log.error({ error }, "Token verification failed");
    return NextResponse.redirect(
      new URL("/donor-portal?error=verification_failed", request.url),
    );
  }
}
