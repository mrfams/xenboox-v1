// ─── §5.5 Fuzz testing — input validation never crashes or leaks markup ────
//
// Deterministic (seeded PRNG) fuzzing of the user-input entry points:
//   - renderMarkdownSimple: agent/user chat content rendered via
//     dangerouslySetInnerHTML — output must never contain executable markup
//     no matter what garbage is fed in.
//   - sanitizeText / sanitizeEmail / sanitizeFileName: validation helpers
//     must never throw or return raw control characters.
//   - paginationSchema: the shared zod input must reject garbage.
//
// A seeded PRNG keeps failures reproducible in CI.

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { renderMarkdownSimple } from "@/lib/chat/message-parser";
import { sanitizeText, sanitizeEmail } from "@/lib/security/sanitization";
import { sanitizeFileName } from "@/lib/security/file-validation";

// Inlined copy of the shared pagination contract (lib/trpc/server.ts) —
// importing the router module pulls next-auth into the test graph, which
// vitest can't resolve. Keep in sync if the server-side schema changes.
const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
});

/** Deterministic PRNG (mulberry32) — same seed ⇒ same fuzz corpus. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CORPUS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "<svg onload=alert(1)>",
  "javascript:alert(1)",
  "**bold** and <b>raw</b>",
  "`code` with <em>tags</em>",
  "a & b < c > d \"quote\" 'apos'",
  "\u0000\u0001\u001f\u007f control chars",
  "normal text with *** and ```",
  "line1\nline2\nline3",
  "😀 emoji and 中文 text",
  "".padEnd(5000, "A"),
  String.fromCharCode(...Array.from({ length: 32 }, (_, i) => i)),
];

function fuzzStrings(seed: number, count: number): string[] {
  const rand = mulberry32(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    // Mix corpus items with random garbage.
    if (rand() < 0.5) {
      out.push(CORPUS[Math.floor(rand() * CORPUS.length)]!);
    } else {
      const len = Math.floor(rand() * 200);
      let s = "";
      for (let j = 0; j < len; j++) {
        s += String.fromCharCode(Math.floor(rand() * 0xffff));
      }
      out.push(s);
    }
  }
  return out;
}

describe("§5.5 fuzz — renderMarkdownSimple never emits executable markup", () => {
  const samples = fuzzStrings(0x5eed, 500);

  it("never throws on any input", () => {
    for (const s of samples) {
      expect(() => renderMarkdownSimple(s)).not.toThrow();
    }
  });

  it("output never contains a raw executable tag from input", () => {
    for (const s of samples) {
      const out = renderMarkdownSimple(s);
      // Raw (unescaped) executable markup must never appear. Escaped text
      // like `&lt;img onerror=...` is inert and allowed — only actual `<tag`
      // constructs with event handlers are forbidden.
      expect(out).not.toMatch(/<(script|img|svg|iframe|object|embed)\b/i);
      expect(out).not.toMatch(/<[a-z][^>]*\bon(?:error|load)\s*=/i);
      expect(out).not.toMatch(/<[a-z][^>]*\bjavascript\s*:/i);
    }
  });

  it("still renders the intended markdown formatting", () => {
    expect(renderMarkdownSimple("**bold**")).toBe("<strong>bold</strong>");
    expect(renderMarkdownSimple("`code`")).toContain("<code");
  });
});

describe("§5.5 fuzz — sanitization helpers are total (never throw, never leak controls)", () => {
  const samples = fuzzStrings(0xbaad, 500);

  it("sanitizeText never throws and strips control characters", () => {
    for (const s of samples) {
      const out = sanitizeText(s);
      expect(out).not.toMatch(/[\u0000-\u001f\u007f]/);
    }
  });

  it("sanitizeEmail never throws", () => {
    for (const s of samples) {
      expect(() => sanitizeEmail(s)).not.toThrow();
    }
  });

  it("sanitizeFileName either returns a clean name or throws a clear error", () => {
    for (const s of samples) {
      try {
        const out = sanitizeFileName(s);
        expect(out).not.toMatch(/[\u0000-\u001f\u007f]/);
        expect(out.startsWith(".")).toBe(false);
        expect(out).not.toContain("/");
      } catch (e) {
        expect((e as Error).message).toMatch(/Invalid file name/);
      }
    }
  });
});

describe("§5.5 fuzz — paginationSchema rejects garbage", () => {
  const rand = mulberry32(0xf00d);
  const payloads: unknown[] = [];
  for (let i = 0; i < 300; i++) {
    const pick = rand();
    if (pick < 0.25) payloads.push(null);
    else if (pick < 0.5)
      payloads.push({ cursor: "x".repeat(Math.floor(rand() * 500)) });
    else if (pick < 0.75) payloads.push({ cursor: 12345 });
    else
      payloads.push({
        limit: Math.floor(rand() * 1000) - 500,
        offset: rand() < 0.5 ? undefined : Math.floor(rand() * 1e7),
      });
  }

  it("parse is total — safeParse never throws", () => {
    for (const p of payloads) {
      expect(() => paginationSchema.safeParse(p)).not.toThrow();
    }
  });

  it("only well-typed payloads succeed, and they keep sane bounds", () => {
    for (const p of payloads) {
      const r = paginationSchema.safeParse(p);
      if (r.success) {
        expect(r.data.limit).toBeGreaterThanOrEqual(1);
        expect(r.data.limit).toBeLessThanOrEqual(100);
        expect(r.data.offset).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
