import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import { chartOfAccounts } from "@xenboox/db/schema/accounting";
import {
  fixedAssets,
  depreciationSchedule,
} from "@xenboox/db/schema/fixed-assets";
import type { AssetItem, DepreciationResult } from "./state";

// ─── Asset Register ─────────────────────────────────────────────────────────

export async function getAssetRegister(entityId: string): Promise<AssetItem[]> {
  const assets = await db.query.fixedAssets.findMany({
    where: eq(fixedAssets.entityId, entityId),
  });

  return assets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    code: asset.assetClass,
    category: asset.assetClass,
    purchaseDate: asset.purchaseDate,
    cost: Number(asset.cost),
    depreciationMethod: asset.depreciationMethod,
    accumulatedDepreciation: Number(asset.accumulatedDepreciation),
    netBookValue: Number(asset.netBookValue),
    status: asset.status,
  }));
}

// ─── Calculate Depreciation (Straight-Line) ─────────────────────────────────

export async function calculateDepreciation(
  entityId: string,
  assetData: {
    assetId?: string;
    cost: number;
    salvageValue: number;
    usefulLife: number;
    purchaseDate: string;
  },
): Promise<DepreciationResult> {
  let assetName = "Unknown Asset";
  let resolvedCost = assetData.cost;
  let resolvedSalvage = assetData.salvageValue;
  let resolvedLife = assetData.usefulLife;

  if (assetData.assetId) {
    const asset = await db.query.fixedAssets.findFirst({
      where: and(
        eq(fixedAssets.id, assetData.assetId),
        eq(fixedAssets.entityId, entityId),
      ),
    });
    if (asset) {
      assetName = asset.name;
      resolvedCost = Number(asset.cost);
      resolvedSalvage = Number(asset.salvageValue);
      resolvedLife = asset.usefulLifeMonths / 12;
    }
  }

  const annualDepreciation = (resolvedCost - resolvedSalvage) / resolvedLife;
  const monthlyDepreciation = annualDepreciation / 12;

  const now = new Date();
  const purchaseDate = new Date(assetData.purchaseDate);
  const yearsElapsed =
    (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const monthsElapsed = Math.min(
    Math.floor(yearsElapsed * 12),
    resolvedLife * 12,
  );

  const accumulatedDepreciation = Math.min(
    monthlyDepreciation * monthsElapsed,
    resolvedCost - resolvedSalvage,
  );
  const netBookValue = resolvedCost - accumulatedDepreciation;

  return {
    assetId: assetData.assetId ?? "unknown",
    assetName,
    cost: resolvedCost,
    salvageValue: resolvedSalvage,
    usefulLife: resolvedLife,
    annualDepreciation,
    monthlyDepreciation,
    accumulatedDepreciation,
    netBookValue,
    depreciationDate: now.toISOString(),
  };
}

// ─── Get Depreciation Schedule ──────────────────────────────────────────────

export async function getDepreciationSchedule(
  entityId: string,
  assetId: string,
) {
  return db.query.depreciationSchedule.findMany({
    where: and(
      eq(depreciationSchedule.entityId, entityId),
      eq(depreciationSchedule.fixedAssetId, assetId),
    ),
  });
}

// ─── Get Depreciation Accounts ──────────────────────────────────────────────

export async function getDepreciationAccounts(entityId: string) {
  return db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.subtype, "depreciation"),
    ),
  });
}
