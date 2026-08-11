import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent, within } from "@testing-library/react";

import {
  SimulationProvider,
  useSimulation,
} from "@/lib/ai-ux/simulation-provider";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";

function pillRegion() {
  const region = document.querySelector('[role="status"]');
  if (!region) throw new Error("No Agents-at-work pill region found");
  return within(region as HTMLElement);
}

// ─── Harness ────────────────────────────────────────────────────────────────

function Probe() {
  const sim = useSimulation();
  if (!sim) return null;
  return (
    <div data-testid="probe">
      <span data-testid="trace">{sim.activeTraceId ?? "none"}</span>
      <span data-testid="open">{String(sim.overlayOpen)}</span>
      <span data-testid="status">{sim.status}</span>
      <button
        type="button"
        onClick={() => sim.openSimulation("bank-reconciliation")}
      >
        open-bank
      </button>
      <button type="button" onClick={() => sim.openSimulation("payroll-run")}>
        open-payroll
      </button>
      <button type="button" onClick={() => sim.dismissSimulation()}>
        dismiss
      </button>
      <button type="button" onClick={() => sim.reopenSimulation()}>
        reopen
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <SimulationProvider>
      <Probe />
    </SimulationProvider>,
  );
}

// ─── Provider lifecycle ─────────────────────────────────────────────────────

describe("SimulationProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts idle with no active trace", () => {
    renderHarness();
    expect(screen.getByTestId("trace").textContent).toBe("none");
    expect(screen.getByTestId("open").textContent).toBe("false");
    expect(screen.getByTestId("status").textContent).toBe("idle");
  });

  it("opens a trace, starts it, and keeps it running when minimized", async () => {
    vi.useFakeTimers();
    renderHarness();

    fireEvent.click(screen.getByText("open-bank"));
    expect(screen.getByTestId("trace").textContent).toBe("bank-reconciliation");
    expect(screen.getByTestId("open").textContent).toBe("true");
    expect(screen.getByTestId("status").textContent).toBe("running");

    // The global overlay is visible with the trace title.
    expect(screen.getByText("Bank statement auto-match")).toBeTruthy();

    // Simulate navigation: user closes the overlay but the run keeps going.
    // The overlay's close button calls minimizeSimulation via onClose.
    fireEvent.click(
      screen.getAllByText("Close")[0] ??
        screen.getAllByRole("button", { name: /close/i })[0]!,
    );
    expect(screen.getByTestId("open").textContent).toBe("false");
    expect(screen.getByTestId("status").textContent).toBe("running");

    // The run still progresses in the background (mid-run, not done).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(screen.getByTestId("status").textContent).toBe("running");
  });

  it("reaches done and the pill shows the completed state", async () => {
    vi.useFakeTimers();
    renderHarness();

    fireEvent.click(screen.getByText("open-bank"));
    // Minimize immediately so the pill is the visible surface.
    fireEvent.click(screen.getAllByRole("button", { name: /close/i })[0]!);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(240_000);
    });
    expect(screen.getByTestId("status").textContent).toBe("done");
    // The pill's own region shows the completed state.
    expect(pillRegion().getByText("Workflow complete")).toBeTruthy();
  });

  it("dismissing stops the run and clears the pill", async () => {
    vi.useFakeTimers();
    renderHarness();

    fireEvent.click(screen.getByText("open-bank"));
    fireEvent.click(screen.getByText("dismiss"));

    expect(screen.getByTestId("trace").textContent).toBe("none");
    expect(screen.getByTestId("status").textContent).toBe("idle");
    expect(screen.getByTestId("open").textContent).toBe("false");
  });

  it("switching traces mid-run restarts cleanly with the new trace", async () => {
    vi.useFakeTimers();
    renderHarness();

    // Start a run, minimize it, then switch to a different trace mid-run.
    fireEvent.click(screen.getByText("open-bank"));
    fireEvent.click(screen.getAllByRole("button", { name: /close/i })[0]!);
    expect(screen.getByTestId("trace").textContent).toBe("bank-reconciliation");

    fireEvent.click(screen.getByText("open-payroll"));
    expect(screen.getByTestId("trace").textContent).toBe("payroll-run");
    expect(screen.getByTestId("open").textContent).toBe("true");
    expect(screen.getByTestId("status").textContent).toBe("running");

    // The global overlay now shows the new trace's title.
    expect(screen.getByText("Payroll run automation")).toBeTruthy();
  });
});

// ─── Pill states ────────────────────────────────────────────────────────────

describe("AgentsAtWorkPill (via provider)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the running state with agent avatars and progress after minimizing", async () => {
    vi.useFakeTimers();
    renderHarness();

    fireEvent.click(screen.getByText("open-bank"));
    fireEvent.click(screen.getAllByRole("button", { name: /close/i })[0]!);

    const pill = pillRegion();
    expect(pill.getByText("Agents at work")).toBeTruthy();
    // Roster avatars render for the trace's participating agents
    // (bank-reconciliation: document, reconciliation, ledger).
    expect(document.querySelector('[title*="Document Agent"]')).not.toBeNull();
    expect(
      document.querySelector('[title*="Reconciliation Agent"]'),
    ).not.toBeNull();

    // Step counter present (X/Y).
    const counter = pill.getByText(/\/\d+/);
    expect(counter.textContent).toMatch(/^\d+\/\d+$/);
  });

  it("does not show when the overlay is open", () => {
    vi.useFakeTimers();
    renderHarness();

    fireEvent.click(screen.getByText("open-bank"));
    expect(screen.queryByText("Agents at work")).toBeNull();
  });

  it("reopens the overlay when clicked", async () => {
    vi.useFakeTimers();
    renderHarness();

    fireEvent.click(screen.getByText("open-bank"));
    fireEvent.click(screen.getAllByRole("button", { name: /close/i })[0]!);
    expect(screen.getByTestId("open").textContent).toBe("false");

    fireEvent.click(pillRegion().getByText("Agents at work"));
    expect(screen.getByTestId("open").textContent).toBe("true");
    // The overlay (with the trace title) is back.
    expect(screen.getByText("Bank statement auto-match")).toBeTruthy();
  });
});

// ─── Trigger wiring ─────────────────────────────────────────────────────────

describe("AiSimulationTrigger + provider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens the global simulation instead of a local overlay", () => {
    vi.useFakeTimers();
    render(
      <SimulationProvider>
        <AiSimulationTrigger traceId="payroll-run" label="Run with AI" />
      </SimulationProvider>,
    );

    fireEvent.click(screen.getByText("Run with AI"));
    // Global overlay shows the payroll trace.
    expect(screen.getByText("Payroll run automation")).toBeTruthy();
  });

  it("falls back to a local overlay without a provider", () => {
    vi.useFakeTimers();
    render(<AiSimulationTrigger traceId="payroll-run" label="Run with AI" />);

    fireEvent.click(screen.getByText("Run with AI"));
    // Local overlay renders the same trace.
    expect(screen.getByText("Payroll run automation")).toBeTruthy();
  });
});
