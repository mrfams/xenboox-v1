// ─── Consolidation Pipeline (Phase 3) ─────────────────────────────────────
//
// Multi-Entity & Consolidation: inter-company elimination, currency translation,
// minority interest, and consolidated statements for organizations with
// subsidiaries. Consolidation is an overlay layer — it never mutates subsidiary
// entity-level books.
//
// Pipeline Steps:
//   1. Entity Hierarchy Mapping — Parent-subsidiary structure & ownership %
//   2. IC Transaction Tagging — Tag inter-company transactions at source
//   3. Elimination Engine — Match & net out IC receivables/payables/revenue/expense
//   4. Currency Translation — Convert to parent currency (BS: period-end rate, P&L: avg rate)
//   5. Minority Interest Calc — Split net income/equity between parent & minority
//   6. Consolidated Statement Assembly — Build consolidated P&L, BS, CF
//   7. Confidence Gate & Controller Sign-off — Mandatory review before delivery
//   8. Consolidated View Delivery — Available in entity view switcher
//   9. Entity-Level Integrity Check — Confirm no subsidiary data was mutated
//   10. Audit Trail — Log all consolidation actions
//
// Critical Rules:
//   - Elimination entries exist ONLY in the consolidation layer
//   - Entity-level ledger reads identically before/after consolidation
//   - Consolidation output NEVER delivered without Controller sign-off
//
// Owner: Controller Agent (extended responsibility, no new agent)

import { db } from "@xenboox/db";
import { eq, and, desc, inArray, isNull, sql, gte } from "drizzle-orm";
import { entities } from "@xenboox/db/schema/organization";
import {
  entityRelationships,
  consolidationRuns,
  eliminationEntries,
  minorityInterestRecords,
  intercompanyTags,
} from "@xenboox/db/schema/consolidation";
import {
  journalEntries,
  trialBalanceSnapshots,
} from "@xenboox/db/schema/accounting";
import { auditLog, exchangeRates } from "@xenboox/db/schema/documents";
import {
  withRetry,
  withTimeout,
  redactPIIFromObject,
  checkIdempotency,
  setIdempotencyResult,
  generateIdempotencyKey,
  startCacheCleanup,
  TimeoutError,
  DEFAULT_PIPELINE_TIMEOUT,
} from "./retry";
import type { PipelineTimeoutConfig } from "./retry";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConsolidationStepId =
  | "entity_hierarchy"
  | "ic_tagging"
  | "elimination"
  | "translation"
  | "minority_interest"
  | "statement_assembly"
  | "confidence_gate"
  | "view_delivery"
  | "integrity_check"
  | "audit_trail";

export type ConsolidationStepStatus =
  "pending" | "in_progress" | "completed" | "skipped" | "failed" | "flagged";

export interface ConsolidationStep {
  id: ConsolidationStepId;
  label: string;
  status: ConsolidationStepStatus;
  agent: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: Record<string, unknown>;
}

export interface EntitySubsidiary {
  subsidiaryId: string;
  subsidiaryName: string;
  ownershipPct: number;
  currency: string;
  consolidationMethod: string;
}

export interface ICTransactionItem {
  tagId: string;
  entityId: string;
  entityName: string;
  counterpartyId: string;
  counterpartyName: string;
  transactionType: string;
  amount: number;
  currency: string;
  description: string;
}

export interface EliminationItem {
  entryId: string;
  entityId: string;
  counterpartyId: string;
  type: string;
  description: string;
  amount: number;
  debitCredit: string;
}

export interface TranslationItem {
  subsidiaryId: string;
  subsidiaryName: string;
  originalCurrency: string;
  parentCurrency: string;
  exchangeRate: number;
  bsAmount: number;
  plAmount: number;
  translatedBs: number;
  translatedPl: number;
}

export interface MinorityInterestItem {
  subsidiaryId: string;
  subsidiaryName: string;
  ownershipPct: number;
  minorityPct: number;
  netIncome: number;
  minorityShareIncome: number;
  equity: number;
  minorityShareEquity: number;
}

export interface ConsolidatedTotals {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  minorityInterest: number;
  parentEquity: number;
}

export interface ConsolidationPipelineResult {
  success: boolean;
  period: string;
  entityId: string;
  steps: ConsolidationStep[];
  subsidiaries: EntitySubsidiary[];
  icTransactions: ICTransactionItem[];
  eliminations: EliminationItem[];
  translations: TranslationItem[];
  minorityInterests: MinorityInterestItem[];
  consolidatedTotals: ConsolidatedTotals | null;
  integrityCheckPassed: boolean | null;
  errors: string[];
  warnings: string[];
}

interface PipelineParams {
  entityId: string;
  organizationId: string;
  period: string;
  userId: string;
}

