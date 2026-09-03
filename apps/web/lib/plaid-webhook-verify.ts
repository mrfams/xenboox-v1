// Plaid Webhook Verification
//
// Plaid signs every outgoing webhook: the `Plaid-Verification` header carries
// a JWT (ES256) whose payload contains `request_body_sha256` and `iat`. Per
// Plaid docs we verify in four steps:
//   1. decode JWT header → kid, ensure alg is ES256
//   2. fetch the verification key from Plaid /webhook_verification_key/get
//   3. verify the JWT signature + iat (≤ 5 min old, replay protection)
//   4. compare sha256(rawBody) to the JWT's request_body_sha256
//
// Implementation uses `jose` (already in the web dependency tree via the auth
// stack) and plain fetch for the key endpoint (no plaid SDK required).
// Key caching: Plaid rotates keys rarely; we cache per-kid in-memory.

import crypto from "crypto";
import { importJWK, jwtVerify } from "jose";

import { logger } from "@/lib/logger";

const log = logger.child({ module: "plaid-webhook-verify" });

const PLAID_API_URL =
  process.env.PLAID_ENV === "production"
    ? "https://production.plaid.com"
    : process.env.PLAID_ENV === "development"
      ? "https://development.plaid.com"
      : "https://sandbox.plaid.com";

const MAX_TOKEN_AGE_SECONDS = 5 * 60;

// kid → { key: JWK, fetchedAt: number }
const keyCache = new Map<
  string,
  { key: Record<string, unknown>; fetchedAt: number }
>();
const KEY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Fetch + cache the Plaid webhook verification key for a given kid. */
async function getVerificationKey(
  kid: string,
): Promise<Record<string, unknown> | null> {
  const cached = keyCache.get(kid);
  if (cached && Date.now() - cached.fetchedAt < KEY_CACHE_TTL_MS) {
    return cached.key;
  }

  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) return null;

  try {
    const res = await fetch(`${PLAID_API_URL}/webhook_verification_key/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
      body: JSON.stringify({ key_id: kid }),
    });
    if (!res.ok) {
      log.warn({ kid, status: res.status }, "Key fetch failed");
      return null;
    }
    const body = (await res.json()) as {
      key?: Record<string, unknown>;
      error_code?: string;
    };
    if (!body.key) {
      log.warn({ kid, error_code: body.error_code }, "No key in response");
      return null;
    }
    keyCache.set(kid, { key: body.key, fetchedAt: Date.now() });
    return body.key;
  } catch (error) {
    log.warn({ error }, "Exception fetching verification key");
    return null;
  }
}

/**
 * Verify a Plaid webhook. Returns true only when the signature is valid,
 * the token is fresh (≤5 min), and the body hash matches — otherwise false.
 */
export async function verifyPlaidWebhook(
  rawBody: string,
  plaidVerificationHeader: string | null,
): Promise<boolean> {
  if (!plaidVerificationHeader) {
    // Plaid verification is optional per docs, but in production a webhook
    // without any signature must be rejected (spoof protection).
    if (process.env.NODE_ENV === "production") return false;
    // Non-production: allow unsigned webhooks for local testing only when no
    // PLAID_CLIENT_ID is configured (mirrors the mono webhook convention).
    return !process.env.PLAID_CLIENT_ID;
  }

  try {
    // 1. Decode header without validating signature.
    const [headerB64] = plaidVerificationHeader.split(".");
    if (!headerB64) return false;
    const header = JSON.parse(
      Buffer.from(headerB64, "base64url").toString("utf8"),
    ) as { alg?: string; kid?: string };
    if (header.alg !== "ES256" || !header.kid) return false;

    // 2. Fetch the verification key for this kid.
    const jwk = await getVerificationKey(header.kid);
    if (!jwk) return false;

    // 3. Verify signature + max age (replay protection).
    const keyLike = await importJWK(jwk as never, "ES256");
    const { payload } = await jwtVerify(plaidVerificationHeader, keyLike, {
      maxTokenAge: `${MAX_TOKEN_AGE_SECONDS}s`,
    });

    // 4. Body hash integrity check (constant-time).
    const bodyHash = crypto
      .createHash("sha256")
      .update(rawBody, "utf8")
      .digest("hex");
    const claimed = payload.request_body_sha256 as string | undefined;
    if (!claimed || bodyHash.length !== claimed.length) return false;

    const expectedBuf = Buffer.from(bodyHash);
    const actualBuf = Buffer.from(claimed);
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch (error) {
    log.warn({ error }, "Webhook verification failed");
    return false;
  }
}
