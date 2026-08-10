import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({ taxConfig: { listRules: { invalidate: vi.fn() } } }),
    taxConfig: {
      listRules: {
        useQuery: vi.fn().mockReturnValue({
          data: { rules: [], count: 0 },
          isLoading: false,
        }),
      },
      createRule: {
        useMutation: () => ({ mutateAsync: vi.fn(), isLoading: false }),
      },
      updateRule: {
        useMutation: () => ({ mutateAsync: vi.fn(), isLoading: false }),
      },
      deactivateRule: {
        useMutation: () => ({ mutateAsync: vi.fn(), isLoading: false }),
      },
      reactivateRule: {
        useMutation: () => ({ mutateAsync: vi.fn(), isLoading: false }),
      },
      upsertOverride: {
        useMutation: () => ({ mutateAsync: vi.fn(), isLoading: false }),
      },
      deleteOverride: {
        useMutation: () => ({ mutateAsync: vi.fn(), isLoading: false }),
      },
      preview: {
        useQuery: vi.fn().mockReturnValue({
          data: undefined,
          isLoading: false,
        }),
      },
    },
  },
}));

vi.mock("@/lib/entity-context", () => ({
  useEntity: () => ({ entityId: "entity-1", isLoaded: true }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { TaxesSection } from "@/components/settings/taxes-section";

describe("TaxesSection — self-service tax management UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the empty state with a create CTA when no rules exist", () => {
    render(<TaxesSection />);
    expect(
      screen.getByText(/No tax rules configured for/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Create your first tax/i)).toBeInTheDocument();
  });

  it("renders the rule list when rules exist", async () => {
    const trpcMock = await import("@/lib/trpc/client");
    vi.mocked(trpcMock.trpc.taxConfig.listRules.useQuery).mockReturnValue({
      data: {
        rules: [
          {
            id: "rule-1",
            country: "GM",
            ruleType: "vat",
            name: "Gambia VAT",
            version: 2,
            status: "active",
            rateOrBands: { type: "rate", rate: 0.15 },
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            createdAt: new Date(),
          },
        ],
        count: 1,
      },
      isLoading: false,
    } as never);

    render(<TaxesSection />);
    expect(screen.getByText("Gambia VAT")).toBeInTheDocument();
    expect(screen.getByText("GM")).toBeInTheDocument();
  });
});
