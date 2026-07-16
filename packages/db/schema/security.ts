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

// Set session context for RLS queries
// Usage: await setSessionContext(db, userId, entityId)
// Note: Requires WebSocket connection or PgBouncer in transaction mode
export async function setSessionContext(db: any, userId: string, entityId: string): Promise<void> {
  await db.execute(`SELECT set_config('app.current_user_id', ${JSON.stringify(userId)}, true)`);
  await db.execute(`SELECT set_config('app.current_entity_id', ${JSON.stringify(entityId)}, true)`);
}