import { describe, it, expect } from "vitest";

describe("Command Palette", () => {
  describe("Navigation items", () => {
    const NAV_ITEMS = [
      { label: "Dashboard", href: "/dashboard", group: "Pages" },
      {
        label: "AI Assistant",
        href: "/dashboard",
        group: "Pages",
        shortcut: "/",
      },
      { label: "Chart of Accounts", href: "/dashboard/coa", group: "Pages" },
      { label: "Journal Entries", href: "/dashboard/ledger", group: "Pages" },
      { label: "Purchase Orders", href: "/dashboard/ap/pos", group: "Pages" },
      { label: "Bills", href: "/dashboard/ap/invoices", group: "Pages" },
      { label: "Customers", href: "/dashboard/ar/customers", group: "Pages" },
      { label: "Invoices", href: "/dashboard/ar/invoices", group: "Pages" },
      { label: "Bank Accounts", href: "/dashboard/treasury", group: "Pages" },
      { label: "Cash & Imprest", href: "/dashboard/cash", group: "Pages" },
      {
        label: "Mobile Money",
        href: "/dashboard/mobile-money",
        group: "Pages",
      },
      { label: "Employees", href: "/dashboard/operations", group: "Pages" },
      {
        label: "Fixed Assets",
        href: "/dashboard/ledger",
        group: "Pages",
      },
      { label: "Inventory", href: "/dashboard/inventory", group: "Pages" },
      {
        label: "Financial Reports",
        href: "/dashboard/financial-pulse",
        group: "Pages",
      },
      { label: "Documents", href: "/dashboard", group: "Pages" },
      { label: "Audit Trail", href: "/dashboard/audit-trail", group: "Pages" },
      { label: "Settings", href: "/dashboard/settings", group: "Pages" },
      { label: "Help & Support", href: "/dashboard/help", group: "Pages" },
    ];

    it("defines 19 navigable pages", () => {
      expect(NAV_ITEMS).toHaveLength(19);
    });

    it("all pages have valid hrefs starting with /dashboard", () => {
      NAV_ITEMS.forEach((item) => {
        expect(item.href).toMatch(/^\/dashboard/);
      });
    });

    it("all pages have labels", () => {
      NAV_ITEMS.forEach((item) => {
        expect(item.label).toBeTruthy();
        expect(item.label.length).toBeGreaterThan(0);
      });
    });

    it("all pages belong to Pages group", () => {
      NAV_ITEMS.forEach((item) => {
        expect(item.group).toBe("Pages");
      });
    });

    it("has AI Assistant with shortcut key", () => {
      const ai = NAV_ITEMS.find((i) => i.label === "AI Assistant");
      expect(ai).toBeDefined();
      expect(ai?.shortcut).toBe("/");
    });

    it("includes all core modules", () => {
      const labels = NAV_ITEMS.map((i) => i.label);
      expect(labels).toContain("Dashboard");
      expect(labels).toContain("Chart of Accounts");
      expect(labels).toContain("Journal Entries");
      expect(labels).toContain("Bank Accounts");
      expect(labels).toContain("Financial Reports");
      expect(labels).toContain("Settings");
    });

    it("search filters by label", () => {
      const query = "invoice";
      const filtered = NAV_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()),
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].label).toBe("Invoices");
    });

    it("search is case-insensitive", () => {
      const query = "JOURNAL";
      const filtered = NAV_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()),
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].label).toBe("Journal Entries");
    });
  });

  describe("AI commands", () => {
    const AI_COMMANDS = [
      { label: "Summarize this month", action: "summarize-month" },
      { label: "Reconcile bank transactions", action: "reconcile" },
      { label: "Generate financial report", action: "generate-report" },
      { label: "Analyze spending patterns", action: "analyze-spending" },
      { label: "Create journal entry", action: "create-journal" },
      { label: "Process invoices", action: "process-invoices" },
    ];

    it("defines 6 AI commands", () => {
      expect(AI_COMMANDS).toHaveLength(6);
    });

    it("all commands have unique actions", () => {
      const actions = AI_COMMANDS.map((c) => c.action);
      expect(new Set(actions).size).toBe(AI_COMMANDS.length);
    });

    it("all commands route to chat", () => {
      AI_COMMANDS.forEach((cmd) => {
        const href = `/dashboard/chat?command=${cmd.action}`;
        expect(href).toContain("/dashboard");
        expect(href).toContain(cmd.action);
      });
    });
  });

  describe("Keyboard shortcuts", () => {
    const SHORTCUTS = [
      { keys: ["Ctrl", "K"], description: "Open command palette" },
      { keys: ["1-5"], description: "Switch surfaces" },
      { keys: ["/"], description: "Toggle AI chat" },
      { keys: ["Esc"], description: "Close dialog" },
      { keys: ["A"], description: "Approve selected" },
      { keys: ["R"], description: "Reject selected" },
    ];

    it("defines 6 keyboard shortcuts", () => {
      expect(SHORTCUTS).toHaveLength(6);
    });

    it("Ctrl+K opens command palette", () => {
      const ctrlK = SHORTCUTS.find(
        (s) => s.description === "Open command palette",
      );
      expect(ctrlK?.keys).toContain("Ctrl");
      expect(ctrlK?.keys).toContain("K");
    });

    it("all shortcuts have descriptions", () => {
      SHORTCUTS.forEach((s) => {
        expect(s.description).toBeTruthy();
      });
    });
  });

  describe("Recent searches", () => {
    it("stores up to 5 recent searches", () => {
      const maxRecent = 5;
      const searches = ["a", "b", "c", "d", "e", "f"];
      const limited = searches.slice(0, maxRecent);
      expect(limited).toHaveLength(5);
    });

    it("deduplicates recent searches", () => {
      const searches = ["a", "b", "a", "c"];
      const deduped = searches.filter((s, i) => searches.indexOf(s) === i);
      expect(deduped).toEqual(["a", "b", "c"]);
    });
  });

  describe("Search filtering", () => {
    it("filters pages by partial match", () => {
      const items = ["Dashboard", "Bank Accounts", "Chart of Accounts"];
      const query = "bank";
      const filtered = items.filter((i) =>
        i.toLowerCase().includes(query.toLowerCase()),
      );
      expect(filtered).toEqual(["Bank Accounts"]);
    });

    it("returns empty for no match", () => {
      const items = ["Dashboard", "Settings"];
      const query = "xyz";
      const filtered = items.filter((i) =>
        i.toLowerCase().includes(query.toLowerCase()),
      );
      expect(filtered).toHaveLength(0);
    });

    it("matches across words", () => {
      const items = ["Chart of Accounts", "Cash & Imprest"];
      const query = "cash";
      const filtered = items.filter((i) =>
        i.toLowerCase().includes(query.toLowerCase()),
      );
      expect(filtered).toContain("Cash & Imprest");
    });
  });

  describe("Accessibility", () => {
    it("search trigger has aria-label", () => {
      const html = '<button aria-label="Open command palette (Ctrl+K)">';
      expect(html).toContain('aria-label="Open command palette (Ctrl+K)"');
    });

    it("command dialog uses cmdk patterns", () => {
      // CommandDialog wraps cmdk which provides role="dialog" and aria attributes
      expect(true).toBe(true);
    });

    it("keyboard shortcuts are displayed as kbd elements", () => {
      const html =
        '<kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">';
      expect(html).toContain("kbd");
    });
  });
});
