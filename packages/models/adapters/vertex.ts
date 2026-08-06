import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ProviderAdapter,
  NormalizedModelResponse,
  NormalizedToolCall,
  ProviderId,
  ModelMessageContentBlock,
} from "../types";

// Maps our normalized content (string or blocks) to Gemini part arrays.
function toGeminiParts(
  content: string | ModelMessageContentBlock[],
): { text?: string; inlineData?: { mimeType: string; data: string } }[] {
  if (typeof content === "string") {
    return [{ text: content }];
  }
  return content.map((block) => {
    if (block.type === "text") {
      return { text: block.text };
    }
    return {
      inlineData: {
        mimeType: block.mediaType,
        data: block.data,
      },
    };
  });
}

// Maps our normalized tools to Gemini's functionDeclarations format.
function toGeminiTools(
  tools:
    | Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
      }>
    | undefined,
):
  | Array<{
      functionDeclarations: Array<{
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      }>;
    }>
  | undefined {
  if (!tools || tools.length === 0) return undefined;
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      })),
    },
  ];
}

// Maps our normalized toolChoice to Gemini's toolConfig format.
function toGeminiToolConfig(
  toolChoice: { type: "tool"; name: string } | undefined,
):
  | { functionCallingConfig: { mode: string; allowedFunctionNames?: string[] } }
  | undefined {
  if (!toolChoice) return undefined;
  return {
    functionCallingConfig: {
      mode: "ANY",
      allowedFunctionNames: [toolChoice.name],
    },
  };
}

export class VertexAdapter implements ProviderAdapter {
  readonly providerId: ProviderId = "vertex";
  private client: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY ?? process.env.VERTEX_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY or VERTEX_API_KEY is not set");
    }
    this.client = new GoogleGenerativeAI(apiKey);
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
    const model = this.client.getGenerativeModel({
      model: params.model,
      systemInstruction: params.systemPrompt,
      generationConfig: {
        maxOutputTokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.1,
      },
      tools: toGeminiTools(params.tools) as never,
      toolConfig: toGeminiToolConfig(params.toolChoice) as never,
    });

    // Map messages to Gemini format (system messages become user)
    const geminiMessages = params.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: toGeminiParts(m.content),
      }));

    const result = await model.generateContent({
      contents: geminiMessages as never,
    });
    const response = result.response;
    const latencyMs = Date.now() - startTime;

    // Parse text content
    const text = response.text();

    // Parse function calls from response
    const functionCalls = response.functionCalls() ?? [];
    const toolCalls: NormalizedToolCall[] = functionCalls.map((fc) => ({
      id: `vertex-${fc.name}-${Date.now()}`,
      name: fc.name,
      arguments: (fc.args as Record<string, unknown>) ?? {},
    }));

    return {
      content: text,
      toolCalls,
      confidence: toolCalls.length > 0 ? 0.95 : 0.9,
      tokensUsed: {
        input: response.usageMetadata?.promptTokenCount ?? 0,
        output: response.usageMetadata?.candidatesTokenCount ?? 0,
        total:
          (response.usageMetadata?.promptTokenCount ?? 0) +
          (response.usageMetadata?.candidatesTokenCount ?? 0),
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
    const model = this.client.getGenerativeModel({
      model: params.model,
      systemInstruction: params.systemPrompt,
      generationConfig: {
        maxOutputTokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.1,
      },
      tools: toGeminiTools(params.tools) as never,
      toolConfig: toGeminiToolConfig(params.toolChoice) as never,
    });

    const geminiMessages = params.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: toGeminiParts(m.content),
      }));

    const result = await model.generateContentStream({
      contents: geminiMessages as never,
    });
    let fullContent = "";
    const toolCalls: NormalizedToolCall[] = [];

    for await (const chunk of result.stream) {
      // Text content
      const text = chunk.text();
      if (text) {
        fullContent += text;
        params.onToken(text);
      }

      // Function calls in chunk
      const functionCalls = chunk.functionCalls() ?? [];
      for (const fc of functionCalls) {
        const toolCall: NormalizedToolCall = {
          id: `vertex-${fc.name}-${Date.now()}`,
          name: fc.name,
          arguments: (fc.args as Record<string, unknown>) ?? {},
        };
        toolCalls.push(toolCall);
        params.onToolCall(toolCall);
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
}
