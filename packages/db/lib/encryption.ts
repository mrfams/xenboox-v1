// Enterprise Encryption Utilities
// AES-256 encryption for sensitive fields using Node.js crypto

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

interface EncryptionResult {
  encrypted: string;
  keyVersion: string;
}

interface DecryptionResult {
  decrypted: string;
  success: boolean;
  error?: string;
}

/**
 * Derive a key from a password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a plaintext value using AES-256-GCM
 */
export function encrypt(plaintext: string, password: string, keyVersion: string = 'v1'): EncryptionResult {
  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(password, salt);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine salt + iv + tag + encrypted
    const buffer = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);
    
    return {
      encrypted: buffer.toString('base64'),
      keyVersion
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt an encrypted value using AES-256-GCM
 */
export function decrypt(encrypted: string, password: string): DecryptionResult {
  try {
    const buffer = Buffer.from(encrypted, 'base64');
    
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION);
    const tag = buffer.subarray(TAG_POSITION, ENCRYPTED_POSITION);
    const encryptedText = buffer.subarray(ENCRYPTED_POSITION);
    
    const key = deriveKey(password, salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return {
      decrypted: decrypted.toString('utf8'),
      success: true
    };
  } catch (error) {
    return {
      decrypted: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Hash a value using SHA-256 (for comparison, not encryption)
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a random encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Generate a key version identifier based on timestamp
 */
export function generateKeyVersion(): string {
  return `v${Date.now()}`;
}

/**
 * Check if a value appears to be encrypted (base64 format check)
 */
export function isEncrypted(value: string): boolean {
  try {
    const buffer = Buffer.from(value, 'base64');
    return buffer.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
  } catch {
    return false;
  }
}