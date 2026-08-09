import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import {
  ArtifactViewer,
  AiEditToolbar,
} from "@/components/workspace/artifact-viewer";
import type { ChatArtifactRef } from "@/lib/chat/artifact-types";

const trpcMocks = vi.hoisted(() => {
  const htmlContent =
    "<!DOCTYPE html><html><body><h1>Financial Summary</h1><p>Revenue: GMD 1,000</p></body></html>";
  const editedContent =
    "<!DOCTYPE html><html><body><h1>Financial Summary</h1><p>Revenue: GMD 1,000 (EDITED MARKER)</p></body></html>";
  return {
    htmlContent,
    editedContent,
    editResult: { content: editedContent, editCount: 1 },
    undoResult: { content: htmlContent, editCount: 0 },
    getByIdResult: {
      data: {
        id: "art-1",
        name: "Financial Summary - 2026-07",
        kind: "report",
        mimeType: "text/html",
        sizeBytes: 2048,
        metadata: { content: htmlContent },
      },
      isLoading: false,
      isError: false,
    },
    downloadMutation: {
      mutate: vi.fn(),
      isPending: false,
    },
    editMutation: {
      mutate: vi.fn(
        (
          _vars: unknown,
          opts?: {
            onSuccess?: (res: { content: string; editCount: number }) => void;
          },
        ) => {
          opts?.onSuccess?.(trpcMocks.editResult);
        },
      ),
      isPending: false,
    },
    undoMutation: {
      mutate: vi.fn(
        (
          _vars: unknown,
          opts?: {
            onSuccess?: (res: { content: string; editCount: number }) => void;
          },
        ) => {
          opts?.onSuccess?.(trpcMocks.undoResult);
        },
      ),
      isPending: false,
    },
  };
});

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    artifact: {
      getById: {
        useQuery: () => trpcMocks.getByIdResult,
      },
      download: {
        useMutation: () => trpcMocks.downloadMutation,
      },
      editContent: {
        useMutation: () => trpcMocks.editMutation,
      },
      undoEdit: {
        useMutation: () => trpcMocks.undoMutation,
      },
    },
  },
}));

function makeArtifact(
  overrides: Partial<ChatArtifactRef> = {},
): ChatArtifactRef {
  return {
    artifactId: "art-1",
    name: "Financial Summary - 2026-07",
    docType: "Summary",
    mimeType: "text/html",
    sizeBytes: 2048,
    ...overrides,
  };
}

function frame(): HTMLIFrameElement {
  return screen.getByTitle("Financial Summary - 2026-07") as HTMLIFrameElement;
}

