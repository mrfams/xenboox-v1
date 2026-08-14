// ─── §20.3 File upload validation — sanitize, extension↔MIME, magic bytes ──

import { describe, it, expect } from "vitest";
import {
  sanitizeFileName,
  getExtension,
  extensionMatchesMime,
  sniffMimeType,
  assertMimeMatches,
} from "@/lib/security/file-validation";

describe("sanitizeFileName", () => {
  it("strips path traversal and directories", () => {
    expect(sanitizeFileName("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(sanitizeFileName("..\\..\\windows\\evil.pdf")).toBe("evil.pdf");
    expect(sanitizeFileName("dir/invoice.pdf")).toBe("invoice.pdf");
  });

  it("strips control characters and dotfile prefixes", () => {
    expect(sanitizeFileName(".hidden.pdf")).toBe("hidden.pdf");
    expect(sanitizeFileName("invoice\u0000.pdf")).toBe("invoice.pdf");
  });

  it("rejects an unusable name", () => {
    expect(() => sanitizeFileName("...")).toThrow();
    expect(() => sanitizeFileName("\u0000")).toThrow();
  });
});

describe("extensionMatchesMime", () => {
  it("accepts consistent pairs", () => {
    expect(extensionMatchesMime("invoice.pdf", "application/pdf")).toBe(true);
    expect(extensionMatchesMime("photo.jpeg", "image/jpeg")).toBe(true);
    expect(extensionMatchesMime("data.csv", "text/csv")).toBe(true);
  });

  it("rejects extension↔MIME mismatches", () => {
    expect(extensionMatchesMime("invoice.html", "application/pdf")).toBe(false);
    expect(extensionMatchesMime("invoice.pdf", "text/html")).toBe(false);
  });

  it("rejects forbidden extensions even with a valid claimed MIME", () => {
    expect(extensionMatchesMime("invoice.svg", "image/svg+xml")).toBe(false);
    expect(extensionMatchesMime("malware.exe", "application/pdf")).toBe(false);
    expect(extensionMatchesMime("phish.html", "text/csv")).toBe(false);
  });

  it("rejects files without an extension", () => {
    expect(extensionMatchesMime("invoice", "application/pdf")).toBe(false);
  });

  it("is case-insensitive on the extension", () => {
    expect(extensionMatchesMime("INVOICE.PDF", "application/pdf")).toBe(true);
  });
});

describe("sniffMimeType / assertMimeMatches", () => {
  const bytes = (hex: string) =>
    new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));

  it("detects PDF magic bytes", () => {
    const pdf = bytes("255044462d312e37"); // %PDF-1.7
    expect(sniffMimeType(pdf)).toBe("application/pdf");
  });

  it("detects JPEG / PNG / ZIP (office) signatures", () => {
    expect(sniffMimeType(bytes("ffd8ffe000104a46"))).toBe("image/jpeg");
    expect(sniffMimeType(bytes("89504e470d0a1a0a0000"))).toBe("image/png");
    expect(sniffMimeType(bytes("504b0304140000000800"))).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("rejects HTML disguised as PDF", () => {
    const html = new TextEncoder().encode("<!DOCTYPE html><html>...");
    expect(sniffMimeType(html)).toBeNull();
    // HTML matches no allowed signature — rejected at sniff level, so the
    // assert fails with "could not be identified" before any mismatch path.
    expect(() => assertMimeMatches(html, "application/pdf")).toThrow(
      /could not be identified/,
    );
  });

  it("rejects HTML/SVG even when claimed as CSV", () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    expect(sniffMimeType(svg)).toBeNull();
    expect(() => assertMimeMatches(svg, "text/csv")).toThrow(
      /could not be identified/,
    );
  });

  it("accepts a real delimited CSV", () => {
    const csv = new TextEncoder().encode(
      "vendor,amount,currency\nAcme,1000,GMD\n",
    );
    expect(sniffMimeType(csv)).toBe("text/csv");
    expect(() => assertMimeMatches(csv, "text/csv")).not.toThrow();
  });

  it("accepts bytes matching the declared MIME", () => {
    const pdf = bytes("255044462d312e34"); // %PDF-1.4
    expect(() => assertMimeMatches(pdf, "application/pdf")).not.toThrow();
  });

  it("rejects empty/opaque content", () => {
    expect(sniffMimeType(new Uint8Array(0))).toBeNull();
    expect(() =>
      assertMimeMatches(new Uint8Array(0), "application/pdf"),
    ).toThrow(/could not be identified/);
  });
});
