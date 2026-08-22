import { router } from "@/lib/trpc/server";
import { getDashboardData } from "./get-dashboard-data";
import { getScenarioData } from "./get-scenario-data";
import { getDashboardSuggestions } from "./get-dashboard-suggestions";
import { detectAnomalies } from "./detect-anomalies";
import { getAiNarrative } from "./get-ai-narrative";
import { getAiBriefing } from "./get-ai-briefing";
import { getAiForecast } from "./get-ai-forecast";

// ─── Dashboard Router ──────────────────────────────────────────────────────
// Each procedure is in its own file to reduce TypeScript type inference
// complexity. The original 2177-line monolith caused TS to hit complexity
// limits on Vercel's constrained build machine (2 cores, 8 GB).
export const dashboardRouter = router({
  getDashboardData,
  getScenarioData,
  getDashboardSuggestions,
  detectAnomalies,
  getAiNarrative,
  getAiBriefing,
  getAiForecast,
});
