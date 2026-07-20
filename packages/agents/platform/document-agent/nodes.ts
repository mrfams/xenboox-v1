import { langfuse } from "../../core/langfuse";
import { createAuditEntry } from "../../core/state";
import {
  ingestDocument as ingestDocumentTool,
  extractDocumentText as extractDocumentTextTool,
  classifyDocumentAgent as classifyDocumentTool,
  extractStructuredDataAgent as extractStructuredDataTool,
  linkToTransaction as linkToTransactionTool,
} from "./tools";
import type { DocumentStateType } from "./state";

// ─── Node: Parse Input ─────────────────────────────────────────────────────

export async function nodeParseInput(state: DocumentStateType) {
  const trace = await langfuse.trace({
    name: "document-parse-input",
    metadata: { entityId: state.entityId },
  });

  const input = state.currentOperation?.input ?? {};
  const operationType = state.currentOperation?.type ?? "ingest_document";

  await trace.update({
    output: { operationType, inputKeys: Object.keys(input) },
  });

  return {
    confidence: 0,
    reasoning: `Operation ${operationType} received`,
  };
}

// ─── Node: Ingest Document ─────────────────────────────────────────────────

export async function nodeIngestDocument(state: DocumentStateType) {
  const trace = await langfuse.span({
    name: "document-ingest",
    input: { entityId: state.entityId, input: state.currentOperation?.input },
  });

  const input = state.currentOperation?.input as
    Record<string, unknown> | undefined;
  if (!input) {
    const error = "No document input provided";
    await trace.update({ output: { success: false, error } });
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    };
  }

  const ingestInput = {
    name: input.name as string,
    type: input.type as string,
    r2Key: input.r2Key as string,
    r2Bucket: input.r2Bucket as string,
    mimeType: input.mimeType as string | undefined,
    sizeBytes: input.sizeBytes as number | undefined,
  };

  const result = await ingestDocumentTool(state.entityId, ingestInput);

  await trace.update({
    output: {
      success: result.success,
      documentId: result.documentId,
      errors: result.errors,
    },
  });

  if (!result.success) {
    return {
      errors: result.errors,
      confidence: 0.2,
      reasoning: `Document ingestion failed: ${result.errors.join("; ")}`,
      currentOperation: state.currentOperation
        ? {
            ...state.currentOperation,
            status: "failed" as const,
            error: result.errors.join("; "),
          }
        : null,
    };
  }

  const audit = createAuditEntry({
    agentId: "document-agent",
    action: "document_ingested",
    details: {
      documentId: result.documentId,
      name: ingestInput.name,
      type: ingestInput.type,
      r2Key: ingestInput.r2Key,
    },
    confidence: 0.9,
  });

  return {
    currentDocument: {
      id: result.documentId!,
      name: ingestInput.name,
      type: ingestInput.type,
      status: "detected",
      r2Key: ingestInput.r2Key,
      mimeType: ingestInput.mimeType ?? null,
      sizeBytes: ingestInput.sizeBytes ?? null,
    },
    confidence: 0.9,
    reasoning: `Document "${ingestInput.name}" ingested successfully (id: ${result.documentId})`,
    auditTrail: [audit],
    currentOperation: state.currentOperation
      ? {
          ...state.currentOperation,
          status: "completed" as const,
          output: result,
        }
      : null,
  };
}

// ─── Node: Extract Text ───────────────────────────────────────────────────

