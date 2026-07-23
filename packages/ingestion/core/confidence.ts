import type {
  IngestionConfidence,
  IngestionConfidenceSignal,
  IngestionState,
  ResolvedEntities,
  CoaMapping,
  IngestionValidation,
} from "./types";

// ─── Default Weights ────────────────────────────────────────────────────────

const DEFAULT_WEIGHTS: Record<string, number> = {
  ocr_quality: 0.1,
  classification_confidence: 0.1,
  extraction_field_confidence: 0.15,
  duplicate_check: 0.1,
  entity_resolution: 0.15,
  coa_mapping: 0.15,
  tax_calculation: 0.05,
  accounting_rule_validation: 0.1,
  amount_consistency: 0.05,
  period_validity: 0.05,
};

// ─── Signal Constructors ────────────────────────────────────────────────────

function ocrSignal(state: IngestionState): IngestionConfidenceSignal {
  // OCR confidence is already computed by the pipeline (0-1)
  return {
    name: "ocr_quality",
    value: state.ocrConfidence,
    weight: DEFAULT_WEIGHTS.ocr_quality,
    description: `OCR quality: ${(state.ocrConfidence * 100).toFixed(0)}% confidence`,
  };
}

function classificationSignal(
  state: IngestionState,
): IngestionConfidenceSignal {
  return {
    name: "classification_confidence",
    value: state.classification.confidence,
    weight: DEFAULT_WEIGHTS.classification_confidence,
    description: `Document classified as "${state.classification.category}" with ${(state.classification.confidence * 100).toFixed(0)}% confidence`,
  };
}

function extractionSignal(state: IngestionState): IngestionConfidenceSignal {
  const fieldValues = Object.values(state.extraction.fieldConfidence);
  const avgFieldConfidence =
    fieldValues.length > 0
      ? fieldValues.reduce((s, v) => s + v, 0) / fieldValues.length
      : state.extraction.confidence;

  return {
    name: "extraction_field_confidence",
    value: avgFieldConfidence,
    weight: DEFAULT_WEIGHTS.extraction_field_confidence,
    description: `Average extraction field confidence: ${(avgFieldConfidence * 100).toFixed(0)}% across ${fieldValues.length} fields`,
  };
}

function duplicateSignal(existingEntries: number): IngestionConfidenceSignal {
  const value = existingEntries === 0 ? 1.0 : 0.3;
  return {
    name: "duplicate_check",
    value,
    weight: DEFAULT_WEIGHTS.duplicate_check,
    description:
      existingEntries === 0
        ? "No duplicates detected"
        : `Warning: ${existingEntries} similar entries found`,
  };
}

function entityResolutionSignal(
  resolved?: ResolvedEntities,
): IngestionConfidenceSignal {
  if (!resolved) {
    return {
      name: "entity_resolution",
      value: 0,
      weight: DEFAULT_WEIGHTS.entity_resolution,
      description: "Entity resolution not performed",
    };
  }

  const confidences: number[] = [];
  if (resolved.vendor) confidences.push(resolved.vendor.confidence);
  if (resolved.customer) confidences.push(resolved.customer.confidence);
  if (resolved.employee) confidences.push(resolved.employee.confidence);
  if (resolved.bankAccount) confidences.push(resolved.bankAccount.confidence);
  if (resolved.asset) confidences.push(resolved.asset.confidence);

  // Penalize for unmatched entities
  const unmatchedPenalty = (resolved.unmatched?.length ?? 0) * 0.15;
  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((s, v) => s + v, 0) / confidences.length
      : 0.5;

  return {
    name: "entity_resolution",
    value: Math.max(0, Math.min(1, avgConfidence - unmatchedPenalty)),
    weight: DEFAULT_WEIGHTS.entity_resolution,
    description: `Entity resolution: ${confidences.length} entities matched, ${resolved.unmatched?.length ?? 0} unmatched`,
  };
}

function coaMappingSignal(mapping?: CoaMapping): IngestionConfidenceSignal {
  if (!mapping) {
    return {
      name: "coa_mapping",
      value: 0,
      weight: DEFAULT_WEIGHTS.coa_mapping,
      description: "COA mapping not performed",
    };
  }

  const allLines = [...mapping.debitLines, ...mapping.creditLines];
  const avgConfidence =
    allLines.length > 0
      ? allLines.reduce((s, l) => s + l.confidence, 0) / allLines.length
      : 0;

  // Penalize for unmapped accounts
  const unmappedPenalty = mapping.unmapped.length * 0.2;

  return {
    name: "coa_mapping",
    value: Math.max(0, Math.min(1, avgConfidence - unmappedPenalty)),
    weight: DEFAULT_WEIGHTS.coa_mapping,
    description: `COA mapping: ${allLines.length} lines mapped, ${mapping.unmapped.length} unmapped`,
  };
}

function validationSignal(
  validation?: IngestionValidation,
): IngestionConfidenceSignal {
  if (!validation) {
    return {
      name: "accounting_rule_validation",
      value: 0,
      weight: DEFAULT_WEIGHTS.accounting_rule_validation,
      description: "Validation not performed",
    };
  }

  const checks = [
    validation.doubleEntryValid,
    validation.accountsExist,
    validation.periodOpen,
    validation.noDuplicates,
    validation.amountsValid,
    validation.taxValid,
  ];
  const passCount = checks.filter(Boolean).length;
  const errorPenalty = validation.errors.length * 0.3;
  const value = Math.max(0, passCount / checks.length - errorPenalty);

  return {
    name: "accounting_rule_validation",
    value,
    weight: DEFAULT_WEIGHTS.accounting_rule_validation,
    description: `Validation: ${passCount}/${checks.length} checks passed, ${validation.errors.length} errors`,
  };
}

