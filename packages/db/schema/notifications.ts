import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";
import { users } from "./auth";
import { entities } from "./organization";

export const notificationTypeEnum = {
  closeComplete: "close_complete",
  closeFailed: "close_failed",
  overdueInvoice: "overdue_invoice",
  invoiceReminder: "invoice_reminder",
  budgetAlert: "budget_alert",
  budgetExceeded: "budget_exceeded",
  agentEscalation: "agent_escalation",
  agentFlag: "agent_flag",
  systemAlert: "system_alert",
  reconDiscrepancy: "recon_discrepancy",
  payrollProcessed: "payroll_processed",
  reportReady: "report_ready",
  ingestionReview: "ingestion_review",
  ingestionRejected: "ingestion_rejected",
  ingestionPosted: "ingestion_posted",
} as const;

export const notificationPriorityEnum = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
} as const;

export const notificationStatusEnum = {
  pending: "pending",
  sent: "sent",
  failed: "failed",
  read: "read",
} as const;

export const notifications = pgTable(
  "notifications",
  {
    id: uuidId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").references(() => entities.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    priority: text("priority").notNull().default("medium"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: text("data"),
    read: boolean("read").notNull().default(false),
    status: text("status").notNull().default("pending"),
    sentAt: timestamp("sent_at"),
    ...timestamps,
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_entity_idx").on(t.entityId),
    index("notifications_status_idx").on(t.status),
    index("notifications_created_idx").on(t.createdAt),
    foreignKey({
      columns: [t.entityId],
      foreignColumns: [entities.id],
      name: "notifications_entity_fk",
    }),
  ],
);
