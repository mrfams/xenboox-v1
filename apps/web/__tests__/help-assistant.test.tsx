import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { HelpAssistant } from "@/components/dashboard/help-assistant";

vi.mock("@/lib/entity-context", () => ({
  useEntity: () => ({ entityId: "entity-1" }),
}));

describe("HelpAssistant", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders greeting and suggestion chips", () => {
    render(<HelpAssistant />);
    expect(screen.getByText("Help Assistant")).toBeInTheDocument();
    expect(screen.getByText(/I know Xenboox inside-out/)).toBeInTheDocument();
    expect(screen.getByText("How do I create an invoice?")).toBeInTheDocument();
    expect(
      screen.getByText("How do I reconcile my bank account?"),
    ).toBeInTheDocument();
  });

  it("sends a question to the API and renders the streamed answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          const chunks = [
            `data: ${JSON.stringify({ event: "token", content: "Go to " })}\n\n`,
            `data: ${JSON.stringify({ event: "token", content: "Invoicing" })}\n\n`,
            `data: ${JSON.stringify({ event: "done" })}\n\n`,
          ];
          let i = 0;
          return {
            read: async () => {
              if (i < chunks.length) {
                const value = new TextEncoder().encode(chunks[i]);
                i += 1;
                return { done: false, value };
              }
              return { done: true, value: undefined };
            },
          };
        },
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HelpAssistant />);
    const input = screen.getByPlaceholderText(
      "Ask how to do something…",
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { value: "How do I create an invoice?" },
    });
    fireEvent.click(screen.getByLabelText("Ask the help assistant"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/help/assist",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            question: "How do I create an invoice?",
            entityId: "entity-1",
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText("Go to Invoicing", { exact: false }),
      ).toBeInTheDocument();
    });
  });

  it("shows an error message when the API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Rate limit exceeded" }),
      }),
    );

    render(<HelpAssistant />);
    const input = screen.getByPlaceholderText(
      "Ask how to do something…",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Help me" } });
    fireEvent.click(screen.getByLabelText("Ask the help assistant"));

    await waitFor(() => {
      expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
    });
  });

  it("links to the AI Command Center for deeper help", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          let done = false;
          return {
            read: async () => {
              if (!done) {
                done = true;
                return {
                  done: false,
                  value: new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      event: "token",
                      content: "Try the chat.",
                    })}\n\n`,
                  ),
                };
              }
              return { done: true, value: undefined };
            },
          };
        },
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<HelpAssistant />);
    const input = container.querySelector(
      'input[placeholder="Ask how to do something…"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Help" } });
    fireEvent.click(
      container.querySelector('[aria-label="Ask the help assistant"]')!,
    );

    await waitFor(() => {
      const link = container.querySelector('a[href="/dashboard/chat"]');
      expect(link).not.toBeNull();
    });
  });
});
