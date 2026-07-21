import crypto from "crypto";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const MONO_WEBHOOK_SECRET = process.env.MONO_WEBHOOK_SECRET;

/**
 * Verifies a generic HMAC-SHA256 webhook signature.
 *
 * Expects the raw request body and the signature from the `x-webhook-signature`
 * header. If no secret is configured, verification is skipped (development mode).
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === "production") {
      return false;
    }
    return true;
  }

  if (!signatureHeader) return false;

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody, "utf-8")
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader),
  );
}

/**
 * Verifies a Mono API webhook signature.
 *
 * Mono signs webhooks with HMAC-SHA256 and sends the signature
 * in the `mono-signature` header.
 */
export function verifyMonoSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!MONO_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === "production") {
      return false;
    }
    return true;
  }

  if (!signatureHeader) return false;

  const expected = crypto
    .createHmac("sha256", MONO_WEBHOOK_SECRET)
    .update(rawBody, "utf-8")
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader),
  );
}
