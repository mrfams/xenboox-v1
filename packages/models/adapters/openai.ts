import OpenAI from "openai";
import type {
  ProviderAdapter,
  NormalizedModelResponse,
  NormalizedToolCall,
  ProviderId,
  ModelMessageContentBlock,
} from "../types";

// Maps our normalized content (string or blocks) to OpenAI's chat content format.
function toOpenAIContent(
  content: string | ModelMessageContentBlock[],
):
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > {
  if (typeof content === "string") return content;
  return content.map((block) => {
    if (block.type === "text") {
      return { type: "text", text: block.text };
    }
    return {
      type: "image_url",
      image_url: {
        url: `data:${block.mediaType};base64,${block.data}`,
      },
    };
  });
}

export class OpenAIAdapter implements ProviderAdapter {
  readonly providerId: ProviderId = "openai";
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey });
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

    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        ...params.messages.map(
          (m) =>
            ({
              role: m.role as "user" | "assistant" | "system",
              content: toOpenAIContent(m.content),
            }) as OpenAI.Chat.ChatCompletionMessageParam,
        ),
      ],
      tools: params.tools?.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema as Record<string, unknown>,
        },
      })),
      tool_choice: params.toolChoice
        ? ({
            type: "function",
            function: { name: params.toolChoice.name },
          } as const)
        : undefined,
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

    // OpenAI stopped_reason: stop, length, tool_calls, content_filter, function_call
    const finishReason = choice?.finish_reason ?? "stop";
    const confidence =
      finishReason === "stop"
        ? 1.0
        : finishReason === "tool_calls"
          ? 0.95
          : 0.7;

    return {
      content,
      toolCalls,
      confidence,
      tokensUsed: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
        total: response.usage?.total_tokens ?? 0,
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
    let fullContent = "";
    const toolCalls: NormalizedToolCall[] = [];

    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        ...params.messages.map(
          (m) =>
            ({
              role: m.role as "user" | "assistant" | "system",
              content: toOpenAIContent(m.content),
            }) as OpenAI.Chat.ChatCompletionMessageParam,
        ),
      ],
      tools: params.tools?.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema as Record<string, unknown>,
        },
      })),
      tool_choice: params.toolChoice
        ? ({
            type: "function",
            function: { name: params.toolChoice.name },
          } as const)
        : undefined,
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
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.function?.name && tc.id) {
            const existingCall = toolCalls.find((c) => c.id === tc.id);
            if (!existingCall) {
              const newCall: NormalizedToolCall = {
                id: tc.id,
                name: tc.function.name,
                arguments: tc.function.arguments
                  ? JSON.parse(tc.function.arguments)
                  : {},
              };
              toolCalls.push(newCall);
              params.onToolCall(newCall);
            }
          }
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
