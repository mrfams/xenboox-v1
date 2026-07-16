import { StateGraph, START, END } from "@langchain/langgraph"
import { DocumentState } from "./state"
import {
  nodeParseInput,
  nodeIngestDocument,
  nodeExtractText,
  nodeClassify,
  nodeExtractData,
  nodeLinkTransaction,
  nodeEscalate,
} from "./nodes"

// ─── Routing Functions ─────────────────────────────────────────────────────

function routeAfterParse(state: typeof DocumentState.State) {
  if (state.errors.length > 0) return "escalate"
  const opType = state.currentOperation?.type
  if (opType === "ingest_document") return "ingest_document"
  if (opType === "extract_text") return "extract_text"
  if (opType === "classify") return "classify"
  if (opType === "extract_data") return "extract_data"
  if (opType === "link_transaction") return "link_transaction"
  return "escalate"
}

function routeAfterIngest(state: typeof DocumentState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

function routeAfterExtractText(state: typeof DocumentState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

function routeAfterClassify(state: typeof DocumentState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

function routeAfterExtractData(state: typeof DocumentState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

function routeAfterLink(state: typeof DocumentState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

// ─── Graph Definition ──────────────────────────────────────────────────────

const graph = new StateGraph(DocumentState)
  .addNode("parse_input", nodeParseInput)
  .addNode("ingest_document", nodeIngestDocument)
  .addNode("extract_text", nodeExtractText)
  .addNode("classify", nodeClassify)
  .addNode("extract_data", nodeExtractData)
  .addNode("link_transaction", nodeLinkTransaction)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    ingest_document: "ingest_document",
    extract_text: "extract_text",
    classify: "classify",
    extract_data: "extract_data",
    link_transaction: "link_transaction",
    escalate: "escalate",
  })
  .addConditionalEdges("ingest_document", routeAfterIngest, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("extract_text", routeAfterExtractText, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("classify", routeAfterClassify, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("extract_data", routeAfterExtractData, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("link_transaction", routeAfterLink, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END)

export const documentAgent = graph.compile()
