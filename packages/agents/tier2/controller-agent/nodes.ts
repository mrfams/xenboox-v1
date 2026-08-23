import { langfuse } from "../../core/langfuse";
import { CONTROLLER_SYSTEM_PROMPT, fillPrompt } from "../../core/prompts";
import { createAuditEntry } from "../../core/state";
import { callLLM, callLLMWithTools } from "../../core/llm/agent-llm";
import { getAgentGraph } from "../../core/orchestrator";
import type { AgentState, AgentId } from "../../core/orchestrator";
import {
  validateEntryStructural,
  reconcileSubLedgers,
  queryTrialBalanceFromDB,
} from "./tools";
import type {
  ControllerStateType,
  PendingEntryReview,
  CloseChecklist,
} from "./state";

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: ControllerStateType) {
  const trace = await langfuse.trace({
    name: "controller-parse-input",
    metadata: { entityId: state.entityId },
  });

  const input = state.currentOperation?.input ?? {};
  const operationType = state.currentOperation?.type ?? "review_entries";

  await trace.update({
    output: { operationType, inputKeys: Object.keys(input) },
  });

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
    humanResponse: null,
  };
}

// ─── Node: Review Entries (iterates batch, 7 structural checks each) ───────
// After review, dispatches approved entries to Ledger Agent for posting.

