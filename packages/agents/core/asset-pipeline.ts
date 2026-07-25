// ─── Fixed Assets Pipeline (Phase 3) ─────────────────────────────────────────
//
// Autonomous Asset Agent pipeline: depreciation engine, lifecycle management,
// physical verification tracking, and journal posting.
//
// Pipeline Steps:
//   1. Asset Inventory Scan — Scan all assets, check status/condition/location
//   2. Depreciation Calculation — Calculate depreciation for all active assets
//   3. Physical Verification Check — Flag assets due for verification
//   4. Disposal Detection — Flag assets past useful life
//   5. Manual Adjustment Intake — New, disposed, revalued assets
//   6. Depreciation Journal Posting — Post batch depreciation entries
//   7. Confidence Gate & Review — Review results before finalizing
//   8. Audit Trail — Log all pipeline actions
//
// Critical Rule:
//   Depreciation calculations use the independent accounting rules engine
//   (calculateDepreciation), never a separate LLM-based computation.
//   Disposal requires explicit human approval recording before proceeding.

import { db } from "@xenboox/db";
import { eq, and, desc, lt, gte, lte, inArray, isNull, sql } from "drizzle-orm";
import {
  fixedAssets,
  depreciationSchedule,
  assetPipelineRuns,
  assetVerifications,
  assetDisposalRecords,
} from "@xenboox/db/schema";
import {
  fiscalPeriods,
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
} from "@xenboox/db/schema/accounting";
import { auditLog } from "@xenboox/db/schema/documents";
import { calculateDepreciation } from "./accounting-rules";
import { DepreciationResult } from "./accounting-rules";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AssetStepId =
  | "inventory_scan"
  | "depreciation_calc"
  | "verification_check"
  | "disposal_detection"
  | "adjustment_intake"
  | "journal_posting"
  | "confidence_gate"
  | "audit_trail";

export type AssetStepStatus =
  "pending" | "in_progress" | "completed" | "skipped" | "failed" | "flagged";

export interface AssetStep {
  id: AssetStepId;
  label: string;
  status: AssetStepStatus;
  agent: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: Record<string, unknown>;
}

export interface ScannedAsset {
  id: string;
  name: string;
  assetClass: string;
  location: string | null;
  cost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: string;
  accumulatedDepreciation: number;
  netBookValue: number;
  status: string;
  condition: string | null;
  monthsInService: number;
  isFullyDepreciated: boolean;
  pastUsefulLife: boolean;
}

export interface DepreciationEntry {
  fixedAssetId: string;
  assetName: string;
  period: string;
  depreciationAmount: number;
  accumulatedDepreciationAfter: number;
  netBookValueAfter: number;
  method: string;
}

export interface VerificationDueItem {
  fixedAssetId: string;
  assetName: string;
  assetClass: string;
  lastVerifiedDate: string | null;
  scheduledDate: string;
  daysOverdue: number;
}

export interface DisposalFlagItem {
  fixedAssetId: string;
  assetName: string;
  cost: number;
  netBookValue: number;
  monthsInService: number;
  usefulLifeMonths: number;
  recommendation: "dispose" | "review" | "write_off";
}

export interface AssetPipelineResult {
  success: boolean;
  continuous: boolean;
  period: string;
  steps: AssetStep[];
  assetsScanned: number;
  depreciationCount: number;
  depreciationTotal: number;
  verificationDueCount: number;
  disposalFlags: DisposalFlagItem[];
  errors: string[];
  warnings: string[];
}

interface PipelineParams {
  entityId: string;
  entityName: string;
  currency: string;
  period: string;
  userId: string;
  triggerSource?: "manual" | "scheduled" | "close_pipeline" | "agent";
}

// ─── Pipeline Runner ─────────────────────────────────────────────────────────

