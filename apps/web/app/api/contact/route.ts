import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";

const log = logger.child({ module: "api-contact" });

const contactSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Valid email required"),
  company: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1, "Message required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 },
      );
    }

    const { name, email, company, subject, message } = parsed.data;

    // TODO: Store in database, send to CRM, or forward to support email
    log.info(
      { name, email, company, subject },
      "Contact form submission received",
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Contact form submission failed");
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
