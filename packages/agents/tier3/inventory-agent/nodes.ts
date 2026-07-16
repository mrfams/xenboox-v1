import { langfuse } from "../../core/langfuse"
import { createAuditEntry } from "../../core/state"
import { calculateCogs, getInventorySummary } from "./tools"
import type { InventoryStateType } from "./state"

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: InventoryStateType) {
  const trace = await langfuse.trace({
    name: "inventory-parse-input",
    metadata: { entityId: state.entityId },
  })

  const input = state.currentOperation?.input ?? {}
  const operationType = state.currentOperation?.type ?? "inventory_summary"

  await trace.update({ output: { operationType, inputKeys: Object.keys(input) } })

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
  }
}

// ─── Node: Calculate COGS ───────────────────────────────────────────────────

export async function nodeCalculateCogs(state: InventoryStateType) {
  const trace = await langfuse.span({
    name: "inventory-calculate-cogs",
    input: { entityId: state.entityId },
  })

  try {
    const result = await calculateCogs(state.entityId)

    const audit = createAuditEntry({
      agentId: "inventory-agent",
      action: "cogs_calculated",
      details: {
        inventoryAccountCount: result.inventoryAccounts.length,
        cogsAccountCount: result.cogsAccounts.length,
        totalInventoryValue: result.totalInventoryValue,
        totalCogs: result.totalCogs,
      },
      confidence: 0.9,
    })

    await trace.update({
      output: {
        inventoryAccountCount: result.inventoryAccounts.length,
        cogsAccountCount: result.cogsAccounts.length,
        totalInventoryValue: result.totalInventoryValue,
        totalCogs: result.totalCogs,
      },
    })

    return {
      result: {
        type: "cogs_calculated",
        ...result,
      },
      confidence: 0.9,
      reasoning: `COGS calculated: ${result.inventoryAccounts.length} inventory accounts, ${result.cogsAccounts.length} COGS accounts`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: result }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`COGS calculation error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to calculate COGS: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Valuation Adjustment ─────────────────────────────────────────────

export async function nodeValuationAdjustment(state: InventoryStateType) {
  const trace = await langfuse.span({
    name: "inventory-valuation-adjustment",
    input: { entityId: state.entityId },
  })

  try {
    const summary = await getInventorySummary(state.entityId)

    await trace.update({
      output: {
        totalValue: summary.totalValue,
        itemCount: summary.itemCount,
        adjustments: summary.adjustments,
      },
    })

    return {
      inventorySummary: summary,
      result: {
        type: "valuation_adjustment",
        ...summary,
      },
      confidence: 0.85,
      reasoning: `Valuation summary: ${summary.itemCount} items, ${summary.adjustments} adjustment accounts`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: summary }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Valuation adjustment error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to compute valuation adjustment: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Get Inventory Summary ────────────────────────────────────────────

export async function nodeGetInventorySummary(state: InventoryStateType) {
  const trace = await langfuse.span({
    name: "inventory-summary",
    input: { entityId: state.entityId },
  })

  try {
    const summary = await getInventorySummary(state.entityId)

    await trace.update({
      output: {
        totalValue: summary.totalValue,
        itemCount: summary.itemCount,
        adjustments: summary.adjustments,
      },
    })

    return {
      inventorySummary: summary,
      confidence: 0.9,
      reasoning: `Inventory summary: ${summary.itemCount} active items, ${summary.adjustments} adjustment accounts`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "completed" as const, output: summary }
        : null,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ output: { error: msg } })

    return {
      errors: [`Inventory summary error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to retrieve inventory summary: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    }
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: InventoryStateType) {
  langfuse.event({
    name: "inventory-escalation",
    metadata: {
      entityId: state.entityId,
      confidence: state.confidence,
      errors: state.errors,
      reasoning: state.reasoning,
      escalated: true,
    },
  })

  return {
    result: {
      type: "escalation",
      agentId: "inventory-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  }
}
