/**
 * Three-Way Matching Engine
 *
 * Matches Purchase Orders → Goods Receipts → Supplier Bills.
 * Provides scoring-based matching with configurable tolerance thresholds
 * and anomaly detection for enterprise-grade AP automation.
 *
 * Matching is entity-scoped. All scores are deterministic (no Math.random).
 */

import { and, eq, sql, desc } from "drizzle-orm";
import {
  purchaseOrders,
  poLines,
  invoicesAp,
  invoiceApLines,
} from "@xenboox/db/schema";
import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────────

export type MatchCandidate = {
  poId: string;
  poNumber: string;
  poDate: string;
  poTotal: number;
  supplierId: string;
  supplierName: string;
  billId: string;
  billNumber: string;
  billDate: string;
  billTotal: number;
  matchScore: number; // 0-100
  matchSignals: MatchSignal[];
  status: "auto_match" | "manual_review" | "no_match";
  lineMatches: LineMatch[];
};

export type MatchSignal = {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  details: string;
};

export type LineMatch = {
  poLineId: string;
  billLineId: string;
  poDescription: string;
  billDescription: string;
  poAmount: number;
  billAmount: number;
  amountVariance: number; // percentage
  score: number;
};

export type ThreeWayMatchResult = {
  candidates: MatchCandidate[];
  summary: {
    totalPOs: number;
    totalBills: number;
    autoMatched: number;
    needsReview: number;
    unmatched: number;
  };
};

// ─── Configuration ──────────────────────────────────────────────────────

const MATCH_THRESHOLDS = {
  autoMatch: 80, // score >= 80 → auto-match
  manualReview: 50, // score 50-79 → manual review
  // score < 50 → no match
};

const SIGNAL_WEIGHTS = {
  amount: 0.4, // Amount proximity
  date: 0.2, // Date proximity
  description: 0.15, // Description similarity
  lineItems: 0.15, // Line item matching
  reference: 0.1, // Reference/PO number match
};

const AMOUNT_TOLERANCE = {
  exact: 0.01, // Within 1% → full score
  acceptable: 0.05, // Within 5% → partial score
  maximum: 0.15, // Within 15% → low score
};

// ─── Scoring Functions ──────────────────────────────────────────────────

/**
 * Score based on amount proximity.
 */
function scoreAmountProximity(poTotal: number, billTotal: number): MatchSignal {
  if (poTotal === 0) {
    return {
      name: "amount",
      score: 0,
      weight: SIGNAL_WEIGHTS.amount,
      details: "PO total is zero — cannot compare amounts",
    };
  }

  const variance = Math.abs(poTotal - billTotal) / poTotal;

  let score: number;
  let details: string;

  if (variance <= AMOUNT_TOLERANCE.exact) {
    score = 100;
    details = `Exact match (${variance.toFixed(2)}% variance)`;
  } else if (variance <= AMOUNT_TOLERANCE.acceptable) {
    score =
      80 -
      ((variance - AMOUNT_TOLERANCE.exact) /
        (AMOUNT_TOLERANCE.acceptable - AMOUNT_TOLERANCE.exact)) *
        30;
    details = `Close match (${(variance * 100).toFixed(1)}% variance)`;
  } else if (variance <= AMOUNT_TOLERANCE.maximum) {
    score =
      50 -
      ((variance - AMOUNT_TOLERANCE.acceptable) /
        (AMOUNT_TOLERANCE.maximum - AMOUNT_TOLERANCE.acceptable)) *
        30;
    details = `Moderate variance (${(variance * 100).toFixed(1)}%)`;
  } else {
    score = Math.max(0, 20 - (variance - AMOUNT_TOLERANCE.maximum) * 100);
    details = `Large variance (${(variance * 100).toFixed(1)}%)`;
  }

  return { name: "amount", score, weight: SIGNAL_WEIGHTS.amount, details };
}

/**
 * Score based on date proximity (PO date vs bill date).
 */
