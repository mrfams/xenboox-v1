// Bank Connection Token Encryption
//
// Plaid/Mono access tokens are live credentials — they can read account
// balances and transactions indefinitely. They must never sit in the DB as
// plaintext when a key is available.
//
// Design:
//  - AES-256-GCM via ./encryption, stored in the SAME column with a version
//    prefix (`xenc:v1:`). No separate table, no nulled columns, no lookup
//    breakage, backward compatible with existing plaintext rows.
//  - If FIELD_ENCRYPTION_KEY is unset and NODE_ENV === "production",
//    encrypting THROWS (fail loud — never silently store plaintext in prod).
//    In dev/demo (no key) values pass through so local flows keep working.
//  - decryptConnectionToken treats a value without the prefix as legacy
//    plaintext and returns it as-is (old rows keep working until rewritten).

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PREFIX = "xenc:v1:";

function getMasterKey(): string | null {
  return process.env.FIELD_ENCRYPTION_KEY ?? null;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Encrypt a bank connection token for storage at rest. */
export function encryptConnectionToken(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = getMasterKey();
  if (!key) {
    if (isProduction()) {
      throw new Error(
        "FIELD_ENCRYPTION_KEY is not set — refusing to store bank tokens in plaintext in production",
      );
    }
    // Dev/demo without a key: pass through so local flows keep working.
    return plaintext;
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    crypto.createHash("sha256").update(key).digest(),
    iv,
  );
  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypt a stored bank connection token.
 * Values without the `xenc:v1:` prefix are legacy plaintext (returned as-is).
 */
export function decryptConnectionToken(
  stored: string | null | undefined,
): string | null {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext row

  const key = getMasterKey();
  if (!key) {
    // Encrypted but no key to decrypt with — never return garbage.
    return null;
  }
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const data = raw.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      crypto.createHash("sha256").update(key).digest(),
      iv,
    );
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

/** True when the stored value is ciphertext (not legacy plaintext). */
export function isTokenEncrypted(stored: string | null | undefined): boolean {
  return !!stored && stored.startsWith(PREFIX);
}
