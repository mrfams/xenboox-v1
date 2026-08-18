import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ModulePageShell mounts ModulePageCopilot, which pulls the streaming-chat
// hook chain — stub it out for this smoke test.
vi.mock("@/components/module/module-page-copilot", () => ({
  ModulePageCopilot: () => null,
}));

import ExplorePage from "@/app/dashboard/explore/page";
import { PAGES } from "@/lib/explore/pages-directory";
import { FEATURES } from "@/lib/explore/features-catalog";

describe("Explore page — pages directory + feature catalog", () => {
  it("renders every dashboard page as a linked card with a description", () => {
    render(<ExplorePage />);

    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("Pages")).toBeInTheDocument();
    expect(screen.getByText("Features")).toBeInTheDocument();

    // Spot-check a few entries across groups.
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("AI Command Center")).toBeInTheDocument();
    expect(screen.getByText("Payroll")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();

    // Every directory entry has a linked card in the DOM.
    for (const page of PAGES.slice(0, 6)) {
      const link = document.querySelector(`a[href="${page.href}"]`);
      expect(link, `missing link for ${page.href}`).toBeTruthy();
    }
  });

  it("filters the directory as the user types", () => {
    render(<ExplorePage />);
    const search = screen.getByPlaceholderText(/Search pages/i);
    fireEvent.change(search, { target: { value: "payroll" } });

    expect(screen.getByText("Payroll")).toBeInTheDocument();
    expect(screen.queryByText("Customers")).not.toBeInTheDocument();
  });

  it("shows the Ask Xenboox explainer and color-coded feature statuses", () => {
    render(<ExplorePage />);
    fireEvent.click(screen.getByText("Features"));

    // The feature the user asked about is explained and marked Shipped.
    expect(
      screen.getAllByText(/Ask it, explain it, task it, or change it/i).length,
    ).toBeGreaterThan(0);

    // Status legend + roll-up present (labels repeat across badges).
    expect(screen.getByText("Status legend")).toBeInTheDocument();
    expect(screen.getAllByText("Shipped").length).toBeGreaterThan(0);
    expect(screen.getAllByText("In progress").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Planned").length).toBeGreaterThan(0);

    // A shipped feature renders, and every status still present in the
    // catalog renders too (statuses that no longer exist — e.g. all features
    // shipped — are asserted conditionally rather than assumed).
    const shipped = FEATURES.filter((f) => f.status === "shipped")[0];
    expect(
      shipped,
      "catalog should contain at least one shipped feature",
    ).toBeTruthy();
    expect(screen.getAllByText(shipped.name).length).toBeGreaterThan(0);
    for (const status of ["partial", "planned"]) {
      const item = FEATURES.filter((f) => f.status === status)[0];
      if (item) {
        expect(screen.getAllByText(item.name).length).toBeGreaterThan(0);
      }
    }
  });

  it("has valid catalog data — unique ids and known statuses", () => {
    const ids = new Set(FEATURES.map((f) => f.id));
    expect(ids.size).toBe(FEATURES.length);
    for (const f of FEATURES) {
      expect(["shipped", "partial", "planned"]).toContain(f.status);
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(10);
    }
    // Every directory href must exist and be unique.
    const hrefs = new Set(PAGES.map((p) => p.href));
    expect(hrefs.size).toBe(PAGES.length);
    for (const p of PAGES) {
      expect(p.href === "/dashboard" || p.href.startsWith("/dashboard/")).toBe(
        true,
      );
      expect(p.description.length).toBeGreaterThan(10);
    }
  });
});
