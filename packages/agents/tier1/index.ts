export { cfoAgent } from "./cfo-agent/graph"
export { CfoState } from "./cfo-agent/state"
export type {
  CfoStateType,
  DepartmentConfirmation,
  EscalationItem,
} from "./cfo-agent/state"
export { buildCfoSystemPrompt } from "./cfo-agent/prompts"
export { classifyInstruction, routeToDepartment, evaluateCloseReadiness } from "./cfo-agent/tools"
export type { InstructionType, Department } from "./cfo-agent/tools"
