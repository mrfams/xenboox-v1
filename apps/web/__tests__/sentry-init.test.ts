import { describe, it, expect, vi, beforeEach } from "vitest";

// Track what gets passed to Sentry.init
const initCalls: any[] = [];
const prismaIntegrationCalls: any[] = [];

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn((config: any) => {
    initCalls.push(config);
  }),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((cb: any) => {
    const scope = {
      setTag: vi.fn(),
      setContext: vi.fn(),
      setUser: vi.fn(),
      setLevel: vi.fn(),
      addBreadcrumb: vi.fn(),
    };
    cb(scope);
    return scope;
  }),
  setUser: vi.fn(),
  setContext: vi.fn(),
  addBreadcrumb: vi.fn(),
  prismaIntegration: vi.fn((...args: any[]) => {
    prismaIntegrationCalls.push(args);
    return { name: "PrismaIntegration" };
  }),
  browserTracingIntegration: vi.fn(() => ({ name: "BrowserTracing" })),
  captureRequestError: vi.fn(),
}));

describe("Sentry Configuration", () => {
  beforeEach(() => {
    initCalls.length = 0;
    prismaIntegrationCalls.length = 0;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("sentry.server.config.ts initializes Sentry", async () => {
    await import("../sentry.server.config");
    expect(initCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("sentry.server.config.ts does NOT use prismaIntegration", async () => {
    await import("../sentry.server.config");
    // prismaIntegration should never be called — we use Drizzle
    expect(prismaIntegrationCalls.length).toBe(0);
  });

  it("sentry.server.config.ts sets environment", async () => {
    await import("../sentry.server.config");
    const config = initCalls[initCalls.length - 1];
    expect(config).toBeDefined();
    expect(config.environment).toBeDefined();
  });

  it("sentry.server.config.ts has tracesSampleRate", async () => {
    await import("../sentry.server.config");
    const config = initCalls[initCalls.length - 1];
    expect(typeof config.tracesSampleRate).toBe("number");
  });

  it("sentry.client.config.ts initializes Sentry", async () => {
    await import("../sentry.client.config");
    expect(initCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("sentry.client.config.ts has browserTracingIntegration", async () => {
    await import("../sentry.client.config");
    const config = initCalls[initCalls.length - 1];
    expect(config.integrations).toBeDefined();
    expect(config.integrations.length).toBeGreaterThan(0);
  });

  it("sentry.client.config.ts has replaysSessionSampleRate", async () => {
    await import("../sentry.client.config");
    const config = initCalls[initCalls.length - 1];
    expect(typeof config.replaysSessionSampleRate).toBe("number");
  });

  it("sentry.client.config.ts has replaysOnErrorSampleRate", async () => {
    await import("../sentry.client.config");
    const config = initCalls[initCalls.length - 1];
    expect(typeof config.replaysOnErrorSampleRate).toBe("number");
  });

  it("sentry.edge.config.ts initializes Sentry", async () => {
    await import("../sentry.edge.config");
    expect(initCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("sentry.edge.config.ts sets environment", async () => {
    await import("../sentry.edge.config");
    const config = initCalls[initCalls.length - 1];
    expect(config).toBeDefined();
    expect(config.environment).toBeDefined();
  });
});