describe("ArtifactViewer", () => {
  beforeEach(() => {
    trpcMocks.getByIdResult.data.metadata.content = trpcMocks.htmlContent;
    trpcMocks.getByIdResult.isLoading = false;
    trpcMocks.getByIdResult.isError = false;
    trpcMocks.editResult = { content: trpcMocks.editedContent, editCount: 1 };
    trpcMocks.undoResult = { content: trpcMocks.htmlContent, editCount: 0 };
    trpcMocks.downloadMutation.mutate.mockClear();
    trpcMocks.editMutation.mutate.mockClear();
    trpcMocks.undoMutation.mutate.mockClear();
  });

  it("renders the artifact name and inline HTML content in a dialog", () => {
    render(<ArtifactViewer artifact={makeArtifact()} onClose={() => {}} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Financial Summary - 2026-07")).toBeInTheDocument();

    const frame = screen.getByTitle("Financial Summary - 2026-07");
    expect(frame.tagName).toBe("IFRAME");
    expect((frame as HTMLIFrameElement).srcdoc).toContain("Financial Summary");
  });

  it("renders CSV artifacts as a table", () => {
    trpcMocks.getByIdResult.data.metadata.content =
      "Account Code,Account Name,Debits\n1010,Cash,15000";
    render(
      <ArtifactViewer
        artifact={makeArtifact({
          name: "trial-balance.csv",
          docType: "Export",
          mimeType: "text/csv",
        })}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("15000")).toBeInTheDocument();
  });

  it("shows a loading state while fetching", () => {
    trpcMocks.getByIdResult.isLoading = true;
    render(<ArtifactViewer artifact={makeArtifact()} onClose={() => {}} />);

    expect(screen.getByText("Opening document...")).toBeInTheDocument();
  });

  it("shows an error state when the artifact cannot be loaded", () => {
    trpcMocks.getByIdResult.isError = true;
    render(<ArtifactViewer artifact={makeArtifact()} onClose={() => {}} />);

    expect(screen.getByText("Couldn't open this document")).toBeInTheDocument();
  });

  it("calls onClose from the close button and the Escape key", () => {
    const onClose = vi.fn();
    render(<ArtifactViewer artifact={makeArtifact()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /Close viewer/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("shows an edit hint and an Ask AI affordance for editable documents", () => {
    render(<ArtifactViewer artifact={makeArtifact()} onClose={() => {}} />);

    expect(
      screen.getByText(/Select any text to ask AI to change or redo it/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ask AI/i })).toBeInTheDocument();
  });

  it("submits a whole-document AI edit and re-renders the updated content", () => {
    render(<ArtifactViewer artifact={makeArtifact()} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /Ask AI/i }));

    const toolbar = screen.getByRole("dialog", {
      name: /Edit document with AI/i,
    });
    expect(toolbar).toBeInTheDocument();
    expect(screen.getByText("whole document")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("AI edit instruction"), {
      target: { value: "Make it clearer" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Send AI edit request" }),
    );

    expect(trpcMocks.editMutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "whole",
        instruction: "Make it clearer",
      }),
      expect.anything(),
    );
    expect(frame().srcdoc).toContain("EDITED MARKER");
    expect(screen.getByText("Edited ×1")).toBeInTheDocument();
    expect(screen.getByText("Document updated")).toBeInTheDocument();
  });

  it("undoes the last AI edit back to the original content", () => {
    render(<ArtifactViewer artifact={makeArtifact()} onClose={() => {}} />);

    // Apply an edit first
    fireEvent.click(screen.getByRole("button", { name: /Ask AI/i }));
    fireEvent.change(screen.getByLabelText("AI edit instruction"), {
      target: { value: "Make it clearer" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Send AI edit request" }),
    );
    expect(frame().srcdoc).toContain("EDITED MARKER");

    // Undo
    fireEvent.click(screen.getByRole("button", { name: /Undo/i }));
    expect(trpcMocks.undoMutation.mutate).toHaveBeenCalledWith(
      { id: "art-1" },
      expect.anything(),
    );
    expect(frame().srcdoc).toContain("Revenue: GMD 1,000<");
    expect(frame().srcdoc).not.toContain("EDITED MARKER");
    expect(screen.queryByText("Edited ×1")).not.toBeInTheDocument();
  });
});

describe("AiEditToolbar", () => {
  it("submits the typed instruction and calls onClose", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(
      <AiEditToolbar
        mode="selection"
        position={{ top: 100, left: 100 }}
        onSubmit={onSubmit}
        onClose={onClose}
        editing={false}
        error={null}
      />,
    );

    fireEvent.change(screen.getByLabelText("AI edit instruction"), {
      target: { value: "Redo this section" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Send AI edit request" }),
    );
    expect(onSubmit).toHaveBeenCalledWith("Redo this section");

    fireEvent.click(screen.getByRole("button", { name: "Close AI editor" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables sending while an edit is in progress", () => {
    render(
      <AiEditToolbar
        mode="selection"
        position={{ top: 100, left: 100 }}
        onSubmit={() => {}}
        onClose={() => {}}
        editing={true}
        error={null}
      />,
    );

    expect(
      screen.getByText(/AI is editing this document/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("AI edit instruction"),
    ).not.toBeInTheDocument();
  });

  it("shows errors returned by the edit", () => {
    render(
      <AiEditToolbar
        mode="whole"
        position={{ top: 100, left: 100 }}
        onSubmit={() => {}}
        onClose={() => {}}
        editing={false}
        error="The AI couldn't edit this document right now."
      />,
    );

    expect(
      screen.getByText("The AI couldn't edit this document right now."),
    ).toBeInTheDocument();
  });
});
