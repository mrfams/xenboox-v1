// ─── Normalized Model Response ─────────────────────────────────────────

export interface NormalizedModelResponse {
  content: string;
  toolCalls: NormalizedToolCall[];
  confidence: number;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  latencyMs: number;
  modelId: string;
  providerId: ProviderId;
}

export interface NormalizedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// ─── Provider IDs ─────────────────────────────────────────────────────

export type ProviderId =
  | "anthropic"
  | "bedrock"
  | "vertex"
  | "openai"
  | "fireworks"
  | "together"
  | "deepinfra"
  | "openrouter";

export type ModelTier = "strategic" | "management" | "worker" | "fast";

export type TaskType =
  | "strategic_planning"
  | "financial_analysis"
  | "executive_summary"
  | "risk_assessment"
  | "approval_decision"
  | "cash_flow_forecast"
  | "payroll_calculation"
  | "compliance_check"
  | "reconciliation_review"
  | "invoice_matching"
  | "payment_scheduling"
  | "journal_posting"
  | "cash_reconciliation"
  | "tax_calculation"
  | "filing_preparation"
  | "report_generation"
  | "ocr_field_extraction"
  | "document_classification"
  | "structured_extraction"
  | "budget_variance_analysis"
  | "anomaly_detection"
  | "chat_response"
  | "summarization"
  | "translation";

// ─── Call Model Parameters ────────────────────────────────────────────

export type ModelMessageContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; mediaType: string; data: string };

export interface CallModelParams {
  agentName: string;
  taskType: TaskType;
  entityId: string;
  systemPrompt: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string | ModelMessageContentBlock[];
  }>;
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
  /**
   * Force the model to call a specific tool (or free-run when omitted).
   * `{ type: "tool", name }` maps to Anthropic's `tool_choice: { type: "tool" }`
   * and OpenAI's `tool_choice: { type: "function", function: { name } }`.
   */
  toolChoice?: { type: "tool"; name: string };
  fallbackAllowed?: boolean;
  maxTokens?: number;
  temperature?: number;
  traceId?: string;
}

// ─── Model Assignment (from DB) ───────────────────────────────────────

export interface ModelAssignmentRecord {
  id: string;
  agentName: string;
  taskType: string;
  liveModelId: string;
  liveProvider: ProviderId;
  fallbackModelId: string | null;
  fallbackProvider: ProviderId | null;
  trafficSplit: Record<string, number> | null;
  evaluationGate: string | null;
}

// ─── Provider Route ──────────────────────────────────────────────────

export interface ProviderRoute {
  provider: ProviderId;
  model: string;
  priority: number;
}

// ─── Provider Adapter Interface ──────────────────────────────────────

export interface ProviderAdapter {
  providerId: ProviderId;

  complete(params: {
    model: string;
    systemPrompt: string;
    messages: Array<{
      role: "user" | "assistant" | "system";
      content: string | ModelMessageContentBlock[];
    }>;
    tools?: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>;
    toolChoice?: { type: "tool"; name: string };
    maxTokens?: number;
    temperature?: number;
  }): Promise<NormalizedModelResponse>;

  stream?(params: {
    model: string;
    systemPrompt: string;
    messages: Array<{
      role: "user" | "assistant" | "system";
      content: string | ModelMessageContentBlock[];
    }>;
    tools?: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>;
    toolChoice?: { type: "tool"; name: string };
    maxTokens?: number;
    temperature?: number;
    onToken: (token: string) => void;
    onToolCall: (toolCall: NormalizedToolCall) => void;
  }): Promise<NormalizedModelResponse>;
}

// ─── Route Health (for load balancing) ───────────────────────────────

export interface RouteHealth {
  routeId: string;
  provider: ProviderId;
  model: string;
  isHealthy: boolean;
  lastErrorAt: number | null;
  consecutiveErrors: number;
  avgLatencyMs: number;
  errorRate: number;
  rateLimitRemaining: number;
  rateLimitResetAt: number | null;
}

// ─── Model Registry Entry ────────────────────────────────────────────

export interface ModelRegistryEntry {
  modelId: string;
  displayName: string;
  provider: ProviderId;
  capabilities: {
    supportsTools: boolean;
    supportsVision: boolean;
    supportsStreaming: boolean;
    maxContextTokens: number;
    maxOutputTokens: number;
  };
  costPerMillionInputTokens: string;
  costPerMillionOutputTokens: string;
  endpoints: string[];
}
