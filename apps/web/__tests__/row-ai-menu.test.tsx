import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { RowAiMenu, rowActionPrompt } from "@/components/module/row-ai-menu";
import { RowAiAction } from "@/components/module/row-ai-action";
import { ModuleAiProvider } from "@/components/module/module-ai-context";

const focus = {
  kind: "Transaction",
  name: "Office supplies purchase",
  id: "tx-123",
  fields: [{ label: "Amount", value: "GMD 1,250.00" }],
};

function renderMenu(
  props: Partial<React.ComponentProps<typeof RowAiMenu>> = {},
) {
  return render(
    <RowAiMenu
      x={100}
      y={100}
      focus={focus}
      onSelect={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  );
}

describe("RowAiMenu", () => {
  it("renders the target record header and the core AI actions", () => {
    renderMenu();
    expect(screen.getByText("Transaction")).toBeInTheDocument();
    expect(screen.getByText("Explain this")).toBeInTheDocument();
    expect(screen.getByText("Flag anomaly")).toBeInTheDocument();
    expect(screen.getByText("Ask about this row")).toBeInTheDocument();
  });

  it("adds Reverse this only for reversible records", () => {
    renderMenu({ reversible: true });
    expect(screen.getByText("Reverse this")).toBeInTheDocument();
  });

  it("calls onSelect with the action when an item is clicked", () => {
    const onSelect = vi.fn();
    renderMenu({ onSelect });
    fireEvent.click(screen.getByText("Explain this"));
    expect(onSelect).toHaveBeenCalledWith({ kind: "explain" });
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on outside pointer down", () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on scroll", () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    fireEvent.scroll(window);
    expect(onClose).toHaveBeenCalled();
  });

  it("supports keyboard navigation with arrow keys and Enter", () => {
    const onSelect = vi.fn();
    renderMenu({ onSelect });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });
    // Default active index 0 = explain → ArrowDown moves to flag.
    expect(onSelect).toHaveBeenCalledWith({ kind: "flag" });
  });
});

describe("rowActionPrompt", () => {
  it("builds a plain-terms explain command naming the record kind", () => {
    expect(rowActionPrompt({ kind: "explain" }, focus)).toContain(
      "Explain this transaction",
    );
  });

  it("builds a reversal proposal command that never posts", () => {
    const prompt = rowActionPrompt({ kind: "reverse" }, focus);
    expect(prompt).toContain("reversing this transaction");
    expect(prompt).toContain("propose it for my approval");
    // The AI must never be told to execute the reversal — only propose it.
    expect(prompt).not.toMatch(/post (it|this)( now| immediately)?/i);
  });
});

describe("RowAiAction right-click", () => {
  it("opens the context menu when the parent row is right-clicked", () => {
    render(
      <ModuleAiProvider>
        <table>
          <tbody>
            <tr data-testid="row">
              <td>
                <RowAiAction focus={focus} />
              </td>
            </tr>
          </tbody>
        </table>
      </ModuleAiProvider>,
    );

    fireEvent.contextMenu(screen.getByTestId("row"), {
      clientX: 120,
      clientY: 140,
    });

    expect(screen.getByText("Explain this")).toBeInTheDocument();
    expect(screen.getByText("Ask about this row")).toBeInTheDocument();
  });

  it("does not show Reverse this for non-reversible records", () => {
    render(
      <ModuleAiProvider>
        <table>
          <tbody>
            <tr data-testid="row">
              <td>
                <RowAiAction focus={focus} />
              </td>
            </tr>
          </tbody>
        </table>
      </ModuleAiProvider>,
    );

    fireEvent.contextMenu(screen.getByTestId("row"));
    expect(screen.queryByText("Reverse this")).not.toBeInTheDocument();
  });

  it("shows Reverse this for reversible records", () => {
    render(
      <ModuleAiProvider>
        <table>
          <tbody>
            <tr data-testid="row">
              <td>
                <RowAiAction focus={focus} reversible />
              </td>
            </tr>
          </tbody>
        </table>
      </ModuleAiProvider>,
    );

    fireEvent.contextMenu(screen.getByTestId("row"));
    expect(screen.getByText("Reverse this")).toBeInTheDocument();
  });
});
