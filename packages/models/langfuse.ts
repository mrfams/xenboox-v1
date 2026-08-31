import { Langfuse } from "langfuse";

let client: Langfuse | null = null;

function createNoOpLangfuse(): Langfuse {
  return {
    trace: async () => ({
      id: "noop",
      update: async () => {},
      span: async () => ({ id: "noop", update: async () => {} }),
      event: async () => {},
      generation: async () => ({ id: "noop", update: async () => {} }),
    }),
    span: async () => ({ id: "noop", update: async () => {} }),
    event: async () => {},
    flushAsync: async () => {},
    shutdownAsync: async () => {},
  } as unknown as Langfuse;
}

export function getLangfuse(): Langfuse {
  if (!client) {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;

    if (publicKey && secretKey) {
      client = new Langfuse({
        publicKey,
        secretKey,
        baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
      });
    } else {
      // Use console.warn here since logger may not be available in all contexts
      console.warn(
        "[langfuse] No LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY set — using no-op client",
      );
      client = createNoOpLangfuse();
    }
  }
  return client;
}

export const langfuse = getLangfuse();
