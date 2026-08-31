import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { customers } from "@xenboox/db/schema/ap-ar";
import { donorPortalTokens } from "@xenboox/db/schema/donor-portal";
import { entities } from "@xenboox/db/schema/organization";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { getAppUrl } from "@/lib/app-url";

const log = logger.child({ module: "donor-portal-request" });

// ── In-memory IP rate limiter ─────────────────────────────────────────────
// Sliding window: max IP_RATE_LIMIT_MAX requests per IP per IP_RATE_LIMIT_MS.
// Resets on cold start (acceptable for serverless — attacker must repeat).
const ipRateLimit = new Map<string, { timestamps: number[] }>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, entry] of ipRateLimit) {
      entry.timestamps = entry.timestamps.filter(
        (t) => now - t < IP_RATE_LIMIT_MS,
      );
      if (entry.timestamps.length === 0) ipRateLimit.delete(ip);
    }
  },
  5 * 60 * 1000,
);

const TOKEN_EXPIRY_HOURS = 24;
const EMAIL_RATE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes per email
const IP_RATE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes per IP
const IP_RATE_LIMIT_MAX = 10; // max requests per IP per window

// ─── Donor Portal Magic-Link Request ────────────────────────────────────────
//
// POST /api/donor-portal/request
//
// Sends a magic-link email to a donor. The donor clicks the link and gets
// access to a read-only portal showing their funded projects and reports.
//
// Rate limited: 1 request per email per 5 minutes.
// Token expiry: 24 hours.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, entityId } = body as { email?: string; entityId?: string };

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!entityId || typeof entityId !== "string") {
      return NextResponse.json(
        { error: "Entity ID is required" },
        { status: 400 },
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find the donor customer by email
    const donor = await db.query.customers.findFirst({
      where: and(
        eq(customers.entityId, entityId),
        eq(customers.contactEmail, normalizedEmail),
        eq(customers.isDonor, true),
      ),
    });

    if (!donor) {
      // Don't reveal whether the email exists — always return success
      log.warn(
        { email: normalizedEmail },
        "Donor not found — returning generic success",
      );
      return NextResponse.json({
        success: true,
        message:
          "If this email is registered as a donor, you will receive a login link.",
      });
    }

    // ── IP-based rate limiting (in-memory sliding window) ────────────────
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const ipNow = Date.now();
    const ipEntry = ipRateLimit.get(clientIp);
    if (ipEntry) {
      // Remove expired timestamps
      ipEntry.timestamps = ipEntry.timestamps.filter(
        (t) => ipNow - t < IP_RATE_LIMIT_MS,
      );
      if (ipEntry.timestamps.length >= IP_RATE_LIMIT_MAX) {
        log.warn({ ip: clientIp }, "IP rate limit exceeded");
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 },
        );
      }
      ipEntry.timestamps.push(ipNow);
    } else {
      ipRateLimit.set(clientIp, { timestamps: [ipNow] });
    }

    // ── Email-based rate limiting (database-backed) ──────────────────────
    const recentToken = await db.query.donorPortalTokens.findFirst({
      where: and(
        eq(donorPortalTokens.entityId, entityId),
        eq(donorPortalTokens.email, normalizedEmail),
      ),
    });

    if (recentToken) {
      const timeSinceLastRequest = Date.now() - recentToken.createdAt.getTime();
      if (timeSinceLastRequest < EMAIL_RATE_LIMIT_MS) {
        const waitMinutes = Math.ceil(
          (EMAIL_RATE_LIMIT_MS - timeSinceLastRequest) / 60000,
        );
        return NextResponse.json(
          {
            error: `Please wait ${waitMinutes} minute(s) before requesting another link.`,
          },
          { status: 429 },
        );
      }
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    // Store token
    await db.insert(donorPortalTokens).values({
      entityId,
      donorCustomerId: donor.id,
      token,
      email: normalizedEmail,
      expiresAt,
    });

    // Build magic link URL
    const baseUrl = getAppUrl();
    const magicLinkUrl = `${baseUrl}/donor-portal/auth?token=${token}`;

    // Send email
    const entity = await db.query.entities.findFirst({
      where: eq(entities.id, entityId),
    });

    const entityName = entity?.name ?? "Xenboox";

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 8px;">Your Donor Portal</h1>
          <p style="color: #64748b; font-size: 14px;">${entityName}</p>
        </div>
        <p style="color: #334155; line-height: 1.6;">Click the button below to access your donor portal. You can view your funded projects, budget vs actual reports, and submission status.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${magicLinkUrl}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">Access Donor Portal</a>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.6;">This link expires in ${TOKEN_EXPIRY_HOURS} hours. If you didn't request this email, you can safely ignore it.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">Powered by Xenboox AI — ${entityName}</p>
      </div>
    `;

    if (resend) {
      const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: [normalizedEmail],
        subject: `Access Your Donor Portal — ${entityName}`,
        html,
      });

      if (error) {
        log.error({ error: error.message }, "Failed to send magic-link email");
        return NextResponse.json(
          { error: "Failed to send email. Please try again." },
          { status: 500 },
        );
      }
    } else {
      log.warn("Resend not configured — skipping email");
    }

    log.info({ email: normalizedEmail, donorId: donor.id }, "Magic-link sent");

    return NextResponse.json({
      success: true,
      message:
        "If this email is registered as a donor, you will receive a login link.",
    });
  } catch (error) {
    log.error({ error }, "Donor portal request failed");
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
