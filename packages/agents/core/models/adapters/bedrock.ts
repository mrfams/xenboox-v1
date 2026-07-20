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
} from "../types";

interface BedrockModelConfig {
  accept: string;
  contentType: string;
  requestBuilder: (params: {
    systemPrompt: string;
    messages: Array<{ role: string; content: string }>;
    maxTokens?: number;
    temperature?: number;
  }) => string;
  responseParser: (raw: string) => {
    content: string;
    inputTokens: number;
    outputTokens: number;
  };
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
    requestBuilder: ({ systemPrompt, messages, maxTokens, temperature }) =>
      JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: maxTokens ?? 4096,
        temperature: temperature ?? 0.1,
      }),
    responseParser: (raw: string) => {
      const parsed = JSON.parse(raw);
      const content =
        parsed.content?.map((c: { text?: string }) => c.text).join("") ?? "";
      return {
        content,
        inputTokens: parsed.usage?.input_tokens ?? 0,
        outputTokens: parsed.usage?.output_tokens ?? 0,
      };
    },
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
    const config = this.getConfig(params.model);
    const body = config.requestBuilder({
      systemPrompt: params.systemPrompt,
      messages: params.messages,
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
      toolCalls: [],
      confidence: 0.9,
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
    const config = this.getConfig(params.model);
    const body = config.requestBuilder({
      systemPrompt: params.systemPrompt,
      messages: params.messages,
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

    for await (const chunk of response.body ?? []) {
      if (chunk.chunk?.bytes) {
        const decoded = new TextDecoder().decode(chunk.chunk.bytes);
        const parsed = JSON.parse(decoded);
        if (
          parsed.type === "content_block_delta" &&
          parsed.delta?.type === "text_delta"
        ) {
          fullContent += parsed.delta.text;
          params.onToken(parsed.delta.text);
        }
      }
    }

    const latencyMs = Date.now() - startTime;
    return {
      content: fullContent,
      toolCalls: [],
      confidence: 1.0,
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
