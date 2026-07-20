import Anthropic from "@anthropic-ai/sdk";
import type {
  ProviderAdapter,
  NormalizedModelResponse,
  NormalizedToolCall,
  ProviderId,
} from "../types";

export class AnthropicAdapter implements ProviderAdapter {
  readonly providerId: ProviderId = "anthropic";
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    this.client = new Anthropic({ apiKey });
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

    const response = await this.client.messages.create({
      model: params.model,
      system: params.systemPrompt
        ? [{ type: "text", text: params.systemPrompt }]
        : undefined,
      messages: params.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      tools: params.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Messages.Tool.InputSchema,
      })),
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.1,
    });

    const latencyMs = Date.now() - startTime;

    const toolCalls: NormalizedToolCall[] = [];
    let content = "";

    for (const block of response.content) {
      if (block.type === "text") {
        content += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      content,
      toolCalls,
      confidence: response.stop_reason === "end_turn" ? 1.0 : 0.8,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      },
      latencyMs,
      modelId: response.model,
      providerId: this.providerId,
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

    const stream = await this.client.messages.create({
      model: params.model,
      system: params.systemPrompt
        ? [{ type: "text", text: params.systemPrompt }]
        : undefined,
      messages: params.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      tools: params.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Messages.Tool.InputSchema,
      })),
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.1,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          fullContent += event.delta.text;
          params.onToken(event.delta.text);
        }
      } else if (event.type === "content_block_start") {
        if (event.content_block.type === "tool_use") {
          const toolCall: NormalizedToolCall = {
            id: event.content_block.id,
            name: event.content_block.name,
            arguments: {},
          };
          toolCalls.push(toolCall);
          params.onToolCall(toolCall);
        }
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
      providerId: this.providerId,
    };
  }
}