export async function nodeExtractText(state: DocumentStateType) {
  const trace = await langfuse.span({
    name: "document-extract-text",
    input: { entityId: state.entityId, documentId: state.currentDocument?.id },
  });

  const documentId = state.currentDocument?.id;
  if (!documentId) {
    const error = "No document ID — ingest a document first";
    await trace.update({ output: { success: false, error } });
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    };
  }

  const result = await extractDocumentTextTool(state.entityId, documentId);

  await trace.update({
    output: {
      success: result.success,
      ocrConfidence: result.ocrConfidence,
      ocrTextLength: result.ocrText?.length ?? 0,
      errors: result.errors,
    },
  });

  if (!result.success) {
    return {
      errors: result.errors,
      confidence: 0.2,
      reasoning: `OCR extraction failed: ${result.errors.join("; ")}`,
      currentOperation: state.currentOperation
        ? {
            ...state.currentOperation,
            status: "failed" as const,
            error: result.errors.join("; "),
          }
        : null,
    };
  }

  const audit = createAuditEntry({
    agentId: "document-agent",
    action: "text_extracted",
    details: {
      documentId,
      ocrConfidence: result.ocrConfidence,
      textLength: result.ocrText?.length ?? 0,
    },
    confidence: result.ocrConfidence ?? 0.5,
  });

  return {
    extractionResult: {
      ocrText: result.ocrText,
      ocrConfidence: result.ocrConfidence,
      structuredData: null,
    },
    confidence: result.ocrConfidence ?? 0.5,
    reasoning: `OCR extraction complete for document ${documentId} (confidence: ${result.ocrConfidence})`,
    auditTrail: [audit],
    currentOperation: state.currentOperation
      ? {
          ...state.currentOperation,
          status: "completed" as const,
          output: { ocrConfidence: result.ocrConfidence },
        }
      : null,
  };
}

// ─── Node: Classify ───────────────────────────────────────────────────────

export async function nodeClassify(state: DocumentStateType) {
  const trace = await langfuse.span({
    name: "document-classify",
    input: { entityId: state.entityId, documentId: state.currentDocument?.id },
  });

  const documentId = state.currentDocument?.id;
  const ocrText = state.extractionResult?.ocrText;

  if (!documentId) {
    const error = "No document ID — ingest a document first";
    await trace.update({ output: { success: false, error } });
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    };
  }

  if (!ocrText) {
    const error = "No OCR text available — run extract_text first";
    await trace.update({ output: { success: false, error } });
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    };
  }

  const result = await classifyDocumentTool(
    state.entityId,
    documentId,
    ocrText,
  );

  await trace.update({
    output: {
      success: result.success,
      classification: result.classification,
      errors: result.errors,
    },
  });

  if (!result.success) {
    return {
      errors: result.errors,
      confidence: 0.2,
      reasoning: `Classification failed: ${result.errors.join("; ")}`,
      currentOperation: state.currentOperation
        ? {
            ...state.currentOperation,
            status: "failed" as const,
            error: result.errors.join("; "),
          }
        : null,
    };
  }

  const classification = result.classification!;

  const audit = createAuditEntry({
    agentId: "document-agent",
    action: "document_classified",
    details: {
      documentId,
      category: classification.category,
      subcategory: classification.subcategory,
      classificationConfidence: classification.confidence,
    },
    confidence: classification.confidence,
  });

  return {
    classificationResult: classification,
    confidence: classification.confidence,
    reasoning: `Document classified as "${classification.category}" (confidence: ${classification.confidence})`,
    auditTrail: [audit],
    currentOperation: state.currentOperation
      ? {
          ...state.currentOperation,
          status: "completed" as const,
          output: classification,
        }
      : null,
  };
}

// ─── Node: Extract Data ───────────────────────────────────────────────────

