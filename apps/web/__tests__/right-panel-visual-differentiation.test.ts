/**
 * Tasks Rail Panel Tests
 *
 * The right rail is ONE surface — Tasks — with grouped sections
 * (Needs you / Running / Done). There are no Agents/Chat tabs, no
 * per-tab accent colors, no conversation list. This locks in the
 * unified contract: work grouped by state, never by source system.
 */
import { readFileSync } from "fs";
import { join } from "path";

const PANEL_PATH = join(process.cwd(), "components/dashboard/tasks-rail-panel.tsx");
const PAGE_PATH = join(process.cwd(), "app/dashboard/page.tsx");

function readPanel(): string {
  return readFileSync(PANEL_PATH, "utf-8");
}

function readPage(): string {
  return readFileSync(PAGE_PATH, "utf-8");
}

describe("Tasks Rail Panel — unified surface", () => {
  let panel: string;
  let page: string;

  beforeAll(() => {
    panel = readPanel();
    page = readPage();
  });

  describe("Single surface, no tabs", () => {
    it("panel header is Tasks with a View all link", () => {
      expect(panel).toContain("Tasks");
      expect(panel).toContain('href="/dashboard/tasks"');
    });

    it("has no tab semantics and no Agents/Chat tabs", () => {
      expect(panel).not.toContain("tablist");
      expect(panel).not.toContain("Agents");
      // History lives behind the History button, not a Chat tab.
      expect(panel).not.toContain("Conversations");
    });

    it("dashboard no longer mounts the 3-tab rail", () => {
      expect(page).not.toContain("AgentConversationsRail");
      expect(page).not.toContain("AgentStream");
    });
  });

  describe("State grouping", () => {
    it("groups Needs you first with an attention tone", () => {
      expect(panel).toContain("Needs you");
      expect(panel).toContain("bg-attention-amber");
    });

    it("groups Running with progress and Done capped", () => {
      expect(panel).toContain("Running");
      expect(panel).toContain("Done");
      expect(panel).toContain("slice(0, 10)");
    });

    it("running rows show progress bars, failed counts badge red", () => {
      expect(panel).toContain("bg-primary");
      expect(panel).toContain("text-error-clay");
    });
  });

  describe("No agent internals", () => {
    it("panel never references agent identity or confidence", () => {
      expect(panel).not.toContain("agentName");
      expect(panel).not.toContain("CFO Agent");
      expect(panel).not.toContain("confidence");
      expect(panel).not.toContain("durationMs");
    });
  });

  describe("Accessibility", () => {
    it("selected task uses aria-current", () => {
      expect(panel).toContain("aria-current={selected}");
    });

    it("rows are buttons with accessible labels", () => {
      expect(panel).toContain("<button");
      expect(panel).toContain("aria-hidden");
    });
  });
});
