import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { OnboardingLiveness } from "@/components/onboarding/onboarding-liveness";

describe("OnboardingLiveness — conditional per category (spec §7.4)", () => {
  it("renders the clean-slate state for Category A (brand_new) with NO pull UI", () => {
    render(<OnboardingLiveness sourceType="brand_new" />);

    expect(screen.getByText("Onboarding — Clean Slate")).toBeInTheDocument();
    expect(
      screen.getByText(/Category A — brand-new business/),
    ).toBeInTheDocument();
    // No fabricated-looking progress: never implies a pull is running
    expect(
      screen.queryByText(/Historical pull running/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/HISTORICAL_PULL_RUNNING/),
    ).not.toBeInTheDocument();
  });

  it("renders the opening-balance state for Category E (no_records) with NO pull UI", () => {
    render(<OnboardingLiveness sourceType="no_records" />);

    expect(
      screen.getByText("Onboarding — Opening Balance"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Category E — no records/)).toBeInTheDocument();
    expect(screen.getByText(/Opening balance confirmed/)).toBeInTheDocument();
    expect(
      screen.queryByText(/Historical pull running/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/HISTORICAL_PULL_RUNNING/),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["professional_software"],
    ["manual_records"],
    ["statements_only"],
  ] as const)("renders the historical-pull panel for %s", (sourceType) => {
    render(<OnboardingLiveness sourceType={sourceType} />);

    expect(
      screen.getByText("Onboarding / Historical Data Pull"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Historical pull running/)).toBeInTheDocument();
    // The state label + live status both show the state — at least one match
    expect(
      screen.getAllByText(/HISTORICAL_PULL_RUNNING/).length,
    ).toBeGreaterThan(0);
  });

  it("defaults to the historical-pull panel when sourceType is unknown/undefined", () => {
    render(<OnboardingLiveness />);
    expect(
      screen.getByText("Onboarding / Historical Data Pull"),
    ).toBeInTheDocument();
  });

  describe("First Look terminal text — driven by category, never fabricates", () => {
    it("Category A: clean-slate message, never 'I've reviewed your records'", () => {
      render(
        <OnboardingLiveness sourceType="brand_new" showFirstLookDelivered />,
      );

      expect(screen.getByText(/clean slate/)).toBeInTheDocument();
      expect(
        screen.queryByText(
          /I&apos;ve reviewed your records|I've reviewed your records/,
        ),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/5,963 transactions/)).not.toBeInTheDocument();
    });

    it("Category E: starts-from-today message with an opening balance, no records found", () => {
      render(
        <OnboardingLiveness sourceType="no_records" showFirstLookDelivered />,
      );

      // Badge + first-look message both carry the copy — at least one match
      expect(screen.getAllByText(/opening balance/).length).toBeGreaterThan(0);
      expect(screen.queryByText(/5,963 transactions/)).not.toBeInTheDocument();
    });

    it("B/C/D: cites the processed summary specifics", () => {
      render(
        <OnboardingLiveness
          sourceType="statements_only"
          showFirstLookDelivered
        />,
      );

      expect(
        screen.getByText(/5,963 transactions categorized/),
      ).toBeInTheDocument();
    });
  });
});
