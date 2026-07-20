import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ProviderAdapter,
  NormalizedModelResponse,
  NormalizedToolCall,
  ProviderId,
} from "../types";

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
    const model = this.client.getGenerativeModel({
      model: params.model,
      systemInstruction: params.systemPrompt,
      generationConfig: {
        maxOutputTokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.1,
      },
    });

    // Map messages to Gemini format (system messages become user)
    const geminiMessages = params.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const result = await model.generateContent({ contents: geminiMessages });
    const response = result.response;
    const latencyMs = Date.now() - startTime;
    const text = response.text();

    return {
      content: text,
      toolCalls: [],
      confidence: 0.9,
      tokensUsed: {
        input: response.usageMetadata?.promptTokenCount ?? 0,
        output: response.usageMetadata?.candidatesTokenCount ?? 0,
        total: response.usageMetadata?.totalTokenCount ?? 0,
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
    const model = this.client.getGenerativeModel({
      model: params.model,
      systemInstruction: params.systemPrompt,
      generationConfig: {
        maxOutputTokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.1,
      },
    });

    const geminiMessages = params.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const result = await model.generateContentStream({
      contents: geminiMessages,
    });
    let fullContent = "";

    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullContent += text;
      params.onToken(text);
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
}
