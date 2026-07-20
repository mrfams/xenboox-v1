import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";
import { users } from "./auth";
import { entities } from "./organization";

// ─── ENUMS ───────────────────────────────────────

export const legalDocTypeEnum = pgEnum("legal_doc_type", [
  "terms_of_service",
  "privacy_policy",
  "data_processing_agreement",
  "sla",
  "acceptable_use_policy",
  "refund_policy",
]);

export const agreementStatusEnum = pgEnum("agreement_status", [
  "pending",
  "accepted",
  "rejected",
  "superseded",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "in_review",
  "approved",
  "rejected",
  "info_requested",
]);

export const ownerNotifPriorityEnum = pgEnum("notif_priority", [
  "critical",
  "high",
  "medium",
  "low",
]);

// ─── LEGAL DOCUMENT ACCEPTANCE ───────────────────
// Tracks which users have accepted which legal documents
// and at which version. Immutable — one row per acceptance event.

export const legalAcceptances = pgTable(
  "legal_acceptances",
  {
    id: uuidId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    docType: legalDocTypeEnum("doc_type").notNull(),
    docVersion: text("doc_version").notNull(), // semver e.g. "2.1.0"
    status: agreementStatusEnum("status").notNull().default("pending"),
    acceptedAt: timestamp("accepted_at"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    supersededBy: uuid("superseded_by"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("legal_acceptance_unique").on(
      t.userId,
      t.entityId,
      t.docType,
      t.docVersion,
    ),
    index("legal_acceptance_user").on(t.userId),
    index("legal_acceptance_entity").on(t.entityId),
    index("legal_acceptance_doc").on(t.docType, t.docVersion),
  ],
);

// ─── OWNER NOTIFICATIONS ─────────────────────────
// Queued notifications to org owners. Critical events that owners
// must be alerted about (new admin, billing change, security event, etc.)

export const ownerNotifications = pgTable(
  "owner_notifications",
  {
    id: uuidId(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    priority: ownerNotifPriorityEnum("priority").notNull().default("medium"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    metadata: text("metadata"),
    readAt: timestamp("read_at"),
    actionUrl: text("action_url"),
    emailedAt: timestamp("emailed_at"),
    ...timestamps,
  },
  (t) => [
    index("owner_notif_entity").on(t.entityId),
    index("owner_notif_owner").on(t.ownerId),
    index("owner_notif_unread").on(t.ownerId, t.readAt),
    index("owner_notif_event").on(t.entityId, t.eventType),
  ],
);

// ─── PRO-TIER REVIEW ─────────────────────────────
// Tracks the review workflow for organizations upgrading to Pro-tier.
// Pro-tier accounts require human review before activation.

export const proTierReviews = pgTable(
  "pro_tier_reviews",
  {
    id: uuidId(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    status: reviewStatusEnum("status").notNull().default("pending"),
    companyName: text("company_name").notNull(),
    companyRegistration: text("company_registration"),
    taxId: text("tax_id"),
    businessType: text("business_type"),
    expectedVolume: text("expected_volume"), // monthly transaction volume estimate
    useCase: text("use_case"), // description of intended usage
    reviewerId: uuid("reviewer_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at"),
    reviewNotes: text("review_notes"),
    rejectionReason: text("rejection_reason"),
    approvedAt: timestamp("approved_at"),
    activatedAt: timestamp("activated_at"),
    ...timestamps,
  },
  (t) => [
    index("pro_review_entity").on(t.entityId),
    index("pro_review_status").on(t.status),
  ],
);