export async function nodeReviewEntries(state: ControllerStateType) {
  const trace = await langfuse.span({
    name: "controller-review-entries",
    input: { entryCount: state.pendingEntries.length },
  });

  const approved: PendingEntryReview[] = [];
  const rejected: PendingEntryReview[] = [];
  const allFlags: string[] = [];

  for (const entry of state.pendingEntries) {
    const result = await validateEntryStructural(entry, state.entityId);

    const reviewed: PendingEntryReview = {
      ...entry,
      status: result.approved ? "approved" : "rejected",
      rejectionReason: result.rejectionReason,
      reviewedAt: new Date().toISOString(),
      confidence: result.confidence,
    };

    if (result.approved) {
      approved.push(reviewed);
    } else {
      rejected.push(reviewed);
    }
    allFlags.push(...result.structuralFlags, ...result.qualitativeFlags);
  }

  // ── Phase 6: Dispatch approved entries to Ledger Agent for posting ──────
  const postedResults: Array<{
    entryId: string;
    success: boolean;
    error?: string;
  }> = [];

  if (approved.length > 0) {
    try {
      const ledgerGraph = await getAgentGraph("ledger");

      for (const entry of approved) {
        try {
          const ledgerState: AgentState = {
            entityId: state.entityId,
            entityName: state.entityName,
            currency: state.currency,
            currentOperation: {
              type: "post_entry",
              status: "processing",
              input: {
                entry: {
                  id: entry.id,
                  sourceAgent: "controller-agent",
                  description: entry.description,
                  entries: entry.entries,
                  totalDebit: entry.totalDebit,
                  totalCredit: entry.totalCredit,
                  reference: entry.reference,
                },
              },
              output: null,
              error: null,
            },
          };

          const ledgerResult = await ledgerGraph.invoke(ledgerState);
          const posted = (ledgerResult as any).result?.type === "entry_posted";

          postedResults.push({
            entryId: entry.id,
            success: posted,
            error: posted
              ? undefined
              : ((ledgerResult as any).errors?.[0] ?? "Unknown error"),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          postedResults.push({ entryId: entry.id, success: false, error: msg });
        }
      }
    } catch (err) {
      // Ledger Agent unavailable — entries reviewed but not posted
      const msg = err instanceof Error ? err.message : String(err);
      langfuse.event({
        name: "controller-ledger-dispatch-failed",
        metadata: { error: msg, approvedCount: approved.length },
      });
    }
  }

  const totalConfidence =
    approved.length > 0
      ? approved.reduce((sum, e) => sum + e.confidence, 0) / approved.length
      : 0.9;

  const postedCount = postedResults.filter((r) => r.success).length;
  const failedPosts = postedResults.filter((r) => !r.success);

  const audit = createAuditEntry({
    agentId: "controller-agent",
    action: "entries_reviewed_and_dispatched",
    details: {
      total: state.pendingEntries.length,
      approved: approved.length,
      rejected: rejected.length,
      postedToLedger: postedCount,
      failedPosts: failedPosts.length,
      flags: allFlags,
    },
    confidence: totalConfidence,
  });

  await trace.update({
    output: {
      approved: approved.length,
      rejected: rejected.length,
      postedToLedger: postedCount,
      flags: allFlags,
    },
  });

  const humanResponse =
    approved.length > 0
      ? `Reviewed ${state.pendingEntries.length} entries: ${approved.length} approved and dispatched to Ledger Agent for posting${postedCount > 0 ? ` (${postedCount} posted successfully)` : ""}. ${rejected.length} rejected.`
      : `Reviewed ${state.pendingEntries.length} entries: ${rejected.length} rejected.`;

  return {
    approvedEntries: approved,
    rejectedEntries: rejected,
    confidence: totalConfidence,
    reasoning: `${approved.length}/${state.pendingEntries.length} entries approved. ${rejected.length} rejected. ${postedCount} posted to ledger.`,
    humanResponse,
    auditTrail: [audit],
  };
}

// ─── Node: Review Trial Balance ────────────────────────────────────────────
// Phase 6: Calls Ledger Agent to generate trial balance, then reviews it.

export async function nodeReviewTrialBalance(state: ControllerStateType) {
  const trace = await langfuse.span({
    name: "controller-review-trial-balance",
    input: { entityId: state.entityId },
  });

  const periodId = (state.currentOperation?.input as Record<string, unknown>)
    ?.periodId as string | undefined;

  if (!periodId) {
    return {
      errors: ["Missing periodId for trial balance review"],
      confidence: 0,
      humanResponse: "Missing periodId for trial balance review",
    };
  }

  try {
    // Phase 6: Call Ledger Agent to generate trial balance
    let tb: any;
    try {
      const ledgerGraph = await getAgentGraph("ledger");
      const ledgerState: AgentState = {
        entityId: state.entityId,
        entityName: state.entityName,
        currency: state.currency,
        currentOperation: {
          type: "trial_balance",
          status: "processing",
          input: { periodId },
          output: null,
          error: null,
        },
      };
      const ledgerResult = await ledgerGraph.invoke(ledgerState);
      tb = (ledgerResult as any).trialBalance;

      // If Ledger Agent didn't return a trial balance, fall back to DB query
      if (!tb) {
        tb = await queryTrialBalanceFromDB(state.entityId, periodId);
      }
    } catch {
      // Fall back to direct DB query if Ledger Agent unavailable
      tb = await queryTrialBalanceFromDB(state.entityId, periodId);
    }

    const audit = createAuditEntry({
      agentId: "controller-agent",
      action: "trial_balance_reviewed",
      details: {
        balanced: tb.balanced,
        totalDebits: tb.totalDebits,
        totalCredits: tb.totalCredits,
        accountCount: tb.accounts.length,
        source: "ledger-agent",
      },
      confidence: tb.balanced ? 0.95 : 0.0,
    });

    await trace.update({
      output: {
        balanced: tb.balanced,
        totalDebits: tb.totalDebits,
        totalCredits: tb.totalCredits,
      },
    });

    if (!tb.balanced) {
      const humanResponse = `CRITICAL: Trial balance is unbalanced. Debits: ${tb.totalDebits}, Credits: ${tb.totalCredits}. This blocks the close. Escalating to CFO.`;
      return {
        trialBalance: tb,
        confidence: 0.0,
        reasoning: `CRITICAL: Trial balance is unbalanced. Debits: ${tb.totalDebits}, Credits: ${tb.totalCredits}. Escalating to CFO.`,
        humanResponse,
        errors: [
          `Trial balance unbalanced: debits ${tb.totalDebits} != credits ${tb.totalCredits}`,
        ],
        auditTrail: [audit],
      };
    }

    const humanResponse = `Trial balance for period reviewed: balanced with ${tb.accounts.length} accounts. Total debits: ${state.currency} ${tb.totalDebits.toFixed(2)}, Total credits: ${state.currency} ${tb.totalCredits.toFixed(2)}.`;
    return {
      trialBalance: tb,
      confidence: 0.95,
      reasoning: `Trial balance balanced with ${tb.accounts.length} accounts`,
      humanResponse,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Trial balance review error: ${msg}`],
      confidence: 0.0,
      humanResponse: `Trial balance review failed: ${msg}`,
    };
  }
}

// ─── Node: Run Close Checklist ─────────────────────────────────────────────
// Phase 6: Calls AP Agent and AR Agent for aging reports to verify sub-ledger reconciliation.

export async function nodeRunCloseChecklist(state: ControllerStateType) {
  const trace = await langfuse.span({
    name: "controller-close-checklist",
    input: { entityId: state.entityId },
  });

  const periodLabel = (state.currentOperation?.input as Record<string, unknown>)
    ?.periodLabel as string | undefined;

  const checklist: CloseChecklist = {
    period: periodLabel ?? "Unknown",
    items: [
      {
        domain: "AP",
        description: "All AP invoices entered for period",
        status: "pending",
        completedAt: null,
        blockedReason: null,
      },
      {
        domain: "AR",
        description: "All AR invoices entered for period",
        status: "pending",
        completedAt: null,
        blockedReason: null,
      },
      {
        domain: "Assets",
        description: "Depreciation and amortization posted",
        status: "pending",
        completedAt: null,
        blockedReason: null,
      },
      {
        domain: "GL",
        description: "All pending entries reviewed",
        status: "pending",
        completedAt: null,
        blockedReason: null,
      },
      {
        domain: "Sub-ledgers",
        description: "AP, AR, fixed assets reconcile to GL",
        status: "pending",
        completedAt: null,
        blockedReason: null,
      },
      {
        domain: "TB",
        description: "Trial balance generated and balanced",
        status: "pending",
        completedAt: null,
        blockedReason: null,
      },
      {
        domain: "Review",
        description: "Summary prepared for CFO Agent",
        status: "pending",
        completedAt: null,
        blockedReason: null,
      },
    ],
    allComplete: false,
    confirmedToCFO: false,
  };

  // ── Phase 6: Call AP Agent for aging report ──────────────────────────────
  let apAgingReport: any = null;
  try {
    const apGraph = await getAgentGraph("ap");
    const apState: AgentState = {
      entityId: state.entityId,
      entityName: state.entityName,
      currency: state.currency,
      currentOperation: {
        type: "ap_aging",
        status: "processing",
        input: { period: checklist.period },
        output: null,
        error: null,
      },
    };
    const apResult = await apGraph.invoke(apState);
    apAgingReport = (apResult as any).agingReport;
  } catch (err) {
    langfuse.event({
      name: "controller-ap-dispatch-failed",
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  // ── Phase 6: Call AR Agent for aging report ──────────────────────────────
  let arAgingReport: any = null;
  try {
    const arGraph = await getAgentGraph("ar");
    const arState: AgentState = {
      entityId: state.entityId,
      entityName: state.entityName,
      currency: state.currency,
      currentOperation: {
        type: "ar_aging",
        status: "processing",
        input: { period: checklist.period },
        output: null,
        error: null,
      },
    };
    const arResult = await arGraph.invoke(arState);
    arAgingReport = (arResult as any).agingReport;
  } catch (err) {
    langfuse.event({
      name: "controller-ar-dispatch-failed",
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  // Update AP/AR checklist items based on agent reports
  const apItem = checklist.items.find((i) => i.domain === "AP");
  if (apItem && apAgingReport) {
    const apOverdue = apAgingReport.overdueCount ?? 0;
    if (apOverdue === 0) {
      apItem.status = "complete";
      apItem.completedAt = new Date().toISOString();
    } else {
      apItem.status = "blocked";
      apItem.blockedReason = `${apOverdue} overdue AP invoice(s) totaling ${state.currency} ${(apAgingReport.totalOutstanding ?? 0).toFixed(2)}`;
    }
  }

  const arItem = checklist.items.find((i) => i.domain === "AR");
  if (arItem && arAgingReport) {
    const arOverdue = arAgingReport.overdueCount ?? 0;
    if (arOverdue === 0) {
      arItem.status = "complete";
      arItem.completedAt = new Date().toISOString();
    } else {
      arItem.status = "blocked";
      arItem.blockedReason = `${arOverdue} overdue AR invoice(s) totaling ${state.currency} ${(arAgingReport.totalOutstanding ?? 0).toFixed(2)}`;
    }
  }

  // ── Phase 6: Call Asset Agent for depreciation ──────────────────────────
  let depreciationResult: any = null;
  try {
    const assetGraph = await getAgentGraph("asset");
    const assetState: AgentState = {
      entityId: state.entityId,
      entityName: state.entityName,
      currency: state.currency,
      currentOperation: {
        type: "depreciation",
        status: "processing",
        input: { period: checklist.period },
        output: null,
        error: null,
      },
    };
    depreciationResult = await assetGraph.invoke(assetState);
    langfuse.event({
      name: "controller-asset-dispatched",
      metadata: { confidence: (depreciationResult as any).confidence ?? 0 },
    });
  } catch (err) {
    langfuse.event({
      name: "controller-asset-dispatch-failed",
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  const assetItem = checklist.items.find((i) => i.domain === "Assets");
  if (assetItem) {
    if (depreciationResult && !(depreciationResult as any).errors?.length) {
      assetItem.status = "complete";
      assetItem.completedAt = new Date().toISOString();
    } else {
      assetItem.status = "blocked";
      assetItem.blockedReason = "Asset Agent unable to post depreciation";
    }
  }

  // ── Phase 6: Call Inventory Agent for COGS ─────────────────────────────
  let inventoryResult: any = null;
  try {
    const inventoryGraph = await getAgentGraph("inventory");
    const inventoryState: AgentState = {
      entityId: state.entityId,
      entityName: state.entityName,
      currency: state.currency,
      currentOperation: {
        type: "cogs",
        status: "processing",
        input: { period: checklist.period },
        output: null,
        error: null,
      },
    };
    inventoryResult = await inventoryGraph.invoke(inventoryState);
    langfuse.event({
      name: "controller-inventory-dispatched",
      metadata: { confidence: (inventoryResult as any).confidence ?? 0 },
    });
  } catch (err) {
    langfuse.event({
      name: "controller-inventory-dispatch-failed",
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  // Auto-check sub-ledger reconciliation
  const subLedger = await reconcileSubLedgers(state.entityId);

  const subLedgerItem = checklist.items.find((i) => i.domain === "Sub-ledgers");
  if (subLedgerItem) {
    const allReconciled =
      subLedger.ap.reconciled &&
      subLedger.ar.reconciled &&
      subLedger.fixedAssets.reconciled &&
      subLedger.inventory.reconciled;
    subLedgerItem.status = allReconciled ? "complete" : "blocked";
    subLedgerItem.completedAt = allReconciled ? new Date().toISOString() : null;
    subLedgerItem.blockedReason = allReconciled
      ? null
      : `AP variance: ${subLedger.ap.variance}, AR variance: ${subLedger.ar.variance}`;
  }

  const allComplete = checklist.items.every((i) => i.status === "complete");
  checklist.allComplete = allComplete;

  const completedCount = checklist.items.filter(
    (i) => i.status === "complete",
  ).length;
  const blockedItems = checklist.items
    .filter((i) => i.status === "blocked")
    .map((i) => `${i.domain}: ${i.blockedReason ?? "blocked"}`);
  const pendingItems = checklist.items
    .filter((i) => i.status === "pending")
    .map((i) => i.domain);

  const checklistData = `Period: ${checklist.period}\nCompleted: ${completedCount}/${checklist.items.length}\nAll complete: ${allComplete}\nSub-ledger reconciliation: AP ${subLedger.ap.reconciled ? "reconciled" : `variance ${subLedger.ap.variance}`}, AR ${subLedger.ar.reconciled ? "reconciled" : `variance ${subLedger.ar.variance}`}, Fixed Assets ${subLedger.fixedAssets.reconciled ? "reconciled" : `variance ${subLedger.fixedAssets.variance}`}\n${blockedItems.length > 0 ? `Blocked: ${blockedItems.join("; ")}` : "No blocked items"}\n${pendingItems.length > 0 ? `Pending: ${pendingItems.join(", ")}` : ""}`;

  let summaryText: string;
  try {
    const result = await callLLMWithTools({
      systemPrompt: fillPrompt(CONTROLLER_SYSTEM_PROMPT, {
        ENTITY_NAME: state.entityName || "Unknown",
        ENTITY_ID: state.entityId,
        PERIOD: checklist.period,
      }),
      messages: [
        {
          role: "user",
          content: `Generate a close checklist summary for the CFO.\n\n${checklistData}\n\nWrite in plain English. State what's complete, what's blocked/pending, and the next step.\n\nYou have access to tools like get_account_balance and validate_double_entry. Use them if you need specific data.`,
        },
      ],
      entityId: state.entityId,
      agentId: "controller",
    });
    summaryText = result.content;
  } catch {
    const blocked =
      blockedItems.length > 0 ? ` Blocked: ${blockedItems.join("; ")}.` : "";
    const pending =
      pendingItems.length > 0 ? ` Pending: ${pendingItems.join(", ")}.` : "";
    summaryText = allComplete
      ? `Close checklist for ${checklist.period}: all ${completedCount} items complete. Sub-ledgers reconciled. Ready to confirm to CFO.`
      : `Close checklist for ${checklist.period}: ${completedCount}/${checklist.items.length} items complete.${blocked}${pending}`;
  }

  const audit = createAuditEntry({
    agentId: "controller-agent",
    action: "close_checklist_run",
    details: {
      period: checklist.period,
      itemsComplete: completedCount,
      totalItems: checklist.items.length,
      allComplete,
      apAgingCalled: !!apAgingReport,
      arAgingCalled: !!arAgingReport,
    },
    confidence: allComplete ? 0.92 : 0.6,
  });

  await trace.update({
    output: {
      period: checklist.period,
      allComplete,
      itemsComplete: completedCount,
      apAgingCalled: !!apAgingReport,
      arAgingCalled: !!arAgingReport,
    },
  });

  return {
    closeChecklist: checklist,
    subLedgerStatus: subLedger,
    confidence: allComplete ? 0.92 : 0.6,
    reasoning: allComplete
      ? `Close checklist complete for ${checklist.period}. Ready to confirm to CFO.`
      : `Close checklist incomplete for ${checklist.period}. ${checklist.items.length - completedCount} items pending.`,
    humanResponse: summaryText,
    auditTrail: [audit],
  };
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: ControllerStateType) {
  langfuse.event({
    name: "controller-escalation",
    metadata: {
      entityId: state.entityId,
      confidence: state.confidence,
      errors: state.errors,
      reasoning: state.reasoning,
      escalated: true,
    },
  });

  return {
    result: {
      type: "escalation",
      agentId: "controller-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
    humanResponse: `Escalation from Controller Agent: ${state.reasoning}. Errors: ${state.errors.join("; ")}`,
  };
}
