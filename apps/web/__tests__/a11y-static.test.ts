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
  if (!existsSync(p)) throw new Error(`Missing file for a11y check: ${rel}`);
  return readFileSync(p, "utf-8");
}

describe("A11y — skip links (§13.2)", () => {
  it("dashboard layout has a skip-to-content link targeting #main-content", () => {
    const layout = read("app/dashboard/layout.tsx");
    expect(layout).toMatch(/Skip to content/);
    expect(layout).toMatch(/href="#main-content"/);
    expect(layout).toMatch(/<main\s+id="main-content"/);
  });

  it("marketing layout has a skip-to-content link targeting #main-content", () => {
    const layout = read("app/(marketing)/layout.tsx");
    expect(layout).toMatch(/Skip to content/);
    expect(layout).toMatch(/href="#main-content"/);
    expect(layout).toMatch(/<main[^>]*id="main-content"/s);
  });
});

describe("A11y — aria-current (§13.2)", () => {
  it("sidebar marks the active nav item with aria-current=page", () => {
    const sidebar = read("components/layout/sidebar.tsx");
    expect(sidebar).toMatch(
      /aria-current=\{isActive\(item\) \? "page" : undefined\}/,
    );
  });
});

describe("A11y — table headers scope + captions (§13.2)", () => {
  const tableComponents = [
    "components/shared/data-view-table.tsx",
    "components/documents/artifact-list.tsx",
    "components/audit/activity-log-view.tsx",
    "components/layout/chat-panel.tsx",
    "components/marketing/hero-home.tsx",
    "components/onboarding/onboarding-liveness.tsx",
    "components/settings/taxes-section.tsx",
    "components/workspace/rich-responses.tsx",
    "components/workspace/rich-message-renderer.tsx",
  ];

  for (const rel of tableComponents) {
    it(`${rel} marks every <th> with scope="col"`, () => {
      const src = read(rel);
      // Every <th ...> opening tag must carry scope="col"
      const thTags = src.match(/<th\b[^>]*>/g) ?? [];
      expect(thTags.length).toBeGreaterThan(0);
      for (const tag of thTags) {
        expect(tag).toContain('scope="col"');
      }
    });
  }

  it("data-view-table supports an sr-only caption", () => {
    const src = read("components/shared/data-view-table.tsx");
    expect(src).toMatch(/caption\?: string/);
    expect(src).toMatch(/<caption className="sr-only">\{caption\}<\/caption>/);
  });
});

describe("A11y — reduced motion (§13.2)", () => {
  it("globals.css honors prefers-reduced-motion", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/animation-duration: 0\.01ms/);
  });
});

