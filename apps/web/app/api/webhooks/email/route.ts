import { NextRequest, NextResponse } from "next/server";
import {
  inboundEmails,
  emailForwardingRules,
} from "@xenboox/db/schema/integrations";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { triggerClient } from "@/lib/trigger";
import { verifyWebhookSignature } from "@/lib/webhook-verify";
import { logger } from "@/lib/logger";
import { claimWebhookEvent, shortHash } from "@/lib/webhooks/dedup";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const signature =
      request.headers.get("x-webhook-signature") ??
      request.headers.get("svix-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    const body = JSON.parse(rawBody);

    // At-least-once delivery: drop retried events so a message never creates
    // duplicate inbound email records or double job triggers.
    const eventId = body.data?.id ?? body.id ?? shortHash(rawBody);
    const eventKey = `email:${eventId}`;
    if (!(await claimWebhookEvent(eventKey))) {
      logger.info({ eventKey }, "Duplicate email webhook event — skipping");
      return NextResponse.json({ received: true, duplicate: true });
    }

    const {
      from,
      to,
      subject,
      text: textBody,
      html: htmlBody,
      attachments = [],
    } = body.data ?? body;

    if (!from || !to || !subject) {
      return NextResponse.json(
        { error: "Missing required fields: from, to, subject" },
        { status: 400 },
      );
    }

    const toAddress = Array.isArray(to) ? to[0] : to;

    // Find the forwarding rule by email address
    const rule = await db.query.emailForwardingRules.findFirst({
      where: eq(emailForwardingRules.emailAddress, toAddress),
    });

    if (!rule) {
      logger.warn({ toAddress }, "No forwarding rule found");
      return NextResponse.json(
        { error: "Forwarding rule not found" },
        { status: 404 },
      );
    }

    // Create inbound email record
    const [email] = await db
      .insert(inboundEmails)
      .values({
        entityId: rule.entityId,
        ruleId: rule.id,
        fromAddress: from,
        toAddress: toAddress,
        subject,
        bodyText: textBody ?? "",
        bodyHtml: htmlBody,
        attachmentCount: attachments.length,
        status: "received",
        metadata: body,
      })
      .returning();

    // Process if autoClassify is enabled
    if (rule.autoClassify && attachments.length > 0) {
      const processedAttachments = attachments.map(
        (att: {
          filename: string;
          content: string;
          contentType?: string;
          size?: number;
        }) => ({
          filename: att.filename ?? "unknown",
          mimeType: att.contentType ?? "application/octet-stream",
          size: att.size ?? 0,
          buffer: att.content,
        }),
      );

      await triggerClient.tasks.trigger("process-inbound-email", {
        emailId: email.id,
        entityId: rule.entityId,
        from,
        subject,
        textBody: textBody ?? "",
        htmlBody,
        attachments: processedAttachments,
      });

      await db
        .update(inboundEmails)
        .set({ status: "processing" })
        .where(eq(inboundEmails.id, email.id));
    }

    return NextResponse.json({
      received: true,
      emailId: email.id,
      autoProcessed: rule.autoClassify && attachments.length > 0,
    });
  } catch (error) {
    logger.error({ err: error }, "Email webhook processing failed");
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
