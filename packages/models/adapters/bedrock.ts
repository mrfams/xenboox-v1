import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type {
  ProviderAdapter,
  NormalizedModelResponse,
  NormalizedToolCall,
  ProviderId,
  ModelMessageContentBlock,
} from "../types";

// Maps our normalized content (string or blocks) to Anthropic's content format
// (Bedrock uses the Anthropic Messages API shape for Claude models).
function toAnthropicContent(
  content: string | ModelMessageContentBlock[],
): string | Array<{ type: string; text?: string; source?: unknown }> {
  if (typeof content === "string") return content;
  return content.map((block) => {
    if (block.type === "text") {
      return { type: "text", text: block.text };
    }
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: block.mediaType,
        data: block.data,
      },
    };
  });
}

// Maps our normalized tools to Anthropic's tool format for Bedrock.
function toAnthropicTools(
  tools:
    | Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
      }>
    | undefined,
):
  | Array<{
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
    }>
  | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}

// Maps our normalized toolChoice to Anthropic's tool_choice format.
function toAnthropicToolChoice(
  toolChoice: { type: "tool"; name: string } | undefined,
): { type: "auto" } | { type: "tool"; name: string } | undefined {
  if (!toolChoice) return undefined;
  return { type: "tool", name: toolChoice.name };
}

interface ParsedBedrockResponse {
  content: string;
  toolCalls: NormalizedToolCall[];
  inputTokens: number;
  outputTokens: number;
}

function parseBedrockResponse(raw: string): ParsedBedrockResponse {
  const parsed = JSON.parse(raw);
  let content = "";
  const toolCalls: NormalizedToolCall[] = [];

  for (const block of parsed.content ?? []) {
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
    inputTokens: parsed.usage?.input_tokens ?? 0,
    outputTokens: parsed.usage?.output_tokens ?? 0,
  };
}

interface BedrockModelConfig {
  accept: string;
  contentType: string;
  requestBuilder: (params: {
    systemPrompt: string;
    messages: Array<{
      role: string;
      content:
        | string
        | Array<{ type: string; text?: string; source?: unknown }>;
    }>;
    tools?: Array<{
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
    }>;
    toolChoice?: { type: "auto" } | { type: "tool"; name: string };
    maxTokens?: number;
    temperature?: number;
  }) => string;
  responseParser: (raw: string) => ParsedBedrockResponse;
}

const MODEL_CONFIGS: Record<string, BedrockModelConfig> = {
  "claude-sonnet-4-6": claudeConfig(),
  "claude-haiku-4-5": claudeConfig(),
  "claude-3-haiku": claudeConfig(),
  "claude-3-sonnet": claudeConfig(),
  "claude-3-opus": claudeConfig(),
};

function claudeConfig(): BedrockModelConfig {
  return {
    accept: "application/json",
    contentType: "application/json",
    requestBuilder: ({
      systemPrompt,
      messages,
      tools,
      toolChoice,
      maxTokens,
      temperature,
    }) => {
      const body: Record<string, unknown> = {
        anthropic_version: "bedrock-2023-05-31",
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: maxTokens ?? 4096,
        temperature: temperature ?? 0.1,
      };
      if (tools && tools.length > 0) {
        body.tools = tools;
      }
      if (toolChoice) {
        body.tool_choice = toolChoice;
      }
      return JSON.stringify(body);
    },
    responseParser: parseBedrockResponse,
  };
}

export class BedrockAdapter implements ProviderAdapter {
  readonly providerId: ProviderId = "bedrock";
  private client: BedrockRuntimeClient;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });
  }

  async complete(params: {
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
  }): Promise<NormalizedModelResponse> {
    const startTime = Date.now();
    const config = this.getConfig(params.model);
    const body = config.requestBuilder({
      systemPrompt: params.systemPrompt,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: toAnthropicContent(m.content),
      })),
      tools: toAnthropicTools(params.tools),
      toolChoice: toAnthropicToolChoice(params.toolChoice),
      maxTokens: params.maxTokens,
      temperature: params.temperature,
    });

    const command = new InvokeModelCommand({
      modelId: params.model,
      contentType: config.contentType,
      accept: config.accept,
      body: new Uint8Array(Buffer.from(body)),
    });

    const response = await this.client.send(command);
    const raw = new TextDecoder().decode(response.body);
    const parsed = config.responseParser(raw);
    const latencyMs = Date.now() - startTime;

    return {
      content: parsed.content,
      toolCalls: parsed.toolCalls,
      confidence: parsed.toolCalls.length > 0 ? 0.95 : 0.9,
      tokensUsed: {
        input: parsed.inputTokens,
        output: parsed.outputTokens,
        total: parsed.inputTokens + parsed.outputTokens,
      },
      latencyMs,
      modelId: params.model,
      providerId: this.providerId,
    };
  }

  async stream(params: {
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
  }): Promise<NormalizedModelResponse> {
    const startTime = Date.now();
    const config = this.getConfig(params.model);
    const body = config.requestBuilder({
      systemPrompt: params.systemPrompt,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: toAnthropicContent(m.content),
      })),
      tools: toAnthropicTools(params.tools),
      toolChoice: toAnthropicToolChoice(params.toolChoice),
      maxTokens: params.maxTokens,
      temperature: params.temperature,
    });

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: params.model,
      contentType: config.contentType,
      accept: config.accept,
      body: new Uint8Array(Buffer.from(body)),
    });

    const response = await this.client.send(command);
    let fullContent = "";
    const toolCalls: NormalizedToolCall[] = [];

    for await (const chunk of response.body ?? []) {
      if (chunk.chunk?.bytes) {
        const decoded = new TextDecoder().decode(chunk.chunk.bytes);
        const parsed = JSON.parse(decoded);

        // Text content
        if (
          parsed.type === "content_block_delta" &&
          parsed.delta?.type === "text_delta"
        ) {
          fullContent += parsed.delta.text;
          params.onToken(parsed.delta.text);
        }

        // Tool use start
        if (
          parsed.type === "content_block_start" &&
          parsed.content_block?.type === "tool_use"
        ) {
          const toolCall: NormalizedToolCall = {
            id: parsed.content_block.id,
            name: parsed.content_block.name,
            arguments: {},
          };
          toolCalls.push(toolCall);
          params.onToolCall(toolCall);
        }

        // Tool use input delta
        if (
          parsed.type === "content_block_delta" &&
          parsed.delta?.type === "input_json_delta"
        ) {
          const lastTool = toolCalls[toolCalls.length - 1];
          if (lastTool) {
            try {
              lastTool.arguments = JSON.parse(parsed.delta.partial_json);
            } catch {
              // Partial JSON — accumulate, will parse on next delta
            }
          }
        }
      }
    }

    const latencyMs = Date.now() - startTime;
    return {
      content: fullContent,
      toolCalls,
      confidence: toolCalls.length > 0 ? 0.95 : 1.0,
      tokensUsed: { input: 0, output: 0, total: 0 },
      latencyMs,
      modelId: params.model,
      providerId: this.providerId,
    };
  }

  private getConfig(model: string): BedrockModelConfig {
    const config = MODEL_CONFIGS[model];
    if (!config) {
      return claudeConfig();
    }
    return config;
  }
}
