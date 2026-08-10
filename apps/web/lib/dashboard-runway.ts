// ─── Cash Runway Policy ─────────────────────────────────────────────────────
// Single source of truth for runway thresholds, formatting and briefing copy.
// Shared by the dashboard router (server) and the dashboard page (client) so
// the two can never drift apart: the same months produce the same tone, the
// same status label and the same alert text on both sides.
//
// Policy (months of cash at the current burn rate):
//   ≥ 6  → healthy (positive)  — "Healthy"
//   3–6  → caution (warning)   — "Caution" / "Monitor"
//   < 3  → critical (negative) — "Critical"
//   0    → no cash on hand (negative, always critical)
//   null → cash-flow positive (sustainable — not a finite number)

export const RUNWAY_HEALTHY_MONTHS = 6;
export const RUNWAY_CRITICAL_MONTHS = 3;

// Locale-pinned so server copy, client copy and unit tests all render the
// same grouping regardless of the runtime locale (matches the app-wide
// en-GM convention used by formatCurrency).
const BURN_FORMATTER = new Intl.NumberFormat("en-GM");

export type RunwayTone = "positive" | "warning" | "negative";

/** Months of cash at the current burn rate. 0 = no cash; null = sustainable. */
export function computeRunwayMonths(
  totalCashBalance: number,
  avgMonthlyBurn: number,
): number | null {
  if (totalCashBalance <= 0) return 0;
  if (avgMonthlyBurn > 0) return totalCashBalance / avgMonthlyBurn;
  return null;
}

/**
 * 6-month runway trajectory — the runway (in months) that each historical
 * cash balance implied, given the current burn rate. Empty when the business
 * is cash-flow positive (there is no depletion curve to draw).
 */
export function computeRunwaySparkline(
  cashSparkline: number[],
  avgMonthlyBurn: number,
): number[] {
  return avgMonthlyBurn > 0 ? cashSparkline.map((c) => c / avgMonthlyBurn) : [];
}

export function runwayTone(runwayMonths: number | null): RunwayTone {
  if (runwayMonths === null || runwayMonths >= RUNWAY_HEALTHY_MONTHS) {
    return "positive";
  }
  if (runwayMonths >= RUNWAY_CRITICAL_MONTHS) return "warning";
  return "negative";
}

export function runwayStatusLabel(runwayMonths: number | null): string {
  if (runwayMonths === 0) return "No cash";
  if (runwayMonths === null) return "Sustainable";
  if (runwayMonths >= RUNWAY_HEALTHY_MONTHS) return "Healthy";
  if (runwayMonths >= RUNWAY_CRITICAL_MONTHS) return "Caution";
  return "Critical";
}

/** Burn figure for alert copy — e.g. "5,000". Pinned locale (see above). */
export function formatBurn(burn: number): string {
  return BURN_FORMATTER.format(burn);
}

export function formatRunwayMonths(runwayMonths: number | null): string {
  if (runwayMonths === null) return "12+ months";
  if (runwayMonths === 0) return "No cash";
  return runwayMonths < 10
    ? `${runwayMonths.toFixed(1)} months`
    : `${Math.round(runwayMonths)} months`;
}

export type RunwayBriefing = {
  type: RunwayTone;
  title: string;
  value: string;
  detail: string;
  statusLabel: string;
};

/**
 * Executive-briefing card content for the runway metric. The detail names the
 * threshold explicitly ("Below the 6-month threshold — burn X/mo") so the
 * alert is self-explanatory, not just a number.
 */
export function buildRunwayBriefing(
  runwayMonths: number | null,
  avgMonthlyBurn: number,
): RunwayBriefing {
  const title =
    runwayMonths === 0
      ? "No cash on hand"
      : runwayMonths === null || runwayMonths >= RUNWAY_HEALTHY_MONTHS
        ? "Cash runway is healthy"
        : runwayMonths >= RUNWAY_CRITICAL_MONTHS
          ? "Cash runway running low"
          : "Cash runway is critical";

  const detail =
    runwayMonths === 0
      ? "Cash balance is zero or negative"
      : avgMonthlyBurn > 0
        ? runwayMonths !== null && runwayMonths < RUNWAY_HEALTHY_MONTHS
          ? `Below the ${RUNWAY_HEALTHY_MONTHS}-month threshold — burn ${formatBurn(avgMonthlyBurn)}/mo`
          : `At a burn of ${formatBurn(avgMonthlyBurn)}/mo`
        : "Cash-flow positive";

  // One label source for the shared bands (Healthy / Caution / Critical /
  // Sustainable) so the card chip and the briefing chip can never disagree.
  // The no-cash briefing chip keeps the severity word "Critical" — its title
  // and value already say "No cash" twice, a third would be noise.
  const statusLabel =
    runwayMonths === 0 ? "Critical" : runwayStatusLabel(runwayMonths);

  return {
    type: runwayTone(runwayMonths),
    title,
    value: formatRunwayMonths(runwayMonths),
    detail,
    statusLabel,
  };
}