export async function runAssetPipeline(
  params: PipelineParams,
): Promise<AssetPipelineResult> {
  const { entityId, period, userId, triggerSource } = params;
  const steps: AssetStep[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Track pipeline run
  const [pipelineRun] = await db
    .insert(assetPipelineRuns)
    .values({
      entityId,
      period,
      status: "scanning",
      triggeredBy: triggerSource ?? "manual",
      startedAt: new Date(),
    })
    .returning();

  const pipelineRunId = pipelineRun?.id;
  let totalAssetsScanned = 0;
  let totalDepreciationCount = 0;
  let totalDepreciationAmount = 0;
  let totalVerificationDue = 0;
  let disposalFlags: DisposalFlagItem[] = [];
  let allDepreciationEntries: DepreciationEntry[] = [];

  // ── Step 1: Asset Inventory Scan ─────────────────────────────────────
  const step1: AssetStep = {
    id: "inventory_scan",
    label: "Asset Inventory Scan",
    status: "pending",
    agent: "Asset Agent",
  };

  try {
    step1.status = "in_progress";
    step1.startedAt = new Date().toISOString();

    const assets = await db.query.fixedAssets.findMany({
      where: and(
        eq(fixedAssets.entityId, entityId),
        eq(fixedAssets.status, "active"),
      ),
    });

    const scanned: ScannedAsset[] = assets.map((a) => {
      const cost = Number(a.cost);
      const salvage = Number(a.salvageValue);
      const accumDepr = Number(a.accumulatedDepreciation);
      const nbv = Number(a.netBookValue);
      const purchaseDate = new Date(a.purchaseDate);
      const now = new Date();
      const monthsInService =
        (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
        (now.getMonth() - purchaseDate.getMonth());
      const isFullyDepreciated = nbv <= salvage;
      const pastUsefulLife = monthsInService >= Number(a.usefulLifeMonths);

      return {
        id: a.id,
        name: a.name,
        assetClass: a.assetClass,
        location: a.location,
        cost,
        salvageValue: salvage,
        usefulLifeMonths: Number(a.usefulLifeMonths),
        depreciationMethod: a.depreciationMethod,
        accumulatedDepreciation: accumDepr,
        netBookValue: nbv,
        status: a.status,
        condition: a.condition,
        monthsInService,
        isFullyDepreciated,
        pastUsefulLife,
      };
    });

    totalAssetsScanned = scanned.length;
    step1.status = "completed";
    step1.completedAt = new Date().toISOString();
    step1.result = {
      totalScanned: scanned.length,
      activeAssets: scanned.length,
      byClass: countByClass(scanned),
      totalValue: scanned.reduce((s, a) => s + a.cost, 0),
    };
  } catch (err) {
    step1.status = "failed";
    step1.error = String(err);
    errors.push(`Asset scan failed: ${String(err)}`);
  }

  steps.push(step1);

  // ── Step 2: Depreciation Calculation ────────────────────────────────
  const step2: AssetStep = {
    id: "depreciation_calc",
    label: "Depreciation Calculation",
    status: "pending",
    agent: "Asset Agent",
  };

  try {
    step2.status = "in_progress";
    step2.startedAt = new Date().toISOString();

    const activeAssets = await db.query.fixedAssets.findMany({
      where: and(
        eq(fixedAssets.entityId, entityId),
        eq(fixedAssets.status, "active"),
        eq(fixedAssets.assetClass, fixedAssets.assetClass), // all classes
      ),
    });

    // Filter for assets that aren't fully depreciated
    const depreciableAssets = activeAssets.filter((a) => {
      const nbv = Number(a.netBookValue);
      const salvage = Number(a.salvageValue);
      return nbv > salvage;
    });

    const entries: DepreciationEntry[] = [];

    for (const asset of depreciableAssets) {
      const usefulLifeYears = Math.max(1, Number(asset.usefulLifeMonths) / 12);
      const yearsInService =
        usefulLifeYears *
        (Number(asset.accumulatedDepreciation) /
          (Number(asset.cost) - Number(asset.salvageValue)));

      const deprMethod =
        asset.depreciationMethod === "units_of_production"
          ? ("straight_line" as const)
          : (asset.depreciationMethod as "straight_line" | "reducing_balance");

      const deprResult: DepreciationResult = calculateDepreciation({
        purchaseValue: Number(asset.cost),
        salvageValue: Number(asset.salvageValue),
        usefulLifeYears,
        currentBookValue:
          Number(asset.cost) - Number(asset.accumulatedDepreciation),
        yearsInService: Math.min(yearsInService, usefulLifeYears),
        method: deprMethod,
      });

      if (!deprResult || deprResult.monthlyDepreciation <= 0) continue;

      const newAccumDepr =
        Number(asset.accumulatedDepreciation) + deprResult.monthlyDepreciation;
      const newNbv = Number(asset.cost) - newAccumDepr;

      // Persist to depreciation schedule
      await db.insert(depreciationSchedule).values({
        entityId,
        fixedAssetId: asset.id,
        depreciationAmount: deprResult.monthlyDepreciation.toFixed(2),
        accumulatedDepreciation: newAccumDepr.toFixed(2),
        netBookValue: Math.max(newNbv, 0).toFixed(2),
        calculatedBy: "agent",
      });

      // Update the asset's accumulated depreciation and NBV
      await db
        .update(fixedAssets)
        .set({
          accumulatedDepreciation: newAccumDepr.toFixed(2),
          netBookValue: Math.max(newNbv, 0).toFixed(2),
          ...(newNbv <= Number(asset.salvageValue)
            ? { status: "fully_depreciated" }
            : {}),
        })
        .where(
          and(eq(fixedAssets.id, asset.id), eq(fixedAssets.entityId, entityId)),
        );

      entries.push({
        fixedAssetId: asset.id,
        assetName: asset.name,
        period,
        depreciationAmount: deprResult.monthlyDepreciation,
        accumulatedDepreciationAfter: newAccumDepr,
        netBookValueAfter: Math.max(newNbv, 0),
        method: asset.depreciationMethod,
      });
    }

    totalDepreciationCount = entries.length;
    totalDepreciationAmount = entries.reduce(
      (s, e) => s + e.depreciationAmount,
      0,
    );
    allDepreciationEntries = entries;

    step2.status = "completed";
    step2.completedAt = new Date().toISOString();
    step2.result = {
      entriesCalculated: entries.length,
      totalDepreciation: totalDepreciationAmount,
      assetsProcessed: depreciableAssets.length,
    };
  } catch (err) {
    step2.status = "failed";
    step2.error = String(err);
    errors.push(`Depreciation calculation failed: ${String(err)}`);
  }

  steps.push(step2);

  // ── Step 3: Physical Verification Check ─────────────────────────────
  const step3: AssetStep = {
    id: "verification_check",
    label: "Physical Verification Check",
    status: "pending",
    agent: "Asset Agent",
  };

  try {
    step3.status = "in_progress";
    step3.startedAt = new Date().toISOString();

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Find assets with no recent verification
    const recentVerifications = await db
      .select({ fixedAssetId: assetVerifications.fixedAssetId })
      .from(assetVerifications)
      .where(
        and(
          eq(assetVerifications.entityId, entityId),
          gte(assetVerifications.verifiedDate ?? new Date(0), oneYearAgo),
        ),
      );

    const recentlyVerifiedIds = new Set(
      recentVerifications.map((v) => v.fixedAssetId),
    );

    const activeAssets = await db.query.fixedAssets.findMany({
      where: and(
        eq(fixedAssets.entityId, entityId),
        inArray(fixedAssets.status, ["active", "under_maintenance"]),
      ),
    });

    const dueForVerification: VerificationDueItem[] = [];
    let dueCount = 0;

    for (const asset of activeAssets) {
      if (recentlyVerifiedIds.has(asset.id)) continue;

      // Schedule verification (due now)
      const scheduledVerification = {
        fixedAssetId: asset.id,
        assetName: asset.name,
        assetClass: asset.assetClass,
        lastVerifiedDate: null,
        scheduledDate: new Date().toISOString(),
        daysOverdue: 0,
      };

      // Create verification record if not already existing
      const existingVerif = await db.query.assetVerifications.findFirst({
        where: and(
          eq(assetVerifications.fixedAssetId, asset.id),
          eq(assetVerifications.entityId, entityId),
          eq(assetVerifications.status, "pending"),
        ),
      });

      if (!existingVerif) {
        await db.insert(assetVerifications).values({
          entityId,
          fixedAssetId: asset.id,
          scheduledDate: new Date(),
          status: "pending",
        });
      }

      dueForVerification.push(scheduledVerification);
      dueCount++;
    }

    totalVerificationDue = dueCount;

    if (dueCount > 0) {
      warnings.push(`${dueCount} asset(s) due for physical verification`);
    }

    step3.status = dueCount > 0 ? "flagged" : "completed";
    step3.completedAt = new Date().toISOString();
    step3.result = {
      dueForVerification: dueCount,
      recentlyVerified: recentlyVerifiedIds.size,
      totalActive: activeAssets.length,
    };
  } catch (err) {
    step3.status = "failed";
    step3.error = String(err);
    errors.push(`Verification check failed: ${String(err)}`);
  }

  steps.push(step3);

  // ── Step 4: Disposal Detection ──────────────────────────────────────
  const step4: AssetStep = {
    id: "disposal_detection",
    label: "Disposal Detection",
    status: "pending",
    agent: "Asset Agent",
  };

  try {
    step4.status = "in_progress";
    step4.startedAt = new Date().toISOString();

    const activeAssets = await db.query.fixedAssets.findMany({
      where: and(
        eq(fixedAssets.entityId, entityId),
        inArray(fixedAssets.status, ["active", "fully_depreciated"]),
      ),
    });

    const flags: DisposalFlagItem[] = [];
    const now = new Date();

    for (const asset of activeAssets) {
      const purchaseDate = new Date(asset.purchaseDate);
      const monthsInService =
        (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
        (now.getMonth() - purchaseDate.getMonth());
      const usefulLife = Number(asset.usefulLifeMonths);
      const nbv = Number(asset.netBookValue);
      const cost = Number(asset.cost);

      if (monthsInService >= usefulLife && nbv > Number(asset.salvageValue)) {
        // Past useful life but still has book value — needs disposal
        flags.push({
          fixedAssetId: asset.id,
          assetName: asset.name,
          cost,
          netBookValue: nbv,
          monthsInService,
          usefulLifeMonths: usefulLife,
          recommendation: "dispose",
        });
      } else if (
        asset.status === "fully_depreciated" &&
        nbv <= Number(asset.salvageValue)
      ) {
        // Still in use but fully depreciated — flag for review
        flags.push({
          fixedAssetId: asset.id,
          assetName: asset.name,
          cost,
          netBookValue: nbv,
          monthsInService,
          usefulLifeMonths: usefulLife,
          recommendation: "review",
        });
      }
    }

    disposalFlags = flags;

    if (flags.length > 0) {
      warnings.push(
        `${flags.filter((f) => f.recommendation === "dispose").length} asset(s) past useful life, ${flags.filter((f) => f.recommendation === "review").length} fully depreciated asset(s) still in use`,
      );
    }

    step4.status = flags.length > 0 ? "flagged" : "completed";
    step4.completedAt = new Date().toISOString();
    step4.result = {
      flagsDetected: flags.length,
      recommendedDisposal: flags.filter((f) => f.recommendation === "dispose")
        .length,
      recommendedReview: flags.filter((f) => f.recommendation === "review")
        .length,
    };
  } catch (err) {
    step4.status = "failed";
    step4.error = String(err);
    errors.push(`Disposal detection failed: ${String(err)}`);
  }

  steps.push(step4);

  // ── Step 5: Manual Adjustment Intake ─────────────────────────────────
  const step5: AssetStep = {
    id: "adjustment_intake",
    label: "Manual Adjustment Intake",
    status: "pending",
    agent: "Asset Agent",
  };

  try {
    step5.status = "in_progress";
    step5.startedAt = new Date().toISOString();

    // Check for unprocessed disposal records
    const pendingDisposals = await db.query.assetDisposalRecords.findMany({
      where: and(
        eq(assetDisposalRecords.entityId, entityId),
        isNull(assetDisposalRecords.journalEntryId), // no journal entry yet
      ),
    });

    // Check for assets with pending verifications > 90 days overdue
    const overdueVerifications = await db.query.assetVerifications.findMany({
      where: and(
        eq(assetVerifications.entityId, entityId),
        eq(assetVerifications.status, "pending"),
        lt(
          assetVerifications.scheduledDate,
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        ),
      ),
    });

    step5.result = {
      pendingDisposals: pendingDisposals.length,
      overdueVerifications: overdueVerifications.length,
      adjustmentsPending: pendingDisposals.length + overdueVerifications.length,
    };

    if (pendingDisposals.length > 0 || overdueVerifications.length > 0) {
      warnings.push(
        `${pendingDisposals.length} pending disposal(s), ${overdueVerifications.length} overdue verification(s)`,
      );
    }

    step5.status = "completed";
    step5.completedAt = new Date().toISOString();
  } catch (err) {
    step5.status = "failed";
    step5.error = String(err);
    errors.push(`Adjustment intake failed: ${String(err)}`);
  }

  steps.push(step5);

  // ── Step 6: Depreciation Journal Posting ─────────────────────────────
  const step6: AssetStep = {
    id: "journal_posting",
    label: "Depreciation Journal Posting",
    status: "pending",
    agent: "Asset Agent (→ Controller → Ledger)",
  };

  try {
    step6.status = "in_progress";
    step6.startedAt = new Date().toISOString();

    if (allDepreciationEntries.length === 0) {
      step6.status = "skipped";
      step6.completedAt = new Date().toISOString();
      step6.result = { reason: "No depreciation entries to post" };
    } else {
      // Find the depreciation expense and accumulated depreciation accounts
      const depreciationExpenseAccount =
        await db.query.chartOfAccounts.findFirst({
          where: and(
            eq(chartOfAccounts.entityId, entityId),
            eq(chartOfAccounts.code, "6040"), // Depreciation expense
          ),
        });

      const accumDeprAccount = await db.query.chartOfAccounts.findFirst({
        where: and(
          eq(chartOfAccounts.entityId, entityId),
          eq(chartOfAccounts.code, "1520"), // Accumulated depreciation
        ),
      });

      if (!depreciationExpenseAccount || !accumDeprAccount) {
        step6.status = "skipped";
        step6.completedAt = new Date().toISOString();
        step6.result = {
          reason:
            "Depreciation accounts not found in COA (codes 6040, 1520 required)",
        };
        warnings.push(
          "Depreciation accounts (6040/1520) not configured — journal not posted",
        );
      } else {
        // Create batch journal entry
        const [je] = await db
          .insert(journalEntries)
          .values({
            entityId,
            entryNumber: parseInt(Date.now().toString().slice(-8), 10),
            description: `Monthly depreciation for ${period} — ${allDepreciationEntries.length} assets`,
            date: new Date().toISOString().slice(0, 10),
            periodId: "",
            status: "posted",
            postedAt: new Date(),
            postedBy: userId,
          })
          .returning();

        if (je) {
          // Debit: Depreciation expense (6040)
          await db.insert(journalEntryLines).values({
            journalEntryId: je.id,
            accountId: depreciationExpenseAccount.id,
            debit: totalDepreciationAmount.toFixed(2),
            credit: "0",
            description: `Depreciation for ${period}`,
          });

          // Credit: Accumulated depreciation (1520)
          await db.insert(journalEntryLines).values({
            journalEntryId: je.id,
            accountId: accumDeprAccount.id,
            debit: "0",
            credit: totalDepreciationAmount.toFixed(2),
            description: `Accumulated depreciation for ${period}`,
          });

          // Update pipeline run with journal entry ID
          if (pipelineRunId) {
            await db
              .update(assetPipelineRuns)
              .set({ journalEntryId: je.id })
              .where(eq(assetPipelineRuns.id, pipelineRunId));
          }

          // Update depreciation schedule records with journal entry ID
          const scheduleEntries = await db.query.depreciationSchedule.findMany({
            where: and(
              eq(depreciationSchedule.entityId, entityId),
              eq(depreciationSchedule.calculatedBy, "agent"),
              sql`${depreciationSchedule.journalEntryId} IS NULL`,
            ),
            orderBy: [desc(depreciationSchedule.createdAt)],
            limit: allDepreciationEntries.length,
          });

          for (const scheduleEntry of scheduleEntries) {
            await db
              .update(depreciationSchedule)
              .set({ journalEntryId: je.id })
              .where(eq(depreciationSchedule.id, scheduleEntry.id));
          }

          step6.result = {
            journalEntryId: je.id,
            entryNumber: je.entryNumber,
            debitAmount: totalDepreciationAmount,
            creditAmount: totalDepreciationAmount,
            lineCount: 2,
          };
        }

        step6.status = "completed";
        step6.completedAt = new Date().toISOString();
      }
    }
  } catch (err) {
    step6.status = "failed";
    step6.error = String(err);
    errors.push(`Journal posting failed: ${String(err)}`);
  }

  steps.push(step6);

  // ── Step 7: Confidence Gate & Review ─────────────────────────────────
  const step7: AssetStep = {
    id: "confidence_gate",
    label: "Confidence Gate & Review",
    status: "pending",
    agent: "Asset Agent",
  };

  try {
    step7.status = "in_progress";
    step7.startedAt = new Date().toISOString();

    const hasErrors = errors.length > 0;
    const hasDisposalFlags = disposalFlags.length > 0;
    const hasVerificationFlags = totalVerificationDue > 0;
    const depreciationCount = allDepreciationEntries.length;
    const assetCount = totalAssetsScanned;

    // Compute confidence score
    let confidence = 1.0;

    // Deduct for errors
    if (hasErrors) confidence -= 0.3;

    // Deduct for flagged items
    if (hasDisposalFlags) confidence -= 0.1;
    if (hasVerificationFlags) confidence -= 0.05;

    // Bonus for successful depreciation posting
    if (depreciationCount > 0 && step6.status === "completed")
      confidence += 0.05;

    // Floor at 0.2, ceiling at 1.0
    confidence = Math.max(0.2, Math.min(1.0, confidence));

    const needsReview = hasErrors || hasDisposalFlags || hasVerificationFlags;

    // Update pipeline run with confidence
    if (pipelineRunId) {
      await db
        .update(assetPipelineRuns)
        .set({
          confidence: confidence.toFixed(2),
          status: needsReview ? "reviewing" : "completed",
          completedAt: needsReview ? null : new Date(),
        })
        .where(eq(assetPipelineRuns.id, pipelineRunId));
    }

    step7.status = needsReview ? "flagged" : "completed";
    step7.completedAt = new Date().toISOString();
    step7.result = {
      confidence,
      needsReview,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      disposalFlagsCount: disposalFlags.length,
      verificationDueCount: totalVerificationDue,
    };
  } catch (err) {
    step7.status = "failed";
    step7.error = String(err);
    errors.push(`Confidence gate failed: ${String(err)}`);
  }

  steps.push(step7);

  // ── Step 8: Audit Trail ──────────────────────────────────────────────
  const step8: AssetStep = {
    id: "audit_trail",
    label: "Audit Trail Logging",
    status: "pending",
    agent: "Asset Agent",
  };

  try {
    step8.status = "in_progress";
    step8.startedAt = new Date().toISOString();

    await db.insert(auditLog).values({
      entityId,
      userId,
      action: "assetPipeline.run",
      entityType: "asset_pipeline_run",
      entityIdRef: pipelineRunId ?? "N/A",
      newValues: {
        period,
        assetsScanned: totalAssetsScanned,
        depreciationCount: totalDepreciationCount,
        depreciationTotal: totalDepreciationAmount,
        verificationDue: totalVerificationDue,
        disposalFlags: disposalFlags.length,
        stepsCompleted: steps.filter((s) => s.status === "completed").length,
        totalSteps: steps.length,
        errors: errors.length,
        warnings: warnings.length,
      },
    });

    step8.status = "completed";
    step8.completedAt = new Date().toISOString();
  } catch (err) {
    step8.status = "failed";
    step8.error = String(err);
    errors.push(`Audit trail failed: ${String(err)}`);
  }

  steps.push(step8);

  // ── Final Status Update ──────────────────────────────────────────────
  const allCompleted = steps.every(
    (s) => s.status === "completed" || s.status === "skipped",
  );
  const anyFailed = steps.some((s) => s.status === "failed");

  if (pipelineRunId && !step7.result) {
    // If confidence gate wasn't reached, just set status based on completion
    await db
      .update(assetPipelineRuns)
      .set({
        status: anyFailed ? "failed" : allCompleted ? "completed" : "reviewing",
        totalAssets: String(totalAssetsScanned),
        assetsScanned: String(totalAssetsScanned),
        depreciationCount: String(totalDepreciationCount),
        depreciationTotal: totalDepreciationAmount.toFixed(2),
        verificationDue: String(totalVerificationDue),
        disposalFlags: String(disposalFlags.length),
        errors: errors,
        warnings: warnings,
        completedAt: allCompleted ? new Date() : null,
      })
      .where(eq(assetPipelineRuns.id, pipelineRunId));
  } else if (pipelineRunId) {
    await db
      .update(assetPipelineRuns)
      .set({
        totalAssets: String(totalAssetsScanned),
        assetsScanned: String(totalAssetsScanned),
        depreciationCount: String(totalDepreciationCount),
        depreciationTotal: totalDepreciationAmount.toFixed(2),
        verificationDue: String(totalVerificationDue),
        disposalFlags: String(disposalFlags.length),
        errors: errors,
        warnings: warnings,
      })
      .where(eq(assetPipelineRuns.id, pipelineRunId));
  }

  return {
    success: true,
    continuous: false,
    period,
    steps,
    assetsScanned: totalAssetsScanned,
    depreciationCount: totalDepreciationCount,
    depreciationTotal: totalDepreciationAmount,
    verificationDueCount: totalVerificationDue,
    disposalFlags,
    errors,
    warnings,
  };
}

// ─── Status Query ────────────────────────────────────────────────────────────

export async function getAssetPipelineStatus(params: {
  entityId: string;
  period?: string;
}): Promise<{
  hasActivePipeline: boolean;
  latestRun: typeof assetPipelineRuns.$inferSelect | null;
  assetSummary: {
    total: number;
    active: number;
    disposed: number;
    fullyDepreciated: number;
    underMaintenance: number;
    totalValue: number;
    totalNBV: number;
  };
  verificationSummary: {
    pending: number;
    overdue: number;
    verified: number;
  };
  disposalFlags: DisposalFlagItem[];
  depreciationSummary: {
    lastRunPeriod: string | null;
    totalDepreciated: number;
    totalAccumulatedDepreciation: number;
  };
}> {
  const { entityId, period } = params;

  // Latest pipeline run
  const latestRun = period
    ? await db.query.assetPipelineRuns.findFirst({
        where: and(
          eq(assetPipelineRuns.entityId, entityId),
          eq(assetPipelineRuns.period, period),
        ),
        orderBy: [desc(assetPipelineRuns.createdAt)],
      })
    : await db.query.assetPipelineRuns.findFirst({
        where: eq(assetPipelineRuns.entityId, entityId),
        orderBy: [desc(assetPipelineRuns.createdAt)],
      });

  // Asset summary
  const allAssets = await db.query.fixedAssets.findMany({
    where: eq(fixedAssets.entityId, entityId),
  });

  const assetSummary = {
    total: allAssets.length,
    active: allAssets.filter((a) => a.status === "active").length,
    disposed: allAssets.filter((a) => a.status === "disposed").length,
    fullyDepreciated: allAssets.filter((a) => a.status === "fully_depreciated")
      .length,
    underMaintenance: allAssets.filter((a) => a.status === "under_maintenance")
      .length,
    totalValue: allAssets.reduce((s, a) => s + Number(a.cost), 0),
    totalNBV: allAssets.reduce((s, a) => s + Number(a.netBookValue), 0),
  };

  // Verification summary
  const verifications = await db.query.assetVerifications.findMany({
    where: eq(assetVerifications.entityId, entityId),
  });

  const verificationSummary = {
    pending: verifications.filter(
      (v) => v.status === "pending" || v.status === "overdue",
    ).length,
    overdue: verifications.filter(
      (v) =>
        v.status === "pending" &&
        new Date(v.scheduledDate) <
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    ).length,
    verified: verifications.filter((v) => v.status === "verified").length,
  };

  // Disposal flags from active assets past useful life
  const activeAssets = await db.query.fixedAssets.findMany({
    where: and(
      eq(fixedAssets.entityId, entityId),
      eq(fixedAssets.status, "active"),
    ),
  });

  const flags: DisposalFlagItem[] = [];
  const now = new Date();
  for (const asset of activeAssets) {
    const purchaseDate = new Date(asset.purchaseDate);
    const monthsInService =
      (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
      (now.getMonth() - purchaseDate.getMonth());
    const usefulLife = Number(asset.usefulLifeMonths);
    if (monthsInService >= usefulLife) {
      flags.push({
        fixedAssetId: asset.id,
        assetName: asset.name,
        cost: Number(asset.cost),
        netBookValue: Number(asset.netBookValue),
        monthsInService,
        usefulLifeMonths: usefulLife,
        recommendation: "dispose",
      });
    }
  }

  // Depreciation summary
  const lastScheduleEntry = await db.query.depreciationSchedule.findFirst({
    where: eq(depreciationSchedule.entityId, entityId),
    orderBy: [desc(depreciationSchedule.createdAt)],
  });

  const totalAccumulatedDepreciation = allAssets.reduce(
    (s, a) => s + Number(a.accumulatedDepreciation),
    0,
  );

  return {
    hasActivePipeline:
      latestRun?.status === "scanning" ||
      latestRun?.status === "calculating" ||
      latestRun?.status === "posting" ||
      latestRun?.status === "reviewing",
    latestRun: latestRun ?? null,
    assetSummary,
    verificationSummary,
    disposalFlags: flags,
    depreciationSummary: {
      lastRunPeriod: latestRun?.period ?? null,
      totalDepreciated: allAssets.filter(
        (a) => Number(a.accumulatedDepreciation) > 0,
      ).length,
      totalAccumulatedDepreciation,
    },
  };
}

// ─── Helper Utilities ────────────────────────────────────────────────────────

function countByClass(assets: ScannedAsset[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of assets) {
    counts[a.assetClass] = (counts[a.assetClass] ?? 0) + 1;
  }
  return counts;
}
