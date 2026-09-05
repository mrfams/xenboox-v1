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

describe("Phase B — Operations is sessions, not tabs", () => {
  it("has no tab shell: decisions + records instead", () => {
    const src = read("app/dashboard/operations/page.tsx");
    expect(src).toMatch(/MoneyNeedsYou/);
    expect(src).toMatch(/Records/);
    expect(src).toMatch(/AskDrawer/);
    expect(src).not.toMatch(/role="tablist"/);
    expect(src).not.toMatch(/1-7 switch tabs/);
    expect(src).not.toMatch(/"Cash Position"/);
  });

  it("record tables mount only when their section opens", () => {
    const src = read("app/dashboard/operations/page.tsx");
    expect(src).toMatch(/openSections/);
    expect(src).toMatch(/\{open && \(/);
  });

  it("legacy ?tab= links still open the right section", () => {
    const src = read("app/dashboard/operations/page.tsx");
    expect(src).toMatch(/searchParams\.get\("tab"\)/);
    expect(src).toMatch(/openSection\(t\)/);
  });

  it("cash hero names no agents and drafts plans inline", () => {
    const src = read("app/dashboard/operations/page.tsx");
    expect(src).not.toMatch(/Agents are watching/);
    expect(src).toMatch(/Draft a payment plan/);
    expect(src).toMatch(/Where did the cash go\?/);
  });
});

describe("Phase B — Money needing you decides inline", () => {
  it("expense claims approve/reject/reimburse with real mutations", () => {
    const src = read("components/operations/money-needs-you.tsx");
    expect(src).toMatch(/decideClaim/);
    expect(src).toMatch(/reimburseClaim/);
    expect(src).toMatch(/What should have happened instead/);
  });

  it("overdue invoices send reminders and chase via Ask", () => {
    const src = read("components/operations/money-needs-you.tsx");
    expect(src).toMatch(/sendInvoiceEmail/);
    expect(src).toMatch(/Send reminder/);
    expect(src).toMatch(/Chase all with AI/);
  });

  it("overdue bills draft plans inline; banking hands off to its section", () => {
    const src = read("components/operations/money-needs-you.tsx");
    expect(src).toMatch(/Draft a payment plan/);
    expect(src).toMatch(/Review in Banking/);
    expect(src).toMatch(/onOpenSection/);
  });

  it("renders no agent internals and navigates nowhere", () => {
    const src = read("components/operations/money-needs-you.tsx");
    expect(src).not.toMatch(/agentName/);
    expect(src).not.toMatch(/confidence/);
    expect(src).not.toMatch(/router\.push/);
    expect(src).not.toMatch(/\/dashboard\?prompt=/);
  });
});

describe("Phase B — Documents replace batch tracking", () => {
  it("ingestion page is upload + review inbox, not pipeline tabs", () => {
    const src = read("app/dashboard/ingestion/page.tsx");
    expect(src).toMatch(/BatchUpload/);
    expect(src).toMatch(/BatchProgress/);
    expect(src).toMatch(/listPendingReviews/);
    expect(src).toMatch(/IngestionReviewPanel/);
    expect(src).toMatch(/\/dashboard\/tasks/);
    expect(src).not.toMatch(/role="tablist"/);
    expect(src).not.toMatch(/Total Batches/);
    expect(src).not.toMatch(/Batch \{/);
    expect(src).not.toMatch(/totalDurationMs/);
  });

  it("review panel shows evidence, not scores or robots", () => {
    const src = read("components/ingestion/ingestion-review-panel.tsx");
    expect(src).not.toMatch(/ConfidenceBadge/);
    expect(src).not.toMatch(/Confidence\{/);
    expect(src).not.toMatch(/<Bot/);
    expect(src).toMatch(/Approve & Post/);
    expect(src).toMatch(/What should have happened instead/);
  });

  it("progress shows work state, not stages or seconds", () => {
    const src = read("components/ingestion/batch-progress.tsx");
    expect(src).toMatch(/Processing documents/);
    expect(src).not.toMatch(/MiniPipeline/);
    expect(src).not.toMatch(/Stage/);
    expect(src).not.toMatch(/\.toFixed\(1\)\}s/);
  });
});
