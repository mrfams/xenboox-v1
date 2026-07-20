import type { ProviderAdapter, ProviderId } from "../types";
import { AnthropicAdapter } from "./anthropic";
import { OpenAIAdapter } from "./openai";
import { BedrockAdapter } from "./bedrock";
import { VertexAdapter } from "./vertex";
import { OpenWeightAdapter } from "./openweight";

let providerAdapters: Map<ProviderId, ProviderAdapter> | null = null;

export function getProviderAdapters(): Map<ProviderId, ProviderAdapter> {
  if (providerAdapters) return providerAdapters;

  providerAdapters = new Map();

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      providerAdapters.set("anthropic", new AnthropicAdapter());
    }
  } catch {
    // Skip if not configured
  }

  try {
    if (process.env.OPENAI_API_KEY) {
      providerAdapters.set("openai", new OpenAIAdapter());
    }
  } catch {
    // Skip
  }

  try {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      providerAdapters.set("bedrock", new BedrockAdapter());
    }
  } catch {
    // Skip
  }

  try {
    if (process.env.GOOGLE_AI_API_KEY || process.env.VERTEX_API_KEY) {
      providerAdapters.set("vertex", new VertexAdapter());
    }
  } catch {
    // Skip
  }

  // Open-weight providers — check any of the available API keys
  const openWeightKeys = [
    "FIREWORKS_API_KEY",
    "TOGETHER_API_KEY",
    "DEEPINFRA_API_KEY",
    "OPENROUTER_API_KEY",
  ];
  const hasOpenWeightKey = openWeightKeys.some((k) => process.env[k]);
  if (hasOpenWeightKey) {
    // Register all that have API keys
    const providers: ProviderId[] = [
      "fireworks",
      "together",
      "deepinfra",
      "openrouter",
    ];
    for (const pid of providers) {
      providerAdapters.set(pid, new OpenWeightAdapter(pid));
    }
  }

  return providerAdapters;
}

export function getAdapter(provider: ProviderId): ProviderAdapter | undefined {
  return getProviderAdapters().get(provider);
}

export {
  AnthropicAdapter,
  OpenAIAdapter,
  BedrockAdapter,
  VertexAdapter,
  OpenWeightAdapter,
};