describe("A11y — AI-native surfaces (§13.2)", () => {
  it("Command Center textarea has associated label", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/htmlFor="ai-chat-input"/);
    expect(src).toMatch(/id="ai-chat-input"/);
  });

  it("Command Center send button has aria-label", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/aria-label="Send message"/);
  });

  it("Command Center streaming content uses aria-live", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/aria-live="polite"/);
  });

  it("Command Center thinking indicator has role=status", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/role="status".*aria-live="polite"/s);
  });

  it("Activity Hub completed section has aria-expanded", () => {
    const src = read("app/dashboard/activity-hub/page.tsx");
    expect(src).toMatch(/aria-expanded=\{isOpen\}/);
    expect(src).toMatch(/aria-controls="completed-section"/);
  });

  it("Activity Hub filter pills have keyboard navigation (role=tablist, ArrowLeft/Right, Home/End)", () => {
    const src = read("app/dashboard/activity-hub/page.tsx");
    // Must have role=tablist
    expect(src).toMatch(/role="tablist"/);
    // Must have role=tab on each filter button
    expect(src).toMatch(/role="tab"/);
    // Must have aria-selected
    expect(src).toMatch(/aria-selected/);
    // Must have aria-controls pointing to panel
    expect(src).toMatch(/aria-controls="activity-tab-panel"/);
    // Must have tabIndex roving (-1 for inactive, 0 for active)
    expect(src).toMatch(/tabIndex=\{isSelected \? 0 : -1\}/);
    // Must handle ArrowRight
    expect(src).toMatch(/case "ArrowRight"/);
    // Must handle ArrowLeft
    expect(src).toMatch(/case "ArrowLeft"/);
    // Must handle Home
    expect(src).toMatch(/case "Home"/);
    // Must handle End
    expect(src).toMatch(/case "End"/);
    // Must have role=tabpanel
    expect(src).toMatch(/role="tabpanel"/);
    // Must have aria-label on tabpanel
    expect(src).toMatch(/aria-label=\{`\$\{activeFilter\} activities`\}/);
  });

  it("Financial Pulse scenario input has associated label", () => {
    const src = read("app/dashboard/financial-pulse/page.tsx");
    expect(src).toMatch(/htmlFor="scenario-input"/);
    expect(src).toMatch(/id="scenario-input"/);
  });

  it("Financial Pulse sparkline SVG has role=img and aria-label", () => {
    const src = read("app/dashboard/financial-pulse/page.tsx");
    expect(src).toMatch(/role="img"/);
    expect(src).toMatch(/aria-label="Trend sparkline"/);
  });

  it("Ledger search input has associated label", () => {
    const src = read("app/dashboard/ledger/page.tsx");
    expect(src).toMatch(/htmlFor="journal-search"/);
    expect(src).toMatch(/id="journal-search"/);
  });

  it("Ledger trial balance table has aria-label and caption", () => {
    const src = read("app/dashboard/ledger/page.tsx");
    expect(src).toMatch(/aria-label="Trial Balance"/);
    expect(src).toMatch(/<caption className="sr-only">/);
  });

  it("Ledger fixed assets button has aria-label", () => {
    const src = read("app/dashboard/ledger/page.tsx");
    expect(src).toMatch(/aria-label="Ask AI about fixed assets"/);
  });

  it("Ledger reconciliation button has aria-label", () => {
    const src = read("app/dashboard/ledger/page.tsx");
    expect(src).toMatch(/aria-label="Ask AI to reconcile"/);
  });

  it("Operations section icons have aria-hidden", () => {
    const src = read("app/dashboard/operations/page.tsx");
    // At least the section header icons should be decorative
    const ariaHiddenCount = (src.match(/aria-hidden="true"/g) ?? []).length;
    expect(ariaHiddenCount).toBeGreaterThanOrEqual(5);
  });

  it("Ledger tabs have keyboard navigation (role=tablist, ArrowLeft/Right, Home/End)", () => {
    const src = read("app/dashboard/ledger/page.tsx");
    // Must have role=tablist
    expect(src).toMatch(/role="tablist"/);
    // Must have role=tab on each tab button
    expect(src).toMatch(/role="tab"/);
    // Must have aria-selected
    expect(src).toMatch(/aria-selected/);
    // Must have aria-controls pointing to panel
    expect(src).toMatch(/aria-controls=\{`ledger-panel-/);
    // Must have tabIndex roving (-1 for inactive, 0 for active)
    expect(src).toMatch(/tabIndex=\{isActive \? 0 : -1\}/);
    // Must handle ArrowRight
    expect(src).toMatch(/case "ArrowRight"/);
    // Must handle ArrowLeft
    expect(src).toMatch(/case "ArrowLeft"/);
    // Must handle Home
    expect(src).toMatch(/case "Home"/);
    // Must handle End
    expect(src).toMatch(/case "End"/);
    // Must have role=tabpanel
    expect(src).toMatch(/role="tabpanel"/);
  });

  it("Mobile bottom nav has 5 items with aria-labels", () => {
    const src = read("components/layout/mobile-bottom-nav.tsx");
    expect(src).toMatch(/aria-label="Main navigation"/);
    expect(src).toMatch(/md:hidden/);
    // Should have all 5 surfaces
    expect(src).toMatch(/Command/);
    expect(src).toMatch(/Activity/);
    expect(src).toMatch(/Pulse/);
    expect(src).toMatch(/Ledger/);
    expect(src).toMatch(/Ops/);
  });

  it("Dashboard layout includes MobileBottomNav", () => {
    const src = read("app/dashboard/layout.tsx");
    expect(src).toMatch(/MobileBottomNav/);
  });

  it("Dashboard layout has bottom padding for mobile nav", () => {
    const src = read("app/dashboard/layout.tsx");
    expect(src).toMatch(/h-16 md:hidden/);
  });

  it("Dashboard layout includes route focus manager for screen readers", () => {
    const src = read("app/dashboard/layout.tsx");
    expect(src).toMatch(/useRouteFocus/);
    expect(src).toMatch(/getAnnounceProps/);
    expect(src).toMatch(/announce/);
  });

  it("useRouteFocus hook focuses main and announces page title", () => {
    const src = read("lib/hooks/use-route-focus.ts");
    expect(src).toMatch(/getElementById\("main-content"\)/);
    expect(src).toMatch(/focus\(/);
    expect(src).toMatch(/"aria-live": "polite"/);
    expect(src).toMatch(/role: "status"/);
    expect(src).toMatch(/"aria-atomic": "true"/);
  });

  it("Dashboard layout wraps children in route-transition-enter div keyed on pathname", () => {
    const src = read("app/dashboard/layout.tsx");
    expect(src).toMatch(/key=\{pathname\}/);
    expect(src).toMatch(/route-transition-enter/);
  });

  it("globals.css defines route-enter keyframe animation", () => {
    const src = read("app/globals.css");
    expect(src).toMatch(/@keyframes route-enter/);
    expect(src).toMatch(/route-transition-enter/);
    expect(src).toMatch(/animation: route-enter/);
  });

  it("Dashboard layout wires surface keyboard shortcuts", () => {
    const src = read("app/dashboard/layout.tsx");
    expect(src).toMatch(/useSurfaceShortcuts/);
  });

  it("useSurfaceShortcuts defines 1-5 key mappings for all surfaces", () => {
    const src = read("lib/hooks/use-surface-shortcuts.ts");
    expect(src).toMatch(/SURFACE_SHORTCUTS/);
    expect(src).toMatch(/"\/dashboard"/);
    expect(src).toMatch(/"\/dashboard\/activity-hub"/);
    expect(src).toMatch(/"\/dashboard\/financial-pulse"/);
    expect(src).toMatch(/"\/dashboard\/ledger"/);
    expect(src).toMatch(/"\/dashboard\/operations"/);
    // Must skip interactive elements
    expect(src).toMatch(/isInteractiveElement/);
    // Must not trigger with modifier keys
    expect(src).toMatch(/metaKey|ctrlKey|altKey/);
  });

  it("Activity Hub has batch approve/reject with selection checkboxes", () => {
    const src = read("app/dashboard/activity-hub/page.tsx");
    // Must have selectedIds state
    expect(src).toMatch(/selectedIds/);
    // Must have toggleSelect handler
    expect(src).toMatch(/toggleSelect/);
    // Must have handleBatchAction handler
    expect(src).toMatch(/handleBatchAction/);
    // Must have batch action toolbar
    expect(src).toMatch(/role="toolbar"/);
    expect(src).toMatch(/aria-label="Batch actions"/);
    // Must have Approve all and Reject all buttons
    expect(src).toMatch(/Approve all/);
    expect(src).toMatch(/Reject all/);
    // Must have selectAll and clearSelection
    expect(src).toMatch(/selectAll/);
    expect(src).toMatch(/clearSelection/);
    // Must have checkbox on each card
    expect(src).toMatch(/type="checkbox"/);
  });

  it("Activity Hub has optimistic state management for approve/reject", () => {
    const src = read("app/dashboard/activity-hub/page.tsx");
    // Must have itemStates for tracking optimistic updates
    expect(src).toMatch(/itemStates/);
    // Must have setItemStates for updating state
    expect(src).toMatch(/setItemStates/);
    // Must have handleAction callback
    expect(src).toMatch(/handleAction/);
    // Must pass itemState and onAction to ActivityItemCard
    expect(src).toMatch(/itemState=\{itemStates/);
    expect(src).toMatch(/onAction=\{handleAction\}/);
    // Must show success state with CheckCircle2
    expect(src).toMatch(/itemState === "success"/);
    // Must import toast from sonner
    expect(src).toMatch(/import.*toast.*from.*sonner/);
  });
});
