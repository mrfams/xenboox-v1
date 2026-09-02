/**
 * Right Panel Visual Differentiation Tests
 *
 * Verifies that the three tabs (Agents, Tasks, Chat) in the
 * AgentConversationsRail have distinct visual identities:
 * - Per-tab accent colors (sky, emerald, violet)
 * - Summary count badges per tab
 * - Themed empty states per tab
 * - Accent color stripe at top of each tab content area
 */
import { readFileSync } from "fs";
import { join } from "path";

const PAGE_PATH = join(process.cwd(), "app/dashboard/page.tsx");

function readPage(): string {
  return readFileSync(PAGE_PATH, "utf-8");
}

describe("Right Panel Visual Differentiation", () => {
  let page: string;

  beforeAll(() => {
    page = readPage();
  });

  describe("Per-tab accent colors", () => {
    it("Agents tab uses sky/blue accent color", () => {
      expect(page).toContain("text-sky-600");
      expect(page).toContain("bg-sky-500/10");
    });

    it("Tasks tab uses emerald/green accent color", () => {
      expect(page).toContain("text-emerald-600");
      expect(page).toContain("bg-emerald-500/10");
    });

    it("Chat tab uses violet/purple accent color", () => {
      expect(page).toContain("text-violet-600");
      expect(page).toContain("bg-violet-500/10");
    });

    it("each tab has a distinct icon background", () => {
      expect(page).toContain("bg-sky-500/15");
      expect(page).toContain("bg-emerald-500/15");
      expect(page).toContain("bg-violet-500/15");
    });
  });

  describe("Count badges", () => {
    it("Agents tab shows active count badge", () => {
      expect(page).toContain("runningTasks.length");
    });

    it("Tasks tab shows running count", () => {
      expect(page).toContain("runningTasks.length");
    });

    it("Tasks tab shows failed count separately in red", () => {
      expect(page).toContain("failedTasks.length");
      expect(page).toContain("bg-error-clay/15");
      expect(page).toContain("text-error-clay");
    });

    it("Chat tab shows total conversation count", () => {
      expect(page).toContain("totalConversations");
    });
  });

  describe("Accent color stripes at top of each tab", () => {
    it("Agents tab has sky gradient stripe", () => {
      expect(page).toContain("from-sky-500/40");
      expect(page).toContain("via-sky-400/20");
    });

    it("Tasks tab has emerald gradient stripe", () => {
      expect(page).toContain("from-emerald-500/40");
      expect(page).toContain("via-emerald-400/20");
    });

    it("Chat tab has violet gradient stripe", () => {
      expect(page).toContain("from-violet-500/40");
      expect(page).toContain("via-violet-400/20");
    });
  });

  describe("Themed empty states", () => {
    it("Tasks empty state has themed icon container", () => {
      const tasksStart = page.indexOf("function TasksRail");
      const tasksEnd = page.indexOf("function TaskGroup", tasksStart);
      const tasksSection = page.slice(tasksStart, tasksEnd);
      // TasksRail has its own green-themed empty state
      expect(tasksSection).toContain("text-balanced-green");
    });

    it("Chat empty state uses violet icon", () => {
      expect(page).toContain("bg-violet-500/10");
      expect(page).toContain("text-violet-500/50");
    });

    it("empty states include descriptive subtitle", () => {
      expect(page).toContain("Start a chat to begin");
      expect(page).toContain("AI agents will start tasks automatically");
    });
  });

  describe("Chat conversation list styling", () => {
    it("active conversation uses violet ring", () => {
      expect(page).toContain("bg-violet-500/10 ring-1 ring-violet-500/20");
    });

    it("inactive conversations use subtle violet hover", () => {
      expect(page).toContain("hover:bg-violet-500/5");
    });

    it("conversation icon has rounded container", () => {
      expect(page).toContain("bg-violet-500/20");
    });

    it("conversation items show relative timestamps", () => {
      expect(page).toContain("timeAgo(updatedAt)");
    });
  });

  describe("Tab button styling", () => {
    it("tabs use rounded-lg for modern look", () => {
      expect(page).toContain("rounded-lg");
    });

    it("active tab has icon background", () => {
      expect(page).toContain("tab.iconCls");
    });

    it("inactive tab has muted background on icon", () => {
      expect(page).toContain("bg-muted/50");
    });
  });

  describe("Accessibility", () => {
    it("tablist has aria-label", () => {
      expect(page).toContain('aria-label="Agents, conversations, and tasks"');
    });

    it("each tab has aria-selected", () => {
      expect(page).toContain("aria-selected={active === tab.key}");
    });

    it("each tab has role=tab", () => {
      expect(page).toContain('role="tab"');
    });
  });
});
