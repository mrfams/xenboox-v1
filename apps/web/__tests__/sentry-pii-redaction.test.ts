import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist the capture variable so it's available in mock factories
const { capturedConfig } = vi.hoisted(() => {
  return { capturedConfig: { current: null as any } };
});

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn((config: any) => {
    capturedConfig.current = config;
  }),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((cb: any) => {
    const scope = {
      setTag: vi.fn(),
      setContext: vi.fn(),
      setUser: vi.fn(),
      setLevel: vi.fn(),
      setExtra: vi.fn(),
      addBreadcrumb: vi.fn(),
    };
    cb(scope);
    return scope;
  }),
  setUser: vi.fn(),
  setContext: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

describe("Sentry PII Redaction — beforeSend hook", () => {
  beforeEach(async () => {
    capturedConfig.current = null;
    vi.clearAllMocks();
    vi.resetModules();
    await import("../sentry.server.config");
  });

  it("beforeSend strips sensitive request headers", () => {
    const config = capturedConfig.current;
    expect(config).toBeDefined();
    expect(typeof config.beforeSend).toBe("function");

    const mockEvent: any = {
      request: {
        headers: {
          authorization: "Bearer secret-token-123",
          cookie: "session=abc123",
          "x-api-key": "sk-1234567890",
          "x-entity-id": "entity-001",
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0",
        },
      },
      extra: {
        password: "hunter2",
        secret: "my-secret",
        token: "jwt-token",
        apiKey: "sk-1234567890",
        safeData: "this should remain",
      },
    };

    const result = config.beforeSend(mockEvent);

    // Sensitive headers stripped
    expect(result.request.headers.authorization).toBeUndefined();
    expect(result.request.headers.cookie).toBeUndefined();
    expect(result.request.headers["x-api-key"]).toBeUndefined();
    expect(result.request.headers["x-entity-id"]).toBeUndefined();

    // Non-sensitive headers remain
    expect(result.request.headers["content-type"]).toBe("application/json");
    expect(result.request.headers["user-agent"]).toBe("Mozilla/5.0");

    // Sensitive extra stripped
    expect(result.extra.password).toBeUndefined();
    expect(result.extra.secret).toBeUndefined();
    expect(result.extra.token).toBeUndefined();
    expect(result.extra.apiKey).toBeUndefined();

    // Non-sensitive extra remains
    expect(result.extra.safeData).toBe("this should remain");
  });

  it("beforeSend handles events without request headers", () => {
    const config = capturedConfig.current;
    const mockEvent: any = {
      extra: { safeData: "keep" },
    };

    const result = config.beforeSend(mockEvent);
    expect(result).toBeDefined();
    expect(result.extra.safeData).toBe("keep");
  });

  it("beforeSend returns event (never drops errors)", () => {
    const config = capturedConfig.current;
    const mockEvent: any = {
      request: { headers: { authorization: "Bearer token" } },
    };

    const result = config.beforeSend(mockEvent);
    expect(result).toBeDefined();
    expect(result).toBe(mockEvent);
  });
});