export async function nodeExtractData(state: DocumentStateType) {
  const trace = await langfuse.span({
    name: "document-extract-data",
    input: { entityId: state.entityId, documentId: state.currentDocument?.id },
  });

  const documentId = state.currentDocument?.id;
  const classification = state.classificationResult;

  if (!documentId) {
    const error = "No document ID — ingest a document first";
    await trace.update({ output: { success: false, error } });
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    };
  }

  if (!classification) {
    const error = "No classification available — run classify first";
    await trace.update({ output: { success: false, error } });
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    };
  }

  const result = await extractStructuredDataTool(
    state.entityId,
    documentId,
    classification,
  );

  await trace.update({
    output: {
      success: result.success,
      hasStructuredData: result.structuredData !== null,
      errors: result.errors,
    },
  });

  if (!result.success) {
    return {
      errors: result.errors,
      confidence: 0.2,
      reasoning: `Structured data extraction failed: ${result.errors.join("; ")}`,
      currentOperation: state.currentOperation
        ? {
            ...state.currentOperation,
            status: "failed" as const,
            error: result.errors.join("; "),
          }
        : null,
    };
  }

  const audit = createAuditEntry({
    agentId: "document-agent",
    action: "data_extracted",
    details: {
      documentId,
      category: classification.category,
      structuredDataKeys: Object.keys(result.structuredData ?? {}),
    },
    confidence: 0.85,
  });

  return {
    extractionResult: state.extractionResult
      ? { ...state.extractionResult, structuredData: result.structuredData }
      : {
          ocrText: null,
          ocrConfidence: null,
          structuredData: result.structuredData,
        },
    confidence: 0.85,
    reasoning: `Structured data extracted for document ${documentId} (category: ${classification.category})`,
    auditTrail: [audit],
    currentOperation: state.currentOperation
      ? {
          ...state.currentOperation,
          status: "completed" as const,
          output: result.structuredData,
        }
      : null,
  };
}

// ─── Node: Link Transaction ───────────────────────────────────────────────

export async function nodeLinkTransaction(state: DocumentStateType) {
  const trace = await langfuse.span({
    name: "document-link-transaction",
    input: {
      entityId: state.entityId,
      documentId: state.currentDocument?.id,
      input: state.currentOperation?.input,
    },
  });

  const documentId = state.currentDocument?.id;
  const input = state.currentOperation?.input as
    Record<string, unknown> | undefined;

  if (!documentId) {
    const error = "No document ID — ingest a document first";
    await trace.update({ output: { success: false, error } });
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    };
  }

  if (!input) {
    const error = "No link input provided — specify entityType and entityId";
    await trace.update({ output: { success: false, error } });
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    };
  }

  const entityType = input.entityType as string;
  const targetEntityId = input.entityId as string;

  if (!entityType || !targetEntityId) {
    const error = "entityType and entityId are required in input";
    await trace.update({ output: { success: false, error } });
    return {
      errors: [error],
      confidence: 0,
      reasoning: error,
      currentOperation: state.currentOperation
        ? { ...state.currentOperation, status: "failed" as const, error }
        : null,
    };
  }

  const result = await linkToTransactionTool(
    state.entityId,
    documentId,
    entityType,
    targetEntityId,
  );

  await trace.update({
    output: {
      success: result.success,
      link: result.link,
      errors: result.errors,
    },
  });

  if (!result.success) {
    return {
      errors: result.errors,
      confidence: 0.3,
      reasoning: `Transaction linking failed: ${result.errors.join("; ")}`,
      currentOperation: state.currentOperation
        ? {
            ...state.currentOperation,
            status: "failed" as const,
            error: result.errors.join("; "),
          }
        : null,
    };
  }

  const audit = createAuditEntry({
    agentId: "document-agent",
    action: "document_linked",
    details: {
      documentId,
      entityType,
      targetEntityId,
      linked: result.link?.linked ?? false,
    },
    confidence: 0.9,
  });

  return {
    linkResult: result.link,
    confidence: 0.9,
    reasoning: `Document ${documentId} linked to ${entityType} ${targetEntityId}`,
    auditTrail: [audit],
    currentOperation: state.currentOperation
      ? {
          ...state.currentOperation,
          status: "completed" as const,
          output: result.link,
        }
      : null,
  };
}

// ─── Node: Escalate ────────────────────────────────────────────────────────

export async function nodeEscalate(state: DocumentStateType) {
  langfuse.event({
    name: "document-escalation",
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
      agentId: "document-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  };
}