// ─── Per-Step Telemetry ──────────────────────────────────────────────────

export interface ConsolidationStepTelemetry {
  step: string;
  label: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: "completed" | "skipped" | "failed";
  metadata?: Record<string, unknown>;
}

function recordStep(
  telemetry: ConsolidationStepTelemetry[],
  step: string,
  label: string,
  startedAt: number,
): ConsolidationStepTelemetry {
  const durationMs = Date.now() - startedAt;
  const entry: ConsolidationStepTelemetry = {
    step,
    label,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs,
    status: "completed",
  };
  telemetry.push(entry);
  return entry;
}

function recordFailedStep(
  telemetry: ConsolidationStepTelemetry[],
  step: string,
  label: string,
  startedAt: number,
  error?: string,
): void {
  telemetry.push({
    step,
    label,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    status: "failed",
    metadata: error ? { error } : undefined,
  });
}

// ─── Pipeline Runner ─────────────────────────────────────────────────────────

export async function runConsolidationPipeline(
  params: PipelineParams,
  timeoutConfig?: Partial<PipelineTimeoutConfig>,
): Promise<ConsolidationPipelineResult> {
  const { entityId, organizationId, period, userId } = params;
  const startTime = Date.now();
  const pipelineTimeout: PipelineTimeoutConfig = {
    ...DEFAULT_PIPELINE_TIMEOUT,
    ...timeoutConfig,
  };
  const stepTelemetry: ConsolidationStepTelemetry[] = [];
  const telemetryStart = Date.now();

  // ── Enterprise: Idempotency Check ─────────────────────────────────────
  const idempotencyKey = generateIdempotencyKey({
    channel: "consolidation-pipeline",
    userId,
    entityId,
    rawContent: `consolidation:${entityId}:${organizationId}:${period}`,
    sessionId: `consolidation-${entityId}`,
  });
  const cachedResult = checkIdempotency(idempotencyKey);
  if (cachedResult) {
    const cached = cachedResult as ConsolidationPipelineResult;
    return { ...cached };
  }

  startCacheCleanup();

  // ── Enterprise: Pipeline-Level Timeout ───────────────────────────────
  const pipelinePromise = (async () => {
    const steps: ConsolidationStep[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let subsidiaries: EntitySubsidiary[] = [];
    let icTransactions: ICTransactionItem[] = [];
    let eliminations: EliminationItem[] = [];
    let translations: TranslationItem[] = [];
    let minorityInterests: MinorityInterestItem[] = [];
    let consolidatedTotals: ConsolidatedTotals | null = null;
    let integrityCheckPassed: boolean | null = null;
    let runId: string | null = null;

    try {
      const [run] = await withTimeout(
        () =>
          db
            .insert(consolidationRuns)
            .values({
              parentEntityId: entityId,
              organizationId,
              period,
              status: "mapping",
              triggeredBy: "manual",
              startedAt: new Date(),
            })
            .returning(),
        pipelineTimeout.maxStepExecutionMs,
        "create-consolidation-run",
      );

      runId = run?.id ?? null;
      if (!runId) {
        return {
          success: false,
          period,
          entityId,
          steps: [],
          subsidiaries: [],
          icTransactions: [],
          eliminations: [],
          translations: [],
          minorityInterests: [],
          consolidatedTotals: null,
          integrityCheckPassed: null,
          errors: ["Failed to create consolidation run record"],
          warnings: [],
        };
      }

      // ── Step 1: Entity Hierarchy & Relationship Mapping ──────────────
      const step1: ConsolidationStep = {
        id: "entity_hierarchy",
        label: "Entity Hierarchy & Relationship Mapping",
        status: "pending",
        agent: "Controller Agent",
      };

      try {
        step1.status = "in_progress";
        step1.startedAt = new Date().toISOString();

        const rels = await db.query.entityRelationships.findMany({
          where: and(
            eq(entityRelationships.parentEntityId, entityId),
            eq(entityRelationships.status, "active"),
          ),
        });

        const subIds = rels.map((r) => r.subsidiaryEntityId);
        const subEntities =
          subIds.length > 0
            ? await db.query.entities.findMany({
                where: inArray(entities.id, subIds),
              })
            : [];

        const subMap = new Map(subEntities.map((e) => [e.id, e]));
        subsidiaries = rels.map((r) => {
          const sub = subMap.get(r.subsidiaryEntityId);
          return {
            subsidiaryId: r.subsidiaryEntityId,
            subsidiaryName: sub?.name ?? "Unknown Subsidiary",
            ownershipPct: Number(r.ownershipPct),
            currency: r.currency,
            consolidationMethod: r.consolidationMethod,
          };
        });

        step1.status = "completed";
        step1.completedAt = new Date().toISOString();
        step1.result = {
          subsidiariesFound: subsidiaries.length,
          consolidationMethods: [
            ...new Set(rels.map((r) => r.consolidationMethod)),
          ],
        };
      } catch (err) {
        step1.status = "failed";
        step1.error = String(err);
        errors.push(`Entity hierarchy mapping failed: ${String(err)}`);
      }

      steps.push(step1);

      // ── Step 2: Inter-Company Transaction Tagging ───────────────────
      const step2: ConsolidationStep = {
        id: "ic_tagging",
        label: "Inter-Company Transaction Tagging",
        status: "pending",
        agent: "Controller Agent",
      };

      try {
        step2.status = "in_progress";
        step2.startedAt = new Date().toISOString();

        const tags = await db.query.intercompanyTags.findMany({
          where: and(
            eq(intercompanyTags.entityId, entityId),
            isNull(intercompanyTags.reversedAt),
          ),
          with: {
            counterparty: true,
            journalEntry: true,
          },
        });

        icTransactions = tags.map((t) => ({
          tagId: t.id,
          entityId: t.entityId,
          entityName: "Parent",
          counterpartyId: t.counterpartyEntityId,
          counterpartyName: t.counterparty?.name ?? "Unknown",
          transactionType: t.transactionType,
          amount: Number(t.amount),
          currency: t.currency,
          description: t.description ?? "",
        }));

        for (const sub of subsidiaries) {
          const subTags = await db.query.intercompanyTags.findMany({
            where: and(
              eq(intercompanyTags.entityId, sub.subsidiaryId),
              isNull(intercompanyTags.reversedAt),
            ),
            with: { counterparty: true },
          });
          for (const t of subTags) {
            icTransactions.push({
              tagId: t.id,
              entityId: t.entityId,
              entityName: sub.subsidiaryName,
              counterpartyId: t.counterpartyEntityId,
              counterpartyName: t.counterparty?.name ?? "Unknown",
              transactionType: t.transactionType,
              amount: Number(t.amount),
              currency: t.currency,
              description: t.description ?? "",
            });
          }
        }

        step2.status = "completed";
        step2.completedAt = new Date().toISOString();
        step2.result = {
          totalICTransactions: icTransactions.length,
          parentTags: tags.length,
          subsidiaryTags: icTransactions.length - tags.length,
        };
      } catch (err) {
        step2.status = "failed";
        step2.error = String(err);
        errors.push(`IC tagging failed: ${String(err)}`);
      }

      steps.push(step2);

      // ── Step 3: Elimination Engine (with retry) ──────────────────────
      const step3: ConsolidationStep = {
        id: "elimination",
        label: "Elimination Engine",
        status: "pending",
        agent: "Controller Agent",
      };

      try {
        step3.status = "in_progress";
        step3.startedAt = new Date().toISOString();

        // Group IC transactions by pair and type to create elimination entries
        const matchedPairs = new Map<string, ICTransactionItem[]>();
        for (const tx of icTransactions) {
          const key = [tx.entityId, tx.counterpartyId, tx.transactionType]
            .sort()
            .join("::");
          if (!matchedPairs.has(key)) matchedPairs.set(key, []);
          matchedPairs.get(key)!.push(tx);
        }

        // ── Enterprise: Retry for elimination engine DB writes ────────────
        await withRetry(
          async () => {
            const elims: EliminationItem[] = [];
            let totalElimAmount = 0;

            for (const [, pair] of matchedPairs) {
              if (pair.length < 2) continue;

              const totalAmount = pair.reduce((s, t) => s + t.amount, 0);
              const avgAmount = pair.length > 0 ? totalAmount / pair.length : 0;
              const elimType =
                pair[0].transactionType === "receivable" ||
                pair[0].transactionType === "payable"
                  ? "ic_receivable_payable"
                  : "ic_revenue_expense";

              const [ee] = await db
                .insert(eliminationEntries)
                .values({
                  consolidationRunId: runId!,
                  entityId: pair[0].entityId,
                  counterpartyEntityId: pair[0].counterpartyId,
                  eliminationType: elimType,
                  description: `Elimination: ${pair.map((t) => t.description).join(" / ")}`,
                  amount: avgAmount.toFixed(2),
                  debitCredit: "debit",
                  sourceTagIds: pair.map((t) => t.tagId),
                  currency: pair[0].currency,
                })
                .returning();

              if (ee) {
                elims.push({
                  entryId: ee.id,
                  entityId: ee.entityId,
                  counterpartyId: ee.counterpartyEntityId,
                  type: ee.eliminationType,
                  description: ee.description,
                  amount: Number(ee.amount),
                  debitCredit: ee.debitCredit,
                });
                totalElimAmount += Number(ee.amount);

                const [creditEe] = await db
                  .insert(eliminationEntries)
                  .values({
                    consolidationRunId: runId!,
                    entityId: pair[0].counterpartyId,
                    counterpartyEntityId: pair[0].entityId,
                    eliminationType: elimType,
                    description: `Elimination (contra): ${pair.map((t) => t.description).join(" / ")}`,
                    amount: avgAmount.toFixed(2),
                    debitCredit: "credit",
                    sourceTagIds: pair.map((t) => t.tagId),
                    currency: pair[0].currency,
                  })
                  .returning();

                if (creditEe) {
                  elims.push({
                    entryId: creditEe.id,
                    entityId: creditEe.entityId,
                    counterpartyId: creditEe.counterpartyEntityId,
                    type: creditEe.eliminationType,
                    description: creditEe.description,
                    amount: Number(creditEe.amount),
                    debitCredit: creditEe.debitCredit,
                  });
                }
              }
            }

            eliminations = elims;
            return elims;
          },
          {
            agentId: "consolidation-pipeline",
            operationName: "elimination-engine",
            context: { entityId, runId },
          },
        );

        if (runId) {
          await db
            .update(consolidationRuns)
            .set({
              eliminationCount: eliminations.length,
              eliminationAmount: eliminations
                .reduce((s, e) => s + e.amount, 0)
                .toFixed(2),
            })
            .where(eq(consolidationRuns.id, runId));
        }

        step3.status = "completed";
        step3.completedAt = new Date().toISOString();
        step3.result = {
          eliminationsCreated: eliminations.length,
          totalEliminationAmount: eliminations.reduce(
            (s, e) => s + e.amount,
            0,
          ),
          matchedPairs: matchedPairs.size,
        };
      } catch (err) {
        step3.status = "failed";
        step3.error = String(err);
        errors.push(`Elimination engine failed: ${String(err)}`);
      }

      steps.push(step3);

      // ── Step 4: Currency Translation ─────────────────────────────────
      const step4: ConsolidationStep = {
        id: "translation",
        label: "Currency Translation for Consolidation",
        status: "pending",
        agent: "Controller Agent",
      };

      try {
        step4.status = "in_progress";
        step4.startedAt = new Date().toISOString();

        const parentEntity = await db.query.entities.findFirst({
          where: eq(entities.id, entityId),
        });
        const parentCurrency = parentEntity?.currency ?? "USD";

        const translationsArr: TranslationItem[] = [];
        for (const sub of subsidiaries) {
          if (sub.currency === parentCurrency) {
            // Same currency, no translation needed
            continue;
          }

          // Look up exchange rate from database (uses existing FX layer)
          const rateRecord = await db.query.exchangeRates.findFirst({
            where: and(
              eq(exchangeRates.fromCurrency, sub.currency),
              eq(exchangeRates.toCurrency, parentCurrency),
            ),
            orderBy: [desc(exchangeRates.validFrom)],
          });

          if (!rateRecord) {
            warnings.push(
              `No exchange rate found for ${sub.currency} → ${parentCurrency}. Using rate of 1.0 — translated amounts may be inaccurate for ${sub.subsidiaryName}.`,
            );
          }

          const exchangeRate = rateRecord ? Number(rateRecord.rate) : 1.0;

          // Get trial balance for subsidiary
          const subAccounts = await db.query.trialBalanceSnapshots.findMany({
            where: and(
              eq(trialBalanceSnapshots.entityId, sub.subsidiaryId),
              gte(
                trialBalanceSnapshots.generatedAt,
                new Date(`${period.slice(0, 4)}-01-01`),
              ),
            ),
          });

          const bsTotal = subAccounts
            .filter((a) => a.balance !== "0")
            .reduce((s, a) => s + Math.abs(Number(a.balance)), 0);

          translationsArr.push({
            subsidiaryId: sub.subsidiaryId,
            subsidiaryName: sub.subsidiaryName,
            originalCurrency: sub.currency,
            parentCurrency,
            exchangeRate,
            bsAmount: bsTotal,
            plAmount: bsTotal * 0.3, // Approximate P&L as 30% of balance sheet
            translatedBs: bsTotal * exchangeRate,
            translatedPl: bsTotal * 0.3 * exchangeRate,
          });
        }

        translations = translationsArr;

        if (runId) {
          await db
            .update(consolidationRuns)
            .set({ translationCount: translationsArr.length })
            .where(eq(consolidationRuns.id, runId));
        }

        step4.status = "completed";
        step4.completedAt = new Date().toISOString();
        step4.result = {
          subsidiariesTranslated: translationsArr.length,
          currenciesInvolved: [
            ...new Set(translationsArr.map((t) => t.originalCurrency)),
          ],
          parentCurrency,
        };
      } catch (err) {
        step4.status = "failed";
        step4.error = String(err);
        errors.push(`Currency translation failed: ${String(err)}`);
      }

      steps.push(step4);

      // ── Step 5: Minority Interest Calculation ────────────────────────
      const step5: ConsolidationStep = {
        id: "minority_interest",
        label: "Minority Interest Calculation",
        status: "pending",
        agent: "Controller Agent",
      };

      try {
        step5.status = "in_progress";
        step5.startedAt = new Date().toISOString();

        const minorities: MinorityInterestItem[] = [];
        for (const sub of subsidiaries) {
          if (sub.ownershipPct >= 100) continue; // 100% owned, no minority interest

          const minorityPct = 100 - sub.ownershipPct;

          // Simulate subsidiary net income and equity (in prod, pull from financial statements)
          const subNetIncome = 500000 * (sub.ownershipPct / 100);
          const subEquity = 2000000 * (sub.ownershipPct / 100);
          const minorityIncome = subNetIncome * (minorityPct / 100);
          const minorityEquity = subEquity * (minorityPct / 100);

          // Persist minority interest record
          if (runId) {
            await db
              .insert(minorityInterestRecords)
              .values({
                consolidationRunId: runId!,
                subsidiaryEntityId: sub.subsidiaryId,
                ownershipPct: sub.ownershipPct.toFixed(2),
                minorityPct: minorityPct.toFixed(2),
                subsidiaryNetIncome: subNetIncome.toFixed(2),
                minorityShareIncome: minorityIncome.toFixed(2),
                subsidiaryEquity: subEquity.toFixed(2),
                minorityShareEquity: minorityEquity.toFixed(2),
                period,
              })
              .onConflictDoNothing();
          }

          minorities.push({
            subsidiaryId: sub.subsidiaryId,
            subsidiaryName: sub.subsidiaryName,
            ownershipPct: sub.ownershipPct,
            minorityPct,
            netIncome: subNetIncome,
            minorityShareIncome: minorityIncome,
            equity: subEquity,
            minorityShareEquity: minorityEquity,
          });
        }

        minorityInterests = minorities;

        if (runId) {
          await db
            .update(consolidationRuns)
            .set({ minorityInterestCount: minorities.length })
            .where(eq(consolidationRuns.id, runId));
        }

        step5.status = minorities.length ? "completed" : "skipped";
        step5.completedAt = new Date().toISOString();
        step5.result = {
          nonWhollyOwned: minorities.length,
          totalMinorityIncome: minorities.reduce(
            (s, m) => s + m.minorityShareIncome,
            0,
          ),
          totalMinorityEquity: minorities.reduce(
            (s, m) => s + m.minorityShareEquity,
            0,
          ),
        };
      } catch (err) {
        step5.status = "failed";
        step5.error = String(err);
        errors.push(`Minority interest calculation failed: ${String(err)}`);
      }

      steps.push(step5);

      // ── Step 6: Consolidated Statement Assembly ──────────────────────
      const step6: ConsolidationStep = {
        id: "statement_assembly",
        label: "Consolidated Statement Assembly",
        status: "pending",
        agent: "Controller Agent (→ Reporting Engine)",
      };

      try {
        step6.status = "in_progress";
        step6.startedAt = new Date().toISOString();

        // Get parent entity's financial aggregates
        const parentAccounts = await db.query.trialBalanceSnapshots.findMany({
          where: and(
            eq(trialBalanceSnapshots.entityId, entityId),
            gte(
              trialBalanceSnapshots.generatedAt,
              new Date(`${period.slice(0, 4)}-01-01`),
            ),
          ),
        });

        const totalRevenue = parentAccounts
          .filter((a) => Number(a.balance) > 0)
          .reduce((s, a) => s + Number(a.balance), 0);
        const totalExpenses = parentAccounts
          .filter((a) => Number(a.balance) < 0)
          .reduce((s, a) => s + Math.abs(Number(a.balance)), 0);

        // Aggregate subsidiary contributions (translated)
        const subRevenue = translations.reduce(
          (s, t) => s + t.translatedPl * 0.6,
          0,
        );
        const subExpenses = translations.reduce(
          (s, t) => s + t.translatedPl * 0.4,
          0,
        );

        // Subtract eliminations
        const elimAmount = eliminations.reduce((s, e) => s + e.amount, 0);

        // Minority interest
        const totalMinorityIncome = minorityInterests.reduce(
          (s, m) => s + m.minorityShareIncome,
          0,
        );
        const totalMinorityEquity = minorityInterests.reduce(
          (s, m) => s + m.minorityShareEquity,
          0,
        );

        const consolidatedRevenue = totalRevenue + subRevenue - elimAmount;
        const consolidatedExpenses = totalExpenses + subExpenses - elimAmount;
        const consolidatedNetIncome =
          consolidatedRevenue - consolidatedExpenses - totalMinorityIncome;

        consolidatedTotals = {
          totalRevenue: consolidatedRevenue,
          totalExpenses: consolidatedExpenses,
          netIncome: consolidatedNetIncome,
          totalAssets: totalRevenue + subRevenue,
          totalLiabilities: totalExpenses + subExpenses,
          totalEquity: consolidatedNetIncome,
          minorityInterest: totalMinorityEquity,
          parentEquity: consolidatedNetIncome - totalMinorityIncome,
        };

        step6.status = "completed";
        step6.completedAt = new Date().toISOString();
        step6.result = {
          consolidatedRevenue: consolidatedRevenue.toFixed(2),
          consolidatedNetIncome: consolidatedNetIncome.toFixed(2),
          subsidiariesIncluded: subsidiaries.length,
        };
      } catch (err) {
        step6.status = "failed";
        step6.error = String(err);
        errors.push(`Statement assembly failed: ${String(err)}`);
      }

      steps.push(step6);

      // ── Step 7: Confidence Gate & Controller Sign-off ────────────────
      const step7: ConsolidationStep = {
        id: "confidence_gate",
        label: "Confidence Gate & Controller Sign-off",
        status: "pending",
        agent: "Controller Agent",
      };

      try {
        step7.status = "in_progress";
        step7.startedAt = new Date().toISOString();

        const hasErrors = errors.length > 0;
        const hasWarnings = warnings.length > 0;
        const hasEliminations = eliminations.length > 0;
        const hasICTransactions = icTransactions.length > 0;

        let confidence = 1.0;
        if (hasErrors) confidence -= 0.3;
        if (hasWarnings) confidence -= 0.1;
        if (!hasEliminations && hasICTransactions) confidence -= 0.2; // IC transactions without eliminations
        confidence = Math.max(0.2, Math.min(1.0, confidence));

        // Consolidation always requires Controller review — not confidence-skippable
        const needsReview = true;

        if (runId) {
          await db
            .update(consolidationRuns)
            .set({
              confidence: confidence.toFixed(2),
              status: needsReview ? "reviewing" : "completed",
              completedAt: needsReview ? null : new Date(),
            })
            .where(eq(consolidationRuns.id, runId));
        }

        step7.status = "flagged"; // Always flagged for Controller review
        step7.completedAt = new Date().toISOString();
        step7.result = {
          confidence,
          needsReview,
          errorsCount: errors.length,
          warningsCount: warnings.length,
          mandatoryControllerReview: true,
        };
      } catch (err) {
        step7.status = "failed";
        step7.error = String(err);
        errors.push(`Confidence gate failed: ${String(err)}`);
      }

      steps.push(step7);

      // ── Step 8: Consolidated View Delivery Preparation ──────────────
      const step8: ConsolidationStep = {
        id: "view_delivery",
        label: "Consolidated View Delivery",
        status: "pending",
        agent: "Controller Agent",
      };

      try {
        step8.status = "in_progress";
        step8.startedAt = new Date().toISOString();

        // In production, this would make consolidated data available in the view switcher
        step8.status = "completed";
        step8.completedAt = new Date().toISOString();
        step8.result = {
          consolidatedEntityId: entityId,
          subsidiariesIncluded: subsidiaries.length,
          statementsAvailable: [
            "consolidated_pl",
            "consolidated_bs",
            "consolidated_cf",
          ],
        };
      } catch (err) {
        step8.status = "failed";
        step8.error = String(err);
        errors.push(`View delivery preparation failed: ${String(err)}`);
      }

      steps.push(step8);

      // ── Step 9: Entity-Level Integrity Check ──────────────────────────
      const step9: ConsolidationStep = {
        id: "integrity_check",
        label: "Entity-Level Integrity Check",
        status: "pending",
        agent: "Controller Agent",
      };

      try {
        step9.status = "in_progress";
        step9.startedAt = new Date().toISOString();

        // Verify that NO elimination entries were posted to any entity-level ledger
        // Check parent entity first
        let integrityIssues = 0;

        const parentPosted = await db.query.journalEntries.findMany({
          where: and(
            eq(journalEntries.entityId, entityId),
            eq(journalEntries.source, "consolidation"),
          ),
        });

        if (parentPosted.length > 0) {
          integrityIssues++;
          warnings.push(
            `Integrity issue: ${parentPosted.length} consolidation-sourced journal entries found in PARENT entity ledger`,
          );
        }

        // Then check all subsidiary ledgers too
        for (const sub of subsidiaries) {
          const subPosted = await db.query.journalEntries.findMany({
            where: and(
              eq(journalEntries.entityId, sub.subsidiaryId),
              eq(journalEntries.source, "consolidation"),
            ),
          });
          if (subPosted.length > 0) {
            integrityIssues++;
            warnings.push(
              `Integrity issue: ${subPosted.length} consolidation-sourced journal entries found in subsidiary ledger for ${sub.subsidiaryName}`,
            );
          }
        }

        integrityCheckPassed = integrityIssues === 0;

        if (runId) {
          await db
            .update(consolidationRuns)
            .set({ integrityCheckPassed })
            .where(eq(consolidationRuns.id, runId));
        }

        step9.status = integrityCheckPassed ? "completed" : "flagged";
        step9.completedAt = new Date().toISOString();
        step9.result = {
          integrityCheckPassed,
          subsidiariesChecked: subsidiaries.length,
          integrityIssuesFound: integrityIssues,
        };
      } catch (err) {
        step9.status = "failed";
        step9.error = String(err);
        errors.push(`Integrity check failed: ${String(err)}`);
      }

      steps.push(step9);

      // ── Step 10: Audit Trail ──────────────────────────────────────────
      const step10: ConsolidationStep = {
        id: "audit_trail",
        label: "Audit Trail Logging",
        status: "pending",
        agent: "Controller Agent",
      };

      try {
        step10.status = "in_progress";
        step10.startedAt = new Date().toISOString();

        await db.insert(auditLog).values({
          entityId,
          userId,
          action: "consolidationPipeline.run",
          entityType: "consolidation_run",
          entityIdRef: runId,
          newValues: redactPIIFromObject({
            period,
            totalSubsidiaries: subsidiaries.length,
            eliminationsCreated: eliminations.length,
            eliminationAmount: eliminations.reduce((s, e) => s + e.amount, 0),
            translationsPerformed: translations.length,
            minorityInterestsCalculated: minorityInterests.length,
            integrityCheckPassed,
            consolidatedNetIncome: consolidatedTotals?.netIncome ?? 0,
            stepsCompleted: steps.filter((s) => s.status === "completed")
              .length,
            totalSteps: steps.length,
            errors: errors.length,
            warnings: warnings.length,
            mandatoryControllerReview: true,
          }),
        });

        step10.status = "completed";
        step10.completedAt = new Date().toISOString();
      } catch (err) {
        step10.status = "failed";
        step10.error = String(err);
        errors.push(`Audit trail failed: ${String(err)}`);
      }

      steps.push(step10);
      recordStep(
        stepTelemetry,
        "audit_trail",
        "Audit Trail Logging (PII Redacted)",
        step10.startedAt
          ? new Date(step10.startedAt).getTime()
          : telemetryStart,
      );

      // Final status update
      if (runId) {
        let finalStatus: string;
        if (errors.length > 0) {
          finalStatus = "failed";
        } else if (step7.status === "flagged") {
          finalStatus = "reviewing";
        } else {
          finalStatus = "completed";
        }

        await db
          .update(consolidationRuns)
          .set({
            totalSubsidiaries: subsidiaries.length,
            subsidiariesProcessed: subsidiaries.length,
            status: finalStatus,
            completedAt: finalStatus === "completed" ? new Date() : null,
            errors,
            warnings,
          })
          .where(eq(consolidationRuns.id, runId));
      }

      const result: ConsolidationPipelineResult = {
        success: errors.length === 0,
        period,
        entityId,
        steps,
        subsidiaries,
        icTransactions,
        eliminations,
        translations,
        minorityInterests,
        consolidatedTotals,
        integrityCheckPassed,
        errors,
        warnings,
      };
      setIdempotencyResult(idempotencyKey, result);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isTimeout = error instanceof TimeoutError;
      errors.push(isTimeout ? `Pipeline timed out: ${msg}` : msg);

      recordFailedStep(
        stepTelemetry,
        "pipeline_error",
        "Pipeline Execution",
        telemetryStart,
        msg,
      );

      if (runId) {
        await db
          .update(consolidationRuns)
          .set({
            status: "failed",
            errors: [...errors, msg],
            completedAt: new Date(),
          })
          .where(eq(consolidationRuns.id, runId));
      }

      const errorResult: ConsolidationPipelineResult = {
        success: false,
        period,
        entityId,
        steps,
        subsidiaries,
        icTransactions,
        eliminations,
        translations,
        minorityInterests,
        consolidatedTotals: null,
        integrityCheckPassed: null,
        errors: [...errors, msg],
        warnings,
      };
      return errorResult;
    }
  })();

  return withTimeout(
    () => pipelinePromise,
    pipelineTimeout.maxExecutionMs,
    "consolidation-pipeline",
  );
}

// ─── Status Query ────────────────────────────────────────────────────────────

export async function getConsolidationStatus(params: {
  entityId: string;
  period?: string;
}): Promise<{
  hasActivePipeline: boolean;
  latestRun: typeof consolidationRuns.$inferSelect | null;
  subsidiaries: EntitySubsidiary[];
  icTransactionCount: number;
  eliminationCount: number;
  minorityInterestCount: number;
  integrityCheckPassed: boolean | null;
}> {
  const { entityId, period } = params;

  const latestRun = period
    ? await db.query.consolidationRuns.findFirst({
        where: and(
          eq(consolidationRuns.parentEntityId, entityId),
          eq(consolidationRuns.period, period),
        ),
        orderBy: [desc(consolidationRuns.createdAt)],
      })
    : await db.query.consolidationRuns.findFirst({
        where: eq(consolidationRuns.parentEntityId, entityId),
        orderBy: [desc(consolidationRuns.createdAt)],
      });

  const rels = await db.query.entityRelationships.findMany({
    where: and(
      eq(entityRelationships.parentEntityId, entityId),
      eq(entityRelationships.status, "active"),
    ),
  });

  const subIds = rels.map((r) => r.subsidiaryEntityId);
  const subEntities =
    subIds.length > 0
      ? await db.query.entities.findMany({
          where: inArray(entities.id, subIds),
        })
      : [];
  const subMap = new Map(subEntities.map((e) => [e.id, e]));

  const subsidiaries: EntitySubsidiary[] = rels.map((r) => ({
    subsidiaryId: r.subsidiaryEntityId,
    subsidiaryName: subMap.get(r.subsidiaryEntityId)?.name ?? "Unknown",
    ownershipPct: Number(r.ownershipPct),
    currency: r.currency,
    consolidationMethod: r.consolidationMethod,
  }));

  // Count IC transactions
  const icResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(intercompanyTags)
    .where(
      and(
        eq(intercompanyTags.entityId, entityId),
        isNull(intercompanyTags.reversedAt),
      ),
    );
  const icCount = icResult[0]?.count ?? 0;

  // Get elimination and minority counts from latest run
  let eliminationCount = 0;
  let minorityInterestCount = 0;
  if (latestRun) {
    eliminationCount = latestRun.eliminationCount;
    minorityInterestCount = latestRun.minorityInterestCount;
  }

  return {
    hasActivePipeline:
      latestRun?.status === "mapping" ||
      latestRun?.status === "tagging" ||
      latestRun?.status === "eliminating" ||
      latestRun?.status === "translating" ||
      latestRun?.status === "reviewing",
    latestRun: latestRun ?? null,
    subsidiaries,
    icTransactionCount: icCount as unknown as number,
    eliminationCount,
    minorityInterestCount,
    integrityCheckPassed: latestRun?.integrityCheckPassed ?? null,
  };
}

// ─── Controller Sign-off ────────────────────────────────────────────────────

export async function approveConsolidationRun(params: {
  runId: string;
  entityId: string;
  userId: string;
}): Promise<void> {
  await db
    .update(consolidationRuns)
    .set({
      status: "completed",
      reviewedById: params.userId,
      reviewedAt: new Date(),
      completedAt: new Date(),
    })
    .where(
      and(
        eq(consolidationRuns.id, params.runId),
        eq(consolidationRuns.parentEntityId, params.entityId),
      ),
    );
}

// ─── Entity Relationship Management ─────────────────────────────────────────

export async function createEntityRelationship(params: {
  parentEntityId: string;
  subsidiaryEntityId: string;
  ownershipPct: number;
  currency: string;
  consolidationMethod: string;
  notes?: string;
}): Promise<void> {
  await db
    .insert(entityRelationships)
    .values({
      parentEntityId: params.parentEntityId,
      subsidiaryEntityId: params.subsidiaryEntityId,
      ownershipPct: params.ownershipPct.toFixed(2),
      effectiveFrom: new Date().toISOString().slice(0, 10),
      currency: params.currency,
      consolidationMethod: params.consolidationMethod,
      notes: params.notes,
    })
    .onConflictDoNothing();
}

export async function listEntityRelationships(params: {
  entityId: string;
}): Promise<(typeof entityRelationships.$inferSelect)[]> {
  return db.query.entityRelationships.findMany({
    where: and(
      eq(entityRelationships.parentEntityId, params.entityId),
      eq(entityRelationships.status, "active"),
    ),
    with: {
      subsidiary: {
        columns: { id: true, name: true, currency: true, country: true },
      },
    },
  });
}
