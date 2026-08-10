import { describe, it, expect } from "vitest";

import {
  RUNWAY_HEALTHY_MONTHS,
  RUNWAY_CRITICAL_MONTHS,
  computeRunwayMonths,
  computeRunwaySparkline,
  runwayTone,
  runwayStatusLabel,
  formatRunwayMonths,
  buildRunwayBriefing,
} from "@/lib/dashboard-runway";

describe("computeRunwayMonths", () => {
  it("returns 0 when there is no cash on hand", () => {
    expect(computeRunwayMonths(0, 5000)).toBe(0);
    expect(computeRunwayMonths(-2500, 5000)).toBe(0);
  });

  it("divides cash by burn when burning cash", () => {
    expect(computeRunwayMonths(12000, 4000)).toBe(3);
    expect(computeRunwayMonths(25000, 5000)).toBe(5);
  });

  it("returns null (sustainable) when burn is zero or negative", () => {
    expect(computeRunwayMonths(12000, 0)).toBeNull();
    expect(computeRunwayMonths(12000, -1000)).toBeNull();
  });
});

describe("computeRunwaySparkline", () => {
  it("maps each historical cash balance to months of runway", () => {
    const spark = computeRunwaySparkline([9000, 12000, 15000], 3000);
    expect(spark).toEqual([3, 4, 5]);
  });

  it("returns an empty array when cash-flow positive (no depletion curve)", () => {
    expect(computeRunwaySparkline([9000, 12000], 0)).toEqual([]);
    expect(computeRunwaySparkline([9000, 12000], -500)).toEqual([]);
  });
});

describe("runway thresholds", () => {
  it("treats exactly the healthy threshold as healthy", () => {
    expect(runwayTone(RUNWAY_HEALTHY_MONTHS)).toBe("positive");
    expect(runwayStatusLabel(RUNWAY_HEALTHY_MONTHS)).toBe("Healthy");
  });

  it("flags anything below the healthy threshold", () => {
    // The user's rule: flag when runway drops below 6 months.
    expect(runwayTone(RUNWAY_HEALTHY_MONTHS - 0.1)).toBe("warning");
    expect(runwayStatusLabel(RUNWAY_HEALTHY_MONTHS - 0.1)).toBe("Caution");
  });

  it("treats exactly the critical threshold as caution, below as critical", () => {
    expect(runwayTone(RUNWAY_CRITICAL_MONTHS)).toBe("warning");
    expect(runwayTone(RUNWAY_CRITICAL_MONTHS - 0.1)).toBe("negative");
    expect(runwayStatusLabel(RUNWAY_CRITICAL_MONTHS - 0.1)).toBe("Critical");
  });

  it("classifies no-cash and sustainable states", () => {
    expect(runwayTone(0)).toBe("negative");
    expect(runwayStatusLabel(0)).toBe("No cash");
    expect(runwayTone(null)).toBe("positive");
    expect(runwayStatusLabel(null)).toBe("Sustainable");
  });
});

describe("formatRunwayMonths", () => {
  it("formats fractional months below 10 and rounds above", () => {
    expect(formatRunwayMonths(4.2)).toBe("4.2 months");
    expect(formatRunwayMonths(9.9)).toBe("9.9 months");
    expect(formatRunwayMonths(10.4)).toBe("10 months");
    expect(formatRunwayMonths(12)).toBe("12 months");
  });

  it("handles the sentinel states", () => {
    expect(formatRunwayMonths(null)).toBe("12+ months");
    expect(formatRunwayMonths(0)).toBe("No cash");
  });
});

describe("buildRunwayBriefing", () => {
  it("surfaces a warning briefing when runway drops below 6 months", () => {
    const briefing = buildRunwayBriefing(4.2, 5000);
    expect(briefing.type).toBe("warning");
    expect(briefing.title).toBe("Cash runway running low");
    expect(briefing.value).toBe("4.2 months");
    // The threshold is named, not implied.
    expect(briefing.detail).toContain("Below the 6-month threshold");
    expect(briefing.detail).toContain("5,000");
  });

  it("surfaces a critical briefing below the critical threshold", () => {
    const briefing = buildRunwayBriefing(2, 8000);
    expect(briefing.type).toBe("negative");
    expect(briefing.title).toBe("Cash runway is critical");
    expect(briefing.statusLabel).toBe("Critical");
  });

  it("uses the unified Caution label in the 3–6 month band", () => {
    const briefing = buildRunwayBriefing(4.2, 5000);
    // Must match the Business Health card chip (runwayStatusLabel) — the two
    // surfaces can never disagree on the same months.
    expect(briefing.statusLabel).toBe("Caution");
    expect(runwayStatusLabel(4.2)).toBe("Caution");
  });

  it("reports no cash on hand as critical with a plain explanation", () => {
    const briefing = buildRunwayBriefing(0, 8000);
    expect(briefing.type).toBe("negative");
    expect(briefing.title).toBe("No cash on hand");
    expect(briefing.value).toBe("No cash");
    expect(briefing.detail).toBe("Cash balance is zero or negative");
  });

  it("treats healthy and sustainable runways as positive", () => {
    const healthy = buildRunwayBriefing(8, 3000);
    expect(healthy.type).toBe("positive");
    expect(healthy.statusLabel).toBe("Healthy");

    const sustainable = buildRunwayBriefing(null, -500);
    expect(sustainable.type).toBe("positive");
    expect(sustainable.value).toBe("12+ months");
    expect(sustainable.detail).toBe("Cash-flow positive");
    expect(sustainable.statusLabel).toBe("Sustainable");
  });

  it("names the burn rate on the healthy card too", () => {
    const briefing = buildRunwayBriefing(8, 2500);
    expect(briefing.detail).toBe("At a burn of 2,500/mo");
  });
});
