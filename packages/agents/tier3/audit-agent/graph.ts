import { StateGraph, START, END } from "@langchain/langgraph";
import { AuditState } from "./state";
import {
  nodeParseInput,
  nodeSampleTransactions,
  nodeCompareDataset,
  nodePreparePackage,
  nodeRespondQuery,
  nodeDetectDeviations,
  nodeIndependentRecomputation,
  nodeAnomalyDetection,
  nodeEscalate,
} from "./nodes";

function routeAfterParse(state: typeof AuditState.State) {
  if (state.errors.length > 0) return "escalate";
  const opType = state.currentOperation?.type;
  if (opType === "sample_transactions") return "sample_transactions";
  if (opType === "compare_to_golden_dataset") return "compare_dataset";
  if (opType === "prepare_audit_package") return "prepare_package";
  if (opType === "respond_to_auditor_query") return "respond_query";
  if (opType === "detect_pattern_deviations") return "detect_deviations";
  if (opType === "independent_recomputation") return "recomputation";
  if (opType === "anomaly_detection") return "anomaly_detection";
  return "escalate";
}

function routeAfterOperation(state: typeof AuditState.State) {
  if (state.errors.length > 0) return "escalate";
  return END;
}

const workflow = new StateGraph(AuditState)
  .addNode("parse_input", nodeParseInput)
  .addNode("sample_transactions", nodeSampleTransactions)
  .addNode("compare_dataset", nodeCompareDataset)
  .addNode("prepare_package", nodePreparePackage)
  .addNode("respond_query", nodeRespondQuery)
  .addNode("detect_deviations", nodeDetectDeviations)
  .addNode("recomputation", nodeIndependentRecomputation)
  .addNode("anomaly_detection", nodeAnomalyDetection)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    sample_transactions: "sample_transactions",
    compare_dataset: "compare_dataset",
    prepare_package: "prepare_package",
    respond_query: "respond_query",
    detect_deviations: "detect_deviations",
    recomputation: "recomputation",
    anomaly_detection: "anomaly_detection",
    escalate: "escalate",
  })
  .addConditionalEdges("sample_transactions", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("compare_dataset", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("prepare_package", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("respond_query", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("detect_deviations", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("recomputation", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("anomaly_detection", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END);

export const auditAgent = workflow.compile();
