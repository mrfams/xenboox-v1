// Enterprise Security Schema
// Row-Level Security policies, encryption helpers, and audit functions

import { pgTable, pgEnum, text, uuid, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { organizations } from './organization';

// Security enums
export const securityLevelEnum = pgEnum('security_level', ['public', 'internal', 'confidential', 'restricted']);

// Encrypted fields storage (for sensitive data)
export const encryptedFields = pgTable('encrypted_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityId: uuid('entity_id').notNull(),
  tableName: text('table_name').notNull(),
  recordId: uuid('record_id').notNull(),
  fieldName: text('field_name').notNull(),
  encryptedValue: text('encrypted_value').notNull(), // AES-256 encrypted
  keyVersion: text('key_version').notNull(), // For key rotation
  securityLevel: securityLevelEnum('security_level').notNull().default('confidential'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Audit log for security events
export const securityAuditLog = pgTable('security_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityId: uuid('entity_id').notNull(),
  eventType: text('event_type').notNull(), // 'access', 'modification', 'encryption', 'decryption'
  userId: uuid('user_id').references(() => users.id),
  resourceType: text('resource_type').notNull(), // 'table', 'field', 'api'
  resourceId: text('resource_id').notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  success: boolean('success').notNull().default(true),
  failureReason: text('failure_reason'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

// Session context for RLS
export const sessionContext = {
  userId: 'app.current_user_id',
  entityId: 'app.current_entity_id',
};

// Set session context for RLS queries — DEPRECATED: use apps/web/lib/trpc/server.ts:setRlsContext (param-bound).
// Fixed from string-interp (SQLi footgun) to param-bound. Kept for backwards compat.
// Usage: await setSessionContext(db, userId, entityId)
// Note: Requires WebSocket/Pool (USE_RLS=true) — no-ops on neon-http.
export async function setSessionContext(db: any, userId: string, entityId: string): Promise<void> {
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
  await db.execute(sql`SELECT set_config('app.current_entity_id', ${entityId}, true)`);
}