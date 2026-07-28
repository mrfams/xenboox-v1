import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import { expenseClaims, claimLineItems, policyRules } from "@xenboox/db/schema";
import { documents } from "@xenboox/db/schema/documents";
import type {
  ExtractedReceipt,
  PolicyCheckResult,
  ApprovalRouteResult,
} from "./state";

// ─── Extract Receipt ───────────────────────────────────────────────────────

export async function extractReceipt(
  entityId: string,
  documentId: string,
): Promise<ExtractedReceipt> {
  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.entityId, entityId)),
  });

  if (!doc) {
    throw new Error(`Document ${documentId} not found for entity ${entityId}`);
  }

  return {
    documentId,
    vendorName: null,
    receiptDate: null,
    totalAmount: null,
    taxAmount: null,
    currency: null,
    category: null,
    ocrConfidence: doc.ocrConfidence ? Number(doc.ocrConfidence) : 0,
    rawText: doc.ocrText,
  };
}

// ─── Check Policy Compliance ───────────────────────────────────────────────

export interface CheckPolicyComplianceArgs {
  claimId: string;
  useSonnet?: boolean;
}

export async function checkPolicyCompliance(
  entityId: string,
  args: CheckPolicyComplianceArgs,
): Promise<PolicyCheckResult> {
  const claim = await db.query.expenseClaims.findFirst({
    where: and(
      eq(expenseClaims.id, args.claimId),
      eq(expenseClaims.entityId, entityId),
    ),
  });

  if (!claim) {
    throw new Error(`Claim ${args.claimId} not found for entity ${entityId}`);
  }

  const policies = await db.query.policyRules.findMany({
    where: and(
      eq(policyRules.entityId, entityId),
      eq(policyRules.isActive, true),
    ),
  });

  const violations: PolicyCheckResult["policyViolations"] = [];
  const claimAmount = Number(claim.totalAmount);

  for (const policy of policies) {
    if (policy.category !== claim.category) continue;

    const limit = Number(policy.limitAmount);
    if (limit > 0 && claimAmount > limit) {
      violations.push({
        rule: policy.description ?? `${policy.category} limit`,
        severity: "violation",
        detail: `Claim amount ${claimAmount} exceeds policy limit ${limit} for category "${claim.category}"`,
      });
    }

    const approvalThreshold = Number(policy.requiresApprovalAbove);
    if (approvalThreshold > 0 && claimAmount > approvalThreshold) {
      violations.push({
        rule: "Approval threshold exceeded",
        severity: "warning",
        detail: `Claim amount ${claimAmount} exceeds approval threshold ${approvalThreshold}`,
      });
    }
  }

  return {
    claimId: args.claimId,
    compliant:
      violations.filter((v) => v.severity === "violation").length === 0,
    policyViolations: violations,
    requiresApproval:
      violations.some((v) => v.severity === "warning") || claimAmount > 50000,
    approvalLevel:
      claimAmount > 500000
        ? "finance_director"
        : claimAmount > 100000
          ? "department_manager"
          : null,
  };
}

// ─── Route for Approval ────────────────────────────────────────────────────

export interface RouteForApprovalArgs {
  claimId: string;
  managerId: string;
  managerName?: string;
}

export async function routeForApproval(
  entityId: string,
  args: RouteForApprovalArgs,
): Promise<ApprovalRouteResult> {
  const claim = await db.query.expenseClaims.findFirst({
    where: and(
      eq(expenseClaims.id, args.claimId),
      eq(expenseClaims.entityId, entityId),
    ),
  });

  if (!claim) {
    throw new Error(`Claim ${args.claimId} not found for entity ${entityId}`);
  }

  const escalationLevel = claim.status === "flagged" ? 2 : 1;

  return {
    claimId: args.claimId,
    routedTo: args.managerId,
    routedToName: args.managerName ?? args.managerId,
    status: "submitted",
    escalationLevel,
  };
}

// ─── Classify Receipt (Sonnet-level ambiguity) ────────────────────────────

export async function classifyReceiptCategory(
  entityId: string,
  documentId: string,
  extracted: ExtractedReceipt,
): Promise<{ category: string; confidence: number }> {
  if (extracted.ocrConfidence >= 0.7 && extracted.category) {
    return {
      category: extracted.category,
      confidence: extracted.ocrConfidence,
    };
  }

  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.entityId, entityId)),
  });

  const text = doc?.ocrText ?? extracted.rawText ?? "";

  if (
    text.toLowerCase().includes("meal") ||
    text.toLowerCase().includes("restaurant")
  ) {
    return { category: "meals", confidence: 0.65 };
  }
  if (
    text.toLowerCase().includes("fuel") ||
    text.toLowerCase().includes("gas")
  ) {
    return { category: "fuel", confidence: 0.65 };
  }
  if (
    text.toLowerCase().includes("hotel") ||
    text.toLowerCase().includes("lodging")
  ) {
    return { category: "lodging", confidence: 0.65 };
  }
  if (
    text.toLowerCase().includes("flight") ||
    text.toLowerCase().includes("airline")
  ) {
    return { category: "travel", confidence: 0.65 };
  }

  return { category: "other", confidence: 0.4 };
}
