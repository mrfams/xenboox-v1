"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AgentId, AiUxTrace } from "./types";
import { getAiUxTrace } from "./traces";

// ─── Playback constants ─────────────────────────────────────────────────────

/** Fraction of a step's `ms` spent in the thinking shimmer. */
const THINK_FRACTION = 0.35;
/** Minimum per-char reveal delay (ms). */
const CHAR_MIN_MS = 7;
/** Maximum per-char reveal delay (ms) — long tool lines type faster. */
const CHAR_MAX_MS = 22;
/** Pause after a step settles before advancing (ms). */
const SETTLE_PAUSE_MS = 220;
/** Pause on the terminal step before flipping to done (ms). */
const COMPLETE_PAUSE_MS = 600;

export type SimulationPhase = "thinking" | "typing" | "settled";

export type SimulationStatus = "idle" | "running" | "done";

export type SimulationStepView = {
  step: NonNullable<AiUxTrace["steps"]>[number];
  index: number;
  phase: SimulationPhase;
  /** Characters revealed so far during the typing phase. */
  visible: number;
};

export type UseAiUxSimulationResult = {
  status: SimulationStatus;
  /** Current step view, or null while idle. */
  current: SimulationStepView | null;
  /** Steps fully settled so far. */
  settledCount: number;
  /** 0–1 run progress. */
  progress: number;
  /** Agents participating in the trace. */
  agents: AgentId[];
  /** Restart the run from step zero. */
  replay: () => void;
};

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Per-char delay that keeps short messages readable but never drags long ones. */
function charDelayMs(text: string, stepMs: number): number {
  const budget = stepMs * (1 - THINK_FRACTION) - SETTLE_PAUSE_MS;
  const target = budget / Math.max(1, text.length);
  return Math.min(CHAR_MAX_MS, Math.max(CHAR_MIN_MS, target));
}

/**
 * Plays a scripted agent-workflow trace for the AI-native UX simulations.
 *
 * Each step passes through `thinking` (shimmer + dots) → `typing` (typewriter
 * reveal) → `settled` (paused) before the next step begins. The run resolves
 * to `done` after the terminal `complete` step. Replaying cancels the in-flight
 * run and starts over.
 *
 * @param traceId id of the trace to play; `null` keeps the hook idle.
 * @param start when false, the run waits — and a cancelled run resets to idle.
 */
export function useAiUxSimulation(
  traceId: string | null,
  start = true,
): UseAiUxSimulationResult {
  const trace = useMemo(
    () => (traceId ? (getAiUxTrace(traceId) ?? null) : null),
    [traceId],
  );

  const [runId, setRunId] = useState(0);
  const [status, setStatus] = useState<SimulationStatus>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<SimulationPhase>("thinking");
  const [visible, setVisible] = useState(0);

  const startRef = useRef(start);

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  const replay = useCallback(() => {
    setRunId((run) => run + 1);
  }, []);

  useEffect(() => {
    // Not playing: keep (or return to) the idle state so a cancelled run can
    // never leave the overlay frozen mid-"running".
    if (!trace || !startRef.current) {
      setStatus("idle");
      return;
    }

    let cancelled = false;

    const run = async () => {
      setStatus("running");
      setStepIndex(0);
      setPhase("thinking");
      setVisible(0);

      for (let i = 0; i < trace.steps.length; i++) {
        if (cancelled) return;
        const step = trace.steps[i];

        setStepIndex(i);
        setPhase("thinking");
        setVisible(0);

        // Terminal step: no thinking shimmer or typewriter — settle briefly.
        if (step.kind === "complete") {
          setPhase("settled");
          setVisible(step.text.length);
          await delay(COMPLETE_PAUSE_MS);
          continue;
        }

        await delay(step.ms * THINK_FRACTION);
        if (cancelled) return;

        setPhase("typing");
        const text = step.kind === "tool" ? step.tool : step.text;
        const charDelay = charDelayMs(text, step.ms);
        for (let c = 1; c <= text.length; c++) {
          if (cancelled) return;
          setVisible(c);
          await delay(charDelay);
        }
        if (cancelled) return;

        setPhase("settled");
        await delay(SETTLE_PAUSE_MS);
      }

      if (cancelled) return;
      setStatus("done");
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [trace, runId, start]);

  const settledCount =
    status === "done" ? (trace?.steps.length ?? 0) : Math.max(0, stepIndex);
  const progress = trace ? settledCount / trace.steps.length : 0;

  const current: SimulationStepView | null =
    status === "idle" || !trace
      ? null
      : { step: trace.steps[stepIndex], index: stepIndex, phase, visible };

  return {
    status,
    current,
    settledCount,
    progress,
    agents: trace?.agents ?? [],
    replay,
  };
}
