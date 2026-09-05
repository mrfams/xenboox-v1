import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

// Vitest runs with cwd = apps/web. Resolve robustly whether cwd is the app
// dir or the repo root.
const REPO = join(process.cwd(), "..");
const root = existsSync(join(process.cwd(), "app"))
  ? process.cwd()
  : existsSync(join(REPO, "apps/web/app"))
    ? join(REPO, "apps/web")
    : process.cwd();

function read(rel: string): string {
  const p = join(root, rel);
  if (!existsSync(p)) throw new Error(`Missing file for UX check: ${rel}`);
  return readFileSync(p, "utf-8");
}

describe("Phase A — AskDrawer contract", () => {
  it("exists with page+focus context, Thought, and follow-ups", () => {
    const src = read("components/chat/ask-drawer.tsx");
    expect(src).toMatch(/PageContextPayload/);
    expect(src).toMatch(/focus/);
    expect(src).toMatch(/ThinkingReveal/);
    expect(src).toMatch(/Ask a follow-up/);
    expect(src).toMatch(/conversationId/);
  });

  it("exports the shared AskFn entrypoint", () => {
    const src = read("components/chat/ask-drawer.tsx");
    expect(src).toMatch(/export type AskFn/);
  });
});

describe("Phase A — Financial Pulse", () => {
  it("Ask opens the inline drawer, never Command Center", () => {
    const src = read("app/dashboard/financial-pulse/page.tsx");
    expect(src).toMatch(/AskDrawer/);
    expect(src).not.toMatch(/dashboard\?prompt=/);
    expect(src).not.toMatch(/router\.push/);
  });

  it("renders no agent identity, confidence, or timings", () => {
    const src = read("app/dashboard/financial-pulse/page.tsx");
    expect(src).not.toMatch(/ProvenanceBadge/);
    expect(src).not.toMatch(/Financial Analyst/);
    expect(src).not.toMatch(/% confidence/);
    expect(src).not.toMatch(/Thought for /);
  });

  it("narrative offers Explain + What-should-I-do, errors offer a chat CTA", () => {
    const src = read("app/dashboard/financial-pulse/page.tsx");
    expect(src).toMatch(/Explain this/);
    expect(src).toMatch(/What should I do\?/);
    expect(src).toMatch(/Ask about the figures instead/);
  });

  it("empty budget states guide to chat instead of vanishing", () => {
    const src = read("app/dashboard/financial-pulse/page.tsx");
    expect(src).toMatch(/Set one with AI/);
    expect(src).toMatch(/Ask what to add/);
  });
});

describe("Phase A — Ledger", () => {
  it("Ask opens the inline drawer, never ejects", () => {
    const src = read("app/dashboard/ledger/page.tsx");
    expect(src).toMatch(/AskDrawer/);
    expect(src).not.toMatch(/openWithFocus/);
    expect(src).not.toMatch(/dashboard\/audit-trail/);
  });

  it("renders no agent copy, dots, or provenance", () => {
    const src = read("app/dashboard/ledger/page.tsx");
    expect(src).not.toMatch(/ProvenanceDot/);
    expect(src).not.toMatch(/Posted by an agent/);
    expect(src).not.toMatch(/agent descriptions are searchable/);
    expect(src).not.toMatch(/as agents post entries/);
    expect(src).toMatch(/Recorded by Xenboox/);
  });

  it("rows carry per-row Ask with record focus", () => {
    const src = read("app/dashboard/ledger/page.tsx");
    expect(src).toMatch(/Ask about this entry/);
    expect(src).toMatch(/Ask about this account/);
    expect(src).toMatch(/kind: "Journal Entry"/);
    expect(src).toMatch(/kind: "Account"/);
  });

  it("pending entries get Request changes; drawers get history + empty CTAs", () => {
    const src = read("app/dashboard/ledger/page.tsx");
    expect(src).toMatch(/Request changes/);
    expect(src).toMatch(/Show history/);
    expect(src).toMatch(/Record one with AI/);
    expect(src).toMatch(/Open one with AI/);
  });
});
