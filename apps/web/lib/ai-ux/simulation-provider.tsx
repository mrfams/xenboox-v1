"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  useAiUxSimulation,
  type UseAiUxSimulationResult,
} from "./use-ai-ux-simulation";

import { SimulationOverlay } from "@/components/ai-ux/simulation-overlay";
import { AgentsAtWorkPill } from "@/components/ai-ux/agents-at-work-pill";

// ─── Context ────────────────────────────────────────────────────────────────
//
// Lifts a simulation run out of the page that started it. The provider lives
// in the dashboard layout, so a run keeps playing (and stays reachable) across
// route changes — the "agents keep working while you browse" pattern used by
// Cursor, Devin and Conductor. Triggers call `openSimulation(traceId)`; the
// single global overlay + the Agents-at-work pill are rendered here.

export interface SimulationContextValue extends UseAiUxSimulationResult {
  /** Id of the trace currently running (null when idle). */
  activeTraceId: string | null;
  /** Whether the global overlay is visible right now. */
  overlayOpen: boolean;
  /** Start (or switch to) a trace and show the overlay. */
  openSimulation: (traceId: string) => void;
  /** Hide the overlay but keep the run going in the background. */
  minimizeSimulation: () => void;
  /** Re-open the overlay for the active run. */
  reopenSimulation: () => void;
  /** Stop the run entirely and clear the pill + overlay. */
  dismissSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const simulation = useAiUxSimulation(activeTraceId, activeTraceId !== null);

  const openSimulation = useCallback((traceId: string) => {
    setActiveTraceId(traceId);
    setOverlayOpen(true);
  }, []);

  const minimizeSimulation = useCallback(() => setOverlayOpen(false), []);

  const reopenSimulation = useCallback(() => setOverlayOpen(true), []);

  const dismissSimulation = useCallback(() => {
    setActiveTraceId(null);
    setOverlayOpen(false);
  }, []);

  const value = useMemo<SimulationContextValue>(
    () => ({
      ...simulation,
      activeTraceId,
      overlayOpen,
      openSimulation,
      minimizeSimulation,
      reopenSimulation,
      dismissSimulation,
    }),
    [
      simulation,
      activeTraceId,
      overlayOpen,
      openSimulation,
      minimizeSimulation,
      reopenSimulation,
      dismissSimulation,
    ],
  );

  return (
    <SimulationContext.Provider value={value}>
      {children}

      {/* Single global overlay — stays mounted so a minimized run keeps going. */}
      <SimulationOverlay
        open={overlayOpen}
        onClose={minimizeSimulation}
        traceId={activeTraceId ?? ""}
        simulation={simulation}
      />

      {/* Global "Agents at work" pill (bottom-center). */}
      <AgentsAtWorkPill />
    </SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextValue | null {
  return useContext(SimulationContext);
}
