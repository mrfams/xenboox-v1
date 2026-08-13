import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Deterministic 32-byte key derived from AUTH_SECRET so the admin control
 * plane does not need a second secret in production config. Key is never
 * persisted or logged.
 */
function getKey(): Buffer {
  const base = process.env.AUTH_SECRET;
  if (!base) {
    throw new Error(
      "AUTH_SECRET environment variable is required for TOTP encryption. " +
        "Set it in your .env file or environment.",
    );
  }
  return createHash("sha256").update(`${base}:admin-totp`).digest();
}

/** Encrypt a TOTP secret with AES-256-GCM. Format: iv.tag.ciphertext (base64). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString("base64")).join(".");
}

/** Decrypt a TOTP secret. Returns null when the payload is invalid/tampered. */
export function decryptSecret(payload: string): string | null {
  // First try encrypted format: iv.tag.ciphertext (base64)
  try {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    if (ivB64 && tagB64 && dataB64) {
      const iv = Buffer.from(ivB64, "base64");
      const tag = Buffer.from(tagB64, "base64");
      const data = Buffer.from(dataB64, "base64");
      const decipher = createDecipheriv(ALGO, getKey(), iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString(
        "utf8",
      );
    }
  } catch {
    // Not encrypted or tampered — fall through
  }

  // Fallback: payload IS the raw TOTP secret (base32, e.g. from setup scripts)
  if (/^[A-Z2-7]+=*$/i.test(payload) && payload.length >= 16) {
    return payload;
  }

  return null;
}
