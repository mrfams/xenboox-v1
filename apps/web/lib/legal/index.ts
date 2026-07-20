import { db } from "@xenboox/db";
import {
  legalAcceptances,
  ownerNotifications,
  proTierReviews,
} from "@xenboox/db/schema";
import { eq, and, isNull } from "drizzle-orm";

type LegalDocType =
  | "terms_of_service"
  | "privacy_policy"
  | "data_processing_agreement"
  | "sla"
  | "acceptable_use_policy"
  | "refund_policy";
type NotifPriority = "critical" | "high" | "medium" | "low";

// ─── TOS ACCEPTANCE ─────────────────────────────

/** Current version of each legal document. Update these when ToS changes. */
export const LEGAL_DOC_VERSIONS: Record<LegalDocType, string> = {
  terms_of_service: "1.0.0",
  privacy_policy: "1.0.0",
  data_processing_agreement: "1.0.0",
  sla: "1.0.0",
  acceptable_use_policy: "1.0.0",
  refund_policy: "1.0.0",
};

export async function acceptLegalDocument(params: {
  userId: string;
  entityId: string;
  docType: LegalDocType;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const version = LEGAL_DOC_VERSIONS[params.docType];

  // Check if already accepted this version
  const existing = await db.query.legalAcceptances.findFirst({
    where: and(
      eq(legalAcceptances.userId, params.userId),
      eq(legalAcceptances.entityId, params.entityId),
      eq(legalAcceptances.docType, params.docType),
      eq(legalAcceptances.docVersion, version),
    ),
  });

  if (existing) return; // Already accepted

  await db.insert(legalAcceptances).values({
    userId: params.userId,
    entityId: params.entityId,
    docType: params.docType,
    docVersion: version,
    status: "accepted",
    acceptedAt: new Date(),
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

export async function rejectLegalDocument(params: {
  userId: string;
  entityId: string;
  docType: LegalDocType;
}): Promise<void> {
  const version = LEGAL_DOC_VERSIONS[params.docType];

  // Supersede any prior acceptance
  const prior = await db.query.legalAcceptances.findFirst({
    where: and(
      eq(legalAcceptances.userId, params.userId),
      eq(legalAcceptances.entityId, params.entityId),
      eq(legalAcceptances.docType, params.docType),
      eq(legalAcceptances.status, "accepted"),
    ),
  });

  if (prior) {
    await db
      .update(legalAcceptances)
      .set({ status: "superseded", supersededBy: undefined })
      .where(eq(legalAcceptances.id, prior.id));
  }

  await db.insert(legalAcceptances).values({
    userId: params.userId,
    entityId: params.entityId,
    docType: params.docType,
    docVersion: version,
    status: "rejected",
    acceptedAt: null,
  });
}

export async function hasAcceptedLegalDocument(
  userId: string,
  entityId: string,
  docType: LegalDocType,
): Promise<boolean> {
  const version = LEGAL_DOC_VERSIONS[docType];
  const acceptance = await db.query.legalAcceptances.findFirst({
    where: and(
      eq(legalAcceptances.userId, userId),
      eq(legalAcceptances.entityId, entityId),
      eq(legalAcceptances.docType, docType),
      eq(legalAcceptances.docVersion, version),
      eq(legalAcceptances.status, "accepted"),
    ),
  });
  return !!acceptance;
}

export async function getPendingLegalDocuments(
  userId: string,
  entityId: string,
): Promise<LegalDocType[]> {
  const pending: LegalDocType[] = [];
  for (const docType of Object.keys(LEGAL_DOC_VERSIONS) as LegalDocType[]) {
    const accepted = await hasAcceptedLegalDocument(userId, entityId, docType);
    if (!accepted) pending.push(docType);
  }
  return pending;
}

// ─── OWNER NOTIFICATION ─────────────────────────

export async function notifyOwner(params: {
  entityId: string;
  ownerId: string;
  eventType: string;
  title: string;
  body: string;
  priority?: NotifPriority;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
}): Promise<void> {
  await db.insert(ownerNotifications).values({
    entityId: params.entityId,
    ownerId: params.ownerId,
    eventType: params.eventType,
    priority: params.priority ?? "medium",
    title: params.title,
    body: params.body,
    metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    actionUrl: params.actionUrl,
  });
}

export async function getOwnerNotifications(
  ownerId: string,
  onlyUnread = false,
) {
  const conditions = [eq(ownerNotifications.ownerId, ownerId)];
  if (onlyUnread) conditions.push(isNull(ownerNotifications.readAt));

  return db.query.ownerNotifications.findMany({
    where: and(...conditions),
    orderBy: (on, { desc }) => [desc(on.createdAt)],
    limit: 50,
  });
}

export async function markOwnerNotificationRead(
  notificationId: string,
): Promise<void> {
  await db
    .update(ownerNotifications)
    .set({ readAt: new Date() })
    .where(eq(ownerNotifications.id, notificationId));
}

// ─── PRO-TIER REVIEW ────────────────────────────

export async function requestProTierUpgrade(params: {
  entityId: string;
  requestedBy: string;
  companyName: string;
  companyRegistration?: string;
  taxId?: string;
  businessType?: string;
  expectedVolume?: string;
  useCase?: string;
}): Promise<string> {
  const [review] = await db
    .insert(proTierReviews)
    .values({
      entityId: params.entityId,
      requestedBy: params.requestedBy,
      companyName: params.companyName,
      companyRegistration: params.companyRegistration,
      taxId: params.taxId,
      businessType: params.businessType,
      expectedVolume: params.expectedVolume,
      useCase: params.useCase,
      status: "pending",
    })
    .returning();

  return review.id;
}

export async function reviewProTierRequest(params: {
  reviewId: string;
  reviewerId: string;
  status: "approved" | "rejected" | "info_requested";
  reviewNotes?: string;
  rejectionReason?: string;
}): Promise<void> {
  const update: Record<string, unknown> = {
    reviewerId: params.reviewerId,
    reviewedAt: new Date(),
    status: params.status,
    reviewNotes: params.reviewNotes,
  };

  if (params.status === "approved") {
    update.approvedAt = new Date();
  }
  if (params.rejectionReason) {
    update.rejectionReason = params.rejectionReason;
  }

  await db
    .update(proTierReviews)
    .set(update)
    .where(eq(proTierReviews.id, params.reviewId));
}

export async function activateProTier(reviewId: string): Promise<void> {
  await db
    .update(proTierReviews)
    .set({ activatedAt: new Date(), status: "approved" })
    .where(eq(proTierReviews.id, reviewId));
}
