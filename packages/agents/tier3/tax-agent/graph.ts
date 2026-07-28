import { StateGraph, START, END } from "@langchain/langgraph";
import { TaxState } from "./state";
import {
  nodeParseInput,
  nodeCalculateVat,
  nodePrepareFiling,
  nodeExportFormat,
  nodeEscalate,
} from "./nodes";

function routeAfterParse(state: typeof TaxState.State) {
  if (state.errors.length > 0) return "escalate";
  const opType = state.currentOperation?.type;
  if (opType === "calculate_vat") return "calculate_vat";
  if (opType === "prepare_filing_package") return "prepare_filing";
  if (opType === "export_jurisdiction_format") return "export_format";
  return "escalate";
}

function routeAfterOperation(state: typeof TaxState.State) {
  if (state.errors.length > 0) return "escalate";
  return END;
}

const workflow = new StateGraph(TaxState)
  .addNode("parse_input", nodeParseInput)
  .addNode("calculate_vat", nodeCalculateVat)
  .addNode("prepare_filing", nodePrepareFiling)
  .addNode("export_format", nodeExportFormat)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    calculate_vat: "calculate_vat",
    prepare_filing: "prepare_filing",
    export_format: "export_format",
    escalate: "escalate",
  })
  .addConditionalEdges("calculate_vat", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("prepare_filing", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("export_format", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END);

export const taxAgent = workflow.compile();