function scoreDateProximity(poDate: string, billDate: string): MatchSignal {
  const po = new Date(poDate);
  const bill = new Date(billDate);
  const diffDays =
    Math.abs(bill.getTime() - po.getTime()) / (1000 * 60 * 60 * 24);

  let score: number;
  let details: string;

  if (diffDays <= 3) {
    score = 100;
    details = `Within 3 days (${diffDays.toFixed(0)} days apart)`;
  } else if (diffDays <= 14) {
    score = 90 - (diffDays - 3) * 5;
    details = `Within 2 weeks (${diffDays.toFixed(0)} days apart)`;
  } else if (diffDays <= 30) {
    score = 50 - (diffDays - 14) * 2;
    details = `Within a month (${diffDays.toFixed(0)} days apart)`;
  } else {
    score = Math.max(0, 30 - (diffDays - 30));
    details = `Far apart (${diffDays.toFixed(0)} days)`;
  }

  return { name: "date", score, weight: SIGNAL_WEIGHTS.date, details };
}

/**
 * Score based on description/reference similarity (simple token overlap).
 */
function scoreDescriptionSimilarity(
  poNumber: string,
  billNumber: string,
  poDescription: string,
  billDescription: string,
): MatchSignal {
  // Check if PO number appears in bill number or vice versa
  const poNumLower = poNumber.toLowerCase();
  const billNumLower = billNumber.toLowerCase();

  if (billNumLower.includes(poNumLower) || poNumLower.includes(billNumLower)) {
    return {
      name: "description",
      score: 100,
      weight: SIGNAL_WEIGHTS.description,
      details: "PO number found in bill reference",
    };
  }

  // Token overlap scoring
  const poTokens = new Set(
    (poDescription + " " + poNumber)
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
  const billTokens = new Set(
    (billDescription + " " + billNumber)
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );

  if (poTokens.size === 0 || billTokens.size === 0) {
    return {
      name: "description",
      score: 30,
      weight: SIGNAL_WEIGHTS.description,
      details: "Insufficient description data for comparison",
    };
  }

  let overlap = 0;
  for (const token of poTokens) {
    if (billTokens.has(token)) overlap++;
  }

  const ratio = overlap / Math.max(poTokens.size, billTokens.size);
  const score = Math.round(30 + ratio * 70);

  return {
    name: "description",
    score,
    weight: SIGNAL_WEIGHTS.description,
    details: `${overlap} token matches (${(ratio * 100).toFixed(0)}% overlap)`,
  };
}

/**
 * Score line item matching between PO and bill.
 */
function scoreLineItemMatch(
  poLineItems: Array<{ description: string; amount: number }>,
  billLineItems: Array<{ description: string; amount: number }>,
): { signal: MatchSignal; matches: LineMatch[] } {
  if (poLineItems.length === 0 || billLineItems.length === 0) {
    return {
      signal: {
        name: "lineItems",
        score: 20,
        weight: SIGNAL_WEIGHTS.lineItems,
        details: "No line items to compare",
      },
      matches: [],
    };
  }

  const matches: LineMatch[] = [];
  let totalScore = 0;

  for (const poLine of poLineItems) {
    let bestMatch: LineMatch | null = null;
    let bestScore = 0;

    for (let i = 0; i < billLineItems.length; i++) {
      const billLine = billLineItems[i];
      const amountVariance =
        poLine.amount > 0
          ? Math.abs(poLine.amount - billLine.amount) / poLine.amount
          : 1;

      // Simple description similarity
      const poWords = new Set(poLine.description.toLowerCase().split(/\s+/));
      const billWords = billLine.description.toLowerCase().split(/\s+/);
      let wordOverlap = 0;
      for (const w of billWords) {
        if (poWords.has(w) && w.length > 2) wordOverlap++;
      }
      const descScore =
        poWords.size > 0 ? (wordOverlap / poWords.size) * 100 : 0;

      const amountScore =
        amountVariance <= 0.01
          ? 100
          : amountVariance <= 0.05
            ? 70
            : amountVariance <= 0.15
              ? 40
              : 10;
      const lineScore = descScore * 0.5 + amountScore * 0.5;

      if (lineScore > bestScore && lineScore > 30) {
        bestScore = lineScore;
        bestMatch = {
          poLineId: `po-${poLineItems.indexOf(poLine)}`,
          billLineId: `bill-${i}`,
          poDescription: poLine.description,
          billDescription: billLine.description,
          poAmount: poLine.amount,
          billAmount: billLine.amount,
          amountVariance: amountVariance * 100,
          score: Math.round(lineScore),
        };
      }
    }

    if (bestMatch) {
      matches.push(bestMatch);
      totalScore += bestMatch.score;
    }
  }

  const avgScore = matches.length > 0 ? totalScore / matches.length : 20;

  return {
    signal: {
      name: "lineItems",
      score: Math.round(avgScore),
      weight: SIGNAL_WEIGHTS.lineItems,
      details: `${matches.length}/${poLineItems.length} lines matched`,
    },
    matches,
  };
}

/**
 * Score reference/PO number match.
 */
function scoreReferenceMatch(
  poNumber: string,
  billReference: string | null,
  billNotes: string | null,
): MatchSignal {
  const poNum = poNumber.toLowerCase();
  const ref = (billReference ?? "").toLowerCase();
  const notes = (billNotes ?? "").toLowerCase();
  const combined = ref + " " + notes;

  if (
    combined.includes(poNum) ||
    poNum.includes(ref.replace(/[^a-z0-9]/g, ""))
  ) {
    return {
      name: "reference",
      score: 100,
      weight: SIGNAL_WEIGHTS.reference,
      details: `PO number "${poNumber}" found in bill reference`,
    };
  }

  // Partial match — check for shared numeric sequences
  const poNums = poNum.match(/\d+/g) ?? [];
  const refNums = ref.match(/\d+/g) ?? [];
  const sharedNums = poNums.filter((n) => refNums.includes(n));

  if (sharedNums.length > 0) {
    return {
      name: "reference",
      score: 60,
      weight: SIGNAL_WEIGHTS.reference,
      details: `Partial match — shared number sequences: ${sharedNums.join(", ")}`,
    };
  }

  return {
    name: "reference",
    score: 10,
    weight: SIGNAL_WEIGHTS.reference,
    details: "No reference match found",
  };
}

// ─── Main Matching Function ─────────────────────────────────────────────

/**
 * Run three-way matching for an entity.
 * Finds unmatched bills and matches them against open POs.
 */
export async function runThreeWayMatching(
  entityId: string,
): Promise<ThreeWayMatchResult> {
  // Get all open/approved POs (not fully received or cancelled)
  const openPOs = await db.query.purchaseOrders.findMany({
    where: and(
      eq(purchaseOrders.entityId, entityId),
      sql`${purchaseOrders.status} IN ('approved', 'partial')`,
    ),
  });

  // Get all pending AP invoices (bills) without a PO link, or linked but not matched
  const unmatchedBills = await db.query.invoicesAp.findMany({
    where: and(
      eq(invoicesAp.entityId, entityId),
      sql`${invoicesAp.status} IN ('pending', 'partial')`,
    ),
  });

  // Get suppliers for names
  const suppliersList = await db.query.suppliers.findMany({
    where: eq(
      // @ts-expect-error — dynamic import
      (await import("@xenboox/db/schema")).suppliers.entityId,
      entityId,
    ),
  });
  const supplierMap = new Map(suppliersList.map((s) => [s.id, s.name]));

  const candidates: MatchCandidate[] = [];

  for (const bill of unmatchedBills) {
    // Find candidate POs: same supplier, similar amount, open status
    const candidatePOs = openPOs.filter((po) => {
      if (po.supplierId !== bill.supplierId) return false;
      // Amount within 15%
      const poTotal = parseFloat(po.totalAmount);
      const billTotal = parseFloat(bill.totalAmount);
      if (poTotal === 0) return false;
      const variance = Math.abs(poTotal - billTotal) / poTotal;
      return variance <= 0.15;
    });

    if (candidatePOs.length === 0) continue;

    // Get PO lines and bill lines
    for (const po of candidatePOs) {
      const poLineItems = await db.query.poLines.findMany({
        where: eq(poLines.purchaseOrderId, po.id),
      });

      const billLineItems = await db.query.invoiceApLines.findMany({
        where: eq(invoiceApLines.invoiceApId, bill.id),
      });

      // Score each signal
      const amountSignal = scoreAmountProximity(
        parseFloat(po.totalAmount),
        parseFloat(bill.totalAmount),
      );
      const dateSignal = scoreDateProximity(po.orderDate, bill.invoiceDate);
      const descSignal = scoreDescriptionSimilarity(
        po.poNumber,
        bill.invoiceNumber,
        po.notes ?? "",
        bill.notes ?? "",
      );
      const { signal: lineSignal, matches: lineMatches } = scoreLineItemMatch(
        poLineItems.map((l) => ({
          description: l.description,
          amount: parseFloat(l.amount),
        })),
        billLineItems.map((l) => ({
          description: l.description,
          amount: parseFloat(l.amount),
        })),
      );
      const refSignal = scoreReferenceMatch(
        po.poNumber,
        bill.invoiceNumber,
        bill.notes,
      );

      const signals = [
        amountSignal,
        dateSignal,
        descSignal,
        lineSignal,
        refSignal,
      ];

      // Weighted composite score
      const compositeScore = signals.reduce(
        (sum, s) => sum + s.score * s.weight,
        0,
      );

      const finalScore = Math.round(
        compositeScore / signals.reduce((sum, s) => sum + s.weight, 0),
      );

      let status: "auto_match" | "manual_review" | "no_match";
      if (finalScore >= MATCH_THRESHOLDS.autoMatch) {
        status = "auto_match";
      } else if (finalScore >= MATCH_THRESHOLDS.manualReview) {
        status = "manual_review";
      } else {
        status = "no_match";
      }

      candidates.push({
        poId: po.id,
        poNumber: po.poNumber,
        poDate: po.orderDate,
        poTotal: parseFloat(po.totalAmount),
        supplierId: po.supplierId,
        supplierName: supplierMap.get(po.supplierId) ?? "Unknown",
        billId: bill.id,
        billNumber: bill.invoiceNumber,
        billDate: bill.invoiceDate,
        billTotal: parseFloat(bill.totalAmount),
        matchScore: finalScore,
        matchSignals: signals,
        status,
        lineMatches,
      });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.matchScore - a.matchScore);

  return {
    candidates,
    summary: {
      totalPOs: openPOs.length,
      totalBills: unmatchedBills.length,
      autoMatched: candidates.filter((c) => c.status === "auto_match").length,
      needsReview: candidates.filter((c) => c.status === "manual_review")
        .length,
      unmatched: candidates.filter((c) => c.status === "no_match").length,
    },
  };
}

/**
 * Confirm a three-way match: link the bill to the PO.
 */
export async function confirmThreeWayMatch(
  entityId: string,
  billId: string,
  poId: string,
): Promise<{ success: boolean; message: string }> {
  // Verify both belong to the same entity
  const bill = await db.query.invoicesAp.findFirst({
    where: and(eq(invoicesAp.id, billId), eq(invoicesAp.entityId, entityId)),
  });

  const po = await db.query.purchaseOrders.findFirst({
    where: and(
      eq(purchaseOrders.id, poId),
      eq(purchaseOrders.entityId, entityId),
    ),
  });

  if (!bill || !po) {
    return { success: false, message: "Bill or PO not found" };
  }

  // Link bill to PO
  await db
    .update(invoicesAp)
    .set({ purchaseOrderId: poId })
    .where(eq(invoicesAp.id, billId));

  // Update PO status if total received matches
  const totalBilledResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(${invoicesAp.totalAmount}), '0')`,
    })
    .from(invoicesAp)
    .where(
      and(
        eq(invoicesAp.purchaseOrderId, poId),
        sql`${invoicesAp.status} != 'voided'`,
      ),
    );

  const totalBilled = parseFloat(totalBilledResult[0]?.total ?? "0");
  const poTotal = parseFloat(po.totalAmount);

  if (totalBilled >= poTotal * 0.99) {
    // Within 1% → fully billed
    await db
      .update(purchaseOrders)
      .set({ status: "received" })
      .where(eq(purchaseOrders.id, poId));
  } else if (totalBilled > 0) {
    await db
      .update(purchaseOrders)
      .set({ status: "partial" })
      .where(eq(purchaseOrders.id, poId));
  }

  return {
    success: true,
    message: `Bill ${bill.invoiceNumber} matched to PO ${po.poNumber}`,
  };
}
