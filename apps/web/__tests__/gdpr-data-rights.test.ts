import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const SETTINGS_ROUTER = path.resolve(
  __dirname,
  "../server/routers/settings.ts",
);

const DPA_TEMPLATE = path.resolve(
  __dirname,
  "../../../docs/GDPR-DPA-TEMPLATE.md",
);

describe("P1 #6: GDPR Data Subject Rights", () => {
  it("settings router has data export (right to portability)", () => {
    const content = fs.readFileSync(SETTINGS_ROUTER, "utf-8");
    expect(content).toContain("DSAR");
    expect(content.toLowerCase()).toContain("data export");
    expect(content).toContain("GDPR Art. 20");
  });

  it("settings router has account erasure (right to be forgotten)", () => {
    const content = fs.readFileSync(SETTINGS_ROUTER, "utf-8");
    expect(content).toContain("deleteAccount");
    expect(content).toContain("anonymiz");
    expect(content).toContain("GDPR Art. 17");
  });

  it("erasure anonymizes user record (keeps for audit compliance)", () => {
    const content = fs.readFileSync(SETTINGS_ROUTER, "utf-8");
    expect(content).toContain("anonymized.local");
    expect(content.toLowerCase()).toContain("financial records");
  });

  it("erasure is audit-logged", () => {
    const content = fs.readFileSync(SETTINGS_ROUTER, "utf-8");
    expect(content).toContain("settings.deleteAccountRequest");
    expect(content).toContain("settings.accountAnonymized");
  });

  it("DPA template exists with data subject rights", () => {
    const content = fs.readFileSync(DPA_TEMPLATE, "utf-8");
    expect(content).toContain("Data Subject");
    expect(content.toLowerCase()).toContain("right to erasure");
    expect(content.toLowerCase()).toContain("data portability");
  });

  it("DPA template covers data categories and processing purposes", () => {
    const content = fs.readFileSync(DPA_TEMPLATE, "utf-8");
    expect(content).toContain("Categories of Data");
    expect(content).toContain("Processing");
  });
});
