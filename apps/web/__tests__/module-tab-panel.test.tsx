import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";

import {
  ModulePanel,
  ModulePanelEmpty,
  ModulePanelLoading,
} from "@/components/module/module-tab-panel";

describe("ModulePanel — shared tab-panel chrome", () => {
  it("renders content with no chrome when title/action are absent", () => {
    const { container } = render(<ModulePanel>content</ModulePanel>);
    expect(screen.getByText("content")).toBeInTheDocument();
    // No header band is rendered — first child is the content itself.
    expect(container.querySelector("h3")).not.toBeInTheDocument();
  });

  it("renders title + description + action in the header band", () => {
    render(
      <ModulePanel
        title="Bank Transactions"
        description="Every transaction across your accounts."
        action={<button>Export</button>}
      >
        <p>table</p>
      </ModulePanel>,
    );

    expect(
      screen.getByRole("heading", { name: "Bank Transactions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Every transaction across your accounts."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByText("table")).toBeInTheDocument();
  });
});

describe("ModulePanelEmpty — honest empty state", () => {
  it("renders icon, title, description and optional action", () => {
    render(
      <ModulePanelEmpty
        icon={FileText}
        title="No transactions yet"
        description="Transactions from connected accounts will appear here."
        action={<button>Connect Bank</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "No transactions yet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Transactions from connected accounts will appear here/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Connect Bank" }),
    ).toBeInTheDocument();
  });
});

describe("ModulePanelLoading — skeleton state", () => {
  it("renders the requested number of skeleton rows", () => {
    const { container } = render(<ModulePanelLoading rows={4} />);
    // 4 skeleton rows + the spinner.
    expect(container.querySelectorAll(".animate-pulse").length).toBe(4);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
