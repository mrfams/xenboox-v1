// ─── Audit Archive Schema ──────────────────────────────────────────────────
//
// Audit logs are appended continuously. For compliance (SOC 2, GDPR) they
// must eventually be moved to write-once storage (R2 with object lock) so
// no admin can delete or modify historical audit entries.
//
// The archive_manifests table tracks what was archived, when, and where,
// providing the evidence chain for auditors.

import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { uuidId, entityId, timestamps } from "./helpers";

// ─── Archive Manifests ─────────────────────────────────────────────────────
//
// Each row represents one archive batch: all audit_log rows for a given
// entity and date range, uploaded as a JSONL file to R2.

export const auditArchiveManifests = pgTable(
  "audit_archive_manifests",
  {
    id: uuidId(),
    ...timestamps,

    entityId: text("entity_id").notNull(),

    // The date range this archive covers
    archiveDate: timestamp("archive_date", { withTimezone: true }).notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),

    // R2 storage location
    r2Bucket: varchar("r2_bucket", { length: 255 }).notNull(),
    r2Key: varchar("r2_key", { length: 500 }).notNull(),

    // Integrity verification
    rowCount: integer("row_count").notNull().default(0),
    checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull().default(0),

    // Status tracking
    status: varchar("status", { length: 20 }).notNull().default("completed"),
    // statuses: pending, uploading, completed, verified, failed

    // Verification (auditor or automated check)
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),

    // Metadata
    metadata: jsonb("metadata"),
    error: text("error"),
  },
  (t) => [
    index("audit_archive_entity_id").on(t.entityId),
    index("audit_archive_date").on(t.archiveDate),
    index("audit_archive_status").on(t.status),
    index("audit_archive_entity_date").on(t.entityId, t.archiveDate),
  ],
);
