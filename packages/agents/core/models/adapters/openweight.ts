import OpenAI from "openai";
import type {
  ProviderAdapter,
  NormalizedModelResponse,
  NormalizedToolCall,
  ProviderId,
} from "../types";

interface OpenWeightProviderConfig {
  providerId: ProviderId;
  baseUrl: string;
  apiKeyEnvVar: string;
}

const PROVIDER_CONFIGS: OpenWeightProviderConfig[] = [
  {
    providerId: "fireworks",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    apiKeyEnvVar: "FIREWORKS_API_KEY",
  },
  {
    providerId: "together",
    baseUrl: "https://api.together.xyz/v1",
    apiKeyEnvVar: "TOGETHER_API_KEY",
  },
  {
    providerId: "deepinfra",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    apiKeyEnvVar: "DEEPINFRA_API_KEY",
  },
  {
    providerId: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
  },
];

/**
 * Single adapter that serves Fireworks, Together, DeepInfra, OpenRouter, etc.
 * All are OpenAI-compatible, so they share the same request/response format.
 * Adding a new open-weight provider = adding a config entry, not new code.
 */
export class OpenWeightAdapter implements ProviderAdapter {
  readonly providerId: ProviderId;
  private clients: Map<ProviderId, OpenAI> = new Map();
  private modelCache: Map<string, string> = new Map(); // model -> best provider

  constructor(providerId?: ProviderId) {
    // If no specific provider, default to fireworks
    this.providerId = providerId ?? "fireworks";

    // Initialize all available providers
    for (const config of PROVIDER_CONFIGS) {
      const apiKey = process.env[config.apiKeyEnvVar];
      if (apiKey) {
        this.clients.set(
          config.providerId,
          new OpenAI({
            apiKey,
            baseURL: config.baseUrl,
          }),
        );
      }
    }
  }

  async complete(params: {
    model: string;
    systemPrompt: string;
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    tools?: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<NormalizedModelResponse> {
    const startTime = Date.now();

    const client = this.getBestClient(params.model);
    if (!client) {
      throw new Error(
        `No open-weight provider available for model ${params.model}`,
      );
    }

    const response = await client.chat.completions.create({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        ...params.messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ],
      tools: params.tools?.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema as Record<string, unknown>,
        },
      })),
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.1,
    });

    const latencyMs = Date.now() - startTime;
    const choice = response.choices[0];
    const message = choice?.message;
    const content = message?.content ?? "";

    const toolCalls: NormalizedToolCall[] =
      message?.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      })) ?? [];

    return {
      content,
      toolCalls,
      confidence: choice?.finish_reason === "stop" ? 1.0 : 0.85,
      tokensUsed: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
        total: response.usage?.total_tokens ?? 0,
      },
      latencyMs,
      modelId: params.model,
      providerId: this.getProviderIdForClient(client),
    };
  }

  async stream(params: {
    model: string;
    systemPrompt: string;
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    tools?: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>;
    maxTokens?: number;
    temperature?: number;
    onToken: (token: string) => void;
    onToolCall: (toolCall: NormalizedToolCall) => void;
  }): Promise<NormalizedModelResponse> {
    const startTime = Date.now();
    let fullContent = "";
    const toolCalls: NormalizedToolCall[] = [];

    const client = this.getBestClient(params.model);
    if (!client) {
      throw new Error(
        `No open-weight provider available for model ${params.model}`,
      );
    }

    const stream = await client.chat.completions.create({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        ...params.messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ],
      tools: params.tools?.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema as Record<string, unknown>,
        },
      })),
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.1,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        fullContent += delta.content;
        params.onToken(delta.content);
      }
    }

    const latencyMs = Date.now() - startTime;

    return {
      content: fullContent,
      toolCalls,
      confidence: 1.0,
      tokensUsed: { input: 0, output: 0, total: 0 },
      latencyMs,
      modelId: params.model,
      providerId: this.getProviderIdForClient(client),
    };
  }

  /** Returns the provider ID for a given client instance */
  private getProviderIdForClient(client: OpenAI): ProviderId {
    for (const [pid, c] of this.clients) {
      if (c === client) return pid;
    }
    return this.providerId;
  }

  /** Get the best available client for a model, preferring */
  private getBestClient(model: string): OpenAI | undefined {
    // Check cache first
    const cachedPid = this.modelCache.get(model);
    if (cachedPid) {
      const cached = this.clients.get(cachedPid as ProviderId);
      if (cached) return cached;
    }

    // Try specific provider first
    const specific = this.clients.get(this.providerId);
    if (specific) {
      this.modelCache.set(model, this.providerId);
      return specific;
    }

    // Fall back to any available provider
    for (const [pid, client] of this.clients) {
      this.modelCache.set(model, pid);
      return client;
    }

    return undefined;
  }
}
