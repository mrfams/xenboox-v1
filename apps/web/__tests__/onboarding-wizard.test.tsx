import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

// ─── Hoisted tRPC client mock ─────────────────────────────────────────────
//
// The wizard page calls trpc.onboarding.<proc>.useMutation() / useQuery().
// We hoist a factory that returns stable mutation fns (reused across re-renders)
// so tests can assert exactly what the wizard sent to the backend.

const trpcMocks = vi.hoisted(() => {
  const mutations: Record<string, ReturnType<typeof vi.fn>> = {};
  const makeMutation = (key: string) => {
    if (!mutations[key]) {
      mutations[key] = vi.fn().mockResolvedValue({ success: true });
    }
    return {
      mutateAsync: mutations[key],
      isLoading: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    };
  };
  return {
    mutations,
    hooks: {
      updateRoutingAnswer: {
        useMutation: () => makeMutation("updateRoutingAnswer"),
      },
      setBusinessStart: { useMutation: () => makeMutation("setBusinessStart") },
      setDetailDepth: { useMutation: () => makeMutation("setDetailDepth") },
      connectData: { useMutation: () => makeMutation("connectData") },
      getCoaSuggestions: {
        useQuery: () => ({
          data: {
            templateId: "tpl-1",
            accounts: [
              { code: "1010", name: "Cash", type: "asset" },
              { code: "4010", name: "Sales Revenue", type: "revenue" },
            ],
          },
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      confirmCoa: { useMutation: () => makeMutation("confirmCoa") },
      confirmOpeningBalance: {
        useMutation: () => makeMutation("confirmOpeningBalance"),
      },
      completeFlow: { useMutation: () => makeMutation("completeFlow") },
    },
  };
});

vi.mock("@/lib/trpc/client", () => ({
  trpc: { onboarding: trpcMocks.hooks },
}));

vi.mock("@/lib/entity-context", () => ({
  useEntity: () => ({ entityId: "entity-1", isLoaded: true }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

// Light shadcn stubs — the wizard only needs Button/Card/CardContent and the
// tests drive disabled states + clicks, so native elements are sufficient.
vi.mock("@/components/ui", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type,
  }: React.ComponentProps<"button">) => (
    <button type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import OnboardingPage from "@/app/(auth)/register/onboarding/page";

// The wizard's click handlers await a mutation before setState, so every
// click that advances the flow must be flushed with act/waitFor.
async function clickAndWait(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
    // flush the resolved mutation microtask + re-render
    await Promise.resolve();
  });
}

describe("Onboarding Wizard — five record-keeping categories (spec §2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWizard() {
    return render(<OnboardingPage />);
  }

  it("renders all five category options on the routing step", () => {
    renderWizard();

    expect(screen.getByText("We're a brand-new business")).toBeInTheDocument();
    expect(screen.getByText("We use accounting software")).toBeInTheDocument();
    expect(
      screen.getByText("We keep records in Excel or on paper"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Bank / mobile money statements only"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("We don't have any records or statements"),
    ).toBeInTheDocument();
  });

  describe("Category A — brand-new business", () => {
    it("shows pre-incorporation + start date follow-up, and NO detail-depth question", async () => {
      renderWizard();
      await clickAndWait(screen.getByText("We're a brand-new business"));

      // Follow-up: pre-incorporation question + start date
      expect(
        await screen.findByText(
          /Has any money moved for this business already/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/When did the business start/),
      ).toBeInTheDocument();

      // Continue is gated on the pre-incorporation answer
      expect(screen.getByRole("button", { name: /Continue/ })).toBeDisabled();

      // NO transaction-detail-depth question for a brand-new business
      expect(
        screen.queryByText(/How much transaction-level detail/),
      ).not.toBeInTheDocument();
    });

    it("routes the pre-incorporation 'yes' branch to the scoped mini-D window", async () => {
      renderWizard();
      await clickAndWait(screen.getByText("We're a brand-new business"));
      await clickAndWait(screen.getByText("Yes, before registration"));

      expect(
        screen.getByText(/reconstruct just the period before your start date/),
      ).toBeInTheDocument();
      // Continue unlocks once the answer is given
      expect(
        screen.getByRole("button", { name: /Continue/ }),
      ).not.toBeDisabled();
    });
  });

  describe("Categories B/C/D — detail depth (spec §4.2)", () => {
    it.each([
      ["We use accounting software", "professional_software"],
      ["We keep records in Excel or on paper", "manual_records"],
      ["Bank / mobile money statements only", "statements_only"],
    ])("shows the 3 depth options for %s", async (label, _key) => {
      renderWizard();
      await clickAndWait(screen.getByText(label));

      expect(
        await screen.findByText(/How much transaction-level detail/),
      ).toBeInTheDocument();
      expect(screen.getByText("Last 12 months")).toBeInTheDocument();
      expect(screen.getByText("Last 3 years")).toBeInTheDocument();
      expect(screen.getByText("Full history")).toBeInTheDocument();

      // No pre-incorporation question for these categories
      expect(
        screen.queryByText(/Has any money moved for this business already/),
      ).not.toBeInTheDocument();
    });

    it("sends the chosen depth to setDetailDepth", async () => {
      renderWizard();
      await clickAndWait(screen.getByText("We use accounting software"));
      await clickAndWait(screen.getByText("Full history"));
      await clickAndWait(screen.getByRole("button", { name: /Continue/ }));

      expect(trpcMocks.mutations.setDetailDepth).toHaveBeenCalledWith({
        depth: "full_history",
      });
    });
  });

  describe("Category E — no records", () => {
    it("explains that tracking starts from today (no depth, no pre-incorporation)", async () => {
      renderWizard();
      await clickAndWait(
        screen.getByText("We don't have any records or statements"),
      );

      expect(screen.getByText("We'll start from today")).toBeInTheDocument();
      expect(
        screen.queryByText(/How much transaction-level detail/),
      ).not.toBeInTheDocument();
    });

    async function walkToOpeningBalance() {
      await clickAndWait(
        screen.getByText("We don't have any records or statements"),
      );
      await clickAndWait(screen.getByRole("button", { name: /Continue/ }));

      // Entity setup → pick a segment
      await clickAndWait(screen.getByText("Services"));

      // Data connections → skip
      await clickAndWait(screen.getByRole("button", { name: /Skip for now/ }));

      // CoA review → confirm (templateId from the mocked getCoaSuggestions)
      await clickAndWait(
        screen.getByRole("button", { name: /Confirm accounts/ }),
      );

      return screen.findByRole("heading", {
        name: /Confirm your opening balance/,
      });
    }

    it("walks to the opening-balance step and the escape path sends rows:[], escape:true", async () => {
      renderWizard();
      const heading = await walkToOpeningBalance();
      expect(heading).toBeInTheDocument();
      expect(screen.getByLabelText(/Cash on hand/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Money owed to you/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Anything you owe/)).toBeInTheDocument();

      // Escape: "I don't know these figures yet" → submit becomes "Start from today"
      await clickAndWait(screen.getByText("I don't know these figures yet"));
      const submit = screen.getByRole("button", { name: /Start from today/ });
      expect(submit).toBeInTheDocument();

      await clickAndWait(submit);

      expect(trpcMocks.mutations.confirmOpeningBalance).toHaveBeenCalledWith({
        rows: [],
        escape: true,
      });
    });

    it("sends the entered figures as account rows when not escaping", async () => {
      renderWizard();
      await walkToOpeningBalance();

      fireEvent.change(screen.getByLabelText(/Cash on hand/), {
        target: { value: "15000" },
      });
      fireEvent.change(screen.getByLabelText(/Money owed to you/), {
        target: { value: "5000" },
      });
      fireEvent.change(screen.getByLabelText(/Anything you owe/), {
        target: { value: "3000" },
      });

      await clickAndWait(
        screen.getByRole("button", { name: /Confirm opening balance/ }),
      );

      expect(trpcMocks.mutations.confirmOpeningBalance).toHaveBeenCalledWith({
        rows: [
          { code: "1010", amount: 15000 },
          { code: "1100", amount: 5000 },
          { code: "2010", amount: -3000 },
        ],
        escape: false,
      });
    });
  });

  describe("Category A step list", () => {
    it("excludes the data-connection + historical-pull steps for brand_new", async () => {
      renderWizard();
      await clickAndWait(screen.getByText("We're a brand-new business"));

      const steps = screen.getAllByText(
        /How you keep records|Business details|Chart of accounts|Your first look/,
      );
      expect(steps.length).toBeGreaterThanOrEqual(4);
      await waitFor(() => {
        expect(screen.queryByText(/Connect your data/)).not.toBeInTheDocument();
      });
    });
  });
});
