// ─── N48: Ledger Design System primitives (rendered) ────────────────────────

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Money, AsyncBlock } from "@/components/ui/ledger-primitives";

// Money uses useEntity → needs the entity provider; the hook falls back to
// USD when no entity currency is set. Render inside a minimal wrapper.
function renderWithUi(ui: React.ReactElement) {
  return render(ui);
}

describe("Money primitive", () => {
  it("renders formatted money with tabular numerals", () => {
    renderWithUi(<Money value={1500} currency="USD" />);
    const el = screen.getByText(/1,500\.00/);
    expect(el.className).toContain("tabular-nums");
  });

  it("renders a skeleton for undefined (loading) — never a bare zero", () => {
    renderWithUi(<Money value={undefined} />);
    expect(document.querySelector("[aria-busy='true']"));
    expect(document.querySelector("[aria-busy='true']")).toBeTruthy();
  });

  it("renders a real zero when zero is loaded (0 is a value, not a placeholder)", () => {
    renderWithUi(<Money value={0} currency="USD" />);
    expect(screen.getByText(/0\.00/)).toBeTruthy();
  });

  it("applies semantic tone: positive green, negative clay", () => {
    const { rerender } = renderWithUi(<Money value={500} tone="signed" />);
    expect(screen.getByText(/500\.00/).className).toContain("balanced-green");
    rerender(<Money value={-500} tone="signed" />);
    expect(screen.getByText(/500\.00/).className).toContain("error-clay");
  });

  it("handles non-finite strings with an honest dash", () => {
    renderWithUi(<Money value="not-a-number" currency="USD" />);
    expect(screen.getByText("—")).toBeTruthy();
  });
});

describe("AsyncBlock primitive", () => {
  it("loading renders an aria-busy skeleton, not content", () => {
    renderWithUi(<AsyncBlock state="loading" />);
    expect(document.querySelector("[aria-busy='true']")).toBeTruthy();
  });

  it("error renders an alert with the no-placeholder promise", () => {
    renderWithUi(<AsyncBlock state="error" label="Cash position" />);
    expect(screen.getByRole("alert").textContent).toContain(
      "placeholder value",
    );
  });

  it("error shows Retry when a handler is provided", () => {
    renderWithUi(<AsyncBlock state="error" onRetry={() => {}} />);
    expect(screen.getByText("Retry →")).toBeTruthy();
  });

  it("empty renders the muted nothing-here state", () => {
    renderWithUi(<AsyncBlock state="empty" />);
    expect(screen.getByText(/Nothing here yet/)).toBeTruthy();
  });

  it("ready renders children", () => {
    renderWithUi(
      <AsyncBlock state="ready">
        <p>content</p>
      </AsyncBlock>,
    );
    expect(screen.getByText("content")).toBeTruthy();
  });
});
