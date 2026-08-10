import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { RowActionsMenu } from "@/components/module/row-actions-menu";

function renderMenu(
  props: Partial<React.ComponentProps<typeof RowActionsMenu>> = {},
) {
  const onAction = vi.fn();
  const utils = render(
    <RowActionsMenu
      items={[
        { label: "View details", onSelect: () => onAction("view") },
        { label: "Edit", onSelect: () => onAction("edit") },
        {
          label: "Delete",
          onSelect: () => onAction("delete"),
          destructive: true,
        },
      ]}
      {...props}
    />,
  );
  return { onAction, ...utils };
}

describe("RowActionsMenu", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a trigger button labelled with aria for accessibility", () => {
    renderMenu();
    expect(
      screen.getByRole("button", { name: /actions/i }),
    ).toBeInTheDocument();
  });

  it("opens the menu on click and lists every action", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: /actions/i }));

    expect(screen.getByText("View details")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("invokes the selected action and closes the menu", () => {
    const { onAction } = renderMenu();
    fireEvent.click(screen.getByRole("button", { name: /actions/i }));
    fireEvent.click(screen.getByText("Edit"));

    expect(onAction).toHaveBeenCalledWith("edit");
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("stops propagation so row-level clicks don't fire", () => {
    const rowClick = vi.fn();
    render(
      <div onClick={rowClick}>
        <RowActionsMenu
          items={[{ label: "View details", onSelect: () => {} }]}
        />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: /actions/i }));
    expect(rowClick).not.toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: /actions/i }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("marks destructive items with a destructive style", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: /actions/i }));
    const deleteItem = screen.getByText("Delete");
    expect(deleteItem.className).toMatch(/red|destructive/i);
  });

  it("does not render a menu when items is empty", () => {
    renderMenu({ items: [] });
    expect(
      screen.queryByRole("button", { name: /actions/i }),
    ).not.toBeInTheDocument();
  });
});
