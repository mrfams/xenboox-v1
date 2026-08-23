import { StateGraph, START, END } from "@langchain/langgraph";
import { ComplianceState } from "./state";
import {
  nodeParseInput,
  nodeReviewTaxPosition,
  nodeCheckFilingStatus,
  nodeCloseConfirmation,
  nodeMonitorDeadlines,
  nodeReviewTaxAgent,
  nodeDetectRuleChange,
  nodeRequestHumanReview,
  nodeApplyRuleUpdate,
  nodeReportRegulatoryStatus,
  nodeRunComplianceAudit,
  nodeEscalate,
} from "./nodes";

function routeAfterParse(state: typeof ComplianceState.State) {
  const op = state.currentOperation?.type;
  if (op === "filing_status") return "filing_status";
  if (op === "close_confirmation") return "close_confirmation";
  if (op === "monitor_deadlines") return "monitor_deadlines";
  if (op === "review_tax_agent") return "review_tax_agent";
  if (op === "detect_rule_change") return "detect_rule_change";
  if (op === "confirm_rule_update") return "confirm_rule_update";
  if (op === "report_status") return "report_status";
  return "tax_review";
}

function routeAfterDeadlineMonitoring(state: typeof ComplianceState.State) {
  const ds = state.deadlineMonitoringState;
  if (!ds || ds.status === "monitoring") return END;
  if (ds.status === "deadline_approaching") return "review_tax_agent";
  return END;
}

function routeAfterTaxAgentReview(state: typeof ComplianceState.State) {
  const result = state.result as { passed?: boolean } | null;
  if (result?.passed === false) return "escalate";
  return "report_status";
}

function routeAfterRuleDetection(state: typeof ComplianceState.State) {
  const rs = state.ruleChangeState;
  if (!rs || rs.status === "idle") return END;
  if (rs.status === "rule_update_detected") return "request_human_review";
  return END;
}

function routeAfterHumanReview(state: typeof ComplianceState.State) {
  const rs = state.ruleChangeState;
  if (rs?.status === "human_review_requested") return "apply_rule_update";
  return END;
}

function routeAfterWork(state: typeof ComplianceState.State) {
  if (state.errors.length > 0) return "escalate";
  return END;
}

const graph = new StateGraph(ComplianceState)
  .addNode("parse_input", nodeParseInput)
  .addNode("tax_review", nodeReviewTaxPosition)
  .addNode("filing_status", nodeCheckFilingStatus)
  .addNode("close_confirmation", nodeCloseConfirmation)
  .addNode("monitor_deadlines", nodeMonitorDeadlines)
  .addNode("review_tax_agent", nodeReviewTaxAgent)
  .addNode("detect_rule_change", nodeDetectRuleChange)
  .addNode("request_human_review", nodeRequestHumanReview)
  .addNode("apply_rule_update", nodeApplyRuleUpdate)
  .addNode("run_compliance_audit", nodeRunComplianceAudit)
  .addNode("report_status", nodeReportRegulatoryStatus)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    tax_review: "tax_review",
    filing_status: "filing_status",
    close_confirmation: "close_confirmation",
    monitor_deadlines: "monitor_deadlines",
    review_tax_agent: "review_tax_agent",
    detect_rule_change: "detect_rule_change",
    confirm_rule_update: "apply_rule_update",
    report_status: "report_status",
  })
  .addConditionalEdges("monitor_deadlines", routeAfterDeadlineMonitoring, {
    review_tax_agent: "review_tax_agent",
    [END]: END,
  })
  .addConditionalEdges("review_tax_agent", routeAfterTaxAgentReview, {
    report_status: "report_status",
    escalate: "escalate",
  })
  .addConditionalEdges("detect_rule_change", routeAfterRuleDetection, {
    request_human_review: "request_human_review",
    [END]: END,
  })
  .addConditionalEdges("request_human_review", routeAfterHumanReview, {
    apply_rule_update: "apply_rule_update",
    [END]: END,
  })
  .addConditionalEdges("apply_rule_update", routeAfterWork, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("tax_review", "run_compliance_audit")
  .addConditionalEdges("run_compliance_audit", routeAfterWork, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("filing_status", END)
  .addEdge("close_confirmation", END)
  .addEdge("report_status", END)
  .addEdge("escalate", END);

export const complianceAgent = graph.compile();
