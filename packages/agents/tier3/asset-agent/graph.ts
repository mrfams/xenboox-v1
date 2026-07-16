import { StateGraph, START, END } from "@langchain/langgraph"
import { AssetState } from "./state"
import {
  nodeParseInput,
  nodeCalculateDepreciation,
  nodeRegisterAsset,
  nodeGetAssetRegister,
  nodeEscalate,
} from "./nodes"

// ─── Routing Functions ─────────────────────────────────────────────────────

function routeAfterParse(state: typeof AssetState.State) {
  if (state.confidence === 0 && state.errors.length > 0) return "escalate"
  const op = state.currentOperation?.type
  if (op === "calculate_depreciation") return "calculate_depreciation"
  if (op === "register_asset" || op === "dispose_asset") return "register_asset"
  if (op === "asset_register") return "asset_register"
  return "escalate"
}

function routeAfterOperation(state: typeof AssetState.State) {
  if (state.errors.length > 0) return "escalate"
  return END
}

// ─── Graph Definition ──────────────────────────────────────────────────────

const graph = new StateGraph(AssetState)
  .addNode("parse_input", nodeParseInput)
  .addNode("calculate_depreciation", nodeCalculateDepreciation)
  .addNode("register_asset", nodeRegisterAsset)
  .addNode("asset_register", nodeGetAssetRegister)
  .addNode("escalate", nodeEscalate)
  .addEdge(START, "parse_input")
  .addConditionalEdges("parse_input", routeAfterParse, {
    calculate_depreciation: "calculate_depreciation",
    register_asset: "register_asset",
    asset_register: "asset_register",
    escalate: "escalate",
  })
  .addConditionalEdges("calculate_depreciation", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("register_asset", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addConditionalEdges("asset_register", routeAfterOperation, {
    escalate: "escalate",
    [END]: END,
  })
  .addEdge("escalate", END)

export const assetAgent = graph.compile()
