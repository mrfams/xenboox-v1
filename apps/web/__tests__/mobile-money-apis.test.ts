import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("Mobile Money APIs — Verification", () => {
  describe("Mobile money router", () => {
    const router = readFileSync(
      join(ROOT, "server/routers/mobileMoney.ts"),
      "utf-8",
    );

    it("exports mobileMoneyRouter", () => {
      expect(router).toContain("mobileMoneyRouter");
    });

    it("queries mobileMoneyAccounts", () => {
      expect(router).toContain("mobileMoneyAccounts");
    });

    it("supports Wave provider", () => {
      expect(router).toContain("wave");
    });

    it("supports MTN MoMo provider", () => {
      expect(router).toContain("mpesa");
    });

    it("has permission-gated creation", () => {
      expect(router).toContain("requirePermission");
    });
  });

  describe("Mobile money accounts in bills", () => {
    const bills = readFileSync(join(ROOT, "server/routers/bills.ts"), "utf-8");

    it("includes mobile money in cash position", () => {
      expect(bills).toContain("mobileMoneyAccounts");
    });
  });

  describe("Mobile money in integrations", () => {
    const integrations = readFileSync(
      join(ROOT, "server/routers/integrations.ts"),
      "utf-8",
    );

    it("detects Wave provider", () => {
      expect(integrations).toContain("Wave");
    });

    it("detects MTN MoMo provider", () => {
      expect(integrations).toContain("MTN MoMo");
    });

    it("detects Orange Money provider", () => {
      expect(integrations).toContain("Orange Money");
    });
  });

  describe("Mobile money in payment methods", () => {
    const paymentLinks = readFileSync(
      join(ROOT, "server/routers/payment-links.ts"),
      "utf-8",
    );

    it("includes mobile_money as payment method", () => {
      expect(paymentLinks).toContain("mobile_money");
    });
  });
});
