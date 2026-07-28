import { langfuse } from "../../core/langfuse";
import { createAuditEntry } from "../../core/state";
import {
  sampleTransactions as sampleTool,
  compareToGoldenDataset as compareTool,
  prepareAuditPackage as packageTool,
  respondToAuditorQuery as respondTool,
  detectPatternDeviations,
} from "./tools";
import type { AuditStateType } from "./state";

export async function nodeParseInput(state: AuditStateType) {
  const trace = await langfuse.trace({
    name: "audit-parse-input",
    metadata: { entityId: state.entityId },
  });
  const input = state.currentOperation?.input ?? {};
  const opType = state.currentOperation?.type ?? "sample_transactions";
  await trace.update({
    output: { operationType: opType, inputKeys: Object.keys(input) },
  });
  return { confidence: 0, reasoning: `Audit operation ${opType} received` };
}

export async function nodeSampleTransactions(state: AuditStateType) {
  const trace = await langfuse.span({
    name: "audit-sample-transactions",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  });
  const input = state.currentOperation?.input as
    Record<string, unknown> | undefined;
  const criteria = {
    sampleSize: (input?.sampleSize as number) ?? 50,
    status: input?.status as string | undefined,
    minAmount: input?.minAmount as number | undefined,
  };

  try {
    const sample = await sampleTool(state.entityId, criteria);
    await trace.update({
      output: {
        sampleSize: sample.sampleSize,
        totalTransactions: sample.totalTransactions,
      },
    });

    const deviationCheck = await detectPatternDeviations(state.entityId);

    const hasCritical =
      sample.items.some((i) => i.flags.length > 0) ||
      deviationCheck.hasDeviation;
    const confidence = hasCritical ? 0.6 : 0.9;

    const audit = createAuditEntry({
      agentId: "audit-agent",
      action: hasCritical
        ? "transaction_sample_flagged"
        : "transaction_sample_completed",
      details: {
        sampleSize: sample.sampleSize,
        flaggedItems: sample.items.filter((i) => i.flags.length > 0).length,
        deviations: deviationCheck.deviations,
      },
      confidence,
    });

    return {
      auditSample: sample,
      confidence,
      reasoning: hasCritical
        ? `Sample of ${sample.sampleSize} transactions completed with ${sample.items.filter((i) => i.flags.length > 0).length} flagged items`
        : `Sample of ${sample.sampleSize} transactions completed — no issues found`,
      auditTrail: [audit],
      errors: deviationCheck.hasDeviation
        ? [
            `Pattern deviations detected: ${deviationCheck.deviations.map((d) => d.detail).join("; ")}`,
          ]
        : [],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Sampling error: ${msg}`],
      confidence: 0,
      reasoning: msg,
    };
  }
}

export async function nodeCompareDataset(state: AuditStateType) {
  const trace = await langfuse.span({
    name: "audit-compare-dataset",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  });
  const input = state.currentOperation?.input as
    Record<string, unknown> | undefined;
  if (!input?.agentId || !input?.output) {
    return {
      errors: ["agentId and output are required"],
      confidence: 0,
      reasoning: "Missing required params",
    };
  }

  try {
    const result = await compareTool(
      input.agentId as string,
      input.output as Record<string, unknown>,
    );
    await trace.update({
      output: {
        score: result.score,
        passed: result.passed,
        failed: result.failed,
      },
    });

    const hasDeviations = result.deviations.some(
      (d) => d.severity === "critical",
    );
    const hasWarnings = result.deviations.some((d) => d.severity === "warning");
    const confidence = hasDeviations ? 0.3 : hasWarnings ? 0.6 : result.score;

    const audit = createAuditEntry({
      agentId: "audit-agent",
      action: "golden_dataset_comparison",
      details: {
        agentId: input.agentId,
        score: result.score,
        deviations: result.deviations,
      },
      confidence,
    });

    return {
      goldenDatasetComparison: result,
      confidence,
      reasoning: `Comparison with golden dataset for ${input.agentId}: ${result.passed}/${result.totalChecks} passed, score ${result.score}`,
      auditTrail: [audit],
      errors: hasDeviations
        ? [
            `Critical deviations found in ${input.agentId} golden dataset comparison`,
          ]
        : [],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Dataset comparison error: ${msg}`],
      confidence: 0,
      reasoning: msg,
    };
  }
}

export async function nodePreparePackage(state: AuditStateType) {
  const trace = await langfuse.span({
    name: "audit-prepare-package",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  });
  const input = state.currentOperation?.input as
    Record<string, unknown> | undefined;
  const period =
    (input?.period as string) ?? new Date().toISOString().slice(0, 7);

  try {
    const pkg = await packageTool(state.entityId, period);
    await trace.update({
      output: { sections: pkg.sections.length, totalItems: pkg.totalItems },
    });

    const hasIncomplete = pkg.sections.some((s) => s.status === "pending");
    const confidence = hasIncomplete ? 0.7 : 0.9;

    const audit = createAuditEntry({
      agentId: "audit-agent",
      action: "audit_package_prepared",
      details: {
        period,
        sections: pkg.sections.length,
        totalItems: pkg.totalItems,
      },
      confidence,
    });

    return {
      auditPackage: pkg,
      confidence,
      reasoning: `Audit package for period ${period}: ${pkg.totalItems} items across ${pkg.sections.length} sections`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Package preparation error: ${msg}`],
      confidence: 0,
      reasoning: msg,
    };
  }
}

export async function nodeRespondQuery(state: AuditStateType) {
  const trace = await langfuse.span({
    name: "audit-respond-query",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  });
  const input = state.currentOperation?.input as
    Record<string, unknown> | undefined;
  if (!input?.queryId) {
    return {
      errors: ["queryId is required"],
      confidence: 0,
      reasoning: "Missing queryId",
    };
  }

  try {
    const response = await respondTool(state.entityId, input.queryId as string);
    await trace.update({
      output: {
        queryId: input.queryId,
        requiresFollowUp: response.requiresFollowUp,
      },
    });

    const audit = createAuditEntry({
      agentId: "audit-agent",
      action: "auditor_query_responded",
      details: {
        queryId: input.queryId,
        supportingDocs: response.supportingDocuments.length,
      },
      confidence: response.confidence,
    });

    return {
      auditorQueryResponse: response,
      confidence: response.confidence,
      reasoning: `Response prepared for auditor query ${input.queryId}${response.requiresFollowUp ? " (follow-up required)" : ""}`,
      auditTrail: [audit],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Query response error: ${msg}`],
      confidence: 0,
      reasoning: msg,
    };
  }
}

export async function nodeEscalate(state: AuditStateType) {
  langfuse.event({
    name: "audit-escalation",
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
      agentId: "audit-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  };
}