function amountConsistencySignal(
  state: IngestionState,
): IngestionConfidenceSignal {
  const extractedData = state.extraction.data;
  const totalAmount = (extractedData.totalAmount as number) ?? 0;
  const proposedEntry = state.proposedJournal;

  if (!proposedEntry || totalAmount === 0) {
    return {
      name: "amount_consistency",
      value: 0.5,
      weight: DEFAULT_WEIGHTS.amount_consistency,
      description: "Amount consistency check not applicable",
    };
  }

  // Check that the proposed entry amounts match the extracted amounts
  const maxLineAmount = Math.max(
    ...proposedEntry.lines.map((l) => Math.max(l.debit, l.credit)),
  );
  const ratio = maxLineAmount > 0 ? Math.abs(totalAmount) / maxLineAmount : 1;
  const consistent = ratio > 0.95 && ratio < 1.05;

  return {
    name: "amount_consistency",
    value: consistent ? 0.95 : 0.5,
    weight: DEFAULT_WEIGHTS.amount_consistency,
    description: consistent
      ? "Extracted amounts match proposed entry"
      : `Amount mismatch: extracted ${totalAmount} vs proposed ${maxLineAmount}`,
  };
}

function periodSignal(state: IngestionState): IngestionConfidenceSignal {
  const validation = state.validation;
  const periodOpen = validation?.periodOpen ?? false;

  return {
    name: "period_validity",
    value: periodOpen ? 1.0 : 0.0,
    weight: DEFAULT_WEIGHTS.period_validity,
    description: periodOpen
      ? "Target fiscal period is open"
      : "Target fiscal period is closed or not found",
  };
}

// ─── Main Composite Confidence Function ─────────────────────────────────────

/**
 * Compute the composite confidence score for the entire ingestion pipeline.
 * Combines all signals with their weights to produce a single 0-1 score.
 *
 * Thresholds:
 *   ≥ 0.95 → auto-post
 *   ≥ 0.80 → auto-post with notification
 *   ≥ 0.60 → pending review (user must confirm)
 *   < 0.60 → escalated (requires human intervention)
 */
export function computeIngestionConfidence(
  state: IngestionState,
  existingDuplicateCount: number = 0,
  customWeights?: Record<string, number>,
): IngestionConfidence {
  // Override weights if provided
  if (customWeights) {
    Object.assign(DEFAULT_WEIGHTS, customWeights);
  }

  const signals: IngestionConfidenceSignal[] = [
    ocrSignal(state),
    classificationSignal(state),
    extractionSignal(state),
    duplicateSignal(existingDuplicateCount),
    entityResolutionSignal(state.resolvedEntities),
    coaMappingSignal(state.coaMapping),
    validationSignal(state.validation),
    amountConsistencySignal(state),
    periodSignal(state),
  ];

  // Compute weighted average
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) {
    return {
      overall: 0,
      signals,
      autoPostReady: false,
    };
  }

  const weightedSum = signals.reduce((sum, s) => sum + s.value * s.weight, 0);
  const overall = Math.round((weightedSum / totalWeight) * 1000) / 1000;

  // Find the dominant signal (lowest confidence signal driving the score down)
  const sortedByValue = [...signals].sort((a, b) => a.value - b.value);
  const dominantSignal = sortedByValue[0]?.name;

  return {
    overall: Math.max(0, Math.min(1, overall)),
    signals,
    dominantSignal,
    autoPostReady: overall >= 0.95,
  };
}

/**
 * Determine what needs review based on low-confidence signals.
 * Returns actionable items for the review UI.
 */
export function getReviewItems(state: IngestionState): {
  field: string;
  label: string;
  value: unknown;
  confidence: number;
}[] {
  const items: {
    field: string;
    label: string;
    value: unknown;
    confidence: number;
  }[] = [];

  // Check field-level extraction confidence
  for (const [field, confidence] of Object.entries(
    state.extraction.fieldConfidence,
  )) {
    if (confidence < 0.7) {
      const value = state.extraction.data[field];
      const label = field
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase());
      items.push({ field, label, value, confidence });
    }
  }

  // Check entity resolution
  if (state.resolvedEntities) {
    if (
      state.resolvedEntities.vendor &&
      state.resolvedEntities.vendor.confidence < 0.7
    ) {
      items.push({
        field: "vendor",
        label: "Vendor",
        value: state.resolvedEntities.vendor.name,
        confidence: state.resolvedEntities.vendor.confidence,
      });
    }
    if (
      state.resolvedEntities.customer &&
      state.resolvedEntities.customer.confidence < 0.7
    ) {
      items.push({
        field: "customer",
        label: "Customer",
        value: state.resolvedEntities.customer.name,
        confidence: state.resolvedEntities.customer.confidence,
      });
    }
    for (const unmatched of state.resolvedEntities.unmatched ?? []) {
      items.push({
        field: `unmatched_${unmatched.type}`,
        label: `Unmatched ${unmatched.type}`,
        value: unmatched.name,
        confidence: 0,
      });
    }
  }

  // Check COA mapping
  if (state.coaMapping) {
    for (const line of [
      ...state.coaMapping.debitLines,
      ...state.coaMapping.creditLines,
    ]) {
      if (line.confidence < 0.7) {
        items.push({
          field: `coa_${line.accountCode}`,
          label: `Account: ${line.accountName}`,
          value: `${line.accountCode} - ${line.accountName}`,
          confidence: line.confidence,
        });
      }
    }
  }

  return items;
}
