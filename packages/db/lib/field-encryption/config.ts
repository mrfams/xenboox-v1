// Field Encryption Configuration
// Defines which sensitive fields in which tables are encrypted at rest.
// Add a new entry here + the field is auto-encrypted on write and decrypted on read.

export type SecurityLevel = "confidential" | "restricted";

export interface EncryptedFieldConfig {
  tableName: string;
  fieldName: string;
  securityLevel: SecurityLevel;
  /** If true, the original column stores a hash for indexed lookup; encrypted value goes to encrypted_fields table */
  indexed?: boolean;
}

export const ENCRYPTED_FIELDS: EncryptedFieldConfig[] = [
  // ─── Auth ──────────────────────────────────────────────────
  {
    tableName: "users",
    fieldName: "password_hash",
    securityLevel: "restricted",
  },
  {
    tableName: "users",
    fieldName: "reset_password_token",
    securityLevel: "restricted",
  },
  {
    tableName: "users",
    fieldName: "two_factor_secret",
    securityLevel: "restricted",
  },
  {
    tableName: "users",
    fieldName: "backup_codes",
    securityLevel: "restricted",
  },
  {
    tableName: "accounts",
    fieldName: "refresh_token",
    securityLevel: "restricted",
  },
  {
    tableName: "accounts",
    fieldName: "access_token",
    securityLevel: "restricted",
  },
  {
    tableName: "accounts",
    fieldName: "id_token",
    securityLevel: "confidential",
  },
  {
    tableName: "sessions",
    fieldName: "session_token",
    securityLevel: "restricted",
  },

  // ─── Bank Connections ──────────────────────────────────────
  {
    tableName: "bank_connections",
    fieldName: "account_number",
    securityLevel: "restricted",
  },
  {
    tableName: "bank_connections",
    fieldName: "access_token",
    securityLevel: "restricted",
  },
  {
    tableName: "bank_connections",
    fieldName: "refresh_token",
    securityLevel: "restricted",
  },

  // ─── Treasury ──────────────────────────────────────────────
  {
    tableName: "bank_accounts",
    fieldName: "account_number",
    securityLevel: "restricted",
  },

  // ─── Payroll ───────────────────────────────────────────────
  {
    tableName: "employees",
    fieldName: "phone",
    securityLevel: "confidential",
    indexed: true,
  },
  {
    tableName: "employees",
    fieldName: "bank_account_number",
    securityLevel: "restricted",
  },
  {
    tableName: "employees",
    fieldName: "bank_sort_code",
    securityLevel: "restricted",
  },
  {
    tableName: "employees",
    fieldName: "tax_id",
    securityLevel: "confidential",
  },
  {
    tableName: "employees",
    fieldName: "social_security_number",
    securityLevel: "restricted",
  },

  // ─── Organizations ─────────────────────────────────────────
  { tableName: "entities", fieldName: "tax_id", securityLevel: "confidential" },

  // ─── Mobile Money ─────────────────────────────────────────
  {
    tableName: "mobile_money_accounts",
    fieldName: "phone_number",
    securityLevel: "confidential",
    indexed: true,
  },
  {
    tableName: "mobile_money_accounts",
    fieldName: "account_number",
    securityLevel: "confidential",
  },
  {
    tableName: "mobile_money_accounts",
    fieldName: "webhook_secret",
    securityLevel: "restricted",
  },

  // ─── AP/AR ─────────────────────────────────────────────────
  {
    tableName: "suppliers",
    fieldName: "contact_phone",
    securityLevel: "confidential",
  },
  {
    tableName: "suppliers",
    fieldName: "tax_id",
    securityLevel: "confidential",
  },
  {
    tableName: "customers",
    fieldName: "contact_phone",
    securityLevel: "confidential",
  },
  {
    tableName: "customers",
    fieldName: "tax_id",
    securityLevel: "confidential",
  },
];

export function getFieldConfig(
  tableName: string,
  fieldName: string,
): EncryptedFieldConfig | undefined {
  return ENCRYPTED_FIELDS.find(
    (f) => f.tableName === tableName && f.fieldName === fieldName,
  );
}

export function getFieldsForTable(tableName: string): EncryptedFieldConfig[] {
  return ENCRYPTED_FIELDS.filter((f) => f.tableName === tableName);
}
