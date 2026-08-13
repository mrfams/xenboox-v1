import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

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

    // TODO: Store in database or send to newsletter service (Mailchimp, Resend Audiences, etc.)
    log.info({ email }, "Newsletter subscription received");

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Newsletter subscription failed");
    return NextResponse.json(
      { error: "Failed to process subscription" },
      { status: 500 },
    );
  }
}
