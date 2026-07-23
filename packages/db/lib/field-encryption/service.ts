import { db } from "../../index";
import { encryptedFields } from "../../schema/security";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt, hash } from "../encryption";
import { getFieldsForTable } from "./config";

const MASTER_PASSWORD =
  process.env.FIELD_ENCRYPTION_KEY ??
  (() => {
    throw new Error("FIELD_ENCRYPTION_KEY is not set");
  })();

let currentKeyVersion = process.env.FIELD_ENCRYPTION_KEY_VERSION ?? "v1";

/**
 * Encrypt sensitive fields in a record before inserting into the database.
 * Replaces plaintext values with hashes (for indexing) and stores the
 * encrypted payload in the encrypted_fields table.
 */
export async function encryptRecord<T extends Record<string, unknown>>(
  entityId: string,
  tableName: string,
  record: T,
): Promise<T> {
  const fields = getFieldsForTable(tableName);
  if (fields.length === 0) return record;

  const result = { ...record } as Record<string, unknown>;

  for (const field of fields) {
    const value = result[field.fieldName];
    if (value == null || value === "") continue;

    const plaintext = String(value);

    const { encrypted, keyVersion } = encrypt(
      plaintext,
      MASTER_PASSWORD,
      currentKeyVersion,
    );

    const recordId = result.id as string;
    if (recordId) {
      await db
        .insert(encryptedFields)
        .values({
          entityId,
          tableName,
          recordId,
          fieldName: field.fieldName,
          encryptedValue: encrypted,
          keyVersion,
          securityLevel:
            field.securityLevel === "restricted"
              ? "restricted"
              : "confidential",
        })
        .onConflictDoUpdate({
          target: [encryptedFields.id],
          set: { encryptedValue: encrypted, keyVersion, updatedAt: new Date() },
        });
    }

    if (field.indexed) {
      result[field.fieldName] = hash(plaintext);
    } else {
      result[field.fieldName] = null;
    }
  }

  return result as T;
}

/**
 * Decrypt sensitive fields in a record after reading from the database.
 * Looks up encrypted values from the encrypted_fields table.
 */
export async function decryptRecord<T extends Record<string, unknown>>(
  entityId: string,
  tableName: string,
  record: T,
): Promise<T> {
  const fields = getFieldsForTable(tableName);
  if (fields.length === 0) return record;

  const recordId = record.id as string;
  if (!recordId) return record;

  const result = { ...record } as Record<string, unknown>;

  for (const field of fields) {
    const row = await db.query.encryptedFields.findFirst({
      where: and(
        eq(encryptedFields.entityId, entityId),
        eq(encryptedFields.tableName, tableName),
        eq(encryptedFields.recordId, recordId),
        eq(encryptedFields.fieldName, field.fieldName),
      ),
    });

    if (row) {
      const decrypted = decrypt(row.encryptedValue, MASTER_PASSWORD);
      if (decrypted.success) {
        result[field.fieldName] = decrypted.decrypted;
      }
    }
  }

  return result as T;
}

/**
 * Decrypt multiple records (for list queries).
 */
export async function decryptRecords<T extends Record<string, unknown>>(
  entityId: string,
  tableName: string,
  records: T[],
): Promise<T[]> {
  if (records.length === 0) return records;
  return Promise.all(records.map((r) => decryptRecord(entityId, tableName, r)));
}

/**
 * Rotate encryption keys — re-encrypts all values with a new key version.
 * The old key must still be available via FIELD_ENCRYPTION_KEY during rotation.
 *
 * After rotation, update FIELD_ENCRYPTION_KEY to the new key and
 * FIELD_ENCRYPTION_KEY_VERSION to the new version.
 */
export async function rotateEncryptionKey(
  newKey: string,
  newKeyVersion: string,
): Promise<{ total: number; succeeded: number; failed: number }> {
  const allEncrypted = await db.query.encryptedFields.findMany();
  let succeeded = 0;
  let failed = 0;

  for (const row of allEncrypted) {
    try {
      // Decrypt with old key
      const decrypted = decrypt(row.encryptedValue, MASTER_PASSWORD);
      if (!decrypted.success) {
        failed++;
        continue;
      }

      // Re-encrypt with new key
      const { encrypted } = encrypt(decrypted.decrypted, newKey, newKeyVersion);

      await db
        .update(encryptedFields)
        .set({
          encryptedValue: encrypted,
          keyVersion: newKeyVersion,
          updatedAt: new Date(),
        })
        .where(eq(encryptedFields.id, row.id));

      succeeded++;
    } catch {
      failed++;
    }
  }

  currentKeyVersion = newKeyVersion;
  return { total: allEncrypted.length, succeeded, failed };
}

export { currentKeyVersion };
