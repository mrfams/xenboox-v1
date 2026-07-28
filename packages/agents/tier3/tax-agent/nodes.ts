import { langfuse } from "../../core/langfuse";
import { createAuditEntry } from "../../core/state";
import {
  calculateVat as calculateVatTool,
  prepareFilingPackage as prepareFilingTool,
  exportJurisdictionFormat as exportFormatTool,
  checkJurisdictionRuleset,
} from "./tools";
import type { TaxStateType } from "./state";

export async function nodeParseInput(state: TaxStateType) {
  const trace = await langfuse.trace({
    name: "tax-parse-input",
    metadata: { entityId: state.entityId },
  });
  const input = state.currentOperation?.input ?? {};
  const opType = state.currentOperation?.type ?? "calculate_vat";
  await trace.update({
    output: { operationType: opType, inputKeys: Object.keys(input) },
  });
  return { confidence: 0, reasoning: `Tax operation ${opType} received` };
}

export async function nodeCalculateVat(state: TaxStateType) {
  const trace = await langfuse.span({
    name: "tax-calculate-vat",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  });
  const input = state.currentOperation?.input as
    Record<string, unknown> | undefined;
  if (!input?.period) {
    return {
      errors: ["period is required"],
      confidence: 0,
      reasoning: "Missing period",
    };
  }

  try {
    const result = await calculateVatTool(
      state.entityId,
      input.period as string,
    );
    await trace.update({
      output: {
        netPosition: result.netPosition,
        status: result.status,
        confidence: result.confidence,
      },
    });

    const confidence = result.confidence;
    const needsEscalation = confidence < 0.8;

    const audit = createAuditEntry({
      agentId: "tax-agent",
      action: "vat_calculated",
      details: {
        period: input.period,
        inputVat: result.inputVat,
        outputVat: result.outputVat,
        netPosition: result.netPosition,
      },
      confidence,
    });

    return {
      vatCalculation: result,
      confidence,
      reasoning: needsEscalation
        ? `VAT for ${input.period}: net ${result.netPosition}, confidence ${confidence} (below 0.80 threshold)`
        : `VAT for ${input.period}: net ${result.netPosition}, confidence ${confidence}`,
      auditTrail: [audit],
      errors: needsEscalation
        ? [`VAT calculation confidence ${confidence} below 0.80 threshold`]
        : [],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`VAT calculation error: ${msg}`],
      confidence: 0,
      reasoning: msg,
    };
  }
}

export async function nodePrepareFiling(state: TaxStateType) {
  const trace = await langfuse.span({
    name: "tax-prepare-filing",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  });
  const input = state.currentOperation?.input as
    Record<string, unknown> | undefined;
  if (!input?.jurisdiction || !input?.period) {
    return {
      errors: ["jurisdiction and period are required"],
      confidence: 0,
      reasoning: "Missing required params",
    };
  }

  try {
    const pkg = await prepareFilingTool(
      state.entityId,
      input.jurisdiction as string,
      input.period as string,
    );
    await trace.update({
      output: { filingType: pkg.filingType, status: pkg.status },
    });

    const ruleset = await checkJurisdictionRuleset(
      state.entityId,
      input.jurisdiction as string,
    );

    const audit = createAuditEntry({
      agentId: "tax-agent",
      action: "filing_package_prepared",
      details: {
        jurisdiction: input.jurisdiction,
        period: input.period,
        filingType: pkg.filingType,
        formats: pkg.formats,
      },
      confidence: ruleset.confidence,
    });

    return {
      filingPackage: pkg,
      confidence: ruleset.confidence,
      reasoning: ruleset.hasRules
        ? `Filing package for ${input.jurisdiction}/${input.period} prepared (${ruleset.activeRules}/${ruleset.ruleCount} rules active)`
        : `No ruleset found for ${input.jurisdiction} — escalation needed`,
      auditTrail: [audit],
      errors: ruleset.hasRules
        ? []
        : [`No active tax rules for jurisdiction ${input.jurisdiction}`],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Filing preparation error: ${msg}`],
      confidence: 0,
      reasoning: msg,
    };
  }
}

export async function nodeExportFormat(state: TaxStateType) {
  const trace = await langfuse.span({
    name: "tax-export-format",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  });
  const input = state.currentOperation?.input as
    Record<string, unknown> | undefined;
  if (!input?.jurisdiction) {
    return {
      errors: ["jurisdiction is required"],
      confidence: 0,
      reasoning: "Missing jurisdiction",
    };
  }

  try {
    const result = await exportFormatTool(input.jurisdiction as string);
    await trace.update({
      output: { format: result.format, jurisdiction: result.jurisdiction },
    });

    const audit = createAuditEntry({
      agentId: "tax-agent",
      action: "format_exported",
      details: { jurisdiction: input.jurisdiction, format: result.format },
      confidence: 0.9,
    });

    return {
      formatExport: result,
      confidence: 0.9,
      reasoning: `Export format for ${input.jurisdiction}: ${result.format}`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { errors: [`Export error: ${msg}`], confidence: 0, reasoning: msg };
  }
}

export async function nodeEscalate(state: TaxStateType) {
  langfuse.event({
    name: "tax-escalation",
    metadata: {
      entityId: state.entityId,
      confidence: state.confidence,
      errors: state.errors,
      reasoning: state.reasoning,
    },
  });
  return {
    result: {
      type: "escalation",
      agentId: "tax-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  };
}
