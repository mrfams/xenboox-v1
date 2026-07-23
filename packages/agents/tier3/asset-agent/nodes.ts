import { langfuse } from "../../core/langfuse";
import { createAuditEntry } from "../../core/state";
import { getAssetRegister, calculateDepreciation } from "./tools";
import type { AssetStateType } from "./state";

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: AssetStateType) {
  const trace = await langfuse.trace({
    name: "asset-parse-input",
    metadata: { entityId: state.entityId },
  });

  const input = state.currentOperation?.input ?? {};
  const operationType = state.currentOperation?.type ?? "asset_register";

  await trace.update({
    output: { operationType, inputKeys: Object.keys(input) },
  });

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
  };
}

// ─── Node: Calculate Depreciation ───────────────────────────────────────────

export async function nodeCalculateDepreciation(state: AssetStateType) {
  const trace = await langfuse.span({
    name: "asset-calculate-depreciation",
    input: { entityId: state.entityId },
  });

  const input = state.currentOperation?.input as
    | {
        cost?: number;
        salvageValue?: number;
        usefulLife?: number;
        purchaseDate?: string;
        assetId?: string;
      }
    | undefined;

  if (!input?.cost || !input?.usefulLife) {
    const error = "Missing required depreciation data: cost, usefulLife";
    await trace.update({ output: { error } });

    return {
      errors: [error],
      confidence: 0.0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    };
  }

  if (input.cost <= 0) {
    const error = "Asset cost must be greater than zero";
    await trace.update({ output: { error } });

    return {
      errors: [error],
      confidence: 0.0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    };
  }

  try {
    const result = await calculateDepreciation(state.entityId, {
      assetId: input.assetId,
      cost: input.cost,
      salvageValue: input.salvageValue ?? 0,
      usefulLife: input.usefulLife,
      purchaseDate: input.purchaseDate ?? new Date().toISOString(),
    });

    const audit = createAuditEntry({
      agentId: "asset-agent",
      action: "depreciation_calculated",
      details: {
        assetId: result.assetId,
        annualDepreciation: result.annualDepreciation,
        accumulatedDepreciation: result.accumulatedDepreciation,
        netBookValue: result.netBookValue,
      },
      confidence: 0.95,
    });

    await trace.update({
      output: {
        assetId: result.assetId,
        annualDepreciation: result.annualDepreciation,
        netBookValue: result.netBookValue,
      },
    });

    return {
      result: {
        type: "depreciation_calculated",
        ...result,
      },
      confidence: 0.95,
      reasoning: `Depreciation for ${result.assetName}: annual ${result.annualDepreciation}, accumulated ${result.accumulatedDepreciation}, NBV ${result.netBookValue}`,
      auditTrail: [audit],
      currentOperation: state.currentOperation
        ? {
            ...state.currentOperation,
            status: "completed" as const,
            output: result,
          }
        : null,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await trace.update({ output: { error: msg } });

    return {
      errors: [`Depreciation calculation error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to calculate depreciation: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    };
  }
}

// ─── Node: Register Asset ───────────────────────────────────────────────────

export async function nodeRegisterAsset(state: AssetStateType) {
  const trace = await langfuse.span({
    name: "asset-register",
    input: { entityId: state.entityId },
  });

  try {
    const register = await getAssetRegister(state.entityId);

    await trace.update({
      output: {
        assetCount: register.length,
        assets: register.map((a) => ({ id: a.id, name: a.name, code: a.code })),
      },
    });

    return {
      assetRegister: register,
      result: {
        type: "asset_register",
        assets: register,
        count: register.length,
      },
      confidence: 0.9,
      reasoning: `Asset register retrieved: ${register.length} fixed assets found`,
      currentOperation: state.currentOperation
        ? {
            ...state.currentOperation,
            status: "completed" as const,
            output: register,
          }
        : null,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await trace.update({ output: { error: msg } });

    return {
      errors: [`Asset register error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to retrieve asset register: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    };
  }
}

// ─── Node: Get Asset Register ───────────────────────────────────────────────

export async function nodeGetAssetRegister(state: AssetStateType) {
  const trace = await langfuse.span({
    name: "asset-get-register",
    input: { entityId: state.entityId },
  });

  try {
    const register = await getAssetRegister(state.entityId);

    await trace.update({
      output: {
        assetCount: register.length,
      },
    });

    return {
      assetRegister: register,
      confidence: 0.9,
      reasoning: `Asset register contains ${register.length} entries`,
      currentOperation: state.currentOperation
        ? {
            ...state.currentOperation,
            status: "completed" as const,
            output: register,
          }
        : null,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await trace.update({ output: { error: msg } });

    return {
      errors: [`Asset register query error: ${msg}`],
      confidence: 0.0,
      reasoning: `Failed to query asset register: ${msg}`,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error: msg }
        : null,
    };
  }
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: AssetStateType) {
  langfuse.event({
    name: "asset-escalation",
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
      agentId: "asset-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  };
}
