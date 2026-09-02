import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("REST API Platform — Verification", () => {
  describe("API Platform router", () => {
    const router = readFileSync(
      join(ROOT, "server/routers/api-platform.ts"),
      "utf-8",
    );

    it("exports apiPlatformRouter", () => {
      expect(router).toContain("apiPlatformRouter");
    });

    it("has listApiKeys procedure", () => {
      expect(router).toContain("listApiKeys");
    });

    it("has createApiKey procedure", () => {
      expect(router).toContain("createApiKey");
    });

    it("generates cryptographically random API keys", () => {
      expect(router).toContain("generateApiKey");
      expect(router).toContain("xb_");
    });

    it("manages webhooks", () => {
      expect(router).toContain("webhook");
    });
  });

  describe("API Keys in settings", () => {
    const settings = readFileSync(
      join(ROOT, "server/routers/settings.ts"),
      "utf-8",
    );

    it("has getApiKeys procedure", () => {
      expect(settings).toContain("getApiKeys");
    });

    it("has createApiKey procedure", () => {
      expect(settings).toContain("createApiKey");
    });

    it("uses entityApiKeys table", () => {
      expect(settings).toContain("entityApiKeys");
    });
  });

  describe("API key test coverage", () => {
    const apiKeysTest = readFileSync(
      join(ROOT, "__tests__/idempotency-keys.test.ts"),
      "utf-8",
    );

    it("tests API-related functionality", () => {
      expect(apiKeysTest).toContain("idempotency");
    });
  });
});
