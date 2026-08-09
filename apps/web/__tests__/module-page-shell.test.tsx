import React from "react";
import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileText, Users } from "lucide-react";

import { ModulePageShell } from "@/components/module/module-page-shell";

// happy-dom here does not provide window.localStorage — stub an in-memory
// one so the shell's SSR-safe persistence hook is exercised for real.
const storage = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => {
    storage.set(k, String(v));
  },
  removeItem: (k) => {
    storage.delete(k);
  },
  clear: () => {
    storage.clear();
  },
  key: (i) => [...storage.keys()][i] ?? null,
  get length() {
    return storage.size;
  },
};

beforeAll(() => {
  vi.stubGlobal("localStorage", localStorageMock);
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    configurable: true,
  });
});

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "employees", label: "Employees", count: 5 },
];

const summaryCards = [
  {
    label: "Total Payroll",
    value: "GMD 1,000.00",
    change: 12,
    icon: FileText,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    label: "Employees",
    value: "5",
    subtitle: "Active employees",
    icon: Users,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
];

function renderShell() {
  return render(
    <ModulePageShell
      title="Payroll"
      description="Run payroll, manage employees and statutory compliance with AI."
      icon={Users}
      tabs={tabs}
      activeTab="overview"
      summaryCards={summaryCards}
      filters={<input aria-label="Search" placeholder="Search..." />}
    >
      <table>
        <tbody>
          <tr>
            <td>Employee row</td>
          </tr>
        </tbody>
      </table>
    </ModulePageShell>,
  );
}

describe("ModulePageShell — compact chrome", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders header, tabs, content — and the metric strip with NO Overview label row", () => {
    renderShell();

    // Header
    expect(
      screen.getByRole("heading", { name: "Payroll" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Run payroll, manage employees/),
    ).toBeInTheDocument();

    // Tabs
    expect(screen.getByRole("tab", { name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Employees/ })).toBeInTheDocument();

    // Metric strip: card labels/values render, no "Overview" section heading
    // (the old label row that consumed ~28px) in the expanded state.
    expect(screen.getByText("Total Payroll")).toBeInTheDocument();
    expect(screen.getByText("GMD 1,000.00")).toBeInTheDocument();
    expect(screen.getByText("↑ 12%")).toBeInTheDocument();
    expect(screen.getByText("Active employees")).toBeInTheDocument();
    expect(
      screen.queryByText("Overview", { selector: "span" }),
    ).not.toBeInTheDocument();

    // Content
    expect(screen.getByText("Employee row")).toBeInTheDocument();
  });

  it("collapse toggles hide each chrome band and persist to localStorage", () => {
    renderShell();

    // Collapse the summary strip — the collapsed "Overview" band appears.
    fireEvent.click(screen.getByRole("button", { name: "Hide summary cards" }));
    expect(screen.queryByText("Total Payroll")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("xb:shell:summaryCards")).toBe("1");

    // Re-expand it.
    fireEvent.click(screen.getByRole("button", { name: "Show summary cards" }));
    expect(screen.getByText("Total Payroll")).toBeInTheDocument();
    expect(window.localStorage.getItem("xb:shell:summaryCards")).toBe("0");
  });

  it("tabs and filters keep their visible collapse toggles", () => {
    renderShell();

    expect(
      screen.getByRole("button", { name: "Hide tabs" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide filters" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide tabs" }));
    expect(screen.getByText("Tabs collapsed")).toBeInTheDocument();
    // Toggle stays visible when collapsed (regression for the one-way-collapse bug).
    expect(
      screen.getByRole("button", { name: "Show tabs" }),
    ).toBeInTheDocument();
  });

  it("renders negative change deltas with a down arrow", () => {
    render(
      <ModulePageShell
        title="Payroll"
        summaryCards={[
          {
            label: "Total Payroll",
            value: "GMD 0.00",
            change: -100,
            icon: FileText,
            color: "text-indigo-600",
            bgColor: "bg-indigo-50",
          },
        ]}
      >
        <p>content</p>
      </ModulePageShell>,
    );

    expect(screen.getByText("↓ 100%")).toBeInTheDocument();
  });

  it("honors defaultCollapsed for the summary strip", () => {
    render(
      <ModulePageShell
        title="Payroll"
        summaryCards={summaryCards}
        defaultCollapsed={{ summaryCards: true }}
      >
        <p>content</p>
      </ModulePageShell>,
    );

    // Collapsed by default → the slim Overview band, no card values.
    expect(screen.queryByText("Total Payroll")).not.toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("renders as a bare fragment in noOuterWrapper mode", () => {
    const { container } = render(
      <ModulePageShell title="Payroll" noOuterWrapper>
        <p>content</p>
      </ModulePageShell>,
    );

    // No outer wrapper div — the fragment root is the sticky header band.
    expect(container.firstChild?.nodeName).toBe("DIV");
    expect((container.firstChild as HTMLElement).className).toContain("sticky");
  });
});
