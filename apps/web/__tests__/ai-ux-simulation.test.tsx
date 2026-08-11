import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { renderHook } from "@testing-library/react";

import { AGENTS, type AgentId } from "@/lib/ai-ux/types";
import { AI_UX_TRACES, getAiUxTrace } from "@/lib/ai-ux/traces";
import {
  useAiUxSimulation,
  type UseAiUxSimulationResult,
} from "@/lib/ai-ux/use-ai-ux-simulation";
import { SimulationOverlay } from "@/components/ai-ux/simulation-overlay";
import { AI_UX_ENTRIES } from "@/lib/explore/ai-ux-catalog";

// ─── Data integrity ───────────────────────────────────────────────────────

describe("AI UX trace data", () => {
  it("has unique trace ids and every trace references real agents", () => {
    const ids = new Set(AI_UX_TRACES.map((t) => t.id));
    expect(ids.size).toBe(AI_UX_TRACES.length);

    for (const trace of AI_UX_TRACES) {
      expect(trace.title.length).toBeGreaterThan(0);
      expect(trace.steps.length).toBeGreaterThan(3);

      for (const step of trace.steps) {
        expect(Object.keys(AGENTS)).toContain(step.agent);
      }
      for (const agentId of trace.agents) {
        expect(Object.keys(AGENTS)).toContain(agentId);
      }
      // Every trace ends on a terminal complete step.
      expect(trace.steps[trace.steps.length - 1].kind).toBe("complete");
    }
  });

  it("looks up traces by id and returns undefined for unknown ids", () => {
    expect(getAiUxTrace("month-end-close")?.title).toBe(
      "Autonomous month-end close",
    );
    expect(getAiUxTrace("does-not-exist")).toBeUndefined();
  });

  it("every catalog entry with a traceId resolves to a real trace", () => {
    for (const entry of AI_UX_ENTRIES) {
      if (!entry.traceId) continue;
      expect(
        getAiUxTrace(entry.traceId),
        `catalog entry '${entry.id}' references missing trace '${entry.traceId}'`,
      ).toBeDefined();
    }
  });
});

// ─── Hook playback ────────────────────────────────────────────────────────

describe("useAiUxSimulation", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("plays a trace through to completion", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useAiUxSimulation("audit-verification", true),
    );

    // Run starts immediately.
    expect(result.current.status).toBe("running");
    expect(result.current.agents.length).toBeGreaterThan(0);
    expect(result.current.current).not.toBeNull();

    // Advance through every thinking/typing phase.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    expect(result.current.status).toBe("done");
    expect(result.current.progress).toBe(1);
    const trace = getAiUxTrace("audit-verification");
    expect(result.current.settledCount).toBe(trace?.steps.length);
  });

  it("stays idle when no trace id is given", () => {
    const { result } = renderHook(() => useAiUxSimulation(null, true));
    expect(result.current.status).toBe("idle");
    expect(result.current.current).toBeNull();
    expect(result.current.progress).toBe(0);
  });

  it("resets to idle when stopped mid-run and replays cleanly on reopen", async () => {
    vi.useFakeTimers();
    type SimProps = { traceId: string | null; start: boolean };
    const { result, rerender } = renderHook<UseAiUxSimulationResult, SimProps>(
      ({ traceId, start }: SimProps) => useAiUxSimulation(traceId, start),
      { initialProps: { traceId: "bank-reconciliation", start: true } },
    );

    // Run partway through the trace.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(result.current.status).toBe("running");

    // Closing the overlay mid-run cancels the run and returns to idle.
    await act(async () => {
      rerender({ traceId: null, start: false });
    });
    expect(result.current.status).toBe("idle");

    // Reopening must start fresh — never stuck at "running".
    await act(async () => {
      rerender({ traceId: "bank-reconciliation", start: true });
    });
    expect(result.current.status).toBe("running");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(result.current.status).toBe("done");
    expect(result.current.progress).toBe(1);
  });

  it("replays from the start after completion", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useAiUxSimulation("transaction-categorization", true),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(result.current.status).toBe("done");

    // Replay: let the runId update flush (effect schedules its first timer),
    // then advance the clock.
    await act(async () => {
      result.current.replay();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(result.current.status).toBe("done");
    expect(result.current.progress).toBe(1);
  });
});

// ─── Overlay ──────────────────────────────────────────────────────────────

describe("SimulationOverlay", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the trace title, agent roster, and reaches the done state", async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <SimulationOverlay open traceId="month-end-close" onClose={onClose} />,
    );

    expect(screen.getByText("Autonomous month-end close")).toBeInTheDocument();
    expect(screen.getByText("AI Simulation")).toBeInTheDocument();
    // Roster lists participating agents (names also appear in the step feed).
    expect(screen.getAllByText("CFO Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ledger Agent").length).toBeGreaterThan(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });

    expect(screen.getByText("Workflow complete")).toBeInTheDocument();
    expect(screen.getByText("Replay")).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <SimulationOverlay open traceId="audit-verification" onClose={onClose} />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is inert when closed", () => {
    const onClose = vi.fn();
    render(
      <SimulationOverlay
        open={false}
        traceId="audit-verification"
        onClose={onClose}
      />,
    );
    // aria-hidden removes the dialog from the a11y tree, so query the DOM directly.
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.className).toContain("pointer-events-none");
    expect(dialog?.getAttribute("aria-hidden")).toBe("true");
  });
});

// ─── Types sanity (agents registry is complete for every trace) ────────────

describe("agent registry", () => {
  it("every agent referenced across traces is registered", () => {
    const referenced = new Set<AgentId>();
    for (const trace of AI_UX_TRACES) {
      for (const step of trace.steps) referenced.add(step.agent);
      for (const a of trace.agents) referenced.add(a);
    }
    for (const id of referenced) {
      expect(AGENTS[id], `missing registry entry for '${id}'`).toBeDefined();
      expect(AGENTS[id].avatar).toMatch(/^from-/);
      expect(AGENTS[id].tier).toBeGreaterThanOrEqual(1);
      expect(AGENTS[id].tier).toBeLessThanOrEqual(3);
    }
  });
});
