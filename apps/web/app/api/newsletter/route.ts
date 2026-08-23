import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { getRateLimiter } from "@/lib/security/rate-limiter";

const log = logger.child({ module: "api-newsletter" });

const subscribeSchema = z.object({
  email: z.string().email("Valid email required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 },
      );
    }

    const { email } = parsed.data;

    // Rate limit: 3 subscriptions per minute per IP
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const rate = await getRateLimiter().checkApiRateLimit(`newsletter:${ip}`);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    log.info({ email }, "Newsletter subscription received");

    // Send a welcome email via Resend
    if (resend) {
      const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: "Welcome to Xenboox — You're in!",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h1 style="font-size: 24px; margin-bottom: 16px;">Welcome to Xenboox! 🎉</h1>
            <p style="font-size: 16px; color: #444; line-height: 1.6;">
              You're now subscribed to the Xenboox newsletter. You'll get product updates,
              accounting insights, and tips for growing your business.
            </p>
            <p style="font-size: 16px; color: #444; line-height: 1.6;">
              In the meantime, check out our <a href="https://xenboox.com/features" style="color: #3b4fe0;">platform features</a>
              or <a href="https://xenboox.com/blog" style="color: #3b4fe0;">read our blog</a>.
            </p>
            <p style="font-size: 14px; color: #888; margin-top: 32px;">
              — The Xenboox Team
            </p>
          </div>
        `,
      });

      if (error) {
        log.error({ err: error, email }, "Failed to send welcome email");
      }
    } else {
      log.warn("RESEND_API_KEY not configured — skipping welcome email");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Newsletter subscription failed");
    return NextResponse.json(
      { error: "Failed to process subscription" },
      { status: 500 },
    );
  }
}
