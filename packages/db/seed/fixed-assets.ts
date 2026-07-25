/**
 * Fixed Assets Seed Data
 *
 * Comprehensive test data for the Fixed Assets Pipeline development.
 * Creates 15+ assets across multiple classes, depreciation methods, and
 * lifecycle stages, plus verification records, disposals, pipeline runs,
 * and depreciation schedule entries.
 *
 * Run: pnpm db:seed (or call seedFixedAssets() from the main seed file)
 *
 * Uses same patterns as the main seed file:
 *   - deterministic UUIDs via seedUuid()
 *   - onConflictDoNothing() for idempotent re-runs
 *   - entity-scoped to the demo entity
 */

import crypto from "node:crypto";
import { db } from "../index";
import { fixedAssets, depreciationSchedule } from "../schema/fixed-assets";
import {
  assetPipelineRuns,
  assetVerifications,
  assetDisposalRecords,
} from "../schema/asset-pipeline";

// ─── Deterministic UUID helper (same pattern as index.ts) ────────────────
function seedUuid(type: string, n: number): string {
  const hash = crypto.createHash("sha256").update(`${type}-${n}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

// Note: ENTITY_ID is passed as a parameter to seedFixedAssets()
// because the main seed (index.ts) uses crypto.randomUUID() which is non-deterministic.

// ─── Asset Definitions ─────────────────────────────────────────────────────

interface AssetDef {
  name: string;
  assetClass: string;
  location: string;
  purchaseDate: string;
  cost: string;
  salvageValue: string;
  usefulLifeMonths: number;
  depreciationMethod: "straight_line" | "reducing_balance";
  status: "active" | "disposed" | "fully_depreciated" | "under_maintenance";
  responsiblePerson: string;
  condition: string;
  monthsDepreciated: number; // how many months of depreciation to pre-calculate
}

const ASSETS: AssetDef[] = [
  // ── Vehicles ──────────────────────────────────────────────────────────
  {
    name: "Toyota Hilux 2024 - White",
    assetClass: "vehicle",
    location: "Banjul Office",
    purchaseDate: "2024-01-15",
    cost: "1850000",
    salvageValue: "185000",
    usefulLifeMonths: 60,
    depreciationMethod: "straight_line",
    status: "active",
    responsiblePerson: "Ousman Jatta",
    condition: "excellent",
    monthsDepreciated: 18,
  },
  {
    name: "Nissan Navara 2023 - Blue",
    assetClass: "vehicle",
    location: "Brikama Branch",
    purchaseDate: "2023-06-01",
    cost: "1650000",
    salvageValue: "165000",
    usefulLifeMonths: 60,
    depreciationMethod: "reducing_balance",
    status: "active",
    responsiblePerson: "Ismaila Ceesay",
    condition: "good",
    monthsDepreciated: 25,
  },
  {
    name: "Mitsubishi L200 - 2020",
    assetClass: "vehicle",
    location: "Field Operations",
    purchaseDate: "2020-03-10",
    cost: "1400000",
    salvageValue: "140000",
    usefulLifeMonths: 60,
    depreciationMethod: "straight_line",
    status: "under_maintenance",
    responsiblePerson: "Bubacarr Jobe",
    condition: "fair",
    monthsDepreciated: 60,
  },

  // ── Buildings ─────────────────────────────────────────────────────────
  {
    name: "Main Office - Kairaba Avenue",
    assetClass: "building",
    location: "Kairaba Avenue, Banjul",
    purchaseDate: "2020-01-01",
    cost: "5000000",
    salvageValue: "500000",
    usefulLifeMonths: 240,
    depreciationMethod: "straight_line",
    status: "active",
    responsiblePerson: "Ousman Jatta",
    condition: "good",
    monthsDepreciated: 18,
  },
  {
    name: "Brikama Warehouse",
    assetClass: "building",
    location: "Brikama Industrial Area",
    purchaseDate: "2021-06-15",
    cost: "3200000",
    salvageValue: "320000",
    usefulLifeMonths: 240,
    depreciationMethod: "straight_line",
    status: "active",
    responsiblePerson: "Ismaila Ceesay",
    condition: "good",
    monthsDepreciated: 12,
  },

  // ── IT Equipment ────────────────────────────────────────────────────
  {
    name: "Dell PowerEdge R740 Servers (x3)",
    assetClass: "equipment",
    location: "Server Room - Main Office",
    purchaseDate: "2024-01-15",
    cost: "450000",
    salvageValue: "45000",
    usefulLifeMonths: 36,
    depreciationMethod: "straight_line",
    status: "active",
    responsiblePerson: "Bubacarr Jobe",
    condition: "excellent",
    monthsDepreciated: 18,
  },
  {
    name: "HP ProDesk Workstations (x10)",
    assetClass: "equipment",
    location: "Main Office - Workstations",
    purchaseDate: "2024-01-15",
    cost: "350000",
    salvageValue: "35000",
    usefulLifeMonths: 36,
    depreciationMethod: "reducing_balance",
    status: "active",
    responsiblePerson: "Bubacarr Jobe",
    condition: "good",
    monthsDepreciated: 18,
  },
  {
    name: "Cisco Network Switch Stack",
    assetClass: "equipment",
    location: "Server Room",
    purchaseDate: "2023-03-01",
    cost: "180000",
    salvageValue: "18000",
    usefulLifeMonths: 36,
    depreciationMethod: "straight_line",
    status: "active",
    responsiblePerson: "Bubacarr Jobe",
    condition: "good",
    monthsDepreciated: 28,
  },
  {
    name: "UPS Battery Backup System",
    assetClass: "equipment",
    location: "Server Room",
    purchaseDate: "2024-01-15",
    cost: "95000",
    salvageValue: "9500",
    usefulLifeMonths: 36,
    depreciationMethod: "straight_line",
    status: "active",
    responsiblePerson: "Bubacarr Jobe",
    condition: "good",
    monthsDepreciated: 18,
  },

  // ── Furniture & Fixtures ─────────────────────────────────────────────
  {
    name: "Executive Office Furniture Suite",
    assetClass: "furniture",
    location: "Main Office - Executive Wing",
    purchaseDate: "2024-01-15",
    cost: "180000",
    salvageValue: "18000",
    usefulLifeMonths: 60,
    depreciationMethod: "straight_line",
    status: "active",
    responsiblePerson: "Awa Bah",
    condition: "good",
    monthsDepreciated: 18,
  },
  {
    name: "Open Plan Workstation Desks (x15)",
    assetClass: "furniture",
    location: "Main Office - Open Plan",
    purchaseDate: "2023-06-01",
    cost: "225000",
    salvageValue: "22500",
    usefulLifeMonths: 60,
    depreciationMethod: "straight_line",
    status: "active",
    responsiblePerson: "Awa Bah",
    condition: "good",
    monthsDepreciated: 25,
  },
  {
    name: "Conference Room Furniture",
    assetClass: "furniture",
    location: "Main Office - Conference Room",
    purchaseDate: "2022-01-01",
    cost: "120000",
    salvageValue: "12000",
    usefulLifeMonths: 60,
    depreciationMethod: "straight_line",
    status: "active",
    responsiblePerson: "Awa Bah",
    condition: "fair",
    monthsDepreciated: 42,
  },

  // ── Machinery & Equipment ────────────────────────────────────────────
  {
    name: "Generator 50kVA - Perkins",
    assetClass: "equipment",
    location: "Generator Room - Main Office",
    purchaseDate: "2022-06-15",
    cost: "320000",
    salvageValue: "32000",
    usefulLifeMonths: 84,
    depreciationMethod: "straight_line",
    status: "active",
    responsiblePerson: "Ismaila Ceesay",
    condition: "good",
    monthsDepreciated: 36,
  },
  {
    name: "Solar Panel System 10kW",
    assetClass: "equipment",
    location: "Main Office Rooftop",
    purchaseDate: "2024-06-01",
    cost: "520000",
    salvageValue: "52000",
    usefulLifeMonths: 120,
    depreciationMethod: "straight_line",
    status: "active",
    responsiblePerson: "Bubacarr Jobe",
    condition: "excellent",
    monthsDepreciated: 12,
  },
  {
    name: "Air Conditioning Units (x8)",
    assetClass: "equipment",
    location: "Main Office - All Floors",
    purchaseDate: "2023-01-01",
    cost: "280000",
    salvageValue: "28000",
    usefulLifeMonths: 60,
    depreciationMethod: "straight_line",
    status: "active",
    responsiblePerson: "Ismaila Ceesay",
    condition: "good",
    monthsDepreciated: 30,
  },

  // ── Edge Cases ─────────────────────────────────────────────────────────
  {
    name: "Old Workstation - Disposed",
    assetClass: "equipment",
    location: "Brikama Branch",
    purchaseDate: "2019-01-15",
    cost: "85000",
    salvageValue: "8500",
    usefulLifeMonths: 36,
    depreciationMethod: "straight_line",
    status: "disposed",
    responsiblePerson: "Ismaila Ceesay",
    condition: "poor",
    monthsDepreciated: 36,
  },
  {
    name: "Legacy Printer - Fully Depreciated",
    assetClass: "equipment",
    location: "Main Office",
    purchaseDate: "2020-06-01",
    cost: "45000",
    salvageValue: "4500",
    usefulLifeMonths: 36,
    depreciationMethod: "straight_line",
    status: "fully_depreciated",
    responsiblePerson: "Awa Bah",
    condition: "fair",
    monthsDepreciated: 36,
  },
  {
    name: "Water Dispenser (x3)",
    assetClass: "furniture",
    location: "Main Office - Pantry",
    purchaseDate: "2024-01-15",
    cost: "45000",
    salvageValue: "0",
    usefulLifeMonths: 60,
    depreciationMethod: "straight_line",
    status: "active",
    responsiblePerson: "Awa Bah",
    condition: "good",
    monthsDepreciated: 18,
  },
  {
    name: "Security Camera System",
    assetClass: "equipment",
    location: "Main Office - Premises",
    purchaseDate: "2024-06-01",
    cost: "156000",
    salvageValue: "15600",
    usefulLifeMonths: 60,
    depreciationMethod: "reducing_balance",
    status: "active",
    responsiblePerson: "Bubacarr Jobe",
    condition: "excellent",
    monthsDepreciated: 12,
  },
];

// ─── Verification Records ─────────────────────────────────────────────────
interface VerificationDef {
  assetIdx: number;
  scheduledDate: string;
  status: "pending" | "verified" | "discrepancy_found" | "overdue";
  verifiedDate?: string;
  verifiedBy?: string;
  conditionConfirmed?: string;
  locationConfirmed?: string;
  notes?: string;
  discrepancyNotes?: string;
}

const VERIFICATIONS: VerificationDef[] = [
  {
    assetIdx: 0, // Toyota Hilux
    scheduledDate: "2026-07-15",
    status: "verified",
    verifiedDate: "2026-07-16",
    verifiedBy: "Ousman Jatta",
    conditionConfirmed: "excellent",
    locationConfirmed: "Banjul Office",
    notes: "Vehicle in good condition, mileage 32,000 km",
  },
  {
    assetIdx: 3, // Main Office Building
    scheduledDate: "2026-06-01",
    status: "verified",
    verifiedDate: "2026-06-10",
    verifiedBy: "Ousman Jatta",
    conditionConfirmed: "good",
    locationConfirmed: "Kairaba Avenue",
    notes:
      "Annual building inspection completed. Minor paint touch-ups needed.",
  },
  {
    assetIdx: 5, // Dell Servers
    scheduledDate: "2026-07-20",
    status: "verified",
    verifiedDate: "2026-07-22",
    verifiedBy: "Bubacarr Jobe",
    conditionConfirmed: "excellent",
    locationConfirmed: "Server Room",
    notes: "All three servers operational. Temperature logs reviewed.",
  },
  {
    assetIdx: 2, // Mitsubishi L200
    scheduledDate: "2026-06-15",
    status: "discrepancy_found",
    verifiedDate: "2026-06-18",
    verifiedBy: "Ismaila Ceesay",
    conditionConfirmed: "fair",
    locationConfirmed: "Field Operations",
    notes: "Vehicle currently in maintenance",
    discrepancyNotes:
      "Engine oil leak detected. Vehicle sent to garage on 2026-06-19. Status updated to under_maintenance.",
  },
  {
    assetIdx: 9, // Executive Furniture
    scheduledDate: "2026-08-01",
    status: "pending",
  },
  {
    assetIdx: 13, // Solar Panel System
    scheduledDate: "2026-09-15",
    status: "pending",
  },
  {
    assetIdx: 1, // Nissan Navara
    scheduledDate: "2026-05-01",
    status: "overdue",
    notes: "Verification overdue by 87 days",
  },
  {
    assetIdx: 7, // Network Switch
    scheduledDate: "2026-04-01",
    status: "overdue",
    notes: "IT equipment verification overdue by 118 days",
  },
];

// ─── Disposal Records ────────────────────────────────────────────────────
interface DisposalDef {
  assetIdx: number;
  disposalDate: string;
  disposalMethod: "sold" | "scrapped" | "donated" | "written_off";
  proceeds: string;
  reason: string;
  approvedBy: string;
}

const DISPOSALS: DisposalDef[] = [
  {
    assetIdx: 15, // Old Workstation
    disposalDate: "2026-06-30",
    disposalMethod: "sold",
    proceeds: "15000",
    reason: "Asset fully depreciated and replaced. Sold to staff member.",
    approvedBy: "Ousman Jatta",
  },
];

// ─── Pipeline Runs ───────────────────────────────────────────────────────
interface PipelineRunDef {
  period: string;
  status:
    | "pending"
    | "scanning"
    | "calculating"
    | "posting"
    | "reviewing"
    | "completed"
    | "failed";
  totalAssets: string;
  assetsScanned: string;
  depreciationCount: string;
  depreciationTotal: string;
  verificationDue: string;
  disposalFlags: string;
  confidence: string;
  errors: string[];
  warnings: string[];
  triggeredBy: "manual" | "scheduled" | "close_pipeline" | "agent";
  startedAt: string;
  completedAt: string;
}

const PIPELINE_RUNS: PipelineRunDef[] = [
  {
    period: "2026-06",
    status: "completed",
    totalAssets: "16",
    assetsScanned: "16",
    depreciationCount: "13",
    depreciationTotal: "22356.45",
    verificationDue: "2",
    disposalFlags: "2",
    confidence: "0.85",
    errors: [],
    warnings: [
      "2 asset(s) due for physical verification",
      "1 asset(s) past useful life, 1 fully depreciated asset(s) still in use",
    ],
    triggeredBy: "manual",
    startedAt: "2026-06-01T08:00:00.000Z",
    completedAt: "2026-06-01T08:01:15.000Z",
  },
  {
    period: "2026-07",
    status: "scanning",
    totalAssets: "18",
    assetsScanned: "5",
    depreciationCount: "0",
    depreciationTotal: "0",
    verificationDue: "0",
    disposalFlags: "0",
    confidence: "0",
    errors: [],
    warnings: [],
    triggeredBy: "scheduled",
    startedAt: "2026-07-25T00:00:00.000Z",
    completedAt: "",
  },
];

// ─── Depreciation Schedule Entries ───────────────────────────────────────
interface DeprScheduleDef {
  assetIdx: number;
  period: string;
  depreciationAmount: string;
  accumulatedDepreciation: string;
  netBookValue: string;
  calculatedBy: "agent" | "manual";
  journalEntryId?: string;
}

const DEPR_SCHEDULES: DeprScheduleDef[] = [
  {
    assetIdx: 0,
    period: "2026-06",
    depreciationAmount: "27750.00",
    accumulatedDepreciation: "499500.00",
    netBookValue: "1350500.00",
    calculatedBy: "agent",
  },
  {
    assetIdx: 3,
    period: "2026-06",
    depreciationAmount: "18750.00",
    accumulatedDepreciation: "337500.00",
    netBookValue: "4662500.00",
    calculatedBy: "agent",
  },
  {
    assetIdx: 5,
    period: "2026-06",
    depreciationAmount: "11250.00",
    accumulatedDepreciation: "202500.00",
    netBookValue: "247500.00",
    calculatedBy: "agent",
  },
  {
    assetIdx: 9,
    period: "2026-06",
    depreciationAmount: "2700.00",
    accumulatedDepreciation: "48600.00",
    netBookValue: "131400.00",
    calculatedBy: "agent",
  },
  {
    assetIdx: 12,
    period: "2026-06",
    depreciationAmount: "3428.57",
    accumulatedDepreciation: "123428.57",
    netBookValue: "196571.43",
    calculatedBy: "agent",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Calculate straight-line monthly depreciation.
 */
function calcStraightLineDepr(
  cost: number,
  salvage: number,
  months: number,
): number {
  const annual = (cost - salvage) / (months / 12);
  return Math.round((annual / 12) * 100) / 100;
}

// ─── Main Seed Function ──────────────────────────────────────────────────

export async function seedFixedAssets(entityId: string): Promise<void> {
  console.log("Seeding fixed assets pipeline test data...");

  // ── 1. Fixed Assets ──────────────────────────────────────────────────
  console.log(`  Creating ${ASSETS.length} assets...`);
  const assetIds: string[] = [];

  for (let i = 0; i < ASSETS.length; i++) {
    const a = ASSETS[i];
    const assetId = seedUuid("fixed-asset", i + 1);
    assetIds.push(assetId);

    // Pre-calculate accumulated depreciation
    const costNum = parseFloat(a.cost);
    const salvageNum = parseFloat(a.salvageValue);

    let accumDepr: number;
    if (a.status === "disposed" || a.status === "fully_depreciated") {
      // Fully depreciated to salvage value
      accumDepr = costNum - salvageNum;
    } else if (a.depreciationMethod === "straight_line") {
      accumDepr =
        calcStraightLineDepr(costNum, salvageNum, a.usefulLifeMonths) *
        a.monthsDepreciated;
    } else {
      // Reducing balance: rough approximation for seed data
      const rate = 2 / (a.usefulLifeMonths / 12);
      let bookValue = costNum;
      accumDepr = 0;
      for (let m = 0; m < a.monthsDepreciated; m++) {
        const monthlyDepr = (bookValue * rate) / 12;
        accumDepr += monthlyDepr;
        bookValue -= monthlyDepr;
      }
      accumDepr = Math.round(accumDepr * 100) / 100;
    }

    // Clamp accumulated depreciation so NBV doesn't go below salvage
    accumDepr = Math.min(accumDepr, costNum - salvageNum);
    const nbv = Math.round((costNum - accumDepr) * 100) / 100;

    await db
      .insert(fixedAssets)
      .values({
        id: assetId,
        entityId,
        name: a.name,
        assetClass: a.assetClass,
        location: a.location,
        purchaseDate: a.purchaseDate,
        cost: a.cost,
        salvageValue: a.salvageValue,
        usefulLifeMonths: a.usefulLifeMonths,
        depreciationMethod: a.depreciationMethod,
        accumulatedDepreciation: accumDepr.toFixed(2),
        netBookValue: nbv.toFixed(2),
        status: a.status,
        responsiblePerson: a.responsiblePerson,
        condition: a.condition,
        disposalDate: a.status === "disposed" ? "2026-06-30" : null,
        disposalMethod: a.status === "disposed" ? "sold" : null,
        disposalProceeds: a.status === "disposed" ? "15000" : null,
      })
      .onConflictDoNothing();
  }

  // ── 2. Verification Records ──────────────────────────────────────────
  console.log(`  Creating ${VERIFICATIONS.length} verification records...`);
  for (let i = 0; i < VERIFICATIONS.length; i++) {
    const v = VERIFICATIONS[i];
    await db
      .insert(assetVerifications)
      .values({
        id: seedUuid("verification", i + 1),
        entityId,
        fixedAssetId: assetIds[v.assetIdx],
        scheduledDate: new Date(v.scheduledDate),
        verifiedDate: v.verifiedDate ? new Date(v.verifiedDate) : null,
        verifiedBy: v.verifiedBy ?? null,
        status: v.status,
        conditionConfirmed: v.conditionConfirmed ?? null,
        locationConfirmed: v.locationConfirmed ?? null,
        notes: v.notes ?? null,
        discrepancyNotes: v.discrepancyNotes ?? null,
      })
      .onConflictDoNothing();
  }

  // ── 3. Disposal Records ──────────────────────────────────────────────
  console.log(`  Creating ${DISPOSALS.length} disposal records...`);
  for (let i = 0; i < DISPOSALS.length; i++) {
    const d = DISPOSALS[i];
    const assetIdx = d.assetIdx;
    const cost = parseFloat(ASSETS[assetIdx].cost);
    const salvage = parseFloat(ASSETS[assetIdx].salvageValue);
    const netBookValue = cost - (cost - salvage); // fully depreciated
    const proceeds = parseFloat(d.proceeds);
    const gainLoss = proceeds - netBookValue;

    await db
      .insert(assetDisposalRecords)
      .values({
        id: seedUuid("disposal", i + 1),
        entityId,
        fixedAssetId: assetIds[assetIdx],
        disposalDate: d.disposalDate,
        disposalMethod: d.disposalMethod,
        disposalProceeds: d.proceeds,
        netBookValueAtDisposal: netBookValue.toFixed(2),
        gainOrLoss: gainLoss.toFixed(2),
        approvedBy: d.approvedBy,
        approvedAt: new Date(d.disposalDate),
        reason: d.reason,
      })
      .onConflictDoNothing();
  }

  // ── 4. Pipeline Runs ──────────────────────────────────────────────────
  console.log(`  Creating ${PIPELINE_RUNS.length} pipeline runs...`);
  for (let i = 0; i < PIPELINE_RUNS.length; i++) {
    const p = PIPELINE_RUNS[i];
    await db
      .insert(assetPipelineRuns)
      .values({
        id: seedUuid("pipeline-run", i + 1),
        entityId,
        period: p.period,
        status: p.status,
        totalAssets: p.totalAssets,
        assetsScanned: p.assetsScanned,
        depreciationCount: p.depreciationCount,
        depreciationTotal: p.depreciationTotal,
        verificationDue: p.verificationDue,
        disposalFlags: p.disposalFlags,
        confidence: p.confidence,
        errors: p.errors,
        warnings: p.warnings,
        triggeredBy: p.triggeredBy,
        startedAt: new Date(p.startedAt),
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
      })
      .onConflictDoNothing();
  }

  // ── 5. Depreciation Schedule Entries ─────────────────────────────────
  console.log(
    `  Creating ${DEPR_SCHEDULES.length} depreciation schedule entries...`,
  );
  for (let i = 0; i < DEPR_SCHEDULES.length; i++) {
    const d = DEPR_SCHEDULES[i];
    await db
      .insert(depreciationSchedule)
      .values({
        id: seedUuid("depr-sched", i + 1),
        entityId,
        fixedAssetId: assetIds[d.assetIdx],
        depreciationAmount: d.depreciationAmount,
        accumulatedDepreciation: d.accumulatedDepreciation,
        netBookValue: d.netBookValue,
        calculatedBy: d.calculatedBy,
      })
      .onConflictDoNothing();
  }

  console.log("  ✅ Fixed assets pipeline seed complete!");
  console.log(
    `    ${ASSETS.length} assets · ${VERIFICATIONS.length} verifications · ${DISPOSALS.length} disposals · ${PIPELINE_RUNS.length} pipeline runs · ${DEPR_SCHEDULES.length} depreciation entries`,
  );
}
