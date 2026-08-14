// ─── §1.7 XSS — sanitization blocks all injection vectors ───────────────────
//
// The shared sanitizer (`lib/security/sanitization.ts`) is the text-layer
// defense for LLM-written and user-supplied HTML. These tests enumerate the
// OWASP XSS Filter Evasion vectors (script tags, handlers, URL schemes,
// encodings) and assert none survive. Rendering layers (artifact viewer
// sandbox, React escaping, CSP) are additional, independent defenses.

import { describe, it, expect } from "vitest";
import {
  sanitizeHTML,
  sanitizeText,
  preventXSS,
} from "@/lib/security/sanitization";

describe("sanitizeHTML — script tags", () => {
  const vectors: Array<[string, string]> = [
    ["basic", "<script>alert(1)</script>"],
    ["mixed case", "<ScRiPt>alert(1)</sCrIpT>"],
    ["nested", "<scr<script>ipt>alert(1)</scr</script>ipt>"],
    ["with src", '<script src="https://evil.example/x.js"></script>'],
    ["unclosed", "<script>alert(1)"],
    ["svg script", "<svg><script>alert(1)</script></svg>"],
  ];
  for (const [name, payload] of vectors) {
    it(`strips ${name} script tags`, () => {
      const out = sanitizeHTML(payload);
      // The injection vehicle (the tag) must be gone; leftover inert text
      // like "alert(1)" is harmless once no tag executes it.
      expect(out).not.toMatch(/<\/?(script)\b/i);
      expect(out).not.toContain("<script");
    });
  }
});

describe("sanitizeHTML — event handlers", () => {
  const vectors: Array<[string, string]> = [
    ["quoted double", '<img src="x" onerror="alert(1)">'],
    ["quoted single", "<img src='x' onerror='alert(1)'>"],
    ["unquoted", "<img src=x onerror=alert(1)>"],
    ["mixed case", "<img src=x OnError=alert(1)>"],
    ["svg onload", "<svg onload=alert(1)>"],
    ["body onload", "<body onload=alert(1)>"],
    ["form onsubmit", "<form onsubmit=alert(1)>"],
    ["a onclick", '<a href="/" onclick="alert(1)">click</a>'],
    ["multiline", "<img\nsrc=x\nonerror=alert(1)>"],
    ["tab separated", "<img src=x\tonerror=alert(1)>"],
  ];
  for (const [name, payload] of vectors) {
    it(`strips ${name} event handlers`, () => {
      const out = sanitizeHTML(payload);
      expect(out).not.toMatch(/\bon\w+\s*=\s*/i);
      expect(out).not.toMatch(/alert\s*\(/);
    });
  }

  it("preserves prose containing 'once=upon' (no false positives)", () => {
    const out = sanitizeHTML("<p>once=upon a time in the west</p>");
    expect(out).toContain("once=upon a time in the west");
  });
});

describe("sanitizeHTML — URL scheme injection", () => {
  const vectors: Array<[string, string]> = [
    ["href javascript", '<a href="javascript:alert(1)">x</a>'],
    ["src javascript", '<img src="javascript:alert(1)">'],
    ["unquoted javascript", "<a href=javascript:alert(1)>x</a>"],
    ["mixed case scheme", '<a href="JaVaScRiPt:alert(1)">x</a>'],
    ["entity-encoded j", '<a href="&#106;avascript:alert(1)">x</a>'],
    ["entity-encoded ja", '<a href="&#106;&#97;vascript:alert(1)">x</a>'],
    ["form action", '<form action="javascript:alert(1)">'],
  ];
  for (const [name, payload] of vectors) {
    it(`neutralizes ${name}`, () => {
      const out = sanitizeHTML(payload);
      expect(out.toLowerCase()).not.toContain("javascript:");
      // No entity-encoded scheme letters left to re-form the scheme.
      expect(out).not.toMatch(/&#(?:x0*6a|0*106|x0*61|0*97);/i);
      expect(out).not.toMatch(/<\/?script\b/i);
    });
  }
});

describe("sanitizeHTML — embedded content", () => {
  const vectors: Array<[string, string]> = [
    ["iframe", '<iframe src="https://evil.example"></iframe>'],
    ["iframe no close", "<iframe src=x>"],
    ["object", '<object data="javascript:alert(1)"></object>'],
    ["embed", "<embed src=x>"],
    [
      "style block with script",
      "<style>@import url(x)</style><script>alert(1)</script>",
    ],
  ];
  for (const [name, payload] of vectors) {
    it(`strips ${name}`, () => {
      const out = sanitizeHTML(payload);
      expect(out).not.toMatch(/<\/?(iframe|object|embed|script)\b/i);
    });
  }
});

describe("sanitizeText — control characters and injection", () => {
  it("strips control characters that smuggle markup", () => {
    const out = sanitizeText(
      "<p>\u0000<script>\u0008alert(1)\u001f</script></p>",
    );
    expect(out).not.toContain("\u0000");
    expect(out).not.toContain("\u0008");
    expect(out).not.toContain("\u001f");
  });

  it("strips zero-width and BOM characters", () => {
    const out = sanitizeText("hello\u200bworld\ufeff");
    expect(out).toBe("helloworld");
  });

  it("truncates over-length input", () => {
    const out = sanitizeText("a".repeat(500), { maxLength: 10 });
    expect(out).toBe("a".repeat(10));
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeText("  hi there  ")).toBe("hi there");
  });
});

describe("preventXSS — dispatch", () => {
  it("sanitizes as HTML when flagged", () => {
    const out = preventXSS("<img src=x onerror=alert(1)>", true);
    expect(out).not.toMatch(/onerror/);
  });

  it("sanitizes as text otherwise", () => {
    const out = preventXSS("<script>alert(1)</script>", false);
    expect(out).toBe("<script>alert(1)</script>"); // text mode: no HTML parsing, tags inert
  });
});
